import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { obterJwtSecret } from '../config/jwt';

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
  if (!/^Bearer$/i.test(scheme) || !token) {
    return res.status(401).json({ erro: "Erro no formato do token (Bearer esperado)." });
  }

  try {
    const secret = obterJwtSecret();
    const decoded = jwt.verify(token, secret) as any;

    (req as any).user = {
      id: decoded.id,
      tipo_usuario: decoded.tipo_usuario
    };

    const tokenRenovado = jwt.sign(
      { id: decoded.id, tipo_usuario: decoded.tipo_usuario },
      secret,
      { expiresIn: '1h' }
    );
    res.setHeader('x-token-renovado', tokenRenovado);

    return next();
  } catch (err: any) {
    console.error("❌ Erro na validação do JWT:", err.message);
    
    return res.status(401).json({ 
      success: false, 
      message: "Token inválido ou expirado. Faça login novamente." 
    });
  }
};
