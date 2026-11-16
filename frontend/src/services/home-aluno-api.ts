import { api } from "../lib/axios";
import type { DesempenhoCompetenciasAluno, DisciplinaAluno, HistoricoCompetenciasAluno, TarefaAluno } from "../models/home-aluno-model";

export const homeAlunoApi = {
  minhasDisciplinas: async (): Promise<DisciplinaAluno[]> =>
    (await api.get("/me/disciplinas")).data,
  minhasTarefas: async (): Promise<TarefaAluno[]> =>
    (await api.get("/me/tarefas")).data,
  meuDesempenhoCompetencias: async (): Promise<DesempenhoCompetenciasAluno> =>
    (await api.get("/me/competencias")).data,
  meuHistoricoCompetencias: async (): Promise<HistoricoCompetenciasAluno> =>
    (await api.get("/me/competencias/historico")).data,
};
