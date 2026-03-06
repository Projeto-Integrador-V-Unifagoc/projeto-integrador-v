import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./Modules/usuario-perfil-autenticacao/routes/auth-routes";

console.log("INICIANDO SERVIDOR...");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("API rodando 🚀");
});

app.get("/health", (req, res) => {
  return res.status(200).json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});