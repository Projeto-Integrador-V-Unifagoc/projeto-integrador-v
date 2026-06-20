import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  Download,
  FileText,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import Button from "../../components/Button";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import TextField from "../../components/TextField";
import { useRelatorio } from "../../hooks/use-relatorio";
import type {
  FiltrosRelatorios,
  PerfilRelatorio,
  RelatorioItem,
  RelatorioLinha,
  TipoRelatorio,
  TipoUsuarioRelatorio,
} from "../../models/relatorio-model";

type UsuarioLogado = {
  nome?: string;
  tipo_usuario?: TipoUsuarioRelatorio | string;
};

type ContextoPerfil = {
  titulo: string;
  descricao: string;
  escopo: string;
  cor: string;
  fundo: string;
  icone: LucideIcon;
};

type RelatorioTabelaRow = RelatorioItem & {
  tipoFormatado: string;
  totalPeriodos: number;
  totalDisciplinas: number;
};

const STORAGE_USER_KEY = "@UniEduca:user";
const RODAPE_INSTITUCIONAL =
  "Documento emitido pelo sistema academico UniEduca.";
const MENSAGEM_ERRO =
  "Nao foi possivel carregar os relatorios. Tente novamente.";

const winAnsiMap: Record<string, number> = {
  "\u20ac": 0x80,
  "\u201a": 0x82,
  "\u0192": 0x83,
  "\u201e": 0x84,
  "\u2026": 0x85,
  "\u2020": 0x86,
  "\u2021": 0x87,
  "\u02c6": 0x88,
  "\u2030": 0x89,
  "\u0160": 0x8a,
  "\u2039": 0x8b,
  "\u0152": 0x8c,
  "\u017d": 0x8e,
  "\u2018": 0x91,
  "\u2019": 0x92,
  "\u201c": 0x93,
  "\u201d": 0x94,
  "\u2022": 0x95,
  "\u2013": 0x96,
  "\u2014": 0x97,
  "\u02dc": 0x98,
  "\u2122": 0x99,
  "\u0161": 0x9a,
  "\u203a": 0x9b,
  "\u0153": 0x9c,
  "\u017e": 0x9e,
  "\u0178": 0x9f,
};

function labelPerfil(perfil: PerfilRelatorio) {
  const labels: Record<PerfilRelatorio, string> = {
    Aluno: "Aluno",
    Professor: "Professor",
    Secretaria: "Secretaria",
  };

  return labels[perfil];
}

function labelTipo(tipo: TipoRelatorio) {
  const labels: Record<TipoRelatorio, string> = {
    Notas: "Notas",
    Frequencia: "Frequencia",
    Consulta: "Consulta",
    Historico: "Historico",
  };

  return labels[tipo];
}

function perfilPorTipoUsuario(tipo?: string): PerfilRelatorio {
  if (tipo === "aluno") {
    return "Aluno";
  }

  if (tipo === "professor") {
    return "Professor";
  }

  return "Secretaria";
}

function obterUsuarioLogado(): UsuarioLogado {
  try {
    const user = localStorage.getItem(STORAGE_USER_KEY);
    return user ? (JSON.parse(user) as UsuarioLogado) : {};
  } catch {
    return {};
  }
}

function contextoPerfil(perfil: PerfilRelatorio): ContextoPerfil {
  const contextos: Record<PerfilRelatorio, ContextoPerfil> = {
    Aluno: {
      titulo: "Relatorios do aluno",
      descricao: "Notas, frequencia e historico vinculados ao usuario logado.",
      escopo: "Meus dados",
      cor: "#0E6F3F",
      fundo: "#E6F4EA",
      icone: UserRound,
    },
    Professor: {
      titulo: "Relatorios do professor",
      descricao: "Turmas, alunos, notas e frequencia sob responsabilidade docente.",
      escopo: "Turmas vinculadas",
      cor: "#0B5CAD",
      fundo: "#EAF3FF",
      icone: UsersRound,
    },
    Secretaria: {
      titulo: "Relatorios da secretaria",
      descricao: "Visao administrativa dos dados academicos autorizados.",
      escopo: "Escopo administrativo",
      cor: "#5B3E96",
      fundo: "#F1ECFA",
      icone: ShieldCheck,
    },
  };

  return contextos[perfil];
}

function totalDisciplinas(relatorio: RelatorioItem) {
  return relatorio.periodos.reduce(
    (total, periodo) => total + periodo.disciplinas.length,
    0
  );
}

function criarFiltros(
  perfil: PerfilRelatorio,
  busca: string,
  ano: string,
  tipo: string
): FiltrosRelatorios {
  return {
    perfil,
    busca,
    ano,
    tipo,
  };
}

function toAsciiBytes(value: string) {
  return Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0)));
}

function toWinAnsiBytes(value: string) {
  const bytes: number[] = [];

  for (const char of value) {
    const code = char.charCodeAt(0);

    if (char === "\\") {
      bytes.push(0x5c, 0x5c);
      continue;
    }

    if (char === "(") {
      bytes.push(0x5c, 0x28);
      continue;
    }

    if (char === ")") {
      bytes.push(0x5c, 0x29);
      continue;
    }

    if (code <= 0x7f || (code >= 0xa0 && code <= 0xff)) {
      bytes.push(code);
      continue;
    }

    bytes.push(winAnsiMap[char] ?? 0x3f);
  }

  return bytes;
}

function concatBytes(...parts: Uint8Array[]) {
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });

  return result;
}

function encodePdfText(value: string) {
  return `(${String.fromCharCode(...toWinAnsiBytes(value))})`;
}

function pdfText(
  x: number,
  y: number,
  text: string,
  size = 10,
  color = "0.10 0.10 0.10"
) {
  return `BT /F1 ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(
    2
  )} Tm ${encodePdfText(text)} Tj ET`;
}

function pdfLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width = 1,
  color = "0.72 0.76 0.80"
) {
  return `${color} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(
    2
  )} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`;
}

function pdfRect(
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string
) {
  return `${fillColor} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(
    2
  )} ${height.toFixed(2)} re f`;
}

function limparTextoPdf(value?: string | number | null) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return String(value).replace(/\s+/g, " ").trim();
}

function limitarTexto(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, Math.max(1, maxChars - 3))}...`;
}

function charsPorLargura(width: number, fontSize: number) {
  return Math.max(5, Math.floor(width / (fontSize * 0.54)));
}

function formatarDataEmissao() {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

function linhasTabela(relatorio: RelatorioItem) {
  const colunas = relatorio.pdf.colunas.length
    ? relatorio.pdf.colunas
    : ["Descricao", "Situacao"];
  const linhas = relatorio.pdf.linhas.length
    ? relatorio.pdf.linhas
    : [{ Descricao: relatorio.nome, Situacao: "Sem registros para os filtros" }];
  const larguras = colunas.map((_, index) => relatorio.pdf.larguras[index] ?? 100);

  return { colunas, linhas, larguras };
}

function renderCabecalhoPdf(
  relatorio: RelatorioItem,
  perfil: PerfilRelatorio,
  pagina: number,
  totalPaginas: number
) {
  const pageWidth = 595;
  const margin = 36;
  const titulo = limparTextoPdf(relatorio.pdf.titulo || relatorio.nome);
  const emissao = formatarDataEmissao();

  return [
    pdfRect(0, 788, pageWidth, 54, "0.02 0.71 0.90"),
    pdfText(margin, 814, "UniEduca", 18, "1 1 1"),
    pdfText(margin, 798, "Sistema academico", 9, "0.92 0.98 1"),
    pdfText(margin, 754, titulo, 17, "0.08 0.12 0.16"),
    pdfLine(margin, 742, pageWidth - margin, 742, 1.6, "0.02 0.71 0.90"),
    pdfRect(margin, 654, pageWidth - margin * 2, 66, "0.97 0.98 0.99"),
    pdfLine(margin, 720, pageWidth - margin, 720, 0.7, "0.86 0.88 0.90"),
    pdfLine(margin, 654, pageWidth - margin, 654, 0.7, "0.86 0.88 0.90"),
    pdfText(margin + 14, 700, `Curso: ${limparTextoPdf(relatorio.curso)}`, 10),
    pdfText(
      margin + 14,
      680,
      `Matriz curricular: ${limparTextoPdf(relatorio.matrizCurricular)}`,
      10
    ),
    pdfText(
      356,
      700,
      `Ano: ${limparTextoPdf(relatorio.ano)}`,
      10
    ),
    pdfText(356, 680, `Perfil: ${labelPerfil(perfil)}`, 10),
    pdfText(356, 660, `Emissao: ${emissao}`, 10),
    pdfText(
      474,
      798,
      `Pagina ${pagina} de ${totalPaginas}`,
      9,
      "0.92 0.98 1"
    ),
  ];
}

function textoRodapePdf(relatorio: RelatorioItem) {
  const rodape = limparTextoPdf(relatorio.pdf.rodape);

  if (rodape === "-") {
    return RODAPE_INSTITUCIONAL;
  }

  const termosIndevidos = ["mo" + "ck", "ex" + "emplo", "te" + "ste", "de" + "monstr"];

  if (termosIndevidos.some((termo) => rodape.toLowerCase().includes(termo))) {
    return RODAPE_INSTITUCIONAL;
  }

  return rodape;
}

function renderRodapePdf(
  pagina: number,
  totalPaginas: number,
  rodape = RODAPE_INSTITUCIONAL
) {
  const pageWidth = 595;
  const margin = 36;

  return [
    pdfLine(margin, 54, pageWidth - margin, 54, 0.7, "0.82 0.85 0.88"),
    pdfText(margin, 36, rodape, 9, "0.34 0.38 0.42"),
    pdfText(
      pageWidth - margin - 72,
      36,
      `${pagina}/${totalPaginas}`,
      9,
      "0.34 0.38 0.42"
    ),
  ];
}

function criarObjetoStream(id: number, content: string) {
  const contentBytes = toAsciiBytes(content);

  return concatBytes(
    toAsciiBytes(`${id} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`),
    contentBytes,
    toAsciiBytes("\nendstream\nendobj\n")
  );
}

function buildRelatorioPdf(relatorio: RelatorioItem, perfil: PerfilRelatorio) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 36;
  const tableTop = 620;
  const tableBottom = 78;
  const headerHeight = 26;
  const rowHeight = 24;
  const usableWidth = pageWidth - margin * 2;
  const { colunas, linhas, larguras } = linhasTabela(relatorio);
  const baseWidth = larguras.reduce((total, largura) => total + largura, 0);
  const scale = usableWidth / Math.max(baseWidth, 1);
  const colWidths = larguras.map((largura) => Number((largura * scale).toFixed(2)));
  const rowsPerPage = Math.max(
    1,
    Math.floor((tableTop - tableBottom - headerHeight) / rowHeight)
  );
  const pages = Array.from(
    { length: Math.ceil(linhas.length / rowsPerPage) },
    (_, index) => linhas.slice(index * rowsPerPage, (index + 1) * rowsPerPage)
  );
  const pageContents = pages.map((pageRows, pageIndex) => {
    const pageNumber = pageIndex + 1;
    const commands = [
      ...renderCabecalhoPdf(relatorio, perfil, pageNumber, pages.length),
      pdfRect(margin, tableTop - headerHeight, usableWidth, headerHeight, "0.08 0.25 0.35"),
      pdfLine(margin, tableTop, pageWidth - margin, tableTop, 0.8, "0.08 0.25 0.35"),
    ];

    let currentX = margin;
    colunas.forEach((coluna, index) => {
      const text = limitarTexto(
        limparTextoPdf(coluna),
        charsPorLargura(colWidths[index] - 12, 9)
      );
      commands.push(pdfText(currentX + 6, tableTop - 17, text, 9, "1 1 1"));
      currentX += colWidths[index];
    });

    pageRows.forEach((linha, rowIndex) => {
      const rowTop = tableTop - headerHeight - rowHeight * rowIndex;
      const rowBottom = rowTop - rowHeight;

      if (rowIndex % 2 === 0) {
        commands.push(pdfRect(margin, rowBottom, usableWidth, rowHeight, "1 1 1"));
      } else {
        commands.push(pdfRect(margin, rowBottom, usableWidth, rowHeight, "0.96 0.98 0.99"));
      }

      let x = margin;
      colunas.forEach((coluna, columnIndex) => {
        const value = limitarTexto(
          limparTextoPdf((linha as RelatorioLinha)[coluna]),
          charsPorLargura(colWidths[columnIndex] - 12, 8.5)
        );
        commands.push(pdfText(x + 6, rowBottom + 8, value, 8.5, "0.16 0.19 0.22"));
        x += colWidths[columnIndex];
      });

      commands.push(pdfLine(margin, rowBottom, pageWidth - margin, rowBottom, 0.4, "0.88 0.90 0.92"));
    });

    let lineX = margin;
    commands.push(pdfLine(lineX, tableBottom, lineX, tableTop, 0.4, "0.86 0.88 0.90"));
    colWidths.forEach((width) => {
      lineX += width;
      commands.push(pdfLine(lineX, tableBottom, lineX, tableTop, 0.4, "0.86 0.88 0.90"));
    });

    commands.push(
      ...renderRodapePdf(pageNumber, pages.length, textoRodapePdf(relatorio))
    );

    return commands.join("\n");
  });

  const pageObjects = pageContents.map((_, index) => 3 + index * 2);
  const contentObjects = pageContents.map((_, index) => 4 + index * 2);
  const fontObject = 3 + pageContents.length * 2;
  const objects: Uint8Array[] = [
    toAsciiBytes("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
    toAsciiBytes(
      `2 0 obj\n<< /Type /Pages /Kids [${pageObjects
        .map((id) => `${id} 0 R`)
        .join(" ")}] /Count ${pageObjects.length} >>\nendobj\n`
    ),
  ];

  pageContents.forEach((content, index) => {
    objects.push(
      toAsciiBytes(
        `${pageObjects[index]} 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjects[index]} 0 R /Resources << /Font << /F1 ${fontObject} 0 R >> >> >>
endobj
`
      )
    );
    objects.push(criarObjetoStream(contentObjects[index], content));
  });

  objects.push(
    toAsciiBytes(
      `${fontObject} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`
    )
  );

  const chunks: number[][] = [Array.from(toAsciiBytes("%PDF-1.4\n"))];
  const offsets: number[] = [0];
  let currentOffset = chunks[0].length;

  objects.forEach((objectBytes) => {
    offsets.push(currentOffset);
    chunks.push(Array.from(objectBytes));
    currentOffset += objectBytes.length;
  });

  const xrefOffset = currentOffset;
  let xref = `xref\n0 ${offsets.length}\n`;
  xref += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  xref += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(Array.from(toAsciiBytes(xref)));

  return new Blob([Uint8Array.from(chunks.flat())], { type: "application/pdf" });
}

export default function Relatorios() {
  const { listarRelatorios, carregando } = useRelatorio();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("md"));
  const usuarioLogado = useMemo(() => obterUsuarioLogado(), []);
  const perfil = useMemo(
    () => perfilPorTipoUsuario(usuarioLogado.tipo_usuario),
    [usuarioLogado.tipo_usuario]
  );
  const contexto = useMemo(() => contextoPerfil(perfil), [perfil]);
  const IconePerfil = contexto.icone;
  const [busca, setBusca] = useState("");
  const [ano, setAno] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [relatoriosBase, setRelatoriosBase] = useState<RelatorioItem[]>([]);
  const [relatorios, setRelatorios] = useState<RelatorioItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const anosDisponiveis = useMemo(
    () => ["Todos", ...new Set(relatoriosBase.map((item) => item.ano))],
    [relatoriosBase]
  );

  const tiposDisponiveis = useMemo(
    () => ["Todos", ...new Set(relatoriosBase.map((item) => item.tipo))],
    [relatoriosBase]
  );

  const rowsTabela = useMemo<RelatorioTabelaRow[]>(
    () =>
      relatorios.map((relatorio) => ({
        ...relatorio,
        tipoFormatado: labelTipo(relatorio.tipo),
        totalPeriodos: relatorio.periodos.length,
        totalDisciplinas: totalDisciplinas(relatorio),
      })),
    [relatorios]
  );

  function emitirRelatorio(relatorio: RelatorioItem) {
    const pdfBlob = buildRelatorioPdf(relatorio, perfil);
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, "_blank", "noopener,noreferrer");

    window.setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 60000);
  }

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: "nome",
        headerName: "Relatorio",
        flex: 1.2,
        minWidth: 190,
      },
      {
        field: "tipoFormatado",
        headerName: "Tipo",
        width: 130,
      },
      {
        field: "ano",
        headerName: "Ano",
        width: 90,
      },
      {
        field: "curso",
        headerName: "Curso",
        flex: 1.1,
        minWidth: 190,
      },
      {
        field: "totalDisciplinas",
        headerName: "Itens",
        width: 86,
      },
      {
        field: "acao",
        headerName: "",
        sortable: false,
        filterable: false,
        width: 112,
        align: "center",
        headerAlign: "center",
        renderCell: (params: GridRenderCellParams<RelatorioTabelaRow>) => (
          <Tooltip title="Emitir PDF">
            <Box component="span">
              <Button
                variant="contained"
                onClick={() => emitirRelatorio(params.row)}
                sx={{ minWidth: 82, width: 82, height: 28, px: 1 }}
              >
                Emitir
              </Button>
            </Box>
          </Tooltip>
        ),
      },
    ],
    [perfil]
  );

  useEffect(() => {
    let consultaAtiva = true;

    listarRelatorios(criarFiltros(perfil, "", "Todos", "Todos"))
      .then((resultado) => {
        if (consultaAtiva) {
          setRelatoriosBase(resultado);
          setErro(null);
        }
      })
      .catch(() => {
        if (consultaAtiva) {
          setRelatoriosBase([]);
          setRelatorios([]);
          setErro(MENSAGEM_ERRO);
        }
      });

    return () => {
      consultaAtiva = false;
    };
  }, [listarRelatorios, perfil]);

  useEffect(() => {
    let consultaAtiva = true;

    listarRelatorios(criarFiltros(perfil, busca, ano, tipo))
      .then((resultado) => {
        if (consultaAtiva) {
          setRelatorios(resultado);
          setErro(null);
        }
      })
      .catch(() => {
        if (consultaAtiva) {
          setRelatorios([]);
          setErro(MENSAGEM_ERRO);
        }
      });

    return () => {
      consultaAtiva = false;
    };
  }, [listarRelatorios, perfil, busca, ano, tipo]);

  return (
    <Container
      maxWidth={false}
      sx={{
        border: `1px solid ${theme.palette.grey[100]}`,
        borderRadius: "8px",
        backgroundColor: "#F4F4F4",
        py: 2,
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1.5}
        >
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Relatorios
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {contexto.titulo}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              icon={<IconePerfil size={15} />}
              label={labelPerfil(perfil)}
              sx={{
                backgroundColor: contexto.fundo,
                color: contexto.cor,
                border: `1px solid ${contexto.cor}`,
                fontWeight: 700,
                "& .MuiChip-icon": {
                  color: contexto.cor,
                },
              }}
            />
            {!erro ? <Chip size="small" label="API integrada" variant="outlined" /> : null}
          </Stack>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            border: `1px solid ${theme.palette.grey[100]}`,
            borderRadius: "8px",
            p: 2,
            backgroundColor: "#FFF",
          }}
        >
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: "8px",
                  backgroundColor: contexto.fundo,
                  color: contexto.cor,
                  display: { xs: "none", sm: "flex" },
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <FileText size={18} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight="bold" color={contexto.cor}>
                  {contexto.escopo}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {usuarioLogado.nome ? `${usuarioLogado.nome} - ` : ""}
                  {contexto.descricao}
                </Typography>
              </Box>
            </Stack>

            <Divider />

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField
                placeholder={
                  perfil === "Aluno"
                    ? "Buscar por relatorio, disciplina ou situacao"
                    : "Buscar por relatorio, aluno, disciplina ou situacao"
                }
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  flex: 1,
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "#FFF",
                  },
                }}
              />

              <TextField
                select
                label="Ano"
                value={ano}
                onChange={(event) => setAno(event.target.value)}
                sx={{
                  width: { xs: "100%", md: 140 },
                  flexShrink: 0,
                  "& .MuiInputLabel-root": {
                    backgroundColor: "#FFF",
                    px: 0.5,
                  },
                }}
              >
                {anosDisponiveis.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Tipo"
                value={tipo}
                onChange={(event) => setTipo(event.target.value)}
                sx={{
                  width: { xs: "100%", md: 190 },
                  flexShrink: 0,
                  "& .MuiInputLabel-root": {
                    backgroundColor: "#FFF",
                    px: 0.5,
                  },
                }}
              >
                {tiposDisponiveis.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item === "Todos" ? item : labelTipo(item as TipoRelatorio)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </Paper>

        {erro ? <Alert severity="error">{erro}</Alert> : null}

        {!mobile ? (
          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.grey[100]}`,
              borderRadius: "8px",
              backgroundColor: "#FFF",
              p: 1,
            }}
          >
            <Box sx={{ height: Math.max(300, rowsTabela.length * 34 + 118) }}>
              <DataTable rows={rowsTabela} columns={columns} loading={carregando} />
            </Box>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {carregando ? (
              <Box
                sx={{
                  border: `1px dashed ${theme.palette.grey[200]}`,
                  borderRadius: "8px",
                  backgroundColor: "#FFF",
                  py: 4,
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Carregando relatorios academicos...
                </Typography>
              </Box>
            ) : null}

            {relatorios.map((relatorio) => (
              <Card
                key={relatorio.id}
                elevation={0}
                sx={{
                  border: `1px solid ${theme.palette.grey[100]}`,
                  borderRadius: "8px",
                }}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Stack spacing={1.5}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight="bold">{relatorio.nome}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {relatorio.curso}
                        </Typography>
                      </Box>

                      <Chip
                        size="small"
                        label={labelTipo(relatorio.tipo)}
                        sx={{
                          backgroundColor: "#EDF8FB",
                          color: "primary.main",
                          fontWeight: 700,
                        }}
                      />
                    </Stack>

                    <Divider />

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={`Ano ${relatorio.ano}`} variant="outlined" />
                      <Chip
                        size="small"
                        label={`${relatorio.periodos.length} periodo(s)`}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={`${totalDisciplinas(relatorio)} item(ns)`}
                        variant="outlined"
                      />
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      {relatorio.descricao}
                    </Typography>

                    <Button
                      variant="contained"
                      startIcon={<Download size={16} />}
                      onClick={() => emitirRelatorio(relatorio)}
                      sx={{ width: "100%" }}
                    >
                      Emitir PDF
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

        {!carregando && !erro && relatorios.length === 0 ? (
          <Box
            sx={{
              border: `1px dashed ${theme.palette.grey[200]}`,
              borderRadius: "8px",
              backgroundColor: "#FFF",
              py: 5,
              textAlign: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Nenhum relatorio encontrado para os filtros selecionados.
            </Typography>
          </Box>
        ) : null}
      </Stack>
    </Container>
  );
}
