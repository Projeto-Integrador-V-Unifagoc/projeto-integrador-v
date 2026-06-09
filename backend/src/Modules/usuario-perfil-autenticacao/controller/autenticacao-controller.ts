import { Request, Response } from 'express';
import AutenticacaoService from '../services/autenticacao-services';

class AutenticacaoController {
  async cadastrar(req: Request, res: Response) {
  try {
    const { nome, email, senha, tipo_usuario, aluno_id, professor_id } = req.body;

    if (!nome || !email || !senha || !tipo_usuario) {
      return res.status(400).json({
        error: 'Nome, email, senha e tipo_usuario são obrigatórios',
      });
    }

    const tiposPermitidos = ['aluno', 'professor', 'secretaria'];

    if (!tiposPermitidos.includes(tipo_usuario)) {
      return res.status(400).json({
        error: 'tipo_usuario inválido. Use aluno, professor ou secretaria.',
      });
    }

    const usuario = await AutenticacaoService.cadastrarUsuario({
      nome,
      email,
      senha,
      tipo_usuario,
      aluno_id, // vincula o novo login a um aluno existente
      professor_id, // vincula o novo login a um professor existente
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
        data: usuario
      });
    } catch (error: any) {
      return res.status(401).json({ success: false, message: error.message });
    }
  }

  async listar(req: Request, res: Response) {
    try {
      const usuarios = await AutenticacaoService.listarTodos();
      return res.status(200).json(usuarios);
    } catch (error: any) {
      console.error('Erro ao listar usuários:', error);
      return res.status(500).json({
        error: 'Erro interno ao buscar a lista de usuários.'
      });
    }
  }

  // Lista alunos sem login, para o seletor de vínculo no cadastro de usuário.
  async listarAlunosDisponiveis(req: Request, res: Response) {
    try {
      const alunos = await AutenticacaoService.listarAlunosSemUsuario();
      return res.status(200).json(alunos);
    } catch (error: any) {
      console.error('Erro ao listar alunos disponíveis:', error);
      return res.status(500).json({
        error: 'Erro interno ao buscar alunos disponíveis.'
      });
    }
  }

  // Lista professores sem login, para o seletor de vínculo no cadastro de usuário.
  async listarProfessoresDisponiveis(req: Request, res: Response) {
    try {
      const professores = await AutenticacaoService.listarProfessoresSemUsuario();
      return res.status(200).json(professores);
    } catch (error: any) {
      console.error('Erro ao listar professores disponíveis:', error);
      return res.status(500).json({
        error: 'Erro interno ao buscar professores disponíveis.'
      });
    }
  }

  async excluir(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      
      await AutenticacaoService.excluirUsuario(id); 

      return res.status(200).json({
        message: 'Usuário removido com sucesso', 
      });
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      return res.status(400).json({
        error: error?.message || 'Erro ao excluir usuário',
      });
    }
  }

async atualizar(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { nome, email, senha, tipo_usuario, aluno_id, professor_id } = req.body || {};

        if (
            nome === undefined &&
            email === undefined &&
            senha === undefined &&
            tipo_usuario === undefined &&
            aluno_id === undefined &&
            professor_id === undefined
        ) {
            return res.status(400).json({ error: "Nenhum dado enviado para atualização." });
        }

        await AutenticacaoService.atualizarUsuario(String(id), {
            nome,
            email,
            senha,
            tipo_usuario,
            aluno_id,
            professor_id,
        });

        return res.status(200).json({ message: "Dados atualizados com sucesso!" });
    } catch (error: any) {
        console.error('Erro ao atualizar usuário:', error);
        return res.status(400).json({
            error: error?.message || "Erro interno ao atualizar.",
        });
    }
}
}

export default new AutenticacaoController();