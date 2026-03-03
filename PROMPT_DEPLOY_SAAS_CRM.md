# Prompt pour Claude Navigateur - Deploiement SaaS CRM sur VPS Plesk

Copier-coller tout le contenu ci-dessous dans Claude navigateur.

---

Tu vas m'aider a deployer le systeme complet "SaaS Conversational CRM" sur mon serveur VPS Plesk. C'est une application multi-tenant Node.js + PostgreSQL + Ollama (IA locale) + frontend React.

Je vais executer les commandes dans le terminal SSH de Plesk. Guide-moi etape par etape. Attends ma reponse/confirmation apres chaque etape avant de passer a la suivante.

## Ce qu'on deploie

- **Backend Node.js** (Express + Socket.io) - API REST + WebSocket
- **PostgreSQL 16** - Base de donnees multi-tenant
- **Ollama** - IA locale (Llama 3 8B Instruct) pour le chat conversationnel
- **Frontend React** (Vite + Tailwind) - Interface chat
- **PM2** - Gestionnaire de processus Node.js
- **Nginx** - Reverse proxy via Plesk (SSL automatique)
- **Sauvegardes automatiques** - PostgreSQL + code

## Architecture cible

```
Internet
   |
   v
Plesk (lescommunicateurs.ca)
├── crm-api.lescommunicateurs.ca → Nginx → PM2 (port 3000) → Backend
├── crm.lescommunicateurs.ca → Nginx → dist/ → Frontend React
├── PostgreSQL 16 (local, port 5432)
└── Ollama (local, port 11434) → Llama 3 8B

GitHub (LesComm/crm_saas) ← Source de verite
```

## Informations serveur

- **Serveur**: lescommunicateurs.ca
- **OS**: Linux (Plesk)
- **Specs**: 6 coeurs / 64 Go RAM / 1 To disque
- **Acces**: SSH root via Plesk
- **Repo GitHub**: https://github.com/LesComm/crm_saas (prive, organisation LesComm)
- **Services existants**: n8n (https://n8n.lescommunicateurs.ca), perfex-crm-server (Docker, port 3002)

## Ce qu'on doit accomplir

1. Installer les prerequis (PostgreSQL 16, Node.js 20, PM2, Ollama)
2. Cloner le repo GitHub
3. Configurer le .env de production
4. Lancer les migrations PostgreSQL
5. Telecharger le modele Ollama (Llama 3 8B)
6. Demarrer le backend avec PM2
7. Builder le frontend React
8. Configurer les sous-domaines Plesk + Nginx + SSL
9. Mettre en place les sauvegardes automatiques
10. Tester tout le systeme
11. Configurer le deploiement automatique via GitHub

---

## PARTIE A: Installation des prerequis

### Etape 1: Verifier l'etat du systeme
```bash
# Verifier l'OS et les ressources
cat /etc/os-release
free -h
df -h
nproc

# Verifier ce qui est deja installe
node --version 2>/dev/null
psql --version 2>/dev/null
ollama --version 2>/dev/null
pm2 --version 2>/dev/null
```

Montre-moi le resultat pour savoir ce qu'il faut installer.

### Etape 2: Installer PostgreSQL 16
```bash
# Si PostgreSQL n'est PAS deja installe:
apt-get update -qq
apt-get install -y gnupg2 lsb-release
echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    | gpg --dearmor -o /etc/apt/trusted.gpg.d/pgdg.gpg
apt-get update -qq
apt-get install -y postgresql-16 postgresql-client-16

# Demarrer et activer le service
systemctl enable postgresql
systemctl start postgresql
systemctl status postgresql
```

Si PostgreSQL est deja installe, verifier la version et passer a l'etape suivante.

### Etape 3: Creer la base de donnees et l'utilisateur
```bash
sudo -u postgres psql << 'SQL'
-- Creer l'utilisateur
CREATE ROLE saas_prod WITH LOGIN PASSWORD 'DEMANDE_MOI_LE_MOT_DE_PASSE';

-- Creer la base
CREATE DATABASE saas_crm OWNER saas_prod;

-- Permissions
\c saas_crm
GRANT ALL PRIVILEGES ON DATABASE saas_crm TO saas_prod;
GRANT ALL ON SCHEMA public TO saas_prod;
GRANT CREATE ON SCHEMA public TO saas_prod;

-- Verifier
\du saas_prod
\l saas_crm
SQL
```

**IMPORTANT**: Demande-moi quel mot de passe utiliser pour `saas_prod` avant d'executer cette etape.

### Etape 4: Installer Node.js 20
```bash
# Si Node.js n'est PAS deja installe (ou version < 20):
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verifier
node --version
npm --version

# Installer PM2 globalement
npm install -g pm2
pm2 startup systemd -u root --hp /root
```

### Etape 5: Installer Ollama
```bash
# Installer Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Demarrer comme service
systemctl enable ollama
systemctl start ollama

# Attendre qu'il soit pret (max 60 secondes)
echo "Attente d'Ollama..."
for i in $(seq 1 30); do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "Ollama est pret!"
        break
    fi
    sleep 2
done

# Telecharger le modele (5-10 minutes selon la connexion)
echo "Telechargement du modele Llama 3 8B (~4.7 Go)..."
ollama pull llama3:8b-instruct-q4_K_M

# Verifier
ollama list
curl http://localhost:11434/api/tags
```

**Note**: Le telechargement du modele peut prendre 5-10 minutes. C'est normal.

---

## PARTIE B: Deploiement du code

### Etape 6: Configurer l'acces GitHub
```bash
# Generer une cle SSH pour le serveur
ssh-keygen -t ed25519 -C "plesk@lescommunicateurs.ca" -f /root/.ssh/github_deploy -N ""

# Configurer SSH pour utiliser cette cle avec GitHub
cat >> /root/.ssh/config << 'EOF'
Host github.com
    HostName github.com
    User git
    IdentityFile /root/.ssh/github_deploy
    StrictHostKeyChecking no
EOF

# Afficher la cle publique
cat /root/.ssh/github_deploy.pub
```

**ACTION REQUISE**: Copie la cle publique affichee et ajoute-la comme Deploy Key dans GitHub:
1. Va sur https://github.com/LesComm/crm_saas/settings/keys
2. Clique "Add deploy key"
3. Titre: "Plesk Server"
4. Colle la cle publique
5. Coche "Allow write access" (pour les tags de deploiement)
6. Clique "Add key"

Confirme quand c'est fait.

### Etape 7: Cloner le repo
```bash
# Creer le repertoire de base
mkdir -p /opt/saas-crm

# Cloner
git clone git@github.com:LesComm/crm_saas.git /opt/saas-crm
cd /opt/saas-crm

# Verifier
git log --oneline -5
ls -la
```

### Etape 8: Configurer le .env de production
```bash
cd /opt/saas-crm/server

# Generer les secrets automatiquement
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo "JWT_SECRET genere: ${JWT_SECRET:0:20}..."
echo "ENCRYPTION_KEY genere: ${ENCRYPTION_KEY:0:20}..."

# Creer le fichier .env
cat > .env << EOF
# ── PostgreSQL ──────────────────────────────
DB_HOST=localhost
DB_PORT=5434
DB_USER=saas_prod
DB_PASSWORD=DXTezlKModYLtLaoAEdlahqo
DB_NAME=saas_crm

# ── JWT ─────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Encryption (cles API CRM) ──────────────
ENCRYPTION_MASTER_KEY=${ENCRYPTION_KEY}

# ── Ollama ──────────────────────────────────
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3:8b-instruct-q4_K_M

# ── ElevenLabs (TTS vocal) ──────────────────
ELEVENLABS_API_KEY=53129e782199def2b39df37f0360b827eae787e668912e58a1378dc0e49be36b
ELEVENLABS_VOICE_ID=

# ── Server ──────────────────────────────────
PORT=3000
NODE_ENV=production
EOF

# Securiser le fichier
chmod 600 .env

# Verifier (sans montrer les secrets)
grep -v PASSWORD .env | grep -v SECRET | grep -v KEY
```

**IMPORTANT**: Remplace `DEMANDE_MOI_LE_MOT_DE_PASSE` par le meme mot de passe que tu as utilise a l'etape 3 pour PostgreSQL.

### Etape 9: Installer les dependances et lancer les migrations
```bash
cd /opt/saas-crm/server

# Installer les dependances
npm install --omit=dev

# Lancer les migrations (9 fichiers SQL)
node migrations/migrate.js

# Verifier la base
sudo -u postgres psql -d saas_crm -c "\dt"
```

Les 9 tables doivent apparaitre: tenants, users, crm_credentials, tenant_ai_configs, conversations, messages, audit_log, refresh_tokens, usage_metrics, plus _migrations.

### Etape 10: Demarrer le backend avec PM2
```bash
cd /opt/saas-crm/server

# Demarrer l'application
pm2 start src/index.js \
    --name saas-crm \
    --max-memory-restart 512M \
    --log-date-format "YYYY-MM-DD HH:mm:ss"

# Sauvegarder la config PM2
pm2 save

# Verifier
pm2 status
pm2 logs saas-crm --lines 10

# Test health
curl http://localhost:3000/health
curl http://localhost:3000/api
```

Le health check doit retourner `{"success":true,"status":"healthy"}`.

### Etape 11: Builder le frontend
```bash
cd /opt/saas-crm/client

# Installer les dependances
npm install

# Builder pour la production
npm run build

# Verifier le build
ls -la dist/
```

Le dossier `dist/` doit contenir `index.html` et les assets.

---

## PARTIE C: Configuration Plesk (sous-domaines + SSL)

### Etape 12: Creer les sous-domaines dans Plesk

**Dans l'interface web Plesk** (pas en SSH):

#### 12a - Sous-domaine API backend
1. Sites web & domaines > lescommunicateurs.ca > Ajouter un sous-domaine
2. Nom: `crm-api`
3. Racine du document: `/opt/saas-crm/server/public` (on va configurer Nginx)
4. Cliquer "OK"

#### 12b - Sous-domaine frontend
1. Sites web & domaines > lescommunicateurs.ca > Ajouter un sous-domaine
2. Nom: `crm`
3. Racine du document: `/opt/saas-crm/client/dist`
4. Cliquer "OK"

Confirme quand les deux sous-domaines sont crees.

### Etape 13: Configurer SSL (Let's Encrypt)

**Dans l'interface web Plesk**:

1. Aller sur `crm-api.lescommunicateurs.ca` > Certificats SSL/TLS
2. Cliquer "Installer" pour Let's Encrypt
3. Cocher "Proteger le sous-domaine"
4. Cliquer "Obtenir"

Repeter pour `crm.lescommunicateurs.ca`.

Confirme quand les certificats SSL sont actifs.

### Etape 14: Configurer Nginx pour le backend API

**Dans Plesk**: crm-api.lescommunicateurs.ca > Parametres Apache & nginx

Decocher "Mode Proxy" si coche, puis dans **Directives nginx additionnelles**, coller:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket support (Socket.io)
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Timeouts pour les requetes IA longues (Ollama peut etre lent)
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;

    # Taille max des uploads (audio vocal)
    client_max_body_size 10m;
}
```

Cliquer "OK" pour sauvegarder.

### Etape 15: Configurer Nginx pour le frontend

**Dans Plesk**: crm.lescommunicateurs.ca > Parametres Apache & nginx

Dans **Directives nginx additionnelles**, coller:

```nginx
# Proxy API vers le backend Node.js (port 3000)
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
    client_max_body_size 10m;
}

# WebSocket (Socket.io) proxy
location /socket.io/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# SPA: toutes les autres routes redirigent vers index.html
location / {
    try_files $uri $uri/ /index.html;
}

# Cache statique (JS, CSS, images, fonts)
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

**IMPORTANT**: Le frontend a besoin du proxy `/api/` et `/socket.io/` pour communiquer avec le backend sur le meme domaine (pas de CORS).

Cliquer "OK" pour sauvegarder.

### Etape 16: Tester les sous-domaines
```bash
# Test backend via HTTPS
curl https://crm-api.lescommunicateurs.ca/health
curl https://crm-api.lescommunicateurs.ca/api

# Test frontend
curl -s https://crm.lescommunicateurs.ca | head -5
```

---

## PARTIE D: Sauvegardes automatiques

### Etape 17: Creer le script de sauvegarde
```bash
mkdir -p /opt/saas-crm/backups

cat > /opt/saas-crm/backups/backup.sh << 'SCRIPT'
#!/bin/bash
# ============================================================
# Sauvegarde automatique SaaS CRM
# - Dump PostgreSQL compresse
# - Conservation 30 jours
# ============================================================

set -euo pipefail

BACKUP_DIR="/opt/saas-crm/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="saas_crm"
DB_USER="saas_prod"
RETAIN_DAYS=30

echo "[$(date)] Debut de la sauvegarde..."

# 1. Dump PostgreSQL
echo "  Sauvegarde PostgreSQL..."
sudo -u postgres pg_dump "$DB_NAME" | gzip > "$BACKUP_DIR/db_${DATE}.sql.gz"
echo "  -> db_${DATE}.sql.gz ($(du -sh $BACKUP_DIR/db_${DATE}.sql.gz | cut -f1))"

# 2. Sauvegarde du .env (chiffre)
echo "  Sauvegarde .env..."
cp /opt/saas-crm/server/.env "$BACKUP_DIR/env_${DATE}.bak"
chmod 600 "$BACKUP_DIR/env_${DATE}.bak"

# 3. Nettoyage des anciennes sauvegardes
echo "  Nettoyage des sauvegardes > ${RETAIN_DAYS} jours..."
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +${RETAIN_DAYS} -delete
find "$BACKUP_DIR" -name "env_*.bak" -mtime +${RETAIN_DAYS} -delete

# 4. Statistiques
TOTAL=$(du -sh "$BACKUP_DIR" | cut -f1)
COUNT=$(ls "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | wc -l)
echo "  Total: ${COUNT} sauvegardes, ${TOTAL} utilise"

echo "[$(date)] Sauvegarde terminee."
SCRIPT

chmod +x /opt/saas-crm/backups/backup.sh

# Tester manuellement
bash /opt/saas-crm/backups/backup.sh

# Verifier
ls -la /opt/saas-crm/backups/
```

### Etape 18: Planifier le cron (sauvegarde quotidienne a 3h du matin)
```bash
# Ajouter le cron
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/saas-crm/backups/backup.sh >> /opt/saas-crm/backups/backup.log 2>&1") | crontab -

# Verifier
crontab -l | grep saas-crm
```

---

## PARTIE E: Deploiement depuis GitHub (mise a jour future)

### Etape 19: Creer le script de deploiement
```bash
cat > /opt/saas-crm/deploy.sh << 'SCRIPT'
#!/bin/bash
# ============================================================
# Script de deploiement SaaS CRM
# Usage: bash /opt/saas-crm/deploy.sh
# ============================================================

set -euo pipefail

APP_DIR="/opt/saas-crm"
cd "$APP_DIR"

echo "=== Deploiement SaaS CRM ==="
echo ""

# 1. Pull derniere version depuis GitHub
echo "[1/6] Pull depuis GitHub..."
git pull origin main

# 2. Installer dependances backend
echo "[2/6] Installation dependances backend..."
cd "$APP_DIR/server"
npm install --omit=dev

# 3. Lancer les migrations
echo "[3/6] Migrations PostgreSQL..."
node migrations/migrate.js

# 4. Redemarrer le backend
echo "[4/6] Redemarrage backend (PM2)..."
pm2 restart saas-crm

# 5. Builder le frontend
echo "[5/6] Build frontend React..."
cd "$APP_DIR/client"
npm install
npm run build

# 6. Verification
echo "[6/6] Verification..."
sleep 3
pm2 status saas-crm
curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/health

echo ""
echo "=== Deploiement termine ==="
echo "Backend: https://crm-api.lescommunicateurs.ca/health"
echo "Frontend: https://crm.lescommunicateurs.ca"
SCRIPT

chmod +x /opt/saas-crm/deploy.sh
```

### Etape 20: Configurer le webhook GitHub (deploiement automatique)

#### 20a - Installer le webhook listener
```bash
cat > /opt/saas-crm/webhook.sh << 'SCRIPT'
#!/bin/bash
# Mini webhook server - ecoute sur port 9000
# GitHub appelle https://crm-api.lescommunicateurs.ca/deploy-webhook

while true; do
    echo -e "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nDeploy started" | nc -l -p 9000 -q 1 > /dev/null 2>&1
    echo "[$(date)] Webhook recu - lancement du deploiement..."
    bash /opt/saas-crm/deploy.sh >> /opt/saas-crm/backups/deploy.log 2>&1
done
SCRIPT

chmod +x /opt/saas-crm/webhook.sh
```

**Alternative recommandee** (plus simple): Deploiement manuel via SSH quand tu veux mettre a jour:
```bash
ssh root@lescommunicateurs.ca 'bash /opt/saas-crm/deploy.sh'
```

Ou directement dans le terminal Plesk:
```bash
bash /opt/saas-crm/deploy.sh
```

---

## PARTIE F: Tests complets

### Etape 21: Tester le backend API
```bash
# Health check
curl https://crm-api.lescommunicateurs.ca/health

# API info
curl https://crm-api.lescommunicateurs.ca/api

# Test inscription (cree un tenant + admin)
curl -X POST https://crm-api.lescommunicateurs.ca/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lescommunicateurs.ca",
    "password": "MonMotDePasse123!",
    "firstName": "Jean-Francois",
    "lastName": "Admin",
    "tenantName": "Les Communicateurs",
    "tenantSlug": "les-communicateurs"
  }'
```

Copie le `accessToken` retourne pour les tests suivants.

### Etape 22: Tester l'authentification
```bash
# Remplacer TOKEN par le accessToken retourne ci-dessus
TOKEN="COLLE_LE_TOKEN_ICI"

# Test login
curl -X POST https://crm-api.lescommunicateurs.ca/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lescommunicateurs.ca","password":"MonMotDePasse123!"}'

# Test route protegee (credentials)
curl https://crm-api.lescommunicateurs.ca/api/credentials \
  -H "Authorization: Bearer $TOKEN"
```

### Etape 23: Tester Ollama (IA)
```bash
# Test direct Ollama
curl http://localhost:11434/api/generate \
  -d '{"model":"llama3:8b-instruct-q4_K_M","prompt":"Bonjour, dis-moi juste OK","stream":false}'
```

### Etape 24: Tester le frontend
```bash
# Ouvrir dans un navigateur
echo "Frontend: https://crm.lescommunicateurs.ca"
echo "Ouvrir dans Chrome/Firefox et tester l'inscription + chat"
```

---

## PARTIE G: Verification finale et rollback

### Checklist de verification
Tester chaque point et confirmer OK:

```
[ ] PostgreSQL 16 tourne: systemctl status postgresql
[ ] Ollama tourne: curl http://localhost:11434/api/tags
[ ] Modele Llama 3 charge: ollama list
[ ] Backend PM2 tourne: pm2 status
[ ] Health check: curl https://crm-api.lescommunicateurs.ca/health
[ ] API info: curl https://crm-api.lescommunicateurs.ca/api
[ ] Inscription: POST /api/auth/register
[ ] Login: POST /api/auth/login
[ ] Frontend accessible: https://crm.lescommunicateurs.ca
[ ] SSL valide: les deux sous-domaines en HTTPS
[ ] Backup fonctionne: bash /opt/saas-crm/backups/backup.sh
[ ] Cron configure: crontab -l | grep saas-crm
[ ] Deploy script: bash /opt/saas-crm/deploy.sh
```

### En cas de probleme

**Le backend ne demarre pas:**
```bash
pm2 logs saas-crm --lines 50
cat /opt/saas-crm/server/.env  # verifier les credentials
```

**PostgreSQL refuse la connexion:**
```bash
systemctl status postgresql
sudo -u postgres psql -c "\l"  # lister les bases
```

**Ollama ne repond pas:**
```bash
systemctl status ollama
journalctl -u ollama --lines 20
ollama list
```

**Le frontend est blank:**
```bash
ls /opt/saas-crm/client/dist/
# Rebuild si necessaire
cd /opt/saas-crm/client && npm run build
```

**Rollback complet:**
```bash
# Arreter
pm2 stop saas-crm

# Restaurer la derniere sauvegarde
LATEST=$(ls -t /opt/saas-crm/backups/db_*.sql.gz | head -1)
sudo -u postgres dropdb saas_crm
sudo -u postgres createdb -O saas_prod saas_crm
zcat "$LATEST" | sudo -u postgres psql saas_crm

# Revenir a une version precedente du code
cd /opt/saas-crm
git log --oneline -10
git checkout <COMMIT_HASH>
cd server && npm install --omit=dev
pm2 restart saas-crm
```

---

## Resume des URLs finales

| Service | URL |
|---------|-----|
| Backend API | https://crm-api.lescommunicateurs.ca |
| Health check | https://crm-api.lescommunicateurs.ca/health |
| Frontend | https://crm.lescommunicateurs.ca |
| Ollama (local) | http://localhost:11434 |
| PostgreSQL (local) | localhost:5432 |

## Resume des commandes utiles

```bash
# Etat des services
pm2 status                          # Backend
systemctl status postgresql         # Base de donnees
systemctl status ollama             # IA

# Logs
pm2 logs saas-crm --lines 50       # Logs backend
journalctl -u ollama --lines 20    # Logs Ollama

# Deployer une mise a jour
bash /opt/saas-crm/deploy.sh

# Sauvegarde manuelle
bash /opt/saas-crm/backups/backup.sh

# Restaurer une sauvegarde PostgreSQL
zcat /opt/saas-crm/backups/db_YYYYMMDD.sql.gz | sudo -u postgres psql saas_crm

# Redemarrer un service
pm2 restart saas-crm
systemctl restart postgresql
systemctl restart ollama
```

## Ports utilises

| Port | Service | Acces |
|------|---------|-------|
| 3000 | Backend Node.js | Local seulement (Nginx proxy) |
| 5432 | PostgreSQL | Local seulement |
| 11434 | Ollama | Local seulement |
| 443 | Nginx (HTTPS) | Public |
| 3002 | perfex-crm-server (existant) | Docker interne |

**Aucun conflit avec les services existants** (n8n, perfex-crm-server).
