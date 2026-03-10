/**
 * Nesse codigo, a gente organiza as rotas de entrada do sistema, como o login e 
 * o cadastro. Ele serve para dizer qual caminho o usuario deve seguir para cada acao.
 */

import { Router } from 'express';
import { AutenticacaoController } from '../controller/autenticacao-controller';

const router = Router();
const controller = new AutenticacaoController();

// Direciona quem quer fazer login para o controlador que a gente criou
router.post('/login', (req, res) => controller.login(req, res));

router.post('/cadastro', (req, res) => {
  // Pega as informações que a pessoa digitou no cadastro
  const { nome, email, senha, perfil } = req.body;

  // Confere se o usuário não esqueceu de preencher nada importante
  if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({
      mensagem: "Todos os campos obrigatórios devem ser preenchidos"
    });
  }

  // Retorna que o cadastro "deu certo" para não travar o resto do grupo
  return res.status(201).json({
    mensagem: "Sucesso mockado"
  });
});

export default router;