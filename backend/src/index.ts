import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import routes from "./routes/routes-avaliacoes.js";

dotenv.config({ path: ".env.development" });

const PORT = process.env.PORT || 3000;

const app = express();

app.use(
  cors({
    origin: "*", // "Qualquer site, de qualquer lugar do mundo, tem permissao para consumir os dados desta API."
  }),
);

app.use(express.json());
app.use(routes);

app.listen(PORT, () => {
  console.log("Ola, eu sou o servidor!");
});
