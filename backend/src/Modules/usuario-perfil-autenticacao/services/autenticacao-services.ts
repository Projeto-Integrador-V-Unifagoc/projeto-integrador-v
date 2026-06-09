import bcrypt from 'bcrypt';
import { UsuarioRepository } from '../repository/usuario-repository';
import jwt from 'jsonwebtoken';

class AutenticacaoService {
  private usuarioRepository = new UsuarioRepository();

  async cadastrarUsuario(dados: any) {
    const { nome, email, senha, tipo_usuario, aluno_id, professor_id } = dados;

    if (!nome || !email || !senha || !tipo_usuario) {
      throw new Error('Preencha todos os campos obrigatórios.');
    }

    const tipoUsuarioFormatado = tipo_usuario.toLowerCase();

    const usuarioExiste = await this.usuarioRepository.findByEmail(email);
    if (usuarioExiste) {
      throw new Error('Este e-mail já está cadastrado.');
    }

    // Se for aluno e veio um aluno para vincular, valida ANTES de criar o usuário.
    if (tipoUsuarioFormatado === 'aluno' && aluno_id) {
      const aluno = await this.usuarioRepository.buscarAlunoSimples(aluno_id);
      if (!aluno) {
        throw new Error('Aluno selecionado não encontrado.');
      }
      if (aluno.usuario_id) {
        throw new Error('Este aluno já possui um login vinculado.');
      }
    }

    // Mesma validação para professor.
    if (tipoUsuarioFormatado === 'professor' && professor_id) {
      const professor = await this.usuarioRepository.buscarProfessorSimples(professor_id);
      if (!professor) {
        throw new Error('Professor selecionado não encontrado.');
      }
      if (professor.usuario_id) {
        throw new Error('Este professor já possui um login vinculado.');
      }
    }

    const saltRounds = 10;
    const senhaCriptografada = await bcrypt.hash(senha, saltRounds);

    const novoUsuario = await this.usuarioRepository.create({
      nome,
      email,
      senha: senhaCriptografada,
      tipo_usuario: tipoUsuarioFormatado,
    });

    // Vincula o aluno/professor ao usuário recém-criado (define usuario_id).
    // O id é um UUID (string).
    if (tipoUsuarioFormatado === 'aluno' && aluno_id) {
      await this.usuarioRepository.vincularUsuarioAoAluno(aluno_id, String(novoUsuario.id));
    } else if (tipoUsuarioFormatado === 'professor' && professor_id) {
      await this.usuarioRepository.vincularUsuarioAoProfessor(professor_id, String(novoUsuario.id));
    }

    return novoUsuario;
  }

  // Lista alunos sem login, para o seletor de vínculo no cadastro de usuário.
  async listarAlunosSemUsuario() {
    return await this.usuarioRepository.listarAlunosSemUsuario();
  }

  // Lista professores sem login, para o seletor de vínculo no cadastro de usuário.
  async listarProfessoresSemUsuario() {
    return await this.usuarioRepository.listarProfessoresSemUsuario();
  }

  async login(email: string, senha: string) {
    const usuario = await this.usuarioRepository.findByEmail(email);

    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      throw new Error('Senha inválida');
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        tipo_usuario: usuario.tipo_usuario,
      },
      process.env.JWT_SECRET || 'segredo',
      {
        expiresIn: '1h',
      }
    );

    return { 
      token, 
      usuario: { 
        id: usuario.id,
        nome: usuario.nome, 
        email: usuario.email, 
        tipo_usuario: usuario.tipo_usuario 
      } 
    };
  }

  async getMe(id: string) {
    const usuario = await this.usuarioRepository.buscarPorId(id);

    if (!usuario) {
      throw new Error("Usuário não encontrado!");
    }

    const { senha, ...dadosSeguros } = usuario;

    // Busca o aluno/professor vinculado e monta os blocos de dados pessoais e acadêmicos.
    let pessoa: any = null;
    let academico: any = null;

    if (usuario.tipo_usuario === 'aluno') {
      const aluno = await this.usuarioRepository.buscarAlunoPorUsuario(id);
      if (aluno) {
        pessoa = this.montarPessoa(aluno);
        academico = {
          curso: aluno.curso_nome ?? null,
          curso_codigo: aluno.curso_codigo ?? null,
          periodo: aluno.periodo ?? null,
        };
      }
    } else if (usuario.tipo_usuario === 'professor') {
      const professor = await this.usuarioRepository.buscarProfessorPorUsuario(id);
      if (professor) {
        pessoa = this.montarPessoa(professor);
        academico = {
          curso: professor.curso_nome ?? null,
          curso_codigo: professor.curso_codigo ?? null,
          faculdade: professor.faculdade_nome ?? null,
        };
      }
    }

    // secretaria (ou aluno/professor sem vínculo) retorna apenas os dados do usuário.
    return { ...dadosSeguros, pessoa, academico };
  }

  // Extrai os campos de pessoa de uma linha "achatada" vinda do join.
  private montarPessoa(row: any) {
    return {
      nome: row.pessoa_nome ?? null,
      cpf: row.cpf ?? null,
      data_nascimento: row.data_nascimento ?? null,
      logradouro: row.logradouro ?? null,
      numero: row.numero ?? null,
      bairro: row.bairro ?? null,
      estado: row.estado ?? null,
      cep: row.cep ?? null,
    };
  }

  async listarTodos() {
    return await this.usuarioRepository.findAll();
  }

  
 async excluirUsuario(id: string) {
    
    const usuario = await this.usuarioRepository.buscarPorId(id);

    if (!usuario) {
      throw new Error('Usuário não encontrado'); 
    }

    
    return await this.usuarioRepository.delete(id); 
  }
}

export default new AutenticacaoService();