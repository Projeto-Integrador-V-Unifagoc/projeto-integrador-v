import { Router } from "express";
import { autenticar } from "../../middlewares/autenticacao.js";
import { NotaController } from "../notas/controller/NotaController.js";

const controller = new NotaController();
export const notasRouter = Router();

notasRouter.use(autenticar);

// Professor / secretaria
notasRouter.get("/opcoes", controller.listarOpcoes);
notasRouter.get("/avaliacoes/:avaliacaoId/lancamento", controller.obterLancamento);
notasRouter.put("/avaliacoes/:avaliacaoId/lote", controller.salvarLote);
notasRouter.get("/turmas/:turmaDisciplinaId/rendimento", controller.obterRendimento);
notasRouter.get("/turmas/:turmaDisciplinaId/recuperacao", controller.obterRecuperacao);
notasRouter.post("/autorizacoes-excepcionais", controller.criarAutorizacao);

// Aluno
notasRouter.get("/me/resumo", controller.meuResumo);
notasRouter.get("/me", controller.meuBoletim);

// Consulta administrativa
notasRouter.get("/alunos/:alunoId", controller.consultarAluno);
