# Этап сборки
FROM node:20-alpine AS builder

WORKDIR /app

# Устанавливаем зависимости
COPY package.json package-lock.json ./
RUN npm ci

# Кладём исходники и собираем
COPY . .
RUN npm run build

# Этап рантайма
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Только то, что нужно для рантайма
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Next по умолчанию слушает 3000
EXPOSE 3000

CMD ["npm", "run", "start"]