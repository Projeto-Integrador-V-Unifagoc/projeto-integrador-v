import { Router } from "express";
import { autenticar } from "../../middlewares/autenticacao";
import { PlanoEnsinoController } from "../plano-ensino/controller/PlanoEnsinoController";
const controller = new PlanoEnsinoController();
export const planoEnsinoRouter = Router();
planoEnsinoRouter.get("/turmas-disciplinas/:ofertaId/planos-ensino", autenticar, controller.listar);
planoEnsinoRouter.post("/turmas-disciplinas/:ofertaId/planos-ensino", autenticar, controller.criar);
planoEnsinoRouter.put("/planos-ensino/:id", autenticar, controller.atualizar);
planoEnsinoRouter.post("/planos-ensino/:id/submeter", autenticar, controller.submeter);
planoEnsinoRouter.post("/planos-ensino/:id/aprovar", autenticar, controller.aprovar);
planoEnsinoRouter.post("/planos-ensino/:id/arquivar", autenticar, controller.arquivar);

