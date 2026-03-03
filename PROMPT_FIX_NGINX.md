# Prompt pour Claude Navigateur - Fix Nginx Frontend Proxy

Copier-coller tout le contenu ci-dessous dans Claude navigateur.

---

J'ai un probleme avec mon application SaaS CRM deployee sur Plesk. Le frontend React fait des appels API vers `/api/...` mais recoit des erreurs 404 parce que le frontend est servi depuis `crm.lescommunicateurs.ca` et l'API est sur le backend Node.js (port 3000 local).

Il faut mettre a jour la configuration Nginx du sous-domaine `crm.lescommunicateurs.ca` dans Plesk pour ajouter un reverse proxy qui redirige les appels `/api/` et `/socket.io/` vers le backend.

Guide-moi etape par etape. Attends ma reponse/confirmation apres chaque etape.

## Informations

- **Serveur**: lescommunicateurs.ca (Plesk)
- **Frontend**: `crm.lescommunicateurs.ca` (React SPA, fichiers dans `/opt/saas-crm/client/dist/`)
- **Backend**: tourne sur `localhost:3000` (PM2, processus `saas-crm`)
- **Probleme**: les appels `/api/*` depuis le frontend retournent 404

## Etape 1: Verifier que le backend tourne

Execute cette commande dans le terminal SSH Plesk:

```bash
curl -s http://localhost:3000/health && echo "" && curl -s http://localhost:3000/api
```

Ca doit retourner `{"success":true,"status":"healthy"}`. Confirme le resultat.

## Etape 2: Mettre a jour Nginx dans Plesk

Dans l'interface web Plesk:

1. Va dans **Sites web & domaines** > **crm.lescommunicateurs.ca**
2. Clique sur **Parametres Apache & nginx**
3. Scrolle jusqu'a **Directives nginx additionnelles**
4. **Supprime tout** ce qui est deja la
5. **Colle le contenu suivant** a la place:

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

6. Clique **OK** pour sauvegarder

Confirme quand c'est fait.

## Etape 3: Tester

Execute ces commandes dans le terminal SSH Plesk:

```bash
# Test API via le sous-domaine frontend (doit fonctionner maintenant)
curl -s https://crm.lescommunicateurs.ca/api | python3 -m json.tool

# Test health via le frontend
curl -s https://crm.lescommunicateurs.ca/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"jf@lescommunicateurs.ca","password":"MonMotDePasse123!"}' | python3 -m json.tool

# Test que le frontend se charge toujours
curl -s https://crm.lescommunicateurs.ca | head -3
```

Les trois commandes doivent retourner des reponses valides:
1. L'info API avec `"success": true`
2. Un login reussi avec un `accessToken`
3. Le `<!DOCTYPE html>` du frontend React

## Etape 4: Tester dans le navigateur

Ouvre https://crm.lescommunicateurs.ca dans Chrome/Firefox et essaie de te connecter avec:
- **Email**: jf@lescommunicateurs.ca
- **Mot de passe**: MonMotDePasse123!

Le login doit fonctionner et t'amener a la page de chat.

## En cas de probleme

Si Nginx refuse la config:
```bash
# Verifier la syntaxe Nginx
nginx -t

# Voir les erreurs
tail -20 /var/log/nginx/error.log
```

Si l'API retourne toujours 404:
```bash
# Verifier que le backend tourne
pm2 status
curl http://localhost:3000/health
```
