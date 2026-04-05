import { Router } from 'express';
import { professorController } from '../professor-vinculos/controller/professorController.js';

const professorRouter = Router();

professorRouter.get('/', professorController.listarTodos);
professorRouter.get('/:id', professorController.buscarPorId);
professorRouter.post('/', professorController.criar);
professorRouter.put('/:id', professorController.atualizar);
professorRouter.delete('/:id', professorController.remover);

export { professorRouter };