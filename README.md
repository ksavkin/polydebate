# PolyDebate

AI-powered debate platform that simulates multi-perspective discussions on Polymarket prediction markets. Watch different AI models debate market outcomes with real-time text-to-speech narration.

## Features

- **AI Debates** - Multiple AI models debate prediction market outcomes in real-time
- **Market Integration** - Direct integration with Polymarket API for live market data  
- **Text-to-Speech** - Audio narration of debates using ElevenLabs voices
- **Real-time Updates** - Server-Sent Events (SSE) for live debate streaming
- **User Authentication** - Secure email-based authentication with JWT tokens
- **Favorites System** - Bookmark and track your favorite markets
- **Multi-Model Support** - Support for 100+ AI models via OpenRouter API
- **Responsive UI** - Modern interface built with Next.js and Tailwind CSS

## Tech Stack

**Backend:**
- Flask 3.0.0, SQLite + SQLAlchemy
- JWT authentication with bcrypt
- OpenRouter API (Claude, GPT-4, Gemini, etc.)
- ElevenLabs TTS, Gmail SMTP
- Python 3.8+

**Frontend:**
- Next.js 16.0.3, TypeScript
- Tailwind CSS 4.0
- Radix UI, Framer Motion
- React Context API
- Node.js 18+

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+
- API Keys: [OpenRouter](https://openrouter.ai/keys), [ElevenLabs](https://elevenlabs.io/app/settings/api-keys), Gmail App Password

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/polydebate.git
cd polydebate

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
OPENROUTER_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password
JWT_SECRET_KEY=your_secret_key
```

### Run

```bash
# Terminal 1 - Backend
cd backend
python app.py

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

Open `http://localhost:3000`

## Project Structure

```
polydebate/
├── backend/
│   ├── app.py              # Flask app entry point
│   ├── config.py           # Configuration
│   ├── models/             # SQLAlchemy models
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   ├── components/    # React components
│   │   ├── contexts/      # State management
│   │   └── lib/api.ts     # API client
│   └── package.json
└── storage/               # Database & audio files
```

## API Endpoints

**Authentication:**
- `POST /api/auth/signup/request-code` - Request signup code
- `POST /api/auth/signup/verify-code` - Verify and create account
- `POST /api/auth/login/request-code` - Request login code
- `POST /api/auth/login/verify-code` - Verify and login
- `GET /api/auth/me` - Get current user

**Markets:**
- `GET /api/markets` - List markets
- `GET /api/markets/:slug` - Market details
- `GET /api/categories` - Categories

**Debates:**
- `POST /api/debates` - Create debate
- `GET /api/debates/:id` - Get debate
- `GET /api/debates/:id/stream` - SSE stream

**Favorites:**
- `GET /api/favorites` - List favorites
- `POST /api/favorites` - Add favorite
- `DELETE /api/favorites/:id` - Remove favorite

## Real-time Debate Streaming

The platform uses Server-Sent Events (SSE) to stream debates in real-time:

**How it works:**
1. Client creates a debate via `POST /api/debates`
2. Client connects to SSE endpoint: `GET /api/debates/:id/stream`
3. Backend streams events as AI models generate responses:
   - `debate_started` - Debate initialization
   - `model_response` - Each AI model's argument with predictions
   - `round_complete` - Round finished
   - `debate_complete` - All rounds finished with final summary
   - `error` - Any errors during debate

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | OpenRouter API key | Yes |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | Yes |
| `GMAIL_USER` | Gmail address | Yes |
| `GMAIL_APP_PASSWORD` | Gmail app password | Yes |
| `JWT_SECRET_KEY` | JWT secret | Yes |
| `FRONTEND_URL` | Frontend URL | No |
| `PORT` | Backend port | No |

## Troubleshooting

**Backend won't start:**
- Check Python version: `python --version` (3.8+)
- Verify `.env` file exists with required keys
- Ensure port 5001 is available

**Frontend won't start:**
- Check Node version: `node --version` (18+)
- Clear and reinstall: `rm -rf node_modules && npm install`

**Audio not generating:**
- Verify ElevenLabs API key is valid
- Check API quota not exceeded
- Ensure `storage/audio` directory exists

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License

## Acknowledgments

- [Polymarket](https://polymarket.com/) - Market data API
- [OpenRouter](https://openrouter.ai/) - Multi-model AI access
- [ElevenLabs](https://elevenlabs.io/) - Text-to-speech

---

Built for the prediction market community
