# Railway Deployment Guide

This document describes how to deploy the PolyDebate backend to Railway.

## Project Structure

```
polydebate/
├── backend/              # Flask API (deployed to Railway)
│   ├── app.py           # Main Flask application
│   ├── config.py        # Configuration management
│   ├── database.py      # Database setup
│   ├── requirements.txt # Python dependencies
│   ├── Procfile         # Railway start command
│   ├── nixpacks.toml    # Nixpacks build config
│   ├── railway.json     # Railway deploy config
│   ├── runtime.txt      # Python version (3.11)
│   ├── models/          # SQLAlchemy models
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── utils/           # Utilities
│   └── storage/         # Local storage (audio, avatars, db)
├── frontend/            # Next.js frontend (deployed to Vercel)
└── vercel.json          # Vercel configuration
```

## Railway Setup

### 1. Connect Repository

1. Go to Railway dashboard
2. Click "New Project" > "Deploy from GitHub repo"
3. Select the `polydebate` repository

### 2. Configure Watch Paths

In Railway service settings, set watch paths to only deploy on backend changes:

```
/backend/**
```

This ensures frontend changes don't trigger backend deployments.

### 3. Environment Variables

Set these in Railway dashboard > Variables:

**Required:**
```bash
# API Keys
OPENROUTER_API_KEY=sk-or-...
ELEVENLABS_API_KEY=...
GEMINI_API_KEY=...

# Authentication
JWT_SECRET_KEY=your-secret-key-minimum-32-characters

# Email (Gmail SMTP)
EMAIL_SERVICE=gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password

# Frontend URL (for CORS)
FRONTEND_URL=https://polydebate.com
```

**Optional:**
```bash
# Flask
FLASK_ENV=production
FLASK_DEBUG=False

# Port (Railway sets this automatically)
PORT=8080
```

### 4. Verify Deployment

After deployment, check the health endpoint:

```
GET https://polydebate-backend-production.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-01-01T00:00:00Z",
  "environment": "production"
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/markets` | GET | List markets |
| `/api/markets/:id` | GET | Market details |
| `/api/categories` | GET | List categories |
| `/api/models` | GET | List AI models |
| `/api/debate/start` | POST | Start debate |
| `/api/debate/:id` | GET | Get debate |
| `/api/debate/:id/stream` | GET | SSE stream |
| `/api/auth/*` | * | Authentication |
| `/api/favorites/*` | * | Favorites |

## Troubleshooting

### Backend not starting
- Check Railway logs for errors
- Verify all required environment variables are set
- Ensure `OPENROUTER_API_KEY` and `ELEVENLABS_API_KEY` are valid

### CORS errors
- Verify `FRONTEND_URL` is set to your frontend domain
- Check that frontend is using the correct backend URL

### Database errors
- Railway uses ephemeral filesystem - SQLite data resets on redeploy
- For production, consider PostgreSQL addon

## Frontend Connection

The frontend connects to the backend via `NEXT_PUBLIC_API_URL` environment variable.

In Vercel, set:
```bash
NEXT_PUBLIC_API_URL=https://polydebate-backend-production.up.railway.app
```

---

**Last Updated**: December 2024
