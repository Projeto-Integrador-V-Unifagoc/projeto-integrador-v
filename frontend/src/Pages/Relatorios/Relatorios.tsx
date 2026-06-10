import { useEffect, useMemo, useState } from "react";

import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  InputAdornment,
  MenuItem,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  BookOpen,
  FileText,
  GraduationCap,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";

import Button from "../../components/Button";
import Container from "../../components/Container";
import TextField from "../../components/TextField";
import { useRelatorio } from "../../hooks/use-relatorio";
import type {
  FiltrosRelatorios,
  PerfilRelatorio,
  PeriodoRelatorio,
  RelatorioItem,
  RelatorioLinha,
  SituacaoAcademica,
  TipoRelatorio,
} from "../../models/relatorio-model";

const periodosProfessor: PeriodoRelatorio[] = [
  {
    nome: "1o semestre",
    disciplinas: [
      {
        aluno: "Joao Silva",
        nome: "Fundamentos de Programacao",
        cargaHoraria: "80h",
        nota: "8,5",
        frequencia: "94%",
        situacao: "Aprovado",
      },
      {
        aluno: "Maria Oliveira",
        nome: "Modelagem de Dados",
        cargaHoraria: "80h",
        nota: "6,2",
        frequencia: "89%",
        situacao: "Recuperacao",
      },
      {
        aluno: "Lucas Ferreira",
        nome: "Matematica Aplicada",
        cargaHoraria: "60h",
        nota: "5,8",
        frequencia: "76%",
        situacao: "Pendente",
      },
    ],
  },
  {
    nome: "2o semestre",
    disciplinas: [
      {
        aluno: "Ana Costa",
        nome: "Desenvolvimento Web",
        cargaHoraria: "80h",
        nota: "9,0",
        frequencia: "96%",
        situacao: "Aprovado",
      },
      {
        aluno: "Pedro Santos",
        nome: "Banco de Dados",
        cargaHoraria: "80h",
        nota: "7,1",
        frequencia: "91%",
        situacao: "Aprovado",
      },
      {
        aluno: "Beatriz Lima",
        nome: "Engenharia de Software",
        cargaHoraria: "60h",
        nota: "6,0",
        frequencia: "82%",
        situacao: "Recuperacao",
      },
    ],
  },
];

const periodosAluno: PeriodoRelatorio[] = [
  {
    nome: "1o semestre",
    disciplinas: [
      {
        nome: "Fundamentos de Programacao",
        cargaHoraria: "80h",
        nota: "8,5",
        frequencia: "94%",
        situacao: "Aprovado",
      },
      {
        nome: "Modelagem de Dados",
        cargaHoraria: "80h",
        nota: "7,8",
        frequencia: "92%",
        situacao: "Aprovado",
      },
      {
        nome: "Matematica Aplicada",
        cargaHoraria: "60h",
        nota: "6,4",
        frequencia: "86%",
        situacao: "Recuperacao",
      },
    ],
  },
  {
    nome: "2o semestre",
    disciplinas: [
      {
        nome: "Desenvolvimento Web",
        cargaHoraria: "80h",
        nota: "9,1",
        frequencia: "97%",
        situacao: "Aprovado",
      },
      {
        nome: "Banco de Dados",
        cargaHoraria: "80h",
        nota: "7,3",
        frequencia: "90%",
        situacao: "Aprovado",
      },
      {
        nome: "Engenharia de Software",
        cargaHoraria: "60h",
        nota: "Aguardando",
        frequencia: "88%",
        situacao: "Pendente",
      },
    ],
  },
];

function linhasPorPeriodo(periodos: PeriodoRelatorio[], incluirAluno = false): RelatorioLinha[] {
  return periodos.flatMap((periodo) =>
    periodo.disciplinas.map((disciplina) => ({
      ...(incluirAluno ? { Aluno: disciplina.aluno ?? "Aluno demonstrativo" } : {}),
      Periodo: periodo.nome,
      Disciplina: disciplina.nome,
      "Carga Horaria": disciplina.cargaHoraria,
      Nota: disciplina.nota ?? "-",
      Frequencia: disciplina.frequencia ?? "-",
      Situacao: labelSituacao(disciplina.situacao),
    }))
  );
}

const relatoriosMockados: RelatorioItem[] = [
  {
    id: 1,
    nome: "Relat\u00f3rio de Notas",
    descricao: "Vis\u00e3o do professor com notas dos alunos por per\u00edodo letivo.",
    tipo: "Notas",
    ano: "2026",
    perfis: ["Professor"],
    curso: "Analise e Desenvolvimento de Sistemas",
    matrizCurricular: "Matriz ADS 2026",
    periodos: periodosProfessor,
    pdf: {
      titulo: "RELATORIO DE NOTAS",
      universidade: "UniEduca - Dados demonstrativos",
      rodape: "Relatorio mockado gerado no frontend para fins de teste.",
      colunas: ["Aluno", "Periodo", "Disciplina", "Nota", "Situacao"],
      larguras: [130, 95, 175, 70, 110],
      linhas: linhasPorPeriodo(periodosProfessor, true).map((linha) => ({
        Aluno: linha.Aluno,
        Periodo: linha.Periodo,
        Disciplina: linha.Disciplina,
        Nota: linha.Nota,
        Situacao: linha.Situacao,
      })),
    },
  },
  {
    id: 2,
    nome: "Relat\u00f3rio de Frequ\u00eancia",
    descricao: "Acompanhamento de frequ\u00eancia por aluno, disciplina e semestre.",
    tipo: "Frequencia",
    ano: "2026",
    perfis: ["Professor"],
    curso: "Analise e Desenvolvimento de Sistemas",
    matrizCurricular: "Matriz ADS 2026",
    periodos: periodosProfessor,
    pdf: {
      titulo: "RELATORIO DE FREQUENCIA",
      universidade: "UniEduca - Dados demonstrativos",
      rodape: "Relatorio mockado gerado no frontend para fins de teste.",
      colunas: ["Aluno", "Periodo", "Disciplina", "Frequencia", "Situacao"],
      larguras: [130, 95, 170, 95, 105],
      linhas: linhasPorPeriodo(periodosProfessor, true).map((linha) => ({
        Aluno: linha.Aluno,
        Periodo: linha.Periodo,
        Disciplina: linha.Disciplina,
        Frequencia: linha.Frequencia,
        Situacao: linha.Situacao,
      })),
    },
  },
  {
    id: 3,
    nome: "Consulta de Alunos",
    descricao: "Consulta acad\u00eamica simples dos alunos vinculados ao curso.",
    tipo: "Consulta",
    ano: "2026",
    perfis: ["Professor"],
    curso: "Analise e Desenvolvimento de Sistemas",
    matrizCurricular: "Matriz ADS 2026",
    periodos: [
      {
        nome: "Alunos ativos",
        disciplinas: [
          {
            aluno: "Joao Silva",
            nome: "1o semestre - Turma ADS1",
            cargaHoraria: "-",
            frequencia: "94%",
            situacao: "Regular",
          },
          {
            aluno: "Maria Oliveira",
            nome: "1o semestre - Turma ADS1",
            cargaHoraria: "-",
            frequencia: "89%",
            situacao: "Atencao",
          },
          {
            aluno: "Ana Costa",
            nome: "2o semestre - Turma ADS2",
            cargaHoraria: "-",
            frequencia: "96%",
            situacao: "Regular",
          },
        ],
      },
    ],
    pdf: {
      titulo: "CONSULTA DE ALUNOS",
      universidade: "UniEduca - Dados demonstrativos",
      rodape: "Relatorio mockado gerado no frontend para fins de teste.",
      colunas: ["Aluno", "Curso", "Periodo", "Situacao"],
      larguras: [160, 205, 110, 95],
      linhas: [
        {
          Aluno: "Joao Silva",
          Curso: "ADS",
          Periodo: "1o semestre",
          Situacao: "Regular",
        },
        {
          Aluno: "Maria Oliveira",
          Curso: "ADS",
          Periodo: "1o semestre",
          Situacao: "Atencao",
        },
        {
          Aluno: "Ana Costa",
          Curso: "ADS",
          Periodo: "2o semestre",
          Situacao: "Regular",
        },
      ],
    },
  },
  {
    id: 4,
    nome: "Hist\u00f3rico Escolar",
    descricao: "Hist\u00f3rico acad\u00eamico completo dispon\u00edvel para acompanhamento docente.",
    tipo: "Historico",
    ano: "2025",
    perfis: ["Professor"],
    curso: "Analise e Desenvolvimento de Sistemas",
    matrizCurricular: "Matriz ADS 2026",
    periodos: periodosProfessor,
    pdf: {
      titulo: "HISTORICO ESCOLAR",
      universidade: "UniEduca - Dados demonstrativos",
      rodape: "Relatorio mockado gerado no frontend para fins de teste.",
      colunas: ["Aluno", "Periodo", "Disciplina", "Carga Horaria", "Situacao"],
      larguras: [125, 90, 165, 105, 95],
      linhas: linhasPorPeriodo(periodosProfessor, true).map((linha) => ({
        Aluno: linha.Aluno,
        Periodo: linha.Periodo,
        Disciplina: linha.Disciplina,
        "Carga Horaria": linha["Carga Horaria"],
        Situacao: linha.Situacao,
      })),
    },
  },
  {
    id: 5,
    nome: "Minhas Notas",
    descricao: "Notas do aluno organizadas por semestre e disciplina.",
    tipo: "Notas",
    ano: "2026",
    perfis: ["Aluno"],
    curso: "Analise e Desenvolvimento de Sistemas",
    matrizCurricular: "Matriz ADS 2026",
    periodos: periodosAluno,
    pdf: {
      titulo: "MINHAS NOTAS",
      universidade: "UniEduca - Dados demonstrativos",
      rodape: "Relatorio mockado gerado no frontend para fins de teste.",
      colunas: ["Periodo", "Disciplina", "Nota", "Situacao"],
      larguras: [110, 245, 80, 125],
      linhas: linhasPorPeriodo(periodosAluno).map((linha) => ({
        Periodo: linha.Periodo,
        Disciplina: linha.Disciplina,
        Nota: linha.Nota,
        Situacao: linha.Situacao,
      })),
    },
  },
  {
    id: 6,
    nome: "Minha Frequ\u00eancia",
    descricao: "Frequ\u00eancia do aluno nas disciplinas da matriz curricular.",
    tipo: "Frequencia",
    ano: "2026",
    perfis: ["Aluno"],
    curso: "Analise e Desenvolvimento de Sistemas",
    matrizCurricular: "Matriz ADS 2026",
    periodos: periodosAluno,
    pdf: {
      titulo: "MINHA FREQUENCIA",
      universidade: "UniEduca - Dados demonstrativos",
      rodape: "Relatorio mockado gerado no frontend para fins de teste.",
      colunas: ["Periodo", "Disciplina", "Frequencia", "Situacao"],
      larguras: [110, 235, 95, 120],
      linhas: linhasPorPeriodo(periodosAluno).map((linha) => ({
        Periodo: linha.Periodo,
        Disciplina: linha.Disciplina,
        Frequencia: linha.Frequencia,
        Situacao: linha.Situacao,
      })),
    },
  },
  {
    id: 7,
    nome: "Meu Hist\u00f3rico Escolar",
    descricao: "Hist\u00f3rico escolar individual do aluno com situa\u00e7\u00e3o acad\u00eamica simulada.",
    tipo: "Historico",
    ano: "2025",
    perfis: ["Aluno"],
    curso: "Analise e Desenvolvimento de Sistemas",
    matrizCurricular: "Matriz ADS 2026",
    periodos: periodosAluno,
    pdf: {
      titulo: "MEU HISTORICO ESCOLAR",
      universidade: "UniEduca - Dados demonstrativos",
      rodape: "Relatorio mockado gerado no frontend para fins de teste.",
      colunas: ["Periodo", "Disciplina", "Carga Horaria", "Nota", "Situacao"],
      larguras: [95, 190, 105, 70, 110],
      linhas: linhasPorPeriodo(periodosAluno).map((linha) => ({
        Periodo: linha.Periodo,
        Disciplina: linha.Disciplina,
        "Carga Horaria": linha["Carga Horaria"],
        Nota: linha.Nota,
        Situacao: linha.Situacao,
      })),
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

function labelSituacao(situacao: SituacaoAcademica) {
  const labels: Record<SituacaoAcademica, string> = {
    Aprovado: "Aprovado",
    Recuperacao: "Recupera\u00e7\u00e3o",
    Pendente: "Pendente",
    Regular: "Regular",
    Atencao: "Aten\u00e7\u00e3o",
  };

  return labels[situacao];
}

function labelTipo(tipo: TipoRelatorio) {
  const labels: Record<TipoRelatorio, string> = {
    Notas: "Notas",
    Frequencia: "Frequ\u00eancia",
    Consulta: "Consulta",
    Historico: "Hist\u00f3rico",
  };

  return labels[tipo];
}

function corSituacao(situacao: SituacaoAcademica) {
  const cores: Record<
    SituacaoAcademica,
    { color: string; backgroundColor: string; borderColor: string }
  > = {
    Aprovado: {
      color: "#0E6F3F",
      backgroundColor: "#E6F4EA",
      borderColor: "#A9D9BB",
    },
    Recuperacao: {
      color: "#8A5A00",
      backgroundColor: "#FFF4D6",
      borderColor: "#E8C66A",
    },
    Pendente: {
      color: "#9A1B1B",
      backgroundColor: "#FDECEC",
      borderColor: "#E9B0B0",
    },
    Regular: {
      color: "#0E6F3F",
      backgroundColor: "#E6F4EA",
      borderColor: "#A9D9BB",
    },
    Atencao: {
      color: "#8A5A00",
      backgroundColor: "#FFF4D6",
      borderColor: "#E8C66A",
    },
  };

  return cores[situacao];
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
    pdfText(tableLeft + 16, 695, `Curso: ${relatorio.curso}`, 12),
    pdfText(tableLeft + 16, 672, `Matriz Curricular: ${relatorio.matrizCurricular}`, 12),
    pdfText(tableLeft + 16, 648, `Data de Emissao: ${emissionDate}`, 12),
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
      commands.push(pdfText(x + 8, baseline, linha[coluna] ?? "", 11, "0.15 0.15 0.15"));
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

function relatorioContemTermo(relatorio: RelatorioItem, termo: string) {
  if (!termo) {
    return true;
  }

  const campos = [
    relatorio.nome,
    labelTipo(relatorio.tipo),
    relatorio.ano,
    relatorio.curso,
    relatorio.matrizCurricular,
    ...relatorio.periodos.flatMap((periodo) => [
      periodo.nome,
      ...periodo.disciplinas.flatMap((disciplina) => [
        disciplina.nome,
        disciplina.aluno ?? "",
        labelSituacao(disciplina.situacao),
      ]),
    ]),
  ];

  return campos.some((campo) => campo.toLowerCase().includes(termo));
}

async function buscarRelatoriosMockados(filtros: FiltrosRelatorios) {
  const termo = filtros.busca.trim().toLowerCase();

  const relatorios = relatoriosMockados.filter((relatorio) => {
    const perfilValido = relatorio.perfis.includes(filtros.perfil);
    const buscaValida = relatorioContemTermo(relatorio, termo);
    const anoValido = filtros.ano === "Todos" || relatorio.ano === filtros.ano;
    const tipoValido = filtros.tipo === "Todos" || relatorio.tipo === filtros.tipo;

    return perfilValido && buscaValida && anoValido && tipoValido;
  });

  return Promise.resolve(relatorios);
}

export default function Relatorios() {
  const { listarRelatorios, carregando } = useRelatorio();
  const [busca, setBusca] = useState("");
  const [ano, setAno] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [perfil, setPerfil] = useState<PerfilRelatorio>("Professor");
  const [usandoDadosMockados, setUsandoDadosMockados] = useState(false);
  const [relatoriosDisponiveis, setRelatoriosDisponiveis] = useState<RelatorioItem[]>(
    relatoriosMockados.filter((item) => item.perfis.includes("Professor"))
  );
  const [relatoriosFiltrados, setRelatoriosFiltrados] = useState<RelatorioItem[]>([]);

  const relatoriosDoPerfil = useMemo(
    () => relatoriosDisponiveis.filter((item) => item.perfis.includes(perfil)),
    [perfil, relatoriosDisponiveis]
  );

  const anosDisponiveis = useMemo(
    () => ["Todos", ...new Set(relatoriosDoPerfil.map((item) => item.ano))],
    [relatoriosDoPerfil]
  );

  const tiposDisponiveis = useMemo(
    () => ["Todos", ...new Set(relatoriosDoPerfil.map((item) => item.tipo))],
    [relatoriosDoPerfil]
  );

  useEffect(() => {
    let consultaAtiva = true;

    listarRelatorios({ perfil, busca: "", ano: "Todos", tipo: "Todos" })
      .then((relatorios) => {
        if (consultaAtiva) {
          setRelatoriosDisponiveis(relatorios);
          setUsandoDadosMockados(false);
        }
      })
      .catch(() => {
        if (consultaAtiva) {
          setRelatoriosDisponiveis(relatoriosMockados.filter((item) => item.perfis.includes(perfil)));
          setUsandoDadosMockados(true);
        }
      });

    return () => {
      consultaAtiva = false;
    };
  }, [listarRelatorios, perfil]);

  useEffect(() => {
    let consultaAtiva = true;

    listarRelatorios({ perfil, busca, ano, tipo })
      .then((relatorios) => {
        if (consultaAtiva) {
          setRelatoriosFiltrados(relatorios);
          setUsandoDadosMockados(false);
        }
      })
      .catch(() => {
        if (consultaAtiva) {
          return buscarRelatoriosMockados({ perfil, busca, ano, tipo }).then((relatorios) => {
            if (consultaAtiva) {
              setRelatoriosFiltrados(relatorios);
              setUsandoDadosMockados(true);
            }
          });
        }
      });

    return () => {
      consultaAtiva = false;
    };
  }, [listarRelatorios, perfil, busca, ano, tipo]);

  const totalRelatoriosPerfil = relatoriosDoPerfil.length;

  function alterarPerfil(_: React.MouseEvent<HTMLElement>, novoPerfil: PerfilRelatorio | null) {
    if (!novoPerfil) {
      return;
    }

    setPerfil(novoPerfil);
    setAno("Todos");
    setTipo("Todos");
  }

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
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
        >
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {"Relat\u00f3rios"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {usandoDadosMockados
                ? "Visualizacao demonstrativa por perfil usando dados locais."
                : "Visualizacao academica por perfil usando dados integrados."}
            </Typography>
          </Box>

          <ToggleButtonGroup
            exclusive
            value={perfil}
            onChange={alterarPerfil}
            size="small"
            sx={{
              backgroundColor: "#FFF",
              borderRadius: "8px",
              width: { xs: "100%", sm: "auto" },
              "& .MuiToggleButton-root": {
                borderColor: "transparent",
                gap: 1,
                px: 2,
                width: { xs: "50%", sm: "auto" },
                textTransform: "none",
              },
              "& .Mui-selected": {
                backgroundColor: "primary.main",
                color: "#FFF",
                "&:hover": {
                  backgroundColor: "primary.dark",
                },
              },
            }}
          >
            <ToggleButton value="Professor">
              <UsersRound size={16} />
              Professor
            </ToggleButton>
            <ToggleButton value="Aluno">
              <UserRound size={16} />
              Aluno
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Card
          elevation={0}
          sx={(theme) => ({
            border: `1px solid ${theme.palette.grey[100]}`,
            borderRadius: "8px",
          })}
        >
          <CardContent sx={{ padding: "16px !important" }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={(theme) => ({
                    width: 38,
                    height: 38,
                    borderRadius: "8px",
                    backgroundColor: theme.palette.primary.light,
                    color: theme.palette.primary.contrastText,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  })}
                >
                  <GraduationCap size={19} />
                </Box>
                <Box>
                  <Typography fontWeight="bold">
                    {perfil === "Professor"
                      ? "Acesso simulado do Professor"
                      : "Acesso simulado do Aluno"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {perfil === "Professor"
                      ? "Inclui notas, frequ\u00eancia, consulta de alunos e hist\u00f3rico escolar."
                      : "Exibe apenas minhas notas, minha frequ\u00eancia e meu hist\u00f3rico escolar."}
                  </Typography>
                </Box>
              </Stack>

              <Divider />

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  placeholder={"Buscar por relat\u00f3rio, aluno, disciplina ou situa\u00e7\u00e3o..."}
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
                    minWidth: { xs: "100%", md: 190 },
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "#FFF",
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
          </CardContent>
        </Card>

        <Stack spacing={2}>
          {carregando ? (
            <Box
              sx={(theme) => ({
                border: `1px dashed ${theme.palette.grey[200]}`,
                borderRadius: "8px",
                backgroundColor: "#FFF",
                py: 4,
                textAlign: "center",
              })}
            >
              <Typography variant="body2" color="text.secondary">
                Carregando relat\u00f3rios acad\u00eamicos...
              </Typography>
            </Box>
          ) : null}

          {relatoriosFiltrados.map((relatorio) => (
            <Card
              key={relatorio.id}
              elevation={0}
              sx={(theme) => ({
                border: `1px solid ${theme.palette.grey[100]}`,
                borderRadius: "8px",
                overflow: "hidden",
              })}
            >
              <CardContent sx={{ padding: "16px !important" }}>
                <Stack spacing={2}>
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
                          borderRadius: "8px",
                          backgroundColor: theme.palette.primary.light,
                          color: theme.palette.primary.contrastText,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        })}
                      >
                        <FileText size={18} />
                      </Box>

                      <Box>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Typography fontWeight="bold">{relatorio.nome}</Typography>
                          <Chip
                            size="small"
                            label={labelTipo(relatorio.tipo)}
                            sx={{
                              height: 22,
                              fontSize: 12,
                              backgroundColor: "#EDF8FB",
                              color: "primary.main",
                            }}
                          />
                          <Chip
                            size="small"
                            label={relatorio.ano}
                            sx={{ height: 22, fontSize: 12 }}
                          />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {relatorio.descricao}
                        </Typography>
                      </Box>
                    </Stack>

                    <Button
                      variant="contained"
                      onClick={() => emitirRelatorio(relatorio)}
                      sx={{ width: { xs: "100%", sm: 96 } }}
                    >
                      Emitir
                    </Button>
                  </Stack>

                  <Box
                    sx={(theme) => ({
                      border: `1px solid ${theme.palette.grey[100]}`,
                      borderRadius: "8px",
                      backgroundColor: "#FAFAFA",
                      p: 2,
                    })}
                  >
                    <Stack spacing={0.5}>
                      <Typography variant="body2" fontWeight="bold">
                        Curso
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {relatorio.curso}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" mt={1}>
                        Matriz Curricular
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {relatorio.matrizCurricular}
                      </Typography>
                    </Stack>
                  </Box>

                  <Stack spacing={1.5}>
                    {relatorio.periodos.map((periodo) => (
                      <Box
                        key={`${relatorio.id}-${periodo.nome}`}
                        sx={(theme) => ({
                          border: `1px solid ${theme.palette.grey[100]}`,
                          borderRadius: "8px",
                          backgroundColor: "#FFF",
                          overflow: "hidden",
                        })}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={(theme) => ({
                            px: 2,
                            py: 1.25,
                            backgroundColor: theme.palette.grey[50],
                          })}
                        >
                          <BookOpen size={16} />
                          <Typography variant="body2" fontWeight="bold">
                            {"Per\u00edodo"}: {periodo.nome}
                          </Typography>
                        </Stack>

                        <Stack divider={<Divider />}>
                          {periodo.disciplinas.map((disciplina) => (
                            <Stack
                              key={`${periodo.nome}-${disciplina.aluno ?? "aluno"}-${disciplina.nome}`}
                              direction={{ xs: "column", md: "row" }}
                              justifyContent="space-between"
                              alignItems={{ xs: "flex-start", md: "center" }}
                              spacing={1.5}
                              sx={{ px: 2, py: 1.5 }}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" fontWeight="bold">
                                  {disciplina.nome}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {disciplina.aluno ? `${disciplina.aluno} - ` : ""}
                                  {"Carga hor\u00e1ria"}: {disciplina.cargaHoraria}
                                </Typography>
                              </Box>

                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                flexWrap="wrap"
                                useFlexGap
                              >
                                {disciplina.nota ? (
                                  <Chip
                                    size="small"
                                    label={`Nota: ${disciplina.nota}`}
                                    variant="outlined"
                                  />
                                ) : null}
                                {disciplina.frequencia ? (
                                  <Chip
                                    size="small"
                                    label={`Frequ\u00eancia: ${disciplina.frequencia}`}
                                    variant="outlined"
                                  />
                                ) : null}
                                <Chip
                                  size="small"
                                  label={labelSituacao(disciplina.situacao)}
                                  sx={{
                                    ...corSituacao(disciplina.situacao),
                                    border: "1px solid",
                                    fontWeight: 700,
                                  }}
                                />
                              </Stack>
                            </Stack>
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}

          {!carregando && relatoriosFiltrados.length === 0 ? (
            <Box
              sx={(theme) => ({
                border: `1px dashed ${theme.palette.grey[200]}`,
                borderRadius: "8px",
                backgroundColor: "#FFF",
                py: 5,
                textAlign: "center",
              })}
            >
              <Typography variant="body2" color="text.secondary">
                {totalRelatoriosPerfil === 0
                  ? "Nenhum relat\u00f3rio configurado para este perfil."
                  : "Nenhum relat\u00f3rio encontrado para os filtros selecionados."}
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </Stack>
    </Container>
  );
}
