import { Router } from 'express';
import { AvaliacaoController } from '../modules/avaliacoes-vinculo/controller/avaliacao-controller';

const router = Router();

router.post('/', AvaliacaoController.create);

export default router;