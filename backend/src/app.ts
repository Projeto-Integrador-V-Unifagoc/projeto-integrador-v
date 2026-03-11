import express from "express";
import cors from "cors";
import matriculaRoutes from "./Modules/matricula-vinculos/routes/matricula.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", matriculaRoutes);

app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});