# backend/Dockerfile
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Compila o TypeScript
RUN npm run build

EXPOSE 3000

# Comando para rodar a aplicação
CMD ["npm", "start"]