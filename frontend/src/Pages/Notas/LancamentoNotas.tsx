import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Box, Chip, Grid, MenuItem, Stack, Tab, Tabs, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useGridApiContext, useGridApiRef, type GridColDef, type GridRenderEditCellParams, type GridRowModel } from "@mui/x-data-grid";
import axios from "axios";
import { RefreshCw, Save, ShieldCheck } from "lucide-react";
import Button from "../../components/Button";
import { Card } from "../../components/Card";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import TextField from "../../components/TextField";
import { useNotificacao } from "../../components/Notificacao/NotificationProvider";
import { useNota } from "../../hooks/use-nota";
import {
  type AlunoLancamento,
  type AlunoRecuperacao,
  type AlunoRendimento,
  type AtribuicaoNota,
  type ErroLoteNota,
  type ItemLoteNota,
  type Lancamento,
  type Recuperacao,
  type Rendimento,
} from "../../models/nota-model";
import AutorizacaoDialog from "./AutorizacaoDialog";
import { formatarNotaValor, mensagemErro, perfilLocal } from "./notas-utils";
import { ResultadoAcademicoResumo } from "../../components/ResultadoAcademico/ResultadoAcademicoResumo";
import { compararPontosApi, formatarPontos, pontosParaApi } from "../../utils/pontos";

type LinhaLancamento = AlunoLancamento & { id: string };
type LinhaRecuperacao = AlunoRecuperacao & { id: string; valor: string | null };
type LinhaRendimento = AlunoRendimento & { id: string } & Partial<Record<`av_${string}`, string | null>>;
type LinhaEditada = { id: string; alunoId: string; valor: unknown };

// Célula de nota em leitura: "Não lançada" (itálico) é visualmente distinto de zero e de erro;
// alterações ainda não salvas recebem marcador (ponto + negrito), não apenas cor.
const renderNota = (valor: string | null | undefined, alterada: boolean) =>
  valor === null || valor === undefined ? (
    <Typography variant="body2" color="text.disabled" fontStyle="italic">
      Não lançada
    </Typography>
  ) : (
    <Stack direction="row" alignItems="center" gap={0.5} title={alterada ? "Alteração não salva" : undefined}>
      {alterada && (
        <Box component="span" aria-hidden="true" sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0 }} />
      )}
      <Typography component="span" variant="body2" fontWeight={alterada ? 700 : 400}>
        {formatarNotaValor(valor)}
      </Typography>
    </Stack>
  );

function validarNota(texto: unknown, limite: string, lancada = false): string | undefined {
  if (texto === "" || texto == null) return lancada ? "Uma nota já lançada não pode ser apagada neste fluxo." : undefined;
  try {
    const pontos = pontosParaApi(texto);
    if (compararPontosApi(pontos, limite) > 0) return `A nota não pode ultrapassar o máximo de ${formatarPontos(limite)} pontos.`;
  } catch (e) { return e instanceof Error ? e.message : "Informe uma nota válida."; }
}

function EditorNota({ params, erro, onRascunho, bloqueada = false }: {
  params: GridRenderEditCellParams;
  erro?: string;
  onRascunho: (texto: string) => void;
  bloqueada?: boolean;
}) {
  const grid = useGridApiContext();
  const [texto, setTexto] = useState(() => params.value == null ? "" : String(params.value).replace(".", ","));
  return <TextField value={texto} autoFocus disabled={bloqueada} error={Boolean(erro)} helperText={erro}
    inputProps={{ "aria-label": `Nota de ${params.row.nome}`, inputMode: "decimal" }}
    onChange={(evento) => {
      const valor = evento.target.value;
      setTexto(valor); onRascunho(valor);
      void grid.current.setEditCellValue({ id: params.id, field: params.field, value: valor });
    }}
    onKeyDown={(evento) => {
      if (erro && (evento.key === "Enter" || evento.key === "Tab")) { evento.preventDefault(); evento.stopPropagation(); }
    }}
    sx={{ width: "100%", "& .MuiFormHelperText-root": { lineHeight: 1.2, mx: 0.5, whiteSpace: "normal", overflowWrap: "anywhere" }, "& .MuiInputBase-input": { py: 0.5 } }} />;
}

export default function LancamentoNotas() {
  const api = useNota();
  const { notificar } = useNotificacao();
  const tema = useTheme();
  const larguraResultado = useMediaQuery(tema.breakpoints.down("md")) ? 260 : 440;
  const perfil = perfilLocal();
  const ehSecretaria = perfil === "secretaria" || perfil === "administrador";

  const [atribuicoes, setAtribuicoes] = useState<AtribuicaoNota[]>([]);
  const [turmaId, setTurmaId] = useState("");
  const [avaliacaoId, setAvaliacaoId] = useState("");
  const [aba, setAba] = useState(0);
  const [lancamento, setLancamento] = useState<Lancamento>();
  const [linhas, setLinhas] = useState<LinhaLancamento[]>([]);
  const [alterado, setAlterado] = useState(false);
  const [alteradasLanc, setAlteradasLanc] = useState<Set<string>>(new Set());
  const [errosLanc, setErrosLanc] = useState<Record<string, string | undefined>>({});
  const [conflitoLanc, setConflitoLanc] = useState(false);
  const [falhaLote, setFalhaLote] = useState<"rejeitado" | "incerto" | null>(null);
  const [enviandoLote, setEnviandoLote] = useState(false);
  const rascunhosLanc = useRef<Record<string, string>>({});
  const antesDaCelula = useRef<Record<string, { texto?: string; erro?: string }>>({});
  const loteEmCurso = useRef(false);
  const leituraLanc = useRef(0);
  const gridLanc = useGridApiRef();
  const focoPendente = useRef<string | undefined>(undefined);

  const [rendimento, setRendimento] = useState<Rendimento>();
  const [recuperacao, setRecuperacao] = useState<Recuperacao>();
  const [linhasRec, setLinhasRec] = useState<LinhaRecuperacao[]>([]);
  const [alteradoRec, setAlteradoRec] = useState(false);
  const [alteradasRec, setAlteradasRec] = useState<Set<string>>(new Set());
  const leituraRendimento = useRef(0);
  const leituraRecuperacao = useRef(0);

  const [autorizar, setAutorizar] = useState(false);
  const [motivoAutorizacao, setMotivoAutorizacao] = useState("");

  const atribuicao = useMemo(() => atribuicoes.find((a) => a.turmaDisciplinaId === turmaId), [atribuicoes, turmaId]);
  const periodoFechado = Boolean(atribuicao?.periodoLetivo.fechado || (aba === 0 && lancamento?.periodoLetivo.fechado));

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const r = await api.listarOpcoes();
        if (!ativo) return;
        setAtribuicoes(r.atribuicoes);
        if (r.atribuicoes[0]) {
          setTurmaId(r.atribuicoes[0].turmaDisciplinaId);
          setAvaliacaoId(r.atribuicoes[0].avaliacoes[0]?.id || "");
        }
      } catch (e) {
        if (ativo) notificar(mensagemErro(e), "error");
      }
    })();
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificar]);

  useEffect(() => {
    if (periodoFechado) {
      notificar("Período letivo fechado: as notas estão em modo somente leitura.", "info");
    }
  }, [notificar, periodoFechado]);

  useEffect(() => {
    const sair = (e: BeforeUnloadEvent) => {
      if (alterado || alteradoRec) e.preventDefault();
    };
    addEventListener("beforeunload", sair);
    return () => removeEventListener("beforeunload", sair);
  }, [alterado, alteradoRec]);

  async function carregarLancamento() {
    if (!avaliacaoId) return;
    if (alterado && !confirm("Descartar alterações ainda não salvas?")) return;
    const leitura = ++leituraLanc.current;
    try {
      const r = await api.obterLancamento(avaliacaoId);
      if (leitura !== leituraLanc.current) return;
      setLancamento(r);
      setLinhas(r.alunos.map((a) => ({ ...a, id: a.matriculaTurmaDisciplinaId })));
      setAlterado(false);
      setAlteradasLanc(new Set());
      rascunhosLanc.current = {};
      setErrosLanc({}); setConflitoLanc(false); setFalhaLote(null);
      if (r.matriculasIrregulares > 0) {
        notificar(`${r.matriculasIrregulares} matrícula(s) irregular(es) foram omitidas.`, "info");
      }
      if (r.alunos.some((aluno) => aluno.prazoExpirado)) {
        notificar(
          ehSecretaria
            ? "Há notas com prazo expirado. Você pode autorizar uma retificação excepcional."
            : "Há notas com prazo expirado. Solicite autorização excepcional à secretaria.",
          "warning",
        );
      }
    } catch (e) {
      notificar(mensagemErro(e), "error");
    }
  }

  async function carregarRendimento() {
    if (!turmaId) return;
    const leitura = ++leituraRendimento.current;
    try {
      const r = await api.obterRendimento(turmaId);
      if (leitura !== leituraRendimento.current) return;
      setRendimento(r);
    } catch (e) {
      if (leitura === leituraRendimento.current) notificar(mensagemErro(e), "error");
    }
  }

  async function carregarRecuperacao(opcoes: { aposSalvar?: boolean } = {}) {
    if (!turmaId) return;
    if (alteradoRec && !opcoes.aposSalvar && !confirm("Descartar alterações ainda não salvas?")) return;
    const leitura = ++leituraRecuperacao.current;
    try {
      const r = await api.obterRecuperacao(turmaId);
      if (leitura !== leituraRecuperacao.current) return;
      setRecuperacao(r);
      setLinhasRec(r.alunos.map((a) => ({ ...a, id: a.matriculaTurmaDisciplinaId, valor: a.resultadoAcademico.pontosRecuperacao })));
      setAlteradoRec(false);
      setAlteradasRec(new Set());
    } catch (e) {
      if (leitura === leituraRecuperacao.current) notificar(mensagemErro(e), "error");
    }
  }

  useEffect(() => {
    if (aba === 0) void carregarLancamento();
    if (aba === 1) void carregarRendimento();
    if (aba === 2) void carregarRecuperacao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, avaliacaoId, turmaId]);

  const max = lancamento?.avaliacao.valorMaximo ?? "0.00";
  const podeEditar = Boolean(lancamento?.podeEditar) && !periodoFechado;

  const processarLinha = (campo: "linhas" | "recuperacao", limite: string) => (nova: GridRowModel): GridRowModel => {
    const bruto = (nova as LinhaEditada).valor;
    const erro = validarNota(bruto, limite, campo === "linhas" && Boolean(nova.lancada));
    if (erro) throw new Error(erro);
    const valor = bruto === "" || bruto == null ? null : pontosParaApi(bruto);
    const atualizada = { ...nova, valor };
    const id = String(nova.id);
    if (campo === "linhas") {
      rascunhosLanc.current[id] = valor?.replace(".", ",") ?? "";
      setErrosLanc((e) => ({ ...e, [id]: undefined }));
      setLinhas((rs) => rs.map((r) => (r.id === nova.id ? (atualizada as LinhaLancamento) : r)));
      setAlteradasLanc((s) => new Set(s).add(id));
      setAlterado(true);
      if (!alterado) notificar("Existem alterações não salvas no lançamento de notas.", "warning");
    } else {
      setLinhasRec((rs) => rs.map((r) => (r.id === nova.id ? (atualizada as LinhaRecuperacao) : r)));
      setAlteradasRec((s) => new Set(s).add(id));
      setAlteradoRec(true);
      if (!alteradoRec) notificar("Existem alterações não salvas nas notas de recuperação.", "warning");
    }
    return atualizada;
  };

  async function salvarLancamento() {
    if (loteEmCurso.current || conflitoLanc || falhaLote === "incerto" || !podeEditar) return;
    const itens: ItemLoteNota[] = [];
    const erros: Record<string, string> = {};
    for (const linha of linhas) {
      if (!(linha.id in rascunhosLanc.current)) continue;
      const texto = rascunhosLanc.current[linha.id];
      const erro = validarNota(texto, max, linha.lancada);
      if (erro) { erros[linha.id] = erro; continue; }
      if (texto !== "") itens.push({ alunoId: linha.alunoId, valor: pontosParaApi(texto) });
    }
    if (Object.keys(erros).length) { setErrosLanc(erros); focarNota(Object.keys(erros)[0]); return; }
    if (!itens.length) {
      notificar("Informe ao menos uma nota antes de salvar.", "warning");
      return;
    }
    loteEmCurso.current = true; setEnviandoLote(true);
    try {
      const r = await api.salvarLote(avaliacaoId, itens);
      setLancamento(r);
      setLinhas(r.alunos.map((a) => ({ ...a, id: a.matriculaTurmaDisciplinaId })));
      setAlterado(false);
      setAlteradasLanc(new Set());
      rascunhosLanc.current = {}; setErrosLanc({}); setConflitoLanc(false); setFalhaLote(null);
      notificar("Notas salvas com sucesso.", "success");
      try { setAtribuicoes((await api.listarOpcoes()).atribuicoes); }
      catch { notificar("As notas foram salvas, mas não foi possível atualizar as opções. Recarregue a página para consultar o estado atual.", "warning"); }
    } catch (e) {
      const resposta = axios.isAxiosError<ErroLoteNota>(e) ? e.response : undefined;
      const errosServidor: Record<string, string> = {};
      for (const campo of resposta?.data?.campos ?? []) {
        const correspondencia = /^itens\[(\d+)\]\.valor$/.exec(campo.campo);
        const item = correspondencia ? itens[Number(correspondencia[1])] : undefined;
        const aluno = item && linhas.find((l) => l.alunoId === item.alunoId);
        if (aluno) errosServidor[aluno.id] = campo.mensagem;
      }
      setErrosLanc(errosServidor); setConflitoLanc(resposta?.status === 409);
      setFalhaLote(resposta && resposta.status >= 400 && resposta.status < 500 ? "rejeitado" : "incerto");
      focoPendente.current = Object.keys(errosServidor)[0];
      notificar(mensagemErro(e), "error");
    } finally { loteEmCurso.current = false; setEnviandoLote(false); }
  }

  function focarNota(id: string) {
    gridLanc.current?.setCellFocus(id, "valor");
    if (gridLanc.current?.getCellMode(id, "valor") === "view") gridLanc.current.startCellEditMode({ id, field: "valor" });
  }
  const focarErro = useEffectEvent(() => {
    if (!enviandoLote && !api.carregando && focoPendente.current) {
      focarNota(focoPendente.current);
      focoPendente.current = undefined;
    }
  });
  useEffect(() => { focarErro(); }, [enviandoLote, api.carregando, errosLanc]);

  function alterarRascunho(linha: LinhaLancamento, texto: string) {
    rascunhosLanc.current[linha.id] = texto;
    setErrosLanc((e) => ({ ...e, [linha.id]: validarNota(texto, max, linha.lancada) }));
    setAlterado(true);
  }

  function cancelarRascunho(id: string) {
    const anterior = antesDaCelula.current[id];
    if (anterior?.texto === undefined) delete rascunhosLanc.current[id];
    else rascunhosLanc.current[id] = anterior.texto;
    setErrosLanc((e) => ({ ...e, [id]: anterior?.erro }));
    setAlterado(Object.keys(rascunhosLanc.current).length > 0);
  }

  async function salvarRecuperacao() {
    if (!recuperacao?.recuperacaoAvaliacaoId || !recuperacao.valorMaximoRecuperacao || periodoFechado) return;
    const itens = linhasRec
      .filter((r) => r.valor !== null && r.valor !== undefined)
      .map((r) => ({ alunoId: r.alunoId, valor: pontosParaApi(r.valor) }));
    if (!itens.length) {
      notificar("Informe ao menos uma nota de recuperação.", "warning");
      return;
    }
    try {
      await api.salvarLote(recuperacao.recuperacaoAvaliacaoId, itens);
      setAlteradoRec(false);
      setAlteradasRec(new Set());
      setRecuperacao(undefined);
      setLinhasRec([]);
      notificar("Notas de recuperação salvas. Consultando o resultado atualizado no servidor.", "success");
      await carregarRecuperacao({ aposSalvar: true });
    } catch (e) {
      notificar(mensagemErro(e), "error");
    }
  }

  async function enviarAutorizacao() {
    if (periodoFechado) return;
    try {
      await api.criarAutorizacao({ avaliacaoId, motivo: motivoAutorizacao });
      setAutorizar(false);
      setMotivoAutorizacao("");
      notificar("Autorização excepcional registrada. A retificação fora do prazo está liberada.", "success");
      await carregarLancamento();
    } catch (e) {
      notificar(mensagemErro(e), "error");
    }
  }

  const colunasLancamento: GridColDef[] = [
    { field: "matricula", headerName: "Matrícula", width: 110 },
    { field: "nome", headerName: "Aluno", flex: 1, minWidth: 200 },
    {
      field: "valor",
      headerName: "Nota",
      width: 150,
      editable: podeEditar && !enviandoLote && !api.carregando,
      renderEditCell: (params) => <EditorNota params={params} bloqueada={enviandoLote || api.carregando} erro={errosLanc[String(params.id)]} onRascunho={(texto) => alterarRascunho(params.row as LinhaLancamento, texto)} />,
      preProcessEditCellProps: ({ props, row }) => ({ ...props, error: Boolean(validarNota(props.value, max, row.lancada)) }),
      renderCell: ({ row }) => renderNota(row.valor, alteradasLanc.has(String(row.id))),
    },
    {
      field: "prazoExpirado",
      headerName: "Prazo de retificação",
      width: 170,
      renderCell: ({ row }) =>
        row.prazoExpirado ? (
          <Chip size="small" variant="outlined" color="error" label="Prazo expirado" />
        ) : row.lancada ? (
          <Chip size="small" variant="outlined" color="success" label="No prazo" />
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ),
    },
  ];

  const colunasRendimento = useMemo<GridColDef[]>(() => {
    if (!rendimento) return [];
    const dinamicas: GridColDef[] = rendimento.avaliacoes.map((a) => ({
      field: `av_${a.id}`,
      headerName: `${a.tipo} (${formatarNotaValor(a.valor)})`,
      width: 120,
      valueFormatter: (v: string | null) => v == null ? "Não lançada" : formatarNotaValor(v),
    }));
    return [
      { field: "matricula", headerName: "Matrícula", width: 100 },
      { field: "nome", headerName: "Aluno", flex: 1, minWidth: 180 },
      ...dinamicas,
      { field: "resultadoAcademico", headerName: "Resultado acadêmico", minWidth: larguraResultado, flex: 1, sortable: false,
        renderCell: ({ row }: { row: LinhaRendimento }) => <ResultadoAcademicoResumo resultado={row.resultadoAcademico} compacto /> },
    ];
  }, [rendimento, larguraResultado]);

  const linhasRendimento = useMemo(() => {
    if (!rendimento) return [];
    return rendimento.alunos.map((a) => {
      const linha: LinhaRendimento = { ...a, id: a.matriculaTurmaDisciplinaId };
      a.notas.forEach((n) => (linha[`av_${n.avaliacaoId}`] = n.valor));
      return linha;
    });
  }, [rendimento]);

  const colunasRecuperacao: GridColDef[] = [
    { field: "matricula", headerName: "Matrícula", width: 100 },
    { field: "nome", headerName: "Aluno", flex: 1, minWidth: 180 },
    {
      field: "valor",
      headerName: "Recuperação",
      width: 180,
      editable: !periodoFechado && Boolean(recuperacao?.valorMaximoRecuperacao),
      renderEditCell: (params) => <EditorNota params={params} erro={validarNota(params.value, recuperacao?.valorMaximoRecuperacao ?? "0.00")} onRascunho={() => {}} />,
      preProcessEditCellProps: ({ props }) => ({ ...props, error: Boolean(validarNota(props.value, recuperacao?.valorMaximoRecuperacao ?? "0.00")) }),
      renderCell: ({ row }) => renderNota(row.valor, alteradasRec.has(String(row.id))),
    },
    { field: "resultadoAcademico", headerName: "Resultado acadêmico", minWidth: larguraResultado, flex: 1, sortable: false,
      renderCell: ({ row }: { row: LinhaRecuperacao }) => <ResultadoAcademicoResumo resultado={row.resultadoAcademico} compacto /> },
  ];

  const colunasTurmaTamanho = aba === 0 ? { xs: 12, md: 6 } : { xs: 12 };

  return (
    <Container sx={{ p: { xs: 2, md: 3 } }}>
      <Stack gap={2}>
        <Typography component="h1" variant="h5" fontWeight={700}>
          Lançamento de Notas
        </Typography>

        <Card.Root elevation={0} variant="outlined">
          <Card.Content>
            <Grid container spacing={1.5} alignItems="flex-start">
              <Grid size={colunasTurmaTamanho}>
                <TextField
                  select
                  id="notas-oferta"
                  label="Turma e disciplina"
                  SelectProps={{ SelectDisplayProps: { "aria-labelledby": "notas-oferta-label" } }}
                  value={turmaId}
                  disabled={api.carregando || enviandoLote}
                  onChange={(e) => {
                    if ((alterado || alteradoRec) && !confirm("Descartar alterações ainda não salvas?")) return;
                    leituraLanc.current += 1;
                    leituraRendimento.current += 1;
                    leituraRecuperacao.current += 1;
                    rascunhosLanc.current = {}; antesDaCelula.current = {}; focoPendente.current = undefined;
                    setAlterado(false); setAlteradasLanc(new Set()); setErrosLanc({}); setLinhas([]); setLancamento(undefined);
                    setConflitoLanc(false); setFalhaLote(null);
                    setRendimento(undefined); setRecuperacao(undefined); setLinhasRec([]);
                    setAlteradoRec(false); setAlteradasRec(new Set());
                    setAutorizar(false); setMotivoAutorizacao("");
                    setTurmaId(e.target.value);
                    const nova = atribuicoes.find((a) => a.turmaDisciplinaId === e.target.value);
                    setAvaliacaoId(nova?.avaliacoes[0]?.id || "");
                  }}
                >
                  {atribuicoes.map((a) => (
                    <MenuItem key={a.turmaDisciplinaId} value={a.turmaDisciplinaId}>
                      {a.turma.sigla} — {a.disciplina.nome} — {a.periodoLetivo.codigo}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              {aba === 0 && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField select id="notas-avaliacao" label="Avaliação" SelectProps={{ SelectDisplayProps: { "aria-labelledby": "notas-avaliacao-label" } }} value={avaliacaoId} disabled={api.carregando || enviandoLote} onChange={(e) => {
                    if (alterado && !confirm("Descartar alterações ainda não salvas?")) return;
                    leituraLanc.current += 1; rascunhosLanc.current = {}; setAlterado(false); setErrosLanc({}); setLinhas([]); setLancamento(undefined);
                    setAvaliacaoId(e.target.value);
                  }}>
                    {(atribuicao?.avaliacoes ?? [])
                      .filter((av) => av.tipo !== "RECUPERACAO")
                      .map((av) => (
                        <MenuItem key={av.id} value={av.id}>
                          {av.tipo} ({formatarNotaValor(av.valor)}){av.descricao ? ` — ${av.descricao}` : ""}
                        </MenuItem>
                      ))}
                  </TextField>
                </Grid>
              )}
            </Grid>
          </Card.Content>
        </Card.Root>

        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={aba}
            onChange={(_, v) => setAba(v)}
            textColor="primary"
            indicatorColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Visões de notas da turma"
            sx={{ "& .MuiTab-root": { minWidth: "max-content", px: { xs: 1, sm: 2 } } }}
          >
            <Tab label="Lançamento" id="notas-tab-lancamento" aria-controls="notas-painel-lancamento" />
            <Tab label="Rendimento" id="notas-tab-rendimento" aria-controls="notas-painel-rendimento" />
            <Tab label="Recuperação" id="notas-tab-recuperacao" aria-controls="notas-painel-recuperacao" />
          </Tabs>
        </Box>

        {aba === 0 && (
          <Box role="tabpanel" id="notas-painel-lancamento" aria-labelledby="notas-tab-lancamento">
            <Stack gap={2}>
              {lancamento && (
                <Typography variant="body2" color="text.secondary">
                  {lancamento.avaliacao.disciplina.nome} · {lancamento.avaliacao.tipo} · máximo {formatarNotaValor(max)} pontos
                </Typography>
              )}
              {falhaLote && <Stack gap={1}><Typography>{falhaLote === "rejeitado"
                ? "O lote foi rejeitado. Nenhuma nota foi salva. As alterações continuam no rascunho; recarregue para consultar o estado atual."
                : "Não foi possível confirmar o salvamento. As alterações continuam no rascunho; recarregue para consultar o estado atual antes de enviar novamente."}</Typography><Button variant="outlined" disabled={api.carregando || enviandoLote} onClick={() => void carregarLancamento()} sx={{ width: { xs: "100%", sm: "auto" }, alignSelf: "flex-start" }}>Recarregar notas</Button></Stack>}
              {linhas.some((l) => l.prazoExpirado) && ehSecretaria && !periodoFechado && (
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={() => setAutorizar(true)}
                    startIcon={<ShieldCheck size={16} aria-hidden="true" />}
                    sx={{ height: 30, width: { xs: "100%", sm: "auto" }, minWidth: 200 }}
                  >
                    Autorizar retificação
                  </Button>
                </Stack>
              )}
              {podeEditar && (
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    onClick={salvarLancamento}
                    aria-label="Salvar lote"
                    disabled={!alterado || api.carregando || enviandoLote || conflitoLanc || falhaLote === "incerto" || Object.values(errosLanc).some(Boolean)}
                    isLoading={enviandoLote}
                    startIcon={<Save size={16} aria-hidden="true" />}
                    sx={{ height: 36, width: { xs: "100%", sm: "auto" }, minWidth: 160 }}
                  >
                    Salvar lote
                  </Button>
                </Stack>
              )}
              <Card.Root elevation={0} variant="outlined">
                <Card.Content sx={{ minHeight: 480 }}>
                  <DataTable
                    apiRef={gridLanc}
                    onCellEditStart={({ id }) => { antesDaCelula.current[String(id)] = { texto: rascunhosLanc.current[String(id)], erro: errosLanc[String(id)] }; }}
                    onCellEditStop={({ id, reason }) => { if (reason === "escapeKeyDown") cancelarRascunho(String(id)); }}
                    rows={linhas}
                    columns={colunasLancamento}
                    getRowHeight={({ id }) => errosLanc[String(id)] ? "auto" : 40}
                    loading={api.carregando}
                    processRowUpdate={processarLinha("linhas", max)}
                    onProcessRowUpdateError={(e) => notificar((e as Error).message, "error")}
                    emptyTitle="Nenhum aluno para lançamento"
                    emptyDescription="Selecione a turma e a avaliação para carregar os alunos."
                  />
                </Card.Content>
              </Card.Root>
            </Stack>
          </Box>
        )}

        {aba === 1 && (
          <Box role="tabpanel" id="notas-painel-rendimento" aria-labelledby="notas-tab-rendimento">
            <Stack gap={2}>
              <Stack direction="row" justifyContent="flex-end">
                <Button
                  variant="contained"
                  onClick={carregarRendimento}
                  disabled={!turmaId || api.carregando}
                  isLoading={api.carregando}
                  startIcon={<RefreshCw size={16} aria-hidden="true" />}
                  sx={{ height: 36, width: { xs: "100%", sm: "auto" }, minWidth: 180 }}
                >
                  Atualizar rendimento
                </Button>
              </Stack>
              <Card.Root elevation={0} variant="outlined">
                <Card.Content sx={{ minHeight: 480 }}>
                  <DataTable
                    rows={linhasRendimento}
                    columns={colunasRendimento}
                    getRowHeight={() => "auto"}
                    loading={api.carregando}
                    emptyTitle="Nenhum rendimento para exibir"
                    emptyDescription="Selecione a turma para visualizar o rendimento consolidado."
                  />
                </Card.Content>
              </Card.Root>
            </Stack>
          </Box>
        )}

        {aba === 2 && (
          <Box role="tabpanel" id="notas-painel-recuperacao" aria-labelledby="notas-tab-recuperacao">
            <Stack gap={2}>
              <Typography variant="body2" color="text.secondary">
                Alunos elegíveis conforme a consulta do servidor. Máximo da recuperação: {recuperacao?.valorMaximoRecuperacao ? formatarNotaValor(recuperacao.valorMaximoRecuperacao) : "-"} pontos.
              </Typography>
              {!periodoFechado && (
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    onClick={salvarRecuperacao}
                    disabled={!alteradoRec || api.carregando || !recuperacao?.valorMaximoRecuperacao}
                    isLoading={api.carregando}
                    startIcon={<Save size={16} aria-hidden="true" />}
                    sx={{ height: 36, width: { xs: "100%", sm: "auto" }, minWidth: 180 }}
                  >
                    Salvar recuperação
                  </Button>
                </Stack>
              )}
              <Card.Root elevation={0} variant="outlined">
                <Card.Content sx={{ minHeight: 480 }}>
                  <DataTable
                    rows={linhasRec}
                    columns={colunasRecuperacao}
                    getRowHeight={() => "auto"}
                    loading={api.carregando}
                    processRowUpdate={processarLinha("recuperacao", recuperacao?.valorMaximoRecuperacao ?? "0.00")}
                    onProcessRowUpdateError={(e) => notificar((e as Error).message, "error")}
                    emptyTitle="Nenhum aluno elegível para recuperação"
                    emptyDescription="Apenas alunos elegíveis por nota conforme o plano completo e o corte em pontos da regra aparecem aqui."
                  />
                </Card.Content>
              </Card.Root>
            </Stack>
          </Box>
        )}
      </Stack>

      <AutorizacaoDialog
        open={autorizar}
        motivo={motivoAutorizacao}
        saving={api.carregando}
        onMotivo={setMotivoAutorizacao}
        onClose={() => setAutorizar(false)}
        onSave={enviarAutorizacao}
      />
    </Container>
  );
}
