import { app } from "../../backend/src/app";
import { db } from "../../backend/src/database/index";

// Executado somente em processo filho com DATABASE_URL própria, depois da adoção.
const servidor = app.listen(0, "127.0.0.1", () => {
  const endereco = servidor.address();
  if (!endereco || typeof endereco === "string") throw new Error("API histórica sem porta própria.");
  process.stdout.write(`API_HISTORICA_PRONTA:${endereco.port}:${process.pid}\n`);
});
let encerrando = false;
async function encerrar() {
  if (encerrando) return;
  encerrando = true;
  await new Promise<void>((resolve, reject) => servidor.close((erro) => erro ? reject(erro) : resolve()));
  await db.destroy();
  if (process.send) process.send({ tipo: "api-historica-encerrada", pid: process.pid }, () => process.exit(0));
  else process.exit(0);
}
process.on("message", (mensagem) => { if (mensagem === "encerrar") void encerrar(); });
process.on("SIGTERM", () => { void encerrar(); });
