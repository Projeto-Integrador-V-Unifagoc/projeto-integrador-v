import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./Modules/usuario-perfil-autenticacao/routes/auth-routes";
import AutenticacaoController from "./Modules/usuario-perfil-autenticacao/controller/autenticacao-controller";
// 1. MOVI OS IMPORTS PARA CIMA
import { autenticar } from "./middlewares/autenticacao";
import { eAdmin } from "./middlewares/autorizacao";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// 2. ROTAS PÚBLICAS (Sem segurança)
app.use("/auth", authRoutes);
app.post("/usuarios", AutenticacaoController.cadastrar);

app.get("/", (req, res) => res.send("API rodando"));
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

// 3. SUAS ROTAS COM SEGURANÇA (Tarefa do Tanus)
// Rota para validar o token
app.get("/auth/validar", autenticar, (req, res) => {
  res.json({
    message: "Token válido",
    user: (req as any).user
  });
});

// Rota restrita para Admin
app.get("/admin/painel", autenticar, eAdmin, (req, res) => {
  res.json({ 
    mensagem: "Sucesso! Você entrou na Área Administrativa.",
    dadosDoUsuario: (req as any).user 
  });
});

// 4. LIGAR O SERVIDOR (Sempre por último!)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});