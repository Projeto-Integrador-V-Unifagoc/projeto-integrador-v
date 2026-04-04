import { Request, Response } from 'express';
import AutenticacaoService from '../services/autenticacao-services';

class AutenticacaoController {

    async cadastrar(req: Request, res: Response) {
        try {
            const { nome, email, senha, perfil } = req.body;

            // validação básica
            if (!nome || !email || !senha || !perfil) {
                return res.status(400).json({
                    error: "Todos os campos são obrigatórios"
                });
            }

            const usuario = await AutenticacaoService.cadastrarUsuario(req.body);

            return res.status(201).json({
                message: "Usuário cadastrado com sucesso",
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email
                }
            });

        } catch (error: any) {
            console.error("Erro no cadastro:", error);

            return res.status(400).json({
                error: error?.message || "Erro ao cadastrar usuário"
            });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const { email, senha } = req.body;

            // validação básica
            if (!email || !senha) {
                return res.status(400).json({
                    error: "Email e senha são obrigatórios"
                });
            }

            const resultado = await AutenticacaoService.login(email, senha);

            return res.status(200).json(resultado);

        } catch (error: any) {
            console.error("Erro no login:", error);

            return res.status(401).json({
                error: error?.message || "Erro ao realizar login"
            });
        }
    }
}

export default new AutenticacaoController();