import { Request, Response, NextFunction } from 'express';

export const eAdmin = (req: Request, res: Response, next: NextFunction) => {
  const usuario = (req as any).user;

  // Verifica se o perfil que veio no Token é 'admin' ou 'professor'
  if (usuario && (usuario.perfil === 'admin' || usuario.perfil === 'professor')) {
    return next();
  }

  return res.status(403).json({ 
    erro: "Acesso negado. Esta área é restrita para administradores." 
  });
};