# Imagen de producción de PasalO: construye el frontend y sirve todo desde Express.
# Sirve para Railway, Render, Fly.io o cualquier VPS con Docker.
FROM node:22-alpine

WORKDIR /app

# Dependencias primero, para aprovechar la caché de Docker
COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/
COPY client/package.json client/package-lock.json ./client/
RUN npm ci --prefix server --omit=dev && npm ci --prefix client

# Código y build del frontend
COPY . .
RUN npm run build --prefix client

ENV NODE_ENV=production
ENV PORT=3001
# Sin DB_URL ni CLOUDINARY_URL, los datos van a /data: montar ahí un disco persistente.
# Con Turso y Cloudinary (ver DEPLOY.md) no hace falta disco.
ENV DB_FILE=/data/pasalo.db
ENV UPLOAD_DIR=/data/uploads

EXPOSE 3001
CMD ["node", "--disable-warning=ExperimentalWarning", "server/index.js"]
