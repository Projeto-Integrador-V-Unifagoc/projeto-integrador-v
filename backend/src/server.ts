import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./Modules/usuario-perfil-autenticacao/routes/auth-routes";
import { autenticar } from "./middlewares/autenticacao";
import { soSecretaria } from "./middlewares/autorizacao";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

console.log("autenticar:", typeof autenticar);
console.log("soSecretaria:", typeof soSecretaria);

// SEM /auth
app.use(authRoutes);

app.get("/", (req, res) => {
  res.send("API rodando");
});

app.get("/validar", autenticar, (req, res) => {
  res.json({ ok: true });
});

app.get("/admin/painel", autenticar, soSecretaria, (req, res) => {
  res.json({ ok: true });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});