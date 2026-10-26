import type { TarefaAluno } from "../../models/home-aluno-model";
import { formatarDataPtBr } from "../../utils/avaliacao";

export type JanelaAgenda = 7 | 30 | "todas";

export function diasAte(dataIso: string, hoje = new Date()): number {
  const baseHoje = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const [ano, mes, dia] = dataIso.slice(0, 10).split("-").map(Number);
  return Math.ceil((Date.UTC(ano, mes - 1, dia) - baseHoje) / 86_400_000);
}

export function prazoHumano(dataIso: string, hoje = new Date()) {
  const dias = diasAte(dataIso, hoje);
  if (dias === 0) return "Vence hoje";
  if (dias === 1) return "Vence amanhã";
  if (dias > 1 && dias <= 7) return `Vence em ${dias} dias`;
  return formatarDataPtBr(dataIso);
}

export function filtrarTarefasPorJanela(
  tarefas: TarefaAluno[],
  janela: JanelaAgenda,
  hoje = new Date(),
) {
  return tarefas.filter((tarefa) => {
    const dias = diasAte(tarefa.dataVencimento, hoje);
    if (dias < 0) return false;
    return janela === "todas" || dias <= janela;
  });
}

export function corPrazo(dataIso: string, hoje = new Date()): "error" | "warning" | "info" | "default" {
  const dias = diasAte(dataIso, hoje);
  if (dias <= 0) return "error";
  if (dias <= 3) return "warning";
  if (dias <= 7) return "info";
  return "default";
}
