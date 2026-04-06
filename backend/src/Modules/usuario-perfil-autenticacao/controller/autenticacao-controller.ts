import { Request, Response } from 'express';
import AutenticacaoService from '../services/autenticacao-services';

class AutenticacaoController {
  async cadastrar(req: Request, res: Response) {
    try {
      const { nome, email, senha, tipo_usuario } = req.body; 

      if (!nome || !email || !senha || !tipo_usuario) {
        return res.status(400).json({
          error: 'Nome, Email, senha e tipo_usuario são obrigatórios',
        });
      }

      const usuario = await AutenticacaoService.cadastrarUsuario({
        nome, 
        email,
        senha,
        tipo_usuario,
      });

      return res.status(201).json({
        message: 'Usuário cadastrado com sucesso',
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo_usuario: usuario.tipo_usuario,
        },
      });
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      return res.status(400).json({
        error: error?.message || 'Erro ao cadastrar usuário',
      });
    }
  }

  async login(req: Request, res: Response) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const { token, usuario } = await AutenticacaoService.login(email, senha);

    return res.status(200).json({
      token,
      user: usuario
    });
  } catch (error: any) {
      console.error('Erro no login:', error);
      return res.status(401).json({ error: error?.message || 'Erro ao realizar login' });
    }
  }

  async me(req: Request, res: Response) {
  try {
      const id = (req as any).user.id;
      const usuario = await AutenticacaoService.getMe(id);

      return res.status(200).json({
        success: true,
        data: usuario // Aqui já deve vir sem a senha se você mudou o Service
      });
    } catch (error: any) {
      return res.status(401).json({ success: false, message: error.message });
    }
  }
}

export default new AutenticacaoController();