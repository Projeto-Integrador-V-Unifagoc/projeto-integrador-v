import { Request, Response } from 'express';
import AutenticacaoService from '../services/autenticacao-services';

class AutenticacaoController {
  async cadastrar(req: Request, res: Response) {
    try {
      // 1. Pegue o 'nome' do corpo da requisição
      const { nome, email, senha, tipo_usuario } = req.body; 

      // 2. Valide se o nome foi enviado
      if (!nome || !email || !senha || !tipo_usuario) {
        return res.status(400).json({
          error: 'Nome, Email, senha e tipo_usuario são obrigatórios',
        });
      }

      // 3. Passe o 'nome' para o Service
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
          nome: usuario.nome, // 4. Retorne o nome para o frontend confirmar
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
    const { email, senha } = req.body; // 🚨 CUIDADO: Se o front enviar 'Email', mude aqui para 'Email'

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Agora o resultado contém { token, usuario }
    const { token, usuario } = await AutenticacaoService.login(email, senha);

    return res.status(200).json({
      token,
      user: usuario // Aqui a gente cria a etiqueta 'user' que o seu React procura
    });
  } catch (error: any) {
      console.error('Erro no login:', error);
      return res.status(401).json({ error: error?.message || 'Erro ao realizar login' });
    }
  }
}

export default new AutenticacaoController();