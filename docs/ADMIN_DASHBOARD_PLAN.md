# Admin Dashboard Implementation Plan

This document outlines the step-by-step plan to implement a secure Admin Dashboard for PolyDebate.

## Overview
The goal is to provide a central management interface for tracking users, debates, analytics, and system health.

## User Review Required
> [!IMPORTANT]
> **Security Protocol**: The admin password will be `polydebateadmin933962533`. This will be used to generate a secure session. In production, this should be set as an environment variable `ADMIN_PASSWORD`.

---

## 🏗 Phase 1: Backend Foundation

### 1.1 Database Updates
- [ ] **[MODIFY] [user.py](file:///backend/models/user.py)**: Add `is_admin` boolean field (default=False).
- [ ] **[NEW] [admin_config.py](file:///backend/config/admin.py)**: Define admin-specific configurations.

### 1.2 Admin Authentication
- [ ] **[MODIFY] [auth.py](file:///backend/utils/auth.py)**: Add `require_admin` decorator.
- [ ] **[NEW] [admin_auth.py](file:///backend/routes/admin_auth.py)**: Create `POST /api/admin/login` endpoint that validates the admin password.

---

## 📊 Phase 2: Administrative API Endpoints

### 2.1 Data Management
- [ ] **[NEW] [admin_data.py](file:///backend/routes/admin_data.py)**:
    - `GET /api/admin/users`: List all users with pagination and search.
    - `DELETE /api/admin/users/<id>`: Revoke user access.
    - `GET /api/admin/debates`: Overview of all debates across the platform.

### 2.2 Analytics & Health
- [ ] **[NEW] [admin_stats.py](file:///backend/routes/admin_stats.py)**:
    - `GET /api/admin/analytics`: Aggregate data on debate volume, model costs, and user growth.
    - `GET /api/admin/debug`: System logs, environment connectivity (OpenRouter, ElevenLabs health checks).

---

## 🎨 Phase 3: Frontend Implementation

### 3.1 Layout & Navigation
- [ ] **[NEW] Admin Layout**: Create a dashboard wrapper with a sidebar.
- [ ] **[NEW] Admin Guard**: Implement a route guard to prevent non-admins from accessing `/admin`.

### 3.2 Pages
- [ ] **[NEW] Admin Login**: Sleek, secure login page at `/admin/login`.
- [ ] **[NEW] Analytics Dashboard**: Main view featuring:
    - **KPI Cards**: Total Users, Active Debates, API Tokens status.
    - **Charts**: Debate trends over last 30 days.
- [ ] **[NEW] User Management**: Searchable table with user details (email, token usage, last login).
- [ ] **[NEW] System Debug**: Logs viewer and service status indicators.

---

## 🧪 Verification Plan

### Automated Tests
- `pytest backend/tests/test_admin_auth.py`: Verify that only the correct password grants admin access.
- `pytest backend/tests/test_admin_routes.py`: Ensure `require_admin` decorator blocks regular users.

### Manual Verification
1. Navigate to `/admin/login`.
2. Attempt login with incorrect password.
3. Login with `{{admin_password}}`.
4. Verify navigation to Analytics, User List, and Debug views.
5. Check if charts load data correctly from the backend.
6. Trigger a debate and see it appear in the admin "Live Debates" log.
