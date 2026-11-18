import type { SxProps, Theme } from "@mui/material/styles";

// Tokens visuais do padrão dos dashboards (aluno e professor): cor só para estado (risco, atraso),
// uma cor de ação, dois pesos de fonte e nada abaixo de 12 px. O tema global (theme.ts) lê as cores daqui,
// então primary, error, success e o fundo dos componentes MUI seguem o mesmo padrão em todas as telas.
// Todo par texto/fundo daqui é verificado (≥ 4,5:1, WCAG 1.4.3) em dashboard-estilos.test.ts.

export const CORES_DASHBOARD = {
  // Superfícies: página branca como as demais telas do sistema; cartões com borda e sombra leve.
  superficie: "#FFFFFF",
  superficieSutil: "#F2F4F7",
  borda: "#E8EBEF",
  /** Divisória entre linhas de uma lista, mais leve que a borda do cartão. */
  divisoria: "#F0F2F5",
  /** Contorno de botão secundário e campos. */
  bordaControle: "#D0D5DD",
  // Texto: três níveis de cinza frio.
  texto: "#1F2733",
  textoSuave: "#5F6B7A",
  textoApagado: "#667085",
  /** Só para ícones decorativos (chevrons), nunca para texto. */
  iconeApagado: "#98A2B3",
  // Ação: a única cor de destaque fora dos estados.
  acento: "#06789A",
  acentoHover: "#055F7A",
  acentoSuave: "#E6F6FB",
  acentoSuaveHover: "#D3EEF7",
  /** Ciano da marca (logo, sidebar). Contraste 2,4:1: nunca usar como texto. */
  marca: "#05B5E6",
} as const;

export type TomEstado = "critico" | "atencao" | "ok" | "neutro" | "acento";

/** Cores de estado: texto escuro sobre fundo claro e um ponto para chips e alertas. */
export const ESTADOS: Record<TomEstado, { texto: string; fundo: string; ponto: string }> = {
  critico: { texto: "#B42318", fundo: "#FEF3F2", ponto: "#D92D20" },
  atencao: { texto: "#8A5200", fundo: "#FFF6E5", ponto: "#DC6803" },
  ok: { texto: "#1E7A3C", fundo: "#ECF7EF", ponto: "#16A34A" },
  neutro: { texto: "#4B5563", fundo: "#EEF2F6", ponto: "#98A2B3" },
  acento: { texto: CORES_DASHBOARD.acento, fundo: CORES_DASHBOARD.acentoSuave, ponto: CORES_DASHBOARD.acento },
};

/** Cor por tipo de avaliação: só no ícone pequeno da linha, para diferenciar prova, trabalho e TPI de relance. */
export const CORES_TIPO_AVALIACAO: Record<"PROVA" | "TRABALHO" | "TPI" | "RECUPERACAO", { texto: string; fundo: string }> = {
  PROVA: { texto: CORES_DASHBOARD.acento, fundo: CORES_DASHBOARD.acentoSuave },
  TRABALHO: { texto: "#1E7A3C", fundo: "#ECF7EF" },
  TPI: { texto: "#6941C6", fundo: "#F4F0FF" },
  RECUPERACAO: { texto: "#8A5200", fundo: "#FFF6E5" },
};

/**
 * Escala tipográfica (px). Nada abaixo de 12 px. A fonte é a do tema do sistema (Roboto, que cai para
 * Arial quando não instalada), então só há dois pesos reais: 400 e 700 (PESO).
 * A saudação usa 28 px/700: um degrau acima dos números dos KPIs (24 px) para ser o primeiro ponto de leitura.
 */
export const TIPO_DASHBOARD = {
  saudacao: 28,
  valorKpi: 24,
  painel: 15,
  corpo: 14,
  secundario: 13,
  legenda: 12,
} as const;

export const PESO = { regular: 400, forte: 700 } as const;

export const SOMBRA_CARTAO = "0 1px 2px rgba(16, 24, 40, 0.04)";

export const sxCartaoDashboard: SxProps<Theme> = {
  bgcolor: CORES_DASHBOARD.superficie,
  // O Paper do MUI aplica a cor de texto do tema global (#363535, cinza quente); aqui vale o cinza frio do padrão.
  color: CORES_DASHBOARD.texto,
  border: `1px solid ${CORES_DASHBOARD.borda}`,
  borderRadius: 3,
  boxShadow: SOMBRA_CARTAO,
};

/** Chip/pílula: contador, risco e estados. Com `ponto`, mostra o marcador colorido à esquerda. */
export function sxSelo(tom: TomEstado, { ponto = false }: { ponto?: boolean } = {}) {
  const cores = ESTADOS[tom];
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 0.75,
    flexShrink: 0,
    px: 1,
    py: 0.25,
    borderRadius: 999,
    fontSize: TIPO_DASHBOARD.legenda,
    fontWeight: PESO.forte,
    lineHeight: 1.5,
    whiteSpace: "nowrap",
    bgcolor: cores.fundo,
    color: cores.texto,
    ...(ponto && { "&::before": { content: '""', width: 6, height: 6, borderRadius: "50%", bgcolor: cores.ponto, flexShrink: 0 } }),
  } as const;
}

/** O mesmo selo aplicado a um Chip do MUI (para telas que já usam Chip). */
export function sxChipSelo(tom: TomEstado, opcoes: { ponto?: boolean } = {}) {
  return { ...sxSelo(tom, opcoes), height: "auto", border: 0, "& .MuiChip-label": { p: 0, overflow: "visible" } } as const;
}

/**
 * Moldura das páginas internas: fundo branco, sem a margem lateral duplicada (o <main> já dá 24 px) e
 * conteúdo limitado a 1600 px. Usada pelo PaginaPadrao e direto no Container de telas que mantêm o próprio.
 */
export const sxPaginaPadrao = { p: 0, pb: 3, border: 0, overflowY: "auto", bgcolor: CORES_DASHBOARD.superficie, color: CORES_DASHBOARD.texto } as const;
export const sxConteudoPagina = { maxWidth: 1600, mx: "auto", width: "100%" } as const;

/** Quadrado de ícone das linhas (28 px). Neutro por padrão. */
export function sxIconeQuadrado(cores: { texto: string; fundo: string } = ESTADOS.neutro, tamanho = 28) {
  return {
    width: tamanho,
    height: tamanho,
    borderRadius: 2,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    bgcolor: cores.fundo,
    color: cores.texto,
  } as const;
}

const baseBotao = {
  width: "auto",
  minWidth: 0,
  height: 30,
  px: 1.5,
  borderRadius: 2,
  fontSize: TIPO_DASHBOARD.secundario,
  fontWeight: PESO.forte,
  whiteSpace: "nowrap",
  boxShadow: "none",
} as const;

/** Ação principal: no máximo uma por linha ou painel. */
export const sxBotaoPrimario = {
  ...baseBotao,
  bgcolor: CORES_DASHBOARD.acento,
  color: "#FFFFFF",
  "&:hover": { bgcolor: CORES_DASHBOARD.acentoHover, boxShadow: "none" },
  "&.Mui-disabled": { bgcolor: CORES_DASHBOARD.superficieSutil, color: CORES_DASHBOARD.textoApagado },
} as const;

/** Ação secundária: contornada e neutra. */
export const sxBotaoSecundario = {
  ...baseBotao,
  bgcolor: CORES_DASHBOARD.superficie,
  color: CORES_DASHBOARD.texto,
  border: `1px solid ${CORES_DASHBOARD.bordaControle}`,
  "&:hover": { bgcolor: CORES_DASHBOARD.superficieSutil },
  "&.Mui-disabled": { bgcolor: CORES_DASHBOARD.superficie, color: CORES_DASHBOARD.textoApagado, borderColor: CORES_DASHBOARD.borda },
} as const;

/** Ação de texto neutra (ex.: "Ver todos" no cabeçalho do painel). */
export const sxBotaoTexto = {
  ...baseBotao,
  px: 1,
  color: CORES_DASHBOARD.texto,
  "&:hover": { bgcolor: CORES_DASHBOARD.superficieSutil },
} as const;

/**
 * Abas (MUI Tabs) no padrão: texto cinza, aba ativa em texto escuro 700 e indicador no acento.
 * Substitui o "primary" do tema (ciano claro, 2,4:1 sobre branco) nas telas de lançamento.
 */
export const sxAbas = {
  minHeight: 40,
  borderBottom: `1px solid ${CORES_DASHBOARD.borda}`,
  "& .MuiTab-root": {
    minHeight: 40,
    px: 1.5,
    textTransform: "none",
    fontSize: TIPO_DASHBOARD.secundario,
    fontWeight: PESO.forte,
    color: CORES_DASHBOARD.textoSuave,
  },
  "& .MuiTab-root.Mui-selected": { color: CORES_DASHBOARD.texto },
  "& .MuiTabs-indicator": { backgroundColor: CORES_DASHBOARD.acento, height: 2 },
} as const;

/**
 * Tabela leve (lista com colunas): cabeçalho e linhas compartilham a MESMA grade via `subgrid`,
 * para os rótulos ("Média", "Freq.") ficarem exatamente sobre os números. Com grades separadas,
 * uma coluna `auto` (ações) teria larguras diferentes no cabeçalho e nas linhas.
 * Abaixo de 600 px vira uma coluna só (a linha empilha) e o cabeçalho some.
 */
export function sxTabelaLeve(colunas: string) {
  const subgrade = { gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "subgrid", alignItems: "center" } as const;
  return {
    tabela: { display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: colunas }, columnGap: 1.5 },
    cabecalho: { ...subgrade, display: { xs: "none", sm: "grid" }, alignItems: "end", height: ALTURA_CABECALHO_COLUNAS, px: 2, pb: 0.5, fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado },
    lista: { ...subgrade, listStyle: "none", m: 0, p: 0 },
    linha: { ...subgrade, rowGap: 1, minHeight: ALTURA_LINHA, px: 2, py: 0.75, borderBottom: `1px solid ${CORES_DASHBOARD.divisoria}`, "&:last-of-type": { borderBottom: 0 } },
  } as const;
}

/**
 * Tabela de dados (DataTable/DataGrid) no padrão: fundo branco, cabeçalho em cinza frio com rótulo
 * 12/700, linhas sem zebra separadas por divisória fina. Aplicado pelo `sx` de cada uso para não mudar
 * o componente compartilhado (secretaria e professor seguem com o visual antigo até a fase deles).
 */
export const sxTabelaDados = {
  mt: 0,
  backgroundColor: CORES_DASHBOARD.superficie,
  border: `1px solid ${CORES_DASHBOARD.borda}`,
  borderRadius: 2,
  color: CORES_DASHBOARD.texto,
  fontSize: TIPO_DASHBOARD.secundario,
  "--DataGrid-rowBorderColor": CORES_DASHBOARD.divisoria,
  // O DataGrid (v8) pinta cabeçalho, botões de ordenar e sobreposições com estas variáveis, que vêm do
  // "paper" creme (#F9F7F0) do tema global. Ele as declara numa classe própria (.MuiDataGridVariables-*)
  // injetada depois do sx; "&&" dobra a especificidade para o padrão prevalecer.
  "&&": {
    "--DataGrid-containerBackground": CORES_DASHBOARD.superficieSutil,
    "--DataGrid-t-header-background-base": CORES_DASHBOARD.superficieSutil,
    "--DataGrid-t-color-background-base": CORES_DASHBOARD.superficie,
    "--DataGrid-t-color-background-overlay": CORES_DASHBOARD.superficie,
    "--DataGrid-t-cell-background-pinned": CORES_DASHBOARD.superficie,
  },
  "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-columnHeader, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller": { backgroundColor: CORES_DASHBOARD.superficieSutil },
  "& .MuiDataGrid-footerContainer .MuiIconButton-root": { backgroundColor: "transparent" },
  "& .MuiDataGrid-columnHeaderTitle": { fontSize: TIPO_DASHBOARD.legenda, fontWeight: PESO.forte, color: CORES_DASHBOARD.textoSuave },
  "& .MuiDataGrid-columnSeparator": { display: "none" },
  "& .even, & .odd": { backgroundColor: CORES_DASHBOARD.superficie },
  "& .MuiDataGrid-row:hover": { backgroundColor: CORES_DASHBOARD.superficieSutil },
  "& .MuiDataGrid-cell": { borderColor: CORES_DASHBOARD.divisoria },
  "& .MuiDataGrid-footerContainer": { backgroundColor: CORES_DASHBOARD.superficie, borderColor: CORES_DASHBOARD.divisoria },
} as const;

/** Altura mínima de uma linha de lista ou tabela (px, com a divisória). */
export const ALTURA_LINHA = 56;
/** Altura da linha de rótulos das colunas da tabela leve (px). */
export const ALTURA_CABECALHO_COLUNAS = 32;
/** Altura do botão de rodapé de lista, como "Mostrar todas" (px, com margens). */
export const ALTURA_ACAO_LISTA = 40;

/**
 * Altura a reservar no conteúdo de um painel cuja lista muda com filtros, calculada das mesmas
 * constantes que definem as linhas: o painel não muda de tamanho quando o filtro traz menos itens.
 */
export function alturaReservada(linhas: number, { cabecalhoColunas = false, acao = false }: { cabecalhoColunas?: boolean; acao?: boolean } = {}) {
  return linhas * ALTURA_LINHA + (cabecalhoColunas ? ALTURA_CABECALHO_COLUNAS : 0) + (acao ? ALTURA_ACAO_LISTA : 0);
}

/** Texto só para leitor de tela (fica fora da tela, mas é lido). */
export const sxSomenteLeitor = {
  position: "absolute",
  width: 1,
  height: 1,
  p: 0,
  m: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

/**
 * Rótulo de coluna junto do número ("Média", "Frequência"): visível no celular, onde o cabeçalho das
 * colunas some, e só para leitor de tela a partir de 600 px, onde o cabeçalho já mostra o rótulo.
 */
export const sxRotuloColuna = {
  mr: 0.75,
  fontSize: TIPO_DASHBOARD.legenda,
  color: CORES_DASHBOARD.textoApagado,
  "@media (min-width: 600px)": sxSomenteLeitor,
} as const;

/**
 * Número em coluna: algarismos tabulares, alinhado à direita. `position: relative` prende o rótulo só
 * para leitor de tela (absoluto) dentro da célula; sem isso ele sairia da área de rolagem do <main>
 * e esticaria a página, criando uma segunda barra de rolagem.
 */
export const sxNumeroColuna = {
  position: "relative",
  fontSize: TIPO_DASHBOARD.corpo,
  fontWeight: PESO.regular,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
} as const;
