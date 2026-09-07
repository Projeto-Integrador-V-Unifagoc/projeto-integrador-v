export type SituacaoNotaMock = "aprovado" | "recuperacao" | "reprovado";

export interface AvaliacaoNotaMock {
  id: string;
  nome: string;
  nota: number;
  peso: number;
}

export interface NotaMock {
  id: string;
  alunoId: string;
  alunoNome: string;
  turmaId: string;
  turmaNome: string;
  disciplinaId: string;
  disciplinaNome: string;
  professorId: string;
  professorNome: string;
  periodoLetivo: string;
  avaliacoes: AvaliacaoNotaMock[];
  media: number;
  situacao: SituacaoNotaMock;
}
