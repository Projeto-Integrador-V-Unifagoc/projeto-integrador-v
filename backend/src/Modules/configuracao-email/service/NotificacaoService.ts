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

    private urlPortal(): string {
        return (process.env.FRONTEND_URL ?? "").replace(/\/+$/, "");
    }

    async disparar(chave: ChaveDisparador, dados: DadosNotificacao): Promise<boolean> {
        if (!dados.para) return false;

        const configuracao = await this.repository.buscarPorChave(chave);
        if (!configuracao || !configuracao.ativo) return false;

        filaDeEmails.enfileirar({
            rotulo: `${chave} para ${dados.para}`,
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

        const portal = this.urlPortal();

        return this.disparar("documentacao_reprovada", {
            para: dados.email,
            nomeDestinatario: dados.nome,
            destaques,
            acao: portal
                ? {
                      rotulo: "Reenviar documentos",
                      url: `${portal}/reenviar-documentos?aluno=${encodeURIComponent(dados.alunoId)}`,
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
            acao: portal ? { rotulo: "Acessar o portal", url: `${portal}/login` } : undefined,
        });
    }
}

export const notificacaoService = new NotificacaoService();
