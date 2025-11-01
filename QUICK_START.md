# 🚀 Guide de démarrage rapide

## Option 1 : Sans Docker (Recommandé pour développement)

### 1. Installer MongoDB

**Windows :**
```bash
# Télécharger depuis https://www.mongodb.com/try/download/community
# Ou avec Chocolatey :
choco install mongodb
```

**Mac :**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux :**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

### 2. Configurer l'environnement

```bash
# Copier le fichier d'environnement
cp .env.example .env
```

### 3. Installer et démarrer

```bash
# Installer les dépendances
npm install

# Démarrer en mode développement
npm run start:dev
```

### 4. Tester l'API

L'application démarre sur http://localhost:3000

📘 **Swagger** : http://localhost:3000/docs

### 5. (Optionnel) Populer la base avec des données de test

```bash
npm run seed
```

---

## Option 2 : Avec Docker

### 1. Démarrer avec Docker Compose

```bash
# Construire et démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

### 2. Arrêter

```bash
docker-compose down
```

---

## Tester l'API

### Test de base

```bash
# Vérifier que l'API répond (sans API Key - devrait retourner 401)
curl http://localhost:3000/transfers

# Avec API Key (devrait fonctionner)
curl -H "x-api-key: DEXCHANGE-API-KEY-2025-TEST-SECURE" http://localhost:3000/transfers
```

### Créer un transfert

```bash
curl -X POST http://localhost:3000/transfers \
  -H "Content-Type: application/json" \
  -H "x-api-key: DEXCHANGE-API-KEY-2025-TEST-SECURE" \
  -d '{
    "amount": 12500,
    "currency": "XOF",
    "channel": "WAVE",
    "recipient": {
      "phone": "+221770000000",
      "name": "Jane Doe"
    },
    "metadata": {
      "orderId": "ABC-123"
    }
  }'
```

---

## Tests

```bash
# Lancer tous les tests
npm test

# Tests en mode watch
npm run test:watch

# Couverture de code
npm run test:cov
```

---

## Commandes utiles

```bash
# Build production
npm run build

# Démarrer en production
npm run start:prod

# Linter
npm run lint

# Formatter
npm run format
```

---

## Troubleshooting

### MongoDB ne démarre pas

**Windows :**
```bash
# Vérifier si MongoDB est en cours d'exécution
net start MongoDB

# Ou démarrer manuellement
mongod --dbpath C:\data\db
```

**Mac/Linux :**
```bash
# Vérifier le statut
sudo systemctl status mongodb

# Redémarrer
sudo systemctl restart mongodb
```

### Port 3000 déjà utilisé

Modifier le port dans `.env` :
```
PORT=3001
```

### Erreur de connexion MongoDB

Vérifier l'URI dans `.env` :
```
MONGODB_URI=mongodb://localhost:27017/dexchange-transfers
```

---

## 🎯 Prochaines étapes

1. Ouvrir Swagger : http://localhost:3000/docs
2. Tester les endpoints avec l'API Key : `DEXCHANGE-API-KEY-2025-TEST-SECURE`
3. Consulter le README.md pour les détails complets
