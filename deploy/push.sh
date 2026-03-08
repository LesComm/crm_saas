#!/bin/bash
# ============================================================
# Pousser le backend + client vers le serveur Plesk
# Usage: bash deploy/push.sh
# ============================================================

set -euo pipefail

SERVER="root@lescommunicateurs.ca"
APP_DIR="/opt/saas-crm"

echo "=== Push vers $SERVER ==="

# 1. Build client
echo "[1/4] Build client..."
cd client && npm install --silent && npm run build && cd ..

# 2. Synchroniser server/
echo "[2/4] Sync server..."
rsync -avz --delete \
    --exclude node_modules \
    --exclude .env \
    --exclude '*.log' \
    server/ \
    "$SERVER:$APP_DIR/server/"

# 3. Synchroniser client/dist/
echo "[3/4] Sync client/dist..."
rsync -avz --delete \
    client/dist/ \
    "$SERVER:$APP_DIR/client/dist/"

# 4. Copier le script de deploiement
echo "[4/4] Copie deploy script..."
scp deploy/deploy-backend.sh "$SERVER:$APP_DIR/deploy.sh"

echo ""
echo "Fichiers synchronises. Pour deployer:"
echo "  ssh $SERVER 'cd $APP_DIR && bash deploy.sh'"
echo ""
