import { Request, Response, NextFunction } from "express";

export const eAdmin = (req: Request, res: Response, next: NextFunction) => {
    const usuario = (req as any).user; 

    if (usuario && usuario.perfil === "admin") {
        return next();
    }

    return res.status(403).json({ mensagem: "Acesso negado. Somente administradores podem acessar este recurso." });
}