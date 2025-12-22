# Stage 1.2: Polish & Fixes

## Goal
Fix remaining bugs and polish the UI before sponsor demo.

## Features
- Working delete functionality for debates
- Fix favorite toggle in profile
- Proper button hover states
- More AI model options (10 models)
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

**New models to add (5 free models):**
1. `xiaomi/mimo-v2-flash:free`
2. `kwaipilot/kat-coder-pro:free`
3. `nvidia/nemotron-nano-12b-v2-vl:free`
4. `z-ai/glm-4.5-air:free`
5. `meta-llama/llama-3.2-3b-instruct:free`

**Status:** [ ] Not started

---

#### 2. Investigate delete debate endpoint
**File:** `backend/routes/debate.py`

Verify DELETE `/api/debates/<debate_id>` endpoint works:
- Check authorization (user owns debate)
- Check soft delete is being committed
- Add logging for debugging

**Status:** [ ] Not started

---

### Frontend

#### 3. Fix delete debate in profile
**File:** `frontend/src/components/profile/DebateCard.tsx`

Debug why delete button (🗑️) is not working:
- Check if API call is being made
- Check error handling
- Ensure UI updates after delete

**Status:** [ ] Not started

---

#### 4. Fix favorite toggle in profile
**File:** `frontend/src/app/profile/page.tsx`

Verify `handleToggleFavorite` works correctly:
- Check API call to unfavorite
- Ensure `is_favorite` state updates
- Refresh debates list after toggle

**Status:** [ ] Not started

---

#### 5. Change "Tokens Remaining" to "Debates Remaining"
**File:** `frontend/src/components/profile/StatisticsCards.tsx`

Update line 27:
```tsx
// Before
<StatCard
  title="Tokens Remaining"
  ...
/>

// After
<StatCard
  title="Debates Left Today"
  ...
/>
```

**Status:** [ ] Not started

---

#### 6. Fix button cursor styling
**File:** `frontend/src/components/Navigation.tsx`

Add `cursor: "pointer"` to button styles:

**"How it works" button (line ~160):**
```tsx
style={{
  ...
  cursor: "pointer",
}}
```

**Profile button (line ~205):**
```tsx
style={{
  ...
  cursor: "pointer",
}}
```

**Logout button (line ~225):**
```tsx
style={{
  ...
  cursor: "pointer",
}}
```

**Status:** [ ] Not started

---

#### 7. Hide filters during debate
**File:** `frontend/src/components/Navigation.tsx`

Hide category tabs and topic chips when on debate page:
```tsx
// Check if on debate page
const isDebatePage = pathname?.includes('/market/') && pathname?.includes('/debate');

// Conditionally render filters
{!isDebatePage && (
  // Category tabs and topic chips
)}
```

**Status:** [ ] Not started

---

#### 8. Verify view debate works
**File:** `frontend/src/app/debate/[id]/page.tsx`

Test viewing completed debates:
- [ ] Navigate from profile → View Debate
- [ ] Check debate messages load
- [ ] Check results display correctly
- [ ] Check audio playback (if available)

**Status:** [ ] Not started

---

## Testing Checklist

- [ ] Delete debate from profile works
- [ ] Unfavorite debate from profile works
- [ ] "Debates Left Today" shows instead of "Tokens Remaining"
- [ ] All 10 AI models appear in model selector
- [ ] Cursor changes to pointer on How it works/Profile/Logout
- [ ] No filters shown during active debate
- [ ] Can view past debates from profile

---

## Success Criteria

- [ ] All delete/unfavorite actions work
- [ ] UI is polished (proper cursors, clean navigation)
- [ ] 10 AI models available for debates
- [ ] Can demo full flow without UI glitches
