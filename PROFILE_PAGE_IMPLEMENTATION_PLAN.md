# Profile Page - Implementation Plan

**Version**: 1.0
**Date**: 2025-11-17
**Estimated Time**: 6-8 hours
**Status**: Ready to Implement

---

## Table of Contents
1. [Overview](#overview)
2. [Phase 1: Backend - Database & Models](#phase-1-backend---database--models)
3. [Phase 2: Backend - API Endpoints](#phase-2-backend---api-endpoints)
4. [Phase 3: Frontend - Components](#phase-3-frontend---components)
5. [Phase 4: Frontend - Profile Page](#phase-4-frontend---profile-page)
6. [Phase 5: Integration & Testing](#phase-5-integration--testing)
7. [Implementation Checklist](#implementation-checklist)

---

## Overview

### Goals
- Implement user profile page with token credit system
- Display user statistics (debates, favorite models, categories)
- Show recent and favorite debates with delete functionality
- Enable profile editing (name and avatar upload)
- Maintain consistent design with existing dark theme

### Tech Stack
- **Backend**: Flask + SQLAlchemy + SQLite
- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4
- **Authentication**: JWT (existing system)
- **File Upload**: Flask file handling + storage directory

---

## Phase 1: Backend - Database & Models

**Estimated Time**: 1-1.5 hours

### 1.1 Update User Model
**File**: `backend/models/user.py`

**Tasks**:
- [ ] Add `avatar_url` field (String(500), nullable)
- [ ] Add `tokens_remaining` field (Integer, default=100000)
- [ ] Add `total_debates` field (Integer, default=0)
- [ ] Add relationship to `DebateDB` model
- [ ] Update `to_dict()` method to include new fields

**Code Changes**:
```python
# Add to User class
avatar_url = Column(String(500), nullable=True)
tokens_remaining = Column(Integer, default=100000)
total_debates = Column(Integer, default=0)

# Add relationship
debates = relationship("DebateDB", back_populates="user")

# Update to_dict()
def to_dict(self):
    return {
        'id': self.id,
        'email': self.email,
        'name': self.name,
        'avatar_url': self.avatar_url,
        'tokens_remaining': self.tokens_remaining,
        'total_debates': self.total_debates,
        'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
        'last_login': self.last_login.isoformat() + 'Z' if self.last_login else None,
        'is_active': self.is_active
    }
```

### 1.2 Update DebateDB Model
**File**: `backend/models/db_models.py`

**Tasks**:
- [ ] Add `user_id` field (Integer, ForeignKey('users.id'), nullable=True)
- [ ] Add `user` relationship
- [ ] Add `is_deleted` field (Boolean, default=False)
- [ ] Add `total_tokens_used` field (Integer, default=0)
- [ ] Add `tokens_by_model` field (JSON, nullable)
- [ ] Add `market_category` field (String(100), nullable, indexed)

**Code Changes**:
```python
# Add to DebateDB class
user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
user = relationship("User", back_populates="debates")
is_deleted = Column(Boolean, default=False, index=True)
total_tokens_used = Column(Integer, default=0)
tokens_by_model = Column(JSON, nullable=True)
market_category = Column(String(100), nullable=True, index=True)
```

### 1.3 Database Migration
**File**: `backend/scripts/migrate_profile.py` (new file)

**Tasks**:
- [ ] Create migration script
- [ ] Add new columns to existing tables
- [ ] Set default values for existing users
- [ ] Handle data integrity

**Migration Script**:
```python
"""
Migration script for profile page feature
"""
from database import get_db, init_db
from models.user import User
from models.db_models import DebateDB
from sqlalchemy import text

def migrate():
    init_db()
    db = next(get_db())

    # Add columns to users table
    try:
        db.execute(text('ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)'))
        db.execute(text('ALTER TABLE users ADD COLUMN tokens_remaining INTEGER DEFAULT 100000'))
        db.execute(text('ALTER TABLE users ADD COLUMN total_debates INTEGER DEFAULT 0'))
        db.commit()
        print("✓ Users table updated")
    except Exception as e:
        print(f"Users table migration: {e}")

    # Add columns to debates table
    try:
        db.execute(text('ALTER TABLE debates ADD COLUMN user_id INTEGER'))
        db.execute(text('ALTER TABLE debates ADD COLUMN is_deleted BOOLEAN DEFAULT 0'))
        db.execute(text('ALTER TABLE debates ADD COLUMN total_tokens_used INTEGER DEFAULT 0'))
        db.execute(text('ALTER TABLE debates ADD COLUMN tokens_by_model TEXT'))
        db.execute(text('ALTER TABLE debates ADD COLUMN market_category VARCHAR(100)'))
        db.commit()
        print("✓ Debates table updated")
    except Exception as e:
        print(f"Debates table migration: {e}")

    print("✓ Migration completed")

if __name__ == '__main__':
    migrate()
```

### 1.4 Create Avatar Upload Directory
**File**: `backend/config.py`

**Tasks**:
- [ ] Add `AVATAR_DIR` constant
- [ ] Ensure directory exists in `ensure_directories()`

**Code Changes**:
```python
# Add to Config class
AVATAR_DIR = os.path.join(STORAGE_DIR, 'avatars')

# Update ensure_directories()
@classmethod
def ensure_directories(cls):
    os.makedirs(cls.STORAGE_DIR, exist_ok=True)
    os.makedirs(cls.AUDIO_DIR, exist_ok=True)
    os.makedirs(cls.AVATAR_DIR, exist_ok=True)  # Add this line
```

---

## Phase 2: Backend - API Endpoints

**Estimated Time**: 2-3 hours

### 2.1 Profile Routes
**File**: `backend/routes/profile.py` (new file)

**Endpoints to Implement**:
1. `GET /api/auth/profile` - Get user profile with statistics
2. `PUT /api/auth/profile` - Update user profile
3. `POST /api/auth/upload-avatar` - Upload avatar
4. `GET /api/auth/debates` - Get user's debate history
5. `GET /api/auth/debates/top` - Get top debates

**Implementation**:

#### GET /api/auth/profile
```python
@profile_bp.route('/profile', methods=['GET'])
@jwt_required
def get_profile():
    """Get current user's profile with statistics"""
    user_id = get_current_user_id()
    db = next(get_db())

    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        return jsonify({'error': {'code': 'user_not_found', 'message': 'User not found'}}), 404

    # Get statistics
    total_debates = db.query(DebateDB).filter_by(user_id=user_id, is_deleted=False).count()
    total_favorites = db.query(UserFavorite).filter_by(user_id=user_id).count()

    # Get favorite models (most used)
    favorite_models = get_favorite_models(db, user_id)

    # Get favorite categories
    favorite_categories = get_favorite_categories(db, user_id)

    return jsonify({
        'user': user.to_dict(),
        'statistics': {
            'total_debates': total_debates,
            'total_favorites': total_favorites,
            'favorite_models': favorite_models,
            'favorite_categories': favorite_categories
        }
    }), 200
```

#### PUT /api/auth/profile
```python
@profile_bp.route('/profile', methods=['PUT'])
@jwt_required
def update_profile():
    """Update user profile (name and avatar)"""
    user_id = get_current_user_id()
    db = next(get_db())

    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        return jsonify({'error': {'code': 'user_not_found', 'message': 'User not found'}}), 404

    # Handle multipart form data
    if 'name' in request.form:
        user.name = request.form['name']

    if 'avatar' in request.files:
        avatar_url = handle_avatar_upload(request.files['avatar'], user_id)
        if avatar_url:
            user.avatar_url = avatar_url
        else:
            return jsonify({'error': {'code': 'upload_failed', 'message': 'Avatar upload failed'}}), 400

    db.commit()

    return jsonify({'user': user.to_dict()}), 200
```

#### GET /api/auth/debates
```python
@profile_bp.route('/debates', methods=['GET'])
@jwt_required
def get_user_debates():
    """Get user's debate history with filters"""
    user_id = get_current_user_id()
    db = next(get_db())

    # Parse query parameters
    limit = request.args.get('limit', 12, type=int)
    offset = request.args.get('offset', 0, type=int)
    category = request.args.get('category')
    status = request.args.get('status')
    sort = request.args.get('sort', 'recent')

    # Build query
    query = db.query(DebateDB).filter_by(user_id=user_id, is_deleted=False)

    if category:
        query = query.filter_by(market_category=category)
    if status:
        query = query.filter_by(status=status)

    # Sort
    if sort == 'recent':
        query = query.order_by(DebateDB.created_at.desc())
    elif sort == 'tokens':
        query = query.order_by(DebateDB.total_tokens_used.desc())
    elif sort == 'rounds':
        query = query.order_by(DebateDB.rounds.desc())

    total = query.count()
    debates = query.limit(limit).offset(offset).all()

    return jsonify({
        'debates': [format_debate_summary(db, d) for d in debates],
        'pagination': {
            'total': total,
            'limit': limit,
            'offset': offset,
            'has_more': offset + limit < total
        }
    }), 200
```

#### GET /api/auth/debates/top
```python
@profile_bp.route('/debates/top', methods=['GET'])
@jwt_required
def get_top_debates():
    """Get top debates (recent or favorites)"""
    user_id = get_current_user_id()
    db = next(get_db())

    debate_type = request.args.get('type', 'recent')
    limit = request.args.get('limit', 5, type=int)

    if debate_type == 'favorites':
        # Get favorite debates
        favorites = db.query(UserFavorite).filter_by(user_id=user_id).all()
        debate_ids = [f.debate_id for f in favorites]
        debates = db.query(DebateDB).filter(
            DebateDB.debate_id.in_(debate_ids),
            DebateDB.is_deleted == False
        ).order_by(DebateDB.created_at.desc()).limit(limit).all()
    else:
        # Get recent debates
        debates = db.query(DebateDB).filter_by(
            user_id=user_id,
            is_deleted=False
        ).order_by(DebateDB.created_at.desc()).limit(limit).all()

    return jsonify({
        'type': debate_type,
        'debates': [format_debate_summary(db, d) for d in debates]
    }), 200
```

### 2.2 Delete Debate Endpoint
**File**: `backend/routes/debate.py` (modify existing)

**Tasks**:
- [ ] Add DELETE endpoint for soft-deleting debates
- [ ] Check user ownership before deletion

```python
@debate_bp.route('/debates/<debate_id>', methods=['DELETE'])
@jwt_required
def delete_debate(debate_id):
    """Soft delete a debate"""
    user_id = get_current_user_id()
    db = next(get_db())

    debate = db.query(DebateDB).filter_by(debate_id=debate_id).first()
    if not debate:
        return jsonify({'error': {'code': 'not_found', 'message': 'Debate not found'}}), 404

    if debate.user_id != user_id:
        return jsonify({'error': {'code': 'unauthorized', 'message': 'You can only delete your own debates'}}), 403

    debate.is_deleted = True
    db.commit()

    return jsonify({'message': 'Debate deleted successfully', 'debate_id': debate_id}), 200
```

### 2.3 Helper Functions
**File**: `backend/services/profile_service.py` (new file)

**Functions to Create**:
- [ ] `handle_avatar_upload(file, user_id)` - Process and save avatar
- [ ] `get_favorite_models(db, user_id)` - Get most used models
- [ ] `get_favorite_categories(db, user_id)` - Get most debated categories
- [ ] `format_debate_summary(db, debate)` - Format debate for response

```python
def handle_avatar_upload(file, user_id):
    """Upload and process avatar image"""
    import os
    from werkzeug.utils import secure_filename
    from PIL import Image
    import time

    # Validate file type
    allowed_extensions = {'jpg', 'jpeg', 'png', 'gif'}
    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower()

    if ext not in allowed_extensions:
        return None

    # Generate unique filename
    timestamp = int(time.time())
    new_filename = f"user{user_id}_{timestamp}.{ext}"
    filepath = os.path.join(config.AVATAR_DIR, new_filename)

    # Save and resize image
    try:
        image = Image.open(file)
        image = image.resize((256, 256), Image.LANCZOS)
        image.save(filepath)
        return f"/uploads/avatars/{new_filename}"
    except Exception as e:
        logger.error(f"Avatar upload failed: {e}")
        return None

def get_favorite_models(db, user_id):
    """Get user's most used AI models"""
    from sqlalchemy import func

    # Query debates and aggregate model usage
    debates = db.query(DebateDB).filter_by(user_id=user_id, is_deleted=False).all()

    model_counts = {}
    for debate in debates:
        for model in debate.models:
            model_id = model.model_id
            if model_id not in model_counts:
                model_counts[model_id] = {
                    'model_id': model_id,
                    'model_name': model.model_name,
                    'usage_count': 0
                }
            model_counts[model_id]['usage_count'] += 1

    # Sort by usage count
    sorted_models = sorted(model_counts.values(), key=lambda x: x['usage_count'], reverse=True)
    return sorted_models[:3]  # Top 3

def get_favorite_categories(db, user_id):
    """Get user's most debated categories"""
    from sqlalchemy import func

    categories = db.query(
        DebateDB.market_category,
        func.count(DebateDB.debate_id).label('count')
    ).filter_by(
        user_id=user_id,
        is_deleted=False
    ).filter(
        DebateDB.market_category.isnot(None)
    ).group_by(
        DebateDB.market_category
    ).order_by(
        func.count(DebateDB.debate_id).desc()
    ).limit(3).all()

    return [{'category': cat, 'count': count} for cat, count in categories]

def format_debate_summary(db, debate):
    """Format debate for list view"""
    is_favorite = db.query(UserFavorite).filter_by(
        user_id=debate.user_id,
        debate_id=debate.debate_id
    ).first() is not None

    models_count = len(debate.models)

    return {
        'debate_id': debate.debate_id,
        'market_question': debate.market_question,
        'market_category': debate.market_category,
        'status': debate.status,
        'rounds': debate.rounds,
        'models_count': models_count,
        'total_tokens_used': debate.total_tokens_used or 0,
        'created_at': debate.created_at,
        'completed_at': debate.completed_at,
        'is_favorite': is_favorite
    }
```

### 2.4 Register Profile Blueprint
**File**: `backend/app.py`

**Tasks**:
- [ ] Import profile blueprint
- [ ] Register with `/api/auth` prefix

```python
from routes.profile import profile_bp

app.register_blueprint(profile_bp, url_prefix='/api/auth')
```

### 2.5 Serve Avatar Files
**File**: `backend/app.py`

**Tasks**:
- [ ] Add route to serve avatar uploads

```python
@app.route('/uploads/avatars/<filename>', methods=['GET'])
def serve_avatar(filename):
    """Serve avatar images"""
    from flask import send_from_directory
    import os

    # Security: validate filename
    if '..' in filename or '/' in filename:
        return jsonify({'error': {'code': 'invalid_filename', 'message': 'Invalid filename'}}), 400

    avatar_path = os.path.join(config.AVATAR_DIR, filename)

    if not os.path.exists(avatar_path):
        return jsonify({'error': {'code': 'not_found', 'message': 'Avatar not found'}}), 404

    return send_from_directory(config.AVATAR_DIR, filename)
```

---

## Phase 3: Frontend - Components

**Estimated Time**: 2-3 hours

### 3.1 Profile Header Component
**File**: `frontend/components/profile/ProfileHeader.tsx`

**Features**:
- Avatar display (or initials if no avatar)
- User name and email
- Member since date
- Edit Profile button
- Log Out button

**Component Structure**:
```tsx
interface ProfileHeaderProps {
  user: {
    name: string;
    email: string;
    avatar_url: string | null;
    created_at: string;
  };
  onEditClick: () => void;
  onLogoutClick: () => void;
}

export function ProfileHeader({ user, onEditClick, onLogoutClick }: ProfileHeaderProps) {
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-20 h-20 rounded-full" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold">
              {initials}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{user.name}</h1>
            <p className="text-gray-400">{user.email}</p>
            <p className="text-sm text-gray-500">
              Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onEditClick} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            Edit Profile
          </button>
          <button onClick={onLogoutClick} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3.2 Statistics Cards Component
**File**: `frontend/components/profile/StatisticsCards.tsx`

**Features**:
- 4 stat cards: Total Debates, Tokens Remaining, Favorite Model, Top Category
- Gradient backgrounds matching market cards

```tsx
interface StatisticsCardsProps {
  statistics: {
    total_debates: number;
    tokens_remaining: number;
    favorite_models: Array<{ model_name: string; usage_count: number }>;
    favorite_categories: Array<{ category: string; count: number }>;
  };
}

export function StatisticsCards({ statistics }: StatisticsCardsProps) {
  const topModel = statistics.favorite_models[0]?.model_name || 'N/A';
  const topCategory = statistics.favorite_categories[0]?.category || 'N/A';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard title="Total Debates" value={statistics.total_debates} />
      <StatCard title="Tokens Remaining" value={statistics.tokens_remaining.toLocaleString()} />
      <StatCard title="Favorite Model" value={topModel} />
      <StatCard title="Top Category" value={topCategory} />
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-gradient-to-br from-[#1a1f2e] to-[#252b3b] border border-gray-800 rounded-lg p-6">
      <h3 className="text-sm text-gray-400 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
```

### 3.3 Top Debates Component
**File**: `frontend/components/profile/TopDebates.tsx`

**Features**:
- Tabs for Recent and Favorites
- Debate cards with delete button
- View debate button

```tsx
interface TopDebatesProps {
  debates: Array<Debate>;
  type: 'recent' | 'favorites';
  onTypeChange: (type: 'recent' | 'favorites') => void;
  onDelete: (debateId: string) => void;
  onView: (debateId: string) => void;
}

export function TopDebates({ debates, type, onTypeChange, onDelete, onView }: TopDebatesProps) {
  return (
    <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-6 mb-6">
      <div className="flex gap-4 mb-4 border-b border-gray-800">
        <button
          onClick={() => onTypeChange('recent')}
          className={`pb-3 px-4 ${type === 'recent' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
        >
          Recent
        </button>
        <button
          onClick={() => onTypeChange('favorites')}
          className={`pb-3 px-4 ${type === 'favorites' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
        >
          Favorites
        </button>
      </div>

      <div className="space-y-3">
        {debates.map(debate => (
          <DebateCard
            key={debate.debate_id}
            debate={debate}
            onDelete={onDelete}
            onView={onView}
          />
        ))}
      </div>
    </div>
  );
}
```

### 3.4 Debate Card Component
**File**: `frontend/components/profile/DebateCard.tsx`

**Features**:
- Market question with category icon
- Metadata (rounds, models, tokens, date)
- Delete and favorite buttons
- View debate button

```tsx
interface DebateCardProps {
  debate: Debate;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

export function DebateCard({ debate, onDelete, onView }: DebateCardProps) {
  const timeAgo = formatTimeAgo(debate.created_at);

  return (
    <div className="bg-[#252b3b] border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-white flex-1">{debate.market_question}</h3>
        <div className="flex gap-2">
          {debate.is_favorite && <span className="text-red-500">❤️</span>}
          <button
            onClick={() => onDelete(debate.debate_id)}
            className="text-gray-400 hover:text-red-500"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-400 mb-3">
        {debate.rounds} rounds • {debate.models_count} models • {debate.total_tokens_used.toLocaleString()} tokens • {timeAgo}
      </div>

      <button
        onClick={() => onView(debate.debate_id)}
        className="text-blue-500 hover:text-blue-400 text-sm font-medium"
      >
        View Debate →
      </button>
    </div>
  );
}
```

### 3.5 Edit Profile Modal
**File**: `frontend/components/profile/EditProfileModal.tsx`

**Features**:
- Name input
- Avatar upload with preview
- Save/Cancel buttons

```tsx
interface EditProfileModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onSave: (name: string, avatar: File | null) => Promise<void>;
}

export function EditProfileModal({ isOpen, user, onClose, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user.avatar_url);
  const [loading, setLoading] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(name, avatar);
      onClose();
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">Edit Profile</h2>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#252b3b] border border-gray-700 rounded-lg px-4 py-2 text-white"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">Profile Picture</label>
          <div className="flex items-center gap-4">
            {preview && (
              <img src={preview} alt="Preview" className="w-20 h-20 rounded-full" />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif"
              onChange={handleAvatarChange}
              className="text-sm text-gray-400"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3.6 Debate History Component
**File**: `frontend/components/profile/DebateHistory.tsx`

**Features**:
- Category filter tabs
- Debate grid (4 columns on desktop)
- Pagination

```tsx
interface DebateHistoryProps {
  debates: Debate[];
  pagination: PaginationInfo;
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  onPageChange: (offset: number) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

export function DebateHistory({
  debates,
  pagination,
  filters,
  onFilterChange,
  onPageChange,
  onDelete,
  onView
}: DebateHistoryProps) {
  return (
    <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Debate History</h2>

      {/* Category filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <FilterButton active={!filters.category} onClick={() => onFilterChange({ ...filters, category: null })}>
          All
        </FilterButton>
        <FilterButton active={filters.category === 'Politics'} onClick={() => onFilterChange({ ...filters, category: 'Politics' })}>
          Politics
        </FilterButton>
        <FilterButton active={filters.category === 'Sports'} onClick={() => onFilterChange({ ...filters, category: 'Sports' })}>
          Sports
        </FilterButton>
        <FilterButton active={filters.category === 'Crypto'} onClick={() => onFilterChange({ ...filters, category: 'Crypto' })}>
          Crypto
        </FilterButton>
      </div>

      {/* Debate grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {debates.map(debate => (
          <DebateCard
            key={debate.debate_id}
            debate={debate}
            onDelete={onDelete}
            onView={onView}
          />
        ))}
      </div>

      {/* Pagination */}
      <Pagination pagination={pagination} onPageChange={onPageChange} />
    </div>
  );
}
```

---

## Phase 4: Frontend - Profile Page

**Estimated Time**: 1 hour

### 4.1 Profile Page
**File**: `frontend/app/profile/page.tsx`

**Tasks**:
- [ ] Create profile page route
- [ ] Fetch user data and statistics
- [ ] Implement state management for tabs and filters
- [ ] Handle edit profile modal
- [ ] Handle delete confirmation

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatisticsCards } from '@/components/profile/StatisticsCards';
import { TopDebates } from '@/components/profile/TopDebates';
import { DebateHistory } from '@/components/profile/DebateHistory';
import { EditProfileModal } from '@/components/profile/EditProfileModal';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [topDebates, setTopDebates] = useState([]);
  const [debates, setDebates] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 12, offset: 0, has_more: false });
  const [topDebateType, setTopDebateType] = useState<'recent' | 'favorites'>('recent');
  const [filters, setFilters] = useState({ category: null, status: null, sort: 'recent' });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch profile data
  useEffect(() => {
    fetchProfile();
  }, []);

  // Fetch top debates when type changes
  useEffect(() => {
    fetchTopDebates(topDebateType);
  }, [topDebateType]);

  // Fetch debates when filters change
  useEffect(() => {
    fetchDebates();
  }, [filters, pagination.offset]);

  const fetchProfile = async () => {
    // Implementation
  };

  const fetchTopDebates = async (type: string) => {
    // Implementation
  };

  const fetchDebates = async () => {
    // Implementation
  };

  const handleEditProfile = async (name: string, avatar: File | null) => {
    // Implementation
  };

  const handleDeleteDebate = async (debateId: string) => {
    if (confirm('Are you sure you want to delete this debate?')) {
      // Implementation
    }
  };

  const handleViewDebate = (debateId: string) => {
    router.push(`/debate/${debateId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ProfileHeader
        user={user}
        onEditClick={() => setIsEditModalOpen(true)}
        onLogoutClick={handleLogout}
      />

      <StatisticsCards statistics={statistics} />

      <TopDebates
        debates={topDebates}
        type={topDebateType}
        onTypeChange={setTopDebateType}
        onDelete={handleDeleteDebate}
        onView={handleViewDebate}
      />

      <DebateHistory
        debates={debates}
        pagination={pagination}
        filters={filters}
        onFilterChange={setFilters}
        onPageChange={(offset) => setPagination({ ...pagination, offset })}
        onDelete={handleDeleteDebate}
        onView={handleViewDebate}
      />

      <EditProfileModal
        isOpen={isEditModalOpen}
        user={user}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditProfile}
      />
    </div>
  );
}
```

### 4.2 API Client Functions
**File**: `frontend/lib/api/profile.ts` (new file)

**Functions**:
- `getProfile()` - Fetch user profile
- `updateProfile(name, avatar)` - Update profile
- `getUserDebates(filters)` - Fetch debates with filters
- `getTopDebates(type)` - Fetch top debates
- `deleteDebate(id)` - Delete debate

```tsx
export async function getProfile() {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:5001/api/auth/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

export async function updateProfile(name: string, avatar: File | null) {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  if (name) formData.append('name', name);
  if (avatar) formData.append('avatar', avatar);

  const response = await fetch('http://localhost:5001/api/auth/profile', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  return response.json();
}

// ... more functions
```

### 4.3 Add Profile Link to Navigation
**File**: `frontend/components/layout/Header.tsx` (or wherever nav is)

**Tasks**:
- [ ] Add "Profile" link to navigation
- [ ] Show only when user is logged in

---

## Phase 5: Integration & Testing

**Estimated Time**: 1 hour

### 5.1 Backend Testing
- [ ] Run migration script
- [ ] Test all API endpoints with Postman/curl
- [ ] Verify authentication works correctly
- [ ] Test avatar upload and file serving
- [ ] Test soft delete functionality

### 5.2 Frontend Testing
- [ ] Test profile page loads correctly
- [ ] Test edit profile functionality
- [ ] Test avatar upload with preview
- [ ] Test debate filtering and pagination
- [ ] Test delete confirmation dialog
- [ ] Test navigation to debate detail page

### 5.3 Integration Testing
- [ ] Test end-to-end user flow
- [ ] Verify data consistency between backend and frontend
- [ ] Test error handling and edge cases
- [ ] Test responsive design on mobile/tablet

### 5.4 Edge Cases to Test
- [ ] User with no debates
- [ ] User with no favorites
- [ ] Invalid avatar file format
- [ ] Avatar file too large
- [ ] Deleting already deleted debate
- [ ] Accessing another user's debates

---

## Implementation Checklist

### Backend
- [ ] Update User model with new fields
- [ ] Update DebateDB model with new fields
- [ ] Run database migration
- [ ] Create avatar upload directory
- [ ] Implement GET /api/auth/profile
- [ ] Implement PUT /api/auth/profile
- [ ] Implement POST /api/auth/upload-avatar
- [ ] Implement GET /api/auth/debates
- [ ] Implement GET /api/auth/debates/top
- [ ] Implement DELETE /api/debates/:id
- [ ] Add avatar file serving route
- [ ] Create profile service helper functions
- [ ] Register profile blueprint
- [ ] Test all endpoints

### Frontend
- [ ] Create ProfileHeader component
- [ ] Create StatisticsCards component
- [ ] Create TopDebates component
- [ ] Create DebateCard component
- [ ] Create EditProfileModal component
- [ ] Create DebateHistory component
- [ ] Create profile page route
- [ ] Create API client functions
- [ ] Add profile link to navigation
- [ ] Test all components
- [ ] Test responsive design
- [ ] Test error states

### Final Steps
- [ ] End-to-end testing
- [ ] Fix any bugs
- [ ] Code review
- [ ] Update documentation
- [ ] Deploy changes

---

## Notes

### Current Placeholder Values
- Tokens Remaining: Display "100,000" as placeholder
- Will be replaced with actual token tracking in future iteration

### Future Enhancements
- Token consumption tracking during debates
- Achievement badges
- Analytics charts
- Export functionality
- Public profile sharing

### Dependencies
- Pillow (PIL) for image processing: `pip install Pillow`
- Frontend needs no additional dependencies (already using Next.js, React, Tailwind)

---

## Estimated Timeline

- **Phase 1 (Backend DB)**: 1-1.5 hours
- **Phase 2 (Backend API)**: 2-3 hours
- **Phase 3 (Frontend Components)**: 2-3 hours
- **Phase 4 (Frontend Page)**: 1 hour
- **Phase 5 (Testing)**: 1 hour

**Total**: 6-8 hours

---

## Success Criteria

✅ User can view their profile with statistics
✅ User can edit name and upload avatar
✅ User can see recent and favorite debates
✅ User can delete debates (soft delete)
✅ User can filter and paginate debate history
✅ Design matches existing PolyDebate theme
✅ All functionality works on mobile and desktop
✅ Token balance displays (placeholder for now)
