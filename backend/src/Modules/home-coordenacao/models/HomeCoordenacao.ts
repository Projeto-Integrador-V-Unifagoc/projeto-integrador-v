export type ClassificacaoCoordenacao = "DADOS_INSUFICIENTES" | "DIFICULDADE" | "ATENCAO" | "ADEQUADO";

export const CRITERIOS_COORDENACAO = {
  coberturaMinima: 50,
  dificuldadeAbaixoDe: 60,
  atencaoAbaixoDe: 75,
} as const;

