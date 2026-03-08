import { Router } from 'express';
import { AutenticacaoController } from '../controller/autenticacao-controller';

const router = Router();
const controller = new AutenticacaoController();

router.post('/login', (req, res) => controller.login(req, res));

router.post('/cadastro', (req, res) => {
  const { nome, email, senha, perfil } = req.body;

  if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({
      mensagem: "Todos os campos obrigatórios devem ser preenchidos"
    });
  }

  return res.status(201).json({
    mensagem: "Sucesso mockado"
  });
});

export default router;