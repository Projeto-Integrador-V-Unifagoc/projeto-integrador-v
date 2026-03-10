/**
 * Nesse codigo, ele recebe os dados de quem está tentando entrar (email e senha) 
 * e decide se libera o acesso ou se barra a entrada, entregando o crachá (token).
 */

import { Request, Response } from 'express';
import { AutenticacaoServices } from '../services/autenticacao-services';

const service = new AutenticacaoServices();

export class AutenticacaoController {
    async login (req: Request, res: Response) {
        // Pega o e-mail e a senha que o usuário preencheu no formulário
        const { email, senha } = req.body;
        // Chama o serviço para conferir se esses dados estão corretos
        const resultado = await service.validarLogin(email, senha);
        // Se o login der certo, ele entra aqui
        if (resultado.sucesso) {
            return res.status(200).json({
                mensagem: "Login bem-sucedido",
                // Entrega o crachá (token) para o usuário usar nas próximas páginas
                token: resultado.token
            });
        }
        // Se os dados estiverem errados, ele avisa que o acesso não foi permitido
        return res.status(401).json({
            mensagem: "Credenciais inválidas"
        });
    }
}