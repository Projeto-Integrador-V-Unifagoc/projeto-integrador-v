/**
 * Nesse código, fazemos a validação do login e geramos o token seguro (o crachá). 
 * Ele já leva o ID e o perfil do usuário "escondidos" lá dentro para sabermos quem ele é.
 */

import jwt from 'jsonwebtoken';

export class AutenticacaoServices {
        async validarLogin(email: string, senha: string) {
            //Confere se o e-mail e a senha batem com o que definimos para teste
            if (email === "admin@teste.com" && senha === "123456") {
                //Cria a lista de informações que vão ficar guardadas dentro do token
                const payload = {
                    id: 1,
                    email: email,
                    perfil: "admin"
                };
            //Puxa a chave de segurança
            const secret = process.env.JWT_SECRET || ' ';
            //Gera o crachá de acesso que vai valer por apenas 1 hora
            const token = jwt.sign(payload, secret, { expiresIn: '1h' });
            //Retorna que deu tudo certo e entrega o crachá
            return { sucesso: true, token };
        }
        //Se os dados não baterem, avisa que o login falhou
        return { sucesso: false};
    }
}