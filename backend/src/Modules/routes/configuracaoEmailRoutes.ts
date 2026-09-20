import { Router } from "express";
import { ConfiguracaoEmailController } from "../configuracao-email/controller/ConfiguracaoEmailController.js";
import { autenticar } from "../../middlewares/autenticacao.js";
import { somenteSecretariaOuAdmin } from "../modulo-matricula/middlewares/perfilAdministrativo.js";

const controller = new ConfiguracaoEmailController();
export const configuracaoEmailRouter = Router();

const administrativo = [autenticar, somenteSecretariaOuAdmin];

configuracaoEmailRouter.get("/configuracoes/email", ...administrativo, (req, res) =>
    controller.listar(req, res),
);
configuracaoEmailRouter.get("/configuracoes/email/smtp", ...administrativo, (req, res) =>
    controller.buscarSmtp(req, res),
);
configuracaoEmailRouter.put("/configuracoes/email/smtp", ...administrativo, (req, res) =>
    controller.atualizarSmtp(req, res),
);
configuracaoEmailRouter.post("/configuracoes/email/smtp/testar-conexao", ...administrativo, (req, res) =>
    controller.testarConexao(req, res),
);
configuracaoEmailRouter.get("/configuracoes/email/remetentes", ...administrativo, (req, res) =>
    controller.listarRemetentes(req, res),
);
configuracaoEmailRouter.post("/configuracoes/email/remetentes", ...administrativo, (req, res) =>
    controller.adicionarRemetente(req, res),
);
configuracaoEmailRouter.delete("/configuracoes/email/remetentes/:id", ...administrativo, (req, res) =>
    controller.removerRemetente(req, res),
);
configuracaoEmailRouter.post("/configuracoes/email/:chave/enviar-teste", ...administrativo, (req, res) =>
    controller.enviarTeste(req, res),
);
configuracaoEmailRouter.patch("/configuracoes/email/:chave", ...administrativo, (req, res) =>
    controller.atualizar(req, res),
);
