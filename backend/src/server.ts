import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./Modules/usuario-perfil-autenticacao/routes/auth-routes";
import AutenticacaoController from "./Modules/usuario-perfil-autenticacao/controller/autenticacao-controller";
import { autenticar } from "./middlewares/autenticacao";
import { eAdmin } from "./middlewares/autorizacao";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use(authRoutes)
app.post("/usuarios", AutenticacaoController.cadastrar);

app.get("/", (req, res) => res.send("API rodando"));
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

app.get("/auth/validar", autenticar, (req, res) => {
  res.json({
    message: "Token válido",
    user: (req as any).user
  });
});

app.get("/admin/painel", autenticar, eAdmin, (req, res) => {
  res.json({ 
    mensagem: "Sucesso! Você entrou na Área Administrativa.",
    dadosDoUsuario: (req as any).user 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});