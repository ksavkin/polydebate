0. Concept recap: PolyDebate

PolyDebate = “LLMs as market debaters”:
	•	Fetch live Polymarket markets and outcomes.
	•	User picks one market + several LLMs from OpenRouter.
	•	Each LLM is prompted as a market predictor to:
	•	Argue for an outcome.
	•	Output its own probability distribution over outcomes.
	•	Optionally run a few “debate rounds” where models see previous arguments.
	•	Gemini summarizes what happened and why each model chose its probabilities.
	•	Dashboard shows per-outcome percentages per model (Polymarket-style outcome section).
	•	ElevenLabs can read out the final Gemini summary as audio.

Below is a concrete implementation plan in Markdown.

⸻

1. Core requirements and user stories

User stories
	1.	Browse markets
	•	As a user, I can see a list of active Polymarket markets (title, category, current prices).
	•	I can search / filter by category or keyword.
	2.	Start a debate
	•	I pick a market.
	•	I see its outcomes and current implied probabilities (from outcomePrices).
	•	I choose N LLMs from an OpenRouter models list (e.g., “gpt-4.1”, “claude-3.7-sonnet”, “deepseek-r1”).
	•	I click “Start Debate” and the system runs all models.
	3.	View debate + probabilities
	•	I see, for each model:
	•	Its textual argument.
	•	Its predicted probability per outcome (must sum to 1).
	•	I see a Polymarket-style outcome bar showing:
	•	Market’s current price.
	•	Each model’s probability as separate colored bars.
	4.	Get meta-summary
	•	Gemini generates:
	•	A global summary (who is more bullish / bearish on which outcome).
	•	Comparison of reasoning styles.
	•	Caveats / uncertainty.
	5.	Listen to result (optional)
	•	ElevenLabs turns the Gemini summary into an audio clip the user can play.

⸻

2. High-level architecture

Frontend: Next.js (React)
Backend: Flask (Python) as API gateway + orchestrator
External APIs:
	•	Polymarket Gamma Markets API for market data.  ￼
	•	OpenRouter for model list + chat completions.  ￼
	•	Gemini API for summaries.  ￼
	•	ElevenLabs TTS for audio.  ￼

Data store (for hackathon):
	•	Start with SQLite or Postgres to store:
	•	Markets cache.
	•	Debates, model predictions, summaries, and audio URLs/blobs.

⸻

3. External API research summary

3.1 Polymarket Gamma Markets API

Base endpoint: https://gamma-api.polymarket.com  ￼

Key endpoints you will use:
	1.	List markets

GET https://gamma-api.polymarket.com/markets?closed=false&limit=50

Response (trimmed) includes: id, question, slug, category, description, outcomes, outcomePrices, active, closed, volumeNum, etc.  ￼
	•	outcomes: string representation of labels, often an array-like string (e.g., ["Yes","No"] or CSV).
	•	outcomePrices: string representation of prices for each outcome (market-implied probabilities).
	•	You parse these into arrays and normalize to probabilities for context.

	2.	Fetch by tag or all active markets

You can also use /events with closed=false to get all active events and their markets, or filter by tags like “politics”, “sports”.  ￼

Example:

GET https://gamma-api.polymarket.com/events?order=id&ascending=false&closed=false&limit=100

	3.	Fetch by slug (for market detail)

GET https://gamma-api.polymarket.com/markets/slug/{slug}
GET https://gamma-api.polymarket.com/events/slug/{slug}

Use this for per-market detail pages.

3.2 OpenRouter
	•	List models:

GET https://openrouter.ai/api/v1/models
Authorization: Bearer <OPENROUTER_API_KEY>

Returns data[] with id, name, pricing, context_length, etc.  ￼
	•	Chat completions (OpenAI-style):

POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer <OPENROUTER_API_KEY>
Content-Type: application/json

{
  "model": "openai/gpt-4o",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "response_format": { "type": "json_object" }
}

Schema is aligned with OpenAI Chat API, plus OpenRouter-specific options (transforms, route, etc.).  ￼

3.3 Gemini API
	•	Gemini text generation via Google GenAI SDK:  ￼

Python example:

from google import genai

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

resp = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Summarize these model debates: ..."
)
print(resp.text)

You will pass in a structured summary of each model’s probabilities and rationale.

3.4 ElevenLabs TTS

Use ElevenLabs SDK or REST API to convert the Gemini summary into audio.  ￼

Python example with SDK:

from elevenlabs.client import ElevenLabs

client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])

audio = client.text_to_speech.convert(
    text=summary_text,
    voice_id="JBFqnCBsd6RMkjVDRZzb",
    model_id="eleven_multilingual_v2",
    output_format="mp3_44100_128",
)
# Save or stream this audio back to the frontend


⸻

4. Backend (Flask) implementation plan

4.1 Project structure

backend/
  app.py
  config.py
  services/
    polymarket.py
    openrouter.py
    gemini.py
    elevenlabs.py
    debate_orchestrator.py
  models/
    __init__.py
    database.py
    market.py
    debate.py
  migrations/  (optional)

4.2 Configuration

Use environment variables:
	•	POLYMARKET_BASE_URL=https://gamma-api.polymarket.com
	•	OPENROUTER_API_KEY=...
	•	GEMINI_API_KEY=...
	•	ELEVENLABS_API_KEY=...
	•	FRONTEND_ORIGIN=... for CORS.

4.3 Polymarket service (services/polymarket.py)

Functions:
	•	list_markets(filters) -> List[MarketDTO]
	•	Call /markets with closed=false, optional category or search query param.
	•	Parse outcomes and outcomePrices into arrays.
	•	Compute normalized probabilities from outcomePrices.
	•	get_market(market_id_or_slug) -> MarketDTO
	•	Either call /markets/{id} or /markets/slug/{slug}.

DTO shape you expose to frontend:

{
  "id": "string",
  "question": "Who will win the 2028 US election?",
  "category": "Politics",
  "slug": "us-election-2028",
  "description": "…",
  "outcomes": ["Biden", "Trump", "Other"],
  "marketProbabilities": [0.52, 0.44, 0.04],
  "endDate": "2028-11-07T05:31:56Z",
  "volume": 1234567.89
}

4.4 OpenRouter service (services/openrouter.py)
	•	list_models() -> List[ModelDTO]
	•	Proxy GET /api/v1/models.
	•	Filter to models with architecture.modality that includes text->text and probably a reasonable pricing.prompt ceiling.
	•	chat(model_id, messages, response_format=None) -> str
	•	Wrap POST /api/v1/chat/completions.

4.5 Debate orchestrator (services/debate_orchestrator.py)

Goal: for a single market and a set of models, produce:
	•	Per-model distribution over outcomes.
	•	Per-model rationale.
	•	Optional multi-round arguments.

4.5.1 Debate JSON contract
Request from frontend:

{
  "marketId": "abc123",
  "models": ["openai/gpt-4o", "anthropic/claude-3.7-sonnet"],
  "rounds": 1
}

Internal final response format:

{
  "market": {...},  // MarketDTO
  "participants": [
    {
      "modelId": "openai/gpt-4o",
      "modelDisplayName": "GPT-4o",
      "prediction": {
        "probabilities": {
          "Biden": 0.55,
          "Trump": 0.40,
          "Other": 0.05
        },
        "rationale": "Text explanation..."
      }
    },
    {
      "modelId": "anthropic/claude-3.7-sonnet",
      "modelDisplayName": "Claude 3.7 Sonnet",
      "prediction": {
        "probabilities": {
          "Biden": 0.45,
          "Trump": 0.50,
          "Other": 0.05
        },
        "rationale": "Text explanation..."
      }
    }
  ]
}

4.5.2 System prompt design
For each model, you send a system message like:

You are an expert prediction market participant. You are given:
	•	A Polymarket market question.
	•	The list of possible outcomes.
	•	The current market-implied probabilities.
Your job is to assign your own probability distribution over these outcomes and justify it.
Return strictly valid JSON with:
{
“probabilities”: { “<outcome_1>”: float, … },
“rationale”: “string, 2–4 paragraphs”
}
The probabilities must be non-negative and sum to 1.0 (within 0.01 tolerance).

Then:

messages = [
  {
    "role": "system",
    "content": system_prompt
  },
  {
    "role": "user",
    "content": render_market_context(market)
  }
]
resp = openrouter.chat(
  model_id,
  messages,
  response_format={"type": "json_object"}  # for models that support it
)

For “debate” flavor:
	•	Round 1: each model runs independently.
	•	Round 2 (optional): you send each model a second user message that summarizes other models’ probabilities and rationales and ask it to:
	•	Critique the others.
	•	Adjust its distribution slightly if needed.
	•	Again return JSON.

You can store both rounds but expose only final distribution to the dashboard.

4.6 Gemini summarizer (services/gemini.py)
	•	Input: the participants array and the market.
	•	Build a structured, deterministic prompt:

Market: {question}
Outcomes: {outcomes with marketProbabilities}

Models and their views:
- {modelDisplayName}: probabilities {dict}, rationale: {shortened text}
...

Task:
1. Summarize in 3–5 short paragraphs:
   - Consensus vs disagreement.
   - Which outcomes each model favors and why.
   - Key factors cited (polls, fundamentals, etc.).
2. Provide a bullet list:
   - "Most bullish on X:"
   - "Most bearish on X:"
3. Keep it neutral and non-advisory.

	•	Use Gemini 2.5 Flash for cost/latency.  ￼

Return:

{
  "summaryText": "…",
  "bulletPoints": ["...", "..."]
}

4.7 ElevenLabs service (services/elevenlabs.py)
	•	Function: synthesize(summary_text) -> url_or_bytes
	•	Call SDK as shown above.
	•	Either:
	•	Stream audio bytes directly to frontend as audio/mpeg.
	•	Or store in S3 / local /audio/ and return a URL.

4.8 Flask routes (app.py)

Example routes:

GET /api/markets           # list markets
GET /api/markets/<id_or_slug>  # single market
GET /api/models            # OpenRouter models (filtered)
POST /api/debates          # start a debate
GET /api/debates/<debate_id>   # get debate result + probabilities
POST /api/debates/<debate_id>/summary   # Gemini summary
POST /api/debates/<debate_id>/tts       # ElevenLabs audio

For hackathon, you can simplify and have /api/debates already call Gemini and TTS and return everything in one shot.

⸻

5. Frontend (Next.js) implementation plan

Use Next.js 14 with App Router.

5.1 Pages / routes

app/
  layout.tsx
  page.tsx                     # Market list
  market/
    [id]/
      page.tsx                 # Market detail + run debate
  debate/
    [id]/
      page.tsx                 # Debate result dashboard (optional separate view)

5.2 Market list page (/)

Components:
	•	MarketListPage
	•	On load: GET /api/markets.
	•	Show cards similar to Polymarket:
	•	Question, category, short description, endDate, quick view of outcome prices.
	•	Search input -> debounced query param passed to backend (which forwards to Polymarket search/tags).

5.3 Market detail page (/market/[id])

Layout:
	1.	Left panel: Market info
	•	Question, description, end date.
	•	Polymarket outcome prices rendered as horizontal bar chart (Polymarket-style outcome section).
	2.	Right panel: Debate controls
	•	Multi-select dropdown “Choose models” populated by GET /api/models.
	•	Numeric field “Debate rounds” (start with 1).
	•	Toggle “Generate audio summary”.
	3.	Actions
	•	Button “Run AI Debate”.
	•	While running: show a simple progress indicator (e.g., steps: Fetch Market → Call Models → Gemini Summary → TTS).
	4.	Once complete
	•	Show per-model cards:
	•	Model name
	•	Table of outcome probabilities
	•	Rationale snippet (with “expand” for full text).
	•	Show Gemini summary section.
	•	Show “Play audio” button if audio available.

5.4 Debate visualization

Use a chart library (e.g. Recharts) to build:
	•	X-axis: Outcomes.
	•	Y-axis: Probability (0–1).
	•	Series: one bar per model (stacked or grouped), plus a separate “Market price” bar or line.

Representation of data:

type OutcomePoint = {
  outcome: string;
  marketProb: number;
  [modelSlug: string]: number; // e.g., "gpt4oProb": 0.55
};

Populate from backend’s participants array.

5.5 Simple state management
	•	Use React Query or SWR for data fetching:
	•	Cache markets.
	•	Handle loading/error states.
	•	Use URL query parameters to encode selected models and debate id for shareability.

⸻

6. Example end-to-end payloads

6.1 Start debate (frontend → backend)

POST /api/debates
Content-Type: application/json

{
  "marketId": "0x1234abcd",
  "models": [
    "openai/gpt-4o",
    "anthropic/claude-3.7-sonnet"
  ],
  "rounds": 1,
  "withSummary": true,
  "withAudio": false
}

6.2 Debate response (backend → frontend)

{
  "debateId": "deb_01J0X...",
  "market": {
    "id": "0x1234abcd",
    "question": "Will candidate X win election Y?",
    "outcomes": ["Yes", "No"],
    "marketProbabilities": [0.63, 0.37]
  },
  "participants": [
    {
      "modelId": "openai/gpt-4o",
      "modelDisplayName": "GPT-4o",
      "prediction": {
        "probabilities": {"Yes": 0.70, "No": 0.30},
        "rationale": "..."
      }
    },
    {
      "modelId": "anthropic/claude-3.7-sonnet",
      "modelDisplayName": "Claude 3.7 Sonnet",
      "prediction": {
        "probabilities": {"Yes": 0.55, "No": 0.45},
        "rationale": "..."
      }
    }
  ],
  "summary": {
    "summaryText": "Both models lean Yes, but GPT-4o is more confident...",
    "bulletPoints": [
      "Consensus: Yes is favored.",
      "GPT-4o is most bullish on Yes (70%).",
      "Claude highlights uncertainty in polling."
    ]
  },
  "audio": null
}


⸻

7. Phased build plan

Phase 1 – Skeleton
	•	Set up Flask app and Next.js app.
	•	Implement GET /api/markets using Polymarket Gamma /markets?closed=false&limit=50.
	•	Implement market list page in Next.js.

Phase 2 – Basic debate (no multi-round, no audio)
	•	Implement OpenRouter integration:
	•	GET /api/models
	•	openrouter.chat()
	•	Implement POST /api/debates:
	•	Fetch market.
	•	Call 1–2 models with the system prompt and JSON response_format.
	•	Aggregate outputs and return probabilities + rationale.
	•	Implement simple visualization in Next.js.

Phase 3 – Gemini summary
	•	Add Gemini client, implement /api/debates/{id}/summary or integrate into /api/debates.
	•	Render summary UI on frontend.

Phase 4 – ElevenLabs audio
	•	Add ElevenLabs client.
	•	Implement /api/debates/{id}/tts.
	•	Add “Play summary” in UI.

Phase 5 – Polish (for hackathon demo)
	•	Add categories/tags filtering from Polymarket /events//tags.  ￼
	•	Improve prompts, guardrails, and error handling.
	•	Add simple logging of request/response durations to show you are thinking about performance.