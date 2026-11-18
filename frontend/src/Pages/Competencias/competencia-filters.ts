import type { CompetenciaResponse, TipoCompetencia } from "../../models/disciplina-model";

export type SituacaoCompetencia = "TODAS" | "ATIVAS" | "INATIVAS";

export interface FiltrosCatalogoCompetencia {
  busca: string;
  tipo: TipoCompetencia | "TODOS";
  situacao: SituacaoCompetencia;
}

const normalizar = (valor: unknown) => String(valor ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

export function filtrarCompetencias(
  competencias: CompetenciaResponse[],
  filtros: FiltrosCatalogoCompetencia,
) {
  const termo = normalizar(filtros.busca).trim();
  return competencias.filter((item) => {
    if (filtros.tipo !== "TODOS" && item.tipo !== filtros.tipo) return false;
    if (filtros.situacao === "ATIVAS" && !item.ativo) return false;
    if (filtros.situacao === "INATIVAS" && item.ativo) return false;
    if (!termo) return true;
    return [item.codigo, item.nome, item.descricao, item.tipo]
      .some((valor) => normalizar(valor).includes(termo));
  });
}
