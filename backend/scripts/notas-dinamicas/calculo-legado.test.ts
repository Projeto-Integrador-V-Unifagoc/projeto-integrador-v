import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { describe, expect, it } from "vitest";
import {
  calcularBoletim,
  type AvaliacaoResumo,
  type BoletimDisciplina,
} from "./calculo-legado";

const REFERENCIA = "27be0d9c5306eda581d3aacffa1028b2671424b5";
const CAMINHO_REFERENCIA = "backend/src/Modules/notas/models/Nota.ts";
const fonteReferencia = execFileSync(
  "git",
  ["show", `${REFERENCIA}:${CAMINHO_REFERENCIA}`],
  { cwd: resolve(__dirname, "../../.."), encoding: "utf8" },
);
const moduloReferencia: { calcularBoletim?: typeof calcularBoletim } = {};
new Function(
  "exports",
  transpileModule(fonteReferencia, {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
  }).outputText,
)(moduloReferencia);
const calcularReferencia = moduloReferencia.calcularBoletim!;

const prova: AvaliacaoResumo = { id: "p1", tipo: "PROVA", descricao: null, valor: 20 };
const tpi: AvaliacaoResumo = { id: "t1", tipo: "TPI", descricao: null, valor: 80 };
const recuperacao: AvaliacaoResumo = { id: "r1", tipo: "RECUPERACAO", descricao: null, valor: 100 };
const plano = [prova, tpi, recuperacao];

interface CasoLegado {
  nome: string;
  avaliacoes: AvaliacaoResumo[];
  notas: Array<[string, number]>;
}

const casos: CasoLegado[] = [
  { nome: "ausência de plano e notas", avaliacoes: [], notas: [] },
  { nome: "plano sem notas lançadas", avaliacoes: plano, notas: [] },
  { nome: "denominador apenas das avaliações lançadas", avaliacoes: plano, notas: [["p1", 15]] },
  { nome: "nota zero lançada", avaliacoes: plano, notas: [["p1", 0]] },
  {
    nome: "plano regular que ainda não soma 100",
    avaliacoes: [prova, { ...tpi, valor: 5 }, recuperacao],
    notas: [["p1", 14], ["t1", 4], ["r1", 80]],
  },
  { nome: "regular 50 sem recuperação", avaliacoes: plano, notas: [["p1", 10], ["t1", 40]] },
  { nome: "regular 50 com recuperação 80", avaliacoes: plano, notas: [["p1", 10], ["t1", 40], ["r1", 80]] },
  { nome: "recuperação inferior ao regular", avaliacoes: plano, notas: [["p1", 10], ["t1", 40], ["r1", 40]] },
  { nome: "recuperação zero lançada", avaliacoes: plano, notas: [["p1", 10], ["t1", 40], ["r1", 0]] },
  { nome: "limite de aprovação 60", avaliacoes: plano, notas: [["p1", 20], ["t1", 40]] },
  { nome: "regular imediatamente abaixo de 60", avaliacoes: plano, notas: [["p1", 20], ["t1", 39.99]] },
  { nome: "retificação regular 70 com recuperação 80 preservada", avaliacoes: plano, notas: [["p1", 14], ["t1", 56], ["r1", 80]] },
  { nome: "arredondamento decimal legado", avaliacoes: plano, notas: [["p1", 10.004], ["t1", 39.995], ["r1", 59.999]] },
  { nome: "notas fora do plano ignoradas", avaliacoes: plano, notas: [["p1", 10], ["t1", 40], ["fora-do-plano", 100]] },
  {
    nome: "primeira recuperação usada quando há mais de uma",
    avaliacoes: [...plano, { ...recuperacao, id: "r2" }],
    notas: [["p1", 10], ["t1", 40], ["r1", 40], ["r2", 80]],
  },
];

describe("replay histórico de calcularBoletim", () => {
  it("preserva exatamente o helper e a função da referência imutável", () => {
    const fonteLegado = readFileSync(resolve(__dirname, "calculo-legado.ts"), "utf8");
    const inicio = "const arredondar =";
    expect(fonteReferencia).toContain(inicio);
    expect(fonteLegado).toContain(inicio);
    expect(fonteLegado.slice(fonteLegado.indexOf(inicio)).replace(/\r\n/g, "\n"))
      .toBe(fonteReferencia.slice(fonteReferencia.indexOf(inicio)).replace(/\r\n/g, "\n"));
  });

  it.each(casos)("equivale à referência: $nome", ({ avaliacoes, notas }) => {
    expect(calcularBoletim(avaliacoes, new Map(notas)))
      .toEqual(calcularReferencia(avaliacoes, new Map(notas)));
  });

  it("distingue nota zero lançada de ausência de nota", () => {
    const semNota = calcularBoletim(plano, new Map());
    const zero = calcularBoletim(plano, new Map([["p1", 0]]));

    expect(semNota).toMatchObject({
      pontosMaximos: 0,
      mediaParcial: null,
      mediaFinal: null,
      situacao: "NAO_LANCADA",
      alerta: false,
    });
    expect(zero).toMatchObject({
      pontosMaximos: 20,
      mediaParcial: 0,
      mediaFinal: 0,
      situacao: "EM_ANDAMENTO",
      alerta: true,
    });
  });

  it("reproduz regular 50, recuperação 80 e retificação regular 70", () => {
    const notas = new Map([["p1", 10], ["t1", 40]]);
    const regular50: BoletimDisciplina = {
      pontosObtidos: 50,
      pontosMaximos: 100,
      mediaParcial: 50,
      notaRecuperacao: null,
      mediaFinal: 50,
      situacao: "EM_RECUPERACAO",
      etapaRegularCompleta: true,
      elegivelRecuperacao: true,
      alerta: true,
    };
    expect(calcularBoletim(plano, notas)).toEqual(regular50);

    notas.set("r1", 80);
    expect(calcularBoletim(plano, notas)).toEqual({
      ...regular50,
      notaRecuperacao: 80,
      mediaFinal: 80,
      situacao: "APROVADO",
    });

    notas.set("p1", 14);
    notas.set("t1", 56);
    expect(calcularBoletim(plano, notas)).toEqual({
      pontosObtidos: 70,
      pontosMaximos: 100,
      mediaParcial: 70,
      notaRecuperacao: 80,
      mediaFinal: 70,
      situacao: "APROVADO",
      etapaRegularCompleta: true,
      elegivelRecuperacao: false,
      alerta: false,
    });
  });
});
