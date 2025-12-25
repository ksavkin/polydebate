# Stage 1.2: Polish & Fixes

## Goal
Fix remaining bugs and polish the UI before sponsor demo.

## Features
- Working delete functionality for debates
- Fix favorite toggle in profile
- Proper button hover states
- More AI model options (11 models)
- Clean navigation during debates

---

## Tasks

### Backend

#### 1. Add more AI models
**File:** `backend/config.py`

Update ALLOWED_MODELS to include free models:
```python
ALLOWED_MODELS = os.getenv(
    'ALLOWED_MODELS',
    'openai/gpt-5.1-chat,anthropic/claude-haiku-4.5,google/gemini-2.5-flash-lite,x-ai/grok-4-fast,qwen/qwen-turbo,deepseek/deepseek-chat-v3.1,xiaomi/mimo-v2-flash:free,kwaipilot/kat-coder-pro:free,nvidia/nemotron-nano-12b-v2-vl:free,z-ai/glm-4.5-air:free,meta-llama/llama-3.2-3b-instruct:free'
).split(',')
```

**Models (11 total):**
1. `openai/gpt-5.1-chat`
2. `anthropic/claude-haiku-4.5`
3. `google/gemini-2.5-flash-lite`
4. `x-ai/grok-4-fast`
5. `qwen/qwen-turbo`
6. `deepseek/deepseek-chat-v3.1`
7. `xiaomi/mimo-v2-flash:free`
8. `kwaipilot/kat-coder-pro:free`
9. `nvidia/nemotron-nano-12b-v2-vl:free`
10. `z-ai/glm-4.5-air:free`
11. `meta-llama/llama-3.2-3b-instruct:free`

**Note:** Free models may output malformed responses. Improved JSON parsing in `backend/services/openrouter.py` handles this with multiple fallback strategies.

**Rate Limiting:** Free models may hit rate limits (429 errors). Added user-friendly handling:
- Backend detects rate limits and sends friendly message
- Frontend shows temporary warning that auto-clears after 5 seconds
- Debate continues with other models

**Status:** [x] Completed (11 models with robust parsing and rate limit handling)

---

#### 2. Investigate delete debate endpoint
**File:** `backend/routes/debate.py`

Verify DELETE `/api/debates/<debate_id>` endpoint works:
- Check authorization (user owns debate)
- Check soft delete is being committed
- Add logging for debugging

**Status:** [x] Completed (endpoint works correctly)

---

### Frontend

#### 3. Fix delete debate in profile
**File:** `frontend/src/components/profile/DebateCard.tsx`

Fixed:
- Updated interface to accept async `onDelete` handler
- Added proper error handling with try/catch
- Added `cursor: pointer` styling to delete button

**Status:** [x] Completed

---

#### 4. Fix favorite toggle in profile
**File:** `frontend/src/components/profile/DebateCard.tsx`

Fixed:
- Updated interface to accept async `onToggleFavorite` handler
- Added `cursor: pointer` styling to favorite button

**Status:** [x] Completed

---

#### 5. Change "Tokens Remaining" to "Debates Left Today"
**Files:**
- `frontend/src/components/profile/StatisticsCards.tsx`
- `frontend/src/app/profile/page.tsx`

Changed:
- Renamed prop from `tokensRemaining` to `debatesRemaining`
- Updated title from "Tokens Remaining" to "Debates Left Today"
- Connected to AuthContext's `remainingDebates` value
- Now shows "X/3" format

**Status:** [x] Completed

---

#### 6. Fix button cursor styling
**File:** `frontend/src/components/Navigation.tsx`

Added `cursor: "pointer"` to:
- "How it works" button
- Profile button
- Logout button
- Login button

**Status:** [x] Completed

---

#### 7. Hide filters during debate
**File:** `frontend/src/components/Navigation.tsx`

Added automatic hiding of bottom bar (category tabs and topic chips) on:
- Debate pages (`/market/*/debate`)
- How it works page
- Profile page
- Auth pages (login/signup)

**Status:** [x] Completed

---

#### 8. Verify view debate works
**File:** `frontend/src/app/debate/[id]/page.tsx`

Tested viewing completed debates:
- [x] API endpoint returns correct data
- [x] Debate messages load
- [x] Results display correctly

**Status:** [x] Completed

---

## Testing Checklist

- [x] Delete debate from profile works
- [x] Unfavorite debate from profile works
- [x] "Debates Left Today" shows instead of "Tokens Remaining"
- [x] All 11 AI models configured
- [x] Cursor changes to pointer on How it works/Profile/Logout
- [x] No filters shown during active debate
- [x] Can view past debates from profile

---

## Success Criteria

- [x] All delete/unfavorite actions work
- [x] UI is polished (proper cursors, clean navigation)
- [x] 11 AI models available for debates
- [x] Can demo full flow without UI glitches
