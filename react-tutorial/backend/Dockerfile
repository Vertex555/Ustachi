FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .

# Yuklangan rasmlar uchun papka
RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "server.js"]