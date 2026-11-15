import { Router } from "express";
import { autenticar } from "../../middlewares/autenticacao";
import { soSecretaria } from "../../middlewares/autorizacao";
import { HomeCoordenacaoController } from "../home-coordenacao/controller/HomeCoordenacaoController";

const controller = new HomeCoordenacaoController();
export const homeCoordenacaoRouter = Router();
homeCoordenacaoRouter.get("/coordenacao/dashboard", autenticar, soSecretaria, controller.dashboard);

