# Elite Ball Knowledge - Quick Start Guide

## 🚀 Starting the Application

### Backend (Already Running)
```bash
# Terminal 1
cd backend
uvicorn app.main:app --reload
# Runs on http://localhost:8000
# Swagger UI: http://localhost:8000/docs
```

### Frontend (Already Running)
```bash
# Terminal 2
cd frontend
npm run dev
# Runs on http://localhost:5173
```

---

## 🧪 Test User Credentials

### Option 1: Login with Pre-seeded User
- **Username:** `messi10`
- **Password:** `password123`
- **Score:** 180 PTS (completed 2 quizzes)

### Option 2: Register New User
1. Go to http://localhost:5173/register
2. Create any username/email/password
3. Auto-logged in after registration

---

## 📋 What to Test

### 1. **Matches Page** (http://localhost:5173/)
   - ✅ See 3 matches (2 finished, 1 upcoming)
   - ✅ Argentina vs France & USA vs England → **"Take Quiz" button enabled**
   - ✅ Brazil vs Germany → **"Quiz Locked" (upcoming)**

### 2. **Quiz Experience** (Click "Take Quiz" on finished match)
   - ✅ See progress bar: "Question 1 of 10"
   - ✅ Select any option → instant feedback (green/red)
   - ✅ See explanation below
   - ✅ Click "Next Question" through all 10
   - ✅ Final score page shows accuracy
   - ✅ Review all answers with correct/incorrect markers

### 3. **Leaderboard** (http://localhost:5173/leaderboard)
   - ✅ Visual podium for top 3 users
   - ✅ Gold/Silver/Bronze medals
   - ✅ Full leaderboard table with rankings

### 4. **Friends** (http://localhost:5173/friends)
   - ✅ Search for "messi10" or "cr7goat"
   - ✅ Click "Add" to send friend request
   - ✅ Friend leaderboard shows only friends + you

---

## 🔌 API Endpoints (Swagger UI: http://localhost:8000/docs)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/register` | Create new account |
| POST | `/auth/login` | Get JWT token |
| GET | `/auth/me` | Current user info |
| GET | `/matches/` | List all matches |
| POST | `/quiz/attempts` | Start quiz |
| POST | `/quiz/attempts/{id}/submit` | Submit answer |
| GET | `/quiz/attempts/{id}/summary` | Quiz results |
| GET | `/leaderboard/global` | Global rankings |
| GET | `/friends/` | Your friends |
| GET | `/friends/requests/pending` | Incoming requests |
| POST | `/friends/request` | Send request |
| GET | `/friends/search` | Find users |
| POST | `/friends/accept` | Accept request |
| POST | `/friends/decline` | Decline/remove |
| GET | `/friends/leaderboard` | Friend rankings |

---

## 📊 Database Status

✅ **Seeded with 20 questions across 2 quizzes**
✅ **4 test users pre-populated**
✅ **3 world cup matches (2026)**

**Current Database:** `backend/ebk.db` (SQLite)

---

## 🎯 Key Features

- ✅ JWT Authentication (7-day expiration)
- ✅ Single-question quiz (no back navigation)
- ✅ Instant answer feedback with explanations
- ✅ Scoring system (10 pts per correct answer)
- ✅ Global leaderboard with podium
- ✅ Friend system with requests
- ✅ Cyberpunk UI with glassmorphism
- ✅ Mobile responsive design
- ✅ Dark mode theme

---

## 🔧 Configuration

### Backend `.env`
```
DATABASE_URL=sqlite:///./ebk.db
SECRET_KEY=supersecretkeychangeinproduction1234567890
ACCESS_TOKEN_EXPIRE_MINUTES=10080
BACKEND_CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]
```

### Frontend `AuthContext.jsx`
```
API_URL = 'http://localhost:8000/api/v1'
```

---

## 📝 Production Deployment

### Backend
```bash
# Set production env variables
export DATABASE_URL=postgresql://user:pass@host/ebk
export SECRET_KEY=<generate-random-key>

# Install & run
pip install -r requirements.txt
gunicorn app.main:app --workers 4
```

### Frontend
```bash
# Build static files
npm run build

# Deploy dist/ to CDN or static host
# Update API_URL to production backend
```

---

## ❓ Troubleshooting

### "Connection refused" error
- Ensure backend is running: `uvicorn app.main:app --reload`
- Check http://localhost:8000 responds

### "Module not found" error
- Run: `pip install -r requirements.txt`

### Quiz not loading
- Clear browser cache (Ctrl+Shift+Delete)
- Ensure database was seeded: `python backend/app/seed.py`

### Port already in use
- Backend: `uvicorn app.main:app --port 8001`
- Frontend: `npm run dev -- --port 5174`

---

## 📚 Documentation

- **Full Walkthrough:** `WALKTHROUGH.md`
- **Backend Code:** `backend/app/`
- **Frontend Code:** `frontend/src/`

---

**Ready to compete? Let's test your football knowledge! ⚽**
