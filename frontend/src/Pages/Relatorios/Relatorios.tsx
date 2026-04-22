import { useState } from "react";

import {
  Box,
  Card,
  CardContent,
  InputAdornment,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { FileText, Search } from "lucide-react";

import Button from "../../components/Button";
import Container from "../../components/Container";
import TextField from "../../components/TextField";

type TipoRelatorio = "Academico" | "Consulta";

interface RelatorioLinha {
  [key: string]: string;
}

interface RelatorioPdf {
  titulo: string;
  universidade: string;
  rodape: string;
  colunas: string[];
  larguras: number[];
  linhas: RelatorioLinha[];
}

interface RelatorioItem {
  id: number;
  nome: string;
  tipo: TipoRelatorio;
  ano: string;
  pdf: RelatorioPdf;
}

const relatoriosMockados: RelatorioItem[] = [
  {
    id: 1,
    nome: "Relat\u00f3rio de Notas",
    tipo: "Academico",
    ano: "2026",
    pdf: {
      titulo: "RELAT\u00d3RIO DE NOTAS",
      universidade: "Universidade: Exemplo de Academico",
      rodape: "Relat\u00f3rio gerado automaticamente para fins de teste.",
      colunas: ["Aluno", "Disciplina", "Nota", "Situa\u00e7\u00e3o"],
      larguras: [180, 150, 80, 170],
      linhas: [
        { Aluno: "Jo\u00e3o Silva", Disciplina: "Matem\u00e1tica", Nota: "8,5", Situa\u00e7\u00e3o: "Aprovado" },
        { Aluno: "Maria Oliveira", Disciplina: "Portugu\u00eas", Nota: "9,0", Situa\u00e7\u00e3o: "Aprovado" },
        { Aluno: "Pedro Santos", Disciplina: "Hist\u00f3ria", Nota: "7,0", Situa\u00e7\u00e3o: "Aprovado" },
        { Aluno: "Ana Costa", Disciplina: "Geografia", Nota: "8,0", Situa\u00e7\u00e3o: "Aprovado" },
        { Aluno: "Lucas Ferreira", Disciplina: "Ci\u00eancias", Nota: "6,5", Situa\u00e7\u00e3o: "Recupera\u00e7\u00e3o" },
      ],
    },
  },
  {
    id: 2,
    nome: "Relat\u00f3rio de Frequ\u00eancia",
    tipo: "Academico",
    ano: "2026",
    pdf: {
      titulo: "RELAT\u00d3RIO DE FREQU\u00caNCIA",
      universidade: "Universidade: Exemplo de Academico",
      rodape: "Relat\u00f3rio gerado automaticamente para fins de teste.",
      colunas: ["Aluno", "Turma", "Frequ\u00eancia", "Situa\u00e7\u00e3o"],
      larguras: [200, 120, 120, 140],
      linhas: [
        { Aluno: "Jo\u00e3o Silva", Turma: "1A", Frequ\u00eancia: "92%", Situa\u00e7\u00e3o: "Regular" },
        { Aluno: "Maria Oliveira", Turma: "1A", Frequ\u00eancia: "95%", Situa\u00e7\u00e3o: "Regular" },
        { Aluno: "Pedro Santos", Turma: "2B", Frequ\u00eancia: "88%", Situa\u00e7\u00e3o: "Aten\u00e7\u00e3o" },
        { Aluno: "Ana Costa", Turma: "2B", Frequ\u00eancia: "97%", Situa\u00e7\u00e3o: "Regular" },
      ],
    },
  },
  {
    id: 3,
    nome: "Consulta de Alunos",
    tipo: "Consulta",
    ano: "2025",
    pdf: {
      titulo: "CONSULTA DE ALUNOS",
      universidade: "Universidade: Exemplo de Academico",
      rodape: "Relat\u00f3rio gerado automaticamente para fins de teste.",
      colunas: ["Aluno", "Matr\u00edcula", "Curso", "Situa\u00e7\u00e3o"],
      larguras: [190, 120, 150, 140],
      linhas: [
        { Aluno: "Jo\u00e3o Silva", Matr\u00edcula: "2025001", Curso: "Administra\u00e7\u00e3o", Situa\u00e7\u00e3o: "Ativo" },
        { Aluno: "Maria Oliveira", Matr\u00edcula: "2025002", Curso: "Pedagogia", Situa\u00e7\u00e3o: "Ativo" },
        { Aluno: "Pedro Santos", Matr\u00edcula: "2025003", Curso: "Hist\u00f3ria", Situa\u00e7\u00e3o: "Ativo" },
        { Aluno: "Ana Costa", Matr\u00edcula: "2025004", Curso: "Geografia", Situa\u00e7\u00e3o: "Ativo" },
      ],
    },
  },
  {
    id: 4,
    nome: "Hist\u00f3rico Escolar",
    tipo: "Academico",
    ano: "2025",
    pdf: {
      titulo: "HIST\u00d3RICO ESCOLAR",
      universidade: "Universidade: Exemplo de Academico",
      rodape: "Relat\u00f3rio gerado automaticamente para fins de teste.",
      colunas: ["Disciplina", "Carga Hor\u00e1ria", "Nota", "Situa\u00e7\u00e3o"],
      larguras: [210, 140, 80, 140],
      linhas: [
        { Disciplina: "Matem\u00e1tica", "Carga Hor\u00e1ria": "80h", Nota: "8,5", Situa\u00e7\u00e3o: "Aprovado" },
        { Disciplina: "Portugu\u00eas", "Carga Hor\u00e1ria": "80h", Nota: "9,0", Situa\u00e7\u00e3o: "Aprovado" },
        { Disciplina: "Hist\u00f3ria", "Carga Hor\u00e1ria": "60h", Nota: "7,5", Situa\u00e7\u00e3o: "Aprovado" },
        { Disciplina: "Geografia", "Carga Hor\u00e1ria": "60h", Nota: "8,0", Situa\u00e7\u00e3o: "Aprovado" },
      ],
    },
  },
];

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

function encodePdfText(value: string) {
  return `(${String.fromCharCode(...toWinAnsiBytes(value))})`;
}

function pdfText(
  x: number,
  y: number,
  text: string,
  size = 12,
  color = "0 0 0"
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
  color = "0.75 0.75 0.75"
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

function buildMockPdf(relatorio: RelatorioItem) {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 36;
  const usableWidth = pageWidth - marginX * 2;
  const baseTableWidth = relatorio.pdf.larguras.reduce(
    (total, largura) => total + largura,
    0
  );
  const scale = Math.min(1, usableWidth / baseTableWidth);
  const colWidths = relatorio.pdf.larguras.map((largura) =>
    Number((largura * scale).toFixed(2))
  );
  const tableWidth = colWidths.reduce((total, largura) => total + largura, 0);
  const tableLeft = (pageWidth - tableWidth) / 2;
  const headerHeight = 32;
  const rowHeight = 34;
  const tableTop = 620;
  const tableBottom = tableTop - headerHeight - rowHeight * relatorio.pdf.linhas.length;
  const emissionDate = new Intl.DateTimeFormat("pt-BR").format(new Date());
  const titleX = Math.max(marginX, pageWidth / 2 - relatorio.pdf.titulo.length * 5.9);

  const commands: string[] = [
    pdfText(titleX, 780, relatorio.pdf.titulo, 21),
    pdfText(tableLeft + 16, 720, relatorio.pdf.universidade, 14),
    pdfText(tableLeft + 16, 680, `Data de Emiss\u00e3o: ${emissionDate}`, 14),
    pdfRect(tableLeft, tableTop - headerHeight, tableWidth, headerHeight, "0.10 0.49 0.93"),
    pdfLine(tableLeft, tableTop, tableLeft + tableWidth, tableTop),
    pdfLine(tableLeft, tableBottom, tableLeft + tableWidth, tableBottom),
    pdfLine(tableLeft, tableTop - headerHeight, tableLeft + tableWidth, tableTop - headerHeight),
  ];

  let currentX = tableLeft;
  relatorio.pdf.colunas.forEach((coluna, index) => {
    commands.push(pdfText(currentX + 8, tableTop - 21, coluna, 12, "1 1 1"));
    currentX += colWidths[index];
  });

  relatorio.pdf.linhas.forEach((linha, rowIndex) => {
    const rowTop = tableTop - headerHeight - rowHeight * rowIndex;
    const baseline = rowTop - 22;
    let x = tableLeft;

    relatorio.pdf.colunas.forEach((coluna, columnIndex) => {
      commands.push(pdfText(x + 8, baseline, linha[coluna] ?? "", 12, "0.15 0.15 0.15"));
      x += colWidths[columnIndex];
    });

    commands.push(pdfLine(tableLeft, rowTop - rowHeight, tableLeft + tableWidth, rowTop - rowHeight));
  });

  let lineX = tableLeft;
  commands.push(pdfLine(lineX, tableBottom, lineX, tableTop));
  colWidths.forEach((width) => {
    lineX += width;
    commands.push(pdfLine(lineX, tableBottom, lineX, tableTop));
  });

  commands.push(pdfText(tableLeft + 16, 112, relatorio.pdf.rodape, 13));

  const contentStream = commands.join("\n");
  const contentBytes = toAsciiBytes(contentStream);

  const objects: Uint8Array[] = [
    toAsciiBytes("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
    toAsciiBytes("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
    toAsciiBytes(
      `3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
`
    ),
    toAsciiBytes(`4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`),
    contentBytes,
    toAsciiBytes("\nendstream\nendobj\n"),
    toAsciiBytes(
      "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n"
    ),
  ];

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
  const [busca, setBusca] = useState("");
  const [ano, setAno] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");

  const anosDisponiveis = ["Todos", ...new Set(relatoriosMockados.map((item) => item.ano))];
  const tiposDisponiveis = ["Todos", ...new Set(relatoriosMockados.map((item) => item.tipo))];
  const termo = busca.trim().toLowerCase();

  const relatoriosFiltrados = relatoriosMockados.filter((relatorio) => {
    const buscaValida =
      termo.length === 0 || relatorio.nome.toLowerCase().includes(termo);
    const anoValido = ano === "Todos" || relatorio.ano === ano;
    const tipoValido = tipo === "Todos" || relatorio.tipo === tipo;

    return buscaValida && anoValido && tipoValido;
  });

  function emitirRelatorio(relatorio: RelatorioItem) {
    const pdfBlob = buildMockPdf(relatorio);
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, "_blank", "noopener,noreferrer");

    window.setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 60000);
  }

  return (
    <Container
      maxWidth={false}
      sx={(theme) => ({
        border: `1px solid ${theme.palette.grey[200]}`,
        borderRadius: "8px",
        backgroundColor: "#F4F4F4",
        py: 3,
      })}
    >
      <Stack spacing={3}>
        <Typography variant="h6" fontWeight="bold">
          Relatórios
        </Typography>

        <TextField
          placeholder="Buscar relatório (ex: Notas, Aluno)..."
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
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#FFF",
            },
          }}
        />

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            select
            label="Ano"
            value={ano}
            onChange={(event) => setAno(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              minWidth: { xs: "100%", md: 150 },
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#FFF",
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
            InputLabelProps={{ shrink: true }}
            sx={{
              minWidth: { xs: "100%", md: 200 },
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#FFF",
              },
            }}
          >
            {tiposDisponiveis.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Stack spacing={2}>
          {relatoriosFiltrados.map((relatorio) => (
            <Card
              key={relatorio.id}
              elevation={0}
              sx={(theme) => ({
                border: `1px solid ${theme.palette.grey[100]}`,
                borderRadius: "10px",
              })}
            >
              <CardContent sx={{ padding: "16px !important" }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  spacing={2}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={(theme) => ({
                        width: 42,
                        height: 42,
                        borderRadius: "10px",
                        backgroundColor: theme.palette.primary.light,
                        color: theme.palette.primary.contrastText,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      })}
                    >
                      <FileText size={18} />
                    </Box>

                    <Box>
                      <Typography fontWeight="bold">{relatorio.nome}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {relatorio.tipo} - {relatorio.ano}
                      </Typography>
                    </Box>
                  </Stack>

                  <Button
                    variant="contained"
                    onClick={() => emitirRelatorio(relatorio)}
                    sx={{ width: { xs: "100%", sm: 90 } }}
                  >
                    Emitir
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}

          {relatoriosFiltrados.length === 0 ? (
            <Box
              sx={(theme) => ({
                border: `1px dashed ${theme.palette.grey[200]}`,
                borderRadius: "10px",
                backgroundColor: "#FFF",
                py: 5,
                textAlign: "center",
              })}
            >
              <Typography variant="body2" color="text.secondary">
                Nenhum relat\u00f3rio encontrado.
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </Stack>
    </Container>
  );
}
