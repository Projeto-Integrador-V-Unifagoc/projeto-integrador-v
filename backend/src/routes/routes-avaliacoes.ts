import { Router } from "express";

import { AvaliacaoController } from "../modules/avaliacoes-vinculo/controller/avaliacao-controller.js";

const routes = Router();

routes.get("/avaliacoes", AvaliacaoController.listar);
routes.post("/avaliacoes", AvaliacaoController.criar);
routes.put("/avaliacoes/:id", AvaliacaoController.atualizar);
routes.delete("/avaliacoes/:id", AvaliacaoController.deletar);

export default routes;
