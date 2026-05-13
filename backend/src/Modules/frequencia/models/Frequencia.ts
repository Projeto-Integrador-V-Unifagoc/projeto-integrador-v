export type StatusFrequencia = "PRESENTE" | "AUSENTE";
export type PerfilFrequencia = "PROFESSOR" | "ALUNO" | "COORDENADOR";

export interface ContextoAutenticado {
  usuarioId: string;
  perfil: PerfilFrequencia;
  professorId?: string;
  alunoId?: string;
}

export interface RegistroFrequenciaRequest {
  alunoId: string;
  status: StatusFrequencia;
}

export interface RegistrarFrequenciaRequest {
  turmaId: string;
  aulaId?: string;
  data: string;
  registros: RegistroFrequenciaRequest[];
}

export interface EditarFrequenciaRequest {
  status: StatusFrequencia;
}

export interface FrequenciaRegistro {
  id: string;
  aulaId: string;
  alunoId: string;
  turmaId: string;
  status: StatusFrequencia;
  data: string;
  justificativa?: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ConsolidadoFrequencia {
  alunoId: string;
  alunoNome: string;
  turmaId: string;
  disciplinaId: string;
  disciplinaNome: string;
  totalAulas: number;
  presencas: number;
  faltas: number;
  percentual: number;
  situacao: "REGULAR" | "ALERTA" | "RISCO_REPROVACAO";
}

export class FrequenciaMapper {
  static registro(row: any): FrequenciaRegistro {
    return {
      id: row.id,
      aulaId: row.aula_id,
      alunoId: row.aluno_id,
      turmaId: row.turma_id,
      status: row.status,
      data: row.data,
      justificativa: row.justificativa,
      criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em,
    };
  }
}

/*
Responsabilidade:
Implementar a modelagem complementar de banco, seed de demonstracao e model do dominio de Frequencia.

Arquivos:
backend/migrations/20260511000100_complementa_schema_frequencia.ts
backend/seeds/frequencia_demo.ts
backend/src/Modules/frequencia/models/Frequencia.ts

Tarefas relacionadas no documento:
#03 - Modelagem e criacao do banco de dados
#04 - Implementacao do Model
*/
