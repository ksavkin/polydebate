# Future Features

This document tracks planned features and enhancements for PolyDebate.

## Breaking News with Live Updates and Email Notifications

### Overview
Implement a comprehensive breaking news system that:
- Fetches live updates from X (Twitter) API
- Sends email notifications to subscribed users
- Provides real-time updates via SSE (Server-Sent Events)
- Displays breaking news on the breaking news page

### Components

#### 1. Email Subscription System
- **Database Model**: `BreakingNewsSubscription` table
  - `id`: Primary key
  - `email`: User email (unique)
  - `categories`: JSON array of subscribed categories (politics, world, sports, etc.)
  - `frequency`: Notification frequency (instant, daily, weekly)
  - `verified`: Email verification status
  - `created_at`: Subscription timestamp
  - `unsubscribed_at`: Unsubscribe timestamp

- **API Endpoints**:
  - `POST /api/breaking-news/subscribe` - Subscribe to breaking news
  - `POST /api/breaking-news/unsubscribe` - Unsubscribe (with token)
  - `GET /api/breaking-news/subscription-status` - Check subscription status
  - `POST /api/breaking-news/verify-email` - Verify email address

- **Email Service Extension**:
  - Extend existing `EmailService` class
  - Add `send_breaking_news_email()` method
  - Create email templates for breaking news notifications
  - Support HTML and plain text versions

#### 2. X/Twitter API Integration
- **Service**: `backend/services/twitter.py`
  - Twitter API v2 integration
  - Polling mechanism (every 5-10 minutes)
  - Rate limit handling
  - Tweet parsing and filtering
  - Market matching logic

- **Configuration**:
  - `TWITTER_BEARER_TOKEN`: Twitter API Bearer Token
  - `TWITTER_USER_ID`: Polymarket Twitter user ID
  - `TWITTER_POLL_INTERVAL`: Polling interval in seconds

- **Features**:
  - Monitor Polymarket Twitter account
  - Filter tweets for breaking news keywords
  - Match tweets to existing markets
  - Store tweet metadata in database

#### 3. Real-Time Updates
- **SSE Endpoint**: `GET /api/breaking-news/stream`
  - Stream breaking news updates in real-time
  - Filter by category
  - Include market information
  - Include tweet metadata

- **Background Task**:
  - Poll Twitter API periodically
  - Process new tweets
  - Match to markets
  - Send email notifications
  - Broadcast via SSE

#### 4. Frontend Updates
- **BreakingNews Component**:
  - Connect to SSE endpoint
  - Display live updates
  - Email subscription form (already exists, needs backend connection)
  - Real-time feed updates

- **Email Subscription UI**:
  - Subscribe form with category selection
  - Verification flow
  - Unsubscribe link in emails
  - Subscription management page

### Implementation Steps

1. **Phase 1: Email Subscriptions** (1 day)
   - Create database model
   - Add API endpoints
   - Extend email service
   - Create email templates
   - Connect frontend form

2. **Phase 2: Twitter Integration** (2-3 days)
   - Set up Twitter API v2
   - Create Twitter service
   - Implement polling mechanism
   - Add tweet parsing logic
   - Market matching algorithm

3. **Phase 3: Real-Time Updates** (1 day)
   - Create SSE endpoint
   - Background task scheduler
   - Update frontend to use SSE
   - Testing and optimization

### Technical Requirements

- **Dependencies**:
  - `tweepy` or `twitter-api-v2` Python library
  - Background task runner (Celery or APScheduler)
  - Twitter API v2 access (requires API keys)

- **Database Migration**:
  - New `breaking_news_subscriptions` table
  - New `breaking_news_updates` table (optional, for caching)

- **Configuration**:
  - Twitter API credentials
  - Email service configuration (already exists)
  - Polling intervals
  - Rate limit settings

### Estimated Effort
- **Total**: 3-5 days
- **Email Subscriptions**: Easy (1 day)
- **Twitter Integration**: Medium (2-3 days)
- **Real-Time Updates**: Medium (1 day)

### Notes
- Twitter API has rate limits that need to be respected
- Email sending should be rate-limited to avoid spam
- Consider using a queue system (Redis + Celery) for background tasks
- Email verification is important to prevent spam subscriptions

