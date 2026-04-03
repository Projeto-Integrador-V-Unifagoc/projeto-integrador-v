/**
 * Nesse código, é onde tudo se une: as rotas, os seguranças (middlewares) 
 * e as configurações que fazem o servidor do projeto começar a rodar.
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./Modules/usuario-perfil-autenticacao/routes/auth-routes";
import AutenticacaoController from "./Modules/usuario-perfil-autenticacao/controller/autenticacao-controller";

console.log("INICIANDO SERVIDOR...");

dotenv.config();

const app = express();

// Configurações para a API aceitar conversas de outros sites e ler JSON
app.use(cors());
app.use(express.json());

//Liga as rotas de login e cadastro no caminho "/auth"
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("API rodando");
});

app.get("/health", (req, res) => {
    return res.status(200).json({ status: "ok" });
});

// SUA ROTA DE CADASTRO (TAREFA 2)
app.post("/usuarios", AutenticacaoController.cadastrar);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

import { autenticar } from "./middlewares/autenticacao";
import { eAdmin } from "./middlewares/autorizacao";

//Rota que usa o porteiro para conferir se o seu crachá (token) é real
app.get("/auth/validar", autenticar, (req, res) => {
  res.json({
    message: "Token válido",
    user: (req as any).user //Mostra os dados que estão gravados no crachá
  });
});

//Rota que só deixa entrar quem está logado E é administrador
app.get("/admin/painel", autenticar, eAdmin, (req, res) => {
  res.json({ 
    mensagem: "Sucesso! Você entrou na Área Administrativa.",
    dadosDoUsuario: (req as any).user 
  });
});