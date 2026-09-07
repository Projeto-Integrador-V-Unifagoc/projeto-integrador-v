import bcrypt from 'bcrypt';
import crypto from 'crypto';

import { db } from '../../../database/connection';
import { UsuarioRepository } from '../repository/usuario-repository';
import { RecuperacaoSenhaRepository } from '../repository/recuperacao-senha-repository';
import EmailService from './email-service';
import { validarSenha } from './senha-policy';

const TEMPO_EXPIRACAO_MINUTOS = 30;

class RecuperacaoSenhaService {
  private usuarioRepository = new UsuarioRepository();
  private recuperacaoRepository =
    new RecuperacaoSenhaRepository();

  private gerarHashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }

  async solicitarRecuperacao(email: string): Promise<void> {
    const usuario = await this.usuarioRepository.findByEmail(
      email.trim()
    );

    if (!usuario || !usuario.id) {
      return;
    }

    await this.recuperacaoRepository.invalidarTokensDoUsuario(
      String(usuario.id)
    );

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.gerarHashToken(token);

    const expiraEm = new Date(
      Date.now() + TEMPO_EXPIRACAO_MINUTOS * 60 * 1000
    );

    await this.recuperacaoRepository.criar({
      usuario_id: String(usuario.id),
      token_hash: tokenHash,
      expires_at: expiraEm,
    });

    try {
      await EmailService.enviarRecuperacaoSenha({
        nome: usuario.nome,
        email: usuario.email,
        token,
      });
    } catch (error) {
      await this.recuperacaoRepository.invalidarTokensDoUsuario(
        String(usuario.id)
      );

      throw error;
    }
  }

  async redefinirSenha(
    token: string,
    novaSenha: string
  ): Promise<void> {
    if (!token) {
      throw new Error(
        'O link de recuperação não foi informado.'
      );
    }

    validarSenha(novaSenha);

    const tokenHash = this.gerarHashToken(token);

    await db.transaction(async (transacao) => {
      const recuperacao =
        await this.recuperacaoRepository.consumirTokenValido(
          tokenHash,
          transacao
        );

      if (!recuperacao || !recuperacao.id) {
        throw new Error(
          'Este link de recuperação expirou ou já foi utilizado. Solicite um novo link.'
        );
      }

      const senhaCriptografada = await bcrypt.hash(
        novaSenha,
        10
      );

      const usuariosAtualizados =
        await this.usuarioRepository.update(
          recuperacao.usuario_id,
          {
            senha: senhaCriptografada,
          },
          transacao
        );

      if (usuariosAtualizados === 0) {
        throw new Error(
          'Não foi possível localizar o usuário relacionado.'
        );
      }
    });
  }
}
export default new RecuperacaoSenhaService();
