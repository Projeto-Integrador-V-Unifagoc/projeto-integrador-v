import { Request, Response, NextFunction } from 'express';

// Secretaria e Administrador têm acesso total.
const ehAdmin = (tipoUsuario?: string) =>
  tipoUsuario === 'secretaria' || tipoUsuario === 'administrador';

export const soSecretaria = (req: Request, res: Response, next: NextFunction) => {
  const usuario = (req as any).user;

  if (usuario && ehAdmin(usuario.tipo_usuario)) {
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
    (ehAdmin(usuario.tipo_usuario) || usuario.tipo_usuario === 'professor')
  ) {
    return next();
  }

  return res.status(403).json({
    erro: "Acesso negado."
  });
};