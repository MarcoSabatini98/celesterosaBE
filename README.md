# celesterosaBE

Backend dell'e-commerce **celesterosa** — negozio online di strumenti musicali. API REST in Node.js + Express con database MariaDB, gestione catalogo dettagliato, area amministrativa, pagamenti online (Stripe), fatturazione PDF ed email automatiche.

> Stato: backend funzionante end-to-end (catalogo, auth, admin, carrello, checkout, pagamenti, fatture, email, job, test). Branch di lavoro su feature; merge in `develop` via PR, `main` protetto.

## API principali (`/api/v1`)

| Area | Endpoint |
|------|----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| Catalogo | `GET /categories`, `GET /categories/:slug`, `GET /brands`, `GET /products` (filtri/ricerca/sort/paginazione), `GET /products/:slug` |
| Carrello | `GET /cart`, `POST /cart/items`, `PUT /cart/items/:id`, `DELETE /cart/items/:id` (guest via header `X-Cart-Token`) |
| Checkout | `POST /checkout`, `POST /stripe/simulate-payment`, `POST /stripe/webhook` |
| Ordini | `GET /orders`, `GET /orders/:orderNumber`, `GET /orders/:orderNumber/invoice` |
| Admin | `/admin/brands`, `/admin/categories`, `/admin/products`, `/admin/variants`, `/admin/products/:id/images` (upload), `/admin/orders`, `/admin/invoices` |

Documentazione interattiva su `/api-docs` (Swagger).

## Account demo (seed)

- Admin: `admin@celesterosa.it` / `Admin123!`
- Cliente: `cliente@example.com` / `Cliente123!`

> Stripe gira in modalità **simulata** finché non si inseriscono chiavi di test reali in `.env`; in simulazione il pagamento si conferma con `POST /stripe/simulate-payment`.

## Funzionalità previste

- **Catalogo strumenti** ricco e dettagliato: categorie gerarchiche (chitarre & bassi, tastiere & piano, fiati, archi, batterie & percussioni, studio & audio pro, DJ, amplificazione, effetti, accessori, spartiti) con attributi flessibili per categoria (modello EAV).
- **Varianti prodotto**: finitura/colore, mancino/destro, taglia — con SKU, stock e prezzo per variante.
- **Immagini prodotto** su storage S3-compatibile (MinIO), con upload dall'area admin.
- **Utenti**: account cliente e ruolo admin (JWT + bcrypt), più checkout come ospite (guest).
- **Carrello e ordini** con macchina a stati (pending → paid → shipped → delivered / cancelled / refunded).
- **Pagamenti online** con Stripe (sandbox → reale), confermati via webhook.
- **Fatturazione italiana** con IVA (imponibile, aliquote, totale) ed esportazione PDF.
- **Email automatiche** (conferma ordine, spedizione, fattura allegata).
- **Area admin**: CRUD prodotti/varianti/categorie/brand, upload immagini, gestione ordini e fatture.
- Documentazione API con **Swagger**, logging, rate limiting, job schedulati e test con Jest.

## Stack tecnico

| Area | Tecnologia |
|------|-----------|
| Runtime / Web | Node.js, Express 5 |
| Database / ORM | MariaDB, Sequelize 6 |
| Auth | JWT, bcrypt |
| Pagamenti | Stripe (webhook raw-body) |
| Storage immagini | MinIO (S3-compatibile) |
| PDF / Fatture | pdf-lib, puppeteer |
| Email | nodemailer |
| Validazione | Joi |
| Logging | Winston, morgan |
| Scheduling | node-cron |
| Docs | Swagger (swagger-jsdoc, swagger-ui-express) |
| Test | Jest, supertest |
| Infra locale | Docker Compose (MariaDB + MinIO) |

## Architettura

Struttura a layer (route → controller → service → repository → model):

```
src/
  config/        configurazione (db, stripe, minio, mail, env)
  controllers/   adattatori HTTP
  services/      logica di business
  repositories/  accesso dati (Sequelize)
  models/        modelli e associazioni
  routes/        definizione endpoint /api/v1
  middlewares/   auth, ruoli, upload, error handling
  validators/    schemi Joi
  errors/        AppError e mappatura errori
  jobs/          task schedulati (node-cron)
  utils/         logger, risposte HTTP, helper
database/
  migrations/    schema del database
  seeders/       dati demo (brand, categorie, prodotti, admin)
```

## Avvio in locale

> La configurazione completa (script, variabili d'ambiente, docker-compose) viene aggiunta nelle fasi successive di sviluppo.

```bash
npm install
cp .env.example .env      # poi compila i valori
docker compose up -d      # MariaDB + MinIO
npm run db:setup          # create + migrate + seed
npm run dev
```

## Script utili

```bash
npm run dev          # avvio con nodemon (+ docker compose up)
npm run migrate      # esegue le migrations
npm run seed         # popola brand, categorie, prodotti, utenti demo
npm run db:reset     # rigenera schema e seed
npm test             # test (unit + integration)
npm run test:unit    # solo unit
npm run lint         # ESLint
```

## Sicurezza e segreti

I file con credenziali (`.env`, chiavi, certificati) **non vanno mai versionati**: sono esclusi in [.gitignore](.gitignore). Solo `.env.example` (senza valori reali) è tracciato come riferimento.

## Branching

- `develop` — branch di sviluppo, destinazione di tutti i push.
- `main` — protetto, aggiornato solo via Pull Request da `develop`.

## Autore

Marco Sabatini — licenza MIT.
