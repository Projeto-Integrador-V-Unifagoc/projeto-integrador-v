import { Router } from 'express';
import { MatriculaController } from '../controller/matriculaController';

const router = Router();
const controller = new MatriculaController();

router.get('/matriculas', (req, res) => controller.listarTodas(req, res));

router.get('/matriculas/detalhadas', (req, res) => controller.listarTodasComDetalhes(req, res));

router.get('/matriculas/:id', (req, res) => controller.buscarPorId(req, res));

router.get('/matriculas/aluno/:alunoId', (req, res) => controller.listarPorAluno(req, res));

router.get('/matriculas/aluno/:alunoId/detalhadas', (req, res) => controller.listarPorAlunoComDetalhes(req, res));

router.post('/matriculas', (req, res) => controller.criarMatricula(req, res));

router.patch('/matriculas/:id/status', (req, res) => controller.atualizarStatus(req, res));

router.patch('/matriculas/:id/cancelar', (req, res) => controller.cancelarMatricula(req, res));

router.get('/alunos/buscar', (req, res) => controller.buscarAluno(req, res));

router.get('/alunos/:alunoId', (req, res) => controller.buscarAlunoPorId(req, res));

router.get('/turmas/disponiveis/:cursoId', (req, res) => controller.listarTurmasDisponiveis(req, res));

export default router;
