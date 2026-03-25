#!/bin/bash
# QuizLive Backend — automated local setup
set -e

echo "============================================"
echo "  QuizLive Backend Setup"
echo "============================================"

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1)
echo "✓ $PYTHON_VERSION"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "→ Creating virtual environment..."
    python3 -m venv venv
fi

# Activate
source venv/bin/activate
echo "✓ Virtual environment activated"

# Install dependencies
echo "→ Installing dependencies..."
pip install -r requirements.txt -q
echo "✓ Dependencies installed"

# Create .env if not exists
if [ ! -f ".env" ]; then
    cp .env.example .env
    # Generate a random secret key
    SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
    sed -i "s/your-very-secret-key-change-this-in-production-!!/$SECRET/" .env
    echo "✓ .env created with generated secret key"
else
    echo "✓ .env already exists"
fi

# Check Redis
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null 2>&1; then
        echo "✓ Redis is running"
    else
        echo "⚠ Redis not running. Start it with: redis-server"
        echo "  (App will start but WebSockets won't work without Redis)"
    fi
else
    echo "⚠ redis-cli not found. Install Redis: brew install redis / apt install redis-server"
fi

# Run migrations
echo "→ Running database migrations..."
python manage.py migrate --run-syncdb 2>/dev/null || python manage.py migrate
echo "✓ Migrations complete"

echo ""
echo "============================================"
echo "  Setup complete! Next steps:"
echo "============================================"
echo ""
echo "  1. Create a superuser (teacher account):"
echo "     python manage.py createsuperuser"
echo ""
echo "  2. Start the server:"
echo "     daphne -b 127.0.0.1 -p 8000 config.asgi:application"
echo ""
echo "  3. Visit http://localhost:8000/admin/"
echo ""
