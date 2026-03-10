import { Router } from "express";

const router = Router();

router.get("/cursos", (req, res) => {
    res.json([
        {
            id: 1,
            nome: "Ciência da Computação"
        },
        {
            id: 2,
            nome: "Administração"
        }
    ]);
});

export default router;


import { Router } from "express";
import { pool } from "../database/connection";

const router = Router();

router.post("/cursos", async (req, res) => {

  const { nome, duracao_periodos, modalidade, status } = req.body;

  const result = await pool.query(
    `INSERT INTO cursos (nome, duracao_periodos, modalidade, status)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [nome, duracao_periodos, modalidade, status]
  );

  res.json(result.rows[0]);
});

export default router;