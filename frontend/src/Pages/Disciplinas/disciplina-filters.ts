import type { AreaConhecimento, DisciplinaView } from "../../models/disciplina-model";

export type SituacaoDisciplina = "TODAS" | "ATIVAS" | "INATIVAS";
export type CompletudeDisciplina = "TODAS" | "COMPLETAS" | "PENDENTE_DADOS" | "SEM_COMPETENCIAS";
export type EstadoCadastroDisciplina = "COMPLETO" | "PENDENTE_DADOS" | "SEM_COMPETENCIAS";

export interface FiltrosDisciplina {
  busca: string;
  area: AreaConhecimento | "TODAS";
  situacao: SituacaoDisciplina;
  completude: CompletudeDisciplina;
}

const normalizar = (valor: unknown) => String(valor ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

export function estadoCadastroDisciplina(item: DisciplinaView): EstadoCadastroDisciplina {
  if (!item.cadastroCompleto) return "PENDENTE_DADOS";
  if (item.quantidadeCompetencias === 0) return "SEM_COMPETENCIAS";
  return "COMPLETO";
}

export function filtrarDisciplinas(disciplinas: DisciplinaView[], filtros: FiltrosDisciplina) {
  const termo = normalizar(filtros.busca).trim();
  return disciplinas.filter((item) => {
    if (filtros.area !== "TODAS" && item.areaConhecimento !== filtros.area) return false;
    if (filtros.situacao === "ATIVAS" && !item.ativo) return false;
    if (filtros.situacao === "INATIVAS" && item.ativo) return false;
    const estado = estadoCadastroDisciplina(item);
    if (filtros.completude === "COMPLETAS" && estado !== "COMPLETO") return false;
    if (filtros.completude === "PENDENTE_DADOS" && estado !== "PENDENTE_DADOS") return false;
    if (filtros.completude === "SEM_COMPETENCIAS" && estado !== "SEM_COMPETENCIAS") return false;
    if (!termo) return true;
    return [item.codigo, item.nome, item.preRequisito, item.areaConhecimento]
      .some((valor) => normalizar(valor).includes(termo));
  });
}
