#!/bin/bash
# ============================================================
# Installation Ollama + PostgreSQL + Node.js sur serveur Plesk
# Serveur: lescommunicateurs.ca (Ubuntu/Debian)
#
# Usage: ssh root@lescommunicateurs.ca 'bash -s' < deploy/server-setup.sh
# ============================================================

set -euo pipefail

echo "=== SaaS CRM - Installation serveur ==="
echo ""

# ── 1. Mise a jour systeme ─────────────────────────────────
echo "[1/5] Mise a jour systeme..."
apt-get update -qq
apt-get upgrade -y -qq

# ── 2. PostgreSQL 16 ──────────────────────────────────────
echo "[2/5] Installation PostgreSQL 16..."
if command -v psql &> /dev/null; then
    echo "  PostgreSQL deja installe: $(psql --version)"
else
    apt-get install -y -qq gnupg2 lsb-release
    echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
        | gpg --dearmor -o /etc/apt/trusted.gpg.d/pgdg.gpg
    apt-get update -qq
    apt-get install -y -qq postgresql-16 postgresql-client-16
fi

# Demarrer PostgreSQL
systemctl enable postgresql
systemctl start postgresql

# Creer la base de donnees et l'utilisateur
echo "  Creation base de donnees saas_crm..."
sudo -u postgres psql -c "
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'saas_prod') THEN
        CREATE ROLE saas_prod WITH LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
    END IF;
END
\$\$;
" 2>/dev/null || true

sudo -u postgres psql -c "
SELECT 'CREATE DATABASE saas_crm OWNER saas_prod'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'saas_crm')
\gexec
" 2>/dev/null || true

sudo -u postgres psql -d saas_crm -c "GRANT ALL PRIVILEGES ON DATABASE saas_crm TO saas_prod;" 2>/dev/null || true
sudo -u postgres psql -d saas_crm -c "GRANT ALL ON SCHEMA public TO saas_prod;" 2>/dev/null || true

echo "  PostgreSQL OK"

# ── 3. Node.js 20 LTS ────────────────────────────────────
echo "[3/5] Installation Node.js 20..."
if command -v node &> /dev/null; then
    echo "  Node.js deja installe: $(node --version)"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi
echo "  Node.js $(node --version), npm $(npm --version)"

# PM2 pour la gestion des processus
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    pm2 startup systemd -u root --hp /root
fi
echo "  PM2 installe"

# ── 4. Ollama ─────────────────────────────────────────────
echo "[4/5] Installation Ollama..."
if command -v ollama &> /dev/null; then
    echo "  Ollama deja installe: $(ollama --version)"
else
    curl -fsSL https://ollama.com/install.sh | sh
fi

# Demarrer Ollama comme service
systemctl enable ollama
systemctl start ollama

# Attendre qu'Ollama soit pret
echo "  Attente demarrage Ollama..."
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "  Ollama OK"
        break
    fi
    sleep 2
done

# Telecharger le modele Llama 3 8B (peut prendre quelques minutes)
echo "  Telechargement Llama 3 8B Instruct (4-bit quantized)..."
echo "  Cela peut prendre 5-10 minutes selon la connexion..."
ollama pull llama3:8b-instruct-q4_K_M

echo "  Modele telecharge"

# ── 5. Structure de deploiement ───────────────────────────
echo "[5/5] Creation structure de deploiement..."
mkdir -p /opt/saas-crm
chown root:root /opt/saas-crm

# Firewall: ouvrir les ports necessaires
echo "  Configuration firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 3000/tcp comment "SaaS CRM Backend" 2>/dev/null || true
    # Ollama seulement local (pas d'acces externe)
    # PostgreSQL seulement local (pas d'acces externe)
fi

echo ""
echo "=== Installation terminee ==="
echo ""
echo "Prochaines etapes:"
echo "  1. Modifier le mot de passe PostgreSQL:"
echo "     sudo -u postgres psql -c \"ALTER ROLE saas_prod PASSWORD 'votre_vrai_mot_de_passe';\""
echo ""
echo "  2. Deployer l'application:"
echo "     scp -r server/ root@lescommunicateurs.ca:/opt/saas-crm/"
echo "     ssh root@lescommunicateurs.ca 'cd /opt/saas-crm && bash deploy.sh'"
echo ""
echo "  3. Verifier les services:"
echo "     systemctl status postgresql"
echo "     systemctl status ollama"
echo "     pm2 status"
echo ""
echo "  4. Tester Ollama:"
echo "     curl http://localhost:11434/api/tags"
echo ""
