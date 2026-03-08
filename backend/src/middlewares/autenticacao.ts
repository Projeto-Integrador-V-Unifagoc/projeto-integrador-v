import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const autenticar = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const secret = process.env.JWT_SECRET || 'process.env.JWT_SECRET';
        const decoded = jwt.verify(token, secret);
        (req as any).user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token de autenticação inválido' });
    }
}