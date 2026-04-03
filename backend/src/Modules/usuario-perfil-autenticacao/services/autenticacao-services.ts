import bcrypt from 'bcrypt';
import { UsuarioRepository } from '../repository/usuario-repository';

const usuarioRepository = new UsuarioRepository();

class AutenticacaoService {
    async cadastrarUsuario(dados: any) {
        const { nome, email, senha, perfil } = dados;

        // 1. VALIDAÇÃO DE CAMPOS
        if (!nome || !email || !senha || !perfil) {
            throw new Error("Preencha todos os campos obrigatórios.");
        }

        // 2. FORMATAÇÃO (Garante que o banco aceite o perfil)
        const perfilFormatado = perfil.toLowerCase();

        // 3. SEGURANÇA: Verificar e-mail duplicado
        const usuarioExiste = await usuarioRepository.findByEmail(email);
        if (usuarioExiste) {
            throw new Error("Este e-mail já está cadastrado.");
        }

        // 4. SEGURANÇA: Hash de senha com bcrypt
        const saltRounds = 10;
        const senhaCriptografada = await bcrypt.hash(senha, saltRounds);

        // 5. SALVAMENTO REAL no Postgres do Jhonathan
        const novoUsuario = await usuarioRepository.create({
            nome,
            email,
            senha: senhaCriptografada,
            perfil: perfilFormatado
        });

        return novoUsuario;
    }
}

export default new AutenticacaoService();