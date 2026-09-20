import { ConfiguracaoEmailService, ConfiguracaoEmailError } from "../service/ConfiguracaoEmailService";
import { ConfiguracaoSmtpService } from "../service/ConfiguracaoSmtpService";

const service = new ConfiguracaoEmailService();
const smtpService = new ConfiguracaoSmtpService();

function responderErro(res: any, err: any) {
    if (err instanceof ConfiguracaoEmailError) {
        return res.status(err.status).json({ error: err.message });
    }
    return res.status(500).json({ error: "Erro ao processar a configuração de e-mail." });
}

export class ConfiguracaoEmailController {
    async listar(_req: any, res: any) {
        try {
            res.status(200).json(await service.listar());
        } catch (err) {
            responderErro(res, err);
        }
    }

    async atualizar(req: any, res: any) {
        try {
            res.status(200).json(await service.atualizar(req.params.chave, req.body ?? {}));
        } catch (err) {
            responderErro(res, err);
        }
    }

    async buscarSmtp(_req: any, res: any) {
        try {
            res.status(200).json(await smtpService.buscarPublico());
        } catch (err) {
            responderErro(res, err);
        }
    }

    async atualizarSmtp(req: any, res: any) {
        try {
            res.status(200).json(await smtpService.atualizar(req.body ?? {}));
        } catch (err) {
            responderErro(res, err);
        }
    }

    async testarConexao(_req: any, res: any) {
        try {
            res.status(200).json(await smtpService.testarConexao());
        } catch (err) {
            responderErro(res, err);
        }
    }

    async listarRemetentes(_req: any, res: any) {
        try {
            res.status(200).json(await smtpService.listarRemetentes());
        } catch (err) {
            responderErro(res, err);
        }
    }

    async adicionarRemetente(req: any, res: any) {
        try {
            res.status(201).json(await smtpService.adicionarRemetente(req.body ?? {}));
        } catch (err) {
            responderErro(res, err);
        }
    }

    async removerRemetente(req: any, res: any) {
        try {
            res.status(200).json(await smtpService.removerRemetente(req.params.id));
        } catch (err) {
            responderErro(res, err);
        }
    }

    async enviarTeste(req: any, res: any) {
        try {
            res.status(200).json(await smtpService.enviarTeste(req.params.chave, req.body?.destinatario));
        } catch (err) {
            responderErro(res, err);
        }
    }
}
