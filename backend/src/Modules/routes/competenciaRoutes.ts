import { Router } from "express";
import { autenticar } from "../../middlewares/autenticacao";
import { soSecretaria } from "../../middlewares/autorizacao";
import { CompetenciaController } from "../competencias/controller/CompetenciaController";

const controller = new CompetenciaController();
export const competenciaRouter = Router();

competenciaRouter.get("/competencias", autenticar, controller.listar);
competenciaRouter.get("/competencias/:id", autenticar, controller.buscar);
competenciaRouter.post("/competencias", autenticar, soSecretaria, controller.criar);
competenciaRouter.put("/competencias/:id", autenticar, soSecretaria, controller.atualizar);
competenciaRouter.patch("/competencias/:id/status", autenticar, soSecretaria, controller.status);
competenciaRouter.delete("/competencias/:id", autenticar, soSecretaria, controller.remover);
