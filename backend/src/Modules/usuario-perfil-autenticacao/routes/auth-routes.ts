import { Router } from 'express';
import AutenticacaoController from '../controller/autenticacao-controller';
import { autenticar } from '../../../middlewares/autenticacao';
const router = Router();

router.post('/login', (req, res) => AutenticacaoController.login(req, res));

router.post('/cadastro', (req, res) => AutenticacaoController.cadastrar(req, res));

router.get('/me', autenticar, (req, res) => AutenticacaoController.me(req, res));

router.get('/usuarios', autenticar, (req, res) => AutenticacaoController.listar(req, res));


router.delete('/usuarios/:id', autenticar, (req, res) => AutenticacaoController.excluir(req, res));

export default router;
