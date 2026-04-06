import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export const autenticar = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ erro: "Token não fornecido. Acesso negado." });
  }

  // Separa o "Bearer" do "Token"
  const [, token] = authHeader.split(' ');

  try {
    const secret = process.env.JWT_SECRET || 'segredo';
    const decoded = jwt.verify(token, secret) as any;

    // Salva os dados do crachá na requisição para o próximo middleware usar
    (req as any).user = {
      id: decoded.id,
      perfil: decoded.perfil 
    };

    return next();
  } catch (err) {
    return res.status(401).json({ 
      success: false, 
      message: "Token inválido ou expirado." 
    });
  }
};