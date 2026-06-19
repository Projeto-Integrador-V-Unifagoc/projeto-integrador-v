FROM node:22-alpine

RUN apk add --no-cache netcat-openbsd

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
