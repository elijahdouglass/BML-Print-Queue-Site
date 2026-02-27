# Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY src/frontend/package*.json ./
RUN npm ci
COPY src/frontend/ ./
RUN npm run build

# Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY src/backend/package*.json ./
RUN npm ci
COPY src/backend/ ./
RUN npx prisma generate
RUN npm run build

# Final image
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl openssl-dev
COPY src/backend/package*.json ./
RUN npm ci --omit=dev
COPY src/backend/prisma ./prisma
RUN npx prisma generate
COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
