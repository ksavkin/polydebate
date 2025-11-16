## What I Want to Integrate

I want to integrate into this app a passwordless authentication system where:
- Users enter ONLY their email address (no password required)
- System sends a verification code to their email
- User enters the code and gets authenticated
- **IMPORTANT**: The system has SEPARATE signup and login flows (not unified)

## Requirements

### Core Functionality

#### Signup Flow (For New Users)
1. **User Registration Form**: User enters email AND name (and any other profile data)
2. **Code Generation**: System generates a random 6-digit verification code
3. **Email Delivery**: Code is sent to the user's email
4. **Code Verification**: User enters the code
5. **Account Creation**: User account is created with the provided information

#### Login Flow (For Existing Users)
1. **Email Input**: User enters ONLY their email address
2. **Code Generation**: System generates a random 6-digit verification code
3. **Email Delivery**: Code is sent to the user's email
4. **Code Verification**: User enters the code and gets authenticated
5. **Session Creation**: JWT token is issued

### User Management
- Signup endpoint creates new users with name and email
- Login endpoint authenticates existing users
- Prevent duplicate signups (same email)
- Collect user profile data during signup (name, etc.)

### Security Features
- Verification codes expire after configurable time (default: 10-15 minutes)
- Code length is configurable (default: 6 digits)
- Codes can only be used once
- Rate limiting to prevent spam (configurable, default: max 5 requests per hour per email)
- Secure JWT tokens for session management
- Codes are invalidated when a new one is requested
- Check if email already exists during signup

### Technical Requirements
- RESTful API backend
- Database to store users and verification codes
- Email sending capability (with testing mode)
- Token-based authentication (JWT)
- Proper error handling and validation
- **Comprehensive logging system** for important events and errors

## Technology Stack

**Backend**: Python with FastAPI
**Database**: SQLAlchemy with SQLite (upgradeable to PostgreSQL)
**Authentication**: JWT tokens
**Email**: Gmail SMTP (recommended), with support for mock mode (testing), SendGrid, and other SMTP providers
**Validation**: Pydantic schemas
**Configuration**: Environment variables + optional template files

## Configuration Requirements

The system MUST make the following configurable (via .env file or config):

### Code Settings
- `CODE_LENGTH` - Length of verification code (default: 6, range: 4-8)
- `CODE_TYPE` - Type of code: "numeric" or "alphanumeric" (default: numeric)
- `CODE_EXPIRATION_MINUTES` - How long codes are valid (default: 15)

### Rate Limiting
- `MAX_CODE_REQUESTS_PER_HOUR` - Max verification requests per email (default: 5)
- `MAX_VERIFICATION_ATTEMPTS` - Max wrong code attempts (default: 5)

### Email Templates
- `SIGNUP_EMAIL_SUBJECT` - Subject line for signup emails
- `SIGNUP_EMAIL_TEMPLATE` - Body template with placeholders
- `LOGIN_EMAIL_SUBJECT` - Subject line for login emails
- `LOGIN_EMAIL_TEMPLATE` - Body template with placeholders
- `EMAIL_FROM_ADDRESS` - Sender email address
- `EMAIL_FROM_NAME` - Sender display name

### Email Service Configuration
- `EMAIL_SERVICE` - Service to use: "gmail", "sendgrid", "smtp", or "mock" (default: gmail)
- **Gmail SMTP Settings:**
  - `GMAIL_USER` - Your Gmail address
  - `GMAIL_APP_PASSWORD` - 16-character app password (not regular password)
  - `SMTP_HOST` - smtp.gmail.com
  - `SMTP_PORT` - 587
  - `SMTP_USE_TLS` - true
- **SendGrid Settings (optional):**
  - `SENDGRID_API_KEY` - SendGrid API key
- **Generic SMTP Settings (optional):**
  - `SMTP_HOST` - SMTP server host
  - `SMTP_PORT` - SMTP server port
  - `SMTP_USERNAME` - SMTP username
  - `SMTP_PASSWORD` - SMTP password
  - `SMTP_USE_TLS` - Enable TLS encryption

### Template System
- Support loading templates from files OR environment variables
- Template directory: `templates/` (optional)
- Template variables: `{code}`, `{name}`, `{email}`, `{expiry_minutes}`, `{app_name}`, etc.
- Fallback to default templates if custom ones not provided

### Application Settings
- `APP_NAME` - Application name (used in emails)
- `APP_URL` - Application URL (optional, for links in emails)
- `SUPPORT_EMAIL` - Support contact email

### Security Settings
- `JWT_SECRET_KEY` - Secret for signing tokens
- `JWT_EXPIRATION_MINUTES` - Token validity period (default: 43200 = 30 days)

### Logging Settings
- `LOG_LEVEL` - Minimum log level: DEBUG, INFO, WARNING, ERROR, CRITICAL (default: INFO)
- `LOG_FORMAT` - Format: "json" or "text" (default: json for production, text for development)
- `LOG_FILE` - Path to log file (default: logs/app.log)
- `LOG_TO_CONSOLE` - Enable console output (default: true)
- `LOG_TO_FILE` - Enable file output (default: true)
- `LOG_MAX_BYTES` - Max log file size before rotation (default: 10485760 = 10MB)
- `LOG_BACKUP_COUNT` - Number of backup files to keep (default: 5)
- `MASK_EMAILS_IN_LOGS` - Hash/mask email addresses in logs (default: false)
- `MASK_IP_IN_LOGS` - Anonymize IP addresses in logs (default: false)
- `ENABLE_SECURITY_LOG` - Separate file for security events (default: false)
- `SECURITY_LOG_FILE` - Path to security log (default: logs/security.log)
- `LOG_REQUEST_ID` - Include request ID in logs for tracing (default: true)

## Implementation Plan Needed

Please provide a complete implementation with:

### 1. Database Design
- User table schema:
  - id (primary key)
  - email (unique, indexed)
  - name (required)
  - created_at
  - last_login
  - is_active
  - (any other profile fields)

- Verification codes table schema:
  - id (primary key)
  - user_id (foreign key, nullable for signup codes)
  - email (for signup codes before user exists)
  - code
  - code_type (signup or login)
  - expires_at
  - used_at
  - created_at

- Relationships between tables
- Indexes for performance

### 2. API Endpoints

#### Signup Endpoints
- `POST /auth/signup/request-code` - Request verification code for signup
  - Input: email, name
  - Output: success message
  - Action: Check if email exists, send code via email
  - Error: If email already registered

- `POST /auth/signup/verify-code` - Verify code and create account
  - Input: email, name, code
  - Output: JWT token + user data
  - Action: Validate code, create user account, return token

#### Login Endpoints
- `POST /auth/login/request-code` - Request verification code for login
  - Input: email
  - Output: success message
  - Action: Check if user exists, send code via email
  - Error: If email not found

- `POST /auth/login/verify-code` - Verify code and authenticate
  - Input: email, code
  - Output: JWT token + user data
  - Action: Validate code, authenticate user, return token

#### Protected Endpoints
- `GET /auth/me` - Get current user (protected endpoint)
  - Input: JWT token in header
  - Output: user information (id, email, name, etc.)
  - Action: Verify token and return user data

- `PUT /auth/me` - Update current user (optional)
  - Input: JWT token + updated fields (name, etc.)
  - Output: updated user data
  - Action: Update user profile

### 3. Business Logic

#### Signup Logic
- Check if email already exists (return error if yes)
- Generate verification code
- Store pending signup data (email, name)
- Send verification email
- On code verification: create user account
- Return JWT token

#### Login Logic
- Check if user exists (return error if no)
- Generate verification code
- Send verification email
- On code verification: authenticate user
- Update last_login timestamp
- Return JWT token

#### Shared Logic
- Code generation (random 6 digits)
- Code validation (check expiry, usage, attempts)
- Rate limiting logic
- Token generation and validation

### 4. Email Service
- Mock mode for testing (print to console)
- **Gmail SMTP integration (recommended for hackathons/small projects)**
  - Uses standard Gmail account with App Password
  - Free: 500 emails/day limit
  - Easy 5-minute setup
  - No API keys or approval needed
- SendGrid integration (optional, for production)
- SMTP support for other providers
- **Configurable email templates** stored in config or separate template files:
  - Signup verification template (customizable subject, body, HTML/text)
  - Login verification template (customizable subject, body, HTML/text)
  - Template variables: {code}, {name}, {email}, {expiry_minutes}, {app_name}
  - Support for both HTML and plain text versions
  - Ability to override templates via environment variables or template files
- Error handling for email failures with fallback to console output
- Configurable sender name and email address
- **Smart fallback system**: If email fails, log code to console/logs as backup

### 5. Logging System
Implement comprehensive logging for all important events:

**Authentication Events to Log:**
- User signup attempts (email, timestamp, success/failure)
- User login attempts (email, timestamp, success/failure)
- Verification code requests (email, IP address, timestamp)
- Code verification attempts (email, success/failure, timestamp)
- Failed verification attempts (track for security)
- Account lockouts due to rate limiting
- JWT token generation
- JWT token validation failures

**Security Events to Log:**
- Multiple failed login attempts from same email/IP
- Rate limit violations (email, IP, timestamp)
- Expired code usage attempts
- Already-used code attempts
- Invalid code format attempts
- Suspicious activity patterns

**System Events to Log:**
- Email sending success/failures
- Database connection issues
- Configuration errors
- Application startup/shutdown
- API endpoint access (optional, for debugging)

**Error Events to Log:**
- All exceptions with stack traces
- Email delivery failures
- Database errors
- Validation errors
- Authentication errors

**Log Levels:**
- DEBUG: Detailed information for development
- INFO: General informational messages (successful logins, signups)
- WARNING: Warning messages (rate limits hit, retries)
- ERROR: Error messages (email failures, invalid requests)
- CRITICAL: Critical issues (database down, major failures)

**Log Format Requirements:**
- Timestamp (ISO 8601 format)
- Log level
- Event type/category
- Message
- User email (when applicable, masked for privacy if needed)
- IP address (when applicable)
- Request ID (for tracing)
- Additional context (JSON format for structured data)

**Log Storage:**
- Console output (development)
- File rotation (production) - daily or size-based
- Optional: External logging service (CloudWatch, Datadog, etc.)
- Configurable log retention period

**Privacy Considerations:**
- Option to mask/hash email addresses in logs
- Don't log verification codes
- Don't log JWT tokens
- Option to disable detailed logging in production

### 6. Security Implementation
- JWT token creation and verification
- Secret key management via environment variables
- Code expiration logic
- Rate limiting per email/IP
- One-time code usage enforcement
- Email uniqueness validation
- Input validation and sanitization

### 7. Configuration
- Environment variables for:
  - Secret keys (JWT secret)
  - Email credentials (SendGrid API key or SMTP settings)
  - Rate limiting settings:
    - Max requests per hour per email
    - Max verification attempts
  - Token expiration (default: 30 days)
  - **Code settings**:
    - Code length (default: 6, configurable to 4-8 digits)
    - Code expiration time in minutes (default: 15)
    - Code type: numeric only or alphanumeric
  - Required user fields
  - **Email template settings**:
    - Signup email subject
    - Signup email body template (with placeholders)
    - Login email subject
    - Login email body template (with placeholders)
    - From email address
    - From name
    - Option to use template files instead of env vars
  - Application settings:
    - App name (used in emails)
    - App URL (for email links if needed)
    - Support email address
  - **Logging settings**:
    - Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    - Log format (JSON or text)
    - Log file location
    - Log rotation settings (max size, backup count)
    - Enable/disable different log categories
    - Mask sensitive data in logs (email masking, IP anonymization)
    - External logging service configuration (optional)

### 8. Testing & Demo
- Test script to demonstrate both flows
- Frontend example (HTML/JavaScript) with:
  - Signup page (email + name fields)
  - Login page (email only)
  - Code verification page
  - Dashboard (protected page)
- API documentation
- Setup instructions

### 9. File Structure
use this project structure and integrate into it

### 10. Template Customization System
- **Template Variables** available for use in email templates:
  - `{code}` - The verification code
  - `{name}` - User's name (signup only)
  - `{email}` - User's email
  - `{expiry_minutes}` - How long the code is valid
  - `{app_name}` - Application name
  - `{app_url}` - Application URL (optional)
  - `{support_email}` - Support contact email
  
- **Configuration Options**:
  - Option 1: Store templates in environment variables (simple)
  - Option 2: Store templates in separate HTML/TXT files (recommended for complex templates)
  - Option 3: Hybrid - use env vars for simple customization, files for full control

- **Default Templates** should be provided as fallback
- Templates should support both HTML (rich formatting) and plain text (email client compatibility)

## Specific Questions to Address

1. **User Creation Flow**: How to handle pending signups (code sent but not verified)?
2. **Email Validation**: How to prevent duplicate signups?
3. **Code Storage**: Should signup codes reference user_id (null) or just email?
4. **Code Expiration**: Best practices for setting expiration time?
5. **Rate Limiting**: How to implement effective rate limiting?
6. **Token Management**: JWT token best practices (expiration, refresh)?
7. **Email Reliability**: How to handle email sending failures?
8. **Security**: What additional security measures should be included?
9. **Template Management**: What's the best way to make email templates configurable?
10. **Configuration Flexibility**: How to balance environment variables vs config files?
11. **Code Customization**: Should code length and format be runtime configurable or deployment-time only?
12. **Logging Strategy**: What's the best approach for structured logging in FastAPI?
13. **Log Retention**: How long should logs be kept and how to implement rotation?
14. **Privacy in Logs**: How to balance detailed logging with user privacy?
15. **Security Monitoring**: What patterns indicate suspicious activity that should trigger alerts?

## Expected Deliverables

1. Complete, working Python code for all components
2. Database schema with migrations
3. API documentation
4. Environment configuration template (.env.example) with:
   - All configurable parameters documented
   - Sensible default values
   - Example email template strings
5. README with setup instructions including:
   - How to customize code length and expiry
   - How to customize email templates
   - Configuration options explanation
   - **Logging configuration and monitoring guide**
5. Test script to verify functionality
6. **Email template files** (HTML and plain text):
   - Default templates with placeholders
   - Instructions for customization
   - Examples of customized templates
7. **Email service implementation** with:
   - Gmail SMTP support (primary method)
   - SendGrid support (optional)
   - Generic SMTP support (optional)
   - Mock mode for testing
   - Automatic fallback to console if email fails
   - Clear setup instructions for Gmail App Password
   - Error handling and retry logic
8. **Logging system** with:
   - Comprehensive event logging
   - Multiple output formats (JSON, text)
   - File rotation
   - Security event tracking
   - Example log outputs
   - Documentation on what events are logged
9. Configuration best practices guide

## Success Criteria

The system should:
- ✅ Have separate signup and login flows
- ✅ Collect user name (and other data) during signup
- ✅ Allow existing users to login with just email
- ✅ Prevent duplicate signups (email uniqueness)
- ✅ Send appropriate verification codes via email
- ✅ Validate codes securely
- ✅ Generate JWT tokens for authenticated sessions
- ✅ Prevent abuse through rate limiting
- ✅ Work in both test mode and production mode
- ✅ Be production-ready with proper error handling
- ✅ Be easy to deploy and configure
- ✅ **Support Gmail SMTP out of the box** with simple 5-minute setup
- ✅ **Have email fallback** - if email fails, log code to console
- ✅ **Allow easy customization of**:
  - Verification code length (4-8 digits)
  - Code expiration time
  - Email templates (subject and body)
  - Rate limiting parameters
  - Email sender information
  - Email service provider (Gmail/SendGrid/SMTP/Mock)
- ✅ **Provide clear documentation** on how to customize all configurable parameters
- ✅ **Log all important events** including:
  - Authentication attempts (success and failure)
  - Security events (rate limiting, suspicious activity)
  - System errors and exceptions
  - Email delivery status
- ✅ **Provide configurable logging** with:
  - Multiple log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
  - File rotation
  - Optional external logging service integration
  - Privacy controls (email/IP masking)

## Additional Context

- This will be used for backend for web app, probably mobile app backend
- Expected user base: small/medium
- Email volume: not sure 
- User profile fields needed: email, name, [add any others: phone, company, etc.]
- **Email Service Preference**: Use Gmail SMTP as the primary/default option for ease of setup and zero cost
- **Fallback Strategy**: If email sending fails, log the verification code to console/logs as a backup

## User Experience Flow

### New User (Signup)
1. User visits signup page
2. Enters email and name
3. Clicks "Sign Up"
4. Receives verification code via email
5. Enters code
6. Account created → redirected to app

### Existing User (Login)
1. User visits login page
2. Enters email only
3. Clicks "Send Code"
4. Receives verification code via email
5. Enters code
6. Authenticated → redirected to app

---

Please provide a complete implementation with all the code files, documentation, and instructions needed to build and deploy this system. Make sure the code is production-ready, well-commented, and follows best practices.

**Key Difference from Unified Flow**: This system has separate signup and login endpoints. Signup requires email + name + code verification. Login requires only email + code verification.

---

## Example .env Configuration

```env
# Application
APP_NAME=My Awesome App
APP_URL=https://myapp.com
SUPPORT_EMAIL=support@myapp.com

# Code Settings
CODE_LENGTH=6
CODE_TYPE=numeric
CODE_EXPIRATION_MINUTES=15

# Rate Limiting
MAX_CODE_REQUESTS_PER_HOUR=5
MAX_VERIFICATION_ATTEMPTS=5

# JWT Settings
JWT_SECRET_KEY=your-super-secret-key-min-32-characters
JWT_EXPIRATION_MINUTES=43200

# Email Service Selection
EMAIL_SERVICE=gmail
# Options: gmail, sendgrid, smtp, mock

# Gmail SMTP (Recommended - Free, 500 emails/day)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
EMAIL_FROM_ADDRESS=your-email@gmail.com
EMAIL_FROM_NAME=My Awesome App

# OR SendGrid (Optional - for production)
# SENDGRID_API_KEY=your-sendgrid-key

# OR Generic SMTP (Optional)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USERNAME=your-username
# SMTP_PASSWORD=your-password
# SMTP_USE_TLS=true

# Email Templates (Simple - inline in env)
SIGNUP_EMAIL_SUBJECT=Welcome to {app_name}! Verify your email
LOGIN_EMAIL_SUBJECT=Your login code for {app_name}

# OR use template files (Advanced - recommended for HTML)
USE_TEMPLATE_FILES=true
TEMPLATE_DIRECTORY=templates

# Email Fallback
EMAIL_FALLBACK_TO_CONSOLE=true

# Logging Settings
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_FILE=logs/app.log
LOG_MAX_BYTES=10485760
LOG_BACKUP_COUNT=5
LOG_TO_CONSOLE=true
LOG_TO_FILE=true
MASK_EMAILS_IN_LOGS=false
MASK_IP_IN_LOGS=false

# Optional: Separate security logs
ENABLE_SECURITY_LOG=true
SECURITY_LOG_FILE=logs/security.log

# Optional: External logging (e.g., CloudWatch, Datadog)
# EXTERNAL_LOGGING_ENABLED=false
# EXTERNAL_LOGGING_SERVICE=cloudwatch
# EXTERNAL_LOGGING_CONFIG={"region": "us-east-1"}
```

## Gmail SMTP Setup Guide (5 Minutes)

### Step 1: Enable 2-Factor Authentication
1. Go to Google Account: https://myaccount.google.com
2. Security → 2-Step Verification → Turn On
3. Follow the setup process

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Enter name: "My Auth App"
4. Click "Generate"
5. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### Step 3: Add to .env File
```env
EMAIL_SERVICE=gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop  # Remove spaces
EMAIL_FROM_ADDRESS=your-email@gmail.com
EMAIL_FROM_NAME=My App
```

### Step 4: Test
```bash
python main.py
# Try sending a test verification code
```

**That's it!** You now have free email sending (500 emails/day).

### Troubleshooting Gmail SMTP
- **"Invalid credentials"**: Make sure you're using App Password, not your regular Gmail password
- **"Less secure app"**: This doesn't apply to App Passwords, you're good
- **Port issues**: Use port 587 with TLS (not 465)
- **Firewall**: Make sure port 587 is open

## Example Email Template (HTML)

```html
<!-- templates/signup_email.html -->
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .code { font-size: 32px; font-weight: bold; color: #4CAF50; }
    </style>
</head>
<body>
    <h1>Welcome to {app_name}, {name}!</h1>
    <p>Thanks for signing up. Please use the code below to verify your email:</p>
    <div class="code">{code}</div>
    <p>This code will expire in {expiry_minutes} minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <p>Need help? Contact us at {support_email}</p>
</body>
</html>
```

## Example Logging Implementation

The system should log events like this:

**Successful Signup (INFO level):**
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

**Failed Login Attempt (WARNING level):**
```json
{
  "timestamp": "2024-01-15T10:32:10.456Z",
  "level": "WARNING",
  "event": "login_failed_invalid_code",
  "email": "user@example.com",
  "ip_address": "192.168.1.1",
  "attempt_number": 2,
  "message": "Invalid verification code provided"
}
```

**Rate Limit Hit (WARNING level):**
```json
{
  "timestamp": "2024-01-15T10:35:20.789Z",
  "level": "WARNING",
  "event": "rate_limit_exceeded",
  "email": "user@example.com",
  "ip_address": "192.168.1.1",
  "limit": 5,
  "period": "1 hour",
  "message": "User exceeded rate limit for code requests"
}
```

**Email Send Failure (ERROR level):**
```json
{
  "timestamp": "2024-01-15T10:40:15.234Z",
  "level": "ERROR",
  "event": "email_send_failed",
  "email": "user@example.com",
  "error": "SMTP connection timeout",
  "message": "Failed to send verification email",
  "stack_trace": "..."
}
```

**Text Format Example (alternative to JSON):**
```
2024-01-15 10:30:45 [INFO] user_signup_success - User user@example.com successfully signed up (IP: 192.168.1.1, user_id: 123)
2024-01-15 10:32:10 [WARNING] login_failed_invalid_code - Invalid code for user@example.com (IP: 192.168.1.1, attempt: 2/5)
2024-01-15 10:35:20 [WARNING] rate_limit_exceeded - user@example.com exceeded rate limit (5 requests/hour, IP: 192.168.1.1)
2024-01-15 10:40:15 [ERROR] email_send_failed - Failed to send email to user@example.com: SMTP connection timeout
```

## Example Template Customization Guide

The implementation should include clear documentation showing:
1. How to modify code length in .env
2. How to change expiration time
3. How to create custom HTML templates
4. How to use template variables
5. How to switch between inline templates and template files
6. Examples of both simple and complex template customizations

## IMPORTANT - if you have any questions during integration feel free to ask them