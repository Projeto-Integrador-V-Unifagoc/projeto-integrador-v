import jwt from 'jsonwebtoken';
import { UsuarioRepository } from '../repository/usuario-repository';

const usuarioRepo = new UsuarioRepository();

export class AuthService {
  async cadastrar(dados: any) {
    return await usuarioRepo.create(dados);
  }

  async buscarPorEmail(email: string) {
    return await usuarioRepo.findByEmail(email);
  }

  async buscarPorId(id: string) {
    return await usuarioRepo.findById(id);
  }

  gerarToken(usuario: { id: string; email: string; perfil: string }) {
    const secret = process.env.JWT_SECRET || '';
    
    if (!secret) {
      throw new Error('JWT_SECRET não configurado');
    }

    const payload = {
      id: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
    };

    return jwt.sign(payload, secret, { expiresIn: '1h' });
  }
}