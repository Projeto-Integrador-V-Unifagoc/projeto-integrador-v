import { Router } from "express";

const router = Router();

router.get("/matriculas", (req, res) => {
  res.json([
    {
      id: 1,
      alunoId: 10,
      status: "ATIVA"
    }
  ]);
});

export default router;