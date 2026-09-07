import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface DadosEmailRecuperacao {
  nome: string;
  email: string;
  token: string;
}

class EmailService {
  private transporter?: Transporter;

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
    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      throw new Error(
        'A variável FRONTEND_URL não foi configurada.'
      );
    }

    const modoTeste = this.estaEmModoTeste();

    const remetenteEmail =
      process.env.SMTP_FROM_EMAIL ||
      process.env.SMTP_USER ||
      (modoTeste ? 'nao-responda@unieduca.local' : '');

    if (!remetenteEmail) {
      throw new Error(
        'O endereço de e-mail remetente não foi configurado.'
      );
    }

    const remetenteNome =
      process.env.SMTP_FROM_NAME || 'UniEduca';

    const enderecoFrontend = frontendUrl.replace(/\/+$/, '');

    const linkRecuperacao =
      `${enderecoFrontend}/redefinir-senha` +
      `?token=${encodeURIComponent(dados.token)}`;

    const nomeSeguro = this.escaparHtml(dados.nome);

    const transporter = this.obterTransporter();

    await transporter.sendMail({
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
}

export default new EmailService();