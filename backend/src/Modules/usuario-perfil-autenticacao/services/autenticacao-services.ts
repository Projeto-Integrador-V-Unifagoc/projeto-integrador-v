import bcrypt from 'bcrypt';
import { UsuarioRepository } from '../repository/usuario-repository';
import jwt from 'jsonwebtoken';

class AutenticacaoService {
  private usuarioRepository = new UsuarioRepository();

  async cadastrarUsuario(dados: any) {
    const { nome, email, senha, tipo_usuario } = dados;

    if (!nome || !email || !senha || !tipo_usuario) {
      throw new Error('Preencha todos os campos obrigatórios.');
    }

    const tipoUsuarioFormatado = tipo_usuario.toLowerCase();

    const usuarioExiste = await this.usuarioRepository.findByEmail(email);
    if (usuarioExiste) {
      throw new Error('Este e-mail já está cadastrado.');
    }

    const saltRounds = 10;
    const senhaCriptografada = await bcrypt.hash(senha, saltRounds);

    const novoUsuario = await this.usuarioRepository.create({
      nome,
      email,
      senha: senhaCriptografada,
      tipo_usuario: tipoUsuarioFormatado,
    });

    return novoUsuario;
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

    return dadosSeguros;
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