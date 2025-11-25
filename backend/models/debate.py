"""
Debate data model for managing AI debates
"""
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List, Dict, Optional
import uuid
import json
import os
from config import config
from models.message import Message
from database import get_db
from models.db_models import (
    DebateDB, DebateModelDB, DebateOutcomeDB,
    MessageDB, MessagePredictionDB
)


@dataclass
class DebateModel:
    """Model participating in debate"""
    model_id: str
    model_name: str
    provider: str


@dataclass
class Debate:
    """Complete debate data model"""
    debate_id: str
    status: str  # 'initialized' | 'in_progress' | 'paused' | 'completed' | 'stopped'
    market_id: str
    market_question: str
    market_description: str
    outcomes: List[Dict]
    polymarket_odds: Dict[str, int]
    selected_models: List[DebateModel]
    rounds: int
    current_round: int
    messages: List[Message] = field(default_factory=list)
    final_summary: Optional[Dict] = None
    final_predictions: Optional[Dict] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + 'Z')
    completed_at: Optional[str] = None
    paused: bool = False

    @staticmethod
    def create(
        market: Dict,
        models: List[Dict],
        rounds: int
    ) -> 'Debate':
        """Create a new debate"""
        # Convert outcomes prices to percentages
        polymarket_odds = {}
        for outcome in market['outcomes']:
            polymarket_odds[outcome['name']] = int(outcome['price'] * 100)

        debate = Debate(
            debate_id=str(uuid.uuid4()),
            status='initialized',
            market_id=market['id'],
            market_question=market['question'],
            market_description=market.get('description', ''),
            outcomes=market['outcomes'],
            polymarket_odds=polymarket_odds,
            selected_models=[
                DebateModel(
                    model_id=m['model_id'],
                    model_name=m['model_name'],
                    provider=m['provider']
                ) for m in models
            ],
            rounds=rounds,
            current_round=0
        )

        return debate

    def add_message(self, message: Message):
        """Add a message to the debate"""
        self.messages.append(message)

    def set_status(self, status: str):
        """Set debate status"""
        self.status = status
        if status == 'completed' or status == 'stopped':
            self.completed_at = datetime.utcnow().isoformat() + 'Z'

    def pause(self):
        """Pause the debate"""
        self.paused = True
        self.status = 'paused'

    def resume(self):
        """Resume the debate"""
        self.paused = False
        self.status = 'in_progress'

    def to_dict(self) -> Dict:
        """Convert debate to dictionary"""
        data = asdict(self)
        # Convert Message objects to dicts if they aren't already
        data['messages'] = [
            msg.to_dict() if isinstance(msg, Message) else msg
            for msg in data['messages']
        ]
        return data

    def save(self):
        """Save debate to database"""
        db = get_db()
        try:
            # Check if debate already exists
            existing = db.query(DebateDB).filter_by(debate_id=self.debate_id).first()

            if existing:
                # Update existing debate
                existing.status = self.status
                existing.paused = self.paused
                existing.current_round = self.current_round
                existing.final_summary = self.final_summary
                existing.final_predictions = self.final_predictions
                existing.completed_at = self.completed_at
                existing.polymarket_odds = self.polymarket_odds
            else:
                # Create new debate
                debate_db = DebateDB(
                    debate_id=self.debate_id,
                    status=self.status,
                    paused=self.paused,
                    market_id=self.market_id,
                    market_question=self.market_question,
                    market_description=self.market_description,
                    polymarket_odds=self.polymarket_odds,
                    rounds=self.rounds,
                    current_round=self.current_round,
                    final_summary=self.final_summary,
                    final_predictions=self.final_predictions,
                    created_at=self.created_at,
                    completed_at=self.completed_at
                )
                db.add(debate_db)

                # Add selected models
                for model in self.selected_models:
                    model_db = DebateModelDB(
                        debate_id=self.debate_id,
                        model_id=model.model_id,
                        model_name=model.model_name,
                        provider=model.provider
                    )
                    db.add(model_db)

                # Add outcomes
                for outcome in self.outcomes:
                    outcome_db = DebateOutcomeDB(
                        debate_id=self.debate_id,
                        name=outcome['name'],
                        price=outcome['price'],
                        shares=outcome.get('shares'),
                        volume=outcome.get('volume'),
                        price_change_24h=outcome.get('price_change_24h'),
                        image_url=outcome.get('image_url')
                    )
                    db.add(outcome_db)

            # Save messages (delete and recreate for simplicity)
            # This ensures messages are always in sync
            db.query(MessageDB).filter_by(debate_id=self.debate_id).delete()

            for msg in self.messages:
                message_db = MessageDB(
                    message_id=msg.message_id,
                    debate_id=self.debate_id,
                    round=msg.round,
                    sequence=msg.sequence,
                    model_id=msg.model_id,
                    model_name=msg.model_name,
                    message_type=msg.message_type,
                    text=msg.text,
                    audio_url=msg.audio_url,
                    audio_duration=msg.audio_duration,
                    timestamp=msg.timestamp
                )
                db.add(message_db)

                # Add predictions
                for outcome_name, percentage in msg.predictions.items():
                    prediction_db = MessagePredictionDB(
                        message_id=msg.message_id,
                        outcome_name=outcome_name,
                        percentage=percentage
                    )
                    db.add(prediction_db)

            db.commit()

        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    @staticmethod
    def load(debate_id: str) -> Optional['Debate']:
        """Load debate from database"""
        db = get_db()
        try:
            # Query debate
            debate_db = db.query(DebateDB).filter_by(debate_id=debate_id).first()

            if not debate_db:
                return None

            # Load related models
            models_db = db.query(DebateModelDB).filter_by(debate_id=debate_id).all()
            selected_models = [
                DebateModel(
                    model_id=m.model_id,
                    model_name=m.model_name,
                    provider=m.provider
                ) for m in models_db
            ]

            # Load outcomes
            outcomes_db = db.query(DebateOutcomeDB).filter_by(debate_id=debate_id).all()
            outcomes = []
            for o in outcomes_db:
                outcome = {
                    'name': o.name,
                    'price': o.price
                }
                # Add optional fields if they exist
                if o.shares is not None:
                    outcome['shares'] = o.shares
                if o.volume is not None:
                    outcome['volume'] = o.volume
                if o.price_change_24h is not None:
                    outcome['price_change_24h'] = o.price_change_24h
                if o.image_url is not None:
                    outcome['image_url'] = o.image_url
                outcomes.append(outcome)

            # Load messages
            messages_db = db.query(MessageDB).filter_by(debate_id=debate_id).order_by(
                MessageDB.round, MessageDB.sequence
            ).all()

            messages = []
            for msg_db in messages_db:
                # Load predictions for this message
                predictions_db = db.query(MessagePredictionDB).filter_by(
                    message_id=msg_db.message_id
                ).all()
                predictions = {
                    p.outcome_name: p.percentage
                    for p in predictions_db
                }

                # Create Message object
                message = Message(
                    message_id=msg_db.message_id,
                    round=msg_db.round,
                    sequence=msg_db.sequence,
                    model_id=msg_db.model_id,
                    model_name=msg_db.model_name,
                    message_type=msg_db.message_type,
                    text=msg_db.text,
                    predictions=predictions,
                    audio_url=msg_db.audio_url,
                    audio_duration=msg_db.audio_duration,
                    timestamp=msg_db.timestamp
                )
                messages.append(message)

            # Create Debate object
            debate = Debate(
                debate_id=debate_db.debate_id,
                status=debate_db.status,
                market_id=debate_db.market_id,
                market_question=debate_db.market_question,
                market_description=debate_db.market_description,
                outcomes=outcomes,
                polymarket_odds=debate_db.polymarket_odds or {},
                selected_models=selected_models,
                rounds=debate_db.rounds,
                current_round=debate_db.current_round,
                messages=messages,
                final_summary=debate_db.final_summary,
                final_predictions=debate_db.final_predictions,
                created_at=debate_db.created_at,
                completed_at=debate_db.completed_at,
                paused=debate_db.paused
            )

            return debate

        finally:
            db.close()

    @staticmethod
    def list_all() -> List[Dict]:
        """List all debates from database"""
        db = get_db()
        try:
            # Query all debates ordered by created_at descending
            debates_db = db.query(DebateDB).order_by(DebateDB.created_at.desc()).all()

            debates = []
            for debate_db in debates_db:
                # Count models for this debate
                models_count = db.query(DebateModelDB).filter_by(
                    debate_id=debate_db.debate_id
                ).count()

                debates.append({
                    'debate_id': debate_db.debate_id,
                    'market_question': debate_db.market_question,
                    'status': debate_db.status,
                    'models_count': models_count,
                    'rounds': debate_db.rounds,
                    'created_at': debate_db.created_at,
                    'completed_at': debate_db.completed_at
                })

            return debates

        finally:
            db.close()
