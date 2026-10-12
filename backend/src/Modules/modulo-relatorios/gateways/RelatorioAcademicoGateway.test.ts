import { afterEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { RelatorioAcademicoGateway } from "./RelatorioAcademicoGateway";
import { calcularResultadoAcademico } from "../../notas/models/ResultadoAcademico";
vi.mock("axios", () => ({ default: { get: vi.fn() } }));
const id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const mtd = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const av = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const esperado = () => ({ alunoId: id, matricula: 1, aluno: "Pessoa sintética", cursoId: id,
  curso: "Curso", periodo: "2026/1", periodoLetivoId: id, turmaId: id, disciplinaId: id,
  turmaDisciplinaId: id, matriculaTurmaDisciplinaId: mtd, disciplina: "Disciplina", cargaHoraria: 60, ano: "2026/1",
  nota: "72.00", frequencia: 75, totalAulas: 4, presencas: 3, faltas: 1,
  resultadoAcademico: calcularResultadoAcademico({ turmaDisciplinaId: id, matriculaTurmaDisciplinaId: mtd,
    plano: { turmaDisciplinaId: id, regraPontuacaoId: id, totalPontos: "120.00", planoCompleto: true,
      podeCriarRegular: false, motivosBloqueio: [], subgrupos: [] },
    avaliacoes: [{ id: av, tipo: "REGULAR", valor: "120.00" }], notasPorAvaliacao: new Map([[av, "72.00"]]),
    frequencia: { presencas: 3, faltas: 1, percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE" } }) });
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
function gateway() { vi.stubEnv("RELATORIO_ACADEMICO_API_URL", "https://fixture.invalid"); return new RelatorioAcademicoGateway(); }
describe("Gateway externo exige o contrato acadêmico autorizado", () => {
  it("sem configuração não consulta rede", async () => {
    vi.stubEnv("RELATORIO_ACADEMICO_API_URL", "");
    expect(await (new RelatorioAcademicoGateway().listarLinhas as any)({}, [esperado()])).toEqual([]);
    expect(axios.get).not.toHaveBeenCalled();
  });
  it("aceita DTO v2 coerente com UUIDs e resultado local sem recalcular", async () => {
    const row = esperado(); vi.mocked(axios.get).mockResolvedValueOnce({ data: [row] });
    expect(await (gateway().listarLinhas as any)({}, [row])).toEqual([row]);
  });
  it.each(["legado", "versao", "notaNumero", "precisao", "oferta", "matricula", "corte", "frequencia", "ausente", "duplicado", "naoArray"])("recusa %s sem coercão/fallback", async caso => {
    const row: any = esperado(); const recebido: any = structuredClone(row);
    if (caso === "legado") delete recebido.resultadoAcademico;
    if (caso === "versao") recebido.resultadoAcademico.contratoVersao = 1;
    if (caso === "notaNumero") recebido.nota = 72;
    if (caso === "precisao") recebido.nota = "72.001";
    if (caso === "oferta") recebido.turmaDisciplinaId = av;
    if (caso === "matricula") recebido.matriculaTurmaDisciplinaId = av;
    if (caso === "corte") recebido.resultadoAcademico.cortePontos = "60.00";
    if (caso === "frequencia") recebido.resultadoAcademico.frequencia.requisito = "INSUFICIENTE";
    const data = caso === "ausente" ? [] : caso === "duplicado" ? [recebido, recebido] : caso === "naoArray" ? {} : [recebido];
    vi.mocked(axios.get).mockResolvedValueOnce({ data });
    await expect((gateway().listarLinhas as any)({}, [row])).rejects.toMatchObject({ status: 502, codigo: "RESULTADO_EXTERNO_INCOMPATIVEL" });
  });
  it("propaga falha de rede e não a trata como ausência", async () => {
    const erro = new Error("Falha sintética de rede"); vi.mocked(axios.get).mockRejectedValueOnce(erro);
    await expect((gateway().listarLinhas as any)({}, [esperado()])).rejects.toBe(erro);
  });
});
