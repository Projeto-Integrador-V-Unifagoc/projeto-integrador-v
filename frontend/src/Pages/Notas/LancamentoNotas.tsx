import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, Grid, MenuItem, Stack, Tab, Tabs, Typography } from "@mui/material";
import type { GridColDef, GridRowModel } from "@mui/x-data-grid";
import { RefreshCw, Save, ShieldCheck } from "lucide-react";
import Button from "../../components/Button";
import { Card } from "../../components/Card";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import TextField from "../../components/TextField";
import { useNota } from "../../hooks/use-nota";
import {
  SITUACAO_LABEL,
  situacaoCor,
  type AlunoLancamento,
  type AlunoRecuperacao,
  type AtribuicaoNota,
  type Lancamento,
  type Recuperacao,
  type Rendimento,
  type SituacaoNota,
} from "../../models/nota-model";
import AutorizacaoDialog from "./AutorizacaoDialog";
import { type Aviso, formatarMedia, formatarNotaValor, mensagemErro, perfilLocal } from "./notas-utils";

type LinhaLancamento = AlunoLancamento & { id: string };
type LinhaRecuperacao = AlunoRecuperacao & { id: string; valor: number | null };
type LinhaRendimento = Record<string, number | string | null>;
type LinhaEditada = { id: string; alunoId: string; valor: unknown };

// Situação sempre comunicada por rótulo; a cor apenas reforça (sem depender só de cor).
const chipSituacao = (valor: unknown) => (
  <Chip size="small" color={situacaoCor(valor as SituacaoNota)} label={SITUACAO_LABEL[valor as SituacaoNota]} />
);

// Célula de nota em leitura: "Não lançada" (itálico) é visualmente distinto de zero e de erro;
// alterações ainda não salvas recebem marcador (ponto + negrito), não apenas cor.
const renderNota = (valor: number | null | undefined, alterada: boolean) =>
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
        {formatarNotaValor(Number(valor))}
      </Typography>
    </Stack>
  );

export default function LancamentoNotas() {
  const api = useNota();
  const perfil = perfilLocal();
  const ehSecretaria = perfil === "secretaria" || perfil === "administrador";

  const [atribuicoes, setAtribuicoes] = useState<AtribuicaoNota[]>([]);
  const [turmaId, setTurmaId] = useState("");
  const [avaliacaoId, setAvaliacaoId] = useState("");
  const [aba, setAba] = useState(0);
  const [aviso, setAviso] = useState<Aviso>();

  const [lancamento, setLancamento] = useState<Lancamento>();
  const [linhas, setLinhas] = useState<LinhaLancamento[]>([]);
  const [alterado, setAlterado] = useState(false);
  const [alteradasLanc, setAlteradasLanc] = useState<Set<string>>(new Set());

  const [rendimento, setRendimento] = useState<Rendimento>();
  const [recuperacao, setRecuperacao] = useState<Recuperacao>();
  const [linhasRec, setLinhasRec] = useState<LinhaRecuperacao[]>([]);
  const [alteradoRec, setAlteradoRec] = useState(false);
  const [alteradasRec, setAlteradasRec] = useState<Set<string>>(new Set());

  const [autorizar, setAutorizar] = useState(false);
  const [motivoAutorizacao, setMotivoAutorizacao] = useState("");

  const atribuicao = useMemo(() => atribuicoes.find((a) => a.turmaDisciplinaId === turmaId), [atribuicoes, turmaId]);
  const periodoFechado = atribuicao?.periodoLetivo.fechado ?? false;

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
        if (ativo) setAviso({ tipo: "error", texto: mensagemErro(e) });
      }
    })();
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    try {
      const r = await api.obterLancamento(avaliacaoId);
      setLancamento(r);
      setLinhas(r.alunos.map((a) => ({ ...a, id: a.matriculaTurmaDisciplinaId })));
      setAlterado(false);
      setAlteradasLanc(new Set());
      setAviso(undefined);
    } catch (e) {
      setAviso({ tipo: "error", texto: mensagemErro(e) });
    }
  }

  async function carregarRendimento() {
    if (!turmaId) return;
    try {
      setRendimento(await api.obterRendimento(turmaId));
    } catch (e) {
      setAviso({ tipo: "error", texto: mensagemErro(e) });
    }
  }

  async function carregarRecuperacao() {
    if (!turmaId) return;
    if (alteradoRec && !confirm("Descartar alterações ainda não salvas?")) return;
    try {
      const r = await api.obterRecuperacao(turmaId);
      setRecuperacao(r);
      setLinhasRec(r.alunos.map((a) => ({ ...a, id: a.matriculaTurmaDisciplinaId, valor: a.notaRecuperacao })));
      setAlteradoRec(false);
      setAlteradasRec(new Set());
    } catch (e) {
      setAviso({ tipo: "error", texto: mensagemErro(e) });
    }
  }

  useEffect(() => {
    if (aba === 0) void carregarLancamento();
    if (aba === 1) void carregarRendimento();
    if (aba === 2) void carregarRecuperacao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, avaliacaoId, turmaId]);

  const max = lancamento?.avaliacao.valorMaximo ?? 0;
  const podeEditar = Boolean(lancamento?.podeEditar) && !periodoFechado;

  const processarLinha = (campo: "linhas" | "recuperacao", limite: number) => (nova: GridRowModel): GridRowModel => {
    const bruto = (nova as LinhaEditada).valor;
    let valor: number | null = null;
    if (!(bruto === "" || bruto === undefined || bruto === null || (typeof bruto === "string" && bruto.trim() === ""))) {
      valor = Number(bruto);
      if (!Number.isFinite(valor) || valor < 0 || valor > limite) {
        throw new Error(`Informe um valor entre 0 e ${limite}.`);
      }
    }
    const atualizada = { ...nova, valor };
    const id = String(nova.id);
    if (campo === "linhas") {
      setLinhas((rs) => rs.map((r) => (r.id === nova.id ? (atualizada as LinhaLancamento) : r)));
      setAlteradasLanc((s) => new Set(s).add(id));
      setAlterado(true);
    } else {
      setLinhasRec((rs) => rs.map((r) => (r.id === nova.id ? (atualizada as LinhaRecuperacao) : r)));
      setAlteradasRec((s) => new Set(s).add(id));
      setAlteradoRec(true);
    }
    return atualizada;
  };

  async function salvarLancamento() {
    const itens = linhas
      .filter((r) => r.valor !== null && r.valor !== undefined)
      .map((r) => ({ alunoId: r.alunoId, valor: Number(r.valor) }));
    if (!itens.length) {
      setAviso({ tipo: "warning", texto: "Informe ao menos uma nota antes de salvar." });
      return;
    }
    try {
      const r = await api.salvarLote(avaliacaoId, itens);
      setLancamento(r);
      setLinhas(r.alunos.map((a) => ({ ...a, id: a.matriculaTurmaDisciplinaId })));
      setAlterado(false);
      setAlteradasLanc(new Set());
      setAviso({ tipo: "success", texto: "Notas salvas com sucesso em uma única transação." });
    } catch (e) {
      setAviso({ tipo: "error", texto: mensagemErro(e) });
    }
  }

  async function salvarRecuperacao() {
    if (!recuperacao?.recuperacaoAvaliacaoId) return;
    const itens = linhasRec
      .filter((r) => r.valor !== null && r.valor !== undefined)
      .map((r) => ({ alunoId: r.alunoId, valor: Number(r.valor) }));
    if (!itens.length) {
      setAviso({ tipo: "warning", texto: "Informe ao menos uma nota de recuperação." });
      return;
    }
    try {
      await api.salvarLote(recuperacao.recuperacaoAvaliacaoId, itens);
      setAlteradoRec(false);
      setAlteradasRec(new Set());
      setAviso({ tipo: "success", texto: "Notas de recuperação salvas e média final recalculada." });
      await carregarRecuperacao();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensagemErro(e) });
    }
  }

  async function enviarAutorizacao() {
    try {
      await api.criarAutorizacao({ avaliacaoId, motivo: motivoAutorizacao });
      setAutorizar(false);
      setMotivoAutorizacao("");
      setAviso({ tipo: "success", texto: "Autorização excepcional registrada e auditada. A retificação fora do prazo está liberada." });
      await carregarLancamento();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensagemErro(e) });
    }
  }

  const colunasLancamento: GridColDef[] = [
    { field: "matricula", headerName: "Matrícula", width: 110 },
    { field: "nome", headerName: "Aluno", flex: 1, minWidth: 200 },
    {
      field: "valor",
      headerName: "Nota",
      width: 150,
      editable: podeEditar,
      type: "number",
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
      headerName: `${a.tipo} (${a.valor})`,
      width: 120,
      type: "number",
      valueFormatter: (v) => (v === null || v === undefined ? "—" : formatarNotaValor(Number(v))),
    }));
    return [
      { field: "matricula", headerName: "Matrícula", width: 100 },
      { field: "nome", headerName: "Aluno", flex: 1, minWidth: 180 },
      ...dinamicas,
      { field: "mediaParcial", headerName: "Média parcial", width: 130, valueFormatter: (v) => formatarMedia(v as number | null) },
      { field: "mediaFinal", headerName: "Média final", width: 120, valueFormatter: (v) => formatarMedia(v as number | null) },
      { field: "situacao", headerName: "Situação", width: 160, renderCell: ({ value }) => chipSituacao(value) },
    ];
  }, [rendimento]);

  const linhasRendimento = useMemo(() => {
    if (!rendimento) return [];
    return rendimento.alunos.map((a) => {
      const linha: LinhaRendimento = { id: a.alunoId, matricula: a.matricula, nome: a.nome, mediaParcial: a.mediaParcial, mediaFinal: a.mediaFinal, situacao: a.situacao };
      a.notas.forEach((n) => (linha[`av_${n.avaliacaoId}`] = n.valor));
      return linha;
    });
  }, [rendimento]);

  const colunasRecuperacao: GridColDef[] = [
    { field: "matricula", headerName: "Matrícula", width: 100 },
    { field: "nome", headerName: "Aluno", flex: 1, minWidth: 180 },
    { field: "mediaParcial", headerName: "Média parcial", width: 130, valueFormatter: (v) => formatarMedia(v as number | null) },
    {
      field: "valor",
      headerName: "Recuperação (0 a 100)",
      width: 180,
      editable: !periodoFechado,
      type: "number",
      renderCell: ({ row }) => renderNota(row.valor, alteradasRec.has(String(row.id))),
    },
    { field: "mediaFinal", headerName: "Média final", width: 120, valueFormatter: (v) => formatarMedia(v as number | null) },
    { field: "situacao", headerName: "Situação", width: 160, renderCell: ({ value }) => chipSituacao(value) },
  ];

  const colunasTurmaTamanho = aba === 0 ? { xs: 12, md: 6 } : { xs: 12 };

  return (
    <Container sx={{ p: { xs: 2, md: 3 } }}>
      <Stack gap={2}>
        <Typography component="h1" variant="h5" fontWeight={700}>
          Lançamento de Notas
        </Typography>

        {aviso && (
          <Alert severity={aviso.tipo} onClose={() => setAviso(undefined)}>
            {aviso.texto}
          </Alert>
        )}
        {periodoFechado && <Alert severity="info">Período letivo fechado: as notas estão em modo somente leitura.</Alert>}
        {ehSecretaria && !periodoFechado && (
          <Alert severity="info">
            Perfil de secretaria: acesso de consulta e autorização excepcional. O lançamento e a edição das notas são feitos pelo professor.
          </Alert>
        )}

        <Card.Root elevation={0} variant="outlined">
          <Card.Content>
            <Grid container spacing={1.5} alignItems="flex-start">
              <Grid size={colunasTurmaTamanho}>
                <TextField
                  select
                  label="Turma e disciplina"
                  value={turmaId}
                  onChange={(e) => {
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
                  <TextField select label="Avaliação" value={avaliacaoId} onChange={(e) => setAvaliacaoId(e.target.value)}>
                    {(atribuicao?.avaliacoes ?? [])
                      .filter((av) => av.tipo !== "RECUPERACAO")
                      .map((av) => (
                        <MenuItem key={av.id} value={av.id}>
                          {av.tipo} ({av.valor}){av.descricao ? ` — ${av.descricao}` : ""}
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
            aria-label="Visões de notas da turma"
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
              {lancamento && lancamento.matriculasIrregulares > 0 && (
                <Alert severity="info">{lancamento.matriculasIrregulares} matrícula(s) irregular(es) foram omitidas.</Alert>
              )}
              {linhas.some((l) => l.prazoExpirado) && (
                <Alert
                  severity="warning"
                  action={
                    ehSecretaria ? (
                      <Button
                        variant="outlined"
                        onClick={() => setAutorizar(true)}
                        startIcon={<ShieldCheck size={16} aria-hidden="true" />}
                        sx={{ height: 30, width: "auto", minWidth: 200 }}
                      >
                        Autorizar retificação
                      </Button>
                    ) : undefined
                  }
                >
                  Há notas com prazo de retificação expirado.{" "}
                  {ehSecretaria
                    ? "Como secretaria, você pode autorizar a retificação excepcional."
                    : "Solicite autorização excepcional à secretaria."}
                </Alert>
              )}
              {alterado && <Alert severity="warning">Existem alterações não salvas. Salve o lote para registrá-las.</Alert>}
              {podeEditar && (
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    onClick={salvarLancamento}
                    disabled={!alterado || api.carregando}
                    isLoading={api.carregando}
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
                    rows={linhas}
                    columns={colunasLancamento}
                    loading={api.carregando}
                    processRowUpdate={processarLinha("linhas", max)}
                    onProcessRowUpdateError={(e) => setAviso({ tipo: "error", texto: (e as Error).message })}
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
                Alunos elegíveis (média parcial abaixo de 60% com etapa regular concluída). Recuperação de 0 a 100; a média final é o maior
                valor entre a média parcial e a recuperação.
              </Typography>
              {alteradoRec && <Alert severity="warning">Existem alterações não salvas. Salve a recuperação para registrá-las.</Alert>}
              {!periodoFechado && (
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    onClick={salvarRecuperacao}
                    disabled={!alteradoRec || api.carregando}
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
                    loading={api.carregando}
                    processRowUpdate={processarLinha("recuperacao", 100)}
                    onProcessRowUpdateError={(e) => setAviso({ tipo: "error", texto: (e as Error).message })}
                    emptyTitle="Nenhum aluno elegível para recuperação"
                    emptyDescription="Apenas alunos com média parcial abaixo de 60% e etapa regular concluída aparecem aqui."
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
