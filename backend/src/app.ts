import express from "express";
import cors from "cors";
import { AlunoController } from "./Modules/modulo-gestao-alunos/controller/AlunoController";
import { CidadeController } from "./Modules/cidades/controller/CidadeController";
import { FaculdadeController } from "./Modules/modulo-facul-dp-curso/controller/FaculdadeController";
import { DepartamentoController } from "./Modules/modulo-facul-dp-curso/controller/DepartamentoController";
import CursoController from "./Modules/modulo-facul-dp-curso/controller/CursoController";
import { DisciplinaController } from "./Modules/modulo-disciplinas/controller/DisciplinaController";
import { professorRouter } from "./Modules/routes/professorRoutes";
import { homeAlunoRouter } from "./Modules/routes/homeAlunoRoutes";
import { avaliacaoRouter } from "./Modules/routes/avaliacaoRoutes";
import { frequenciaRouter } from "./Modules/routes/frequenciaRoutes";
import { notasRouter } from "./Modules/routes/notasRoutes";
import { matriculaRouter } from "./Modules/routes/matriculaRoutes";
import { documentoRouter } from "./Modules/routes/documentoRoutes";
import { FichaController } from "./Modules/modulo-ficha/controller/FichaController";
import authRoutes from "./Modules/usuario-perfil-autenticacao/routes/auth-routes";
import { autenticar } from "./middlewares/autenticacao";
import { StatusDisciplinaController } from "./Modules/modulo-status-matricula-disciplina/controller/DisciplinaController";
import { MatriculaController } from "./Modules/modulo-status-matricula-disciplina/controller/MatriculaController";
import { PeriodoLetivoController } from "./Modules/modulo-estrutura-academica/controller/PeriodoLetivoController";
import { CursoDisciplinaController } from "./Modules/modulo-estrutura-academica/controller/CursoDisciplinaController";
import { TurmaController } from "./Modules/modulo-estrutura-academica/controller/TurmaController";
import { TurmaDisciplinaController } from "./Modules/modulo-estrutura-academica/controller/TurmaDisciplinaController";
import { RelatorioController } from "./Modules/modulo-relatorios/controllers/RelatorioController";
import { obterJwtSecret } from "./config/jwt";

const PORT = process.env.PORT || 3000;
obterJwtSecret();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use(authRoutes);

const alunoController = new AlunoController();
const cidadeController = new CidadeController();
const faculdadeController = new FaculdadeController();
const departamentoController = new DepartamentoController();
const cursoController = new CursoController();
const disciplinaController = new DisciplinaController();
const statusDisciplinaController = new StatusDisciplinaController();
const statusMatriculaController = new MatriculaController();
const periodoLetivoController = new PeriodoLetivoController();
const cursoDisciplinaController = new CursoDisciplinaController();
const turmaController = new TurmaController();
const turmaDisciplinaController = new TurmaDisciplinaController();
const relatorioController = new RelatorioController();
const fichaController = new FichaController();

app.get("/relatorios/academicos", autenticar, (req, res) =>
  relatorioController.listarRelatoriosAcademicos(req, res),
);
app.get("/relatorios/academicos/status", autenticar, (req, res) =>
  relatorioController.statusFonteDados(req, res),
);
app.get("/relatorio-alunos", autenticar, (req, res) =>
  relatorioController.listarRelatoriosAcademicos(req, res),
);

app.post("/alunos", (req, res) => alunoController.criarAluno(req, res));
app.put("/alunos/editar-aluno/:matricula", (req, res) =>
  alunoController.atualizarAluno(req, res),
);
app.post("/statusDisciplina", (req, res) =>
  statusDisciplinaController.criarStatusMatriculaDisciplina(req, res),
);
app.post("/statusCurso", (req, res) =>
  statusMatriculaController.criarStatusMatriculaCurso(req, res),
);
app.get("/statusDisciplina/:id", (req, res) =>
  statusDisciplinaController.buscarStatusMatriculaDisciplinaPorId(req, res),
);
app.put("/statusDisciplina/:id", (req, res) =>
  statusDisciplinaController.atualizarStatusMatriculaDisciplina(req, res),
);
app.get("/statusCurso/:id", (req, res) =>
  statusMatriculaController.buscarStatusMatriculaCursoPorId(req, res),
);
app.put("/statusCurso/:id", (req, res) =>
  statusMatriculaController.atualizarStatusMatriculaCurso(req, res),
);
app.post("/faculdades", (req, res) =>
  faculdadeController.criarFaculdade(req, res),
);
app.post("/departamentos", (req, res) =>
  departamentoController.criarDepartamento(req, res),
);
app.post("/cursos", (req, res) => cursoController.criarCurso(req, res));
app.post("/disciplinas", (req, res) =>
  disciplinaController.criarDisciplina(req, res),
);
app.post("/periodos-letivos", (req, res) =>
  periodoLetivoController.criarPeriodoLetivo(req, res),
);
app.post("/curso-disciplina", (req, res) =>
  cursoDisciplinaController.criarCursoDisciplina(req, res),
);
app.post("/turmas", (req, res) => turmaController.criarTurma(req, res));
app.post("/turmas/:id/disciplinas", (req, res) =>
  turmaDisciplinaController.criarTurmaDisciplina(req, res),
);

app.get("/statusDisciplina", (req, res) =>
  statusDisciplinaController.listarStatusMatriculaDisciplina(req, res),
);
app.get("/statusCurso", (req, res) =>
  statusMatriculaController.listarStatusMatriculaCurso(req, res),
);

app.get("/alunos", (req, res) => alunoController.listarAlunos(req, res));
app.get("/alunos/id/:id", (req, res) =>
  alunoController.buscarAlunoPorId(req, res),
);
app.get("/alunos/buscar", (req, res) => alunoController.buscarAluno(req, res));
app.get("/alunos/:matricula", (req, res) =>
  alunoController.buscarAlunoPorMatricula(req, res),
);
app.get("/alunos/:id/ficha", (req, res) =>
  fichaController.buscarFicha(req, res),
);

app.get("/cidades", (req, res) => cidadeController.listarCidades(req, res));
app.get("/cidades/:ibge", (req, res) =>
  cidadeController.buscarCidadePorIbge(req, res),
);

app.get("/faculdades", (req, res) =>
  faculdadeController.listarFaculdades(req, res),
);
app.get("/faculdades/:id", (req, res) =>
  faculdadeController.buscarFaculdadePorId(req, res),
);

app.get("/departamentos", (req, res) =>
  departamentoController.listarDepartamentos(req, res),
);
app.get("/departamentos/:id", (req, res) =>
  departamentoController.buscarDepartamentoPorId(req, res),
);

app.get("/cursos", (req, res) => cursoController.listarCursos(req, res));
app.get("/cursos/:id", (req, res) =>
  cursoController.buscarCursoPorId(req, res),
);
app.get("/cursos/:id/matriz-curricular", (req, res) =>
  cursoDisciplinaController.listarMatrizCurricularPorCursoId(req, res),
);
app.put("/cursos/:id", (req, res) => cursoController.atualizarCurso(req, res));
app.delete("/cursos/:id", (req, res) => cursoController.removerCurso(req, res));

app.get("/disciplinas", (req, res) =>
  disciplinaController.listarDisciplinas(req, res),
);
app.get("/disciplinas/:id", (req, res) =>
  disciplinaController.buscarDisciplinaPorId(req, res),
);
app.put("/disciplinas/:id", (req, res) =>
  disciplinaController.atualizarDisciplina(req, res),
);
app.delete("/disciplinas/:id", (req, res) =>
  disciplinaController.removerDisciplina(req, res),
);

app.get("/periodos-letivos", (req, res) =>
  periodoLetivoController.listarPeriodosLetivos(req, res),
);
app.get("/periodos-letivos/:id", (req, res) =>
  periodoLetivoController.buscarPeriodoLetivoPorId(req, res),
);
app.put("/periodos-letivos/:id", (req, res) =>
  periodoLetivoController.atualizarPeriodoLetivo(req, res),
);
app.delete("/periodos-letivos/:id", (req, res) =>
  periodoLetivoController.removerPeriodoLetivo(req, res),
);

app.get("/curso-disciplina", (req, res) =>
  cursoDisciplinaController.listarCursoDisciplinas(req, res),
);
app.put("/curso-disciplina/:id", (req, res) =>
  cursoDisciplinaController.atualizarCursoDisciplina(req, res),
);
app.delete("/curso-disciplina/:id", (req, res) =>
  cursoDisciplinaController.removerCursoDisciplina(req, res),
);

app.get("/turmas", (req, res) => turmaController.listarTurmas(req, res));
app.get("/turmas/:id", (req, res) =>
  turmaController.buscarTurmaPorId(req, res),
);
app.put("/turmas/:id", (req, res) => turmaController.atualizarTurma(req, res));
app.delete("/turmas/:id", (req, res) => turmaController.removerTurma(req, res));
app.get("/turmas/:id/disciplinas", (req, res) =>
  turmaDisciplinaController.listarTurmaDisciplinasPorTurmaId(req, res),
);
app.put("/turmas/:id/disciplinas/:turmaDisciplinaId", (req, res) =>
  turmaDisciplinaController.atualizarTurmaDisciplina(req, res),
);
app.delete("/turmas/:id/disciplinas/:turmaDisciplinaId", (req, res) =>
  turmaDisciplinaController.removerTurmaDisciplina(req, res),
);

app.use("/professores", professorRouter);
app.use("/avaliacoes", avaliacaoRouter);
app.use("/frequencias", frequenciaRouter);
app.use("/notas", notasRouter);
app.use(homeAlunoRouter);
app.use(matriculaRouter);
app.use(documentoRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
