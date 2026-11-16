import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DetalheAlunoAtencaoProfessor } from "../../models/home-professor-model";
import type { DisciplinaBoletim } from "../../models/nota-model";
import AlunoDetalhesDrawer from "./AlunoDetalhesDrawer";
import DisciplinaDetalhesDrawer from "./DisciplinaDetalhesDrawer";

afterEach(() => cleanup());

const detalheAluno: DetalheAlunoAtencaoProfessor = {
  aluno: { id: "a1", matricula: 41, nome: "Caio Mendonça" },
  contexto: {
    turma: { id: "t1", sigla: "ADS2A", descricao: "Turma A", turno: "NOITE" },
    curso: { id: "c1", nome: "Análise e Desenvolvimento de Sistemas" },
    disciplina: { id: "d1", codigo: "ADS204", nome: "Engenharia de Software", areaConhecimento: null, ementa: null, cargaHoraria: 60 },
    periodo: { id: "p1", codigo: "2026.1", ano: 2026, semestre: 1, ativo: true, status: "aberto" },
  },
  resumo: { media: 66.4, frequencia: 65, nivel: "CRITICO", motivo: "Frequencia de 65%, abaixo do minimo", presencas: 13, faltas: 7, totalAulas: 20, avaliacoesLancadas: 1, totalAvaliacoes: 2 },
  criterios: { mediaMinima: 60, frequenciaMinima: 75, frequenciaAtencao: 80 },
  pontosAtencao: [{ id: "frequencia-critica", severidade: "CRITICO", titulo: "Frequência abaixo do mínimo", descricao: "O aluno possui 65% de frequência." }],
  avaliacoes: [
    { id: "p1", titulo: "Prova 1", tipo: "PROVA", valor: 20, dataDevolucao: "2026-10-06", nota: 13.5, percentual: 67.5, status: "LANCADA" },
    { id: "p2", titulo: "Prova 3", tipo: "PROVA", valor: 20, dataDevolucao: "2026-12-06", nota: null, percentual: null, status: "PENDENTE" },
  ],
};

describe("AlunoDetalhesDrawer (professor)", () => {
  it("mostra o aluno no painel lateral padronizado, com risco, pontos e notas", () => {
    const lancar = vi.fn();
    render(<AlunoDetalhesDrawer open carregando={false} erro="" detalhe={detalheAluno} onClose={vi.fn()} onLancarNotas={lancar} />);

    expect(screen.getByRole("heading", { level: 2, name: "Caio Mendonça" })).toBeInTheDocument();
    expect(screen.getByText("Risco alto")).toBeInTheDocument();
    expect(screen.getByText("Frequência abaixo do mínimo")).toBeInTheDocument();
    const notas = screen.getByRole("region", { name: "Notas por avaliação" });
    expect(within(notas).getByText("Nota lançada")).toBeInTheDocument();
    expect(within(notas).getByText("Nota não lançada")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lançar notas" }));
    expect(lancar).toHaveBeenCalledOnce();
  });

  it("enquanto carrega mostra o esqueleto e, com erro, o aviso", () => {
    const { rerender } = render(<AlunoDetalhesDrawer open carregando erro="" detalhe={null} onClose={vi.fn()} />);
    expect(screen.getByLabelText("Carregando detalhes do aluno")).toBeInTheDocument();
    rerender(<AlunoDetalhesDrawer open carregando={false} erro="Falhou" detalhe={null} onClose={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Falhou");
  });
});

describe("DisciplinaDetalhesDrawer (aluno)", () => {
  const boletim: DisciplinaBoletim = {
    turmaDisciplinaId: "td1", disciplina: { id: "d1", codigo: "ADS103", nome: "Matemática Discreta" }, disciplinaNome: "Matemática Discreta",
    turmaSigla: "ADS1A", professorNome: "Camila", periodoLetivo: { id: "p1", codigo: "2026.1" },
    avaliacoes: [{ id: "a1", tipo: "PROVA", descricao: "Prova 1", valorMaximo: 20, valorObtido: 10.5, lancada: true, dataDevolucao: "2026-10-03" }],
    pontosObtidos: 10.5, pontosMaximos: 20, mediaParcial: 52.5, notaRecuperacao: null, mediaFinal: null,
    situacao: "EM_ANDAMENTO", etapaRegularCompleta: false, elegivelRecuperacao: false, alerta: true,
  };

  it("usa o mesmo painel, sem a tarja azul, com o selo de risco da regra do dashboard", () => {
    render(
      <DisciplinaDetalhesDrawer
        aberto
        disciplina={{ turmaDisciplinaId: "td1", disciplinaId: "d1", codigo: "ADS103", nome: "Matemática Discreta", turmaSigla: "ADS1A", professorNome: "Camila", cargaHoraria: 60, periodoLetivo: { id: "p1", codigo: "2026.1" } }}
        boletim={boletim}
        frequencia={{ alunoId: "a", alunoNome: "Ana", turmaDisciplinaId: "td1", disciplinaId: "d1", disciplinaNome: "Matemática Discreta", totalAulas: 25, presencas: 17, faltas: 8, naoLancadas: 0, percentual: 68, situacao: "RISCO_REPROVACAO" }}
        tarefas={[]}
        onFechar={vi.fn()}
        onAbrirBoletim={vi.fn()}
        onAbrirFrequencia={vi.fn()}
      />,
    );

    const titulo = screen.getByRole("heading", { level: 2, name: "Matemática Discreta" });
    expect(getComputedStyle(titulo.closest("header") as HTMLElement).backgroundImage).not.toContain("gradient");
    expect(screen.getByText("Risco alto")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Caminho até a média" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir boletim completo" })).toBeInTheDocument();
  });
});

describe("TurmaDetalhesDrawer (professor)", () => {
  it("abre a turma no mesmo painel e leva ao detalhe do aluno ao clicar", async () => {
    const { default: TurmaDetalhesDrawer } = await import("./TurmaDetalhesDrawer");
    const abrirAluno = vi.fn();
    render(
      <TurmaDetalhesDrawer
        detalhe={{
          id: "td1",
          turma: { id: "t1", sigla: "ADS1A", descricao: "Turma A", turno: "NOITE" },
          curso: { id: "c1", nome: "Análise e Desenvolvimento de Sistemas" },
          disciplina: { id: "d1", codigo: "ADS104", nome: "Arquitetura de Computadores", areaConhecimento: null, ementa: null, cargaHoraria: 60 },
          totalAlunos: 2, alunosComNota: 2, alunosComFrequencia: 2, mediaTurma: 80, frequenciaMedia: 90, alunosEmAtencao: 1, totalAvaliacoes: 6, lancamentosPendentes: 0,
          periodo: { id: "p1", codigo: "2026.1", ano: 2026, semestre: 1, ativo: true, status: "aberto" },
          competencias: [],
          alunos: [
            { id: "a1", matricula: 1, nome: "Ana Beatriz Ramos", media: 90.9, frequencia: 92, nivel: "REGULAR", motivo: "ok" },
            { id: "a2", matricula: 2, nome: "Bruno Lima", media: 55, frequencia: 70, nivel: "CRITICO", motivo: "freq" },
          ],
        }}
        onFechar={vi.fn()}
        onAbrirAluno={abrirAluno}
        onLancarNotas={vi.fn()}
        onRegistrarFrequencia={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Arquitetura de Computadores" })).toBeInTheDocument();
    expect(screen.getByText("Nenhuma competência vinculada a esta disciplina.")).toBeInTheDocument();
    const linhas = screen.getAllByRole("button", { name: /^Consultar detalhes de/ });
    expect(linhas[0]).toHaveAccessibleName("Consultar detalhes de Bruno Lima"); // em atenção primeiro
    fireEvent.click(linhas[0]);
    expect(abrirAluno).toHaveBeenCalledWith("td1", "a2");
  });
});
