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


def filter_outcomes_for_ai(outcomes: List[Dict]) -> List[Dict]:
    """
    Filter out placeholder and invalid outcomes before sending to AI models.
    Only keeps outcomes that have:
    - volume > 0 (if available)
    - shares > 0
    - price_change_24h != 0 (or undefined/null)
    
    Args:
        outcomes: List of outcome dictionaries
        
    Returns:
        Filtered list of outcomes
    """
    filtered = []
    filtered_reasons = {}  # Track why outcomes were filtered
    
    for outcome in outcomes:
        name = outcome.get('name', '')
        name_lower = name.lower()
        reason = None
        
        # Filter out placeholder outcomes by name
        if 'placeholder' in name_lower:
            reason = 'placeholder in name'
            filtered_reasons[name] = reason
            continue
        
        # Check volume - must be > 0 (if volume field exists)
        volume = outcome.get('volume')
        if volume is not None:
            try:
                volume_float = float(volume)
                if volume_float == 0:
                    reason = f'volume is 0 (volume={volume})'
                    filtered_reasons[name] = reason
                    continue
            except (ValueError, TypeError):
                # If volume can't be parsed and it's provided, filter it out
                reason = f'volume cannot be parsed (volume={volume})'
                filtered_reasons[name] = reason
                continue
        
        # Check shares - must be > 0 (if shares field exists and is not None)
        shares = outcome.get('shares')
        if shares is not None:
            # Shares field exists, so we can filter on it
            try:
                shares_float = float(shares)
                if shares_float == 0:
                    reason = f'shares is 0 (shares={shares})'
                    filtered_reasons[name] = reason
                    continue
            except (ValueError, TypeError):
                # If shares can't be parsed and it's provided, filter it out
                reason = f'shares cannot be parsed (shares={shares})'
                filtered_reasons[name] = reason
                continue
        # If shares is None, we can't filter on it, so allow it through
        
        # Check price_change_24h - must not be 0 (0% change)
        price_change_24h = outcome.get('price_change_24h')
        if price_change_24h is not None:
            # If price_change_24h is defined, it must not be 0
            if price_change_24h == 0.0 or price_change_24h == 0:
                reason = f'price_change_24h is 0 (price_change_24h={price_change_24h})'
                filtered_reasons[name] = reason
                continue
        
        # Filter out "Other" only if it looks like a placeholder (price 0.5 and no shares)
        if name_lower == 'other':
            price = outcome.get('price', 0)
            if price == 0.5:
                # Double-check shares for "Other"
                try:
                    shares_float_check = float(shares) if shares else 0
                    if shares_float_check == 0:
                        reason = f'"Other" with price 0.5 and no shares'
                        filtered_reasons[name] = reason
                        continue
                except (ValueError, TypeError):
                    reason = f'"Other" with price 0.5 and shares cannot be parsed'
                    filtered_reasons[name] = reason
                    continue
        
        # Outcome passed all filters
        filtered.append(outcome)
    
    # Log filtering results
    if filtered_reasons:
        logger.info(f"Filtered out {len(filtered_reasons)} outcomes. Reasons: {filtered_reasons}")
    if len(filtered) == 0 and len(outcomes) > 0:
        logger.warning(f"WARNING: All {len(outcomes)} outcomes were filtered out! Sample outcome data: {outcomes[0] if outcomes else 'N/A'}")
    
    return filtered


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

        # Assign unique voices to each model at the start of the debate
        model_ids = [model.model_id for model in debate.selected_models]
        voice_assignments = elevenlabs_service.assign_voices_to_models(model_ids)
        logger.info(f"Assigned voices to models: {voice_assignments}")

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
        try:
            debate.save()
        except Exception as save_error:
            logger.error(f"Failed to save debate start: {type(save_error).__name__}: {str(save_error)}", exc_info=True)
            # Send error and return
            error_data = {
                'error': f"Failed to start debate: {type(save_error).__name__}: {str(save_error)}",
                'message': f"Could not initialize debate: {str(save_error)}",
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
            await event_queue.put({
                'event': 'error',
                'data': error_data
            })
            return

        # Run debate rounds
        for round_num in range(1, debate.rounds + 1):
            debate.current_round = round_num
            try:
                debate.save()
            except Exception as save_error:
                logger.warning(f"Failed to save round update: {type(save_error).__name__}: {str(save_error)}", exc_info=True)
                # Continue anyway - round update failure is not critical

            # Determine message type
            if round_num == 1:
                message_type = 'initial'
            elif round_num == debate.rounds:
                message_type = 'final'
            else:
                message_type = 'debate'

            # Each model takes a turn in this round
            for model_index, model in enumerate(debate.selected_models):
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

                    # Debug: Log raw outcomes before filtering
                    logger.info(f"Raw outcomes before filtering for {model.model_id}: {len(debate.outcomes)} outcomes")
                    if debate.outcomes:
                        sample_outcome = debate.outcomes[0]
                        logger.info(f"Sample outcome structure: {sample_outcome}")
                        logger.info(f"Sample outcome fields: {list(sample_outcome.keys())}")
                    
                    # Filter out placeholders and invalid outcomes before sending to AI
                    filtered_outcomes = filter_outcomes_for_ai(debate.outcomes)
                    logger.info(f"Filtered outcomes for AI: {len(filtered_outcomes)} out of {len(debate.outcomes)} total outcomes")
                    
                    # Debug: Log the actual outcomes being sent to AI
                    if filtered_outcomes:
                        logger.info(f"Outcomes being sent to {model.model_id}: {[o.get('name') for o in filtered_outcomes]}")
                        logger.info(f"Full filtered outcomes data for {model.model_id}: {filtered_outcomes}")
                    else:
                        logger.error(f"ERROR: No outcomes passed filter for {model.model_id}! All {len(debate.outcomes)} outcomes were filtered out.")
                        # Log a few sample outcomes to debug
                        for i, outcome in enumerate(debate.outcomes[:5]):
                            logger.error(f"Sample outcome {i+1} that was filtered: name={outcome.get('name')}, volume={outcome.get('volume')}, shares={outcome.get('shares')}, price_change_24h={outcome.get('price_change_24h')}")

                    response = await openrouter_service.generate_response(
                        model_id=model.model_id,
                        market_question=debate.market_question,
                        market_description=debate.market_description,
                        outcomes=filtered_outcomes,
                        context=context,
                        round_num=round_num,
                        is_final_round=(message_type == 'final')
                    )

                    # Validate response structure
                    if response is None:
                        logger.error(f"Response is None from {model.model_id}")
                        raise Exception(f"Response is None from {model.model_id}")
                    if not isinstance(response, dict):
                        logger.error(f"Response is not a dict from {model.model_id}: {type(response)} - {response}")
                        raise Exception(f"Invalid response type from {model.model_id}: expected dict, got {type(response).__name__}")
                    if 'content' not in response:
                        logger.error(f"Response missing 'content' key from {model.model_id}: {response.keys() if isinstance(response, dict) else 'N/A'}")
                        raise Exception(f"Invalid response structure from {model.model_id}: missing 'content' key")

                    logger.info(f"Received response from {model.model_id}: {len(response['content'])} chars")

                    # Extract predictions from response - use as-is from AI
                    predictions = response.get('predictions', {})
                    logger.info(f"Predictions from {model.model_id} (raw): {predictions}")
                    
                    # Get valid outcome names from filtered outcomes (what we sent to AI)
                    valid_outcome_names = {o.get('name') for o in filtered_outcomes}
                    valid_outcome_names_lower = {name.lower(): name for name in valid_outcome_names}
                    
                    # Filter and validate predictions - be lenient, keep predictions even if names don't match exactly
                    if predictions:
                        filtered_predictions = {}
                        
                        # First, filter out placeholder predictions
                        for pred_name, pred_value in predictions.items():
                            pred_name_lower = pred_name.lower()
                            if 'placeholder' in pred_name_lower:
                                logger.debug(f"Filtering out placeholder prediction: {pred_name}")
                                continue
                            filtered_predictions[pred_name] = pred_value
                        
                        # Try to match predictions to valid outcomes (case-insensitive)
                        # Keep predictions even if they don't match exactly - AI might use slightly different names
                        matched_predictions = {}
                        unmatched_predictions = {}
                        
                        for pred_name, pred_value in filtered_predictions.items():
                            # Try exact match first
                            if pred_name in valid_outcome_names:
                                matched_predictions[pred_name] = pred_value
                            # Try case-insensitive match
                            elif pred_name.lower() in valid_outcome_names_lower:
                                correct_name = valid_outcome_names_lower[pred_name.lower()]
                                matched_predictions[correct_name] = pred_value
                            else:
                                # Keep unmatched predictions - they might still be valid
                                unmatched_predictions[pred_name] = pred_value
                        
                        # Combine matched and unmatched (be lenient - keep all non-placeholder predictions)
                        final_predictions = {**matched_predictions, **unmatched_predictions}
                        
                        # Log warnings for missing outcomes, but don't remove predictions
                        missing_outcomes = valid_outcome_names - set(matched_predictions.keys())
                        if missing_outcomes:
                            logger.warning(f"Missing predictions for some outcomes from {model.model_id}: {missing_outcomes}")
                        
                        # Log info about unmatched predictions
                        if unmatched_predictions:
                            logger.info(f"Unmatched predictions (keeping them): {list(unmatched_predictions.keys())}")
                        
                        # Renormalize to sum to exactly 100.00 (preserving decimals)
                        if final_predictions:
                            total = sum(final_predictions.values())
                            if total > 0:
                                # Normalize to 100, preserving up to 2 decimal places
                                normalized = {k: round(v * 100 / total, 2) for k, v in final_predictions.items()}
                                # Adjust for rounding errors to ensure sum equals exactly 100.00
                                current_sum = sum(normalized.values())
                                diff = round(100.00 - current_sum, 2)
                                if abs(diff) > 0.01:  # If difference is significant
                                    # Add/subtract difference to the largest value
                                    max_key = max(normalized.items(), key=lambda x: x[1])[0]
                                    normalized[max_key] = round(normalized[max_key] + diff, 2)
                                final_predictions = normalized
                        
                        # Convert to float (preserving decimals, up to 2 decimal places)
                        predictions = {k: round(float(v), 2) for k, v in final_predictions.items()}
                    else:
                        predictions = {}
                        logger.warning(f"No predictions received from {model.model_id}")
                    
                    logger.info(f"Final predictions from {model.model_id}: {predictions}")

                    # Create message using Message model
                    message = Message.create(
                        round=round_num,
                        sequence=len(debate.messages) + 1,
                        model_id=model.model_id,
                        model_name=model.model_name,
                        message_type=message_type,
                        text=response['content'],
                        predictions=predictions
                    )

                    # Generate audio for this message
                    try:
                        logger.info(f"Generating audio for message {message.message_id}")
                        # Use the assigned voice for this model (based on model_index)
                        audio_result = await elevenlabs_service.generate_speech(
                            text=message.text,
                            model_id=model.model_id,
                            message_id=message.message_id,
                            model_index=model_index
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
                    
                    # Save debate - wrap in try-except to handle database errors
                    try:
                        debate.save()
                        logger.info(f"Saved message from {model.model_id}")
                    except Exception as save_error:
                        logger.error(f"Failed to save debate after message from {model.model_id}: {type(save_error).__name__}: {str(save_error)}", exc_info=True)
                        # Send error event but continue - don't break the entire debate
                        error_data = {
                            'model_id': model.model_id,
                            'model_name': model.model_name,
                            'error': f"Database save failed: {type(save_error).__name__}: {str(save_error)}",
                            'message': f"Failed to save message from {model.model_name}",
                            'timestamp': datetime.utcnow().isoformat() + 'Z'
                        }
                        await event_queue.put({
                            'event': 'error',
                            'data': error_data
                        })
                        # Continue to next model - don't break the loop
                        continue

                    # Send message event
                    await event_queue.put({
                        'event': 'message',
                        'data': message.to_dict()
                    })

                except Exception as e:
                    logger.error(f"Error from {model.model_id}: {type(e).__name__}: {str(e)}", exc_info=True)

                    # Send error event
                    error_data = {
                        'model_id': model.model_id,
                        'model_name': model.model_name,
                        'error': f"{type(e).__name__}: {str(e)}",
                        'message': f"Error from {model.model_name}: {str(e)}",
                        'timestamp': datetime.utcnow().isoformat() + 'Z'
                    }
                    await event_queue.put({
                        'event': 'error',
                        'data': error_data
                    })
                    # Continue to next model instead of breaking the entire debate
                    continue

        # Debate complete - save status first
        debate.set_status('completed')
        try:
            debate.save()
        except Exception as save_error:
            logger.error(f"Failed to save debate completion: {type(save_error).__name__}: {str(save_error)}", exc_info=True)
            # Continue anyway - send completion event

        # Generate final summary and predictions using Gemini
        # (get_debate_results will handle locking and saving to DB)
        logger.info(f"Generating final summary for debate {debate_id}")
        try:
            results = self.get_debate_results(debate_id)
            if results:
                logger.info(f"Final summary generated for debate {debate_id}")
        except Exception as e:
            logger.error(f"Failed to generate final summary: {e}")

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

    def get_debate_results(self, debate_id: str) -> Optional[Dict]:
        """
        Get comprehensive debate results with Gemini summary

        Args:
            debate_id: Debate ID

        Returns:
            Dict with results including summary, predictions, and statistics
        """
        from services.gemini import gemini_service
        from datetime import datetime
        import statistics
        import time
        from database import get_db
        from models.db_models import DebateDB

        # Load debate
        debate = Debate.load(debate_id)
        if not debate:
            return None

        # Only return results for completed debates
        if debate.status != 'completed':
            return None

        # Convert messages to dicts
        messages_dict = [msg.to_dict() if isinstance(msg, Message) else msg for msg in debate.messages]
        models_dict = [
            {
                'model_id': m.model_id,
                'model_name': m.model_name,
                'provider': m.provider
            }
            for m in debate.selected_models
        ]

        # Check if summary already exists in database
        if debate.final_summary:
            logger.info(f"Using cached summary from database for debate {debate_id}")
            summary = debate.final_summary
        else:
            # Try to acquire lock for summary generation
            db = get_db()
            max_wait_seconds = 60  # Maximum wait time
            wait_interval = 2  # Check every 2 seconds
            waited_seconds = 0

            while waited_seconds < max_wait_seconds:
                # Check if someone else is already generating
                debate_db = db.query(DebateDB).filter_by(debate_id=debate_id).first()

                if not debate_db:
                    logger.error(f"Debate {debate_id} not found in DB")
                    return None

                # If summary already generated while we were waiting
                if debate_db.final_summary:
                    logger.info(f"Summary was generated by another process for debate {debate_id}")
                    debate = Debate.load(debate_id)  # Reload with fresh data
                    summary = debate.final_summary
                    break

                # If no one is generating, acquire lock
                if not debate_db.summary_generating:
                    logger.info(f"Acquiring lock for summary generation for debate {debate_id}")
                    debate_db.summary_generating = True
                    db.commit()

                    try:
                        # Generate Gemini summary
                        logger.info(f"Generating new summary for debate {debate_id}")
                        # Filter outcomes for summary generation
                        filtered_outcomes_for_summary = filter_outcomes_for_ai(debate.outcomes)
                        summary = gemini_service.generate_debate_summary(
                            market_question=debate.market_question,
                            market_description=debate.market_description or "",
                            outcomes=filtered_outcomes_for_summary,
                            messages=messages_dict,
                            models=models_dict
                        )
                        break
                    except Exception as e:
                        logger.error(f"Error generating summary: {e}")
                        # Release lock on error
                        debate_db.summary_generating = False
                        db.commit()
                        raise
                else:
                    # Someone else is generating, wait
                    logger.info(f"Another process is generating summary for debate {debate_id}, waiting...")
                    time.sleep(wait_interval)
                    waited_seconds += wait_interval
                    db.expire_all()  # Refresh DB session

            # If we exceeded max wait time
            if waited_seconds >= max_wait_seconds:
                logger.warning(f"Timeout waiting for summary generation for debate {debate_id}")
                # Force generate (override lock)
                logger.info(f"Force generating summary for debate {debate_id}")
                # Filter outcomes for summary generation
                filtered_outcomes_for_summary = filter_outcomes_for_ai(debate.outcomes)
                summary = gemini_service.generate_debate_summary(
                    market_question=debate.market_question,
                    market_description=debate.market_description or "",
                    outcomes=filtered_outcomes_for_summary,
                    messages=messages_dict,
                    models=models_dict
                )

        # Check if final predictions already cached in database
        if debate.final_predictions:
            logger.info(f"Using cached final predictions from database for debate {debate_id}")
            final_predictions = debate.final_predictions
        else:
            # Calculate final predictions per model
            logger.info(f"Calculating final predictions for debate {debate_id}")
            final_predictions = {}
            for model in debate.selected_models:
                model_messages = [m for m in messages_dict if m['model_id'] == model.model_id]

                if model_messages:
                    # Get last message (final prediction)
                    last_msg = model_messages[-1]
                    final_pred = last_msg.get('predictions', {})

                    # Get first message (initial prediction)
                    first_msg = model_messages[0]
                    initial_pred = first_msg.get('predictions', {})

                    # Calculate change
                    if final_pred and initial_pred:
                        # Find largest outcome
                        max_outcome = max(final_pred, key=final_pred.get)
                        change_value = final_pred.get(max_outcome, 0) - initial_pred.get(max_outcome, 0)
                        # Round to 2 decimal places
                        change_value_rounded = round(change_value, 2)
                        if change_value_rounded > 0:
                            change = f"+{change_value_rounded:.2f}% {max_outcome} after debate"
                        elif change_value_rounded < 0:
                            change = f"{change_value_rounded:.2f}% {max_outcome} after debate"
                        else:
                            change = "No change, maintained position"
                    else:
                        change = "Predictions not available"

                    final_predictions[model.model_id] = {
                        'predictions': final_pred,
                        'initial_predictions': initial_pred,
                        'change': change
                    }

        # Calculate statistics
        statistics_data = self._calculate_statistics(
            messages=messages_dict,
            models=models_dict,
            outcomes=debate.outcomes,
            polymarket_odds=debate.polymarket_odds,
            created_at=debate.created_at,
            completed_at=debate.completed_at
        )

        # Save results to database and release lock (if we generated them)
        if not debate.final_summary or not debate.final_predictions:
            try:
                db = get_db()
                debate_db = db.query(DebateDB).filter_by(debate_id=debate_id).first()
                if debate_db:
                    # Save summary and predictions
                    if not debate_db.final_summary:
                        debate_db.final_summary = summary
                    if not debate_db.final_predictions:
                        debate_db.final_predictions = final_predictions

                    # Release lock
                    debate_db.summary_generating = False
                    db.commit()
                    logger.info(f"Saved summary and predictions to DB and released lock for debate {debate_id}")
            except Exception as e:
                logger.error(f"Error saving summary to DB: {e}")

        return {
            'debate_id': debate_id,
            'status': debate.status,
            'market': {
                'id': debate.market_id,
                'question': debate.market_question,
                'outcomes': debate.outcomes
            },
            'summary': summary or {
                'overall': 'Summary not available',
                'agreements': [],
                'disagreements': [],
                'consensus': 'Unable to determine consensus',
                'model_rationales': []
            },
            'final_predictions': final_predictions,
            'statistics': statistics_data,
            'completed_at': debate.completed_at
        }

    def _calculate_statistics(
        self,
        messages: List[Dict],
        models: List[Dict],
        outcomes: List[Dict],
        polymarket_odds: Dict,
        created_at: str,
        completed_at: Optional[str]
    ) -> Dict:
        """Calculate debate statistics"""
        import statistics as stats
        from dateutil import parser

        # Get final predictions from all models
        all_final_predictions = []
        for model in models:
            model_messages = [m for m in messages if m['model_id'] == model['model_id']]
            if model_messages:
                last_msg = model_messages[-1]
                predictions = last_msg.get('predictions', {})
                if predictions:
                    all_final_predictions.append(predictions)

        # Calculate average prediction across all outcomes
        average_prediction = {}
        median_prediction = {}
        variance_values = []

        if all_final_predictions and outcomes:
            for outcome in outcomes:
                outcome_name = outcome['name']
                values = [pred.get(outcome_name, 0) for pred in all_final_predictions if outcome_name in pred]

                if values:
                    average_prediction[outcome_name] = round(sum(values) / len(values))
                    median_prediction[outcome_name] = round(stats.median(values))
                    variance_values.extend(values)

        # Calculate variance
        prediction_variance = round(stats.variance(variance_values), 1) if len(variance_values) > 1 else 0

        # Calculate AI vs Market delta
        ai_vs_market_delta = "N/A"
        if average_prediction and polymarket_odds:
            # Find the main outcome (usually the first one)
            if outcomes:
                main_outcome = outcomes[0]['name']
                ai_avg = average_prediction.get(main_outcome, 0)
                market_prob = polymarket_odds.get(main_outcome, 0)

                if isinstance(market_prob, (int, float)):
                    delta = ai_avg - (market_prob * 100)
                    if delta > 0:
                        ai_vs_market_delta = f"AI models {abs(delta):.1f}% more bullish"
                    elif delta < 0:
                        ai_vs_market_delta = f"AI models {abs(delta):.1f}% more bearish"
                    else:
                        ai_vs_market_delta = "AI aligned with market"

        # Calculate duration
        total_duration_seconds = 0
        if created_at and completed_at:
            try:
                start = parser.parse(created_at)
                end = parser.parse(completed_at)
                duration = end - start
                total_duration_seconds = int(duration.total_seconds())
            except:
                pass

        return {
            'average_prediction': average_prediction,
            'median_prediction': median_prediction,
            'prediction_variance': prediction_variance,
            'polymarket_odds': {k: int(v * 100) if isinstance(v, float) else v for k, v in polymarket_odds.items()},
            'ai_vs_market_delta': ai_vs_market_delta,
            'total_messages': len(messages),
            'total_duration_seconds': total_duration_seconds,
            'models_count': len(models),
            'rounds_completed': max([m.get('round', 0) for m in messages]) if messages else 0
        }


# Global instance
debate_service = DebateService()
