import { api } from "../lib/axios";
import type { DisciplinaAluno, TarefaAluno } from "../models/home-aluno-model";

export const homeAlunoApi = {
  minhasDisciplinas: async (): Promise<DisciplinaAluno[]> =>
    (await api.get("/me/disciplinas")).data,
  minhasTarefas: async (): Promise<TarefaAluno[]> =>
    (await api.get("/me/tarefas")).data,
};
