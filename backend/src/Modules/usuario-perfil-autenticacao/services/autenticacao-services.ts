import bcrypt from 'bcrypt';
import { UsuarioRepository } from '../repository/usuario-repository';
import jwt from 'jsonwebtoken';

const usuarioRepository = new UsuarioRepository();

class AutenticacaoService {
  async cadastrarUsuario(dados: any) {
    const { email, senha, tipo_usuario } = dados;

    if (!email || !senha || !tipo_usuario) {
      throw new Error('Preencha todos os campos obrigatórios.');
    }

    const tipoUsuarioFormatado = tipo_usuario.toLowerCase();

    const usuarioExiste = await usuarioRepository.findByEmail(email);
    if (usuarioExiste) {
      throw new Error('Este e-mail já está cadastrado.');
    }

    const saltRounds = 10;
    const senhaCriptografada = await bcrypt.hash(senha, saltRounds);

    const novoUsuario = await usuarioRepository.create({
      email,
      senha: senhaCriptografada,
      tipo_usuario: tipoUsuarioFormatado,
    });

    return novoUsuario;
  }

  async login(email: string, senha: string) {
    const usuario = await usuarioRepository.findByEmail(email);

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

    return { token };
  }
}

export default new AutenticacaoService();