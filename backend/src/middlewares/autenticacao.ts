import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export const autenticar = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ erro: "Token não fornecido. Acesso negado." });
  }
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2) {
    return res.status(401).json({ erro: "Erro no formato do token (Bearer esperado)." });
  }

  const [scheme, token] = parts;

  try {
    const secret = process.env.JWT_SECRET || 'segredo';
    const decoded = jwt.verify(token, secret) as any;

    (req as any).user = {
      id: decoded.id,
      tipo_usuario: decoded.tipo_usuario 
    };

    return next();
  } catch (err: any) {
    console.error("❌ Erro na validação do JWT:", err.message);
    
    return res.status(401).json({ 
      success: false, 
      message: "Token inválido ou expirado. Faça login novamente." 
    });
  }
};