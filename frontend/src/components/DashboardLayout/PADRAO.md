# Padrão visual dos dashboards

Definição do layout das páginas iniciais de aluno e professor (`/home`). Os valores vivem em
[`dashboard-estilos.ts`](./dashboard-estilos.ts); este documento explica como usá-los e por quê.

## Princípio

Calmo e neutro, com uma cor de ação. A cor aparece só onde algo pede ação (risco, atraso, nota faltando),
sempre acompanhada de texto. A referência visual são os painéis de produtividade no estilo SaaS: saudação,
caixa de IA, 4 indicadores e listas leves em duas colunas.

**Compatibilidade com o resto do sistema (Organograma).** As demais páginas ainda não seguem este padrão,
então o dashboard não pode parecer outro produto:

- **Fonte:** a do tema global. É Roboto, que cai para Arial quando não está instalada, por isso há só dois pesos reais: 400 e 700.
- **Fundo:** página branca, como as outras telas. A profundidade vem dos cartões (borda + sombra leve).
- **Saudação:** 28 px/700 (24 px no celular), um degrau acima dos números dos KPIs, para ser o primeiro ponto de leitura. Continua no mesmo peso dos títulos das outras páginas.
- **Cores:** o acento é o ciano da marca em tom escuro (`#06789A`). O ciano claro (`#05B5E6`) segue no logo e na sidebar.
- **Tema MUI:** o global não muda. Tudo aqui vale só dentro do dashboard e dos seus painéis laterais.

## Tokens

### Cor

| Token | Valor | Uso |
|---|---|---|
| `texto` | `#1F2733` | Títulos, nomes, números |
| `textoSuave` | `#5F6B7A` | Texto secundário, rótulos de KPI |
| `textoApagado` | `#667085` | Metadados e legendas (≥ 4,5:1 inclusive em `superficieSutil`) |
| `iconeApagado` | `#98A2B3` | Só ícones decorativos (chevron). Nunca texto |
| `superficie` / `superficieSutil` | `#FFFFFF` / `#F2F4F7` | Cartão / tile, hover |
| `borda` / `divisoria` / `bordaControle` | `#E8EBEF` / `#F0F2F5` / `#D0D5DD` | Cartão / entre linhas / botão secundário |
| `acento` / `acentoHover` / `acentoSuave` | `#06789A` / `#055F7A` / `#E6F6FB` | A única cor de ação |
| `marca` | `#05B5E6` | Logo e sidebar. Contraste 2,4:1, nunca texto |

**Estados** (`ESTADOS`): texto escuro sobre fundo claro, mais um ponto para chips.

| Estado | Texto | Fundo | Quando |
|---|---|---|---|
| `critico` | `#B42318` | `#FEF3F2` | Risco alto, frequência < 75% |
| `atencao` | `#8A5200` | `#FFF6E5` | Risco médio, média < 60%, atraso de devolução, notas faltantes |
| `ok` | `#1E7A3C` | `#ECF7EF` | Só ícone de estado vazio ("nada pendente") |
| `neutro` | `#4B5563` | `#EEF2F6` | Contadores, "Sem risco", "Sem dados", "Em dia" |

"Sem risco" é **neutro**, não verde: o verde por linha competiria com o vermelho e o âmbar.

**Tipos de avaliação** (`CORES_TIPO_AVALIACAO`): Prova = acento, Trabalho = verde, TPI = violeta
`#6941C6`, Recuperação = âmbar. São usados só no ícone de 28 px da linha.

O teste `dashboard-estilos.test.ts` garante contraste ≥ 4,5:1 (WCAG 2.2, 1.4.3) em todos os pares.

### Tipografia (`TIPO_DASHBOARD`, `PESO`)

| Token | px | Uso |
|---|---|---|
| `saudacao` | 28 / 700 | "Olá, nome!" (24 no celular) |
| `valorKpi` | 24 / 700 | Número do indicador |
| `painel` | 15 / 700 | Título do painel |
| `corpo` | 14 | Texto de linha (nome em 700) |
| `secundario` | 13 | Resumo do cabeçalho, rótulo de KPI, descrições |
| `legenda` | 12 | Metadados, chips, rodapé. **Mínimo absoluto** |

Sem maiúsculas em rótulos de dado. Números em coluna usam `sxNumeroColuna` (algarismos tabulares, à direita).

### Forma e espaço

- **Grade de 8 px:**
  - Gap de 16 entre blocos.
  - Padding de 16 nos cartões.
  - Cabeçalho de painel com 48 px.
  - Linha com ≥ 52 px.
  - Botão com 30 px (36 nos rodapés dos painéis laterais).
- **Raio:** 12 no cartão, 8 em botões e quadrados de ícone, 999 em chips.
- **Sombra do cartão:** `0 1px 2px rgba(16,24,40,.04)` (`SOMBRA_CARTAO`).

## Componentes (anatomia)

| Peça | Componente | Regras |
|---|---|---|
| Cabeçalho | `DashboardCabecalho` | Data + contexto (curso, período) em 12 px; saudação; **resumo acionável** em 13 px ("4 alunos em risco alto · 10 pendências"), não dados cadastrais |
| Caixa de IA | `AssistenteIaCaixa` | Campo de chat; no máximo 2 sugestões em chips cinza; envio redondo no acento |
| Indicador | `IndicadorCard` | Ícone contornado neutro + rótulo; 1 número; `complemento` curto opcional; **1 linha** de apoio. `alerta: "critico" \| "atencao"` colore o número e põe um ponto no ícone |
| Painel | `DashboardPainel` | Título + contador cinza; `subtitulo` só quando muda a leitura ("5 mais urgentes"); ação em texto neutro. `semPadding` para listas |
| Linha | `LinhaPainel` / `ListaPainel` | Ícone 28 px, título 14/700, meta 12 px, divisória fina. Com `onClick`, a linha inteira é um botão (sem outros botões dentro) |
| Tabela leve | `sxTabelaLeve` (ver `TabelaDisciplinasAluno`) | Rótulos de coluna **uma vez**, na mesma grade das linhas (`subgrid`); colunas `1fr 64px 64px auto`; nome em até 2 linhas; risco como chip na linha de meta |
| Chip | `sxSelo(tom, { ponto })` / `SeloRisco` | 12 px/700, pílula; `ponto` para estados ("● Risco alto") |
| Botões | `sxBotaoPrimario` / `sxBotaoSecundario` / `sxBotaoTexto` | **No máximo um primário por linha ou painel**; o resto contornado ou texto |
| Detalhe | `PainelDetalhe` | Drawer de 560 px; mesmos tokens; avisos no fundo claro do estado |
| Rodapé | `DashboardRodape` | "Atualizado às HH:MM" + "Atualizar dados" |

## Regras

1. **Neutro por padrão.** Cor de estado só onde há risco, atraso ou nota faltando, e sempre com texto junto (WCAG 1.4.1).
2. **Uma cor de ação** (acento), com no máximo um botão preenchido por linha ou painel.
3. **Hierarquia por tamanho e peso**, não por cor. Nada abaixo de 12 px.
4. **Um número por KPI** e uma linha de apoio. Não repetir no apoio o que o título ou o filtro já dizem.
5. **Sem texto de instrução** ("passe o cursor…", "ordenados por…", "conforme o Regimento"). A ordem e a interação têm de ser evidentes.
6. **A informação aparece uma vez:** o horário fica só no rodapé, e os rótulos de coluna aparecem só no cabeçalho da lista.

## Grade e redimensionamento

- **Largura máxima:** conteúdo com `maxWidth: 1600`, centralizado.
  - Em telas de até 1920 px o layout ocupa toda a área útil, porque cada painel já limita o próprio texto.
  - O limite só age em monitores ultralargos (2560+).
- **Medida pelo container, não pela janela:** o layout declara `container-type: inline-size` (nome `dashboard`) e decide pelo espaço útil. Assim a sidebar de 251 px não quebra a conta.
- **KPIs:** `repeat(auto-fit, minmax(200px, 1fr))`, o que dá 4, 2 ou 1 coluna.
- **Painéis** (lado a lado quando a área útil tem ≥ 880 px; abaixo disso, empilhados):
  - 1ª linha em `2fr 1fr`: o painel principal é uma tabela e o nome não pode ser cortado.
  - 2ª linha em `7fr 5fr`.
- **Cabeçalho:** saudação e IA lado a lado com ≥ 880 px; abaixo disso, empilhados.
- **Listas em tabela:** abaixo de 600 px (celular), as colunas viram linhas.
- **Tamanho estável com filtros:**
  - Listas que mudam com filtros reservam a altura das linhas visíveis (`alturaMinima` do `DashboardPainel`).
  - Os filtros têm largura fixa.
  - Assim, trocar turma ou disciplina não redimensiona nenhum bloco.
- **Tabela leve:** cabeçalho e linhas compartilham a mesma grade (`sxTabelaLeve`, CSS `subgrid`), e os rótulos ficam exatamente sobre os números.

## Como criar um painel novo

1. Envolva em `DashboardPainel` com título curto e, se for lista, `semPadding`.
2. Monte as linhas com `ListaPainel` + `LinhaPainel` (ou a grade de colunas da tabela leve).
3. Use só tokens de `dashboard-estilos.ts`: nada de hex solto nem de `theme.palette.*`.
4. Escolha a cor pelo estado (`ESTADOS`), nunca pela categoria visual. Se não pede ação, é neutro.
5. Se o texto cabe no título, no chip ou no tooltip, não escreva um subtítulo.

## Embasamento

- **Primeira impressão e familiaridade:**
  - Tuch et al. (2012, *International Journal of Human-Computer Studies*): baixa complexidade visual e alta prototipicidade (parecer com o padrão do gênero) produzem as melhores avaliações de beleza na primeira impressão.
  - Reinecke et al. (2013, *CHI*): a atratividade cai com mais complexidade e mais colorido; colorido moderado tem as melhores notas.
- **Cor como sinal:** Healey & Enns (2012, *IEEE TVCG*): a detecção pré-atentiva de cor depende de distratores homogêneos. Com o resto neutro, o vermelho e o âmbar são vistos de imediato.
- **Atenção acima da dobra:** NN/g, *Scrolling and Attention* (2018): 57% do tempo de visualização fica na primeira tela e 74% nas duas primeiras. Por isso a compactação leva a primeira linha de painéis para a primeira tela.
- **Texto conciso:** Morkes & Nielsen (1997): texto conciso melhorou a usabilidade medida em 58%; conciso, escaneável e objetivo, em 124%.
- **Limites ao compactar:**
  - WCAG 2.2: 1.4.3 (contraste), 1.4.1 (cor não é o único meio) e 2.5.8 (alvo ≥ 24 px).
  - Escala do Material Design 3: *body small* de 12 px como mínimo.
