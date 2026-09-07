import { Request, Response } from 'express';

import RecuperacaoSenhaService from '../services/recuperacao-senha-service';

class RecuperacaoSenhaController {
  async solicitar(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({
          error: 'O e-mail é obrigatório.',
        });
      }

      await RecuperacaoSenhaService.solicitarRecuperacao(email);

      return res.status(200).json({
        message:
          'Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha.',
      });
    } catch (error) {
      console.error('Erro ao solicitar recuperação de senha:', error);

      return res.status(500).json({
        error:
          'Não foi possível processar a recuperação de senha.',
      });
    }
  }

  async redefinir(req: Request, res: Response) {
    try {
      const {
        token,
        novaSenha,
        confirmarSenha,
      } = req.body;

      if (!token || !novaSenha || !confirmarSenha) {
        return res.status(400).json({
          error:
            'Token, nova senha e confirmação da senha são obrigatórios.',
        });
      }

      if (novaSenha !== confirmarSenha) {
        return res.status(400).json({
          error: 'As senhas informadas não são iguais.',
        });
      }

      await RecuperacaoSenhaService.redefinirSenha(
        token,
        novaSenha
      );

      return res.status(200).json({
        message: 'Senha redefinida com sucesso.',
      });
    } catch (error: any) {
      return res.status(400).json({
        error:
          error?.message ||
          'Não foi possível redefinir a senha.',
      });
    }
  }
}

export default new RecuperacaoSenhaController();