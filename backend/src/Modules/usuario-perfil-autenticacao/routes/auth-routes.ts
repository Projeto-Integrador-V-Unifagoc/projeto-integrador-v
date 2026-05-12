import { Router } from 'express';
import AutenticacaoController from '../controller/autenticacao-controller';
import { autenticar } from '../../../middlewares/autenticacao';
import { soSecretaria, secretariaOuProfessor } from '../../../middlewares/autorizacao';

const router = Router();

// LOGIN
router.post('/login', (req, res) => {
  return AutenticacaoController.login(req, res);
});

// CADASTRO
router.post('/cadastro', (req, res) => {
  return AutenticacaoController.cadastrar(req, res);
});

// USUÁRIO LOGADO
router.get('/me', autenticar, (req, res) => {
  return AutenticacaoController.me(req, res);
});

// LISTAR USUÁRIOS
router.get('/usuarios', autenticar, (req, res) => {
  return AutenticacaoController.listar(req, res);
});

// DELETAR USUÁRIO (SÓ SECRETARIA)
router.delete('/usuarios/:id', autenticar, soSecretaria, (req, res) => {
  return AutenticacaoController.excluir(req, res);
});

// ATUALIZAR USUÁRIO (SECRETARIA OU PROFESSOR)
router.put('/usuarios/:id', autenticar, secretariaOuProfessor, (req, res) => {
  return AutenticacaoController.atualizar(req, res);
});

export default router;