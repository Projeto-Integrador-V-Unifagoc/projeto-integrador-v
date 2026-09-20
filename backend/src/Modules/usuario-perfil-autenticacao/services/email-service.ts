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

  async aquecerConexao(): Promise<void> {
    if (this.estaEmModoTeste() || !this.transporte) return;

    const inicio = Date.now();

    try {
      await this.obterTransporteAtivo().verify();
      console.log(`[email] conexão SMTP pronta em ${Date.now() - inicio}ms`);
    } catch (erro: any) {
      console.warn(`[email] não foi possível pré-abrir a conexão SMTP: ${erro?.message ?? erro}`);
    }
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

  private blocoEnderecoAlternativo(url: string): string {
    let endereco: URL;

    try {
      endereco = new URL(url);
    } catch {
      return '';
    }

    const local = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i.test(endereco.hostname);
    if (local) return '';

    const semParametros = `${endereco.origin}${endereco.pathname}`;

    return `<p style="margin:14px 0 0;font-size:12px;color:#93a0ad;line-height:1.6;">
              Se o botão não funcionar, acesse
              <span style="color:#14688f;word-break:break-all;">${this.escaparHtml(semParametros)}</span>
              e siga pelo próprio site.
            </p>`;
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
        (item, indice) => `
          <tr>
            <td style="padding:12px 18px;color:#6b7684;font-size:12px;letter-spacing:.4px;
                       text-transform:uppercase;font-weight:700;width:150px;
                       border-top:${indice === 0 ? '0' : '1px solid #e4ecf2'};">
              ${this.escaparHtml(item.rotulo)}
            </td>
            <td style="padding:12px 18px;color:#14688f;font-size:15px;font-weight:700;
                       border-top:${indice === 0 ? '0' : '1px solid #e4ecf2'};">
              ${this.escaparHtml(item.valor)}
            </td>
          </tr>`
      )
      .join('');

    const blocoDestaques = destaques
      ? `<table role="presentation" cellpadding="0" cellspacing="0"
                style="width:100%;border-collapse:separate;border-spacing:0;margin:24px 0;
                       background:#f4f9fc;border:1px solid #e0ecf4;border-radius:12px;">
           ${destaques}
         </table>`
      : '';

    const blocoAcao = dados.acao
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px 0 8px;">
           <tr>
             <td align="center"
                 style="border-radius:10px;background:#05b5e6;
                        box-shadow:0 6px 18px rgba(5,181,230,.35);">
               <a href="${dados.acao.url}"
                  style="display:inline-block;padding:16px 38px;color:#ffffff;
                         text-decoration:none;font-weight:700;font-size:16px;
                         font-family:Arial,Helvetica,sans-serif;letter-spacing:.2px;">
                 ${this.escaparHtml(dados.acao.rotulo)}
               </a>
             </td>
           </tr>
         </table>
         ${this.blocoEnderecoAlternativo(dados.acao.url)}`
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
        dados.acao ? `\n${dados.acao.rotulo}: use o botão "${dados.acao.rotulo}" nesta mensagem.` : '',
        '',
        'UniEduca — este é um e-mail automático, não responda.',
      ]
        .filter((linha) => linha !== '')
        .join('\n'),

      html: `
        <div style="margin:0;padding:0;background:#eaf3f8;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="#eaf3f8"
               style="width:100%;background-color:#eaf3f8;
                      background-image:
                        radial-gradient(circle at 12% 8%, rgba(5,181,230,.14) 0, transparent 38%),
                        radial-gradient(circle at 88% 18%, rgba(20,104,143,.12) 0, transparent 42%),
                        repeating-linear-gradient(135deg, rgba(20,104,143,.045) 0 2px, transparent 2px 14px),
                        linear-gradient(180deg,#d9edf7 0%,#eaf3f8 340px);
                      font-family:Arial,Helvetica,sans-serif;padding:36px 12px;">
          <tr>
            <td align="center">

              <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                     style="max-width:580px;width:100%;background:#ffffff;border-radius:16px;
                            overflow:hidden;box-shadow:0 12px 34px rgba(20,104,143,.16);">

                <tr>
                  <td style="background:#14688f;
                             background-image:linear-gradient(120deg,#0f5878 0%,#14688f 45%,#05b5e6 100%);
                             padding:34px 34px 30px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right:12px;vertical-align:middle;">
                          <div style="width:42px;height:42px;border-radius:11px;
                                      background:rgba(255,255,255,.18);text-align:center;
                                      line-height:42px;font-size:21px;">&#127891;</div>
                        </td>
                        <td style="vertical-align:middle;">
                          <span style="color:#ffffff;font-size:25px;font-weight:800;
                                       letter-spacing:.4px;">Uni<span
                            style="color:#9fe6ff;">Educa</span></span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0;color:rgba(255,255,255,.88);font-size:13px;
                              letter-spacing:.5px;text-transform:uppercase;font-weight:700;">
                      Secretaria Acadêmica
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:36px 34px 34px;color:#3d4753;font-size:15px;">
                    <h1 style="margin:0 0 6px;font-size:23px;line-height:1.3;color:#14688f;
                               font-weight:800;">
                      ${tituloSeguro}
                    </h1>
                    <div style="width:52px;height:4px;border-radius:4px;background:#05b5e6;
                                margin:0 0 22px;"></div>

                    <p style="margin:0 0 16px;line-height:1.7;font-size:16px;color:#1f2733;">
                      Olá, <strong>${nomeSeguro}</strong>.
                    </p>

                    ${mensagemSegura}
                    ${blocoDestaques}
                    ${blocoAcao}
                  </td>
                </tr>

                <tr>
                  <td style="padding:22px 34px;background:#f4f8fb;border-top:1px solid #e2ecf3;">
                    <p style="margin:0 0 6px;color:#14688f;font-size:13px;font-weight:700;">
                      UniEduca
                    </p>
                    <p style="margin:0;color:#8b97a4;font-size:12px;line-height:1.7;">
                      Este é um e-mail automático. Não responda a esta mensagem.<br>
                      Dúvidas? Fale com a secretaria pelo site.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0;color:#8ba4b5;font-size:11px;">
                &copy; UniEduca. Todos os direitos reservados.
              </p>

            </td>
          </tr>
        </table>
        </div>
      `,
    });
  }
}

export default new EmailService();