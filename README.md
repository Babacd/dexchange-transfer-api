# 🚀 DEXCHANGE Transfer API - Test Backend NestJS

API de gestion de transferts avec authentification par API Key, règles métier, simulation de traitement, pagination cursor-based et logs d'audit.

## 📋 Table des matières

- [Technologies](#technologies)
- [Installation](#installation)
- [Configuration](#configuration)
- [Démarrage](#démarrage)
- [Documentation API](#documentation-api)
- [Routes & Exemples](#routes--exemples)
- [Flow de traitement](#flow-de-traitement)
- [Architecture](#architecture)
- [Tests](#tests)
- [Choix techniques](#choix-techniques)
- [Améliorations futures](#améliorations-futures)

---

## 🛠 Technologies

- **NestJS 10** - Framework Node.js progressif
- **TypeScript** - Typage statique
- **MongoDB** avec **Mongoose** - Base de données NoSQL
- **Swagger** - Documentation interactive de l'API
- **Jest** - Tests unitaires
- **Class-validator & Class-transformer** - Validation des DTOs

---

## 📦 Installation

```bash
# Installer les dépendances
npm install
```

---

## ⚙️ Configuration

1. Copier le fichier d'exemple d'environnement :

```bash
cp .env.example .env
```

2. Configurer les variables dans `.env` :

```env
# Application
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/dexchange-transfers

# API Key
API_KEY=DEXCHANGE-API-KEY-2025-TEST-SECURE
```

### Prérequis MongoDB

L'application nécessite MongoDB. Options :

**Option 1 : MongoDB local**
```bash
# Installer MongoDB localement
# Windows : https://www.mongodb.com/try/download/community
# Mac : brew install mongodb-community
# Linux : apt-get install mongodb

# Démarrer MongoDB
mongod
```

**Option 2 : MongoDB Atlas (Cloud)**
- Créer un compte sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Créer un cluster gratuit
- Récupérer l'URI de connexion
- Mettre à jour `MONGODB_URI` dans `.env`

**Option 3 : Docker**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

---

## 🚀 Démarrage

```bash
# Mode développement (avec hot-reload)
npm run start:dev

# Mode production
npm run build
npm run start:prod

# Mode debug
npm run start:debug
```

L'application démarre sur `http://localhost:3000`

---

## 📘 Documentation API

La documentation Swagger est accessible sur :

```
http://localhost:3000/docs
```

🔑 **Important** : Tous les endpoints nécessitent le header `x-api-key`

---

## 🛣 Routes & Exemples

### Authentication

Tous les endpoints requièrent le header :
```
x-api-key: DEXCHANGE-API-KEY-2025-TEST-SECURE
```

### 1️⃣ Créer un transfert

**POST** `/transfers`

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

**Réponse (201)** :
```json
{
  "_id": "654abc123def456789012345",
  "reference": "TRF-20250101-A3B2",
  "amount": 12500,
  "currency": "XOF",
  "channel": "WAVE",
  "recipient": {
    "phone": "+221770000000",
    "name": "Jane Doe"
  },
  "metadata": {
    "orderId": "ABC-123"
  },
  "fees": 100,
  "total": 12600,
  "status": "PENDING",
  "createdAt": "2025-01-01T12:00:00.000Z",
  "updatedAt": "2025-01-01T12:00:00.000Z"
}
```

**Règles métier appliquées** :
- Génération automatique de `reference` : `TRF-YYYYMMDD-XXXX`
- Calcul des frais : **0.8%** du montant (arrondi au supérieur)
- Frais minimum : **100 XOF**
- Frais maximum : **1500 XOF**
- Statut initial : **PENDING**

---

### 2️⃣ Lister les transferts (avec pagination)

**GET** `/transfers?limit=10&status=PENDING&channel=WAVE`

```bash
curl -X GET "http://localhost:3000/transfers?limit=10&status=PENDING" \
  -H "x-api-key: DEXCHANGE-API-KEY-2025-TEST-SECURE"
```

**Filtres disponibles** :
- `status` : PENDING, PROCESSING, SUCCESS, FAILED, CANCELED
- `channel` : WAVE, OM
- `minAmount` : Montant minimum
- `maxAmount` : Montant maximum
- `q` : Recherche dans reference ou nom du destinataire
- `limit` : Nombre de résultats (max 50, défaut 20)
- `cursor` : Cursor pour la page suivante

**Réponse (200)** :
```json
{
  "items": [
    {
      "_id": "654abc123def456789012345",
      "reference": "TRF-20250101-A3B2",
      "amount": 12500,
      "status": "PENDING",
      "channel": "WAVE",
      ...
    }
  ],
  "nextCursor": "654abc123def456789012346"
}
```

**Pour la page suivante** :
```bash
curl -X GET "http://localhost:3000/transfers?limit=10&cursor=654abc123def456789012346" \
  -H "x-api-key: DEXCHANGE-API-KEY-2025-TEST-SECURE"
```

---

### 3️⃣ Récupérer un transfert

**GET** `/transfers/:id`

```bash
curl -X GET http://localhost:3000/transfers/654abc123def456789012345 \
  -H "x-api-key: DEXCHANGE-API-KEY-2025-TEST-SECURE"
```

**Réponse (200)** : Objet transfert complet

**Erreurs** :
- **404** : Transfert introuvable

---

### 4️⃣ Traiter un transfert (simulation)

**POST** `/transfers/:id/process`

```bash
curl -X POST http://localhost:3000/transfers/654abc123def456789012345/process \
  -H "x-api-key: DEXCHANGE-API-KEY-2025-TEST-SECURE"
```

**Comportement** :
1. Vérifie que le statut n'est pas final (SUCCESS, FAILED, CANCELED)
2. Passe le statut à **PROCESSING**
3. Simule le traitement (délai 2-3 secondes)
4. **70% de réussite** → statut **SUCCESS** + `provider_ref`
5. **30% d'échec** → statut **FAILED** + `error_code`

**Réponse SUCCESS (200)** :
```json
{
  "_id": "654abc123def456789012345",
  "reference": "TRF-20250101-A3B2",
  "status": "SUCCESS",
  "provider_ref": "PROV-1704110400000-ABC123",
  ...
}
```

**Réponse FAILED (200)** :
```json
{
  "_id": "654abc123def456789012345",
  "reference": "TRF-20250101-A3B2",
  "status": "FAILED",
  "error_code": "NETWORK_ERROR",
  ...
}
```

**Erreurs** :
- **404** : Transfert introuvable
- **409** : Impossible de traiter un transfert avec statut final

---

### 5️⃣ Annuler un transfert

**POST** `/transfers/:id/cancel`

```bash
curl -X POST http://localhost:3000/transfers/654abc123def456789012345/cancel \
  -H "x-api-key: DEXCHANGE-API-KEY-2025-TEST-SECURE"
```

**Règle** : Seuls les transferts avec statut **PENDING** peuvent être annulés.

**Réponse (200)** :
```json
{
  "_id": "654abc123def456789012345",
  "reference": "TRF-20250101-A3B2",
  "status": "CANCELED",
  ...
}
```

**Erreurs** :
- **404** : Transfert introuvable
- **409** : Seuls les transferts PENDING peuvent être annulés

---

## 🔄 Flow de traitement

### Diagramme des états

```
┌─────────┐
│ PENDING │ ◄── Création du transfert
└────┬────┘
     │
     ├────► POST /cancel ────► ┌──────────┐
     │                          │ CANCELED │
     │                          └──────────┘
     │
     ├────► POST /process
     │
     ▼
┌────────────┐
│ PROCESSING │ ◄── Traitement en cours
└─────┬──────┘
      │
      ├────► 70% ────► ┌─────────┐
      │                │ SUCCESS │ (statut final)
      │                └─────────┘
      │
      └────► 30% ────► ┌────────┐
                       │ FAILED │ (statut final)
                       └────────┘
```

### États finaux

Les transferts avec ces statuts ne peuvent plus être modifiés :
- ✅ **SUCCESS**
- ❌ **FAILED**
- 🚫 **CANCELED**

---

## 🏗 Architecture

```
src/
├── common/
│   └── guards/
│       └── api-key.guard.ts          # Guard d'authentification API Key
├── transfers/
│   ├── dto/
│   │   ├── create-transfer.dto.ts    # DTO de création
│   │   └── query-transfer.dto.ts     # DTO de filtres/pagination
│   ├── entities/
│   │   └── transfer.entity.ts        # Schéma Mongoose
│   ├── transfers.controller.ts       # Routes HTTP
│   ├── transfers.service.ts          # Logique métier
│   ├── transfers.repository.ts       # Accès données
│   ├── provider.simulator.ts         # Simulation provider
│   ├── transfers.module.ts           # Module NestJS
│   └── transfers.service.spec.ts     # Tests unitaires
├── audit/
│   ├── entities/
│   │   └── audit-log.entity.ts       # Schéma logs d'audit
│   ├── audit.service.ts              # Service d'audit
│   └── audit.module.ts               # Module NestJS
├── app.module.ts                     # Module racine
└── main.ts                           # Point d'entrée
```

### Responsabilités

- **Controller** : Gestion des requêtes HTTP, validation, documentation Swagger
- **Service** : Logique métier (calcul frais, transitions d'état, orchestration)
- **Repository** : Accès base de données, requêtes, pagination
- **Guard** : Authentification API Key
- **Audit Service** : Traçabilité des actions
- **Provider Simulator** : Simulation du traitement externe

---

## 🧪 Tests

```bash
# Lancer tous les tests
npm test

# Tests en mode watch
npm run test:watch

# Couverture de code
npm run test:cov
```

### Tests implémentés

✅ **Calcul des frais** (`transfers.service.spec.ts`)
- Calcul à 0.8% arrondi au supérieur
- Application du minimum (100)
- Application du maximum (1500)

✅ **Transitions d'état** (`transfers.service.spec.ts`)
- PENDING → PROCESSING → SUCCESS
- PENDING → PROCESSING → FAILED
- Vérification qu'un statut final ne peut pas être traité
- PENDING → CANCELED
- Vérification qu'un statut non-PENDING ne peut pas être annulé

---

## 🎯 Choix techniques

### 1. **MongoDB avec Mongoose**
- **Pourquoi** : Flexibilité du schéma NoSQL pour les métadonnées dynamiques
- **Avantage** : Pas de migrations complexes, adapté aux évolutions rapides
- **Index** : Optimisation des recherches sur `reference`, `status`, `channel`, `amount`

### 2. **Pagination Cursor-Based**
- **Pourquoi** : Plus performant que l'offset pour grandes collections
- **Avantage** : Résultats cohérents même avec ajouts/suppressions
- **Implémentation** : Utilisation de `_id` MongoDB comme cursor

### 3. **Architecture modulaire NestJS**
- **Séparation des responsabilités** : Controller / Service / Repository
- **Testabilité** : Injection de dépendances facilitant les mocks
- **Réutilisabilité** : AuditModule indépendant et réutilisable

### 4. **Guard API Key**
- **Simplicité** : Solution adaptée au scope du test
- **Sécurité basique** : Distinction 401 (absent) vs 403 (invalide)
- **Évolutif** : Facilement remplaçable par JWT/OAuth2

### 5. **Validation avec class-validator**
- **Validation automatique** : Déclarative sur les DTOs
- **Erreurs claires** : Messages d'erreur explicites
- **Type-safe** : Cohérence avec TypeScript

### 6. **Audit logs séparé**
- **Traçabilité** : Chaque action importante est loggée
- **Non-bloquant** : Les erreurs d'audit n'impactent pas le flux principal
- **Historique** : Conservation de l'historique complet par transfert

---

## 🚀 Améliorations futures

### Avec plus de temps, j'ajouterais :

#### 1. **Sécurité renforcée**
- 🔐 Authentification JWT avec refresh tokens
- 🔒 Rate limiting (contre le spam/DDoS)
- 🛡 Hashing des API keys en DB
- 🔑 Gestion multi-clés avec permissions granulaires
- 📝 CORS configuré selon les environnements

#### 2. **Base de données & Performance**
- 🐘 Support PostgreSQL avec TypeORM en option
- ⚡ Redis pour le cache des transferts fréquents
- 📊 Indexes composés pour les recherches complexes
- 🔄 Transactions pour garantir la cohérence ACID

#### 3. **Fonctionnalités métier**
- 💰 Support multi-devises avec taux de change
- 🔔 Webhooks pour notifier les systèmes externes
- 📱 Notifications SMS/Email au destinataire
- 🔁 Système de retry automatique pour les FAILED
- 📅 Scheduled jobs pour nettoyer les vieux transferts
- 💳 Intégration avec vrais providers (Wave, Orange Money)

#### 4. **Monitoring & Observabilité**
- 📈 Intégration Prometheus + Grafana
- 🔍 Logging structuré (Winston/Pino)
- 🚨 Alerting sur taux d'échec élevé
- 📊 Dashboards temps réel
- 🔬 Distributed tracing (Jaeger/Zipkin)

#### 5. **Tests & Qualité**
- 🧪 Tests E2E complets
- 🎭 Tests d'intégration avec DB
- 📸 Snapshot testing
- 🔄 Tests de charge (K6/Artillery)
- 🤖 CI/CD (GitHub Actions)

#### 6. **DevOps & Déploiement**
- 🐳 Docker Compose complet (app + MongoDB + Redis)
- ☸️ Kubernetes manifests
- 🌍 Support multi-environnements (dev/staging/prod)
- 📦 Versioning de l'API (v1, v2...)
- 🔄 Blue/Green deployment

#### 7. **Documentation**
- 📚 OpenAPI 3.1 avec exemples enrichis
- 🎓 Postman Collection export
- 📖 Guide d'intégration pour développeurs
- 🔧 Swagger UI personnalisé

#### 8. **Provider System**
- 🔌 Adapters séparés par provider (Wave, OM, etc.)
- ⚖️ Load balancing entre providers
- 🔄 Fallback automatique si provider down
- 📊 Monitoring des performances par provider

---

## 📊 Structure des données

### Transfer
```typescript
{
  _id: ObjectId,
  reference: string,           // TRF-20250101-XXXX
  amount: number,              // Montant en XOF
  currency: string,            // XOF, EUR, etc.
  channel: 'WAVE' | 'OM',      // Canal de transfert
  recipient: {
    phone: string,
    name: string
  },
  metadata: object,            // Données additionnelles
  fees: number,                // Calculé automatiquement
  total: number,               // amount + fees
  status: TransferStatus,      // État du transfert
  provider_ref?: string,       // Référence provider si SUCCESS
  error_code?: string,         // Code erreur si FAILED
  createdAt: Date,
  updatedAt: Date
}
```

### AuditLog
```typescript
{
  _id: ObjectId,
  action: AuditAction,         // Type d'action
  transferId: string,          // Référence au transfert
  transferReference: string,   // Référence lisible
  metadata: object,            // Données contextuelles
  createdAt: Date
}
```

---

## 🤝 Contribution

Projet de test - Pas de contributions externes

---

## 📝 Licence

MIT

---

## 👤 Auteur

Test Backend DEXCHANGE - 2025

---

## 📞 Support

Pour toute question, consulter la documentation Swagger : `http://localhost:3000/docs`
