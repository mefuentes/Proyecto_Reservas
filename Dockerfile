FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend ./

FROM node:20-alpine
WORKDIR /app

COPY --from=backend-builder /app/backend ./backend
COPY --from=frontend-builder /app/frontend/dist ./backend/public

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/app.js"]
