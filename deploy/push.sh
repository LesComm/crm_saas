#!/bin/bash
# ============================================================
# Pousser le backend vers le serveur Plesk
# Usage: bash deploy/push.sh
# ============================================================

set -euo pipefail

SERVER="root@lescommunicateurs.ca"
APP_DIR="/opt/saas-crm"

echo "=== Push vers $SERVER ==="

# Synchroniser les fichiers server/ vers le serveur
rsync -avz --delete \
    --exclude node_modules \
    --exclude .env \
    --exclude '*.log' \
    server/ \
    "$SERVER:$APP_DIR/"

# Copier le script de deploiement
scp deploy/deploy-backend.sh "$SERVER:$APP_DIR/deploy.sh"

echo ""
echo "Fichiers synchronises. Pour deployer:"
echo "  ssh $SERVER 'cd $APP_DIR && bash deploy.sh'"
echo ""
