export type StatusPlanoEnsino = "RASCUNHO" | "SUBMETIDO" | "APROVADO" | "ARQUIVADO";
export interface ConteudoPlanoEnsino {
  temaApresentacao: string; objetivoGeral: string; objetivosEspecificos: string; metodologia: string;
  conhecimentosHabilidadesAtitudes: string; bibliografiaBasica: string; bibliografiaComplementar: string;
  estrategiasPedagogicas: string; programaAvaliacao: string; recursosDidaticos: string; cronograma: string; observacoes: string;
}
export interface PlanoEnsinoResponse {
  id: string; turma_disciplina_id: string; versao: number; status: StatusPlanoEnsino;
  responsavel_professor_id: string; conteudo: Partial<ConteudoPlanoEnsino>;
  snapshot_ementa: string | null; snapshot_competencias: Array<{ id: string; codigo: string; nome: string }> | null;
  submetido_em: string | null; aprovado_em: string | null; arquivado_em: string | null;
}

