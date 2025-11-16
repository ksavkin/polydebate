# PolyDebate Passwordless Authentication System

A comprehensive, production-ready passwordless authentication system with separate signup and login flows for the PolyDebate Flask backend.

## Table of Contents
- [Features](#features)
- [Quick Start](#quick-start)
- [Gmail SMTP Setup (5 Minutes)](#gmail-smtp-setup-5-minutes)
- [API Endpoints](#api-endpoints)
- [Configuration Guide](#configuration-guide)
- [Email Templates](#email-templates)
- [Logging System](#logging-system)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Features

### Core Authentication
- ✅ **Separate signup and login flows** (not unified)
- ✅ **Email-only authentication** (no passwords)
- ✅ **6-digit verification codes** (customizable 4-8 digits)
- ✅ **JWT token-based sessions** (30-day expiration, configurable)
- ✅ **User profile management** (name, email, timestamps)

### Security
- ✅ **Rate limiting** (5 code requests/hour, configurable)
- ✅ **Code expiration** (15 minutes, configurable)
- ✅ **One-time code usage** enforcement
- ✅ **Failed attempt tracking** (5 max attempts, configurable)
- ✅ **Email uniqueness** validation
- ✅ **Secure JWT tokens** with configurable secrets

### Email Services
- ✅ **Gmail SMTP** (recommended, free 500 emails/day)
- ✅ **SendGrid** (optional, for production)
- ✅ **Generic SMTP** (any SMTP server)
- ✅ **Mock mode** (development, prints to console)
- ✅ **Email fallback** (logs codes if email fails)

### Email Templates
- ✅ **Customizable HTML/text templates**
- ✅ **Template variables** ({code}, {name}, {app_name}, etc.)
- ✅ **Separate signup/login templates**
- ✅ **Professional responsive design**

### Logging
- ✅ **Comprehensive event logging**
- ✅ **Multiple formats** (JSON, text)
- ✅ **File rotation** (10MB max, 5 backups)
- ✅ **Privacy controls** (email/IP masking)
- ✅ **Security log** (optional separate file)
- ✅ **Request ID tracking**

---

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and set at minimum:
```env
# Required for production
JWT_SECRET_KEY=your-random-32-plus-character-secret-key-here

# For email (choose one):
EMAIL_SERVICE=mock  # Development (prints to console)
# OR
EMAIL_SERVICE=gmail  # Production (see Gmail setup below)
```

### 3. Initialize Database

The database is automatically initialized when you start the app:
```bash
python app.py
```

This creates a SQLite database `polydebate.db` with `users` and `verification_codes` tables.

### 4. Test the API

The authentication endpoints are now available at:
- `POST /api/auth/signup/request-code`
- `POST /api/auth/signup/verify-code`
- `POST /api/auth/login/request-code`
- `POST /api/auth/login/verify-code`
- `GET /api/auth/me` (protected)
- `PUT /api/auth/me` (protected)

---

## Gmail SMTP Setup (5 Minutes)

Gmail SMTP is **recommended** for small to medium projects. It's free (500 emails/day) and takes just 5 minutes to set up.

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account: https://myaccount.google.com
2. Click **Security** in the left sidebar
3. Click **2-Step Verification** → **Get Started**
4. Follow the setup process

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other (Custom name)**
4. Enter name: **PolyDebate Auth**
5. Click **Generate**
6. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### Step 3: Update .env File

```env
EMAIL_SERVICE=gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop  # Remove spaces!
EMAIL_FROM_ADDRESS=your-email@gmail.com
EMAIL_FROM_NAME=PolyDebate
```

### Step 4: Test

Start your server and try signing up:
```bash
python app.py
```

You should receive a professional email with your verification code!

### Gmail Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid credentials" | Make sure you're using the App Password, not your regular Gmail password |
| "Less secure app" error | This doesn't apply to App Passwords. You're good! |
| Port issues | Use port 587 with TLS (not 465) |
| Firewall blocking | Ensure port 587 is open |
| No email received | Check spam folder, verify email address is correct |

---

## API Endpoints

### Signup Flow

#### 1. Request Signup Code

```http
POST /api/auth/signup/request-code
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Verification code sent to your email",
  "expiry_minutes": 15
}
```

**Error Responses:**
- `400` - Email already exists
- `429` - Rate limit exceeded
- `500` - Server error

#### 2. Verify Signup Code & Create Account

```http
POST /api/auth/signup/verify-code
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "code": "123456"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "created_at": "2024-01-15T10:30:00Z",
      "last_login": "2024-01-15T10:30:00Z",
      "is_active": true
    },
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

**Error Responses:**
- `400` - Invalid code, expired code, or email already exists
- `429` - Too many verification attempts
- `500` - Server error

### Login Flow

#### 1. Request Login Code

```http
POST /api/auth/login/request-code
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Verification code sent to your email",
  "expiry_minutes": 15
}
```

**Error Responses:**
- `400` - User not found or account inactive
- `429` - Rate limit exceeded
- `500` - Server error

#### 2. Verify Login Code & Authenticate

```http
POST /api/auth/login/verify-code
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "created_at": "2024-01-15T10:30:00Z",
      "last_login": "2024-01-15T10:35:00Z",
      "is_active": true
    },
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

### Protected Endpoints

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <your-jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "created_at": "2024-01-15T10:30:00Z",
      "last_login": "2024-01-15T10:35:00Z",
      "is_active": true
    }
  }
}
```

#### Update Current User

```http
PUT /api/auth/me
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "name": "Jane Doe"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "Jane Doe",
      ...
    }
  }
}
```

---

## Configuration Guide

### Verification Code Settings

```env
# Code length (4-8 digits)
CODE_LENGTH=6

# Code type: 'numeric' (0-9) or 'alphanumeric' (A-Z, 0-9)
CODE_TYPE=numeric

# Code expiration in minutes
CODE_EXPIRATION_MINUTES=15
```

### Rate Limiting

```env
# Max code requests per email per hour
MAX_CODE_REQUESTS_PER_HOUR=5

# Max wrong code attempts before requiring new code
MAX_VERIFICATION_ATTEMPTS=5
```

### JWT Settings

```env
# Secret key for signing JWT tokens (CHANGE IN PRODUCTION!)
JWT_SECRET_KEY=your-super-secret-key-min-32-characters

# Token expiration in minutes (43200 = 30 days)
JWT_EXPIRATION_MINUTES=43200
```

### Email Service Selection

```env
# Choose email service: mock, gmail, sendgrid, smtp
EMAIL_SERVICE=gmail

# Sender information
EMAIL_FROM_ADDRESS=noreply@polydebate.com
EMAIL_FROM_NAME=PolyDebate

# Fallback: log codes if email fails
EMAIL_FALLBACK_TO_CONSOLE=true
```

### Database

```env
# SQLite (development)
DATABASE_URL=sqlite:///polydebate.db

# PostgreSQL (production)
DATABASE_URL=postgresql://user:password@localhost:5432/polydebate
```

---

## Email Templates

### Using Built-in Templates

By default, the system uses professionally designed HTML and text email templates located in `templates/`:
- `templates/signup_email.html`
- `templates/signup_email.txt`
- `templates/login_email.html`
- `templates/login_email.txt`

### Customizing Templates

#### Option 1: Edit Template Files (Recommended)

Edit the HTML/text files in `templates/` directory. Available variables:
- `{code}` - Verification code
- `{name}` - User's name
- `{email}` - User's email
- `{expiry_minutes}` - Code expiration time
- `{app_name}` - Application name
- `{app_url}` - Application URL
- `{support_email}` - Support email

Example:
```html
<!-- templates/signup_email.html -->
<h1>Welcome to {app_name}, {name}!</h1>
<p>Your code: <strong>{code}</strong></p>
<p>Expires in {expiry_minutes} minutes.</p>
```

#### Option 2: Use Environment Variables

```env
USE_TEMPLATE_FILES=false
SIGNUP_EMAIL_SUBJECT=Welcome! Your code is inside
LOGIN_EMAIL_SUBJECT=Your login code
```

### Template Best Practices

1. **Always include the code** prominently
2. **Show expiration time** clearly
3. **Add security notice** (what to do if user didn't request)
4. **Support email** for help
5. **Both HTML and text versions** for compatibility

---

## Logging System

### Configuration

```env
# Log level: DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_LEVEL=INFO

# Log format: 'json' (production) or 'text' (development)
LOG_FORMAT=text

# Log destinations
LOG_TO_CONSOLE=true
LOG_TO_FILE=true
LOG_FILE=logs/app.log

# File rotation
LOG_MAX_BYTES=10485760  # 10MB
LOG_BACKUP_COUNT=5      # Keep 5 old files

# Privacy controls
MASK_EMAILS_IN_LOGS=false  # Hash emails in logs
MASK_IP_IN_LOGS=false      # Anonymize IPs

# Security logging
ENABLE_SECURITY_LOG=true
SECURITY_LOG_FILE=logs/security.log
```

### What Gets Logged

**Authentication Events:**
- User signup attempts (success/failure)
- User login attempts (success/failure)
- Code requests (email, IP, timestamp)
- Code verification attempts
- JWT token generation

**Security Events:**
- Rate limit violations
- Multiple failed attempts
- Expired/invalid code usage
- Suspicious activity

**System Events:**
- Email sending (success/failure)
- Database errors
- Configuration errors
- Application startup/shutdown

### Log Format Examples

**Text Format (Development):**
```
2024-01-15 10:30:45 [INFO] User user@example.com successfully signed up (ip=192.168.1.1, user_id=123)
2024-01-15 10:32:10 [WARNING] Invalid code for user@example.com (ip=192.168.1.1, attempt=2/5)
```

**JSON Format (Production):**
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "event": "user_signup_success",
  "email": "user@example.com",
  "ip_address": "192.168.1.1",
  "user_id": 123,
  "message": "User successfully signed up and verified"
}
```

---

## Testing

### Using cURL

#### Signup Flow
```bash
# Request code
curl -X POST http://localhost:5000/api/auth/signup/request-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User"}'

# Check console for code (if using mock email)
# Code: 123456

# Verify code
curl -X POST http://localhost:5000/api/auth/signup/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User", "code": "123456"}'
```

#### Login Flow
```bash
# Request code
curl -X POST http://localhost:5000/api/auth/login/request-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Verify code
curl -X POST http://localhost:5000/api/auth/login/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "code": "123456"}'
```

#### Protected Endpoints
```bash
# Get current user
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update user
curl -X PUT http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Change `JWT_SECRET_KEY` to a strong random value (32+ characters)
- [ ] Set `FLASK_DEBUG=False`
- [ ] Set `FLASK_ENV=production`
- [ ] Configure production email service (Gmail or SendGrid)
- [ ] Use PostgreSQL instead of SQLite (optional but recommended)
- [ ] Enable JSON logging: `LOG_FORMAT=json`
- [ ] Enable security log: `ENABLE_SECURITY_LOG=true`
- [ ] Consider enabling email/IP masking for privacy
- [ ] Set up HTTPS for your domain
- [ ] Configure proper CORS origins

### Production .env Example

```env
FLASK_DEBUG=False
FLASK_ENV=production
JWT_SECRET_KEY=your-strong-random-secret-key-here
DATABASE_URL=postgresql://user:pass@localhost/polydebate

EMAIL_SERVICE=gmail
GMAIL_USER=noreply@yourdomain.com
GMAIL_APP_PASSWORD=your-app-password
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

LOG_LEVEL=INFO
LOG_FORMAT=json
ENABLE_SECURITY_LOG=true
```

### Scaling Considerations

For high-traffic production:
1. **Use Redis** for rate limiting instead of in-memory storage
2. **Use PostgreSQL** for better performance and reliability
3. **Enable SendGrid** for higher email volumes (100k+/day)
4. **Add database indexes** on frequently queried fields
5. **Implement caching** for user lookups
6. **Monitor logs** with external service (CloudWatch, Datadog, etc.)

---

## Troubleshooting

### Common Issues

#### 1. "Configuration validation failed"
**Cause:** Invalid or missing configuration values
**Solution:** Check your `.env` file matches the requirements in `.env.example`

#### 2. "Email send failed"
**Cause:** Invalid email credentials or network issues
**Solution:**
- Verify Gmail App Password is correct (no spaces)
- Check SMTP settings
- Enable `EMAIL_FALLBACK_TO_CONSOLE=true` to see codes in console

#### 3. "Invalid or expired token"
**Cause:** JWT token expired or invalid
**Solution:** Login again to get a new token

#### 4. "Rate limit exceeded"
**Cause:** Too many requests in short time
**Solution:** Wait an hour or adjust `MAX_CODE_REQUESTS_PER_HOUR`

#### 5. "Database errors"
**Cause:** Database not initialized or corrupted
**Solution:** Delete `polydebate.db` and restart app to recreate

### Debug Mode

Enable debug logging to see detailed information:
```env
LOG_LEVEL=DEBUG
LOG_FORMAT=text
LOG_TO_CONSOLE=true
```

### Support

If you encounter issues:
1. Check the logs in `logs/app.log`
2. Enable debug mode
3. Review error messages
4. Check GitHub issues

---

## Architecture Overview

### File Structure

```
backend/
├── app.py                      # Main Flask application
├── config.py                   # Configuration management
├── requirements.txt            # Python dependencies
├── .env.example               # Environment template
├── AUTH_README.md             # This file
│
├── models/
│   ├── __init__.py
│   ├── base.py                # SQLAlchemy base and session
│   ├── user.py                # User model
│   └── verification_code.py   # VerificationCode model
│
├── routes/
│   ├── __init__.py
│   └── auth.py                # Authentication endpoints
│
├── services/
│   ├── __init__.py
│   ├── auth_service.py        # Authentication business logic
│   └── email_service.py       # Email sending service
│
├── utils/
│   ├── __init__.py
│   ├── auth.py                # JWT utilities and decorators
│   ├── rate_limiter.py        # Rate limiting
│   └── logger.py              # Logging system
│
├── templates/
│   ├── signup_email.html      # Signup email HTML
│   ├── signup_email.txt       # Signup email text
│   ├── login_email.html       # Login email HTML
│   └── login_email.txt        # Login email text
│
└── logs/
    ├── app.log                # Application log
    └── security.log           # Security events log
```

### Database Schema

**users table:**
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL,
    last_login DATETIME,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
```

**verification_codes table:**
```sql
CREATE TABLE verification_codes (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(8) NOT NULL,
    code_type ENUM('signup', 'login') NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME NOT NULL,
    ip_address VARCHAR(45)
);
```

---

## License

This authentication system is part of the PolyDebate project.

---

## Contributing

Contributions are welcome! Please ensure:
1. Code follows existing patterns
2. All tests pass
3. Documentation is updated
4. Security best practices are maintained

---

**Happy coding! 🚀**
