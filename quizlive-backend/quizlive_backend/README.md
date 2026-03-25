# QuizLive Backend

Real-time multiplayer quiz platform — Django + Channels + Redis.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Django 4.2, Django REST Framework |
| WebSockets | Django Channels 4, channels-redis |
| Auth | JWT (djangorestframework-simplejwt) |
| Database | PostgreSQL (prod) / SQLite (dev) |
| Cache/Pub-Sub | Redis (Upstash free tier in prod) |
| ASGI Server | Uvicorn |
| Deployment | Render.com free tier |

## Quick Start (Docker — recommended)

```bash
# 1. Clone and enter directory
git clone <repo> && cd quizlive_backend

# 2. Start services
docker compose up --build

# 3. Backend running at http://localhost:8000
# API docs: http://localhost:8000/api/docs/
```

## Manual Setup

```bash
# Python 3.11+ required
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Copy and configure env
cp .env.example .env
# Edit .env with your values

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server (requires Redis running)
python manage.py runserver
```

## API Endpoints

### Auth (`/api/v1/auth/`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register/` | Register teacher or student |
| POST | `/login/` | Login → access + refresh JWT |
| POST | `/token/refresh/` | Refresh access token |
| GET/PUT | `/me/` | Current user profile |

### Quizzes (`/api/v1/quizzes/`) — Teacher only
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/` | List/create quizzes |
| GET/PUT/DELETE | `/{id}/` | Quiz detail |
| GET/POST | `/{id}/questions/` | List/add questions |
| GET/PUT/DELETE | `/{id}/questions/{qid}/` | Question detail |

### Sessions (`/api/v1/sessions/`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create game session (teacher) |
| GET | `/{code}/` | Session detail |
| GET | `/{code}/status/` | Lightweight status check |
| POST | `/{code}/end/` | End session (teacher) |
| GET | `/{code}/players/` | List players |

### Analytics (`/api/v1/analytics/`) — Teacher only
| Method | Path | Description |
|--------|------|-------------|
| GET | `/sessions/{code}/` | Session summary |
| GET | `/sessions/{code}/questions/` | Per-question stats |
| GET | `/sessions/{code}/players/` | Player results |
| GET | `/sessions/{code}/export/` | Download CSV |

## WebSocket Protocol

Connect: `ws://host/ws/game/{CODE}/?token=<JWT>`

### Client → Server Events

```json
// Join game lobby
{"type": "player.join", "payload": {"nickname": "Alice"}}

// Submit answer
{"type": "answer.submit", "payload": {"question_id": "uuid", "option_id": "uuid"}}

// [Host] Start game
{"type": "game.start", "payload": {}}

// [Host] End game early
{"type": "game.end", "payload": {}}
```

### Server → Client Events

| Event | When | Payload |
|-------|------|---------|
| `player.joined` | After joining | `player_id, nickname, is_host` |
| `lobby.updated` | Player join/leave | `players[]` |
| `game.started` | Game begins | `game_code, message` |
| `question.new` | Each question | `question{}, deadline_ts, index, total` |
| `answer.ack` | After answering | `is_correct, points_awarded, total_score, rank` |
| `leaderboard.update` | Each answer | `leaderboard[{rank,nickname,score}]` |
| `question.ended` | Time up | `correct_option_id, stats, leaderboard` |
| `game.ended` | Final | `final_leaderboard[]` |
| `error` | Any error | `message` |

## Scoring Formula

```
score = base_points × difficulty_multiplier × speed_bonus

difficulty_multiplier: easy=1.0, medium=1.5, hard=2.0
speed_bonus: ≤3s → 1.20, ≤half_limit → 1.10, else → 1.00
```

## Running Tests

```bash
pip install pytest pytest-django pytest-asyncio factory-boy
pytest tests/ -v
```

## Deployment (Render.com)

1. Connect GitHub repo to Render
2. Set environment variables:
   - `DJANGO_SETTINGS_MODULE=config.settings.production`
   - `DJANGO_SECRET_KEY=<generate with python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())">`
   - `DATABASE_URL=<Supabase PostgreSQL URL>`
   - `REDIS_URL=<Upstash Redis URL>`
   - `ALLOWED_HOSTS=your-app.onrender.com`
   - `CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app`
3. Build command: `pip install -r requirements.txt && python manage.py migrate`
4. Start command: `uvicorn config.asgi:application --host 0.0.0.0 --port $PORT`

## Architecture Notes

- **Redis is the truth during a game**: All hot state (current question, answers, leaderboard) lives in Redis while the game is active
- **PostgreSQL is the record**: Final scores flushed to DB at game end
- **Server-side timers**: Only the server knows deadlines; clients cannot manipulate timing
- **HSETNX idempotency**: Prevents double-submitting answers atomically
- **JWT in WebSocket**: Token passed as query param `?token=<JWT>`
