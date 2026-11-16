import { Router } from "express";
import { autenticar } from "../../middlewares/autenticacao";
import { soSecretaria } from "../../middlewares/autorizacao";
import { RequisitoCurricularController } from "../requisito-curricular/controller/RequisitoCurricularController";

const controller = new RequisitoCurricularController();
export const requisitoCurricularRouter = Router();
requisitoCurricularRouter.get("/matrizes-curriculares/:matrizId/requisitos", autenticar, controller.listar);
requisitoCurricularRouter.post("/requisitos-curriculares", autenticar, soSecretaria, controller.criar);
requisitoCurricularRouter.put("/requisitos-curriculares/:id", autenticar, soSecretaria, controller.atualizar);
requisitoCurricularRouter.delete("/requisitos-curriculares/:id", autenticar, soSecretaria, controller.remover);

