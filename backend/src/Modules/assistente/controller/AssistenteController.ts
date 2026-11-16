import type { Request, Response } from "express";

import { perfilDoUsuario } from "../conhecimento/carregador";
import { AssistenteErro } from "../service/AssistenteErro";
import type { AssistenteService } from "../service/AssistenteService";
import type { ConfiguracaoIaService } from "../service/ConfiguracaoIaService";

/**
 * Os serviços (e o LangChain, que leva vários segundos para carregar) só entram na primeira requisição.
 * Importar no topo deixava a subida do app, e todo teste que importa o app, bem mais lenta.
 */
let assistentePadrao: Promise<AssistenteService> | undefined;
let configuracaoPadrao: Promise<ConfiguracaoIaService> | undefined;
const carregarAssistente = (): Promise<AssistenteService> =>
    (assistentePadrao ??= import("../service/AssistenteService").then((m) => new m.AssistenteService()));
const carregarConfiguracao = (): Promise<ConfiguracaoIaService> =>
    (configuracaoPadrao ??= import("../service/ConfiguracaoIaService").then((m) => new m.ConfiguracaoIaService()));

function responderErro(res: Response, err: unknown) {
    if (err instanceof AssistenteErro) {
        return res.status(err.status).json({ error: err.message });
    }
    console.error("[assistente] erro inesperado:", (err as Error)?.message);
    return res.status(500).json({ error: "Erro ao processar o assistente." });
}

export class AssistenteController {
    constructor(
        private readonly obterAssistente: () => Promise<AssistenteService> = carregarAssistente,
        private readonly obterConfiguracao: () => Promise<ConfiguracaoIaService> = carregarConfiguracao,
    ) {}

    async status(_req: Request, res: Response) {
        try {
            res.status(200).json({ ativo: await (await this.obterConfiguracao()).estaAtivo() });
        } catch (err) {
            responderErro(res, err);
        }
    }

    async enviarMensagem(req: Request, res: Response) {
        try {
            // Identidade e perfil vêm sempre do token (já validado por `autenticar`), nunca do corpo:
            // são eles que definem quais artigos a IA enxerga e de quem ela pode consultar dados.
            const usuario = (req as any).user;
            if (!usuario?.id || !perfilDoUsuario(usuario.tipo_usuario)) {
                throw new AssistenteErro(403, "Seu perfil não tem acesso ao assistente.");
            }

            // `acao`: botões de IA das telas (opcional); a instrução interna é montada no serviço.
            const { mensagem, historico, acao } = req.body ?? {};
            res.status(200).json(
                await (await this.obterAssistente()).responder({ id: String(usuario.id), tipo_usuario: String(usuario.tipo_usuario) }, mensagem, historico, acao),
            );
        } catch (err) {
            responderErro(res, err);
        }
    }

    async buscarConfiguracao(_req: Request, res: Response) {
        try {
            res.status(200).json(await (await this.obterConfiguracao()).buscarPublico());
        } catch (err) {
            responderErro(res, err);
        }
    }

    async atualizarConfiguracao(req: Request, res: Response) {
        try {
            res.status(200).json(await (await this.obterConfiguracao()).atualizar(req.body ?? {}));
        } catch (err) {
            responderErro(res, err);
        }
    }

    async testarConexao(_req: Request, res: Response) {
        try {
            res.status(200).json(await (await this.obterConfiguracao()).testarConexao());
        } catch (err) {
            responderErro(res, err);
        }
    }
}
