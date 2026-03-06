import jwt from 'jsonwebtoken';

export class AutenticacaoServices {
        async validarLogin(email: string, senha: string) {
            if (email === "admin@teste.com" && senha === "123456") {
                const payload = {
                    id: 1,
                    email: email,
                    role: "admin"
                };
            
            const secret = process.env.JWT_SECRET || 'chave-secreta-padrao';
            const token = jwt.sign(payload, secret, { expiresIn: '1h' });

            return { sucesso: true, token };
        }

        return { sucesso: false};
    }
}