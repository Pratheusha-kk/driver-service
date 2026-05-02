FROM node:25-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/data /app/runtime

ENV DB_PATH=/app/runtime/driver-service.db
VOLUME ["/app/runtime"]

EXPOSE 3003

CMD ["node", "src/server.js"]
