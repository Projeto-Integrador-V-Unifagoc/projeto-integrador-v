import emailService from "../../usuario-perfil-autenticacao/services/email-service";
import { ConfiguracaoEmailRepository, type ChaveDisparador } from "../repository/ConfiguracaoEmailRepository";
import { filaDeEmails } from "./FilaDeEmails";

interface DadosNotificacao {
    para: string;
    nomeDestinatario: string;
    destaques?: Array<{ rotulo: string; valor: string }>;
    acao?: { rotulo: string; url: string };
}

export class NotificacaoService {
    constructor(private readonly repository = new ConfiguracaoEmailRepository()) {}

    private semBarraFinal(url: string): string {
        return url.trim().replace(/\/+$/, "");
    }

    private urlDoSite(): string {
        const site = this.semBarraFinal(process.env.SITE_URL ?? "");
        return site || this.semBarraFinal(process.env.FRONTEND_URL ?? "");
    }

    private urlPortal(): string {
        const portal = this.semBarraFinal(process.env.URL_PORTAL ?? "");
        return portal || this.semBarraFinal(process.env.FRONTEND_URL ?? "");
    }

    async disparar(
        chave: ChaveDisparador,
        dados: DadosNotificacao,
        aoFalhar?: (erro: unknown) => Promise<void> | void,
    ): Promise<boolean> {
        if (!dados.para) return false;

        const configuracao = await this.repository.buscarPorChave(chave);
        if (!configuracao || !configuracao.ativo) return false;

        filaDeEmails.enfileirar({
            rotulo: `${chave} para ${dados.para}`,
            aoFalhar,
            executar: () =>
                emailService.enviarMensagemInstitucional({
                    para: dados.para,
                    nomeDestinatario: dados.nomeDestinatario,
                    remetenteNome: configuracao.remetente_nome,
                    remetenteEmail: configuracao.remetente_email,
                    assunto: configuracao.assunto,
                    titulo: configuracao.titulo,
                    mensagem: configuracao.mensagem,
                    destaques: dados.destaques,
                    acao: dados.acao,
                }),
        });

        return true;
    }

    async notificarInscricaoRecebida(dados: {
        email: string;
        nome: string;
        matricula?: number | null;
        curso?: string | null;
    }): Promise<boolean> {
        const destaques: Array<{ rotulo: string; valor: string }> = [];
        if (dados.matricula) destaques.push({ rotulo: "Matrícula", valor: String(dados.matricula) });
        if (dados.curso) destaques.push({ rotulo: "Curso", valor: dados.curso });

        return this.disparar("inscricao_recebida", {
            para: dados.email,
            nomeDestinatario: dados.nome,
            destaques,
        });
    }

    async notificarRecuperacaoSenha(dados: {
        email: string;
        nome: string;
        token: string;
        aoFalhar?: (erro: unknown) => Promise<void> | void;
    }): Promise<boolean> {
        const portal = this.urlPortal();

        if (!portal) {
            throw new Error("Configure FRONTEND_URL ou URL_PORTAL para enviar o link de redefinição.");
        }

        return this.disparar(
            "recuperacao_senha",
            {
                para: dados.email,
                nomeDestinatario: dados.nome,
                destaques: [{ rotulo: "Validade do link", valor: "30 minutos" }],
                acao: {
                    rotulo: "Criar uma nova senha",
                    url: `${portal}/redefinir-senha?token=${encodeURIComponent(dados.token)}`,
                },
            },
            dados.aoFalhar,
        );
    }

    async notificarDocumentacaoReprovada(dados: {
        email: string;
        nome: string;
        alunoId: string;
        matricula?: number | null;
        recusados: Array<{ rotulo: string; motivo: string }>;
    }): Promise<boolean> {
        const destaques: Array<{ rotulo: string; valor: string }> = [];
        if (dados.matricula) destaques.push({ rotulo: "Matrícula", valor: String(dados.matricula) });

        dados.recusados.forEach((item) => {
            destaques.push({ rotulo: item.rotulo, valor: item.motivo || "Reenvie este documento" });
        });

        const site = this.urlDoSite();

        return this.disparar("documentacao_reprovada", {
            para: dados.email,
            nomeDestinatario: dados.nome,
            destaques,
            acao: site
                ? {
                      rotulo: "Clique aqui para reenviar os documentos",
                      url: `${site}/reenviar-documentos?aluno=${encodeURIComponent(dados.alunoId)}`,
                  }
                : undefined,
        });
    }

    async notificarDocumentacaoAprovada(dados: {
        email: string;
        nome: string;
        matricula?: number | null;
        curso?: string | null;
    }): Promise<boolean> {
        const destaques: Array<{ rotulo: string; valor: string }> = [];
        if (dados.matricula) destaques.push({ rotulo: "Matrícula", valor: String(dados.matricula) });
        if (dados.curso) destaques.push({ rotulo: "Curso", valor: dados.curso });
        destaques.push({ rotulo: "Acesso", valor: dados.email });

        const portal = this.urlPortal();

        return this.disparar("documentacao_aprovada", {
            para: dados.email,
            nomeDestinatario: dados.nome,
            destaques,
            acao: portal
                ? { rotulo: "Clique aqui para entrar no portal do aluno", url: `${portal}/login` }
                : undefined,
        });
    }
}

export const notificacaoService = new NotificacaoService();
