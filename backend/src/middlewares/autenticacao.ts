/**
 * Nesse código, o sistema funciona como um porteiro. Ele verifica se o usuário
 * mandou o token e se esse token é verdadeiro antes de deixar ele seguir viagem.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const autenticar = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    // Se não enviou o token, barra o acesso aqui
    if (!authHeader) {
        return res.status(401).json({ message: 'Token de autenticação não fornecido' });
    }
    // Pega apenas a parte do código do token, ignorando o "Bearer"
    const token = authHeader.split(' ')[1];

    try {
        const secret = process.env.JWT_SECRET || 'process.env.JWT_SECRET';
        const decoded = jwt.verify(token, secret);
        // Salva as informações do usuário para usar depois
        (req as any).user = decoded;
        next();
    } catch (error) {
        // Se o token estiver errado, dá erro de inválido
        return res.status(401).json({ message: 'Token de autenticação inválido' });
    }
}