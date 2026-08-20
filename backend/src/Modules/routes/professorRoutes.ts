import { Router } from 'express';
import { professorController } from '../professor/controller/professorController.js';
import { autenticar } from '../../middlewares/autenticacao.js';
import { soSecretaria } from '../../middlewares/autorizacao.js';

const professorRouter = Router();
professorRouter.use(autenticar, soSecretaria);
professorRouter.get('/opcoes', professorController.listarOpcoes);
professorRouter.get('/', professorController.listarTodos);
professorRouter.post('/', professorController.criar);
professorRouter.get('/:id', professorController.buscarPorId);
professorRouter.put('/:id', professorController.atualizar);
professorRouter.delete('/:id', professorController.inativar);
professorRouter.patch('/:id/reativar', professorController.reativar);

export { professorRouter };
