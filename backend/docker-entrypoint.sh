#!/bin/sh
set -e

echo "Aguardando o banco de dados ficar disponível..."
until nc -z "$DATABASE_HOST" "${DATABASE_PORT:-5432}"; do
  sleep 1
done
echo "Banco de dados pronto."

echo "Executando migrations..."
./node_modules/.bin/tsx ./node_modules/.bin/knex migrate:latest --knexfile knexfile.ts
echo "Migrations concluídas."

echo "Iniciando o servidor..."
exec npm run start
