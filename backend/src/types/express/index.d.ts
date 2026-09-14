import "express";

declare global {
  namespace Express {
    interface Request {
      /** Populado pelo middleware `autenticar` a partir do JWT. */
      user?: {
        id: string;
        tipo_usuario: string;
      };
    }
  }
}
