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
