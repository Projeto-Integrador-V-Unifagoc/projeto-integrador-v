import axios from "axios";
import { isDeepStrictEqual } from "node:util";
import type { FiltrosRelatorioAcademico, RelatorioAcademicoLinha } from "../models/RelatorioAcademico";
import { NotaError } from "../../notas/errors/NotaError";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PONTOS = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
export class RelatorioAcademicoGateway {
  private readonly baseUrl = process.env.RELATORIO_ACADEMICO_API_URL;
  private readonly token = process.env.RELATORIO_ACADEMICO_API_TOKEN;
  estaConfigurado() { return Boolean(this.baseUrl); }

  async listarLinhas(filtros: FiltrosRelatorioAcademico, autorizadas: RelatorioAcademicoLinha[]) {
    if (!this.baseUrl) return [];
    const response = await axios.get<unknown>(`${this.baseUrl.replace(/\/$/, "")}/relatorios/academicos`, {
      params: { ...filtros, turmaIdsPermitidos: undefined, ofertaIds: autorizadas.map(l => l.turmaDisciplinaId),
        matriculaTurmaDisciplinaIds: autorizadas.map(l => l.matriculaTurmaDisciplinaId) },
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
    });
    const falhar = () => { throw new NotaError("Resultado externo incompatível com o contrato acadêmico autorizado.", 502, "RESULTADO_EXTERNO_INCOMPATIVEL"); };
    if (!Array.isArray(response.data) || response.data.length !== autorizadas.length) return falhar();
    const esperadas = new Map(autorizadas.map(l => [l.matriculaTurmaDisciplinaId, l]));
    const vistas = new Set<string>();
    for (const linha of response.data) {
      if (!linha || typeof linha !== "object") return falhar();
      const dto = linha as RelatorioAcademicoLinha;
      if (!UUID.test(dto.turmaDisciplinaId) || !UUID.test(dto.matriculaTurmaDisciplinaId) ||
        dto.resultadoAcademico?.contratoVersao !== 2 ||
        (dto.nota !== null && (typeof dto.nota !== "string" || !PONTOS.test(dto.nota))) ||
        vistas.has(dto.matriculaTurmaDisciplinaId) || !isDeepStrictEqual(dto, esperadas.get(dto.matriculaTurmaDisciplinaId))) return falhar();
      vistas.add(dto.matriculaTurmaDisciplinaId);
    }
    return response.data as RelatorioAcademicoLinha[];
  }
}
