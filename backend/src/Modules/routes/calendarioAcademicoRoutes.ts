import { Router } from "express";
import { autenticar } from "../../middlewares/autenticacao";
import { soSecretaria } from "../../middlewares/autorizacao";
import { CalendarioAcademicoController } from "../calendario-academico/controller/CalendarioAcademicoController";

const controller = new CalendarioAcademicoController();
export const calendarioAcademicoRouter = Router();
calendarioAcademicoRouter.get("/periodos-letivos/:periodoId/calendario", autenticar, controller.listar);
calendarioAcademicoRouter.post("/periodos-letivos/:periodoId/calendario", autenticar, soSecretaria, controller.criar);
calendarioAcademicoRouter.put("/calendario-academico/eventos/:id", autenticar, soSecretaria, controller.atualizar);
calendarioAcademicoRouter.delete("/calendario-academico/eventos/:id", autenticar, soSecretaria, controller.remover);
calendarioAcademicoRouter.post("/periodos-letivos/:periodoId/aulas/gerar", autenticar, soSecretaria, controller.gerar);
