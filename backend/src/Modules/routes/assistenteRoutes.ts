import { Router } from "express";

import { AssistenteController } from "../assistente/controller/AssistenteController";
import { autenticar } from "../../middlewares/autenticacao";
import { limiteAssistente } from "../../config/limitesRequisicoes";
import { somenteSecretariaOuAdmin } from "../modulo-matricula/middlewares/perfilAdministrativo";

const controller = new AssistenteController();
export const assistenteRouter = Router();

const administrativo = [autenticar, somenteSecretariaOuAdmin];

assistenteRouter.get("/assistente/status", autenticar, (req, res) => controller.status(req, res));
assistenteRouter.post("/assistente/mensagens", autenticar, limiteAssistente, (req, res) =>
    controller.enviarMensagem(req, res),
);

assistenteRouter.get("/assistente/configuracao", ...administrativo, (req, res) =>
    controller.buscarConfiguracao(req, res),
);
assistenteRouter.put("/assistente/configuracao", ...administrativo, (req, res) =>
    controller.atualizarConfiguracao(req, res),
);
assistenteRouter.post("/assistente/configuracao/testar", ...administrativo, (req, res) =>
    controller.testarConexao(req, res),
);
