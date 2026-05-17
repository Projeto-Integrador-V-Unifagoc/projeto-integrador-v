import express from 'express';
import cors from 'cors';
import { AlunoController } from './Modules/modulo-gestao-alunos/controller/AlunoController';
import { CidadeController } from './Modules/cidades/controller/CidadeController';
import { FaculdadeController } from './Modules/modulo-facul-dp-curso/controller/FaculdadeController';
import { DepartamentoController } from './Modules/modulo-facul-dp-curso/controller/DepartamentoController';
import CursoController from './Modules/modulo-facul-dp-curso/controller/CursoController';
import { DisciplinaController } from './Modules/modulo-disciplinas/controller/DisciplinaController';
import { professorRouter } from './Modules/routes/professorRoutes';
import { avaliacaoRouter } from './Modules/routes/avaliacaoRoutes';
import { frequenciaRouter } from './Modules/routes/frequenciaRoutes';
import { notasRouter } from './Modules/routes/notasRoutes';
import { matriculaRouter } from './Modules/routes/matriculaRoutes';
import { documentoRouter } from './Modules/routes/documentoRoutes';
import {StatusDisciplinaController} from './Modules/modulo-status-matricula-disciplina/controller/DisciplinaController';
import {MatriculaController} from './Modules/modulo-status-matricula-disciplina/controller/MatriculaController';
import authRoutes from './Modules/usuario-perfil-autenticacao/routes/auth-routes';

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use(authRoutes);

const alunoController = new AlunoController();
const cidadeController = new CidadeController()
const faculdadeController = new FaculdadeController()
const departamentoController = new DepartamentoController()
const cursoController = new CursoController()
const disciplinaController = new DisciplinaController()
const statusDisciplinaController = new StatusDisciplinaController()
const statusMatriculaController = new MatriculaController()

app.post('/alunos', (req, res) => alunoController.criarAluno(req, res))
app.put('/alunos/editar-aluno/:matricula', (req, res) => alunoController.atualizarAluno(req, res))
app.post('/statusDisciplina', (req, res) => statusDisciplinaController.criarStatusMatriculaDisciplina(req, res))
app.post('/statusCurso', (req, res) => statusMatriculaController.criarStatusMatriculaCurso(req, res))
app.post('/faculdades', (req, res) => faculdadeController.criarFaculdade(req, res))
app.post('/departamentos', (req, res) => departamentoController.criarDepartamento(req, res))
app.post('/cursos', (req, res) => cursoController.criarCurso(req, res))

app.get('/alunos', (req, res) => alunoController.listarAlunos(req, res))
app.get('/alunos/id/:id', (req, res) => alunoController.buscarAlunoPorId(req, res))
app.get('/alunos/:matricula', (req, res) => alunoController.buscarAlunoPorMatricula(req, res))

app.get('/cidades', (req, res) => cidadeController.listarCidades(req, res));
app.get('/cidades/:ibge', (req, res) => cidadeController.buscarCidadePorIbge(req, res));

app.get('/faculdades', (req, res) => faculdadeController.listarFaculdades(req, res));
app.get('/faculdades/:id', (req, res) => faculdadeController.buscarFaculdadePorId(req, res));

app.get('/departamentos', (req, res) => departamentoController.listarDepartamentos(req, res));
app.get('/departamentos/:id', (req, res) => departamentoController.buscarDepartamentoPorId(req, res));

app.get('/cursos', (req, res) => cursoController.listarCursos(req, res));
app.get('/cursos/:id', (req, res) => cursoController.buscarCursoPorId(req, res));
app.put('/cursos/:id', (req, res) => cursoController.atualizarCurso(req, res));
app.delete('/cursos/:id', (req, res) => cursoController.removerCurso(req, res));

app.get('/disciplinas', (req, res) => disciplinaController.listarDisciplinas(req, res));
app.get('/disciplinas/:id', (req, res) => disciplinaController.buscarDisciplinaPorId(req, res));
app.put('/disciplinas/:id', (req, res) => disciplinaController.atualizarDisciplina(req, res));
app.delete('/disciplinas/:id', (req, res) => disciplinaController.removerDisciplina(req, res));

app.post('/disciplinas', (req, res) => disciplinaController.criarDisciplina(req, res));

app.use('/professores', professorRouter);
app.use('/avaliacoes', avaliacaoRouter);
app.use('/frequencias', frequenciaRouter);
app.use('/notas', notasRouter);
app.use(matriculaRouter);
app.use(documentoRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});