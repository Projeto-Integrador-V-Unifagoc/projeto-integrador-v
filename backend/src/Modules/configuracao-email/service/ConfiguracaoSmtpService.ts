import emailService from "../../usuario-perfil-autenticacao/services/email-service";
import type { TransporteSmtp } from "../../usuario-perfil-autenticacao/services/email-service";
import { ConfiguracaoSmtpRepository } from "../repository/ConfiguracaoSmtpRepository";
import { EmailRemetenteRepository } from "../repository/EmailRemetenteRepository";
import { ConfiguracaoEmailRepository } from "../repository/ConfiguracaoEmailRepository";
import type { ChaveDisparador } from "../repository/ConfiguracaoEmailRepository";
import { cifrar, decifrar } from "./CriptografiaSegredo";
import { ConfiguracaoEmailError } from "./ConfiguracaoEmailService";

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SmtpPublico {
    host: string;
    porta: number;
    seguro: boolean;
    usuario: string;
    remetente_nome: string;
    remetente_email: string;
    ativo: boolean;
    senha_definida: boolean;
    modo_teste: boolean;
    testado_em: string | null;
    resultado_teste: string;
}

export class ConfiguracaoSmtpService {
    private repo = new ConfiguracaoSmtpRepository();
    private disparadores = new ConfiguracaoEmailRepository();
    private remetentes = new EmailRemetenteRepository();

    listarRemetentes() {
        return this.remetentes.listar();
    }

    async adicionarRemetente(body: any) {
        const email = String(body?.email ?? "").trim().toLowerCase();
        const nome = String(body?.nome ?? "").trim() || "UniEduca";

        if (!FORMATO_EMAIL.test(email)) {
            throw new ConfiguracaoEmailError(400, "Informe um e-mail válido.");
        }

        const existentes = await this.remetentes.listar();

        if (existentes.some((item) => item.email === email)) {
            throw new ConfiguracaoEmailError(409, "Este e-mail já está cadastrado.");
        }

        await this.remetentes.criar(email, nome);
        return this.remetentes.listar();
    }

    async removerRemetente(id: string) {
        const lista = await this.remetentes.listar();
        const alvo = lista.find((item) => item.id === id);

        if (!alvo) {
            throw new ConfiguracaoEmailError(404, "Remetente não encontrado.");
        }

        if (await this.remetentes.emUso(alvo.email)) {
            throw new ConfiguracaoEmailError(
                409,
                "Este e-mail está sendo usado por um disparador. Troque o remetente do disparador antes de excluir.",
            );
        }

        await this.remetentes.remover(id);
        return this.remetentes.listar();
    }

    private emModoTeste(): boolean {
        return process.env.EMAIL_MODO_TESTE === "true";
    }

    async buscarPublico(): Promise<SmtpPublico> {
        const config = await this.repo.buscar();

        return {
            host: config?.host ?? "",
            porta: config?.porta ?? 465,
            seguro: config?.seguro ?? true,
            usuario: config?.usuario ?? "",
            remetente_nome: config?.remetente_nome ?? "UniEduca",
            remetente_email: config?.remetente_email ?? "",
            ativo: config?.ativo ?? false,
            senha_definida: Boolean(config?.senha_cifrada),
            modo_teste: this.emModoTeste(),
            testado_em: config?.testado_em ?? null,
            resultado_teste: config?.resultado_teste ?? "",
        };
    }

    async transporteAtual(): Promise<TransporteSmtp | null> {
        const config = await this.repo.buscar();

        if (!config || !config.ativo || !config.host || !config.usuario || !config.senha_cifrada) {
            return null;
        }

        return {
            host: config.host,
            porta: config.porta,
            seguro: config.seguro,
            usuario: config.usuario,
            senha: decifrar(config.senha_cifrada),
            remetenteNome: config.remetente_nome,
            remetenteEmail: config.remetente_email || config.usuario,
        };
    }

    async aplicarNoEmailService(): Promise<void> {
        try {
            emailService.definirTransporte(await this.transporteAtual());
        } catch (erro) {
            console.error("[smtp] não foi possível aplicar a configuração salva:", erro);
            emailService.definirTransporte(null);
        }
    }

    async atualizar(body: any): Promise<SmtpPublico> {
        const host = String(body?.host ?? "").trim();
        const usuario = String(body?.usuario ?? "").trim();
        const remetenteEmail = String(body?.remetente_email ?? "").trim();
        const remetenteNome = String(body?.remetente_nome ?? "").trim() || "UniEduca";
        const porta = Number(body?.porta);
        const ativo = body?.ativo === true || body?.ativo === "true";

        if (!host) throw new ConfiguracaoEmailError(400, "Informe o servidor SMTP.");
        if (!Number.isInteger(porta) || porta <= 0 || porta > 65535) {
            throw new ConfiguracaoEmailError(400, "Informe uma porta SMTP válida (1 a 65535).");
        }
        if (!usuario) throw new ConfiguracaoEmailError(400, "Informe o usuário do SMTP.");
        if (remetenteEmail && !FORMATO_EMAIL.test(remetenteEmail)) {
            throw new ConfiguracaoEmailError(400, "Informe um e-mail remetente válido.");
        }

        const atual = await this.repo.buscar();
        const senhaInformada = String(body?.senha ?? "");

        if (ativo && !senhaInformada && !atual?.senha_cifrada) {
            throw new ConfiguracaoEmailError(400, "Informe a senha da caixa postal para ativar o envio.");
        }

        await this.repo.atualizar({
            host,
            porta,
            seguro: body?.seguro === true || body?.seguro === "true",
            usuario,
            remetente_nome: remetenteNome,
            remetente_email: remetenteEmail || usuario,
            ativo,
            ...(senhaInformada ? { senha_cifrada: cifrar(senhaInformada) } : {}),
        });

        await this.aplicarNoEmailService();
        return this.buscarPublico();
    }

    async testarConexao(): Promise<{ sucesso: boolean; mensagem: string }> {
        if (this.emModoTeste()) {
            return {
                sucesso: true,
                mensagem:
                    "O backend está em EMAIL_MODO_TESTE=true: nada é enviado de verdade. Desligue esse modo para testar o servidor.",
            };
        }

        const transporte = await this.transporteAtual();

        if (!transporte) {
            throw new ConfiguracaoEmailError(400, "Preencha e ative o servidor de e-mail antes de testar a conexão.");
        }

        try {
            await emailService.verificarConexao(transporte);
            await this.repo.registrarTeste(true, "conexão estabelecida");
            return { sucesso: true, mensagem: "Conexão com o servidor de e-mail estabelecida." };
        } catch (erro: any) {
            const mensagem = this.traduzirErro(erro);
            await this.repo.registrarTeste(false, mensagem);
            throw new ConfiguracaoEmailError(502, mensagem);
        }
    }

    async enviarTeste(chave: string, destinatario: string): Promise<{ sucesso: boolean; mensagem: string }> {
        const email = String(destinatario ?? "").trim().toLowerCase();

        if (!FORMATO_EMAIL.test(email)) {
            throw new ConfiguracaoEmailError(400, "Informe um e-mail de destino válido para o teste.");
        }

        const disparador = await this.disparadores.buscarPorChave(chave as ChaveDisparador);

        if (!disparador) {
            throw new ConfiguracaoEmailError(404, "Disparador não encontrado.");
        }

        await this.aplicarNoEmailService();

        try {
            await emailService.enviarMensagemInstitucional({
                para: email,
                nomeDestinatario: "Teste de configuração",
                remetenteNome: disparador.remetente_nome,
                remetenteEmail: disparador.remetente_email,
                assunto: `[TESTE] ${disparador.assunto}`,
                titulo: disparador.titulo,
                mensagem: disparador.mensagem,
                destaques: [
                    { rotulo: "Disparador", valor: disparador.nome },
                    { rotulo: "Enviado em", valor: new Date().toLocaleString("pt-BR") },
                ],
            });

            if (this.emModoTeste()) {
                return {
                    sucesso: true,
                    mensagem:
                        "Mensagem gerada, mas o backend está em EMAIL_MODO_TESTE=true e nada foi enviado de verdade.",
                };
            }

            await this.repo.registrarTeste(true, `envio de teste para ${email}`);
            return { sucesso: true, mensagem: `E-mail de teste enviado para ${email}.` };
        } catch (erro: any) {
            const mensagem = this.traduzirErro(erro);
            await this.repo.registrarTeste(false, mensagem);
            throw new ConfiguracaoEmailError(502, mensagem);
        }
    }

    private traduzirErro(erro: any): string {
        const texto = String(erro?.message ?? erro ?? "");
        const codigo = String(erro?.code ?? "");

        if (codigo === "EAUTH" || /invalid login|authentication failed/i.test(texto)) {
            return "Usuário ou senha do e-mail recusados pelo servidor. Confira as credenciais da caixa postal.";
        }
        if (codigo === "ECONNECTION" || codigo === "ECONNREFUSED" || /ECONNREFUSED/i.test(texto)) {
            return "Não foi possível conectar ao servidor SMTP. Confira o endereço e a porta.";
        }
        if (codigo === "ETIMEDOUT" || /timeout/i.test(texto)) {
            return "O servidor de e-mail não respondeu a tempo. Confira a porta e se o provedor bloqueia a conexão.";
        }
        if (codigo === "ESOCKET" || /wrong version number|SSL/i.test(texto)) {
            return "Falha de SSL/TLS. Use a porta 465 com SSL ligado, ou 587 com SSL desligado.";
        }
        if (/getaddrinfo|ENOTFOUND/i.test(texto)) {
            return "O endereço do servidor SMTP não foi encontrado. Confira o host.";
        }
        if (/queue file write error|4\.3\.0/i.test(texto)) {
            return (
                "O provedor recusou temporariamente o envio (limite de mensagens seguidas). " +
                "Aguarde alguns minutos e teste de novo. Os disparos automáticos já tentam reenviar sozinhos."
            );
        }
        if (/550|553|relay access denied|sender address rejected/i.test(texto)) {
            return "O servidor recusou o endereço remetente. Use uma caixa postal do próprio domínio.";
        }

        return texto || "Não foi possível enviar o e-mail.";
    }
}
