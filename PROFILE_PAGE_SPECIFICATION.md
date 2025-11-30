# PolyDebate - Profile Page Specification

**Version**: 2.0
**Date**: 2025-11-17
**Status**: Approved - Ready for Implementation

---

## Overview

The Profile Page displays user information, debate history, and a **token credit system**. Users spend tokens from their balance when creating debates. The page provides quick access to recent and favorite debates with the ability to delete them.

---

## Key Decisions (CONFIRMED)

### 1. Token Credit System ✅
- **Display**: "Tokens Remaining: 1,234,567" (shows balance, not usage)
- **Starting Balance**: 100,000 tokens for new users
- **Usage**: Tokens are spent per debate (calculated from model responses)
- **Current Implementation**: Display constant placeholder value (X)
- **Future**: Track actual token consumption per debate

### 2. Top Debates ✅
- **Two Tabs**: "Recent" and "Favorites"
- **Features**:
  - Sort by most recent (created_at DESC)
  - Delete button on each debate card (with confirmation)
  - Click debate card → navigate to debate detail page
  - Show 5 debates per tab

### 3. History Pagination ✅
- **12 debates per page** (3 rows × 4 columns on desktop)
- **Filters**: Category, status, date range
- **Sort**: Recent, most tokens used, most rounds

### 4. Edit Profile ✅
- **Editable Fields**:
  - Name (text input)
  - Profile Picture (upload from computer)
- **Non-editable**: Email (displayed but not editable)

### 5. Statistics to Display ✅
- Total debates created
- Tokens remaining (credit balance)
- Favorite AI models (most frequently used)
- Favorite market categories (most debated)

### 6. Design Style ✅
- Match existing PolyDebate dark theme with gradient cards
- Same card layout and styling as market cards
- Consistent button styles and typography
- Responsive design (mobile/tablet/desktop)

---

## Page Layout

### Header Section
```
┌─────────────────────────────────────────────────────────┐
│  [Avatar]  John Doe                          [Edit Profile] [Log Out]  │
│           john.doe@example.com                                     │
│           Member since: Nov 16, 2025                              │
└─────────────────────────────────────────────────────────┘
```

### Statistics Cards
```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Total Debates    │ │ Tokens Remaining │ │ Favorite Models  │ │ Top Category     │
│       42         │ │    1,234,567     │ │  DeepSeek Chat   │ │     Politics     │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
```

### Top Debates Section (Tabbed)
```
┌─────────────────────────────────────────────────────────────────────┐
│  [Recent] [Favorites]                                                │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 🏆 Bitcoin $100k by 2025?                          [Delete] [❤️] │ │
│  │    5 rounds • 3 models • 45,231 tokens • 2 days ago             │ │
│  │    [View Debate →]                                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 🏆 Super Bowl Champion 2026                        [Delete] [❤️] │ │
│  │    3 rounds • 5 models • 32,104 tokens • 5 days ago             │ │
│  │    [View Debate →]                                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Full History Section
```
┌─────────────────────────────────────────────────────────┐
│  Debate History                                          │
│  [All] [Politics] [Sports] [Crypto] [Tech] ...          │
│  [Filter by Date ▼] [Status: All ▼]                     │
│                                                           │
│  [List of all debates with pagination]                   │
└─────────────────────────────────────────────────────────┘
```

---

## Data Model Updates

### User Model Extension
Add to existing `User` model in `backend/models/user.py`:

```python
# New fields to add:
avatar_url = Column(String(500), nullable=True)  # Profile picture path
tokens_remaining = Column(Integer, default=100000)  # Token credit balance
total_debates = Column(Integer, default=0)  # Count of debates created

# Relationships
debates = relationship("DebateDB", back_populates="user", cascade="all, delete-orphan")
favorites = relationship("UserFavorite", back_populates="user", cascade="all, delete-orphan")
```

### DebateDB Model Update
Add to `backend/models/db_models.py`:

```python
# Add to DebateDB class:
user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
user = relationship("User", back_populates="debates")
is_deleted = Column(Boolean, default=False)  # Soft delete flag

# Token usage tracking
total_tokens_used = Column(Integer, default=0)
tokens_by_model = Column(JSON, nullable=True)  # {"model_id": token_count}

# Market category for filtering
market_category = Column(String(100), nullable=True, index=True)
```

---

## API Endpoints

### 1. GET `/api/auth/profile`
Get current user's profile with statistics.

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": 123,
    "email": "john.doe@example.com",
    "name": "John Doe",
    "avatar_url": "/uploads/avatars/user123.jpg",
    "created_at": "2025-11-16T12:00:00Z",
    "last_login": "2025-11-17T19:30:00Z",
    "is_active": true,
    "tokens_remaining": 85430
  },
  "statistics": {
    "total_debates": 42,
    "total_favorites": 8,
    "favorite_models": [
      {
        "model_id": "deepseek/deepseek-chat-v3",
        "model_name": "DeepSeek Chat V3",
        "usage_count": 25
      },
      {
        "model_id": "google/gemini-2.0-flash-exp",
        "model_name": "Gemini 2.0 Flash",
        "usage_count": 18
      }
    ],
    "favorite_categories": [
      {
        "category": "Politics",
        "count": 15
      },
      {
        "category": "Crypto",
        "count": 12
      },
      {
        "category": "Sports",
        "count": 8
      }
    ]
  }
}
```

### 2. PUT `/api/auth/profile`
Update user profile (name and avatar).

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
name: "John Smith" (optional)
avatar: <file upload> (optional)
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": 123,
    "email": "john.doe@example.com",
    "name": "John Smith",
    "avatar_url": "/uploads/avatars/user123.jpg",
    "created_at": "2025-11-16T12:00:00Z",
    "last_login": "2025-11-17T19:30:00Z",
    "is_active": true,
    "tokens_remaining": 85430
  }
}
```

**Error Response:** `400 Bad Request`
```json
{
  "error": {
    "code": "invalid_file_type",
    "message": "Avatar must be JPG, PNG, or GIF"
  }
}
```

### 3. GET `/api/auth/debates`
Get user's debate history with filters and pagination.

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 12 | Number of debates per page |
| `offset` | integer | No | 0 | Pagination offset |
| `category` | string | No | null | Filter by market category |
| `status` | string | No | null | Filter by status: 'completed', 'in_progress', 'stopped' |
| `sort` | string | No | 'recent' | Sort by: 'recent', 'tokens', 'rounds' |
| `date_from` | string | No | null | ISO date string |
| `date_to` | string | No | null | ISO date string |

**Response:** `200 OK`
```json
{
  "debates": [
    {
      "debate_id": "550e8400-e29b-41d4-a716-446655440000",
      "market_question": "Will Bitcoin reach $100k in 2025?",
      "market_category": "Crypto",
      "status": "completed",
      "rounds": 5,
      "models_count": 3,
      "total_tokens_used": 45231,
      "created_at": "2025-11-15T12:00:00Z",
      "completed_at": "2025-11-15T12:15:00Z",
      "is_favorite": true
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 12,
    "offset": 0,
    "has_more": true
  }
}
```

### 4. GET `/api/auth/debates/top`
Get user's top debates (recent or favorites).

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | No | 'recent' | 'recent' or 'favorites' |
| `limit` | integer | No | 5 | Number of debates to return |

**Response:** `200 OK`
```json
{
  "type": "recent",
  "debates": [
    {
      "debate_id": "550e8400-e29b-41d4-a716-446655440000",
      "market_question": "Will Bitcoin reach $100k in 2025?",
      "market_category": "Crypto",
      "status": "completed",
      "rounds": 5,
      "models_count": 3,
      "total_tokens_used": 45231,
      "created_at": "2025-11-15T12:00:00Z",
      "is_favorite": true
    }
  ]
}
```

### 5. DELETE `/api/debates/{debate_id}`
Soft delete a debate (mark as deleted).

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Response:** `200 OK`
```json
{
  "message": "Debate deleted successfully",
  "debate_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Response:** `403 Forbidden`
```json
{
  "error": {
    "code": "unauthorized",
    "message": "You can only delete your own debates"
  }
}
```

### 6. POST `/api/auth/upload-avatar`
Upload profile picture.

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

**Request Body:**
```
avatar: <file upload>
```

**Response:** `200 OK`
```json
{
  "avatar_url": "/uploads/avatars/user123_1731876543.jpg",
  "message": "Avatar uploaded successfully"
}
```

**Validation:**
- Max file size: 5MB
- Allowed formats: JPG, PNG, GIF
- Image will be resized to 256x256px

---

## UI Components

### Profile Header Component
**File**: `frontend/components/profile/ProfileHeader.tsx`

**Features**:
- Display user avatar (or initials if no avatar)
- User name and email
- Member since date
- Edit Profile button (opens modal)
- Log Out button

### Statistics Cards Component
**File**: `frontend/components/profile/StatisticsCards.tsx`

**Features**:
- 4 main stat cards: Total Debates, Tokens Used, Est. Cost, Favorites
- Animated counters on load
- Click to expand for detailed breakdown

### Top Debates Component
**File**: `frontend/components/profile/TopDebates.tsx`

**Features**:
- 3 tabs: Recent, Longest, Favorites
- Shows top 5 debates per tab
- Each debate card shows:
  - Market question with emoji/icon
  - Quick stats (rounds, models, tokens, date)
  - "View Debate" button
- Smooth tab transitions

### Debate History Component
**File**: `frontend/components/profile/DebateHistory.tsx`

**Features**:
- Category filter tabs
- Additional filters: Date range, Status
- Debate list with cards
- Pagination controls
- Empty state if no debates

### Edit Profile Modal
**File**: `frontend/components/profile/EditProfileModal.tsx`

**Features**:
- Name input field
- Save/Cancel buttons
- Form validation
- Success/error messages

---

## Additional Features to Consider

### 1. Achievement Badges
- First debate
- 10 debates milestone
- 50 debates milestone
- Token usage milestones
- Category explorer (debated in 5+ categories)

### 2. Token Usage Chart
- Graph showing token usage over time
- Breakdown by model
- Cost trends

### 3. Export Data
- Download debate history as CSV/JSON
- Export individual debate transcripts

### 4. Sharing
- Share profile stats (public view with limited info)
- Share individual debates

### 5. Notifications/Preferences
- Email notifications when debate completes
- Weekly summary emails
- Model recommendations based on usage

---

## Implementation Priority

### Phase 1 (MVP) ✅ Implement First
1. Basic profile display (name, email, created_at)
2. Token counter (placeholder "X" value)
3. Top debates section (recent only)
4. Basic debate history list
5. View debate button (links to existing debate page)

### Phase 2 (Enhanced)
6. Statistics cards with real data
7. Edit profile functionality
8. Favorites system
9. Advanced filtering and sorting
10. Token usage tracking integration

### Phase 3 (Advanced)
11. Achievement badges
12. Charts and analytics
13. Export functionality
14. Social features (sharing)
15. Notification preferences

---

## Design Considerations

### Responsive Design
- Mobile: Stack cards vertically, collapse filters
- Tablet: 2-column layout for stats cards
- Desktop: Full layout as specified

### Dark Mode
- All components must support dark mode theme
- Use existing Tailwind dark mode classes

### Loading States
- Skeleton loaders for all data sections
- Progressive loading (show cached data first)

### Error Handling
- Graceful fallbacks for missing data
- Retry mechanisms for failed API calls
- User-friendly error messages

---

## Database Migration

### New Tables Needed

#### `user_debate_stats` (optional - for caching)
```sql
CREATE TABLE user_debate_stats (
    user_id INTEGER PRIMARY KEY,
    total_debates INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0.0,
    last_updated DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Existing Table Updates

#### `users` table
```sql
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN total_debates INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_tokens_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_cost REAL DEFAULT 0.0;
```

#### `debates` table
```sql
ALTER TABLE debates ADD COLUMN user_id INTEGER;
ALTER TABLE debates ADD COLUMN total_tokens_used INTEGER DEFAULT 0;
ALTER TABLE debates ADD COLUMN estimated_cost REAL DEFAULT 0.0;
ALTER TABLE debates ADD COLUMN tokens_by_model TEXT;  -- JSON string
```

---

## Testing Checklist

- [ ] Profile loads correctly with user data
- [ ] Statistics display accurate counts
- [ ] Top debates tabs switch properly
- [ ] History pagination works
- [ ] Filters apply correctly
- [ ] Edit profile updates successfully
- [ ] Token counter displays (even as placeholder)
- [ ] All buttons navigate correctly
- [ ] Responsive design works on all screen sizes
- [ ] Dark mode renders properly
- [ ] Loading states display during data fetch
- [ ] Error states show appropriate messages

---

## Notes

- Token usage tracking needs to be implemented in the debate creation/execution flow
- Cost calculation requires model pricing data (already available from OpenRouter)
- Consider implementing analytics events for tracking user engagement
- Profile page should be protected route (require authentication)
