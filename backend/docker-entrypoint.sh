#!/bin/sh
set -e

alembic upgrade head
# Only the frontend nginx container can reach this port (no published port), and nginx sets
# X-Forwarded-For to the real client IP, so trust it. This makes rate limiting per client IP.
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'
