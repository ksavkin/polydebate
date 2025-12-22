# Stage 1: Sponsor Demo

## Goal
Launch a working product to show sponsors.

## Features
- Daily debate limit: **3 debates per user**
- Working integration with ElevenLabs + OpenRouter
- Clean UI, no critical bugs

---

## Tasks

### Backend

#### 1. Add daily limit fields to User model
**File:** `backend/models/user.py`

Add fields:
- `daily_debate_count` (Integer, default 0)
- `last_debate_date` (Date, nullable)

Add methods:
- `get_remaining_debates()` - returns how many debates left today
- `increment_debate_count()` - increments count, resets if new day

**Status:** [x] Completed

---

#### 2. Database migration
Run after model changes:
```sql
ALTER TABLE users ADD COLUMN daily_debate_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_debate_date DATE;
```

**Status:** [x] Completed

---

#### 3. Add limit check in debate route
**File:** `backend/routes/debate.py`

Before creating debate:
- Check `current_user.get_remaining_debates()`
- If 0, return 429 error with message "Daily limit reached"

After successful debate creation:
- Call `current_user.increment_debate_count()`
- Commit to database

**Status:** [x] Completed

---

#### 4. Add limits endpoint
**File:** `backend/routes/auth.py`

New endpoint: `GET /api/auth/limits`

Response:
```json
{
  "daily_limit": 3,
  "remaining_debates": 2,
  "resets_at": "midnight UTC"
}
```

**Status:** [x] Completed

---

### Frontend

#### 5. Add API method for limits
**File:** `frontend/src/lib/api.ts`

Add `getLimits()` method that calls `/api/auth/limits`

**Status:** [x] Completed

---

#### 6. Show remaining debates in Navigation
**File:** `frontend/src/components/Navigation.tsx`

Display "X debates left today" for logged-in users

**Status:** [x] Completed

---

#### 7. Block debate when limit reached
**File:** `frontend/src/app/market/[id]/debate/page.tsx`

- Disable "Start AI Debate" button when limit = 0
- Show message: "Daily limit reached. Resets at midnight UTC."
- Handle 429 error from API

**Status:** [x] Completed

---

### Deploy & Test

#### 8. Deploy backend
- [x] Push to production
- [x] Verify API is working

#### 9. Deploy frontend
- [x] Push to production
- [x] Verify site loads

#### 10. End-to-end testing
- [x] Register new user
- [x] Run 3 debates
- [x] Verify limit blocks 4th debate
- [x] Verify audio plays
- [x] Verify results display

---

## Success Criteria

- [x] Site is live and accessible
- [x] Users can register/login
- [x] Users can run up to 3 debates per day
- [x] Limit message shows when reached
- [x] Can demo full flow to sponsors

---

## Config

```
DAILY_DEBATE_LIMIT=3
```

Can be changed via environment variable.
