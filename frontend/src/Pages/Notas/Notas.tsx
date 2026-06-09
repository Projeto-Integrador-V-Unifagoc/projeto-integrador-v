import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import axios from "axios";
import { ClipboardList, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

import Button from "../../components/Button";
import { Card } from "../../components/Card";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import { Dialog } from "../../components/Dialog";
import TextField from "../../components/TextField";
import { api } from "../../lib/axios";

type TipoAvaliacaoNota = "PROVA" | "TPI" | "TRABALHO";
type SituacaoNota = "APROVADO" | "RECUPERACAO" | "REPROVADO" | "SEM_NOTA";

interface NotaDetalhada {
  id: string;
  tipo_avaliacao: TipoAvaliacaoNota;
  descricao_avaliacao?: string | null;
  data_lancamento: string;
  valor: number;
  nota: number;
  data_devolucao?: string | null;
  turma_disciplina_id: string;
  matricula_turma_disciplina_id: string;
  aluno_id: string;
  aluno_nome: string;
  aluno_matricula: number;
  turma_id: string;
  turma_sigla: string;
  turma_descricao: string;
  disciplina_codigo: string;
  disciplina_nome: string;
  professor_nome: string;
  periodo_letivo_codigo: string;
}

interface BoletimAluno {
  alunoId: string;
  alunoNome: string;
  alunoMatricula: number;
  matriculaTurmaDisciplinaId: string;
  turmaDisciplinaId: string;
  turmaId: string;
  turma: string;
  disciplinaCodigo: string;
  disciplinaNome: string;
  professorNome: string;
  periodoLetivo: string;
  avaliacoes: NotaDetalhada[];
  totalDistribuido: number;
  totalObtido: number;
  media: number;
  situacao: SituacaoNota;
}

interface NotaForm {
  turma_disciplina_id: string;
  matricula_turma_disciplina_id: string;
  aluno_id: string;
  tipo_avaliacao: TipoAvaliacaoNota;
  descricao_avaliacao: string;
  valor: number | "";
  nota: number | "";
  data_lancamento: string;
  data_devolucao: string;
}

const tipoOptions: TipoAvaliacaoNota[] = ["PROVA", "TPI", "TRABALHO"];

function criarFormularioInicial(): NotaForm {
  return {
    turma_disciplina_id: "",
    matricula_turma_disciplina_id: "",
    aluno_id: "",
    tipo_avaliacao: "PROVA",
    descricao_avaliacao: "",
    valor: 20,
    nota: "",
    data_lancamento: new Date().toISOString().slice(0, 10),
    data_devolucao: "",
  };
}

function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatarData(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatarTipo(tipo: TipoAvaliacaoNota) {
  if (tipo === "TPI") return "TPI";
  return tipo.charAt(0) + tipo.slice(1).toLowerCase();
}

function getMensagemErro(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data?.error || error.response?.data?.mensagem;
    if (typeof apiMessage === "string" && apiMessage.trim()) return apiMessage;
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function getSituacaoColor(situacao: SituacaoNota) {
  if (situacao === "APROVADO") return "success";
  if (situacao === "RECUPERACAO") return "warning";
  if (situacao === "REPROVADO") return "error";
  return "default";
}

function getSituacaoLabel(situacao: SituacaoNota) {
  if (situacao === "SEM_NOTA") return "Sem nota";
  if (situacao === "RECUPERACAO") return "Recuperacao";
  return situacao.charAt(0) + situacao.slice(1).toLowerCase();
}

export default function Notas() {
  const [boletins, setBoletins] = useState<BoletimAluno[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDeleteOpen, setDialogDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notaParaExcluir, setNotaParaExcluir] = useState<NotaDetalhada | null>(null);
  const [form, setForm] = useState<NotaForm>(criarFormularioInicial());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function carregarNotas() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.get<BoletimAluno[]>("/notas");
      setBoletins(response.data);
    } catch (error) {
      console.error(error);
      setErrorMessage(getMensagemErro(error, "Nao foi possivel carregar as notas."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarNotas();
  }, []);

  const notas = useMemo(
    () => boletins.flatMap((boletim) => boletim.avaliacoes),
    [boletins],
  );

  const boletinsFiltrados = useMemo(() => {
    const term = normalizarTexto(search);
    if (!term) return boletins;

    return boletins.filter((boletim) => {
      const campos = [
        boletim.alunoNome,
        String(boletim.alunoMatricula),
        boletim.turma,
        boletim.disciplinaCodigo,
        boletim.disciplinaNome,
        boletim.professorNome,
        boletim.periodoLetivo,
        getSituacaoLabel(boletim.situacao),
      ];

      return campos.some((campo) => normalizarTexto(campo).includes(term));
    });
  }, [boletins, search]);

  const boletimRows = useMemo(
    () => boletinsFiltrados.map((boletim) => ({ id: boletim.matriculaTurmaDisciplinaId, ...boletim })),
    [boletinsFiltrados],
  );

  const notasRows = useMemo(
    () =>
      notas.map((nota) => ({
        ...nota,
        aluno: `${nota.aluno_matricula} - ${nota.aluno_nome}`,
        turma: `${nota.turma_sigla} - ${nota.turma_descricao}`,
        disciplina: `${nota.disciplina_codigo} - ${nota.disciplina_nome}`,
      })),
    [notas],
  );

  const totais = useMemo(() => {
    const alunosAprovados = boletins.filter((item) => item.situacao === "APROVADO").length;
    const alunosRecuperacao = boletins.filter((item) => item.situacao === "RECUPERACAO").length;
    const mediaGeral =
      boletins.length === 0
        ? 0
        : boletins.reduce((total, item) => total + item.media, 0) / boletins.length;

    return {
      boletins: boletins.length,
      notas: notas.length,
      alunosAprovados,
      alunosRecuperacao,
      mediaGeral: Number(mediaGeral.toFixed(2)),
    };
  }, [boletins, notas]);

  function abrirCadastro(boletim?: BoletimAluno) {
    setEditingId(null);
    setForm({
      ...criarFormularioInicial(),
      turma_disciplina_id: boletim?.turmaDisciplinaId || "",
      matricula_turma_disciplina_id: boletim?.matriculaTurmaDisciplinaId || "",
      aluno_id: boletim?.alunoId || "",
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setDialogOpen(true);
  }

  function abrirEdicao(nota: NotaDetalhada) {
    setEditingId(nota.id);
    setForm({
      turma_disciplina_id: nota.turma_disciplina_id,
      matricula_turma_disciplina_id: nota.matricula_turma_disciplina_id,
      aluno_id: nota.aluno_id,
      tipo_avaliacao: nota.tipo_avaliacao,
      descricao_avaliacao: nota.descricao_avaliacao || "",
      valor: Number(nota.valor),
      nota: Number(nota.nota),
      data_lancamento: nota.data_lancamento?.slice(0, 10) || initialForm.data_lancamento,
      data_devolucao: nota.data_devolucao?.slice(0, 10) || "",
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setDialogOpen(true);
  }

  function fecharDialog() {
    if (!saving) setDialogOpen(false);
  }

  function abrirExclusao(nota: NotaDetalhada) {
    setNotaParaExcluir(nota);
    setDialogDeleteOpen(true);
  }

  function fecharExclusao() {
    if (deleting) return;
    setNotaParaExcluir(null);
    setDialogDeleteOpen(false);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;

    if (name === "tipo_avaliacao") {
      const tipo = value as TipoAvaliacaoNota;
      setForm((current) => ({
        ...current,
        tipo_avaliacao: tipo,
        valor: tipo === "PROVA" ? 20 : tipo === "TPI" ? 5 : current.tipo_avaliacao === "TRABALHO" ? current.valor : "",
      }));
      return;
    }

    if (name === "valor" || name === "nota") {
      setForm((current) => ({
        ...current,
        [name]: value === "" ? "" : Math.max(0, Number(value)),
      }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  }

  function validarFormulario() {
    if (!form.turma_disciplina_id.trim()) throw new Error("Informe a turma-disciplina.");
    if (!form.matricula_turma_disciplina_id.trim() && !form.aluno_id.trim()) {
      throw new Error("Informe a matricula-disciplina ou o aluno.");
    }
    if (form.valor === "" || Number(form.valor) <= 0) throw new Error("Informe o valor da avaliacao.");
    if (form.nota === "" || Number(form.nota) < 0) throw new Error("Informe a nota lancada.");
    if (Number(form.nota) > Number(form.valor)) {
      throw new Error("A nota nao pode ser maior que o valor da avaliacao.");
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      validarFormulario();

      const payload = {
        turma_disciplina_id: form.turma_disciplina_id.trim(),
        matricula_turma_disciplina_id: form.matricula_turma_disciplina_id.trim() || undefined,
        aluno_id: form.aluno_id.trim() || undefined,
        tipo_avaliacao: form.tipo_avaliacao,
        descricao_avaliacao: form.descricao_avaliacao.trim() || undefined,
        valor: Number(form.valor),
        nota: Number(form.nota),
        data_lancamento: form.data_lancamento || undefined,
        data_devolucao: form.data_devolucao || null,
      };

      if (editingId) {
        await api.put(`/notas/${editingId}`, payload);
        setSuccessMessage("Nota atualizada com sucesso.");
      } else {
        await api.post("/notas", payload);
        setSuccessMessage("Nota lancada com sucesso.");
      }

      await carregarNotas();
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      setErrorMessage(getMensagemErro(error, "Nao foi possivel salvar a nota."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmarExclusao() {
    if (!notaParaExcluir) return;

    setDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.delete(`/notas/${notaParaExcluir.id}`);
      setSuccessMessage("Nota removida com sucesso.");
      await carregarNotas();
      fecharExclusao();
    } catch (error) {
      console.error(error);
      setErrorMessage(getMensagemErro(error, "Nao foi possivel remover a nota."));
    } finally {
      setDeleting(false);
    }
  }

  const boletimColumns: GridColDef[] = [
    { field: "alunoNome", headerName: "Aluno", flex: 1.2, minWidth: 220 },
    { field: "alunoMatricula", headerName: "Matricula", width: 120 },
    { field: "disciplinaNome", headerName: "Disciplina", flex: 1.1, minWidth: 200 },
    { field: "turma", headerName: "Turma", flex: 1, minWidth: 180 },
    {
      field: "totalObtido",
      headerName: "Pontos",
      width: 130,
      valueGetter: (_, row) => `${Number(row.totalObtido).toFixed(1)} / ${Number(row.totalDistribuido).toFixed(1)}`,
    },
    {
      field: "media",
      headerName: "Media",
      width: 110,
      valueFormatter: (value) => `${Number(value).toFixed(1)}%`,
    },
    {
      field: "situacao",
      headerName: "Situacao",
      width: 140,
      renderCell: ({ value }) => (
        <Chip label={getSituacaoLabel(value as SituacaoNota)} color={getSituacaoColor(value as SituacaoNota) as any} size="small" />
      ),
    },
    {
      field: "acoes",
      headerName: "Acoes",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Button size="small" variant="outlined" onClick={() => abrirCadastro(row)}>
          <Plus size={14} />
          Nota
        </Button>
      ),
    },
  ];

  const notasColumns: GridColDef[] = [
    { field: "aluno", headerName: "Aluno", flex: 1.2, minWidth: 220 },
    { field: "disciplina", headerName: "Disciplina", flex: 1, minWidth: 220 },
    {
      field: "tipo_avaliacao",
      headerName: "Tipo",
      width: 120,
      renderCell: ({ value }) => <Chip label={formatarTipo(value as TipoAvaliacaoNota)} size="small" />,
    },
    {
      field: "descricao_avaliacao",
      headerName: "Descricao",
      flex: 1.5,
      minWidth: 260,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => (
        <span style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
          {String(value ?? "Sem descricao")}
        </span>
      ),
    },
    {
      field: "nota",
      headerName: "Nota",
      width: 110,
      valueGetter: (_, row) => `${Number(row.nota).toFixed(1)} / ${Number(row.valor).toFixed(1)}`,
    },
    {
      field: "data_lancamento",
      headerName: "Lancamento",
      width: 130,
      valueFormatter: (value) => formatarData(String(value)),
    },
    {
      field: "data_devolucao",
      headerName: "Devolucao",
      width: 130,
      valueFormatter: (value) => formatarData(String(value || "")),
    },
    {
      field: "acoes",
      headerName: "Acoes",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => abrirEdicao(row)}>
            <Pencil size={16} />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => abrirExclusao(row)}>
            <Trash2 size={16} />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <Container>
      <Stack gap={2} py={2}>
        <Card.Root elevation={0}>
          <Card.Header>
            <Card.Title>Lancamento de notas</Card.Title>
          </Card.Header>
          <Card.Content>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
              <span />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <TextField
                  placeholder="Pesquisar aluno, turma, disciplina ou situacao"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  sx={{ minWidth: { sm: 340 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={16} />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button variant="outlined" sx={{ width: 112 }} onClick={carregarNotas} disabled={loading}>
                  <RefreshCw size={16} />
                  Atualizar
                </Button>
                <Button type="button" variant="contained" sx={{ width: 128 }} onClick={abrirCadastro}>
                  <Plus size={16} />
                  Nova nota
                </Button>
              </Stack>
            </Stack>
          </Card.Content>
        </Card.Root>

        {(errorMessage || successMessage) && (
          <Alert
            severity={errorMessage ? "error" : "success"}
            onClose={() => {
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
          >
            {errorMessage || successMessage}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card.Root elevation={0}>
              <Card.Content>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack>
                    <Typography variant="body2" color="text.secondary">Boletins</Typography>
                    <Typography variant="h5" fontWeight="bold">{totais.boletins}</Typography>
                  </Stack>
                  <ClipboardList size={24} />
                </Stack>
              </Card.Content>
            </Card.Root>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card.Root elevation={0}>
              <Card.Content>
                <Typography variant="body2" color="text.secondary">Notas lancadas</Typography>
                <Typography variant="h5" fontWeight="bold">{totais.notas}</Typography>
              </Card.Content>
            </Card.Root>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card.Root elevation={0}>
              <Card.Content>
                <Typography variant="body2" color="text.secondary">Aprovados</Typography>
                <Typography variant="h5" fontWeight="bold">{totais.alunosAprovados}</Typography>
              </Card.Content>
            </Card.Root>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card.Root elevation={0}>
              <Card.Content>
                <Typography variant="body2" color="text.secondary">Media geral</Typography>
                <Typography variant="h5" fontWeight="bold">{totais.mediaGeral.toFixed(1)}%</Typography>
              </Card.Content>
            </Card.Root>
          </Grid>
        </Grid>

        <Card.Root elevation={0}>
          <Card.Header>
            <Card.Title>Boletins por disciplina</Card.Title>
          </Card.Header>
          <Card.Content sx={{ minHeight: 420 }}>
            <DataTable rows={boletimRows} columns={boletimColumns} loading={loading} />
          </Card.Content>
        </Card.Root>

        <Card.Root elevation={0}>
          <Card.Header>
            <Card.Title>Avaliacoes lancadas</Card.Title>
          </Card.Header>
          <Card.Content sx={{ minHeight: 420 }}>
            <DataTable rows={notasRows} columns={notasColumns} loading={loading} />
          </Card.Content>
        </Card.Root>
      </Stack>

      <Dialog.Root open={dialogOpen} onClose={fecharDialog} maxWidth="md">
        <Dialog.Header>
          <Dialog.Title>{editingId ? "Editar nota" : "Nova nota"}</Dialog.Title>
          <Dialog.ActionClose onClose={fecharDialog} />
        </Dialog.Header>
        <Dialog.Content>
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Turma-disciplina ID"
                  name="turma_disciplina_id"
                  value={form.turma_disciplina_id}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Matricula-disciplina ID"
                  name="matricula_turma_disciplina_id"
                  value={form.matricula_turma_disciplina_id}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Aluno ID"
                  name="aluno_id"
                  value={form.aluno_id}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Tipo"
                  name="tipo_avaliacao"
                  select
                  value={form.tipo_avaliacao}
                  onChange={(event) => handleChange(event as React.ChangeEvent<HTMLInputElement>)}
                  InputLabelProps={{ shrink: true }}
                >
                  {tipoOptions.map((option) => (
                    <MenuItem key={option} value={option}>{formatarTipo(option)}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Valor"
                  name="valor"
                  type="number"
                  value={form.valor}
                  onChange={handleChange}
                  inputProps={{ min: 0, step: 0.1 }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Nota"
                  name="nota"
                  type="number"
                  value={form.nota}
                  onChange={handleChange}
                  inputProps={{ min: 0, step: 0.1 }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Descricao"
                  name="descricao_avaliacao"
                  value={form.descricao_avaliacao}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Data de lancamento"
                  name="data_lancamento"
                  type="date"
                  value={form.data_lancamento}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Data de devolucao"
                  name="data_devolucao"
                  type="date"
                  value={form.data_devolucao}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Stack>
        </Dialog.Content>
        <Dialog.Footer>
          <Button variant="text" sx={{ width: 96 }} onClick={fecharDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" sx={{ width: 110 }} onClick={handleSubmit} isLoading={saving}>
            Salvar
          </Button>
        </Dialog.Footer>
      </Dialog.Root>

      <Dialog.Root open={dialogDeleteOpen} onClose={fecharExclusao} maxWidth="xs">
        <Dialog.Header>
          <Dialog.Title>Excluir nota</Dialog.Title>
          <Dialog.ActionClose onClose={fecharExclusao} />
        </Dialog.Header>
        <Dialog.Content>
          <Typography variant="body2">
            Confirma a exclusao da nota de {notaParaExcluir?.aluno_nome} em {notaParaExcluir?.disciplina_nome}?
          </Typography>
        </Dialog.Content>
        <Dialog.Footer>
          <Button variant="outlined" onClick={fecharExclusao} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={confirmarExclusao} isLoading={deleting}>
            Excluir
          </Button>
        </Dialog.Footer>
      </Dialog.Root>
    </Container>
  );
}
