# Railway Deployment Guide

This document describes how to deploy the PolyDebate backend to Railway.

## Overview

The PolyDebate backend is a Flask application located in the `backend/` directory. Railway uses Nixpacks to build and deploy the application.

## Project Structure

```
polydebate/
├── backend/              # Flask application
│   ├── app.py           # Main Flask app
│   ├── requirements.txt  # Python dependencies
│   └── ...
├── frontend/             # Next.js frontend (not deployed here)
├── app.py                # Railway entry point (imports backend app)
├── requirements.txt      # Points to backend/requirements.txt
├── runtime.txt          # Python version (3.11)
├── Procfile             # Railway start command
└── nixpacks.toml        # Nixpacks build configuration
```

## Deployment Configuration

### Key Files

1. **`app.py` (root)** - Entry point that imports the backend Flask app
   - Helps Railway detect Python
   - Adds `backend/` to Python path and imports the app

2. **`requirements.txt` (root)** - References backend dependencies
   ```txt
   -r backend/requirements.txt
   ```

3. **`runtime.txt`** - Specifies Python version
   ```
   3.11
   ```

4. **`Procfile`** - Defines the start command
   ```
   web: gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 120 --worker-class gevent
   ```

5. **`nixpacks.toml`** - Nixpacks build configuration
   - Sets up Python 3.11
   - Installs dependencies from `backend/requirements.txt`
   - Configures start command

### Dependencies

Key Python packages (from `backend/requirements.txt`):
- Flask 3.0.0
- gunicorn 21.2.0
- gevent 23.9.1 (for async worker support)
- SQLAlchemy 2.0.23
- aiohttp 3.9.1 (for async HTTP requests)
- elevenlabs, openrouter, and other API clients

## Railway Setup

### 1. Connect Repository

1. Go to Railway dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `polydebate` repository

### 2. Configure Service

**Important**: Railway will detect the Python app automatically from the root `app.py` file.

**Optional Configuration** (if auto-detection fails):
- In Railway dashboard → Service Settings
- Set **Root Directory**: Leave empty (uses root) OR set to `backend` if needed
- Set **Build Command**: `cd backend && python3 -m pip install -r requirements.txt`
- Set **Start Command**: Use Procfile (default) or `cd backend && gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 120 --worker-class gevent`

### 3. Environment Variables

Set these in Railway dashboard → Variables:

**Required:**
```bash
OPENROUTER_API_KEY=sk-or-...
ELEVENLABS_API_KEY=...
JWT_SECRET_KEY=your-secret-key-min-32-chars
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

**Optional:**
```bash
GEMINI_API_KEY=...              # For summaries (not implemented yet)
FLASK_ENV=production
FLASK_DEBUG=False
FRONTEND_URL=https://your-frontend-domain.com
DATABASE_URL=postgresql://...   # If using PostgreSQL (defaults to SQLite)
```

### 4. Database

**Default**: SQLite database stored in `backend/storage/polydebate.db`

**For Production** (recommended):
- Add PostgreSQL service in Railway
- Set `DATABASE_URL` environment variable
- Update `backend/config.py` to use PostgreSQL connection string

### 5. Storage

The app creates these directories automatically:
- `backend/storage/audio/` - Generated audio files
- `backend/storage/avatars/` - User avatars
- `backend/storage/debates/` - Debate data (if using JSON, currently uses SQLite)

**Note**: Railway's filesystem is ephemeral. For production:
- Use external storage (S3, Cloudflare R2) for audio files
- Use PostgreSQL for database
- Consider CDN for serving static files

## Build Process

Railway uses Nixpacks which:

1. **Setup Phase**: Installs Python 3.11
2. **Install Phase**: Runs `cd backend && python3 -m pip install -r requirements.txt`
3. **Build Phase**: Same as install (installs dependencies)
4. **Start Phase**: Runs gunicorn with gevent worker

## Troubleshooting

### Issue: "pip: command not found"

**Solution**: Use `python3 -m pip` instead of `pip` in nixpacks.toml (already fixed)

### Issue: "Railpack could not determine how to build the app"

**Solution**: 
- Ensure `app.py` exists in root directory
- Ensure `requirements.txt` exists in root directory
- Check that `runtime.txt` contains `3.11`

### Issue: "Module not found" errors

**Solution**: 
- Verify `backend/` is in Python path (handled by root `app.py`)
- Check that all dependencies are in `backend/requirements.txt`

### Issue: Database connection errors

**Solution**:
- For SQLite: Ensure `backend/storage/` directory exists and is writable
- For PostgreSQL: Verify `DATABASE_URL` is set correctly
- Check database service is running in Railway

### Issue: Port binding errors

**Solution**:
- Railway sets `$PORT` automatically - don't hardcode port numbers
- Ensure gunicorn binds to `0.0.0.0:$PORT`

### Issue: CORS errors

**Solution**:
- Set `FRONTEND_URL` environment variable to your frontend domain
- Backend allows all origins in development, restrict in production

## Monitoring

### Logs

View logs in Railway dashboard:
- Real-time logs: Service → Logs tab
- Build logs: Deployments → Click deployment

### Health Check

The app has a health endpoint:
```
GET /api/health
```

Returns:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

## Performance Tuning

### Gunicorn Workers

Current configuration:
- Workers: 2
- Threads: 2 per worker
- Worker class: gevent (for async support)
- Timeout: 120 seconds

**Adjust based on:**
- Available memory
- Expected traffic
- CPU cores

Example for higher traffic:
```
--workers 4 --threads 4
```

### Database Connection Pooling

SQLite uses connection pooling automatically. For PostgreSQL:
- Configure pool size in `backend/database.py`
- Set `SQLALCHEMY_POOL_SIZE` environment variable

## Security Checklist

- [ ] Set strong `JWT_SECRET_KEY` (min 32 characters)
- [ ] Set `FLASK_ENV=production`
- [ ] Set `FLASK_DEBUG=False`
- [ ] Configure CORS to allow only your frontend domain
- [ ] Use PostgreSQL for production (not SQLite)
- [ ] Store API keys in Railway environment variables (not in code)
- [ ] Enable Railway's automatic HTTPS
- [ ] Set up database backups
- [ ] Configure rate limiting (if needed)

## Deployment Workflow

1. **Push to GitHub**: Changes trigger automatic deployment
2. **Railway Builds**: Nixpacks builds the Docker image
3. **Railway Deploys**: New version goes live
4. **Health Check**: Verify `/api/health` endpoint

## Rollback

If deployment fails:
1. Go to Railway dashboard → Deployments
2. Find last successful deployment
3. Click "Redeploy"

## Cost Optimization

- Use Railway's free tier for development
- Monitor API usage (OpenRouter, ElevenLabs)
- Consider caching for market data
- Use free AI models when possible
- Optimize database queries

## Related Documentation

- [API Specification](./API_SPECIFICATION.md)
- [Implementation Plan](./implementation_plan.md)
- [Backend Status Report](./archive/BACKEND_STATUS_REPORT.md)

## Support

For issues:
1. Check Railway logs
2. Verify environment variables
3. Test locally with same configuration
4. Check Railway status page

---

**Last Updated**: December 29, 2025
**Deployment Status**: ✅ Working with Nixpacks

