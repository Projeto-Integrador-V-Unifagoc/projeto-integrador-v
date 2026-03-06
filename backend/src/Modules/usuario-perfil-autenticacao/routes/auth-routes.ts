import { Router } from 'express';
import { AutenticacaoController } from '../controller/autenticacao-controller';

const router = Router();
const controller = new AutenticacaoController();

router.post('/login', (req, res) => controller.login(req, res));

export default router;