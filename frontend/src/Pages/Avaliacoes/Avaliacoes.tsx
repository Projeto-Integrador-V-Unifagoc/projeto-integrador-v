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
import { CalendarDays, ClipboardCheck, Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import axios from "axios";

import Button from "../../components/Button";
import { Card } from "../../components/Card";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import { Dialog } from "../../components/Dialog";
import TextField from "../../components/TextField";
import {
  type Avaliacao,
  type CriarAvaliacaoDTO,
  REGRAS_AVALIACAO,
  type TipoAvaliacao,
} from "../../models/avaliacao-model";
import { avaliacaoApi } from "../../services/avaliacao-api";

const tipoOptions: TipoAvaliacao[] = ["PROVA", "TPI", "TRABALHO"];

interface AvaliacaoFormState {
  turma_id: string;
  tipo_avaliacao: TipoAvaliacao;
  descricao_avaliacao: string;
  valor: number | "";
  data_lancamento: string;
  data_devolucao: string;
}

const initialForm: AvaliacaoFormState = {
  turma_id: "",
  tipo_avaliacao: "PROVA",
  descricao_avaliacao: "",
  valor: REGRAS_AVALIACAO.valorProva,
  data_lancamento: "",
  data_devolucao: "",
};

function formatarData(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatarTipo(tipo: TipoAvaliacao) {
  if (tipo === "TPI") return tipo;
  return tipo.charAt(0) + tipo.slice(1).toLowerCase();
}

function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getMensagemErro(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data?.mensagem;
    if (typeof apiMessage === "string" && apiMessage.trim()) {
      return apiMessage;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export default function Avaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AvaliacaoFormState>(initialForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function carregarAvaliacoes() {
    setErrorMessage(null);
    try {
      const data = await avaliacaoApi.listar();
      setAvaliacoes(data);
    } catch (error) {
      console.error(error);
      setErrorMessage(getMensagemErro(error, "Nao foi possivel carregar as avaliacoes."));
    }
  }

  useEffect(() => {
    carregarAvaliacoes();
  }, []);

  const provas = useMemo(
    () => avaliacoes.filter((av) => av.tipo_avaliacao === "PROVA"),
    [avaliacoes],
  );
  const tpis = useMemo(
    () => avaliacoes.filter((av) => av.tipo_avaliacao === "TPI"),
    [avaliacoes],
  );
  const trabalhos = useMemo(
    () => avaliacoes.filter((av) => av.tipo_avaliacao === "TRABALHO"),
    [avaliacoes],
  );

  const pontosTrabalhos = useMemo(
    () => trabalhos.reduce((total, av) => total + Number(av.valor || 0), 0),
    [trabalhos],
  );

  const pontosDisponiveisTrabalhos = REGRAS_AVALIACAO.limiteTrabalhos - pontosTrabalhos;

  const avaliacoesFiltradas = useMemo(() => {
    const term = normalizarTexto(search);
    if (!term) return avaliacoes;

    return avaliacoes.filter((av) => {
      const camposPesquisaveis = [
        av.id,
        av.turma_id,
        av.tipo_avaliacao,
        formatarTipo(av.tipo_avaliacao),
        av.descricao_avaliacao ?? "",
        String(av.valor),
        `${Number(av.valor).toFixed(1)} pts`,
        formatarData(av.data_lancamento),
        formatarData(av.data_devolucao ?? ""),
      ];
      return camposPesquisaveis.some((campo) => normalizarTexto(campo).includes(term));
    });
  }, [avaliacoes, search]);

  const rows = useMemo(
    () => avaliacoesFiltradas.map((av) => ({ ...av })),
    [avaliacoesFiltradas],
  );

  const valorTotal = useMemo(
    () => avaliacoes.reduce((total, av) => total + Number(av.valor || 0), 0),
    [avaliacoes],
  );

  const avaliacaoEmEdicao = useMemo(
    () => avaliacoes.find((av) => av.id === editingId) ?? null,
    [avaliacoes, editingId],
  );

  const pontosTrabalhoRestantesNoFormulario = useMemo(() => {
    const valorAtual =
      avaliacaoEmEdicao?.tipo_avaliacao === "TRABALHO"
        ? Number(avaliacaoEmEdicao.valor || 0)
        : 0;
    return REGRAS_AVALIACAO.limiteTrabalhos - (pontosTrabalhos - valorAtual);
  }, [avaliacaoEmEdicao, pontosTrabalhos]);

  function abrirCadastro() {
    setEditingId(null);
    setForm(initialForm);
    setErrorMessage(null);
    setSuccessMessage(null);
    setDialogOpen(true);
  }

  function abrirEdicao(avaliacao: Avaliacao) {
    setEditingId(avaliacao.id);
    setForm({
      turma_id: avaliacao.turma_id,
      tipo_avaliacao: avaliacao.tipo_avaliacao,
      descricao_avaliacao: avaliacao.descricao_avaliacao ?? "",
      valor: Number(avaliacao.valor),
      data_lancamento: avaliacao.data_lancamento.slice(0, 10),
      data_devolucao: avaliacao.data_devolucao?.slice(0, 10) ?? "",
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setDialogOpen(true);
  }

  function fecharDialog() {
    if (saving) return;
    setDialogOpen(false);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;

    if (name === "tipo_avaliacao") {
      const tipo = value as TipoAvaliacao;
      setForm((current) => ({
        ...current,
        tipo_avaliacao: tipo,
        valor:
          tipo === "PROVA"
            ? REGRAS_AVALIACAO.valorProva
            : tipo === "TPI"
              ? REGRAS_AVALIACAO.valorTpi
              : current.tipo_avaliacao === "TRABALHO"
                ? current.valor
                : "",
      }));
      return;
    }

    if (name === "valor") {
      setForm((current) => ({
        ...current,
        valor: value === "" ? "" : Math.max(0, Number(value)),
      }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  }

  function validarFormulario(payload: CriarAvaliacaoDTO) {
    if (!payload.turma_id) {
      throw new Error("Informe a turma para a avaliacao.");
    }

    if (!payload.data_lancamento) {
      throw new Error("Informe a data de lancamento da avaliacao.");
    }

    const outrasAvaliacoes = avaliacoes.filter((av) => av.id !== editingId);
    const provasExistentes = outrasAvaliacoes.filter((av) => av.tipo_avaliacao === "PROVA");
    const tpisExistentes = outrasAvaliacoes.filter((av) => av.tipo_avaliacao === "TPI");
    const trabalhosExistentes = outrasAvaliacoes.filter((av) => av.tipo_avaliacao === "TRABALHO");

    if (payload.tipo_avaliacao === "PROVA") {
      if (provasExistentes.length >= REGRAS_AVALIACAO.maxProvas) {
        throw new Error("Ja existem 3 provas cadastradas de 20 pontos.");
      }
    }

    if (payload.tipo_avaliacao === "TPI") {
      if (tpisExistentes.length >= 1) {
        throw new Error("Ja existe um TPI cadastrado de 5 pontos.");
      }
    }

    if (payload.tipo_avaliacao === "TRABALHO") {
      if (!payload.valor || payload.valor <= 0) {
        throw new Error("Informe um valor maior que zero para o trabalho.");
      }
      const totalTrabalhos = trabalhosExistentes.reduce(
        (total, av) => total + Number(av.valor || 0),
        0,
      );
      if (totalTrabalhos + payload.valor > REGRAS_AVALIACAO.limiteTrabalhos) {
        throw new Error("Os trabalhos podem somar no maximo 25 pontos.");
      }
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: CriarAvaliacaoDTO = {
        turma_id: form.turma_id,
        tipo_avaliacao: form.tipo_avaliacao,
        descricao_avaliacao: form.descricao_avaliacao?.trim() || undefined,
        valor: Number(form.valor),
        data_lancamento: form.data_lancamento,
        data_devolucao: form.data_devolucao || null,
      };

      validarFormulario(payload);

      if (editingId !== null) {
        await avaliacaoApi.atualizar(editingId, payload);
        setSuccessMessage("Avaliacao atualizada com sucesso.");
      } else {
        await avaliacaoApi.criar(payload);
        setSuccessMessage("Avaliacao cadastrada com sucesso.");
      }

      await carregarAvaliacoes();
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      setDialogOpen(false);
      setErrorMessage(getMensagemErro(error, "Nao foi possivel salvar a avaliacao."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Deseja realmente excluir esta avaliacao?");
    if (!confirmed) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await avaliacaoApi.deletar(id);
      setSuccessMessage("Avaliacao removida com sucesso.");
      await carregarAvaliacoes();
    } catch (error) {
      console.error(error);
      setErrorMessage(getMensagemErro(error, "Nao foi possivel remover a avaliacao."));
    }
  }

  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "Id",
      width: 120,
    },
    {
      field: "tipo_avaliacao",
      headerName: "Tipo",
      width: 130,
      renderCell: ({ value }) => (
        <Chip
          label={formatarTipo(value as TipoAvaliacao)}
          size="small"
          sx={(theme) => ({
            fontWeight: "bold",
            backgroundColor: theme.palette.primary.light,
            color: theme.palette.primary.contrastText,
          })}
        />
      ),
    },
    {
      field: "descricao_avaliacao",
      headerName: "Descricao",
      flex: 1.2,
      minWidth: 220,
      valueGetter: (_, row) => row.descricao_avaliacao || "Sem descricao",
    },
    {
      field: "turma_id",
      headerName: "Turma",
      width: 140,
    },
    {
      field: "valor",
      headerName: "Valor",
      width: 110,
      valueFormatter: (value) => `${Number(value).toFixed(1)} pts`,
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
      width: 120,
      valueFormatter: (value) => formatarData(String(value ?? "")),
    },
    {
      field: "acoes",
      headerName: "Acoes",
      sortable: false,
      filterable: false,
      width: 120,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => abrirEdicao(row)}>
            <Pencil size={16} />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
            <Trash2 size={16} />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const valorTravado = form.tipo_avaliacao === "PROVA" || form.tipo_avaliacao === "TPI";

  return (
    <Container>
      <Stack gap={2} py={2}>
        <Card.Root elevation={0}>
          <Card.Header>
            <Card.Title>Gestao de avaliacoes</Card.Title>
          </Card.Header>
          <Card.Content>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
              <Stack spacing={0.5}>
                <Typography variant="body1" fontWeight="bold">
                  Cadastre, acompanhe e atualize as avaliacoes academicas.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Regras ativas: 3 provas de 20 pontos, 1 TPI de 5 pontos e ate 25 pontos livres para trabalhos.
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <TextField
                  placeholder="Pesquisar por tipo, turma, valor ou data"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  sx={{ minWidth: { sm: 320 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={16} />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button variant="contained" sx={{ width: 110 }} onClick={abrirCadastro}>
                  <Plus size={16} />
                  Adicionar
                </Button>
              </Stack>
            </Stack>
          </Card.Content>
        </Card.Root>

        {(errorMessage || successMessage) && (
          <Alert severity={errorMessage ? "error" : "success"} onClose={() => {
            setErrorMessage(null);
            setSuccessMessage(null);
          }}>
            {errorMessage || successMessage}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card.Root elevation={0}>
              <Card.Content>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack>
                    <Typography variant="body2" color="text.secondary">Provas cadastradas</Typography>
                    <Typography variant="h5" fontWeight="bold">{provas.length}/{REGRAS_AVALIACAO.maxProvas}</Typography>
                  </Stack>
                  <ClipboardCheck size={24} />
                </Stack>
              </Card.Content>
            </Card.Root>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card.Root elevation={0}>
              <Card.Content>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack>
                    <Typography variant="body2" color="text.secondary">TPI obrigatorio</Typography>
                    <Typography variant="h5" fontWeight="bold">{tpis.length ? "5/5 pts" : "0/5 pts"}</Typography>
                  </Stack>
                  <ShieldCheck size={24} />
                </Stack>
              </Card.Content>
            </Card.Root>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card.Root elevation={0}>
              <Card.Content>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack>
                    <Typography variant="body2" color="text.secondary">Pontos livres em trabalhos</Typography>
                    <Typography variant="h5" fontWeight="bold">{pontosDisponiveisTrabalhos.toFixed(1)} pts</Typography>
                  </Stack>
                  <CalendarDays size={24} />
                </Stack>
              </Card.Content>
            </Card.Root>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card.Root elevation={0}>
              <Card.Content>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack>
                    <Typography variant="body2" color="text.secondary">Total configurado</Typography>
                    <Typography variant="h5" fontWeight="bold">{valorTotal.toFixed(1)} pts</Typography>
                  </Stack>
                </Stack>
              </Card.Content>
            </Card.Root>
          </Grid>
        </Grid>

        <Card.Root elevation={0} sx={{ flex: 1, minHeight: 0 }}>
          <Card.Header>
            <Card.Title>Lista de avaliacoes</Card.Title>
          </Card.Header>
          <Card.Content sx={{ minHeight: 520 }}>
            <DataTable rows={rows} columns={columns} />
          </Card.Content>
        </Card.Root>
      </Stack>

      <Dialog.Root open={dialogOpen} onClose={fecharDialog} maxWidth="md">
        <Dialog.Header>
          <Dialog.Title>{editingId !== null ? "Editar avaliacao" : "Nova avaliacao"}</Dialog.Title>
          <Dialog.ActionClose onClose={fecharDialog} />
        </Dialog.Header>
        <Dialog.Content>
          <Stack spacing={2}>
            <Alert severity="info">
              Provas sempre valem 20 pontos, o TPI sempre vale 5 e os trabalhos podem somar no maximo 25 pontos.
            </Alert>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  label="Turma (UUID)"
                  name="turma_id"
                  value={form.turma_id}
                  onChange={handleChange}
                  placeholder="Ex.: 550e8400-e29b-41d4-a716-446655440000"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Tipo"
                  name="tipo_avaliacao"
                  select
                  value={form.tipo_avaliacao}
                  onChange={(event) => handleChange(event as React.ChangeEvent<HTMLInputElement>)}
                  InputLabelProps={{ shrink: true }}
                >
                  {tipoOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {formatarTipo(option)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Descricao"
                  name="descricao_avaliacao"
                  value={form.descricao_avaliacao}
                  onChange={handleChange}
                  placeholder="Ex.: Prova bimestral, trabalho final, TPI"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={4}>
                <TextField
                  label="Valor"
                  name="valor"
                  type="number"
                  value={form.valor}
                  onChange={handleChange}
                  disabled={valorTravado}
                  inputProps={{ min: 0 }}
                  helperText={
                    form.tipo_avaliacao === "TRABALHO"
                      ? `Disponivel para trabalhos: ${pontosTrabalhoRestantesNoFormulario.toFixed(1)} pts`
                      : form.tipo_avaliacao === "PROVA"
                        ? "Cada prova vale 20 pontos."
                        : "O TPI vale 5 pontos."
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={4}>
                <TextField
                  label="Data de lancamento"
                  name="data_lancamento"
                  type="date"
                  value={form.data_lancamento}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={4}>
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
          <Button variant="text" sx={{ width: 90 }} onClick={fecharDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" sx={{ width: 110 }} onClick={handleSubmit} isLoading={saving}>
            Salvar
          </Button>
        </Dialog.Footer>
      </Dialog.Root>
    </Container>
  );
}