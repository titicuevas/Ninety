FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV PORT=4173
EXPOSE 4173

# Incluye node_modules para que "vite preview" del dashboard de Railway funcione
# aunque el start command del panel no se haya limpiado todavía.
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/vite.config.ts ./

CMD ["sh", "-c", "npx serve dist -s -l tcp://0.0.0.0:${PORT}"]
