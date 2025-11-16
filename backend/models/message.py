"""
Message data model for debate messages
"""
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, Optional
import uuid


@dataclass
class Message:
    """Individual message in a debate"""
    message_id: str
    round: int
    sequence: int
    model_id: str
    model_name: str
    message_type: str  # 'initial' | 'debate' | 'final'
    text: str
    predictions: Dict[str, int]  # outcome -> percentage (0-100)
    audio_url: Optional[str]
    audio_duration: Optional[float]
    timestamp: str

    @staticmethod
    def create(
        round: int,
        sequence: int,
        model_id: str,
        model_name: str,
        message_type: str,
        text: str,
        predictions: Dict[str, int]
    ) -> 'Message':
        """Create a new message"""
        return Message(
            message_id=str(uuid.uuid4()),
            round=round,
            sequence=sequence,
            model_id=model_id,
            model_name=model_name,
            message_type=message_type,
            text=text,
            predictions=predictions,
            audio_url=None,
            audio_duration=None,
            timestamp=datetime.utcnow().isoformat() + 'Z'
        )

    def to_dict(self) -> Dict:
        """Convert message to dictionary"""
        return asdict(self)
