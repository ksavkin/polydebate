"""
Debate service for managing AI discussions on Polymarket predictions
"""
import asyncio
import logging
from typing import List, Dict, Optional
from datetime import datetime
from services.polymarket import polymarket_service
from services.openrouter import openrouter_service
from services.elevenlabs import elevenlabs_service
from models.debate import Debate
from models.message import Message

logger = logging.getLogger(__name__)


class DebateService:
    """Service for managing AI debates on prediction markets"""

    def __init__(self):
        pass  # Debates are now persisted to disk, no in-memory storage needed

    def create_debate(
        self,
        market_id: str,
        model_ids: List[str],
        rounds: int
    ) -> Dict:
        """
        Create a new debate

        Args:
            market_id: Polymarket market ID
            model_ids: List of AI model IDs to participate
            rounds: Number of debate rounds

        Returns:
            Dict with debate details
        """
        # Fetch market details from Polymarket
        market = polymarket_service.get_market(market_id)

        # Get model information
        models = []
        for model_id in model_ids:
            model_info = openrouter_service.get_model_info(model_id)
            models.append({
                'model_id': model_id,
                'model_name': model_info.get('name', model_id),
                'provider': model_info.get('provider', 'Unknown')
            })

        # Create debate using model
        debate = Debate.create(
            market=market,
            models=models,
            rounds=rounds
        )

        # Save to disk
        debate.save()

        # Calculate total messages expected (rounds * number of models)
        total_messages = rounds * len(model_ids)

        return {
            'debate_id': debate.debate_id,
            'status': debate.status,
            'market': {
                'id': debate.market_id,
                'question': debate.market_question,
                'description': debate.market_description,
                'outcomes': debate.outcomes
            },
            'models': [
                {
                    'model_id': m.model_id,
                    'model_name': m.model_name,
                    'provider': m.provider
                } for m in debate.selected_models
            ],
            'rounds': debate.rounds,
            'total_messages_expected': total_messages,
            'created_at': debate.created_at,
            'stream_url': f'/api/debate/{debate.debate_id}/stream'
        }

    def get_debate(self, debate_id: str) -> Optional[Dict]:
        """Get debate by ID"""
        debate = Debate.load(debate_id)
        if not debate:
            return None
        return debate.to_dict()

    def list_debates(self) -> List[Dict]:
        """List all debates"""
        return Debate.list_all()

    async def run_debate(self, debate_id: str, event_queue: asyncio.Queue):
        """
        Run the debate and send events to the queue

        Args:
            debate_id: Debate ID
            event_queue: asyncio Queue for sending SSE events
        """
        # Load debate from disk
        debate = Debate.load(debate_id)
        if not debate:
            return

        # Send debate_started event
        await event_queue.put({
            'event': 'debate_started',
            'data': {
                'debate_id': debate_id,
                'status': 'in_progress',
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        })

        debate.set_status('in_progress')
        debate.save()

        # Run debate rounds
        for round_num in range(1, debate.rounds + 1):
            debate.current_round = round_num
            debate.save()

            # Determine message type
            if round_num == 1:
                message_type = 'initial'
            elif round_num == debate.rounds:
                message_type = 'final'
            else:
                message_type = 'debate'

            # Each model takes a turn in this round
            for model in debate.selected_models:
                # Send model_thinking event
                await event_queue.put({
                    'event': 'model_thinking',
                    'data': {
                        'model_id': model.model_id,
                        'model_name': model.model_name,
                        'round': round_num,
                        'timestamp': datetime.utcnow().isoformat() + 'Z'
                    }
                })

                # Build context from previous messages
                context = self._build_context(debate)

                # Get AI response
                try:
                    logger.info(f"Requesting response from {model.model_id} for round {round_num}")

                    response = await openrouter_service.generate_response(
                        model_id=model.model_id,
                        market_question=debate.market_question,
                        market_description=debate.market_description,
                        context=context,
                        round_num=round_num
                    )

                    logger.info(f"Received response from {model.model_id}: {len(response['content'])} chars")

                    # Create message using Message model
                    # For now, use empty predictions (will be added in Phase 5)
                    message = Message.create(
                        round=round_num,
                        sequence=len(debate.messages) + 1,
                        model_id=model.model_id,
                        model_name=model.model_name,
                        message_type=message_type,
                        text=response['content'],
                        predictions={}  # Will be populated in Phase 5 with prompts
                    )

                    # Generate audio for this message
                    try:
                        logger.info(f"Generating audio for message {message.message_id}")
                        audio_result = await elevenlabs_service.generate_speech(
                            text=message.text,
                            model_id=model.model_id,
                            message_id=message.message_id
                        )

                        if audio_result.get('audio_url'):
                            message.audio_url = audio_result['audio_url']
                            message.audio_duration = audio_result.get('audio_duration', 0)
                            logger.info(f"Audio generated successfully: {audio_result['audio_url']}")
                        elif audio_result.get('error'):
                            logger.warning(f"Audio generation failed: {audio_result['error']}")
                    except Exception as audio_error:
                        logger.warning(f"Failed to generate audio: {audio_error}")
                        # Continue without audio - it's not critical

                    # Store message
                    debate.add_message(message)
                    debate.save()

                    logger.info(f"Saved message from {model.model_id}")

                    # Send message event
                    await event_queue.put({
                        'event': 'message',
                        'data': message.to_dict()
                    })

                except Exception as e:
                    logger.error(f"Error from {model.model_id}: {type(e).__name__}: {str(e)}", exc_info=True)

                    # Send error event
                    await event_queue.put({
                        'event': 'error',
                        'data': {
                            'model_id': model.model_id,
                            'model_name': model.model_name,
                            'error': f"{type(e).__name__}: {str(e)}",
                            'timestamp': datetime.utcnow().isoformat() + 'Z'
                        }
                    })

        # Debate complete
        debate.set_status('completed')
        debate.save()

        await event_queue.put({
            'event': 'debate_complete',
            'data': {
                'debate_id': debate_id,
                'status': 'completed',
                'total_messages': len(debate.messages),
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        })

    def _build_context(self, debate: Debate) -> List[Dict]:
        """Build conversation context from previous messages"""
        return [msg.to_dict() if isinstance(msg, Message) else msg for msg in debate.messages]


# Global instance
debate_service = DebateService()
