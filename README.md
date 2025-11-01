# DEXCHANGE Transfer API

API de gestion de transferts avec authentification par API Key, règles métier, simulation de traitement, pagination cursor-based et logs d'audit.

**Stack** : NestJS + TypeScript + MongoDB + Swagger

---

## Setup & Commandes

### Installation

```bash
# 1. Cloner le projet
git clone https://github.com/Babacd/dexchange-transfer-api.git
cd dexchange-transfer-api

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Le projet utilise MongoDB Atlas (cloud) - URI déjà configuré dans .env.example
```

### Commandes

```bash
# Démarrer en mode développement
npm run start:dev

# Build
npm run build

# Démarrer en production
npm run start:prod

# Tests unitaires
npm test

# (Bonus) Populer la base avec des données de test
npm run seed
```

**URL de l'application** : http://localhost:3000  
**Documentation Swagger** : http://localhost:3000/docs

⚠️ **Tous les endpoints nécessitent le header** : `x-api-key: clé`

---

## Routes & Exemples

### 1. Créer un transfert

**POST** `/transfers`

```bash
curl -X POST http://localhost:3000/transfers \
  -H "Content-Type: application/json" \
  -H "x-api-key: clé" \
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
  "_id": "654abc123...",
  "reference": "TRF-20250101-A3B2",
  "amount": 12500,
  "fees": 100,
  "total": 12600,
  "status": "PENDING",
  ...
}
```

**Règles métier** :
- Référence unique : `TRF-YYYYMMDD-XXXX`
- Frais : 0.8% arrondi au supérieur (min: 100, max: 1500)
- Statut initial : `PENDING`

### 2. Lister les transferts (pagination cursor-based)

**GET** `/transfers?status=PENDING&limit=10`

```bash
curl -X GET "http://localhost:3000/transfers?status=PENDING&limit=10" \
  -H "x-api-key: clé"
```

**Filtres disponibles** : `status`, `channel`, `minAmount`, `maxAmount`, `q`, `limit`, `cursor`

**Réponse** :
```json
{
  "items": [...],
  "nextCursor": "654abc123..."
}
```

### 3. Récupérer un transfert

**GET** `/transfers/:id`

```bash
curl -X GET http://localhost:3000/transfers/654abc123... \
  -H "x-api-key: clé"
```

Retourne le transfert complet ou 404.

### 4. Traiter un transfert (simulation)

**POST** `/transfers/:id/process`

```bash
curl -X POST http://localhost:3000/transfers/654abc123.../process \
  -H "x-api-key: clé"
```

**Logique** :
1. Vérifie que le statut n'est pas final (`SUCCESS`, `FAILED`, `CANCELED`)
2. Passe à `PROCESSING`
3. Simule le traitement (2-3 secondes)
4. **70%** → `SUCCESS` + `provider_ref`
5. **30%** → `FAILED` + `error_code`

**Erreur 409** si statut déjà final.

### 5. Annuler un transfert

**POST** `/transfers/:id/cancel`

```bash
curl -X POST http://localhost:3000/transfers/654abc123.../cancel \
  -H "x-api-key: clé"
```

**Règle** : Seuls les transferts `PENDING` peuvent être annulés (sinon 409).

---

## Explication du Flow

### Diagramme des transitions d'état

```
┌─────────┐
│ PENDING │ ◄── Création du transfert
└────┬────┘
     │
     ├─► POST /cancel ──► CANCELED (état final)
     │
     └─► POST /process
          │
          ▼
     ┌────────────┐
     │ PROCESSING │
     └─────┬──────┘
           │
           ├─► 70% ──► SUCCESS (état final) + provider_ref
           │
           └─► 30% ──► FAILED (état final) + error_code
```

**États finaux** (ne peuvent plus être modifiés) : `SUCCESS`, `FAILED`, `CANCELED`

### Logs d'audit

Chaque action importante est tracée automatiquement :
- `TRANSFER_CREATED` : Création du transfert
- `TRANSFER_PROCESSING` : Début du traitement
- `TRANSFER_SUCCESS` : Traitement réussi
- `TRANSFER_FAILED` : Traitement échoué
- `TRANSFER_CANCELED` : Annulation

Les logs sont stockés dans une collection MongoDB séparée avec timestamp et métadonnées.

---

## Choix techniques

### 1. MongoDB avec Mongoose
- **Pourquoi** : Flexibilité pour les métadonnées dynamiques, pas de migrations complexes
- **Index** : Optimisation sur `reference`, `status`, `channel`, `amount`
- **Adapté** : Pour un prototype rapide et évolutif

### 2. Pagination Cursor-Based
- **Pourquoi** : Plus performant que l'offset sur grandes collections
- **Avantage** : Résultats cohérents même avec ajouts/suppressions concurrents
- **Implémentation** : Utilise `_id` MongoDB comme cursor

### 3. Architecture NestJS modulaire
- **Séparation** : Controller (HTTP) / Service (logique métier) / Repository (données)
- **Testabilité** : Injection de dépendances facilitant les mocks
- **Réutilisabilité** : Modules indépendants (AuditModule, TransfersModule)

### 4. Guard API Key
- **Simplicité** : Adapté au scope du test
- **Sécurité basique** : Distinction 401 (absent) vs 403 (invalide)
- **Évolutif** : Facilement remplaçable par JWT/OAuth2

### 5. Validation automatique (class-validator)
- **Déclarative** : Validation sur les DTOs
- **Type-safe** : Cohérence avec TypeScript
- **Messages clairs** : Erreurs explicites pour le client

### 6. Audit logs séparé
- **Traçabilité** : Historique complet de chaque transfert
- **Non-bloquant** : Les erreurs d'audit n'impactent pas le flux principal
- **Indépendant** : Module réutilisable

---

## Ce que je ferais avec plus de temps

### Sécurité
- **JWT** avec refresh tokens au lieu d'API Key simple
- **Rate limiting** pour protéger contre le spam/DDoS
- **Hashing** des API keys en base de données
- **Permissions granulaires** : différents niveaux d'accès
- **CORS** configuré selon les environnements

### Performance & Scalabilité
- **Redis** pour cache des transferts fréquemment consultés
- **PostgreSQL** en option avec TypeORM pour garantir ACID
- **Index composés** optimisés pour requêtes complexes
- **Transactions** pour garantir la cohérence

### Fonctionnalités métier
- **Multi-devises** avec taux de change dynamique
- **Webhooks** pour notifier les systèmes externes des changements d'état
- **Retry automatique** pour les transferts FAILED (avec backoff exponentiel)
- **Notifications** SMS/Email au destinataire
- **Scheduled jobs** : réconciliation, nettoyage des vieux transferts
- **Vrais providers** : intégration Wave API, Orange Money API

### Monitoring & Observabilité
- **Prometheus + Grafana** : métriques temps réel (nombre de transferts, taux de succès, latence)
- **Logging structuré** avec Winston ou Pino
- **Alerting** : notifications si taux d'échec > seuil
- **Distributed tracing** avec Jaeger/Zipkin
- **Health checks** : endpoints `/health` et `/ready`

### Tests & Qualité
- **Tests E2E** complets avec vraie base MongoDB de test
- **Tests d'intégration** avec les providers
- **Tests de charge** avec K6 ou Artillery
- **Coverage** > 90%
- **CI/CD** : GitHub Actions avec déploiement automatique

### DevOps & Infrastructure
- **Docker Compose** complet (app + MongoDB + Redis)
- **Kubernetes** : déploiement avec Helm charts
- **Multi-environnements** : dev, staging, prod avec configs séparées
- **Versioning API** : `/v1/transfers`, `/v2/transfers`
- **Blue/Green deployment** pour zéro downtime

### Provider System avancé
- **Adapters séparés** : `WaveProvider`, `OrangeMoneyProvider` implémentant une interface commune
- **Load balancing** : répartition intelligente entre providers selon leur disponibilité
- **Fallback automatique** : si un provider est down, basculer sur un autre
- **Circuit breaker** : arrêter temporairement les appels à un provider défaillant
- **Monitoring par provider** : performances, taux de succès, coûts

---

## Tests

### Exécution

```bash
# Tous les tests
npm test

# Mode watch
npm run test:watch

# Coverage
npm run test:cov
```

### Tests implémentés (11 tests)

✅ **Calcul des frais** :
- Calcul à 0.8% arrondi au supérieur
- Application du minimum (100)
- Application du maximum (1500)

✅ **Transitions d'état** :
- PENDING → PROCESSING → SUCCESS
- PENDING → PROCESSING → FAILED
- Impossible de traiter un statut final
- PENDING → CANCELED
- Impossible d'annuler un statut non-PENDING

---

## Structure du projet

```
src/
├── common/
│   └── guards/
│       └── api-key.guard.ts          # Authentification API Key
├── transfers/
│   ├── dto/                          # DTOs avec validation
│   ├── entities/                     # Schéma Mongoose Transfer
│   ├── transfers.controller.ts       # Routes HTTP + Swagger
│   ├── transfers.service.ts          # Logique métier
│   ├── transfers.repository.ts       # Accès données + pagination
│   ├── provider.simulator.ts         # Simulation traitement
│   ├── transfers.module.ts           # Module NestJS
│   └── transfers.service.spec.ts     # Tests unitaires
├── audit/
│   ├── entities/                     # Schéma Mongoose AuditLog
│   ├── audit.service.ts              # Logs d'audit
│   └── audit.module.ts               # Module NestJS
├── app.module.ts                     # Module racine
└── main.ts                           # Bootstrap + Swagger
```

---

## Livrables

✅ **Repo GitHub** : https://github.com/Babacd/dexchange-transfer-api  
✅ **Swagger** : http://localhost:3000/docs  
✅ **README** : Ce fichier  
✅ **.env.example** : Configuration d'exemple  
✅ **Tests** : 11 tests unitaires passent

---

## Licence

MIT

---

**Contact** : Test Backend DEXCHANGE - 2025
