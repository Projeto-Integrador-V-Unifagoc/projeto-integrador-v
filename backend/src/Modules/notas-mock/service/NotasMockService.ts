import { NotaMock, SituacaoNotaMock } from "../models/NotaMock.js";

const calcularMedia = (avaliacoes: NotaMock["avaliacoes"]) => {
  const totalPeso = avaliacoes.reduce((total, avaliacao) => total + avaliacao.peso, 0);
  const totalNota = avaliacoes.reduce(
    (total, avaliacao) => total + avaliacao.nota * avaliacao.peso,
    0
  );

  return Number((totalNota / totalPeso).toFixed(1));
};

const definirSituacao = (media: number): SituacaoNotaMock => {
  if (media >= 7) {
    return "aprovado";
  }

  if (media >= 5) {
    return "recuperacao";
  }

  return "reprovado";
};

const criarNotaMock = (
  nota: Omit<NotaMock, "media" | "situacao">
): NotaMock => {
  const media = calcularMedia(nota.avaliacoes);

  return {
    ...nota,
    media,
    situacao: definirSituacao(media),
  };
};

const notasMock: NotaMock[] = [
  criarNotaMock({
    id: "nota-001",
    alunoId: "aluno-001",
    alunoNome: "Ana Clara Souza",
    turmaId: "turma-ads-2026-1",
    turmaNome: "ADS 5o Periodo",
    disciplinaId: "disciplina-pi-v",
    disciplinaNome: "Projeto Integrador V",
    professorId: "prof-001",
    professorNome: "Theilor Martins",
    periodoLetivo: "2026/1",
    avaliacoes: [
      { id: "av-001", nome: "Entrega 1", nota: 8.5, peso: 2 },
      { id: "av-002", nome: "Entrega 2", nota: 9, peso: 3 },
      { id: "av-003", nome: "Apresentacao", nota: 8, peso: 5 },
    ],
  }),
  criarNotaMock({
    id: "nota-002",
    alunoId: "aluno-002",
    alunoNome: "Bruno Henrique Lima",
    turmaId: "turma-ads-2026-1",
    turmaNome: "ADS 5o Periodo",
    disciplinaId: "disciplina-pi-v",
    disciplinaNome: "Projeto Integrador V",
    professorId: "prof-001",
    professorNome: "Theilor Martins",
    periodoLetivo: "2026/1",
    avaliacoes: [
      { id: "av-001", nome: "Entrega 1", nota: 6, peso: 2 },
      { id: "av-002", nome: "Entrega 2", nota: 5.5, peso: 3 },
      { id: "av-003", nome: "Apresentacao", nota: 6.5, peso: 5 },
    ],
  }),
  criarNotaMock({
    id: "nota-003",
    alunoId: "aluno-003",
    alunoNome: "Camila Rocha Alves",
    turmaId: "turma-ads-2026-1",
    turmaNome: "ADS 5o Periodo",
    disciplinaId: "disciplina-bd-ii",
    disciplinaNome: "Banco de Dados II",
    professorId: "prof-002",
    professorNome: "Mariana Duarte",
    periodoLetivo: "2026/1",
    avaliacoes: [
      { id: "av-004", nome: "Prova 1", nota: 7.5, peso: 4 },
      { id: "av-005", nome: "Trabalho Pratico", nota: 8, peso: 3 },
      { id: "av-006", nome: "Prova 2", nota: 7, peso: 3 },
    ],
  }),
  criarNotaMock({
    id: "nota-004",
    alunoId: "aluno-004",
    alunoNome: "Diego Martins Costa",
    turmaId: "turma-si-2026-1",
    turmaNome: "SI 5o Periodo",
    disciplinaId: "disciplina-eng-soft",
    disciplinaNome: "Engenharia de Software",
    professorId: "prof-003",
    professorNome: "Rafael Nogueira",
    periodoLetivo: "2026/1",
    avaliacoes: [
      { id: "av-007", nome: "Estudo de Caso", nota: 4.5, peso: 3 },
      { id: "av-008", nome: "Prototipo", nota: 5, peso: 4 },
      { id: "av-009", nome: "Seminario", nota: 4, peso: 3 },
    ],
  }),
];

export class NotasMockService {
  listarTodos() {
    return notasMock;
  }

  buscarPorAluno(alunoId: string) {
    return notasMock.filter((nota) => nota.alunoId === alunoId);
  }

  buscarPorTurma(turmaId: string) {
    return notasMock.filter((nota) => nota.turmaId === turmaId);
  }

  buscarPorDisciplina(disciplinaId: string) {
    return notasMock.filter((nota) => nota.disciplinaId === disciplinaId);
  }
}
