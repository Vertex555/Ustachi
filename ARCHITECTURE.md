# Ustachi — System Architecture

Ustachi is a professional service marketplace platform connecting users who have
broken electronic devices / household appliances with suitable repair masters.

The platform is built as a **MERN** application (MongoDB, Express, React, Node.js)
with Socket.IO for real-time communication.

---

## 1. Complete Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser (Client)                    │
│  React.js + React Router + Axios + Socket.IO-client         │
│  Leaflet / OpenStreetMap, geolocation                       │
└───────────────┬─────────────────────────────┬───────────────┘
                │ REST (JSON)                 │ WebSocket (Socket.IO)
                │ HTTPS                       │
┌───────────────▼─────────────────────────────▼───────────────┐
│                         Express (Server)                    │
│  app.js / server.js                                         │
│                                                             │
│  Routes (/api/v1/...)  ─▶ Controllers (thin)               │
│                             │                               │
│                      Services (business logic)             │
│                             │                               │
│                     Models (Mongoose schemas)              │
│                                                             │
│  Middleware: auth / authz / validation / rate-limit /       │
│              error / upload / 404                           │
│                                                             │
│  Sockets: real-time chat, notifications, order tracking     │
│  Jobs: scheduled cleanup, reminders (node-cron)             │
└───────────────┬─────────────────────────────────────────────┘
                │                        │
┌───────────────▼──────────┐  ┌──────────▼───────────────────┐
│      MongoDB             │  │  Telegram Bot (OTP)          │
│  application data        │  └──────────────────────────────┘
└──────────────────────────┘
```

Key principles:

- **Separation of concerns**: Controllers stay thin; business logic lives in
  `services/`; database schemas live in `models/`; cross-cutting concerns live in
  `middleware/`.
- **API versioning**: All endpoints are prefixed with `/api/v1`.
- **Stateless auth**: JWT access token stored in an **HttpOnly** cookie; refresh
  rotation supported.
- **Real-time**: Socket.IO authenticated via the same session / token.
- **Config via environment**: all credentials (incl. Telegram) in `.env`, never
  in frontend code.

---

## 2. Folder Structure

```
mypro/
├── client/                         # React frontend
│   ├── public/
│   ├── src/
│   │   ├── assets/                 # images, fonts, static
│   │   ├── components/             # reusable UI (Button, Card, Modal, ...)
│   │   │   ├── common/
│   │   │   ├── master/
│   │   │   └── order/
│   │   ├── context/                # AuthContext, SocketContext, ...
│   │   ├── hooks/                  # useAuth, useAxios, useSocket, useGeo
│   │   ├── layouts/                # UserLayout, MasterLayout, AuthLayout
│   │   ├── pages/                  # route-level pages
│   │   ├── routes/                 # routing definitions + guards
│   │   ├── services/               # api client + feature API modules
│   │   ├── styles/                 # global styles / theme
│   │   └── utils/                  # helpers, formatters, constants
│   ├── .env                        # VITE_* public-only vars
│   ├── package.json
│   └── vite.config.js
│
└── server/
    ├── src/
    │   ├── config/                 # env config, db, socket, upload, telegram
    │   ├── controllers/            # thin HTTP handlers
    │   ├── middleware/             # auth, authz, validate, rate-limit, error, upload, notFound
    │   ├── models/                 # Mongoose schemas
    │   ├── routes/                 # express routers (versioned)
    │   ├── services/               # business logic
    │   ├── sockets/                # socket.io handlers + namespaces
    │   ├── jobs/                   # scheduled jobs (node-cron)
    │   ├── utils/                  # ApiError, ApiResponse, asyncHandler, logger, jwt, otp
    │   ├── validators/             # request validation schemas
    │   ├── app.js                  # express app wiring
    │   └── server.js               # bootstrap + http + socket server
    ├── uploads/                    # uploaded media (gitignored)
    ├── .env                        # SECRET — never committed
    ├── .env.example
    └── package.json
```

---

## 3. Database Entity Relationships

```
User (role: user) 1─┐
Master (role: master) 1─┐
Admin (role: admin) ────┐
                        ▼
                  VerificationCode (belongs to a user, type: register/login/reset)

User 1───* Conversation
User 1───* Order (as customer)
User 1───* Review (as author)
User 1───* Notification
User 1── 1 Master

Master 1───* Order (as assignee)
Master 1───* Review (as subject)
Master 1───* Device (supported devices)
Master 1───* Skill
Master 1── 1 User

Device 1───* Problem
Problem *──1 Device (ref)
Problem 1──1 Order (usually)

Order 1──1 Payment
Order 1──* Message (thread) — optional, may use Conversation
Order 1──* Review (0..1 commonly)
Order 1──1 Master (assignee)
Order 1──1 User (customer)
Order 1──1 Problem (optional linkage)

Conversation 1──* Message
Message *──1 User (sender)

Payment 1──1 Order

Notification *──1 User (recipient)

Problem 1──* Media (embedded: images/videos URLs, refs to uploads)
```

### Relationships summary table

| Entity       | References / embeds                                |
|--------------|----------------------------------------------------|
| User         | `master` (1:1), arrays: `notifications` service    |
| Master       | `user` (1:1), `devices: [Device]`, `skills: []`    |
| Device       | `category`, standalone catalog                      |
| Problem      | `user`, `device`, `media: []` (upload refs)        |
| Order        | `customer: User`, `master: Master`, `problem`, `review` |
| Conversation | `participants: [User]`, `order?`                   |
| Message      | `conversation`, `sender: User`, optional `media`   |
| Payment      | `order`, `customer`, `master`, `status`            |
| Review       | `order`, `author: User`, `master`                  |
| Notification | `recipient: User`, `type`, `data`                  |
| VerificationCode | `user`, `type`, `codeHash`, `expiresAt`, `attempts` |

---

## 4. API Architecture

- Base: `/api/v1`
- REST conventions:
  - `GET`   → read (list / retrieve)
  - `POST`  → create / action
  - `PUT`   → full update
  - `PATCH` → partial update
  - `DELETE`→ remove / soft-delete
- Resources: `/auth`, `/users`, `/masters`, `/devices`, `/problems`, `/orders`,
  `/conversations`, `/messages`, `/payments`, `/reviews`, `/notifications`,
  `/uploads`, `/geo`.

### Response envelope

Successful responses:

```json
{
  "success": true,
  "data": { ... },
  "message": "optional",
  "meta": { "page": 1, "pageSize": 20, "total": 100, "totalPages": 5 }
}
```

Errors (compliant with `errorResponse` util):

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable",
    "details": [ { "field": "email", "message": "is required" } ]
  }
}
```

### Pagination

Query params: `page` (default 1), `pageSize`/`limit` (default 20, max 100),
optional `sort`, `fields`. Response `meta` block as above.

---

## 5. Authentication Architecture

- **Registration** (`POST /api/v1/auth/register`): creates User, triggers
  Telegram OTP verification.
- **6-digit verification code** (`VerificationCode` model): hash-only storage,
  expiry (e.g. 10 min), max attempts; sent via Telegram bot (server side only).
- **Login** (`POST /api/v1/auth/login`): verify credentials + OTP (or OTP-only for
  the flow), returns tokens.
- **Tokens**:
  - `accessToken` — short-lived (15m), stored in **HttpOnly** cookie, sent with
    `credentials: include`.
  - `refreshToken` — longer-lived (7d), HttpOnly cookie, rotated on refresh.
- **Logout** clears the cookies.
- Security: cookie flags `HttpOnly`, `SameSite=Lax`, `Secure` in production.

```
POST /api/v1/auth/register      { name, phone, password, role }
POST /api/v1/auth/verify        { phone, code }   → marks email/phone verified
POST /api/v1/auth/login         { phone, password, [code] }
POST /api/v1/auth/refresh       (cookie)
POST /api/v1/auth/logout        (cookie)
GET  /api/v1/auth/me            (authenticated)
```

---

## 6. Authorization Architecture

- Roles: `user`, `master`, `admin`. Stored on the `User` model.
- Role derivation: `Master` docs reference a `User` with role `master`; admin is a
  user with role `admin`.
- Middleware:
  - `authenticate` — validates JWT from cookie/header, attaches `req.user`.
  - `authorize(...roles)` — checks `req.user.role` against allowed roles.
  - `requireVerified` — blocks unverified accounts where needed.
- Guards are applied at the route level:

```js
router.get('/masters/me', authenticate, authorize('master'), masterController.me);
```

---

## 7. Socket.IO Architecture

- Server: Socket.IO attached to the same HTTP server; CORS configured for the
  client origin.
- Auth: middleware validates the JWT (Bearer in `handshake.auth.token`);
  joins a **private room** (`user:<id>`).
- Namespaces: single default `/` initially, can split into `/chat`, `/tracking`,
  `/notifications` if needed.
- Events:
  - Client → server: `chat:send`, `order:track:subscribe`, `notification:read`
  - Server → client: `chat:new`, `chat:history`, `order:status`, `notification:new`
- Design: `sockets/` holds the handler registry and the `getIo()` singleton.

---

## 8. File Upload Architecture

- **Never store media in localStorage.**
- Server: `multer` with disk storage under `server/uploads/` (gitignored) or
  configurable cloud storage (S3-compatible) via a `storageService`.
- Upload endpoints under `/api/v1/uploads` (authenticated), returning a URL/path.
- `Problem`, `Message`, and `Order` reference upload URLs (images/videos).
- Validation: allowed MIME types, max file size, per-route limits.
- Production: serve static via a reverse proxy / CDN; keep disk local for dev.

---

## 9. Map / Location Architecture

- Client: **Leaflet + OpenStreetMap** tiles; `react-leaflet` for React bindings.
- `useGeo` hook uses the **Geolocation API** to obtain user coordinates.
- Master profiles store `location: { type: "Point", coordinates: [lng, lat] }`
  (GeoJSON) with a **2dsphere index** for distance queries.
- Distance-based querying via `$near` / `$geoNear` in `masterService`.
- Filtering by **rating and distance** done server-side via query + aggregations.

---

## 10. Payment Architecture

- Order lifecycle: `pending → confirmed → in_progress → completed → cancelled`.
- `Payment` records track status: `pending → paid → refunded → failed`.
- Providers are abstracted behind a `paymentService` interface (PayPal / Stripe /
  local mock in dev) so the rest of the code is agnostic.
- Webhook handler endpoint for asynchronous provider updates.
- Milestone/release: payments are held until order completion then released to
  master (escrow-style), configurable.

---

## 11. Security Architecture

- `helmet` for security headers.
- CORS restricted to the client origin, credentials allowed.
- **Rate limiting** (`express-rate-limit`) on auth + sensitive routes.
- Input validation (Joi in `validators/`) before controllers.
- Password hashing with `bcrypt`.
- JWT in **HttpOnly** cookies (mitigates XSS token theft).
- OTP stored **hashed**, attempts limited, expiry enforced.
- Secrets only in `.env` (`dotenv`), never committed (`.env` gitignored).
- NoSQL-injection / prototype pollution guards via Mongoose + validation.
- Central error middleware never leaks stack traces to clients in production.
- Request logging via `pino`/`morgan`-style logger.

---

## 12. Development Phases

1. **Phase 0 — Foundation (this PR)**:
   - Scaffold `client/` + `server/` structure.
   - Config, error handling, base utils, response envelope.
   - Health/status endpoint + `/api/v1` wiring.
   - Socket.IO bootstrap with auth.
   - All models defined.
   - Auth (register/login/OTP/refresh/logout) + middleware.
   - File upload + map/geo utilities.
   - Client: Vite + Router + Axios client + auth context + layouts + a landing
     page that calls the health endpoint.
   - **Verify client ↔ server communication.**

2. **Phase 1 — Auth + Profiles**: full registration/login UI, master profile
   creation, device listing.
3. **Phase 2 — Problem + Matching**: problem creation w/ media, analysis stub,
   master matching + filtering by rating/distance.
4. **Phase 3 — Orders + Chat**: order creation, real-time chat, order tracking,
   notifications.
5. **Phase 4 — Payments + Reviews**: payment integration, reviews, ratings.
6. **Phase 5 — Admin + Polish**: admin dashboard, analytics, edge cases, tests.

---

## Environment Configuration

`server/.env.example` (see file) declares `PORT`, `MONGO_URI`, `JWT_*`, cookie
settings, `CLIENT_ORIGIN`, `TELEGRAM_BOT_TOKEN`, `UPLOAD_DIR`. The client reads
only public `VITE_` vars. **Telegram credentials live only on the server.**

## Future concerns

- Testing: Jest/Supertest (backend), Vitest/Testing Library (frontend).
- Cloud storage for media production.
- CI/CD, Docker for MongoDB (see `docker-compose.yml`).
