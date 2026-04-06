import { Router } from 'express';
import { MatriculaController } from '../controller/matriculaController';

const router = Router();
const controller = new MatriculaController();

router.get('/matriculas', (req, res) => controller.listarTodas(req, res));
router.get('/matriculas/aluno/:alunoId', (req, res) => controller.listarPorAluno(req, res));
router.post('/matriculas', (req, res) => controller.criarMatricula(req, res));

export default router;
