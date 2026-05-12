import { Router } from 'express';
import { avaliacaoController } from '../avaliacao/controller/avaliacaoController.js';

const avaliacaoRouter = Router();

avaliacaoRouter.get('/', avaliacaoController.listarTodos);
avaliacaoRouter.get('/:id', avaliacaoController.buscarPorId);
avaliacaoRouter.post('/', avaliacaoController.criar);
avaliacaoRouter.put('/:id', avaliacaoController.atualizar);
avaliacaoRouter.delete('/:id', avaliacaoController.deletar);

export { avaliacaoRouter };
