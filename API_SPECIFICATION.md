# PolyDebate - API Data Exchange Specification

**Version**: 2.0 (Implementation Update)
**Date**: 2025-11-16
**Backend**: Flask (Python) + SQLite + SQLAlchemy ORM + Asyncio
**Frontend**: Next.js (React)

---

## IMPLEMENTATION STATUS SUMMARY

**✅ Implemented**: Markets, Models, Debates (create, list, get, stream), Audio serving, Categories
**❌ Not Implemented**: Predictions (empty objects), Gemini summarization, Pause/resume/stop
**🔄 Modified**: One-sentence responses (not 2-4 sentences), SQLite database (not JSON files)

See full implementation status at end of document.

---

## Table of Contents
1. [General Rules](#general-rules)
2. [Endpoints: Polymarket](#endpoints-polymarket)
3. [Endpoints: OpenRouter Models](#endpoints-openrouter-models)
4. [Endpoints: Debates](#endpoints-debates)
5. [Endpoints: Audio](#endpoints-audio)
6. [Endpoints: Categories/Tags](#endpoints-categories)
7. [SSE Stream Format](#sse-stream-format)
8. [Error Handling](#error-handling)
9. [Data Models](#data-models)

---

## General Rules

### Base URL
```
Backend: http://localhost:5000
Frontend: http://localhost:3000
Production: TBD
```

### Content-Type
- Request: `application/json`
- Response: `application/json`
- SSE Stream: `text/event-stream`

### Date/Time Format
- **ISO 8601 UTC**: `2025-11-15T12:00:00Z`
- All timestamps in UTC

### Numbers Format
- **Percentages**: Integer 0-100 (not float 0.0-1.0)
- **Prices/Odds**: Float 0.0-1.0 (as in Polymarket API)
- **Volume**: String with formatting (e.g. "1.2M", "500K")

### IDs Format
- **debate_id**: UUID v4 (e.g. `550e8400-e29b-41d4-a716-446655440000`)
- **message_id**: UUID v4
- **market_id**: String (ID from Polymarket API)
- **model_id**: String (Model ID from OpenRouter)

### CORS
```python
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

---

## Endpoints: Polymarket

### 1. GET `/api/markets`

Get a list of active Polymarket markets.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 100 | Number of markets (max 100) |
| `offset` | integer | No | 0 | Pagination offset |
| `category` | string | No | null | Category slug for filtering (e.g., "politics", "sports", "crypto") |
| `tag_id` | string | No | null | Specific tag ID for filtering (alternative to category) |
| `closed` | boolean | No | false | Include closed markets |

**Note:** Use `category` parameter for filtering by slug (like Polymarket URLs: `/politics`, `/sports`). Use `tag_id` for specific tag filtering.

**Response:** `200 OK`
```json
{
  "markets": [
    {
      "id": "will-bitcoin-reach-100k-2025",
      "question": "Will Bitcoin reach $100k in 2025?",
      "description": "This market will resolve to Yes if...",
      "category": "Crypto",
      "tag_id": "crypto-100",
      "outcomes": [
        {
          "name": "Yes",
          "slug": "yes",
          "price": 0.45
        },
        {
          "name": "No",
          "slug": "no",
          "price": 0.55
        }
      ],
      "volume": "1.2M",
      "end_date": "2025-12-31T23:59:59Z",
      "created_date": "2025-01-01T00:00:00Z",
      "image_url": "https://polymarket-cdn.com/images/market123.jpg"
    }
  ],
  "total": 245,
  "offset": 0,
  "limit": 100,
  "has_more": true
}
```

**Cache:**
- Duration: 5 minutes
- Cache key: `markets:{limit}:{offset}:{category}:{tag_id}:{closed}`

**Examples:**
- All markets: `GET /api/markets?limit=100`
- Politics category: `GET /api/markets?category=politics`
- Sports category: `GET /api/markets?category=sports`
- Specific tag: `GET /api/markets?tag_id=crypto-100`
- Closed markets in politics: `GET /api/markets?category=politics&closed=true`

---

### 2. GET `/api/markets/<category_slug>`

Get markets by category slug (Polymarket-style URLs).

**Path Parameters:**
- `category_slug` (string): Category slug (e.g., "politics", "sports", "crypto")

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 100 | Number of markets (max 100) |
| `offset` | integer | No | 0 | Pagination offset |
| `closed` | boolean | No | false | Include closed markets |

**Response:** Same as `GET /api/markets` (returns markets list)

**Examples:**
- Politics markets: `GET /api/markets/politics`
- Sports markets: `GET /api/markets/sports?limit=20`
- Crypto markets: `GET /api/markets/crypto`
- Breaking news: `GET /api/markets/breaking`
- Trending markets: `GET /api/markets/trending?limit=10`
- New markets: `GET /api/markets/new`
- Economy markets: `GET /api/markets/economy`
- Culture markets: `GET /api/markets/culture` or `GET /api/markets/pop-culture`

**Note:** This endpoint provides a cleaner URL structure similar to Polymarket. If the path is numeric, it's treated as a market ID (see next endpoint).

**Supported category slugs:**
- `politics` - Political markets (sorted by 24hr volume)
- `sports` - Sports markets (sorted by 24hr volume)
- `crypto` - Cryptocurrency markets (sorted by 24hr volume)
- `business` - Business & finance markets (sorted by 24hr volume)
- `science` - Science & technology markets (sorted by 24hr volume)
- `technology` - Technology markets (sorted by 24hr volume)
- `finance` - Finance markets (sorted by 24hr volume)
- `ai` - AI & machine learning markets (sorted by 24hr volume)
- `world` - World events (sorted by 24hr volume)
- `geopolitics` - Geopolitics markets (sorted by 24hr volume)
- `economy` - Economy markets (sorted by 24hr volume)
- `earnings` - Earnings markets (sorted by 24hr volume)
- `culture` or `pop-culture` - Pop culture markets (sorted by 24hr volume)
- `global-elections` or `elections` - Global elections markets (sorted by 24hr volume)
- `breaking` - Breaking news markets (sorted by largest price changes in 24hr)
- `trending` - Trending markets (sorted by 24hr volume)
- `new` - Newest markets (sorted by creation date, newest first)

**Special Categories:**
- **`breaking`**: Uses Polymarket's biggest-movers API to show markets with the largest price changes in the last 24 hours, representing breaking news and rapidly developing events.
- **`trending`**: Shows markets sorted by 24-hour trading volume (descending), representing the most active markets.
- **`new`**: Shows markets sorted by creation date (newest first), displaying recently created prediction markets.

**Default Behavior:**
- All regular categories (politics, sports, crypto, etc.) are sorted by 24-hour trading volume in descending order
- All categories show active markets with all frequencies (both open and closed markets)
- Results are paginated with a maximum of 100 items per request

---

### 3. GET `/api/markets/<market_id>`

Get detailed information about a specific market.

**Path Parameters:**
- `market_id` (string): Market ID from Polymarket

**Response:** `200 OK`
```json
{
  "id": "will-bitcoin-reach-100k-2025",
  "question": "Will Bitcoin reach $100k in 2025?",
  "description": "This market will resolve to Yes if Bitcoin's price reaches or exceeds $100,000 USD at any point during 2025 on major exchanges (Coinbase, Binance, Kraken).",
  "category": "Crypto",
  "tag_id": "crypto-100",
  "market_type": "binary",
  "outcomes": [
    {
      "name": "Yes",
      "slug": "yes",
      "price": 0.45,
      "shares": "250000"
    },
    {
      "name": "No",
      "slug": "no",
      "price": 0.55,
      "shares": "300000"
    }
  ],
  "volume": "1.2M",
  "volume_24h": "150K",
  "liquidity": "800K",
  "end_date": "2025-12-31T23:59:59Z",
  "created_date": "2025-01-01T00:00:00Z",
  "resolution_source": "CoinGecko API",
  "image_url": "https://polymarket-cdn.com/images/market123.jpg"
}
```

**Cache:**
- Duration: 2 minutes (more frequent updates for details)
- Cache key: `market:{market_id}`

**Errors:**
- `404 Not Found`: Market not found
- `503 Service Unavailable`: Polymarket API unavailable

---

## Endpoints: Categories

### 3. GET `/api/categories`

Get a list of all available categories/tags.

**Response:** `200 OK`
```json
{
  "categories": [
    {
      "id": "crypto-100",
      "name": "Crypto",
      "slug": "crypto",
      "market_count": 45,
      "icon_url": "https://polymarket-cdn.com/icons/crypto.svg"
    },
    {
      "id": "politics-200",
      "name": "Politics",
      "slug": "politics",
      "market_count": 120,
      "icon_url": "https://polymarket-cdn.com/icons/politics.svg"
    },
    {
      "id": "sports-300",
      "name": "Sports",
      "slug": "sports",
      "market_count": 80,
      "icon_url": "https://polymarket-cdn.com/icons/sports.svg"
    }
  ]
}
```

**Cache:**
- Duration: 10 minutes
- Cache key: `categories:all`

---

## Endpoints: OpenRouter Models

### 4. GET `/api/models`

Get a list of available AI models filtered by price <= $0.5/1M tokens.

**Response:** `200 OK`
```json
{
  "models": [
    {
      "id": "deepseek/deepseek-chat-v3-0324:free",
      "name": "DeepSeek Chat V3",
      "provider": "DeepSeek",
      "description": "Advanced reasoning model with strong analytical capabilities",
      "pricing": {
        "input": 0.0,
        "output": 0.0,
        "total_per_million": 0.0
      },
      "is_free": true,
      "context_length": 64000,
      "max_output_tokens": 8000,
      "supported": true
    },
    {
      "id": "google/gemini-2.0-flash-exp:free",
      "name": "Gemini 2.0 Flash",
      "provider": "Google",
      "description": "Fast multimodal model optimized for speed",
      "pricing": {
        "input": 0.0,
        "output": 0.0,
        "total_per_million": 0.0
      },
      "is_free": true,
      "context_length": 32000,
      "max_output_tokens": 4096,
      "supported": true
    },
    {
      "id": "meta-llama/llama-3.3-70b-instruct:free",
      "name": "Llama 3.3 70B Instruct",
      "provider": "Meta",
      "description": "Open-source instruction-following model",
      "pricing": {
        "input": 0.0,
        "output": 0.0,
        "total_per_million": 0.0
      },
      "is_free": true,
      "context_length": 8000,
      "max_output_tokens": 2048,
      "supported": true
    }
  ],
  "total_count": 15,
  "free_count": 12,
  "paid_count": 3
}
```

**Cache:**
- Duration: 1 hour
- Cache key: `models:filtered`

**Notes:**
- Only models with `total_per_million ≤ 0.5`
- Free models always included

---

## Endpoints: Debates

### 5. POST `/api/debate/start`

Create and start a new debate.

**Request Body:**
```json
{
  "market_id": "will-bitcoin-reach-100k-2025",
  "model_ids": [
    "deepseek/deepseek-chat-v3-0324:free",
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free"
  ],
  "rounds": 3
}
```

**Validation:**
- `market_id`: required, must exist in Polymarket
- `model_ids`: required, array length 1-10, each model must be in available models list
- `rounds`: required, integer 1-10

**Response:** `201 Created`
```json
{
  "debate_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "initialized",
  "market": {
    "id": "will-bitcoin-reach-100k-2025",
    "question": "Will Bitcoin reach $100k in 2025?",
    "outcomes": [
      {"name": "Yes", "price": 0.45},
      {"name": "No", "price": 0.55}
    ]
  },
  "models": [
    {
      "model_id": "deepseek/deepseek-chat-v3-0324:free",
      "model_name": "DeepSeek Chat V3",
      "provider": "DeepSeek"
    },
    {
      "model_id": "google/gemini-2.0-flash-exp:free",
      "model_name": "Gemini 2.0 Flash",
      "provider": "Google"
    },
    {
      "model_id": "meta-llama/llama-3.3-70b-instruct:free",
      "model_name": "Llama 3.3 70B Instruct",
      "provider": "Meta"
    }
  ],
  "rounds": 3,
  "total_messages_expected": 9,
  "created_at": "2025-11-15T12:00:00Z",
  "stream_url": "/api/debate/550e8400-e29b-41d4-a716-446655440000/stream"
}
```

**Errors:**
- `400 Bad Request`: Invalid input (validation errors)
- `404 Not Found`: Market not found
- `422 Unprocessable Entity`: Model not available

---

### 6. GET `/api/debate/<debate_id>/stream`

SSE endpoint for receiving live debate updates.

**Path Parameters:**
- `debate_id` (UUID): Debate ID

**Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event Types:**

#### Event: `debate_started`
```
event: debate_started
data: {"debate_id": "550e8400...", "status": "in_progress", "timestamp": "2025-11-15T12:00:01Z"}
```

#### Event: `model_thinking`
```
event: model_thinking
data: {"model_id": "deepseek/deepseek-v3", "model_name": "DeepSeek Chat V3", "round": 1, "timestamp": "2025-11-15T12:00:02Z"}
```

#### Event: `message`
```
event: message
data: {
  "message_id": "msg-uuid-001",
  "round": 1,
  "model_id": "deepseek/deepseek-chat-v3-0324:free",
  "model_name": "DeepSeek Chat V3",
  "message_type": "initial",
  "text": "Based on historical halving cycles and institutional adoption trends, I predict Bitcoin has a strong chance of reaching $100k in 2025. The upcoming halving in April 2024 typically leads to price increases 12-18 months later.",
  "predictions": {
    "Yes": 65,
    "No": 35
  },
  "audio_url": "/api/audio/msg-uuid-001.mp3",
  "audio_duration": 12.5,
  "timestamp": "2025-11-15T12:00:08Z"
}
```

#### Event: `model_timeout`
```
event: model_timeout
data: {
  "model_id": "google/gemini-flash",
  "model_name": "Gemini 2.0 Flash",
  "round": 2,
  "message": "Model did not respond within 30 seconds",
  "timestamp": "2025-11-15T12:01:30Z"
}
```

#### Event: `round_complete`
```
event: round_complete
data: {
  "round": 1,
  "next_round": 2,
  "messages_count": 3,
  "timestamp": "2025-11-15T12:00:25Z"
}
```

#### Event: `debate_paused`
```
event: debate_paused
data: {
  "debate_id": "550e8400...",
  "paused_by": "user",
  "current_round": 2,
  "timestamp": "2025-11-15T12:01:00Z"
}
```

#### Event: `debate_resumed`
```
event: debate_resumed
data: {
  "debate_id": "550e8400...",
  "current_round": 2,
  "timestamp": "2025-11-15T12:01:30Z"
}
```

#### Event: `debate_complete`
```
event: debate_complete
data: {
  "debate_id": "550e8400...",
  "status": "completed",
  "total_rounds": 3,
  "total_messages": 9,
  "duration_seconds": 180,
  "timestamp": "2025-11-15T12:03:00Z",
  "results_url": "/api/debate/550e8400.../results"
}
```

#### Event: `error`
```
event: error
data: {
  "error_type": "model_error",
  "model_id": "deepseek/deepseek-v3",
  "message": "Rate limit exceeded for this model",
  "retry_after": 60,
  "timestamp": "2025-11-15T12:00:15Z"
}
```

**Connection Management:**
- Heartbeat: Send `:keepalive\n\n` every 15 seconds
- Reconnection: Client should reconnect with `Last-Event-ID` header
- Timeout: 30 seconds for generating one message

---

### 7. GET `/api/debate/<debate_id>`

Get the current debate state.

**Path Parameters:**
- `debate_id` (UUID): Debate ID

**Response:** `200 OK`
```json
{
  "debate_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "in_progress",
  "market": {
    "id": "will-bitcoin-reach-100k-2025",
    "question": "Will Bitcoin reach $100k in 2025?",
    "outcomes": [
      {"name": "Yes", "price": 0.45},
      {"name": "No", "price": 0.55}
    ]
  },
  "models": [
    {
      "model_id": "deepseek/deepseek-v3",
      "model_name": "DeepSeek Chat V3"
    }
  ],
  "rounds": 3,
  "current_round": 2,
  "messages_count": 6,
  "created_at": "2025-11-15T12:00:00Z",
  "paused": false
}
```

**Errors:**
- `404 Not Found`: Debate not found

---

### 8. POST `/api/debate/<debate_id>/pause`

Pause the debate.

**Path Parameters:**
- `debate_id` (UUID): Debate ID

**Response:** `200 OK`
```json
{
  "debate_id": "550e8400...",
  "status": "paused",
  "current_round": 2,
  "paused_at": "2025-11-15T12:01:00Z"
}
```

---

### 9. POST `/api/debate/<debate_id>/resume` ❌ NOT IMPLEMENTED

**STATUS**: Code exists in routes but not tested/working

Resume the debate after pause.

**Path Parameters:**
- `debate_id` (UUID): Debate ID

**Response:** `200 OK`
```json
{
  "debate_id": "550e8400...",
  "status": "in_progress",
  "current_round": 2,
  "resumed_at": "2025-11-15T12:01:30Z"
}
```

---

### 10. POST `/api/debate/<debate_id>/stop` ❌ NOT IMPLEMENTED

**STATUS**: Code exists in routes but not tested/working

Completely stop the debate (early termination).

**Path Parameters:**
- `debate_id` (UUID): Debate ID

**Response:** `200 OK`
```json
{
  "debate_id": "550e8400...",
  "status": "stopped",
  "completed_rounds": 2,
  "total_messages": 6,
  "stopped_at": "2025-11-15T12:02:00Z"
}
```

---

### 11. GET `/api/debate/<debate_id>/results` ❌ NOT IMPLEMENTED (Gemini summarization)

**STATUS**: Endpoint doesn't exist, Gemini integration not completed

Get final debate results with Gemini summarization.

**Path Parameters:**
- `debate_id` (UUID): Debate ID

**Response:** `200 OK`
```json
{
  "debate_id": "550e8400...",
  "status": "completed",
  "market": {
    "id": "will-bitcoin-reach-100k-2025",
    "question": "Will Bitcoin reach $100k in 2025?",
    "outcomes": [
      {"name": "Yes", "price": 0.45},
      {"name": "No", "price": 0.55}
    ]
  },
  "summary": {
    "overall": "The AI models debated the likelihood of Bitcoin reaching $100k in 2025, with most models showing bullish sentiment. Key factors discussed included the upcoming halving, institutional adoption, and regulatory environment. The average prediction was 63% for Yes.",
    "agreements": [
      "All models agreed that the 2024 halving is a significant bullish catalyst",
      "Institutional adoption (ETFs, corporate treasuries) is accelerating",
      "Historical patterns suggest price increases 12-18 months post-halving"
    ],
    "disagreements": [
      {
        "topic": "Regulatory impact",
        "positions": {
          "DeepSeek V3": "Believes regulatory clarity will boost institutional adoption (65% Yes)",
          "Gemini Flash": "Concerned that potential regulations may create uncertainty (58% Yes)",
          "Llama 3.3": "Thinks regulation impact is already priced in (60% Yes)"
        }
      },
      {
        "topic": "Macroeconomic conditions",
        "positions": {
          "DeepSeek V3": "Expects favorable conditions with potential Fed rate cuts",
          "Gemini Flash": "Warns about recession risks dampening crypto investment"
        }
      }
    ],
    "consensus": "Models are moderately bullish with 61% average probability for Yes. Consensus is that Bitcoin will likely reach $100k, but timing and sustainability are uncertain.",
    "model_rationales": [
      {
        "model": "DeepSeek Chat V3",
        "final_prediction": {"Yes": 65, "No": 35},
        "rationale": "Historical halving cycles combined with institutional adoption trends and improving regulatory clarity create favorable conditions. The ETF approval in 2024 significantly de-risked institutional entry.",
        "key_arguments": [
          "Halving supply shock historically bullish",
          "ETF inflows could drive demand",
          "Corporate adoption (MicroStrategy model) expanding"
        ]
      },
      {
        "model": "Gemini 2.0 Flash",
        "final_prediction": {"Yes": 58, "No": 42},
        "rationale": "While long-term fundamentals are positive, macroeconomic headwinds and regulatory uncertainty in key markets may delay or prevent reaching $100k in 2025 specifically.",
        "key_arguments": [
          "Macro conditions uncertain (recession risk)",
          "Regulatory clarity still lacking in some jurisdictions",
          "Competition from other crypto assets"
        ]
      },
      {
        "model": "Llama 3.3 70B Instruct",
        "final_prediction": {"Yes": 60, "No": 40},
        "rationale": "Balanced view considering both bullish supply dynamics and bearish macro risks. Historical patterns support eventual price appreciation, but timing is uncertain.",
        "key_arguments": [
          "Supply dynamics favor price increase",
          "Market maturity reducing volatility",
          "Tech improvements (Lightning, scaling) increasing utility"
        ]
      }
    ]
  },
  "final_predictions": {
    "deepseek/deepseek-chat-v3-0324:free": {
      "predictions": {"Yes": 65, "No": 35},
      "initial_predictions": {"Yes": 60, "No": 40},
      "change": "+5% Yes after considering institutional adoption arguments"
    },
    "google/gemini-2.0-flash-exp:free": {
      "predictions": {"Yes": 58, "No": 42},
      "initial_predictions": {"Yes": 55, "No": 45},
      "change": "+3% Yes, slightly more optimistic after halving discussion"
    },
    "meta-llama/llama-3.3-70b-instruct:free": {
      "predictions": {"Yes": 60, "No": 40},
      "initial_predictions": {"Yes": 60, "No": 40},
      "change": "No change, maintained position as arguments balanced"
    }
  },
  "statistics": {
    "average_prediction": {"Yes": 61, "No": 39},
    "median_prediction": {"Yes": 60, "No": 40},
    "prediction_variance": 12.3,
    "polymarket_odds": {"Yes": 45, "No": 55},
    "ai_vs_market_delta": "+16% more bullish than market",
    "total_messages": 9,
    "total_duration_seconds": 180,
    "models_count": 3,
    "rounds_completed": 3
  },
  "completed_at": "2025-11-15T12:03:00Z"
}
```

**Cache:**
- Duration: infinite (results don't change)
- Cache key: `debate_results:{debate_id}`

**Errors:**
- `404 Not Found`: Debate not found
- `425 Too Early`: Debate not completed yet

---

### 12. GET `/api/debate/<debate_id>/transcript`

Get the full debate transcript.

**Path Parameters:**
- `debate_id` (UUID): Debate ID

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `format` | string | `json` | Format: `json` or `txt` |
| `include_audio` | boolean | `false` | Include audio links |

**Response (format=json):** `200 OK`
```json
{
  "debate_id": "550e8400...",
  "market_question": "Will Bitcoin reach $100k in 2025?",
  "created_at": "2025-11-15T12:00:00Z",
  "completed_at": "2025-11-15T12:03:00Z",
  "messages": [
    {
      "message_id": "msg-001",
      "round": 1,
      "sequence": 1,
      "model_id": "deepseek/deepseek-v3",
      "model_name": "DeepSeek Chat V3",
      "message_type": "initial",
      "text": "Based on historical halving cycles...",
      "predictions": {"Yes": 60, "No": 40},
      "audio_url": "/api/audio/msg-001.mp3",
      "timestamp": "2025-11-15T12:00:05Z"
    }
  ]
}
```

**Response (format=txt):** `200 OK`
```
POLYDEBATE TRANSCRIPT
Market: Will Bitcoin reach $100k in 2025?
Date: 2025-11-15
Duration: 3 minutes

=== ROUND 1: INITIAL PREDICTIONS ===

[DeepSeek Chat V3]
Based on historical halving cycles...
PREDICTION: Yes 60%, No 40%

[Gemini 2.0 Flash]
Market sentiment indicates...
PREDICTION: Yes 55%, No 45%

...
```

---

### 13. GET `/api/debates`

Get a list of all debates (for history).

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Number of debates |
| `offset` | integer | 0 | Offset |
| `status` | string | `all` | `all`, `completed`, `in_progress` |
| `market_id` | string | null | Filter by specific market |

**Response:** `200 OK`
```json
{
  "debates": [
    {
      "debate_id": "550e8400...",
      "market_id": "will-bitcoin-reach-100k-2025",
      "market_question": "Will Bitcoin reach $100k in 2025?",
      "status": "completed",
      "models_count": 3,
      "rounds": 3,
      "models": [
        {
          "model_id": "deepseek/deepseek-chat-v3-0324:free",
          "model_name": "DeepSeek Chat V3"
        },
        {
          "model_id": "google/gemini-2.0-flash-exp:free",
          "model_name": "Gemini 2.0 Flash"
        },
        {
          "model_id": "meta-llama/llama-3.3-70b-instruct:free",
          "model_name": "Llama 3.3 70B Instruct"
        }
      ],
      "average_prediction": {"Yes": 61, "No": 39},
      "created_at": "2025-11-15T12:00:00Z",
      "completed_at": "2025-11-15T12:03:00Z",
      "duration_seconds": 180
    }
  ],
  "total": 50,
  "offset": 0,
  "limit": 20
}
```

**Examples:**
- All debates: `GET /api/debates?limit=20&offset=0`
- Completed only: `GET /api/debates?status=completed`
- Debates for specific market: `GET /api/debates?market_id=will-bitcoin-reach-100k-2025`

---

### 14. GET `/api/markets/<market_id>/debates`

Get all debates for a specific market (for displaying history on the market page).

**Path Parameters:**
- `market_id` (string): Market ID from Polymarket

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 10 | Number of debates |
| `offset` | integer | 0 | Offset |
| `status` | string | `completed` | `all`, `completed`, `in_progress` |

**Response:** `200 OK`
```json
{
  "market": {
    "id": "will-bitcoin-reach-100k-2025",
    "question": "Will Bitcoin reach $100k in 2025?",
    "current_odds": {
      "Yes": 45,
      "No": 55
    }
  },
  "debates": [
    {
      "debate_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "rounds": 3,
      "models_count": 3,
      "models": [
        {
          "model_id": "deepseek/deepseek-chat-v3-0324:free",
          "model_name": "DeepSeek Chat V3",
          "provider": "DeepSeek"
        },
        {
          "model_id": "google/gemini-2.0-flash-exp:free",
          "model_name": "Gemini 2.0 Flash",
          "provider": "Google"
        },
        {
          "model_id": "meta-llama/llama-3.3-70b-instruct:free",
          "model_name": "Llama 3.3 70B Instruct",
          "provider": "Meta"
        }
      ],
      "final_predictions": {
        "average": {"Yes": 61, "No": 39},
        "median": {"Yes": 60, "No": 40},
        "range": {
          "Yes": {"min": 58, "max": 65},
          "No": {"min": 35, "max": 42}
        }
      },
      "consensus_level": "moderate",
      "created_at": "2025-11-15T12:00:00Z",
      "completed_at": "2025-11-15T12:03:00Z",
      "duration_seconds": 180,
      "total_messages": 9
    },
    {
      "debate_id": "660e8400-e29b-41d4-a716-446655440111",
      "status": "completed",
      "rounds": 5,
      "models_count": 5,
      "models": [
        {
          "model_id": "deepseek/deepseek-chat-v3-0324:free",
          "model_name": "DeepSeek Chat V3",
          "provider": "DeepSeek"
        },
        {
          "model_id": "google/gemini-2.0-flash-exp:free",
          "model_name": "Gemini 2.0 Flash",
          "provider": "Google"
        },
        {
          "model_id": "meta-llama/llama-3.3-70b-instruct:free",
          "model_name": "Llama 3.3 70B Instruct",
          "provider": "Meta"
        },
        {
          "model_id": "google/gemma-3-27b-it:free",
          "model_name": "Gemma 3 27B",
          "provider": "Google"
        },
        {
          "model_id": "mistralai/mistral-small-3.1-24b-instruct:free",
          "model_name": "Mistral Small 3.1",
          "provider": "Mistral AI"
        }
      ],
      "final_predictions": {
        "average": {"Yes": 58, "No": 42},
        "median": {"Yes": 57, "No": 43},
        "range": {
          "Yes": {"min": 52, "max": 68},
          "No": {"min": 32, "max": 48}
        }
      },
      "consensus_level": "low",
      "created_at": "2025-11-14T10:30:00Z",
      "completed_at": "2025-11-14T10:40:00Z",
      "duration_seconds": 600,
      "total_messages": 25
    }
  ],
  "statistics": {
    "total_debates": 12,
    "completed_debates": 10,
    "in_progress_debates": 2,
    "most_used_models": [
      {
        "model_id": "deepseek/deepseek-chat-v3-0324:free",
        "model_name": "DeepSeek Chat V3",
        "usage_count": 10
      },
      {
        "model_id": "google/gemini-2.0-flash-exp:free",
        "model_name": "Gemini 2.0 Flash",
        "usage_count": 8
      }
    ],
    "average_ai_prediction": {"Yes": 59, "No": 41},
    "ai_vs_market_delta": "+14% more bullish than market"
  },
  "total": 12,
  "offset": 0,
  "limit": 10,
  "has_more": true
}
```

**Use Cases:**
- Show debate history on market selection page
- Compare different model configurations for one market
- See how AI predictions changed over time
- Understand AI consensus vs current market odds

**Cache:**
- Duration: 1 minute
- Cache key: `market_debates:{market_id}:{limit}:{offset}:{status}`

---

## Endpoints: Audio

### 15. GET `/api/audio/<message_id>.mp3`

Get the audio file for a specific message.

**Path Parameters:**
- `message_id` (UUID): Message ID

**Response:** `200 OK`
```
Content-Type: audio/mpeg
Content-Length: 245760
Cache-Control: public, max-age=31536000

[Binary MP3 data]
```

**Errors:**
- `404 Not Found`: Audio not found

**Notes:**
- Audio is generated once when the message is created
- Stored in database/file system
- Deleted when user clears debate history

---

## Error Handling

### Error Response Format

All errors are returned in a unified format:

```json
{
  "error": {
    "code": "error_code_snake_case",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "timestamp": "2025-11-15T12:00:00Z"
  }
}
```

### HTTP Status Codes

| Code | Description | Example |
|------|-------------|---------|
| `200` | OK | Successful request |
| `201` | Created | Debate created |
| `400` | Bad Request | Invalid parameters |
| `404` | Not Found | Resource not found |
| `422` | Unprocessable Entity | Business logic prevents operation |
| `425` | Too Early | Data not ready yet |
| `429` | Too Many Requests | Rate limit |
| `500` | Internal Server Error | Server error |
| `503` | Service Unavailable | External API unavailable |

### Error Codes

#### Validation Errors (400)
```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid request parameters",
    "details": {
      "rounds": "Must be between 1 and 10",
      "model_ids": "Must select at least 1 model"
    }
  }
}
```

#### Rate Limit (429)
```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "OpenRouter API rate limit exceeded",
    "details": {
      "retry_after": 60,
      "limit": "50 requests per day",
      "reset_at": "2025-11-16T00:00:00Z"
    }
  }
}
```

#### External API Error (503)
```json
{
  "error": {
    "code": "external_api_unavailable",
    "message": "Polymarket API is currently unavailable",
    "details": {
      "service": "polymarket",
      "retry_after": 30
    }
  }
}
```

#### Model Timeout (422)
```json
{
  "error": {
    "code": "model_timeout",
    "message": "AI model did not respond within 30 seconds",
    "details": {
      "model_id": "deepseek/deepseek-v3",
      "timeout_seconds": 30
    }
  }
}
```

---

## Data Models

### Market
```typescript
interface Market {
  id: string;
  question: string;
  description: string;
  category: string;
  tag_id: string;
  market_type: 'binary' | 'categorical';
  outcomes: Outcome[];
  volume: string;
  volume_24h?: string;
  liquidity?: string;
  end_date: string;
  created_date: string;
  image_url: string;
}
```

### Outcome
```typescript
interface Outcome {
  name: string;
  slug: string;
  price: number; // 0.0 - 1.0
  shares?: string;
}
```

### Model
```typescript
interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricing: {
    input: number;
    output: number;
    total_per_million: number;
  };
  is_free: boolean;
  context_length: number;
  max_output_tokens: number;
  supported: boolean;
}
```

### Debate
```typescript
interface Debate {
  debate_id: string;
  status: 'initialized' | 'in_progress' | 'paused' | 'completed' | 'stopped';
  market: Market;
  models: DebateModel[];
  rounds: number;
  current_round?: number;
  messages_count?: number;
  created_at: string;
  completed_at?: string;
  paused?: boolean;
}
```

### Message
```typescript
interface Message {
  message_id: string;
  round: number;
  sequence: number;
  model_id: string;
  model_name: string;
  message_type: 'initial' | 'debate' | 'final';
  text: string;  // IMPLEMENTATION: EXACTLY ONE SENTENCE
  predictions: Record<string, number>; // IMPLEMENTATION: Always empty object {}
  audio_url: string;  // IMPLEMENTATION: /api/audio/<message_id>.mp3
  audio_duration: number;  // IMPLEMENTATION: Estimated duration in seconds
  timestamp: string;  // ISO 8601 UTC
}
```

**IMPLEMENTATION NOTES**:
- `text`: Always exactly one sentence (max_tokens=100)
- `predictions`: Always `{}` - prediction system not implemented
- `audio_url`: Format is `/api/audio/<filename>` not `/audio/<filename>`
- Audio generated via ElevenLabs with voice mapped by model provider

### DebateSummary
```typescript
interface DebateSummary {
  overall: string;
  agreements: string[];
  disagreements: Disagreement[];
  consensus: string;
  model_rationales: ModelRationale[];
}

interface Disagreement {
  topic: string;
  positions: Record<string, string>; // model_name -> position
}

interface ModelRationale {
  model: string;
  final_prediction: Record<string, number>;
  rationale: string;
  key_arguments: string[];
}
```

---

## Frontend -> Backend Communication Flow

### 1. Market Selection Flow
```
Frontend                          Backend
   |                                 |
   |--GET /api/categories---------->|
   |<-------categories list----------|
   |                                 |
   |--GET /api/markets?tag_id=...-->|
   |<-------markets list-------------|
   |                                 |
   |--GET /api/markets/{id}-------->|
   |<-------market details-----------|
```

### 2. Debate Setup Flow
```
Frontend                          Backend
   |                                 |
   |--GET /api/models-------------->|
   |<-------models list--------------|
   |                                 |
   |--POST /api/debate/start-------->|
   |  {market_id, model_ids, rounds} |
   |<-------debate created-----------|
   |  {debate_id, stream_url}        |
```

### 3. Live Debate Flow (SSE)
```
Frontend                          Backend
   |                                 |
   |--EventSource(/debate/{id}/stream)|
   |<====debate_started==============|
   |<====model_thinking==============|
   |<====message=====================|
   |<====message=====================|
   |<====round_complete==============|
   |<====model_thinking==============|
   |<====message=====================|
   |     ...                         |
   |<====debate_complete=============|
   |                                 |

User actions:
   |--POST /api/debate/{id}/pause-->|
   |<====debate_paused===============|
   |--POST /api/debate/{id}/resume->|
   |<====debate_resumed==============|
```

### 4. Results Flow
```
Frontend                          Backend
   |                                 |
   |--GET /api/debate/{id}/results->|
   |<-------summary + predictions----|
   |                                 |
   |--GET /api/debate/{id}/transcript|
   |<-------full transcript----------|
```

---

## Performance and Optimizations

### Caching

| Endpoint | TTL | Strategy |
|----------|-----|----------|
| `/api/markets` | 5 min | Redis cache |
| `/api/markets/{id}` | 2 min | Redis cache |
| `/api/categories` | 10 min | Redis cache |
| `/api/models` | 1 hour | In-memory + Redis |
| `/api/debate/{id}/results` | ∞ | Redis cache (completed only) |
| `/api/audio/{id}.mp3` | ∞ | CDN + Filesystem |

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/debate/start` | 10 | 1 hour per IP |
| `/api/markets` | 100 | 1 minute |
| All other GET | 1000 | 1 minute |

### Timeouts

- **AI Model Response**: 30 seconds
- **Polymarket API**: 10 seconds
- **SSE Connection**: keep-alive every 15 seconds
- **Audio Generation**: 15 seconds

---

## Security

### CORS Configuration
```python
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://polydebate.com"
]
```

### Input Validation
- All user input is sanitized
- SQL injection protection (using ORM)
- XSS protection (HTML escaping)
- Rate limiting on all endpoints

### API Keys
- Stored in environment variables
- Never sent to frontend
- Rotate regularly

---

## Monitoring and Logging

### Logs

All requests are logged:
```json
{
  "timestamp": "2025-11-15T12:00:00Z",
  "method": "POST",
  "endpoint": "/api/debate/start",
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "request_id": "req-uuid",
  "duration_ms": 250,
  "status": 201
}
```

### Metrics

- Request rate per endpoint
- Response time (p50, p95, p99)
- Error rate
- External API latency (Polymarket, OpenRouter, ElevenLabs)
- SSE connection count
- Cache hit rate

---

## DETAILED IMPLEMENTATION STATUS

### ✅ Fully Implemented Endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/health` | GET | ✅ | Returns health status |
| `/api/markets` | GET | ✅ | Pagination, category filter working |
| `/api/markets/<path>` | GET | ✅ | Works for both market ID and category slug |
| `/api/categories` | GET | ✅ | Returns all categories |
| `/api/models` | GET | ✅ | Filtered by price ≤ $0.5/1M tokens |
| `/api/debate/start` | POST | ✅ | Creates debate, saves to SQLite DB |
| `/api/debates` | GET | ✅ | Lists all debates from DB |
| `/api/debate/<id>` | GET | ✅ | Gets debate state from DB |
| `/api/debate/<id>/stream` | GET | ✅ | SSE streaming with asyncio |
| `/api/audio/<filename>` | GET | ✅ | Serves MP3 files |

### ❌ Not Implemented / Not Working

| Endpoint | Method | Status | Reason |
|----------|--------|--------|--------|
| `/api/debate/<id>/pause` | POST | ❌ | Code exists but untested |
| `/api/debate/<id>/resume` | POST | ❌ | Code exists but untested |
| `/api/debate/<id>/stop` | POST | ❌ | Code exists but untested |
| `/api/debate/<id>/results` | GET | ❌ | Gemini summarization not implemented |
| `/api/debate/<id>/summary` | POST | ❌ | Gemini integration incomplete |

### Database Implementation

**Technology**: SQLite + SQLAlchemy ORM (not JSON files as in spec)

**Tables**:
- `debates` - Main debate records
- `debate_models` - Models participating in debates
- `debate_outcomes` - Market outcomes for debates
- `messages` - All debate messages
- `message_predictions` - Predictions within messages (currently unused)

**Database Location**:
- Path: `backend/storage/polydebate.db`
- Auto-generated absolute path for cross-platform compatibility
- Mac/Linux: `sqlite:////absolute/path/to/polydebate.db`
- Windows: `sqlite:///C:/absolute/path/to/polydebate.db`

### Audio Implementation

**ElevenLabs Integration**: ✅ Fully working

**Voice Mapping** (automatic by AI provider):
```python
{
    'default': 'pNInz6obpgDQGcFmaJgB',  # Adam - deep, calm
    'google': '21m00Tcm4TlvDq8ikWAM',   # Rachel - soft, warm
    'deepseek': 'AZnzlk1XvdvUeBnXmlld',  # Domi - strong, confident
    'meta': 'EXAVITQu4vr4xnSDxMaL',      # Bella - gentle
    'mistral': 'EXAVITQu4vr4xnSDxMaL',   # Bella
    'anthropic': 'pMsXgVXv3BLzUgSXRplE',  # Serena
    'openai': 'ErXwobaYiN019PkySvjV'      # Antoni - professional
}
```

**Features**:
- Automatic generation during debate
- SSL verification disabled (`ssl=False`) for compatibility
- Audio saved to `backend/storage/audio/<message_id>.mp3`
- Duration estimation based on text length

### SSE Events Implemented

| Event | Status | Data |
|-------|--------|------|
| `debate_started` | ✅ | debate_id, status, timestamp |
| `model_thinking` | ✅ | model_id, model_name, round, timestamp |
| `message` | ✅ | Full message object (see Message interface) |
| `error` | ✅ | model_id, model_name, error, timestamp |
| `debate_complete` | ✅ | debate_id, status, total_messages, timestamp |
| `round_complete` | ❌ | NOT IMPLEMENTED |
| `prediction_update` | ❌ | NOT IMPLEMENTED (predictions always empty) |
| `summary_generated` | ❌ | NOT IMPLEMENTED (Gemini not done) |

### Key Implementation Differences from Spec

1. **Response Length**:
   - **Spec**: 2-4 sentences per message
   - **Actual**: EXACTLY ONE SENTENCE
   - **Reason**: User-requested simplification for faster debates
   - **Code**: `max_tokens=100` (was 1000), system prompt enforces one sentence

2. **Predictions**:
   - **Spec**: Percentage predictions for each outcome (sum to 100%)
   - **Actual**: Empty object `{}`
   - **Reason**: Not implemented yet (Phase 5 in original plan)
   - **Database**: Schema ready, just not populated

3. **Storage**:
   - **Spec**: JSON files in `backend/storage/debates/`
   - **Actual**: SQLite database with SQLAlchemy ORM
   - **Reason**: Better data management, querying, relationships

4. **Gemini Summarization**:
   - **Spec**: Full summary with agreements, disagreements, consensus
   - **Actual**: Not implemented
   - **Reason**: Phase 7 feature, not yet completed

### Configuration

**Required Environment Variables**:
```bash
OPENROUTER_API_KEY=sk-or-...     # Required ✅
ELEVENLABS_API_KEY=...           # Required ✅
GEMINI_API_KEY=...               # Optional (not used yet) ❌
```

**Do NOT set manually**:
```bash
DATABASE_URL                     # Auto-generated by config.py
```

**CORS Origins** ([backend/config.py:25](backend/config.py#L25)):
```python
CORS_ORIGINS = [FRONTEND_URL, 'http://localhost:3003', 'http://localhost:3004']
```

### Performance Characteristics

**Actual Implementation**:
- One-sentence responses: ~20-50 tokens per message
- Audio generation: ~3-5 seconds per message
- Total debate time (3 rounds, 3 models): ~2-3 minutes
- Database queries: <10ms for most operations

**Original Spec (if implemented)**:
- Multi-sentence responses: ~500-800 tokens per message
- Would be ~10-20x slower than current implementation

### Testing Status

| Component | Status |
|-----------|--------|
| Markets API | ✅ Tested |
| Models API | ✅ Tested |
| Debate creation | ✅ Tested |
| SSE streaming | ✅ Tested |
| Audio generation | ✅ Tested (SSL fix applied) |
| Database persistence | ✅ Tested (cross-platform paths) |
| Predictions | ❌ Not implemented |
| Gemini summarization | ❌ Not implemented |
| Pause/resume/stop | ❌ Not tested |

### Known Issues

1. **Frontend audio player** - URLs generated but UI not implemented
2. **Predictions always empty** - System not implemented yet
3. **No Gemini summaries** - Integration incomplete
4. **Pause/resume/stop** - Code exists but untested
5. **Database file was tracked by git** - Fixed with `git rm --cached`

### Migration Notes

If you have old JSON-based debates in `backend/storage/debates/`, they are not automatically migrated to the SQLite database. You would need to write a migration script or manually recreate debates.

---

**Document Version**: 2.0 (Implementation Update)
**Last Updated**: 2025-11-16
**Status**: Core features complete, predictions and summarization pending
