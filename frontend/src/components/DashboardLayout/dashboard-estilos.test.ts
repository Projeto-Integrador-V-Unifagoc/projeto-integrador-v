import { describe, expect, it } from "vitest";
import { theme } from "../../theme";
import { CORES_DASHBOARD, CORES_TIPO_AVALIACAO, ESTADOS } from "./dashboard-estilos";

// WCAG 2.2, 1.4.3: texto normal precisa de contraste ≥ 4,5:1 com o fundo.
function luminancia(hex: string) {
  const curto = hex.replace("#", "");
  const completo = curto.length === 3 ? [...curto].map((c) => c + c).join("") : curto;
  const [r, g, b] = (completo.match(/../g) ?? []).map((canal) => {
    const valor = parseInt(canal, 16) / 255;
    return valor <= 0.03928 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string) {
  const [maior, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (maior + 0.05) / (menor + 0.05);
}

const { superficie, superficieSutil, texto, textoSuave, textoApagado, acento, acentoSuave } = CORES_DASHBOARD;

const pares: Array<[string, string, string]> = [
  ...[texto, textoSuave, textoApagado, acento].flatMap((cor) => [
    [`${cor} sobre superfície`, cor, superficie] as [string, string, string],
    [`${cor} sobre superfície sutil`, cor, superficieSutil] as [string, string, string],
  ]),
  ["branco sobre o acento (botão primário)", "#FFFFFF", acento],
  ["acento sobre acento suave", acento, acentoSuave],
  ...Object.entries(ESTADOS).flatMap(([nome, cores]) => [
    [`estado ${nome}: texto sobre o próprio fundo`, cores.texto, cores.fundo] as [string, string, string],
    [`estado ${nome}: texto sobre superfície`, cores.texto, superficie] as [string, string, string],
  ]),
  ...Object.entries(CORES_TIPO_AVALIACAO).map(([nome, cores]) => [`tipo ${nome}`, cores.texto, cores.fundo] as [string, string, string]),
];

describe("tokens do padrão dos dashboards", () => {
  it.each(pares)("%s tem contraste AA (≥ 4,5:1)", (_nome, frente, fundo) => {
    expect(contraste(frente, fundo)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["primary", "error", "success", "warning", "info"] as const)(
    "tema: texto branco sobre %s.main tem contraste AA (botões e chips preenchidos)",
    (papel) => {
      expect(contraste(theme.palette[papel].contrastText, theme.palette[papel].main)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(theme.palette[papel].main, superficie)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("tema usa o mesmo azul, vermelho e texto dos tokens", () => {
    expect(theme.palette.primary.main).toBe(acento);
    expect(theme.palette.error.main).toBe(ESTADOS.critico.texto);
    expect(theme.palette.text.primary).toBe(texto);
    expect(theme.palette.background.paper).toBe(superficie);
  });

  it("o ciano da marca não serve para texto (só logo e sidebar)", () => {
    expect(contraste(CORES_DASHBOARD.marca, superficie)).toBeLessThan(4.5);
  });
});
