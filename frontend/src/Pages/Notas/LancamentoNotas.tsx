import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef, type GridRowModel } from "@mui/x-data-grid";
import Container from "../../components/Container";
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
} from "../../models/nota-model";

type LinhaLancamento = AlunoLancamento & { id: string };
type LinhaRecuperacao = AlunoRecuperacao & { id: string; valor: number | null };
type LinhaRendimento = Record<string, number | string | null>;
type LinhaEditada = { id: string; alunoId: string; valor: unknown };

const mensagemErro = (erro: unknown) => {
  const e = erro as { response?: { data?: { mensagem?: string } }; message?: string };
  return e.response?.data?.mensagem || e.message || "Não foi possível concluir a operação.";
};
const perfilLocal = () => {
  try {
    return String(JSON.parse(localStorage.getItem("@UniEduca:user") || "{}").tipo_usuario || "").toLowerCase();
  } catch {
    return "";
  }
};
const fmtMedia = (v: number | null) => (v === null ? "—" : `${v.toFixed(1).replace(".", ",")}%`);

type Aviso = { tipo: "success" | "error" | "info" | "warning"; texto: string };

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

  const [rendimento, setRendimento] = useState<Rendimento>();
  const [recuperacao, setRecuperacao] = useState<Recuperacao>();
  const [linhasRec, setLinhasRec] = useState<LinhaRecuperacao[]>([]);
  const [alteradoRec, setAlteradoRec] = useState(false);

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
    if (campo === "linhas") {
      setLinhas((rs) => rs.map((r) => (r.id === nova.id ? (atualizada as LinhaLancamento) : r)));
      setAlterado(true);
    } else {
      setLinhasRec((rs) => rs.map((r) => (r.id === nova.id ? (atualizada as LinhaRecuperacao) : r)));
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
      renderCell: ({ row }) =>
        row.valor === null || row.valor === undefined ? (
          <Typography variant="body2" color="text.disabled" fontStyle="italic">
            Não lançada
          </Typography>
        ) : (
          <span>{Number(row.valor).toFixed(2).replace(".", ",")}</span>
        ),
    },
    {
      field: "prazoExpirado",
      headerName: "Prazo",
      width: 150,
      renderCell: ({ row }) =>
        row.prazoExpirado ? <Chip size="small" color="warning" label="Prazo expirado" /> : row.lancada ? <Chip size="small" label="No prazo" /> : null,
    },
  ];

  const colunasRendimento = useMemo<GridColDef[]>(() => {
    if (!rendimento) return [];
    const dinamicas: GridColDef[] = rendimento.avaliacoes.map((a) => ({
      field: `av_${a.id}`,
      headerName: `${a.tipo} (${a.valor})`,
      width: 120,
      valueFormatter: (v) => (v === null || v === undefined ? "—" : Number(v).toFixed(1).replace(".", ",")),
    }));
    return [
      { field: "matricula", headerName: "Matrícula", width: 100 },
      { field: "nome", headerName: "Aluno", flex: 1, minWidth: 180 },
      ...dinamicas,
      { field: "mediaParcial", headerName: "Média parcial", width: 130, valueFormatter: (v) => fmtMedia(v ?? null) },
      { field: "mediaFinal", headerName: "Média final", width: 120, valueFormatter: (v) => fmtMedia(v ?? null) },
      {
        field: "situacao",
        headerName: "Situação",
        width: 150,
        renderCell: ({ value }) => <Chip size="small" color={situacaoCor(value)} label={SITUACAO_LABEL[value as keyof typeof SITUACAO_LABEL]} />,
      },
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
    { field: "mediaParcial", headerName: "Média parcial", width: 130, valueFormatter: (v) => fmtMedia(v ?? null) },
    {
      field: "valor",
      headerName: "Recuperação (0-100)",
      width: 180,
      editable: !periodoFechado,
      type: "number",
      renderCell: ({ row }) =>
        row.valor === null || row.valor === undefined ? (
          <Typography variant="body2" color="text.disabled" fontStyle="italic">
            Não lançada
          </Typography>
        ) : (
          <span>{Number(row.valor).toFixed(2).replace(".", ",")}</span>
        ),
    },
    { field: "mediaFinal", headerName: "Média final", width: 120, valueFormatter: (v) => fmtMedia(v ?? null) },
    {
      field: "situacao",
      headerName: "Situação",
      width: 150,
      renderCell: ({ value }) => <Chip size="small" color={situacaoCor(value)} label={SITUACAO_LABEL[value as keyof typeof SITUACAO_LABEL]} />,
    },
  ];

  return (
    <Container sx={{ p: { xs: 2, md: 3 } }}>
      <Stack gap={2}>
        <Typography variant="h5" fontWeight={700}>
          Lançamento de Notas
        </Typography>
        {aviso && <Alert severity={aviso.tipo} onClose={() => setAviso(undefined)}>{aviso.texto}</Alert>}
        {periodoFechado && <Alert severity="info">Período letivo fechado: as notas estão em modo somente leitura.</Alert>}

        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} gap={2}>
            <FormControl fullWidth>
              <InputLabel>Turma / disciplina</InputLabel>
              <Select
                label="Turma / disciplina"
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
              </Select>
            </FormControl>
            {aba === 0 && (
              <FormControl fullWidth>
                <InputLabel>Avaliação</InputLabel>
                <Select label="Avaliação" value={avaliacaoId} onChange={(e) => setAvaliacaoId(e.target.value)}>
                  {(atribuicao?.avaliacoes ?? [])
                    .filter((av) => av.tipo !== "RECUPERACAO")
                    .map((av) => (
                      <MenuItem key={av.id} value={av.id}>
                        {av.tipo} ({av.valor}) {av.descricao ? `— ${av.descricao}` : ""}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </Paper>

        <Tabs value={aba} onChange={(_, v) => setAba(v)}>
          <Tab label="Lançamento" />
          <Tab label="Rendimento" />
          <Tab label="Recuperação" />
        </Tabs>

        {aba === 0 && (
          <>
            {lancamento && (
              <Typography variant="body2" color="text.secondary">
                {lancamento.avaliacao.disciplina.nome} · {lancamento.avaliacao.tipo} · máximo {max} pontos
              </Typography>
            )}
            {lancamento && lancamento.matriculasIrregulares > 0 && (
              <Alert severity="info">{lancamento.matriculasIrregulares} matrícula(s) irregular(es) foram omitidas.</Alert>
            )}
            {alterado && <Alert severity="warning">Existem alterações não salvas.</Alert>}
            {linhas.some((l) => l.prazoExpirado) && (
              <Alert severity="warning">
                Há notas com prazo de retificação expirado.{" "}
                {ehSecretaria ? "Como secretaria, você pode autorizar a retificação excepcional." : "Solicite autorização excepcional à secretaria."}
                {ehSecretaria && (
                  <Button size="small" sx={{ ml: 1 }} onClick={() => setAutorizar(true)}>
                    Autorizar retificação
                  </Button>
                )}
              </Alert>
            )}
            {podeEditar && (
              <Stack direction="row" justifyContent="flex-end">
                <Button variant="contained" onClick={salvarLancamento} disabled={!alterado || api.carregando}>
                  Salvar lote
                </Button>
              </Stack>
            )}
            <Paper sx={{ height: 480 }}>
              <DataGrid
                rows={linhas}
                columns={colunasLancamento}
                loading={api.carregando}
                processRowUpdate={processarLinha("linhas", max)}
                onProcessRowUpdateError={(e) => setAviso({ tipo: "error", texto: (e as Error).message })}
                disableRowSelectionOnClick
              />
            </Paper>
          </>
        )}

        {aba === 1 && (
          <Paper sx={{ height: 520 }}>
            <DataGrid rows={linhasRendimento} columns={colunasRendimento} loading={api.carregando} disableRowSelectionOnClick />
          </Paper>
        )}

        {aba === 2 && (
          <>
            <Typography variant="body2" color="text.secondary">
              Alunos elegíveis (média parcial abaixo de 60% com etapa regular concluída). Recuperação de 0 a 100; a média final é o maior valor entre a média parcial e a recuperação.
            </Typography>
            {alteradoRec && <Alert severity="warning">Existem alterações não salvas.</Alert>}
            {!periodoFechado && (
              <Stack direction="row" justifyContent="flex-end">
                <Button variant="contained" onClick={salvarRecuperacao} disabled={!alteradoRec || api.carregando}>
                  Salvar recuperação
                </Button>
              </Stack>
            )}
            <Paper sx={{ height: 480 }}>
              <DataGrid
                rows={linhasRec}
                columns={colunasRecuperacao}
                loading={api.carregando}
                processRowUpdate={processarLinha("recuperacao", 100)}
                onProcessRowUpdateError={(e) => setAviso({ tipo: "error", texto: (e as Error).message })}
                disableRowSelectionOnClick
              />
            </Paper>
          </>
        )}
      </Stack>

      <Dialog open={autorizar} onClose={() => setAutorizar(false)} fullWidth>
        <DialogTitle>Autorizar retificação excepcional</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <Alert severity="info">A autorização libera a edição fora do prazo de 7 dias enquanto o período estiver aberto e fica registrada em auditoria.</Alert>
            <TextField
              label="Motivo"
              required
              multiline
              minRows={3}
              value={motivoAutorizacao}
              onChange={(e) => setMotivoAutorizacao(e.target.value)}
              inputProps={{ maxLength: 500 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutorizar(false)}>Cancelar</Button>
          <Button variant="contained" onClick={enviarAutorizacao} disabled={motivoAutorizacao.trim().length < 5}>
            Registrar autorização
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
