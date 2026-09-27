import { describe, expect, it } from "vitest";
import type { TarefaAluno } from "../../models/home-aluno-model";
import { corPrazo, diasAte, filtrarTarefasPorJanela, prazoHumano } from "./agenda-utils";

const hoje = new Date(2026, 8, 26, 15, 30);

function tarefa(id: string, dataVencimento: string): TarefaAluno {
  return {
    avaliacaoId: id,
    titulo: `Avaliação ${id}`,
    tipo: "PROVA",
    disciplinaNome: "Projeto Integrador",
    turmaDisciplinaId: "td-1",
    dataVencimento,
    valor: 20,
  };
}

describe("agenda-utils", () => {
  it("calcula dias usando somente a data civil", () => {
    expect(diasAte("2026-09-26", hoje)).toBe(0);
    expect(diasAte("2026-09-27", hoje)).toBe(1);
    expect(diasAte("2026-10-03", hoje)).toBe(7);
  });

  it("filtra sete, trinta dias e remove itens vencidos", () => {
    const tarefas = [
      tarefa("vencida", "2026-09-25"),
      tarefa("hoje", "2026-09-26"),
      tarefa("sete", "2026-10-03"),
      tarefa("oito", "2026-10-04"),
      tarefa("trinta", "2026-10-26"),
      tarefa("futura", "2026-11-01"),
    ];

    expect(filtrarTarefasPorJanela(tarefas, 7, hoje).map((item) => item.avaliacaoId)).toEqual(["hoje", "sete"]);
    expect(filtrarTarefasPorJanela(tarefas, 30, hoje).map((item) => item.avaliacaoId)).toEqual(["hoje", "sete", "oito", "trinta"]);
    expect(filtrarTarefasPorJanela(tarefas, "todas", hoje).map((item) => item.avaliacaoId)).toEqual(["hoje", "sete", "oito", "trinta", "futura"]);
  });

  it("formata urgência sem confundir avaliações futuras", () => {
    expect(prazoHumano("2026-09-26", hoje)).toBe("Vence hoje");
    expect(prazoHumano("2026-09-27", hoje)).toBe("Vence amanhã");
    expect(prazoHumano("2026-09-29", hoje)).toBe("Vence em 3 dias");
    expect(corPrazo("2026-09-26", hoje)).toBe("error");
    expect(corPrazo("2026-09-29", hoje)).toBe("warning");
    expect(corPrazo("2026-10-03", hoje)).toBe("info");
    expect(corPrazo("2026-10-10", hoje)).toBe("default");
  });
});
