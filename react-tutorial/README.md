# Ustachi — Web (Vite + React 19)

Ustachi veb-ilovasi. Ishga tushirish bo'yicha to'liq yo'riqnoma — ildizdagi [`../README.md`](../README.md).

```bash
npm ci
npm start        # Vite dev server → http://localhost:3006
npm run build    # production build → dist/
npm run preview  # build'ni lokal ko'rish
npm test         # Vitest
```

- Dev'da `/api` va `/socket.io` so'rovlari `http://localhost:5000` (backend) ga proxy qilinadi.
- Boshqa backend kerak bo'lsa: `VITE_PROXY_TARGET=http://192.168.1.10:5000 npm start`
- Backend kodi: [`./backend`](./backend) (Express 5 + MongoDB + Socket.IO).

> This is the Vite-based web client. Full setup guide lives in the repository root `README.md`.
