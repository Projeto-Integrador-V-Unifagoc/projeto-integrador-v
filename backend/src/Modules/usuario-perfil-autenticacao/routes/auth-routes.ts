import { Router } from 'express';
import AutenticacaoController from '../controller/autenticacao-controller';

const router = Router();

// Rota de Login
router.post('/login', (req, res) => AutenticacaoController.login(req, res));

// Rota de Cadastro (Sua parte!)
router.post('/cadastro', (req, res) => AutenticacaoController.cadastrar(req, res));

export default router;