# PolyDebate - Backend Implementation Plan

**Timeline**: ~6-8 hours for MVP
**Tech Stack**: Flask, Python 3.10+, SQLite/JSON storage
**APIs**: Polymarket, OpenRouter, ElevenLabs, Gemini

---

## Prerequisites (15 minutes)

### Step 0: Environment Setup
- [ ] Python 3.10+ installed
- [ ] Create virtual environment
- [ ] Get API keys:
  - [ ] OpenRouter API key → https://openrouter.ai/keys
  - [ ] ElevenLabs API key → https://elevenlabs.io
  - [ ] Gemini API key → https://ai.google.dev
- [ ] Create `.env` file with keys

---

## Phase 1: Project Foundation (30 minutes)

### Step 1.1: Project Structure
Create project structure:
```
backend/
├── app.py                 # Flask app entry point
├── requirements.txt       # Dependencies
├── .env                   # API keys (DO NOT commit!)
├── .env.example          # Example for other developers
├── config.py             # Configuration settings
├── models/
│   ├── __init__.py
│   ├── debate.py         # Debate data model
│   └── message.py        # Message data model
├── services/
│   ├── __init__.py
│   ├── polymarket.py     # Polymarket API integration
│   ├── openrouter.py     # OpenRouter API integration
│   ├── elevenlabs.py     # ElevenLabs TTS integration
│   └── gemini.py         # Gemini API integration
├── routes/
│   ├── __init__.py
│   ├── markets.py        # Market endpoints
│   ├── models.py         # Models endpoints
│   ├── debates.py        # Debate endpoints
│   └── audio.py          # Audio endpoints
├── utils/
│   ├── __init__.py
│   ├── cache.py          # Caching utilities
│   ├── prompts.py        # AI prompt templates
│   └── validators.py     # Input validation
├── storage/
│   ├── debates/          # JSON files with debate data
│   └── audio/            # MP3 audio files
└── tests/                # Unit tests (optional for hackathon)
```

**Tasks:**
- [ ] Create all folders and `__init__.py` files
- [ ] Create empty files for all modules
- [ ] Configure `.gitignore` (`.env`, `*.pyc`, `__pycache__/`, `storage/`)

---

### Step 1.2: Dependencies Installation

Create `requirements.txt`:
```txt
flask==3.0.0
flask-cors==4.0.0
python-dotenv==1.0.0
requests==2.31.0
google-generativeai==0.3.0
elevenlabs==0.2.26
```

**Tasks:**
- [ ] Create `requirements.txt`
- [ ] Install: `pip install -r requirements.txt`
- [ ] Verify installation: `pip list`

---

### Step 1.3: Configuration Setup

Create `config.py`:
```python
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-prod')
    DEBUG = FLASK_ENV == 'development'

    # CORS
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

    # API Keys
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
    ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

    # API URLs
    POLYMARKET_API_URL = 'https://gamma-api.polymarket.com'
    OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

    # Limits
    MAX_MODELS_PER_DEBATE = 10
    MIN_ROUNDS = 1
    MAX_ROUNDS = 10
    MODEL_TIMEOUT_SECONDS = 30
    MAX_PRICE_PER_MILLION = 0.5

    # Cache TTL (seconds)
    CACHE_MARKETS_TTL = 300  # 5 minutes
    CACHE_MARKET_DETAIL_TTL = 120  # 2 minutes
    CACHE_CATEGORIES_TTL = 600  # 10 minutes
    CACHE_MODELS_TTL = 3600  # 1 hour

    # Storage
    STORAGE_PATH = os.path.join(os.path.dirname(__file__), 'storage')
    DEBATES_PATH = os.path.join(STORAGE_PATH, 'debates')
    AUDIO_PATH = os.path.join(STORAGE_PATH, 'audio')
```

Create `.env.example`:
```bash
# OpenRouter
OPENROUTER_API_KEY=your_openrouter_key_here

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_key_here

# Gemini
GEMINI_API_KEY=your_gemini_key_here

# Flask
FLASK_ENV=development
FLASK_SECRET_KEY=your_secret_key_here

# CORS
FRONTEND_URL=http://localhost:3000
```

**Tasks:**
- [ ] Create `config.py`
- [ ] Create `.env.example`
- [ ] Create `.env` with real keys (copy from `.env.example`)
- [ ] Add `.env` to `.gitignore`

---

### Step 1.4: Basic Flask App

Create `app.py`:
```python
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # CORS
    CORS(app, origins=[Config.FRONTEND_URL])

    # Create storage directories
    os.makedirs(Config.DEBATES_PATH, exist_ok=True)
    os.makedirs(Config.AUDIO_PATH, exist_ok=True)

    # Health check endpoint
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({'status': 'ok', 'message': 'PolyDebate API is running'})

    # Register blueprints (will add later)
    # from routes.markets import markets_bp
    # from routes.models import models_bp
    # from routes.debates import debates_bp
    # from routes.audio import audio_bp
    # app.register_blueprint(markets_bp, url_prefix='/api')
    # app.register_blueprint(models_bp, url_prefix='/api')
    # app.register_blueprint(debates_bp, url_prefix='/api')
    # app.register_blueprint(audio_bp, url_prefix='/api')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=Config.DEBUG)
```

**Tasks:**
- [ ] Create `app.py`
- [ ] Run: `python app.py`
- [ ] Verify: open http://localhost:5000/health in browser
- [ ] Should return: `{"status": "ok", "message": "PolyDebate API is running"}`

---

## Phase 2: Polymarket Integration (45 minutes)

### Step 2.1: Cache Utility

Create `utils/cache.py`:
```python
from datetime import datetime, timedelta
from typing import Optional, Any, Callable
import json

class SimpleCache:
    """Simple in-memory cache with TTL"""

    def __init__(self):
        self._cache = {}

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            data, expiry = self._cache[key]
            if datetime.now() < expiry:
                return data
            else:
                del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int):
        expiry = datetime.now() + timedelta(seconds=ttl_seconds)
        self._cache[key] = (value, expiry)

    def delete(self, key: str):
        if key in self._cache:
            del self._cache[key]

    def clear(self):
        self._cache.clear()

# Global cache instance
cache = SimpleCache()

def cached(ttl_seconds: int):
    """Decorator for caching function results"""
    def decorator(func: Callable):
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            key = f"{func.__name__}:{str(args)}:{str(kwargs)}"

            # Check cache
            result = cache.get(key)
            if result is not None:
                return result

            # Call function and cache result
            result = func(*args, **kwargs)
            cache.set(key, result, ttl_seconds)
            return result
        return wrapper
    return decorator
```

**Tasks:**
- [ ] Create `utils/cache.py`
- [ ] Test in Python REPL

---

### Step 2.2: Polymarket Service

Create `services/polymarket.py`:
```python
import requests
from typing import List, Dict, Optional
from config import Config
from utils.cache import cached

class PolymarketService:
    def __init__(self):
        self.base_url = Config.POLYMARKET_API_URL
        self.session = requests.Session()

    @cached(ttl_seconds=Config.CACHE_MARKETS_TTL)
    def get_markets(
        self,
        limit: int = 100,
        offset: int = 0,
        tag_id: Optional[str] = None,
        closed: bool = False
    ) -> Dict:
        """Fetch markets from Polymarket"""
        params = {
            'limit': min(limit, 100),
            'offset': offset,
            'closed': str(closed).lower(),
            'order': 'id',
            'ascending': 'false'
        }

        if tag_id:
            params['tag_id'] = tag_id

        try:
            response = self.session.get(
                f'{self.base_url}/events',
                params=params,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()

            # Transform Polymarket response to our format
            markets = self._transform_markets(data)

            return {
                'markets': markets,
                'total': len(markets),  # Polymarket doesn't provide total count
                'offset': offset,
                'limit': limit,
                'has_more': len(markets) == limit
            }

        except requests.exceptions.RequestException as e:
            raise Exception(f"Polymarket API error: {str(e)}")

    @cached(ttl_seconds=Config.CACHE_MARKET_DETAIL_TTL)
    def get_market(self, market_id: str) -> Dict:
        """Fetch specific market details"""
        try:
            response = self.session.get(
                f'{self.base_url}/events/{market_id}',
                timeout=10
            )
            response.raise_for_status()
            data = response.json()

            return self._transform_market_detail(data)

        except requests.exceptions.RequestException as e:
            if hasattr(e.response, 'status_code') and e.response.status_code == 404:
                raise Exception(f"Market not found: {market_id}")
            raise Exception(f"Polymarket API error: {str(e)}")

    @cached(ttl_seconds=Config.CACHE_CATEGORIES_TTL)
    def get_categories(self) -> List[Dict]:
        """Fetch available categories/tags"""
        try:
            # Get tags from Polymarket
            response = self.session.get(
                f'{self.base_url}/tags',
                timeout=10
            )
            response.raise_for_status()
            tags = response.json()

            return self._transform_categories(tags)

        except requests.exceptions.RequestException as e:
            raise Exception(f"Polymarket API error: {str(e)}")

    def _transform_markets(self, data: List[Dict]) -> List[Dict]:
        """Transform Polymarket events to our market format"""
        markets = []

        for event in data:
            # Polymarket events can have multiple markets
            markets_data = event.get('markets', [])

            if not markets_data:
                continue

            # For simplicity, we'll use the event itself as the market
            market = {
                'id': event.get('id'),
                'question': event.get('title'),
                'description': event.get('description', ''),
                'category': self._get_category_name(event.get('tags', [])),
                'tag_id': event.get('tags', [None])[0] if event.get('tags') else None,
                'outcomes': self._get_outcomes(markets_data),
                'volume': self._format_volume(event.get('volume', 0)),
                'end_date': event.get('endDate'),
                'created_date': event.get('createdAt'),
                'image_url': event.get('image', '')
            }

            markets.append(market)

        return markets

    def _transform_market_detail(self, event: Dict) -> Dict:
        """Transform Polymarket event detail to our format"""
        markets_data = event.get('markets', [])

        return {
            'id': event.get('id'),
            'question': event.get('title'),
            'description': event.get('description', ''),
            'category': self._get_category_name(event.get('tags', [])),
            'tag_id': event.get('tags', [None])[0] if event.get('tags') else None,
            'market_type': 'binary' if len(markets_data) == 2 else 'categorical',
            'outcomes': self._get_outcomes(markets_data),
            'volume': self._format_volume(event.get('volume', 0)),
            'volume_24h': self._format_volume(event.get('volume24hr', 0)),
            'liquidity': self._format_volume(event.get('liquidity', 0)),
            'end_date': event.get('endDate'),
            'created_date': event.get('createdAt'),
            'resolution_source': event.get('resolutionSource', ''),
            'image_url': event.get('image', '')
        }

    def _get_outcomes(self, markets: List[Dict]) -> List[Dict]:
        """Extract outcomes from Polymarket markets"""
        outcomes = []

        for market in markets:
            outcome = {
                'name': market.get('groupItemTitle', market.get('question', '')),
                'slug': market.get('clobTokenIds', [''])[0],
                'price': float(market.get('outcomePrices', [0.5])[0]),
                'shares': str(market.get('volume', 0))
            }
            outcomes.append(outcome)

        return outcomes

    def _get_category_name(self, tags: List[str]) -> str:
        """Extract category name from tags"""
        # Map tag IDs to category names (you can expand this)
        category_map = {
            'crypto': 'Crypto',
            'politics': 'Politics',
            'sports': 'Sports',
            'science': 'Science',
            'pop-culture': 'Pop Culture'
        }

        if not tags:
            return 'Other'

        first_tag = tags[0].lower()
        for key, value in category_map.items():
            if key in first_tag:
                return value

        return tags[0].title()

    def _transform_categories(self, tags: List[Dict]) -> List[Dict]:
        """Transform Polymarket tags to categories"""
        categories = []

        for tag in tags:
            category = {
                'id': tag.get('id'),
                'name': tag.get('label', tag.get('id', '')),
                'slug': tag.get('slug', tag.get('id', '')),
                'market_count': tag.get('eventCount', 0),
                'icon_url': ''  # Polymarket doesn't provide icons
            }
            categories.append(category)

        return categories

    def _format_volume(self, volume: float) -> str:
        """Format volume to human-readable string"""
        if volume >= 1_000_000:
            return f"{volume / 1_000_000:.1f}M"
        elif volume >= 1_000:
            return f"{volume / 1_000:.1f}K"
        else:
            return str(int(volume))

# Global instance
polymarket_service = PolymarketService()
```

**Tasks:**
- [ ] Create `services/polymarket.py`
- [ ] Test in Python REPL:
```python
from services.polymarket import polymarket_service
markets = polymarket_service.get_markets(limit=5)
print(markets)
```

---

### Step 2.3: Markets Routes

Create `routes/markets.py`:
```python
from flask import Blueprint, request, jsonify
from services.polymarket import polymarket_service

markets_bp = Blueprint('markets', __name__)

@markets_bp.route('/markets', methods=['GET'])
def get_markets():
    """GET /api/markets - Fetch markets list"""
    try:
        # Parse query parameters
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        tag_id = request.args.get('tag_id', None)
        closed = request.args.get('closed', 'false').lower() == 'true'

        # Validate
        limit = min(limit, 100)
        offset = max(offset, 0)

        # Fetch markets
        result = polymarket_service.get_markets(
            limit=limit,
            offset=offset,
            tag_id=tag_id,
            closed=closed
        )

        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            'error': {
                'code': 'external_api_error',
                'message': str(e)
            }
        }), 503

@markets_bp.route('/markets/<market_id>', methods=['GET'])
def get_market(market_id):
    """GET /api/markets/<market_id> - Fetch market details"""
    try:
        market = polymarket_service.get_market(market_id)
        return jsonify(market), 200

    except Exception as e:
        error_msg = str(e)
        if 'not found' in error_msg.lower():
            return jsonify({
                'error': {
                    'code': 'market_not_found',
                    'message': error_msg
                }
            }), 404

        return jsonify({
            'error': {
                'code': 'external_api_error',
                'message': error_msg
            }
        }), 503

@markets_bp.route('/categories', methods=['GET'])
def get_categories():
    """GET /api/categories - Fetch categories/tags"""
    try:
        categories = polymarket_service.get_categories()
        return jsonify({'categories': categories}), 200

    except Exception as e:
        return jsonify({
            'error': {
                'code': 'external_api_error',
                'message': str(e)
            }
        }), 503
```

**Tasks:**
- [ ] Create `routes/markets.py`
- [ ] In `app.py` uncomment:
```python
from routes.markets import markets_bp
app.register_blueprint(markets_bp, url_prefix='/api')
```
- [ ] Restart Flask app
- [ ] Test endpoints:
  - http://localhost:5000/api/markets
  - http://localhost:5000/api/categories

---

## Phase 3: OpenRouter Integration (45 minutes)

### Step 3.1: OpenRouter Service

Create `services/openrouter.py`:
```python
import requests
from typing import List, Dict, Optional
from config import Config
from utils.cache import cached

class OpenRouterService:
    def __init__(self):
        self.api_key = Config.OPENROUTER_API_KEY
        self.api_url = Config.OPENROUTER_API_URL
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'HTTP-Referer': Config.FRONTEND_URL,
            'X-Title': 'PolyDebate',
            'Content-Type': 'application/json'
        }

    @cached(ttl_seconds=Config.CACHE_MODELS_TTL)
    def get_models(self) -> List[Dict]:
        """Fetch available models filtered by price <= $0.5/1M tokens"""
        try:
            response = requests.get(
                'https://openrouter.ai/api/v1/models',
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()

            # Filter models by price
            models = []
            for model_data in data.get('data', []):
                pricing = model_data.get('pricing', {})
                input_price = float(pricing.get('prompt', 0))
                output_price = float(pricing.get('completion', 0))

                # Calculate total per million tokens
                total_per_million = input_price + output_price

                # Only include models <= $0.5 per million
                if total_per_million <= Config.MAX_PRICE_PER_MILLION:
                    model = {
                        'id': model_data.get('id'),
                        'name': model_data.get('name'),
                        'provider': self._extract_provider(model_data.get('id')),
                        'description': model_data.get('description', ''),
                        'pricing': {
                            'input': input_price,
                            'output': output_price,
                            'total_per_million': total_per_million
                        },
                        'is_free': total_per_million == 0,
                        'context_length': model_data.get('context_length', 0),
                        'max_output_tokens': model_data.get('top_provider', {}).get('max_completion_tokens', 0),
                        'supported': True
                    }
                    models.append(model)

            # Sort: free models first, then by price
            models.sort(key=lambda x: (not x['is_free'], x['pricing']['total_per_million']))

            return models

        except requests.exceptions.RequestException as e:
            raise Exception(f"OpenRouter API error: {str(e)}")

    def chat_completion(
        self,
        model_id: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 500,
        temperature: float = 0.7
    ) -> str:
        """Get chat completion from OpenRouter"""
        try:
            payload = {
                'model': model_id,
                'messages': messages,
                'max_tokens': max_tokens,
                'temperature': temperature
            }

            response = requests.post(
                self.api_url,
                headers=self.headers,
                json=payload,
                timeout=Config.MODEL_TIMEOUT_SECONDS
            )
            response.raise_for_status()

            data = response.json()
            return data['choices'][0]['message']['content']

        except requests.exceptions.Timeout:
            raise Exception(f"Model timeout after {Config.MODEL_TIMEOUT_SECONDS} seconds")

        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response is not None:
                if e.response.status_code == 429:
                    raise Exception("Rate limit exceeded")
            raise Exception(f"OpenRouter API error: {str(e)}")

    def _extract_provider(self, model_id: str) -> str:
        """Extract provider name from model ID"""
        if '/' in model_id:
            return model_id.split('/')[0].title()
        return 'Unknown'

# Global instance
openrouter_service = OpenRouterService()
```

**Tasks:**
- [ ] Create `services/openrouter.py`
- [ ] Test:
```python
from services.openrouter import openrouter_service
models = openrouter_service.get_models()
print(f"Found {len(models)} models")
```

---

### Step 3.2: Models Routes

Create `routes/models.py`:
```python
from flask import Blueprint, jsonify
from services.openrouter import openrouter_service

models_bp = Blueprint('models', __name__)

@models_bp.route('/models', methods=['GET'])
def get_models():
    """GET /api/models - Get available AI models"""
    try:
        models = openrouter_service.get_models()

        free_count = sum(1 for m in models if m['is_free'])
        paid_count = len(models) - free_count

        return jsonify({
            'models': models,
            'total_count': len(models),
            'free_count': free_count,
            'paid_count': paid_count
        }), 200

    except Exception as e:
        return jsonify({
            'error': {
                'code': 'external_api_error',
                'message': str(e)
            }
        }), 503
```

**Tasks:**
- [ ] Create `routes/models.py`
- [ ] Register in `app.py`:
```python
from routes.models import models_bp
app.register_blueprint(models_bp, url_prefix='/api')
```
- [ ] Test: http://localhost:5000/api/models

---

## Phase 4: Debate Data Models (30 minutes)

### Step 4.1: Message Model

Create `models/message.py`:
```python
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, Optional
import uuid

@dataclass
class Message:
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
        return asdict(self)
```

**Tasks:**
- [ ] Create `models/message.py`

---

### Step 4.2: Debate Model

Create `models/debate.py`:
```python
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List, Dict, Optional
import uuid
import json
import os
from config import Config
from models.message import Message

@dataclass
class DebateModel:
    model_id: str
    model_name: str
    provider: str

@dataclass
class Debate:
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
                    model_id=m['id'],
                    model_name=m['name'],
                    provider=m['provider']
                ) for m in models
            ],
            rounds=rounds,
            current_round=0
        )

        return debate

    def add_message(self, message: Message):
        self.messages.append(message)

    def set_status(self, status: str):
        self.status = status
        if status == 'completed' or status == 'stopped':
            self.completed_at = datetime.utcnow().isoformat() + 'Z'

    def pause(self):
        self.paused = True
        self.status = 'paused'

    def resume(self):
        self.paused = False
        self.status = 'in_progress'

    def to_dict(self) -> Dict:
        data = asdict(self)
        # Convert Message objects to dicts
        data['messages'] = [msg.to_dict() if isinstance(msg, Message) else msg for msg in data['messages']]
        return data

    def save(self):
        """Save debate to JSON file"""
        file_path = os.path.join(Config.DEBATES_PATH, f'{self.debate_id}.json')
        with open(file_path, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)

    @staticmethod
    def load(debate_id: str) -> Optional['Debate']:
        """Load debate from JSON file"""
        file_path = os.path.join(Config.DEBATES_PATH, f'{debate_id}.json')

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

        if not os.path.exists(Config.DEBATES_PATH):
            return debates

        for filename in os.listdir(Config.DEBATES_PATH):
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
```

**Tasks:**
- [ ] Create `models/debate.py`

---

## Phase 5: Prompt Templates (30 minutes)

### Step 5.1: Prompts Utility

Create `utils/prompts.py`:
```python
from typing import Dict, List

def create_initial_prompt(
    market_question: str,
    market_description: str,
    outcomes: List[Dict],
    polymarket_odds: Dict[str, int]
) -> List[Dict[str, str]]:
    """Create prompt for initial prediction (Round 1)"""

    outcomes_text = "\n".join([f"- {o['name']}" for o in outcomes])

    odds_text = "\n".join([f"- {name}: {pct}%" for name, pct in polymarket_odds.items()])

    system_prompt = """You are a prediction market analyst participating in a debate about a Polymarket event.
Your task is to analyze the market and provide your prediction with clear reasoning.
Be analytical, concise, and data-driven in your approach."""

    user_prompt = f"""You are analyzing the Polymarket prediction market: "{market_question}"

Market Description: {market_description}

Possible outcomes:
{outcomes_text}

Current Polymarket odds (what traders think):
{odds_text}

Your task:
1. Analyze this market and provide your prediction
2. Assign a percentage probability to EACH outcome (must sum to exactly 100%)
3. Provide a brief rationale for your prediction (2-3 sentences)

Be analytical and consider:
- Historical precedents
- Current market conditions
- Logical reasoning
- Data and evidence

You will debate this prediction with other AI models in subsequent rounds.

Format your response EXACTLY as follows:
PREDICTION:
- [Outcome 1]: [X]%
- [Outcome 2]: [Y]%

RATIONALE:
[Your 2-3 sentence explanation]"""

    return [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': user_prompt}
    ]

def create_debate_prompt(
    market_question: str,
    your_prediction: Dict[str, int],
    other_predictions: List[Dict],
    debate_history: List[str]
) -> List[Dict[str, str]]:
    """Create prompt for debate rounds (Rounds 2-N)"""

    your_pred_text = "\n".join([f"- {outcome}: {pct}%" for outcome, pct in your_prediction.items()])

    others_text = ""
    for pred in other_predictions:
        model_name = pred['model_name']
        predictions = pred['predictions']
        pred_text = ", ".join([f"{o}: {p}%" for o, p in predictions.items()])
        others_text += f"\n{model_name}: {pred_text}"

    history_text = "\n\n".join(debate_history[-5:])  # Last 5 messages

    system_prompt = """You are a prediction market analyst in an active debate.
Argue for your position while responding to other analysts' points.
Be concise but persuasive."""

    user_prompt = f"""You are debating the Polymarket market: "{market_question}"

Your current prediction:
{your_pred_text}

Other models' predictions:
{others_text}

Recent debate messages:
{history_text}

Your task:
1. Argue why your prediction is correct
2. Challenge weaknesses in other models' reasoning
3. Respond to points made about your position
4. Be concise (2-4 sentences maximum)

Focus on:
- Logical inconsistencies in other arguments
- Evidence supporting your position
- Risk factors others may have overlooked

Provide your argument (no need to repeat predictions unless you want to adjust them slightly)."""

    return [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': user_prompt}
    ]

def create_final_prompt(
    market_question: str,
    previous_prediction: Dict[str, int],
    full_debate_history: List[str]
) -> List[Dict[str, str]]:
    """Create prompt for final predictions (Last Round)"""

    prev_pred_text = "\n".join([f"- {outcome}: {pct}%" for outcome, pct in previous_prediction.items()])

    history_text = "\n\n".join(full_debate_history)

    system_prompt = """You are a prediction market analyst making your final prediction after a full debate.
Consider all arguments made and provide your final, considered position."""

    user_prompt = f"""This is the FINAL round for the market: "{market_question}"

Full debate history:
{history_text}

Your previous prediction:
{prev_pred_text}

Now, after hearing all arguments, provide your FINAL prediction:

1. Assign final percentage probabilities to EACH outcome (must sum to exactly 100%)
2. Provide a brief explanation of your final reasoning (2-3 sentences)
3. Note any changes from your initial prediction and explain why you changed (or didn't change) your mind

Be honest about what convinced you or what you still disagree with.

Format your response EXACTLY as follows:
FINAL PREDICTION:
- [Outcome 1]: [X]%
- [Outcome 2]: [Y]%

RATIONALE:
[Your explanation]

CHANGES:
[What changed and why, or why you maintained your position]"""

    return [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': user_prompt}
    ]

def parse_prediction_response(response: str, outcomes: List[Dict]) -> Dict[str, int]:
    """Parse AI response to extract predictions"""
    import re

    predictions = {}

    # Try to find PREDICTION section
    prediction_section = re.search(r'PREDICTION:(.*?)(?:RATIONALE:|$)', response, re.DOTALL | re.IGNORECASE)

    if prediction_section:
        pred_text = prediction_section.group(1)

        # Extract percentages for each outcome
        for outcome in outcomes:
            outcome_name = outcome['name']
            # Look for patterns like "Yes: 65%" or "- Yes: 65%"
            pattern = rf'[-•]?\s*{re.escape(outcome_name)}\s*:?\s*(\d+)%'
            match = re.search(pattern, pred_text, re.IGNORECASE)

            if match:
                predictions[outcome_name] = int(match.group(1))

    # Validate: must have all outcomes and sum to 100
    if len(predictions) != len(outcomes):
        # If parsing failed, distribute equally
        equal_pct = 100 // len(outcomes)
        predictions = {o['name']: equal_pct for o in outcomes}

    total = sum(predictions.values())
    if total != 100:
        # Normalize to 100
        factor = 100 / total
        predictions = {k: int(v * factor) for k, v in predictions.items()}

        # Fix rounding errors
        diff = 100 - sum(predictions.values())
        if diff != 0:
            first_key = list(predictions.keys())[0]
            predictions[first_key] += diff

    return predictions

def parse_rationale(response: str) -> str:
    """Parse AI response to extract rationale"""
    import re

    # Try to find RATIONALE section
    rationale_match = re.search(r'RATIONALE:(.*?)(?:CHANGES:|FINAL PREDICTION:|$)', response, re.DOTALL | re.IGNORECASE)

    if rationale_match:
        return rationale_match.group(1).strip()

    # If no RATIONALE section, return first few sentences
    sentences = response.split('.')[:3]
    return '.'.join(sentences).strip() + '.'
```

**Tasks:**
- [ ] Create `utils/prompts.py`

---

## Phase 6: Debate Orchestration (1.5 hours)

### Step 6.1: Debate Service

Create `services/debate_service.py`:
```python
from typing import Dict, List, Optional, Generator
from models.debate import Debate, DebateModel
from models.message import Message
from services.openrouter import openrouter_service
from services.polymarket import polymarket_service
from utils.prompts import (
    create_initial_prompt,
    create_debate_prompt,
    create_final_prompt,
    parse_prediction_response,
    parse_rationale
)
import time
import json

class DebateOrchestrator:

    def __init__(self, debate: Debate):
        self.debate = debate

    def run_debate(self) -> Generator[Dict, None, None]:
        """Run complete debate and yield SSE events"""

        # Start debate
        self.debate.set_status('in_progress')
        self.debate.save()

        yield {
            'event': 'debate_started',
            'data': {
                'debate_id': self.debate.debate_id,
                'status': 'in_progress',
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            }
        }

        # Run rounds
        for round_num in range(1, self.debate.rounds + 1):
            self.debate.current_round = round_num
            self.debate.save()

            # Determine message type
            if round_num == 1:
                message_type = 'initial'
            elif round_num == self.debate.rounds:
                message_type = 'final'
            else:
                message_type = 'debate'

            # Each model speaks
            for idx, model in enumerate(self.debate.selected_models):
                # Check if paused
                while self.debate.paused:
                    time.sleep(1)
                    self.debate = Debate.load(self.debate.debate_id)

                # Send "thinking" event
                yield {
                    'event': 'model_thinking',
                    'data': {
                        'model_id': model.model_id,
                        'model_name': model.model_name,
                        'round': round_num,
                        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                    }
                }

                # Generate message
                try:
                    message = self._generate_message(
                        model=model,
                        round_num=round_num,
                        sequence=len(self.debate.messages) + 1,
                        message_type=message_type
                    )

                    self.debate.add_message(message)
                    self.debate.save()

                    # Send message event
                    yield {
                        'event': 'message',
                        'data': message.to_dict()
                    }

                except Exception as e:
                    # Model timeout or error
                    yield {
                        'event': 'model_timeout',
                        'data': {
                            'model_id': model.model_id,
                            'model_name': model.model_name,
                            'round': round_num,
                            'message': str(e),
                            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                        }
                    }

            # Round complete
            yield {
                'event': 'round_complete',
                'data': {
                    'round': round_num,
                    'next_round': round_num + 1 if round_num < self.debate.rounds else None,
                    'messages_count': len(self.debate.messages),
                    'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                }
            }

        # Debate complete
        self.debate.set_status('completed')
        self.debate.save()

        yield {
            'event': 'debate_complete',
            'data': {
                'debate_id': self.debate.debate_id,
                'status': 'completed',
                'total_rounds': self.debate.rounds,
                'total_messages': len(self.debate.messages),
                'duration_seconds': self._calculate_duration(),
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                'results_url': f'/api/debate/{self.debate.debate_id}/results'
            }
        }

    def _generate_message(
        self,
        model: DebateModel,
        round_num: int,
        sequence: int,
        message_type: str
    ) -> Message:
        """Generate a single message from a model"""

        # Build prompt based on message type
        if message_type == 'initial':
            messages = create_initial_prompt(
                market_question=self.debate.market_question,
                market_description=self.debate.market_description,
                outcomes=self.debate.outcomes,
                polymarket_odds=self.debate.polymarket_odds
            )

        elif message_type == 'final':
            # Get this model's previous prediction
            prev_prediction = self._get_model_latest_prediction(model.model_id)

            # Get debate history
            history = self._format_debate_history()

            messages = create_final_prompt(
                market_question=self.debate.market_question,
                previous_prediction=prev_prediction,
                full_debate_history=history
            )

        else:  # debate
            # Get this model's current prediction
            your_prediction = self._get_model_latest_prediction(model.model_id)

            # Get other models' predictions
            other_predictions = self._get_other_predictions(model.model_id)

            # Get recent history
            history = self._format_debate_history(limit=5)

            messages = create_debate_prompt(
                market_question=self.debate.market_question,
                your_prediction=your_prediction,
                other_predictions=other_predictions,
                debate_history=history
            )

        # Call OpenRouter
        response_text = openrouter_service.chat_completion(
            model_id=model.model_id,
            messages=messages,
            max_tokens=500,
            temperature=0.7
        )

        # Parse predictions
        predictions = parse_prediction_response(response_text, self.debate.outcomes)

        # Create message
        message = Message.create(
            round=round_num,
            sequence=sequence,
            model_id=model.model_id,
            model_name=model.model_name,
            message_type=message_type,
            text=response_text,
            predictions=predictions
        )

        return message

    def _get_model_latest_prediction(self, model_id: str) -> Dict[str, int]:
        """Get the latest prediction from a specific model"""
        for message in reversed(self.debate.messages):
            if message.model_id == model_id and message.predictions:
                return message.predictions

        # Default: equal distribution
        equal_pct = 100 // len(self.debate.outcomes)
        return {o['name']: equal_pct for o in self.debate.outcomes}

    def _get_other_predictions(self, exclude_model_id: str) -> List[Dict]:
        """Get latest predictions from all other models"""
        predictions = []

        for model in self.debate.selected_models:
            if model.model_id != exclude_model_id:
                latest_pred = self._get_model_latest_prediction(model.model_id)
                predictions.append({
                    'model_name': model.model_name,
                    'predictions': latest_pred
                })

        return predictions

    def _format_debate_history(self, limit: Optional[int] = None) -> List[str]:
        """Format debate messages as text"""
        messages = self.debate.messages

        if limit:
            messages = messages[-limit:]

        history = []
        for msg in messages:
            pred_text = ", ".join([f"{o}: {p}%" for o, p in msg.predictions.items()])
            history.append(f"[{msg.model_name}]: {msg.text}\nPredictions: {pred_text}")

        return history

    def _calculate_duration(self) -> int:
        """Calculate debate duration in seconds"""
        from datetime import datetime

        if not self.debate.completed_at:
            return 0

        start = datetime.fromisoformat(self.debate.created_at.replace('Z', '+00:00'))
        end = datetime.fromisoformat(self.debate.completed_at.replace('Z', '+00:00'))

        return int((end - start).total_seconds())
```

**Tasks:**
- [ ] Create `services/debate_service.py`

---

### Step 6.2: Validators

Create `utils/validators.py`:
```python
from typing import List, Dict
from config import Config

class ValidationError(Exception):
    def __init__(self, errors: Dict[str, str]):
        self.errors = errors
        super().__init__(str(errors))

def validate_debate_start(data: Dict, available_models: List[Dict]) -> None:
    """Validate debate start request"""
    errors = {}

    # Market ID
    if not data.get('market_id'):
        errors['market_id'] = 'Market ID is required'

    # Model IDs
    model_ids = data.get('model_ids', [])

    if not model_ids:
        errors['model_ids'] = 'At least 1 model must be selected'
    elif len(model_ids) > Config.MAX_MODELS_PER_DEBATE:
        errors['model_ids'] = f'Maximum {Config.MAX_MODELS_PER_DEBATE} models allowed'
    else:
        # Check all models are available
        available_ids = {m['id'] for m in available_models}
        invalid_models = [mid for mid in model_ids if mid not in available_ids]

        if invalid_models:
            errors['model_ids'] = f'Invalid model IDs: {", ".join(invalid_models)}'

    # Rounds
    rounds = data.get('rounds')

    if rounds is None:
        errors['rounds'] = 'Rounds is required'
    elif not isinstance(rounds, int):
        errors['rounds'] = 'Rounds must be an integer'
    elif rounds < Config.MIN_ROUNDS or rounds > Config.MAX_ROUNDS:
        errors['rounds'] = f'Rounds must be between {Config.MIN_ROUNDS} and {Config.MAX_ROUNDS}'

    if errors:
        raise ValidationError(errors)
```

**Tasks:**
- [ ] Create `utils/validators.py`

---

### Step 6.3: Debates Routes

Create `routes/debates.py`:
```python
from flask import Blueprint, request, jsonify, Response, stream_with_context
from models.debate import Debate
from services.polymarket import polymarket_service
from services.openrouter import openrouter_service
from services.debate_service import DebateOrchestrator
from utils.validators import validate_debate_start, ValidationError
import json
import time

debates_bp = Blueprint('debates', __name__)

@debates_bp.route('/debate/start', methods=['POST'])
def start_debate():
    """POST /api/debate/start - Create and initialize debate"""
    try:
        data = request.get_json()

        # Get available models
        available_models = openrouter_service.get_models()

        # Validate input
        validate_debate_start(data, available_models)

        # Fetch market details
        market = polymarket_service.get_market(data['market_id'])

        # Get selected models info
        model_ids = data['model_ids']
        selected_models = [m for m in available_models if m['id'] in model_ids]

        # Create debate
        debate = Debate.create(
            market=market,
            models=selected_models,
            rounds=data['rounds']
        )

        debate.save()

        # Return debate info
        return jsonify({
            'debate_id': debate.debate_id,
            'status': debate.status,
            'market': {
                'id': market['id'],
                'question': market['question'],
                'outcomes': market['outcomes']
            },
            'models': [
                {
                    'model_id': m.model_id,
                    'model_name': m.model_name,
                    'provider': m.provider
                } for m in debate.selected_models
            ],
            'rounds': debate.rounds,
            'total_messages_expected': len(selected_models) * debate.rounds,
            'created_at': debate.created_at,
            'stream_url': f'/api/debate/{debate.debate_id}/stream'
        }), 201

    except ValidationError as e:
        return jsonify({
            'error': {
                'code': 'validation_error',
                'message': 'Invalid request parameters',
                'details': e.errors
            }
        }), 400

    except Exception as e:
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': str(e)
            }
        }), 500

@debates_bp.route('/debate/<debate_id>/stream', methods=['GET'])
def stream_debate(debate_id):
    """GET /api/debate/<debate_id>/stream - SSE stream of debate"""

    def generate():
        # Load debate
        debate = Debate.load(debate_id)

        if not debate:
            yield f"event: error\ndata: {json.dumps({'error': 'Debate not found'})}\n\n"
            return

        # Create orchestrator and run debate
        orchestrator = DebateOrchestrator(debate)

        for event in orchestrator.run_debate():
            event_type = event['event']
            event_data = json.dumps(event['data'])

            yield f"event: {event_type}\ndata: {event_data}\n\n"

            # Heartbeat
            time.sleep(0.1)

        # Keep connection alive with heartbeats
        while True:
            yield f":keepalive\n\n"
            time.sleep(15)

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )

@debates_bp.route('/debate/<debate_id>', methods=['GET'])
def get_debate(debate_id):
    """GET /api/debate/<debate_id> - Get debate state"""
    debate = Debate.load(debate_id)

    if not debate:
        return jsonify({
            'error': {
                'code': 'debate_not_found',
                'message': 'Debate not found'
            }
        }), 404

    return jsonify({
        'debate_id': debate.debate_id,
        'status': debate.status,
        'market': {
            'id': debate.market_id,
            'question': debate.market_question,
            'outcomes': debate.outcomes
        },
        'models': [
            {
                'model_id': m.model_id,
                'model_name': m.model_name
            } for m in debate.selected_models
        ],
        'rounds': debate.rounds,
        'current_round': debate.current_round,
        'messages_count': len(debate.messages),
        'created_at': debate.created_at,
        'paused': debate.paused
    }), 200

@debates_bp.route('/debate/<debate_id>/pause', methods=['POST'])
def pause_debate(debate_id):
    """POST /api/debate/<debate_id>/pause - Pause debate"""
    debate = Debate.load(debate_id)

    if not debate:
        return jsonify({'error': {'code': 'debate_not_found'}}), 404

    debate.pause()
    debate.save()

    return jsonify({
        'debate_id': debate.debate_id,
        'status': debate.status,
        'current_round': debate.current_round,
        'paused_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }), 200

@debates_bp.route('/debate/<debate_id>/resume', methods=['POST'])
def resume_debate(debate_id):
    """POST /api/debate/<debate_id>/resume - Resume debate"""
    debate = Debate.load(debate_id)

    if not debate:
        return jsonify({'error': {'code': 'debate_not_found'}}), 404

    debate.resume()
    debate.save()

    return jsonify({
        'debate_id': debate.debate_id,
        'status': debate.status,
        'current_round': debate.current_round,
        'resumed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }), 200

@debates_bp.route('/debate/<debate_id>/stop', methods=['POST'])
def stop_debate(debate_id):
    """POST /api/debate/<debate_id>/stop - Stop debate"""
    debate = Debate.load(debate_id)

    if not debate:
        return jsonify({'error': {'code': 'debate_not_found'}}), 404

    debate.set_status('stopped')
    debate.save()

    return jsonify({
        'debate_id': debate.debate_id,
        'status': debate.status,
        'completed_rounds': debate.current_round,
        'total_messages': len(debate.messages),
        'stopped_at': debate.completed_at
    }), 200

@debates_bp.route('/debates', methods=['GET'])
def list_debates():
    """GET /api/debates - List all debates"""
    limit = request.args.get('limit', 20, type=int)
    offset = request.args.get('offset', 0, type=int)
    status_filter = request.args.get('status', 'all')

    all_debates = Debate.list_all()

    # Filter by status
    if status_filter != 'all':
        all_debates = [d for d in all_debates if d['status'] == status_filter]

    # Pagination
    total = len(all_debates)
    debates = all_debates[offset:offset + limit]

    return jsonify({
        'debates': debates,
        'total': total,
        'offset': offset,
        'limit': limit
    }), 200
```

**Tasks:**
- [ ] Create `routes/debates.py`
- [ ] Register in `app.py`:
```python
from routes.debates import debates_bp
app.register_blueprint(debates_bp, url_prefix='/api')
```

---

## Phase 7: ElevenLabs & Gemini Integration (1 hour)

### Step 7.1: ElevenLabs Service

Create `services/elevenlabs.py`:
```python
import requests
from config import Config
import os

class ElevenLabsService:
    def __init__(self):
        self.api_key = Config.ELEVENLABS_API_KEY
        self.base_url = 'https://api.elevenlabs.io/v1'

        # Voice IDs - can use pre-made voices
        self.voices = {
            'default': '21m00Tcm4TlvDq8ikWAM',  # Rachel
            'deep': 'VR6AewLTigWG4xSOukaG',     # Arnold
            'friendly': 'pNInz6obpgDQGcFmaJgB',  # Adam
        }

    def generate_audio(self, text: str, message_id: str, voice_type: str = 'default') -> dict:
        """Generate TTS audio from text"""

        if not self.api_key:
            # Skip audio generation if no API key
            return {
                'audio_url': None,
                'duration_seconds': 0,
                'voice_used': 'none'
            }

        voice_id = self.voices.get(voice_type, self.voices['default'])

        try:
            response = requests.post(
                f'{self.base_url}/text-to-speech/{voice_id}',
                headers={
                    'xi-api-key': self.api_key,
                    'Content-Type': 'application/json'
                },
                json={
                    'text': text,
                    'model_id': 'eleven_flash_v2_5',  # Fastest model
                    'voice_settings': {
                        'stability': 0.5,
                        'similarity_boost': 0.75
                    }
                },
                timeout=15
            )
            response.raise_for_status()

            # Save audio file
            audio_filename = f'{message_id}.mp3'
            audio_path = os.path.join(Config.AUDIO_PATH, audio_filename)

            with open(audio_path, 'wb') as f:
                f.write(response.content)

            # Estimate duration (rough: ~150 words per minute, ~5 chars per word)
            word_count = len(text) / 5
            duration = (word_count / 150) * 60

            return {
                'audio_url': f'/api/audio/{audio_filename}',
                'duration_seconds': round(duration, 1),
                'voice_used': voice_type
            }

        except Exception as e:
            print(f"ElevenLabs error: {str(e)}")
            return {
                'audio_url': None,
                'duration_seconds': 0,
                'voice_used': 'error'
            }

# Global instance
elevenlabs_service = ElevenLabsService()
```

**Tasks:**
- [ ] Create `services/elevenlabs.py`

---

### Step 7.2: Gemini Service

Create `services/gemini.py`:
```python
import google.generativeai as genai
from config import Config
from typing import Dict, List

class GeminiService:
    def __init__(self):
        if Config.GEMINI_API_KEY:
            genai.configure(api_key=Config.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        else:
            self.model = None

    def summarize_debate(
        self,
        market_question: str,
        outcomes: List[Dict],
        polymarket_odds: Dict[str, int],
        messages: List[Dict],
        final_predictions: Dict
    ) -> Dict:
        """Generate debate summary using Gemini"""

        if not self.model:
            return self._fallback_summary(final_predictions)

        # Format debate transcript
        transcript = self._format_transcript(messages)

        # Format final predictions
        final_preds_text = self._format_final_predictions(final_predictions)

        # Create prompt
        prompt = f"""You are summarizing an AI prediction debate about the Polymarket market: "{market_question}"

Market outcomes: {', '.join([o['name'] for o in outcomes])}
Current Polymarket odds: {', '.join([f'{k}: {v}%' for k, v in polymarket_odds.items()])}

Full debate transcript:
{transcript}

Final predictions from each model:
{final_preds_text}

Provide a comprehensive summary with the following sections:

1. OVERALL SUMMARY (3-4 sentences):
   - What was debated
   - General outcome and consensus level

2. KEY AGREEMENTS:
   - List 2-4 points where models converged or agreed
   - What common ground was found

3. MAJOR DISAGREEMENTS:
   - List 2-3 main points of contention
   - Explain each side's reasoning
   - Why models diverged on these points

4. CONSENSUS ANALYSIS:
   - Did models reach consensus or remain divided?
   - Average prediction across all models
   - Comparison to current Polymarket odds

5. MODEL RATIONALES:
   - For each AI model, summarize their final position and key reasoning
   - Highlight what made their approach unique

Be objective, clear, and highlight the most insightful arguments from the debate."""

        try:
            response = self.model.generate_content(prompt)
            summary_text = response.text

            # Parse summary (simple version - can be improved)
            return {
                'overall': self._extract_section(summary_text, '1. OVERALL SUMMARY'),
                'agreements': self._extract_list(summary_text, '2. KEY AGREEMENTS'),
                'disagreements': [],  # Simplified for MVP
                'consensus': self._extract_section(summary_text, '4. CONSENSUS ANALYSIS'),
                'model_rationales': []  # Simplified for MVP
            }

        except Exception as e:
            print(f"Gemini error: {str(e)}")
            return self._fallback_summary(final_predictions)

    def _format_transcript(self, messages: List[Dict]) -> str:
        """Format messages as transcript"""
        lines = []

        for msg in messages:
            pred_text = ', '.join([f"{o}: {p}%" for o, p in msg['predictions'].items()])
            lines.append(f"[{msg['model_name']} - Round {msg['round']}]")
            lines.append(msg['text'])
            lines.append(f"Predictions: {pred_text}")
            lines.append("")

        return "\n".join(lines)

    def _format_final_predictions(self, final_predictions: Dict) -> str:
        """Format final predictions"""
        lines = []

        for model_name, pred_data in final_predictions.items():
            pred_text = ', '.join([f"{o}: {p}%" for o, p in pred_data['predictions'].items()])
            lines.append(f"{model_name}: {pred_text}")

        return "\n".join(lines)

    def _extract_section(self, text: str, header: str) -> str:
        """Extract section from summary"""
        import re

        pattern = rf'{re.escape(header)}[:\n]+(.*?)(?=\n\d+\.|$)'
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)

        if match:
            return match.group(1).strip()

        return ""

    def _extract_list(self, text: str, header: str) -> List[str]:
        """Extract list items from section"""
        section = self._extract_section(text, header)

        if not section:
            return []

        # Split by bullet points or dashes
        items = []
        for line in section.split('\n'):
            line = line.strip()
            if line.startswith('-') or line.startswith('•'):
                items.append(line[1:].strip())

        return items

    def _fallback_summary(self, final_predictions: Dict) -> Dict:
        """Simple fallback summary if Gemini fails"""
        return {
            'overall': "The AI models debated the market and provided their predictions.",
            'agreements': ["All models participated in the discussion"],
            'disagreements': [],
            'consensus': "Models provided varied predictions.",
            'model_rationales': []
        }

# Global instance
gemini_service = GeminiService()
```

**Tasks:**
- [ ] Create `services/gemini.py`

---

### Step 7.3: Results Endpoint

Add to `routes/debates.py`:
```python
from services.gemini import gemini_service
from utils.cache import cache

@debates_bp.route('/debate/<debate_id>/results', methods=['GET'])
def get_debate_results(debate_id):
    """GET /api/debate/<debate_id>/results - Get final results with Gemini summary"""

    # Check cache first
    cache_key = f'debate_results:{debate_id}'
    cached_result = cache.get(cache_key)

    if cached_result:
        return jsonify(cached_result), 200

    debate = Debate.load(debate_id)

    if not debate:
        return jsonify({'error': {'code': 'debate_not_found'}}), 404

    if debate.status != 'completed' and debate.status != 'stopped':
        return jsonify({'error': {'code': 'debate_not_completed'}}), 425

    # Generate summary if not exists
    if not debate.final_summary:
        # Prepare final predictions
        final_predictions = {}
        for model in debate.selected_models:
            latest_pred = None
            for msg in reversed(debate.messages):
                if msg.model_id == model.model_id:
                    latest_pred = msg
                    break

            if latest_pred:
                final_predictions[model.model_name] = {
                    'predictions': latest_pred.predictions,
                    'rationale': latest_pred.text[:200],
                    'changes': ''
                }

        debate.final_predictions = final_predictions

        # Generate Gemini summary
        summary = gemini_service.summarize_debate(
            market_question=debate.market_question,
            outcomes=debate.outcomes,
            polymarket_odds=debate.polymarket_odds,
            messages=[msg.to_dict() for msg in debate.messages],
            final_predictions=final_predictions
        )

        debate.final_summary = summary
        debate.save()

    # Calculate statistics
    all_preds = []
    for model in debate.selected_models:
        for msg in reversed(debate.messages):
            if msg.model_id == model.model_id:
                all_preds.append(msg.predictions)
                break

    # Calculate average
    if all_preds:
        avg_pred = {}
        for outcome in debate.outcomes:
            outcome_name = outcome['name']
            avg_pred[outcome_name] = int(sum(p[outcome_name] for p in all_preds) / len(all_preds))
    else:
        avg_pred = {}

    result = {
        'debate_id': debate.debate_id,
        'status': debate.status,
        'market': {
            'id': debate.market_id,
            'question': debate.market_question,
            'outcomes': debate.outcomes
        },
        'summary': debate.final_summary,
        'final_predictions': debate.final_predictions,
        'statistics': {
            'average_prediction': avg_pred,
            'polymarket_odds': debate.polymarket_odds,
            'total_messages': len(debate.messages),
            'models_count': len(debate.selected_models),
            'rounds_completed': debate.current_round
        },
        'completed_at': debate.completed_at
    }

    # Cache results permanently
    cache.set(cache_key, result, ttl_seconds=86400 * 30)  # 30 days

    return jsonify(result), 200

@debates_bp.route('/debate/<debate_id>/transcript', methods=['GET'])
def get_debate_transcript(debate_id):
    """GET /api/debate/<debate_id>/transcript - Get full transcript"""

    debate = Debate.load(debate_id)

    if not debate:
        return jsonify({'error': {'code': 'debate_not_found'}}), 404

    format_type = request.args.get('format', 'json')

    if format_type == 'txt':
        # Generate text transcript
        lines = [
            "POLYDEBATE TRANSCRIPT",
            f"Market: {debate.market_question}",
            f"Date: {debate.created_at}",
            f"Models: {len(debate.selected_models)}",
            "",
            "=" * 80,
            ""
        ]

        current_round = 0
        for msg in debate.messages:
            if msg.round != current_round:
                current_round = msg.round
                lines.append(f"\n=== ROUND {current_round} ===\n")

            lines.append(f"[{msg.model_name}]")
            lines.append(msg.text)
            pred_text = ", ".join([f"{o}: {p}%" for o, p in msg.predictions.items()])
            lines.append(f"PREDICTION: {pred_text}")
            lines.append("")

        transcript = "\n".join(lines)

        return Response(transcript, mimetype='text/plain')

    else:  # json
        return jsonify({
            'debate_id': debate.debate_id,
            'market_question': debate.market_question,
            'created_at': debate.created_at,
            'completed_at': debate.completed_at,
            'messages': [msg.to_dict() for msg in debate.messages]
        }), 200
```

**Tasks:**
- [ ] Add functions to `routes/debates.py`
- [ ] Add import: `from flask import Response`

---

### Step 7.4: Audio Endpoint

Create `routes/audio.py`:
```python
from flask import Blueprint, send_file
import os
from config import Config

audio_bp = Blueprint('audio', __name__)

@audio_bp.route('/audio/<filename>', methods=['GET'])
def get_audio(filename):
    """GET /api/audio/<filename> - Serve audio file"""

    audio_path = os.path.join(Config.AUDIO_PATH, filename)

    if not os.path.exists(audio_path):
        return {'error': {'code': 'audio_not_found'}}, 404

    return send_file(
        audio_path,
        mimetype='audio/mpeg',
        as_attachment=False,
        download_name=filename
    )
```

**Tasks:**
- [ ] Create `routes/audio.py`
- [ ] Register in `app.py`:
```python
from routes.audio import audio_bp
app.register_blueprint(audio_bp, url_prefix='/api')
```

---

### Step 7.5: Integrate Audio Generation

Update `services/debate_service.py` for audio generation:

Add at beginning of file:
```python
from services.elevenlabs import elevenlabs_service
```

Update `_generate_message` method (after creating message, before return):
```python
        # Generate audio
        audio_result = elevenlabs_service.generate_audio(
            text=response_text,
            message_id=message.message_id,
            voice_type='default'
        )

        message.audio_url = audio_result['audio_url']
        message.audio_duration = audio_result['duration_seconds']

        return message
```

**Tasks:**
- [ ] Update `services/debate_service.py`

---

## Phase 8: Testing & Debugging (30 minutes)

### Step 8.1: Manual Testing Checklist

**Test each endpoint:**

- [ ] `GET /health` - should return `{"status": "ok"}`
- [ ] `GET /api/markets` - should return list of markets
- [ ] `GET /api/markets/<id>` - should return market details
- [ ] `GET /api/categories` - should return categories
- [ ] `GET /api/models` - should return models
- [ ] `POST /api/debate/start` - should create debate
- [ ] `GET /api/debate/<id>/stream` - should stream events (use EventSource in browser or curl)
- [ ] `GET /api/debate/<id>/results` - should return results after completion
- [ ] `GET /api/audio/<file>.mp3` - should return audio file

---

### Step 8.2: Test Script

Create `test_api.py`:
```python
import requests
import json

BASE_URL = 'http://localhost:5000'

def test_health():
    r = requests.get(f'{BASE_URL}/health')
    print(f"Health: {r.json()}")

def test_markets():
    r = requests.get(f'{BASE_URL}/api/markets?limit=5')
    print(f"Markets count: {len(r.json()['markets'])}")
    return r.json()['markets'][0] if r.json()['markets'] else None

def test_models():
    r = requests.get(f'{BASE_URL}/api/models')
    print(f"Models count: {r.json()['total_count']}")
    return r.json()['models'][:2]  # Get 2 models

def test_start_debate(market, models):
    data = {
        'market_id': market['id'],
        'model_ids': [m['id'] for m in models],
        'rounds': 2
    }

    r = requests.post(f'{BASE_URL}/api/debate/start', json=data)
    print(f"Debate started: {r.json()['debate_id']}")
    return r.json()['debate_id']

if __name__ == '__main__':
    print("=== Testing PolyDebate API ===\n")

    test_health()
    print()

    market = test_markets()
    print()

    models = test_models()
    print()

    if market and models:
        debate_id = test_start_debate(market, models)
        print(f"\nDebate ID: {debate_id}")
        print(f"Stream URL: {BASE_URL}/api/debate/{debate_id}/stream")
```

**Tasks:**
- [ ] Create `test_api.py`
- [ ] Run: `python test_api.py`

---

## Phase 9: Final Polish (30 minutes)

### Step 9.1: Error Handling

Add to `app.py`:
```python
@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'error': {
            'code': 'not_found',
            'message': 'Endpoint not found'
        }
    }), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        'error': {
            'code': 'internal_server_error',
            'message': 'An internal error occurred'
        }
    }), 500
```

---

### Step 9.2: Logging

Add to `app.py`:
```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Log all requests
@app.before_request
def log_request():
    logger.info(f"{request.method} {request.path}")
```

---

### Step 9.3: README

Create `backend/README.md`:
```markdown
# PolyDebate Backend

Flask backend for PolyDebate hackathon project.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file:
```bash
cp .env.example .env
# Edit .env and add your API keys
```

3. Run server:
```bash
python app.py
```

Server will start at http://localhost:5000

## API Documentation

See `/API_SPECIFICATION.md` for full API docs.

## Endpoints

- `GET /health` - Health check
- `GET /api/markets` - Get markets
- `GET /api/models` - Get AI models
- `POST /api/debate/start` - Start debate
- `GET /api/debate/<id>/stream` - Stream debate (SSE)
- `GET /api/debate/<id>/results` - Get results

## Testing

```bash
python test_api.py
```
```

---

## Complete Backend Checklist

### Phase 1: Foundation
- [ ] Project structure created
- [ ] Dependencies installed
- [ ] Config setup with API keys
- [ ] Basic Flask app running

### Phase 2: Polymarket
- [ ] Cache utility working
- [ ] Polymarket service fetching markets
- [ ] Markets routes returning data

### Phase 3: OpenRouter
- [ ] OpenRouter service fetching models
- [ ] Models filtered by price
- [ ] Chat completion working

### Phase 4: Data Models
- [ ] Message model created
- [ ] Debate model with save/load

### Phase 5: Prompts
- [ ] Initial, debate, final prompts
- [ ] Response parsing working

### Phase 6: Debate Orchestration
- [ ] Debate orchestrator running
- [ ] SSE streaming events
- [ ] Pause/resume/stop working

### Phase 7: Audio & Summary
- [ ] ElevenLabs generating audio
- [ ] Gemini summarizing debates
- [ ] Results endpoint returning data

### Phase 8: Testing
- [ ] All endpoints tested
- [ ] Test script passing

### Phase 9: Polish
- [ ] Error handling added
- [ ] Logging configured
- [ ] README written

---

## Estimated Timeline

| Phase | Time | Cumulative |
|-------|------|------------|
| Phase 1: Foundation | 30 min | 0.5h |
| Phase 2: Polymarket | 45 min | 1.25h |
| Phase 3: OpenRouter | 45 min | 2h |
| Phase 4: Data Models | 30 min | 2.5h |
| Phase 5: Prompts | 30 min | 3h |
| Phase 6: Debate | 1.5h | 4.5h |
| Phase 7: Audio/Gemini | 1h | 5.5h |
| Phase 8: Testing | 30 min | 6h |
| Phase 9: Polish | 30 min | 6.5h |

**Total: ~6.5 hours for MVP backend**

---

**Good luck!**
