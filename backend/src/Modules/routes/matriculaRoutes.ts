import { Router } from "express";
import { MatriculaController } from "../modulo-matricula/controller/MatriculaController.js";
import { autenticar } from "../../middlewares/autenticacao.js";
import { somenteSecretariaOuAdmin } from "../modulo-matricula/middlewares/perfilAdministrativo.js";

const controller = new MatriculaController();
export const matriculaRouter = Router();

// A proteção é declarada rota a rota, e não com `matriculaRouter.use(...)`.
// Este router é montado na raiz da aplicação: um middleware de router rodaria
// antes de qualquer rota casar e devolveria 401 para caminhos de outros módulos
// registrados depois dele.
const administrativo = [autenticar, somenteSecretariaOuAdmin];

// Turmas e ofertas usadas no fluxo de matrícula.
// A rota de disciplinas vive sob /matriculas para não colidir com
// GET /turmas/:id/disciplinas, que pertence ao módulo de estrutura acadêmica.
matriculaRouter.get("/turmas/disponiveis/:cursoId", ...administrativo, (req, res) => controller.listarTurmasDisponiveis(req, res));
matriculaRouter.get("/matriculas/turmas/:turmaId/disciplinas", ...administrativo, (req, res) => controller.listarDisciplinasDaTurma(req, res));

// Consultas de matrícula. As rotas literais vêm antes de /matriculas/:id/...
// para que "status" e "aluno" não sejam capturados como um id.
matriculaRouter.get("/matriculas", ...administrativo, (req, res) => controller.listarTodas(req, res));
matriculaRouter.get("/matriculas/status/:matricula", ...administrativo, (req, res) => controller.consultarStatus(req, res));
matriculaRouter.get("/matriculas/aluno/:alunoId", ...administrativo, (req, res) => controller.listarPorAluno(req, res));
matriculaRouter.get("/matriculas/:id/disciplinas", ...administrativo, (req, res) => controller.listarVinculos(req, res));

// Matrícula
matriculaRouter.post("/matriculas", ...administrativo, (req, res) => controller.criarMatricula(req, res));
matriculaRouter.patch("/matriculas/:id/aprovar", ...administrativo, (req, res) => controller.aprovar(req, res));
matriculaRouter.patch("/matriculas/:id/cancelar", ...administrativo, (req, res) => controller.cancelar(req, res));
matriculaRouter.patch("/matriculas/:id/status", ...administrativo, (req, res) => controller.atualizarStatus(req, res));

// Vínculos acadêmicos da matrícula
matriculaRouter.post("/matriculas/:id/disciplinas", ...administrativo, (req, res) => controller.adicionarDisciplinas(req, res));
matriculaRouter.patch("/matriculas/:id/disciplinas/:vinculoId/cancelar", ...administrativo, (req, res) => controller.cancelarVinculo(req, res));
