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
        """Save debate to JSON file"""
        file_path = os.path.join(config.DEBATES_DIR, f'{self.debate_id}.json')
        with open(file_path, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)

    @staticmethod
    def load(debate_id: str) -> Optional['Debate']:
        """Load debate from JSON file"""
        file_path = os.path.join(config.DEBATES_DIR, f'{debate_id}.json')

        if not os.path.exists(file_path):
            return None

        with open(file_path, 'r') as f:
            data = json.load(f)

        # Convert messages back to Message objects
        messages = [Message(**msg) for msg in data.get('messages', [])]
        data['messages'] = messages

        # Convert selected_models back to DebateModel objects
        selected_models = [DebateModel(**m) for m in data['selected_models']]
        data['selected_models'] = selected_models

        return Debate(**data)

    @staticmethod
    def list_all() -> List[Dict]:
        """List all debates"""
        debates = []

        if not os.path.exists(config.DEBATES_DIR):
            return debates

        for filename in os.listdir(config.DEBATES_DIR):
            if filename.endswith('.json'):
                debate_id = filename[:-5]
                debate = Debate.load(debate_id)
                if debate:
                    debates.append({
                        'debate_id': debate.debate_id,
                        'market_question': debate.market_question,
                        'status': debate.status,
                        'models_count': len(debate.selected_models),
                        'rounds': debate.rounds,
                        'created_at': debate.created_at,
                        'completed_at': debate.completed_at
                    })

        # Sort by created_at descending
        debates.sort(key=lambda x: x['created_at'], reverse=True)
        return debates
