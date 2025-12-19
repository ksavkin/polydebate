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

**Status:** [ ] Not started

---

#### 2. Database migration
Run after model changes:
```sql
ALTER TABLE users ADD COLUMN daily_debate_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_debate_date DATE;
```

**Status:** [ ] Not started

---

#### 3. Add limit check in debate route
**File:** `backend/routes/debate.py`

Before creating debate:
- Check `current_user.get_remaining_debates()`
- If 0, return 429 error with message "Daily limit reached"

After successful debate creation:
- Call `current_user.increment_debate_count()`
- Commit to database

**Status:** [ ] Not started

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

**Status:** [ ] Not started

---

### Frontend

#### 5. Add API method for limits
**File:** `frontend/src/lib/api.ts`

Add `getLimits()` method that calls `/api/auth/limits`

**Status:** [ ] Not started

---

#### 6. Show remaining debates in Navigation
**File:** `frontend/src/components/Navigation.tsx`

Display "X debates left today" for logged-in users

**Status:** [ ] Not started

---

#### 7. Block debate when limit reached
**File:** `frontend/src/app/market/[id]/debate/page.tsx`

- Disable "Start AI Debate" button when limit = 0
- Show message: "Daily limit reached. Resets at midnight UTC."
- Handle 429 error from API

**Status:** [ ] Not started

---

### Deploy & Test

#### 8. Deploy backend
- [ ] Push to production
- [ ] Verify API is working

#### 9. Deploy frontend
- [ ] Push to production
- [ ] Verify site loads

#### 10. End-to-end testing
- [ ] Register new user
- [ ] Run 3 debates
- [ ] Verify limit blocks 4th debate
- [ ] Verify audio plays
- [ ] Verify results display

---

## Success Criteria

- [ ] Site is live and accessible
- [ ] Users can register/login
- [ ] Users can run up to 3 debates per day
- [ ] Limit message shows when reached
- [ ] Can demo full flow to sponsors

---

## Config

```
DAILY_DEBATE_LIMIT=3
```

Can be changed via environment variable.
