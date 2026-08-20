import { Router } from 'express';
import { avaliacaoController } from '../avaliacao/controller/avaliacaoController.js';
import { autenticar } from '../../middlewares/autenticacao.js';
import { secretariaOuProfessor } from '../../middlewares/autorizacao.js';

const avaliacaoRouter = Router();

avaliacaoRouter.use(autenticar, secretariaOuProfessor);

avaliacaoRouter.get('/', avaliacaoController.listarTodos);
avaliacaoRouter.get('/atribuicoes', avaliacaoController.listarAtribuicoes);
avaliacaoRouter.get('/:id', avaliacaoController.buscarPorId);
avaliacaoRouter.post('/', avaliacaoController.criar);
avaliacaoRouter.put('/:id', avaliacaoController.atualizar);
avaliacaoRouter.delete('/:id', avaliacaoController.deletar);

export { avaliacaoRouter };
