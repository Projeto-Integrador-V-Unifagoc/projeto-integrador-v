import { Request, Response } from 'express';
import { AutenticacaoServices } from '../services/autenticacao-services';

const service = new AutenticacaoServices();

export class AutenticacaoController {
    async login (req: Request, res: Response) {
        const { email, senha } = req.body;

        const resultado = await service.validarLogin(email, senha);

        if (resultado.sucesso) {
            return res.status(200).json({
                mensagem: "Login bem-sucedido",
                token: resultado.token
            });
        }

        return res.status(401).json({
            mensagem: "Credenciais inválidas"
        });
    }
}