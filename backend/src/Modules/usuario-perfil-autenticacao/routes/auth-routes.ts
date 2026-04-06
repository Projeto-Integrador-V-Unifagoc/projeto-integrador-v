import { Router } from 'express';
import AutenticacaoController from '../controller/autenticacao-controller';
import { autenticar } from '../../../middlewares/autenticacao';
const router = Router();

// Rota de Login (Pública)
router.post('/login', (req, res) => AutenticacaoController.login(req, res));

// Rota de Cadastro (Pública)
router.post('/cadastro', (req, res) => AutenticacaoController.cadastrar(req, res));

// Rota /ME (PROTEGIDA)
// O middleware vem antes do controller para barrar quem não tem token
router.get('/me', autenticar, (req, res) => AutenticacaoController.me(req, res));

export default router;