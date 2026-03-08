#!/bin/bash
# ============================================================
# Deploiement SaaS CRM sur serveur Plesk
#
# Usage:
#   1. Depuis ta machine: ./deploy/push.sh
#   2. Sur le serveur:    cd /opt/saas-crm && bash deploy.sh
# ============================================================

set -euo pipefail

APP_DIR="/opt/saas-crm"
ENV_FILE="$APP_DIR/server/.env"

echo "=== Deploiement SaaS CRM ==="

# ── 1. Installer les dependances backend ───────────────────
echo "[1/5] Installation des dependances backend..."
cd "$APP_DIR/server"
npm install --omit=dev --silent

# ── 2. Build client (si pas de dist/) ─────────────────────
if [ -d "$APP_DIR/client/dist" ]; then
    echo "[2/5] Client pre-built OK"
else
    echo "[2/5] Build client..."
    cd "$APP_DIR/client"
    npm install --silent
    npm run build
fi

# ── 3. Verifier le .env ───────────────────────────────────
cd "$APP_DIR/server"
if [ ! -f "$ENV_FILE" ]; then
    echo "ERREUR: $ENV_FILE n'existe pas!"
    echo "Copiez .env.example vers .env et configurez les valeurs."
    exit 1
fi
echo "[3/5] Fichier .env OK"

# ── 4. Lancer les migrations ──────────────────────────────
echo "[4/5] Execution des migrations..."
node migrations/migrate.js
echo "  Migrations OK"

# ── 5. Demarrer/redemarrer avec PM2 ──────────────────────
echo "[5/5] Demarrage de l'application..."

if pm2 describe saas-crm > /dev/null 2>&1; then
    pm2 restart saas-crm
    echo "  Application redemarree"
else
    pm2 start src/index.js \
        --name saas-crm \
        --node-args="--env-file=.env" \
        --max-memory-restart 512M \
        --log-date-format "YYYY-MM-DD HH:mm:ss"
    pm2 save
    echo "  Application demarree"
fi

echo ""
echo "=== Deploiement termine ==="
echo ""
echo "Verification:"
echo "  pm2 status"
echo "  pm2 logs saas-crm --lines 20"
echo "  curl http://localhost:3000/health"
echo ""
