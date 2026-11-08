# Fixora / Ustachi

> **Ustachi** — ta'mirlash xizmatini (uy-joy, elektronika) mijoz va ustalarni bog'laydigan to'liq stack platforma: buyurtma, AI qurilma tahlili, chat, to'lov (Click/Payme), real-time kuzatuv va push bildirishnomalar.
>
> **Ustachi** is a full-stack repair-services marketplace connecting customers with masters: orders, AI device diagnostics, chat, payments (Click/Payme), live order tracking and push notifications.

| Papka / Folder | Tavsif / Description |
| --- | --- |
| `react-tutorial/` | Web ilova — Vite + React 19 + React Router 7 |
| `react-tutorial/backend/` | REST API — Express 5 + MongoDB (Mongoose) + Socket.IO |
| `mobile/` | Mobil ilova — Expo (React Native) |
| `design-system/` | Dizayn tizimi hujjatlari (`MASTER.md`) |
| `docker-compose.yml` | Butun tizimni bitta buyruq bilan ishga tushirish |
| `.github/workflows/ci.yml` | CI: build, test, Docker (GHCR) |

---

## 1. Tez boshlash — Docker (tavsiya etiladi) / Quick start with Docker

Mashinada faqat **Docker** kerak (Node va MongoDB kerak emas).

```bash
# 1) Sozlamalar faylini yarating
cp react-tutorial/backend/.env.example react-tutorial/backend/.env   # Windows: copy ... .env

# 2) .env ichida kamida quyidagilarni to'ldiring:
#    JWT_SECRET=<istalgan uzun tasodifiy so'z>
#    CARD_SECRET=<32 baytlik sirli so'z>
#    CORS_ORIGIN=http://localhost:3000        # docker uchun shart!

# 3) To'liq tizimni ishga tushirish
docker compose up -d --build
```

*You only need Docker on your machine. Copy `.env.example` → `.env`, fill in the secrets, then `docker compose up -d --build`.*

| Xizmat | Manzil / URL |
| --- | --- |
| Web (nginx, SPA) | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Health check | http://localhost:5000/api/health |
| MongoDB | faqat kontener ichida (`mongodb://mongo:27017/ustachi`) |

```bash
docker compose ps          # holatni ko'rish
docker compose logs -f     # loglarni kuzatish
docker compose down        # to'xtatish (ma'lumotlar saqlanadi)
```

---

## 2. Qo'lda ishga tushirish (ishlab chiqish) / Manual development setup

**Talablar / Requirements:** Node.js **20+**, npm, va MongoDB (lokal o'rnatilgan yoki `docker compose up -d mongo`).

### 2.1 Backend (port 5000)

```bash
cd react-tutorial/backend
npm ci
cp .env.example .env        # Windows: copy .env.example .env
# .env ni tahrirlang (MONGO_URI, JWT_SECRET, CARD_SECRET, CORS_ORIGIN)
npm run dev                  # nodemon (avtomatik qayta ishga tushirish)
# yoki production rejimida: npm start
```

```bash
curl http://localhost:5000/api/health   # {"success":true,...}
```

*Install, copy `.env.example` to `.env`, edit secrets, then `npm run dev`. Health endpoint: `/api/health`.*

### 2.2 Web (port 3006)

Ikkinchi terminalda:

```bash
cd react-tutorial
npm ci
npm start                    # Vite dev server → http://localhost:3006
```

Lokal ishlab chiqishda `/api` va `/socket.io` so'rovlari avtomatik backend'ga (`:5000`) yo'naltiriladi. Boshqa server kerak bo'lsa:

```bash
VITE_PROXY_TARGET=http://192.168.1.10:5000 npm start
```

*The Vite dev server runs on port 3006 and proxies `/api` + `/socket.io` to `http://localhost:5000` (override with `VITE_PROXY_TARGET`).*

### 2.3 Mobil ilova (Expo)

```bash
cd mobile
npm ci
npm start                    # Expo Dev Server (QR kod)
npm run android              # Android emulatorda
```

Backend manzili `mobile/src/config.js` da:

```js
export const API_URL = "http://10.0.2.2:5000";   // Android emulator (kompyuterdagi localhost)
// Haqiqiy telefonda: LAN IP manzilingiz, masalan "http://192.168.1.10:5000"
```

Telefon backend'ga ulanishi uchun kompyuteringiz **bir xil Wi-Fi tarmoqda** bo'lishi va backend `.env` dagi `CORS_ORIGIN` ichida telefon manzili borligi kerak.

*Set `API_URL` in `mobile/src/config.js` (emulator uses `10.0.2.2`, real device uses your LAN IP). Phone and PC must be on the same Wi-Fi network.*

---

## 3. Muhit o'zgaruvchilari / Environment variables

Barchasi `react-tutorial/backend/.env` da saqlanadi (`.env` — git'ga kirmaydi, namunasi: `.env.example`).

| O'zgaruvchi | Tavsif |
| --- | --- |
| `PORT` | Backend porti (default `5000`) |
| `NODE_ENV` | `development` \| `production` |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/ustachi` |
| `JWT_SECRET` | Token shifrlash uchun maxfiy so'z (**majburiy**) |
| `CARD_SECRET` | Karta ma'lumotlarini AES-256 shifrlash (32 bayt, **majburiy**) |
| `CORS_ORIGIN` | Ruxsat etilgan originlar (vergul bilan). `NODE_ENV=production` da **majburiy** |
| `ADMIN_PHONES` | Admin panelga kiradigan telefonlar (vergul bilan) |
| `GEMINI_API_KEY` | AI foto/video tahlili (Google AI Studio, bepul) |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` | Tasdiqlash boti |
| `PAYMENT_MODE` | `sandbox` (sinov) \| `live` (real to'lov) |
| `CLICK_MERCHANT_ID` / `CLICK_SERVICE_ID` / `CLICK_SECRET_KEY` | Click to'lov |
| `PAYME_MERCHANT_ID` / `PAYME_MERCHANT_KEY` | Payme to'lov |

> **Diqqat:** `docker-compose.yml` backend'ni `NODE_ENV=production` da ishga tushiradi, shuning uchun `CORS_ORIGIN=http://localhost:3000` bo'sh qolsa server xatolik beradi.

---

## 4. Portlar / Ports

| Xizmat | Ishlab chiqish (dev) | Docker (production) |
| --- | --- | --- |
| Web | `3006` (Vite) | `3000` → nginx `80` |
| Backend API | `5000` | `5000` |
| MongoDB | `27017` (lokal yoki kontener) | kontener ichida |

---

## 5. Testlar va CI / Tests & CI

```bash
cd react-tutorial          && npm test        # Vitest (web)
cd react-tutorial/backend  && npm test        # node --test (unit)
cd react-tutorial/backend  && npm run test:integration   # integratsion (MongoDB kerak)
cd mobile                  && npm test
```

GitHub Actions (`.github/workflows/ci.yml`) har bir push'da ishlaydi:

1. **web** — `npm run build` + `npm test`
2. **backend** — `npm ci` + sintaksis tekshiruvi + `npm test`
3. **mobile** — `npx expo export --platform android`
4. **docker** — `main`/`master` branch'ga push'da rasmalar GHCR'ga yuboriladi (`ghcr.io/<repo>/backend`, `ghcr.io/<repo>/web`)

---

## 6. Loyiha tuzilishi / Project structure

```
Fixora/
├── react-tutorial/              # WEB (Vite + React 19)
│   ├── src/
│   │   ├── screens/             # Login, UserHome, MasterHome, OrdersView, ...
│   │   ├── components/          # UI komponentlar
│   │   ├── services/            # api.js, socket.js, aiAnalysis.js
│   │   ├── theme/  i18n/        # tema (qorong'i/yorug') va tarjimalar
│   │   └── index.jsx  App.jsx
│   ├── vite.config.mjs          # port 3006 + /api proxy
│   └── backend/                 # API (Express 5)
│       ├── server.js            # kirish nuqtasi
│       ├── src/
│       │   ├── routes/          # auth, users, masters, orders, chat, ai,
│       │   │                    # cards, feedback, payments, push, admin,
│       │   │                    # notifications, catalog
│       │   ├── controllers/     # biznes logika
│       │   ├── models/          # User, Order, Chat, CardAccount, Payment...
│       │   ├── services/        # socket, click, payme, push, commission
│       │   └── middleware/      # auth, rateLimit, security
│       ├── scripts/             # backup.js, integration.test.js
│       └── .env.example
├── mobile/                      # EXPO (React Native)
│   ├── App.js
│   └── src/                     # screens, components, services, theme, i18n
├── design-system/               # dizayn qoidalari (MASTER.md)
├── docker-compose.yml           # mongo + backend + web
└── .github/workflows/ci.yml     # CI/CD
```

---

## 7. Tez-topish / Troubleshooting

| Muammo | Yechim |
| --- | --- |
| `CORS_ORIGIN ni o'rnatish shart` | `.env` ichida `CORS_ORIGIN=http://localhost:3000` qo'shing |
| Web 502/`/api` 404 beradi | Backend ishga tushganini tekshiring: `curl localhost:5000/api/health` |
| Mobil ilova serverga ulanmaydi | `mobile/src/config.js` dagi `API_URL` ni LAN IP'ga o'zgartiring, bir xil Wi-Fi'da bo'ling |
| `docker compose` `.env` xatosi | `react-tutorial/backend/.env` mavjud emas — `.env.example` dan nusxalang |
| AI tahlil ishlamaydi | `GEMINI_API_KEY` ni [Google AI Studio](https://aistudio.google.com/app/apikey) dan oling |
| To'lov test rejimi | `PAYMENT_MODE=sandbox` — real pul yechilmaydi |

---

## English summary

**Requirements:** Node.js 20+, MongoDB 7 (or Docker only), npm.

**Production-like (recommended):**

```bash
cp react-tutorial/backend/.env.example react-tutorial/backend/.env
# fill JWT_SECRET, CARD_SECRET, CORS_ORIGIN=http://localhost:3000
docker compose up -d --build
# Web → http://localhost:3000 · API → http://localhost:5000/api/health
```

**Development:** run two terminals —

```bash
cd react-tutorial/backend && npm ci && npm run dev    # API on :5000
cd react-tutorial        && npm ci && npm start       # Web on :3006 (proxies /api → :5000)
```

**Mobile:** `cd mobile && npm ci && npm start`, then point `mobile/src/config.js` → `API_URL` at your backend.

**Tests:** `npm test` in `react-tutorial`, `react-tutorial/backend` and `mobile`. CI runs on every push and publishes Docker images to GHCR from `main`/`master`.

All secrets live in `react-tutorial/backend/.env` — this file is **git-ignored**; never commit it.
