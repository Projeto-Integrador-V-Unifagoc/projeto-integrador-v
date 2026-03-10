/**
 * Nesse codigo, ele faz o controle basico de perfil, garantindo que apenas 
 * o admin acesse as rotas do admin. Se for aluno, ele barra o acesso.
 */

import { Request, Response, NextFunction } from "express";

export const eAdmin = (req: Request, res: Response, next: NextFunction) => {
    // Pega os dados do usuário que o porteiro (autenticação) conferiu antes
    const usuario = (req as any).user; 
    // Se o perfil dele for de 'admin', ele tem permissão para entrar
    if (usuario && usuario.perfil === "admin") {
        return next();// Se o perfil dele for de 'admin', ele tem permissão para entrar
    }

    // Se não for admin, ele barra o acesso e avisa que é proibido
    return res.status(403).json({ mensagem: "Acesso negado. Somente administradores podem acessar este recurso." });
}