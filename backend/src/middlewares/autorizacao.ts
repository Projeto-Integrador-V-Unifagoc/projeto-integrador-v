import { Request, Response, NextFunction } from 'express';

export const soSecretaria = (req: Request, res: Response, next: NextFunction) => {
  const usuario = (req as any).user;

  if (usuario && usuario.tipo_usuario === 'secretaria') {
    return next();
  }

  return res.status(403).json({
    erro: "Acesso negado. Apenas secretaria."
  });
};

export const secretariaOuProfessor = (req: Request, res: Response, next: NextFunction) => {
  const usuario = (req as any).user;

  if (
    usuario &&
    (usuario.tipo_usuario === 'secretaria' || usuario.tipo_usuario === 'professor')
  ) {
    return next();
  }

  return res.status(403).json({
    erro: "Acesso negado."
  });
};