import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface DadosEmailRecuperacao {
  nome: string;
  email: string;
  token: string;
}

interface DadosEmailInstitucional {
  para: string;
  nomeDestinatario: string;
  remetenteNome: string;
  remetenteEmail: string;
  assunto: string;
  titulo: string;
  mensagem: string;
  destaques?: Array<{ rotulo: string; valor: string }>;
  acao?: { rotulo: string; url: string };
}

export interface TransporteSmtp {
  host: string;
  porta: number;
  seguro: boolean;
  usuario: string;
  senha: string;
  remetenteNome?: string;
  remetenteEmail?: string;
}

class EmailService {
  private transporter?: Transporter;
  private transporte: TransporteSmtp | null = null;
  private assinaturaDoTransporter = '';

  get remetentePadrao(): { nome: string; email: string } {
    return {
      nome: this.transporte?.remetenteNome || process.env.SMTP_FROM_NAME || 'UniEduca',
      email:
        this.transporte?.remetenteEmail ||
        process.env.SMTP_FROM_EMAIL ||
        process.env.SMTP_USER ||
        '',
    };
  }

  private estaEmModoTeste(): boolean {
    return process.env.EMAIL_MODO_TESTE === 'true';
  }

  private obterTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const modoTeste = this.estaEmModoTeste();

    if (modoTeste) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'O modo de teste de e-mail não pode ser utilizado em produção.'
        );
      }

      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });

      return this.transporter;
    }

    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_SECURE,
      SMTP_USER,
      SMTP_PASSWORD,
    } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
      throw new Error(
        'As configurações SMTP não foram informadas.'
      );
    }

    const porta = Number(SMTP_PORT || 587);

    if (
      !Number.isInteger(porta) ||
      porta <= 0 ||
      porta > 65535
    ) {
      throw new Error('A porta SMTP informada é inválida.');
    }

    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: porta,
      secure: SMTP_SECURE === 'true',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    return this.transporter;
  }

  private assinaturaDe(config: TransporteSmtp | null): string {
    if (!config) return '';

    return [
      config.host,
      config.porta,
      config.seguro,
      config.usuario,
      config.senha,
    ].join('|');
  }

  private encerrarTransporter(): void {
    try {
      this.transporter?.close();
    } catch (erro) {
      console.warn('[email] falha ao encerrar a conexao anterior:', erro);
    }

    this.transporter = undefined;
  }

  definirTransporte(config: TransporteSmtp | null): void {
    const assinatura = this.assinaturaDe(config);

    if (assinatura === this.assinaturaDoTransporter && this.transporter) {
      this.transporte = config;
      return;
    }

    this.encerrarTransporter();
    this.transporte = config;
    this.assinaturaDoTransporter = assinatura;
  }

  private obterTransporteAtivo(): Transporter {
    if (this.estaEmModoTeste()) {
      return this.obterTransporter();
    }

    if (!this.transporte) {
      return this.obterTransporter();
    }

    if (this.transporter) {
      return this.transporter;
    }

    const { host, porta, seguro, usuario, senha } = this.transporte;

    if (!host || !usuario || !senha) {
      throw new Error(
        'As configurações SMTP não foram informadas. Preencha o servidor de e-mail nas configurações.'
      );
    }

    if (!Number.isInteger(porta) || porta <= 0 || porta > 65535) {
      throw new Error('A porta SMTP informada é inválida.');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: porta,
      secure: seguro,
      auth: { user: usuario, pass: senha },
      pool: true,
      maxConnections: 2,
      maxMessages: 50,
      rateDelta: 1000,
      rateLimit: 3,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });

    this.assinaturaDoTransporter = this.assinaturaDe(this.transporte);

    return this.transporter;
  }

  async verificarConexao(config: TransporteSmtp): Promise<void> {
    const anterior = this.transporte;

    try {
      this.definirTransporte(config);
      await this.obterTransporteAtivo().verify();
    } finally {
      this.definirTransporte(anterior ?? null);
    }
  }

  private ehFalhaTemporaria(erro: any): boolean {
    const codigo = Number(erro?.responseCode ?? 0);

    if (codigo >= 400 && codigo < 500) return true;

    return ['ETIMEDOUT', 'ECONNRESET', 'ESOCKET', 'ECONNECTION'].includes(
      String(erro?.code ?? '')
    );
  }

  private async enviarComRetentativa(
    mensagem: Record<string, unknown>,
    tentativas = 2
  ): Promise<void> {
    let ultimoErro: any;

    for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
      try {
        await this.obterTransporteAtivo().sendMail(mensagem);
        return;
      } catch (erro: any) {
        ultimoErro = erro;

        if (!this.ehFalhaTemporaria(erro) || tentativa === tentativas) {
          throw erro;
        }

        console.warn(
          `[email] falha temporaria (${erro?.responseCode ?? erro?.code}) na tentativa ${tentativa}; repetindo...`
        );

        this.encerrarTransporter();

        await new Promise((resolver) => setTimeout(resolver, tentativa * 2000));
      }
    }

    throw ultimoErro;
  }

  private escaparHtml(valor: string): string {
    return valor
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async enviarRecuperacaoSenha(
    dados: DadosEmailRecuperacao
  ): Promise<void> {
    const frontendUrl = process.env.URL_PORTAL || process.env.FRONTEND_URL;

    if (!frontendUrl) {
      throw new Error(
        'A variável FRONTEND_URL não foi configurada.'
      );
    }

    const modoTeste = this.estaEmModoTeste();

    const remetenteEmail =
      this.remetentePadrao.email ||
      (modoTeste ? 'nao-responda@unieduca.local' : '');

    if (!remetenteEmail) {
      throw new Error(
        'O endereço de e-mail remetente não foi configurado.'
      );
    }

    const remetenteNome = this.remetentePadrao.nome;

    const enderecoFrontend = frontendUrl.replace(/\/+$/, '');

    const linkRecuperacao =
      `${enderecoFrontend}/redefinir-senha` +
      `?token=${encodeURIComponent(dados.token)}`;

    const nomeSeguro = this.escaparHtml(dados.nome);

    await this.enviarComRetentativa({
      from: `"${remetenteNome}" <${remetenteEmail}>`,
      to: dados.email,
      subject: 'Recuperação de senha — UniEduca',

      text: [
        `Olá, ${dados.nome}.`,
        '',
        'Recebemos uma solicitação para redefinir sua senha.',
        `Acesse o link: ${linkRecuperacao}`,
        '',
        'O link é válido por 30 minutos.',
        'Se você não solicitou essa alteração, ignore este e-mail.',
      ].join('\n'),

      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Recuperação de senha</h2>

          <p>Olá, ${nomeSeguro}.</p>

          <p>
            Recebemos uma solicitação para redefinir
            sua senha no UniEduca.
          </p>

          <p>
            <a
              href="${linkRecuperacao}"
              style="
                display: inline-block;
                padding: 12px 20px;
                background-color: #1976d2;
                color: #ffffff;
                text-decoration: none;
                border-radius: 6px;
              "
            >
              Redefinir minha senha
            </a>
          </p>

          <p>Este link é válido por 30 minutos.</p>

          <p>
            Se você não solicitou essa alteração,
            ignore este e-mail.
          </p>
        </div>
      `,
    });
  }

  async enviarMensagemInstitucional(
    dados: DadosEmailInstitucional
  ): Promise<void> {
    const remetenteEmail = dados.remetenteEmail || this.remetentePadrao.email;

    if (!remetenteEmail) {
      throw new Error(
        'O endereço de e-mail remetente não foi configurado.'
      );
    }

    const nomeSeguro = this.escaparHtml(dados.nomeDestinatario);
    const tituloSeguro = this.escaparHtml(dados.titulo);
    const mensagemSegura = this.escaparHtml(dados.mensagem)
      .split('\n')
      .filter((linha) => linha.trim().length > 0)
      .map((linha) => `<p style="margin:0 0 14px;line-height:1.6;">${linha}</p>`)
      .join('');

    const destaques = (dados.destaques ?? [])
      .map(
        (item) => `
          <tr>
            <td style="padding:8px 0;color:#5b6472;font-size:13px;width:150px;">
              ${this.escaparHtml(item.rotulo)}
            </td>
            <td style="padding:8px 0;color:#1f2733;font-size:14px;font-weight:600;">
              ${this.escaparHtml(item.valor)}
            </td>
          </tr>`
      )
      .join('');

    const blocoDestaques = destaques
      ? `<table style="width:100%;border-collapse:collapse;margin:8px 0 22px;
                       background:#f5f8fb;border-radius:10px;padding:8px 16px;">
           ${destaques}
         </table>`
      : '';

    const blocoAcao = dados.acao
      ? `<p style="margin:26px 0 8px;">
           <a href="${dados.acao.url}"
              style="display:inline-block;padding:13px 26px;background:#05b5e6;color:#ffffff;
                     text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">
             ${this.escaparHtml(dados.acao.rotulo)}
           </a>
         </p>`
      : '';

    const textoDestaques = (dados.destaques ?? [])
      .map((item) => `${item.rotulo}: ${item.valor}`)
      .join('\n');

    await this.enviarComRetentativa({
      from: `"${dados.remetenteNome}" <${remetenteEmail}>`,
      to: dados.para,
      subject: dados.assunto,

      text: [
        `Olá, ${dados.nomeDestinatario}.`,
        '',
        dados.mensagem,
        textoDestaques ? `\n${textoDestaques}` : '',
        dados.acao ? `\n${dados.acao.rotulo}: ${dados.acao.url}` : '',
        '',
        'UniEduca — este é um e-mail automático, não responda.',
      ]
        .filter((linha) => linha !== '')
        .join('\n'),

      html: `
        <div style="margin:0;padding:28px 12px;background:#eef2f6;
                    font-family:Arial,Helvetica,sans-serif;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;
                      border-radius:14px;overflow:hidden;
                      box-shadow:0 2px 10px rgba(16,24,40,.08);">

            <div style="background:#05b5e6;padding:22px 30px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;
                           letter-spacing:.3px;">UniEduca</span>
            </div>

            <div style="padding:30px;color:#1f2733;">
              <h1 style="margin:0 0 18px;font-size:21px;color:#0f1720;">
                ${tituloSeguro}
              </h1>

              <p style="margin:0 0 14px;line-height:1.6;">Olá, ${nomeSeguro}.</p>

              ${mensagemSegura}
              ${blocoDestaques}
              ${blocoAcao}
            </div>

            <div style="padding:18px 30px;background:#f7f9fb;
                        border-top:1px solid #e6ebf0;color:#79828f;font-size:12px;">
              Este é um e-mail automático da UniEduca. Não responda a esta mensagem.
            </div>
          </div>
        </div>
      `,
    });
  }
}

export default new EmailService();