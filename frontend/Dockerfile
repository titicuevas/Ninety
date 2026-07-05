FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
RUN npm install -g serve@14.2.4
COPY --from=build /app/dist ./dist
ENV PORT=4173
EXPOSE 4173
CMD ["sh", "-c", "serve dist -s -l tcp://0.0.0.0:${PORT}"]
