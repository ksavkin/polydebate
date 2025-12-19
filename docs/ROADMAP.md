# PolyDebate - MVP Roadmap

## Overview

**Current state:** MVP with working debates, predictions, Gemini summarization, audio player
**Goal:** Launch, get sponsor support, then scale based on traction

---

## What's Already Implemented

- Predictions System (OpenRouter JSON with predictions, validation, normalization)
- Gemini Summarization (summary, agreements, disagreements, consensus, model_rationales)
- Frontend Audio Player (autoplay, queue, sync with messages)
- Results Dashboard (summary, final predictions, model rationales)
- SSE Streaming (events, keepalive, retry logic, error handling)
- Authentication (email-code, JWT tokens)
- Favorites system
- 6 curated AI models

---

## Stage 1: Sponsor Demo

**Goal:** Show sponsors we have a working product

### Features
- Daily debate limit: 3-5 debates per user
- Working integration with ElevenLabs + OpenRouter
- Clean UI, no critical bugs

### Technical Tasks
1. Add daily debate limit (3-5 per user)
2. Deploy frontend + backend
3. Test full flow end-to-end
4. Fix any critical bugs

### Success Criteria
- Site is live and working
- Can demo to sponsors
- Users can register and run debates

---

## Stage 2: Growth with Sponsor Credits

**Goal:** Free debates for users, start building audience

### Trigger
- Received tokens/credits from sponsors
- API costs covered

### Activities
- All debates free for users (no payment system needed)
- Start promoting on Reddit (r/polymarket, r/cryptocurrency, etc.)
- Collect user feedback
- Fix bugs, improve UX

### Technical Tasks (when ready)
1. PostgreSQL migration (for better concurrent handling)
2. Basic rate limiting (prevent abuse)
3. Debate controls (pause/resume/stop) - nice to have
4. ElevenLabs voice improvements - nice to have

### Success Criteria
- Growing user base
- Positive feedback
- Stable system under real usage

---

## Stage 3: Monetization (If Traction)

**Goal:** Sustainable business model

### Trigger
- Active user base (100+ daily users)
- Sponsor credits running low
- Users asking for more debates

### Activities
- Evaluate if payment system makes sense
- Consider premium tiers or token packs
- Possibly seek additional funding

### Technical Tasks (if needed)
1. Payment system (Stripe + tokens)
2. Load testing before scaling
3. Advanced features based on user requests

### Success Criteria
- Self-sustaining or funded for growth
- Clear path to profitability

---

## Implementation Priority

```
Stage 1 (NOW)
└── Daily debate limit (3-5/user)
└── Deploy & test

Stage 2 (After sponsor support)
├── PostgreSQL migration
├── Rate limiting
├── Reddit promotion
└── UX improvements

Stage 3 (If traction)
└── Payment system
└── Scale infrastructure
```

---

## Deferred/Removed

| Feature | Status | Reason |
|---------|--------|--------|
| Model Evaluation System | REMOVED | Only 6 models, manual curation enough |
| Complex payment system | DEFERRED | Wait for traction first |
| Load testing | DEFERRED | Not needed at current scale |

---

## Resources

- **Polymarket API:** https://docs.polymarket.com/
- **OpenRouter API:** https://openrouter.ai/docs
- **ElevenLabs API:** https://elevenlabs.io/docs

---

*Last updated: December 2024*
