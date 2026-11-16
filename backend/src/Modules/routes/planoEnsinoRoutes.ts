import { Router } from "express";
import { autenticar } from "../../middlewares/autenticacao";
import { PlanoEnsinoController } from "../plano-ensino/controller/PlanoEnsinoController";
const controller = new PlanoEnsinoController();
export const planoEnsinoRouter = Router();
planoEnsinoRouter.use(autenticar);
planoEnsinoRouter.get("/turmas-disciplinas/:ofertaId/planos-ensino", controller.listar);
planoEnsinoRouter.post("/turmas-disciplinas/:ofertaId/planos-ensino", controller.criar);
planoEnsinoRouter.put("/planos-ensino/:id", controller.atualizar);
planoEnsinoRouter.post("/planos-ensino/:id/submeter", controller.submeter);
planoEnsinoRouter.post("/planos-ensino/:id/aprovar", controller.aprovar);
planoEnsinoRouter.post("/planos-ensino/:id/arquivar", controller.arquivar);

