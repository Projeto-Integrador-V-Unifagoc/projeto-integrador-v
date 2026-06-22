import { api } from "../lib/axios";
import type { ConsolidadoFrequencia } from "../models/frequencia-model";
import type { MatriculaDetalhada } from "../models/matricula-model";
import type { PeriodoLetivoResponse } from "../models/periodo-letivo-model";
import type { CidadeModel } from "../models/cidade-model";
import type { DocumentoAluno } from "./documento-api";

export interface AvaliacaoFicha {
  id: string;
  nome: string;
  nota: number;
  peso: number;
  matricula_turma_disciplina_id: string | null;
}

export interface NotaFicha {
  id: string;
  alunoId: string;
  alunoNome: string | null;
  turmaId: string | null;
  turmaNome: string | null;
  disciplinaId: string | null;
  disciplinaNome: string | null;
  professorId: string | null;
  professorNome: string | null;
  periodoLetivo: string | null;
  avaliacoes: AvaliacaoFicha[];
  media: number;
  situacao: string;
}

export interface AlunoFicha {
  id: string;
  matricula?: string | number;
  periodo: number | string;
  pessoa: {
    nome: string;
    cpf: string | number;
    dataNascimento: string;
    cidade?: CidadeModel;
  };
  usuario?: {
    id: string;
    email: string;
  };
  curso?: {
    id: string;
    codigo?: string;
    nome: string;
  };
}

export interface FrequenciaAluno {
  alunoId: string;
  consolidado: ConsolidadoFrequencia[];
}

export interface FichaAlunoResponse {
  aluno: AlunoFicha;
  matriculas: MatriculaDetalhada[];
  notas: NotaFicha[];
  frequencia?: FrequenciaAluno;
  documentos: DocumentoAluno[];
  periodos: PeriodoLetivoResponse[];
}

export const fichaApi = {
  async buscarFicha(alunoId: string): Promise<FichaAlunoResponse> {
    const response = await api.get<FichaAlunoResponse>(
      `/alunos/${alunoId}/ficha`,
    );
    return response.data;
  },
};
