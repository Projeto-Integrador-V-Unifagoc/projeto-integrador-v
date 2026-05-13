import express from 'express';
import cors from 'cors';
import { AlunoController } from './Modules/modulo-gestao-alunos/controller/AlunoController';
import { CidadeController } from './Modules/cidades/controller/CidadeController';
import { FaculdadeController } from './Modules/modulo-facul-dp-curso/controller/FaculdadeController';
import { DepartamentoController } from './Modules/modulo-facul-dp-curso/controller/DepartamentoController';
import CursoController from './Modules/modulo-facul-dp-curso/controller/CursoController';
import {DisciplinaController} from './Modules/modulo-status-matricula-disciplina/controller/DisciplinaController';
import {MatriculaController} from './Modules/modulo-status-matricula-disciplina/controller/MatriculaController';


const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors({
    origin: '*',
}))

app.use(express.json());

const alunoController = new AlunoController();
const cidadeController = new CidadeController()
const faculdadeController = new FaculdadeController()
const departamentoController = new DepartamentoController()
const cursoController = new CursoController()
const disciplinaController = new DisciplinaController()
const matriculaController = new MatriculaController()

app.post('/alunos', (req, res) => alunoController.criarAluno(req, res))
app.post('/faculdades', (req, res) => faculdadeController.criarFaculdade(req, res))
app.post('/departamentos', (req, res) => departamentoController.criarDepartamento(req, res))
app.post('/cursos', (req, res) => cursoController.criarCurso(req, res))

app.post('/statusDisciplina', (req, res) => disciplinaController.criarStatusMatriculaDisciplina(req, res))
app.post('/statusCurso', (req, res) => matriculaController.criarStatusMatriculaCurso(req, res))




app.get('/statusDisciplina', (req, res) => disciplinaController.listarStatusMatriculaDisciplina(req, res))
app.get('/statusDisciplina/:id', (req, res) => disciplinaController.buscarStatusMatriculaDisciplinaPorId(req, res))

app.get('/statusCurso', (req, res) => matriculaController.listarStatusMatriculaCurso(req, res))
app.get('/statusCurso/:id', (req, res) => matriculaController.buscarStatusMatriculaCursoPorId(req, res))




app.get('/alunos', (req, res) => alunoController.listarAlunos(req, res))
app.get('/alunos/id/:id', (req, res) => alunoController.buscarAlunoPorId(req, res))
app.get('/alunos/:matricula', (req, res) => alunoController.buscarAlunoPorMatricula(req, res))
app.put('/alunos/:matricula', (req, res) => alunoController.atualizarAluno(req, res))

app.get('/cidades', (req, res) => cidadeController.listarCidades(req, res))
app.get('/cidades/:ibge', (req, res) => cidadeController.buscarCidadePorIbge(req, res))

app.get('/faculdades', (req, res) => faculdadeController.listarFaculdades(req, res))
app.get('/faculdades/:id', (req, res) => faculdadeController.buscarFaculdadePorId(req, res))

app.get('/departamentos', (req, res) => departamentoController.listarDepartamentos(req, res))
app.get('/departamentos/:id', (req, res) => departamentoController.buscarDepartamentoPorId(req, res))

app.get('/cursos', (req, res) => cursoController.listarCursos(req, res))
app.get('/cursos/:id', (req, res) => cursoController.buscarCursoPorId(req, res))


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});