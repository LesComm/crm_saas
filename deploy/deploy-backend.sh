#!/bin/bash
# ============================================================
# Deploiement backend SaaS CRM sur serveur Plesk
#
# Usage:
#   1. Depuis ta machine: ./deploy/push.sh
#   2. Sur le serveur:    cd /opt/saas-crm && bash deploy.sh
# ============================================================

set -euo pipefail

APP_DIR="/opt/saas-crm"
ENV_FILE="$APP_DIR/.env"

echo "=== Deploiement SaaS CRM Backend ==="

# ── 1. Installer les dependances ──────────────────────────
echo "[1/4] Installation des dependances..."
cd "$APP_DIR"
npm install --omit=dev

# ── 2. Verifier le .env ──────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
    echo "ERREUR: $ENV_FILE n'existe pas!"
    echo "Copiez .env.example vers .env et configurez les valeurs."
    exit 1
fi
echo "[2/4] Fichier .env OK"

# ── 3. Lancer les migrations ─────────────────────────────
echo "[3/4] Execution des migrations..."
node migrations/migrate.js
echo "  Migrations OK"

# ── 4. Demarrer/redemarrer avec PM2 ──────────────────────
echo "[4/4] Demarrage de l'application..."

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
