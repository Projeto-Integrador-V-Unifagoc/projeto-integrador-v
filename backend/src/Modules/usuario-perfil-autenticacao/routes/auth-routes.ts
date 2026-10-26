import { Router } from 'express';
import { validarRecaptcha } from '../../../middlewares/recaptcha';
import {
  limiteLogin,
  limiteLoginPorConta,
  limiteRecuperacaoSenha,
  limiteRedefinicaoSenha,
} from '../../../config/limitesRequisicoes';
import AutenticacaoController from '../controller/autenticacao-controller';
import RecuperacaoSenhaController from '../controller/recuperacao-senha-controller';
import { autenticar } from '../../../middlewares/autenticacao';
import { soSecretaria } from '../../../middlewares/autorizacao';


const router = Router();

// LOGIN
router.post('/login', limiteLogin, validarRecaptcha, limiteLoginPorConta, (req, res) => {
  return AutenticacaoController.login(req, res);
});

// SOLICITAR RECUPERAÇÃO DE SENHA
router.post('/recuperacao-senha', limiteRecuperacaoSenha, validarRecaptcha, (req, res) => {
  return RecuperacaoSenhaController.solicitar(req, res);
});

// REDEFINIR SENHA USANDO O TOKEN
router.post('/redefinir-senha', limiteRedefinicaoSenha, (req, res) => {
  return RecuperacaoSenhaController.redefinir(req, res);
});

// CADASTRO - SOMENTE SECRETARIA
router.post('/cadastro', autenticar, soSecretaria, (req, res) => {
  return AutenticacaoController.cadastrar(req, res);
});

// USUÁRIO LOGADO
router.get('/me', autenticar, (req, res) => {
  return AutenticacaoController.me(req, res);
});

// LISTAR USUÁRIOS - SOMENTE SECRETARIA
router.get('/usuarios', autenticar, soSecretaria, (req, res) => {
  return AutenticacaoController.listar(req, res);
});

// LISTAR ALUNOS SEM LOGIN (para vincular no cadastro) - SOMENTE SECRETARIA
router.get('/alunos-disponiveis', autenticar, soSecretaria, (req, res) => {
  return AutenticacaoController.listarAlunosDisponiveis(req, res);
});

// LISTAR PROFESSORES SEM LOGIN (para vincular no cadastro) - SOMENTE SECRETARIA
router.get('/professores-disponiveis', autenticar, soSecretaria, (req, res) => {
  return AutenticacaoController.listarProfessoresDisponiveis(req, res);
});

// DELETAR USUÁRIO - SOMENTE SECRETARIA
router.delete('/usuarios/:id', autenticar, soSecretaria, (req, res) => {
  return AutenticacaoController.excluir(req, res);
});

// ATUALIZAR USUÁRIO - SOMENTE SECRETARIA
router.put('/usuarios/:id', autenticar, soSecretaria, (req, res) => {
  return AutenticacaoController.atualizar(req, res);
});

export default router;
