import { Request, Response } from 'express';
import AutenticacaoService from '../services/autenticacao-services';

class AutenticacaoController {
    async cadastrar(req: Request, res: Response) {
        try {
            const usuario = await AutenticacaoService.cadastrarUsuario(req.body);
            
            return res.status(201).json({
                message: "Usuário cadastrado com sucesso!",
                usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email }
            });
        } catch (error: any) {
            // Se der erro, agora o Insomnia vai te dizer o PORQUÊ
            return res.status(400).json({ 
                error: error.message || "Erro interno",
                detalhes: error.toString() 
            });
        }
    }

    // "Esqueleto" para não quebrar as rotas (Tarefa 3)
    async login(req: Request, res: Response) {
        return res.status(200).json({ message: "Rota de login pronta!" });
    }
}

export default new AutenticacaoController();