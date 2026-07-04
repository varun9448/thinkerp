#!/bin/bash
set -e

cd /var/www/html

echo "=== ERPGo Entrypoint ==="

# Build .env from Docker environment variables if no .env file exists
if [ ! -f .env ]; then
    echo "Writing .env from environment variables..."
    cat > .env <<EOF
APP_NAME=${APP_NAME:-ERPGo}
APP_ENV=${APP_ENV:-production}
APP_KEY=${APP_KEY:-}
APP_DEBUG=${APP_DEBUG:-false}
APP_URL=${APP_URL:-http://localhost}

LOG_CHANNEL=${LOG_CHANNEL:-stack}
LOG_LEVEL=${LOG_LEVEL:-error}

DB_CONNECTION=${DB_CONNECTION:-mysql}
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_DATABASE=${DB_DATABASE:-erpgo}
DB_USERNAME=${DB_USERNAME:-root}
DB_PASSWORD=${DB_PASSWORD:-}

BROADCAST_DRIVER=${BROADCAST_DRIVER:-log}
CACHE_DRIVER=${CACHE_DRIVER:-file}
FILESYSTEM_DISK=${FILESYSTEM_DISK:-local}
QUEUE_CONNECTION=${QUEUE_CONNECTION:-sync}
SESSION_DRIVER=${SESSION_DRIVER:-file}
SESSION_LIFETIME=${SESSION_LIFETIME:-120}

MAIL_MAILER=${MAIL_MAILER:-smtp}
MAIL_HOST=${MAIL_HOST:-mailpit}
MAIL_PORT=${MAIL_PORT:-1025}
MAIL_USERNAME=${MAIL_USERNAME:-null}
MAIL_PASSWORD=${MAIL_PASSWORD:-null}
MAIL_ENCRYPTION=${MAIL_ENCRYPTION:-null}
MAIL_FROM_ADDRESS=${MAIL_FROM_ADDRESS:-hello@example.com}
MAIL_FROM_NAME=${APP_NAME:-ERPGo}

PUSHER_APP_ID=${PUSHER_APP_ID:-}
PUSHER_APP_KEY=${PUSHER_APP_KEY:-}
PUSHER_APP_SECRET=${PUSHER_APP_SECRET:-}
PUSHER_HOST=${PUSHER_HOST:-}
PUSHER_PORT=${PUSHER_PORT:-443}
PUSHER_SCHEME=${PUSHER_SCHEME:-https}
PUSHER_APP_CLUSTER=${PUSHER_APP_CLUSTER:-mt1}

VITE_APP_NAME=${APP_NAME:-ERPGo}
VITE_PUSHER_APP_KEY=${PUSHER_APP_KEY:-}
VITE_PUSHER_HOST=${PUSHER_HOST:-}
VITE_PUSHER_PORT=${PUSHER_PORT:-443}
VITE_PUSHER_SCHEME=${PUSHER_SCHEME:-https}
VITE_PUSHER_APP_CLUSTER=${PUSHER_APP_CLUSTER:-mt1}
EOF
fi

# Generate app key if missing
if grep -q "APP_KEY=$" .env || grep -q "APP_KEY=base64:" .env; then
    if grep -q "APP_KEY=$" .env; then
        echo "Generating APP_KEY..."
        php artisan key:generate --force
    fi
else
    echo "APP_KEY already set."
fi

# Fix permissions before artisan commands
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Run migrations
echo "Running migrations..."
php artisan migrate --force --no-interaction 2>&1 || echo "Migration warning (may be expected on first run)"

# Cache for production
echo "Caching config/routes/views..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Create storage symlink
php artisan storage:link 2>/dev/null || true

echo "=== Starting services ==="
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
