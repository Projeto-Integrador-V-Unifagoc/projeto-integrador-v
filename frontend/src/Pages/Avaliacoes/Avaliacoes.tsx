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
  TextField as MuiTextField,
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
  type AvaliacaoPayload,
  REGRAS_AVALIACAO,
  type TipoAvaliacao,
} from "../../models/avaliacao-model";
import { avaliacaoApi } from "../../services/avaliacao-api";

const tipoOptions: TipoAvaliacao[] = ["PROVA", "TPI", "TRABALHO"];

interface AvaliacaoFormState {
  id_disciplina: number | "";
  tipo_avaliacao: TipoAvaliacao;
  descricao_avaliacao: string;
  texto_tarefa: string;
  valor_avaliacao: number | "";
  data_avaliacao: string;
  data_devolucao_avaliacao: string;
}

const initialForm: AvaliacaoFormState = {
  id_disciplina: 0,
  tipo_avaliacao: "PROVA",
  descricao_avaliacao: "",
  texto_tarefa: "",
  valor_avaliacao: REGRAS_AVALIACAO.valorProva,
  data_avaliacao: "",
  data_devolucao_avaliacao: "",
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
    const apiMessage = error.response?.data?.erro;
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
  const [editingId, setEditingId] = useState<number | null>(null);
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
    () => avaliacoes.filter((avaliacao) => avaliacao.tipo_avaliacao === "PROVA"),
    [avaliacoes],
  );
  const tpis = useMemo(
    () => avaliacoes.filter((avaliacao) => avaliacao.tipo_avaliacao === "TPI"),
    [avaliacoes],
  );
  const trabalhos = useMemo(
    () => avaliacoes.filter((avaliacao) => avaliacao.tipo_avaliacao === "TRABALHO"),
    [avaliacoes],
  );

  const pontosTrabalhos = useMemo(
    () => trabalhos.reduce((total, avaliacao) => total + Number(avaliacao.valor_avaliacao || 0), 0),
    [trabalhos],
  );

  const pontosDisponiveisTrabalhos = REGRAS_AVALIACAO.limiteTrabalhos - pontosTrabalhos;

  const avaliacaoFiltradas = useMemo(() => {
    const term = normalizarTexto(search);

    if (!term) {
      return avaliacoes;
    }

    return avaliacoes.filter((avaliacao) => {
      const camposPesquisaveis = [
        String(avaliacao.id_avaliacao),
        String(avaliacao.id_disciplina),
        avaliacao.tipo_avaliacao,
        formatarTipo(avaliacao.tipo_avaliacao),
        avaliacao.descricao_avaliacao ?? "",
        avaliacao.texto_tarefa ?? "",
        String(avaliacao.valor_avaliacao),
        `${Number(avaliacao.valor_avaliacao).toFixed(1)} pts`,
        formatarData(avaliacao.data_avaliacao),
        formatarData(avaliacao.data_devolucao_avaliacao ?? ""),
      ];

      return camposPesquisaveis.some((campo) => normalizarTexto(campo).includes(term));
    });
  }, [avaliacoes, search]);

  const rows = useMemo(
    () =>
      avaliacaoFiltradas.map((avaliacao) => ({
        ...avaliacao,
        id: avaliacao.id_avaliacao,
      })),
    [avaliacaoFiltradas],
  );

  const valorTotal = useMemo(
    () => avaliacoes.reduce((total, avaliacao) => total + Number(avaliacao.valor_avaliacao || 0), 0),
    [avaliacoes],
  );

  const avaliacaoEmEdicao = useMemo(
    () => avaliacoes.find((avaliacao) => avaliacao.id_avaliacao === editingId) ?? null,
    [avaliacoes, editingId],
  );

  const pontosTrabalhoRestantesNoFormulario = useMemo(() => {
    const valorAtual =
      avaliacaoEmEdicao?.tipo_avaliacao === "TRABALHO"
        ? Number(avaliacaoEmEdicao.valor_avaliacao || 0)
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
    setEditingId(avaliacao.id_avaliacao);
    setForm({
      id_disciplina: avaliacao.id_disciplina,
      tipo_avaliacao: avaliacao.tipo_avaliacao,
      descricao_avaliacao: avaliacao.descricao_avaliacao ?? "",
      texto_tarefa: avaliacao.texto_tarefa ?? "",
      valor_avaliacao: Number(avaliacao.valor_avaliacao),
      data_avaliacao: avaliacao.data_avaliacao.slice(0, 10),
      data_devolucao_avaliacao: avaliacao.data_devolucao_avaliacao?.slice(0, 10) ?? "",
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
        valor_avaliacao:
          tipo === "PROVA"
            ? REGRAS_AVALIACAO.valorProva
            : tipo === "TPI"
              ? REGRAS_AVALIACAO.valorTpi
              : current.tipo_avaliacao === "TRABALHO"
                ? current.valor_avaliacao
                : "",
      }));
      return;
    }

    if (name === "valor_avaliacao") {
      setForm((current) => ({
        ...current,
        valor_avaliacao: value === "" ? "" : Math.max(0, Number(value)),
      }));
      return;
    }

    if (name === "id_disciplina") {
      setForm((current) => ({
        ...current,
        id_disciplina: value === "" ? "" : Math.max(0, Number(value)),
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function validarFormulario(payload: AvaliacaoPayload) {
    if (!payload.id_disciplina || payload.id_disciplina <= 0) {
      throw new Error("Informe uma disciplina valida para a avaliacao.");
    }

    if (!payload.data_avaliacao) {
      throw new Error("Informe a data de aplicacao da avaliacao.");
    }

    const outrasAvaliacoes = avaliacoes.filter((avaliacao) => avaliacao.id_avaliacao !== editingId);
    const provasExistentes = outrasAvaliacoes.filter((avaliacao) => avaliacao.tipo_avaliacao === "PROVA");
    const tpisExistentes = outrasAvaliacoes.filter((avaliacao) => avaliacao.tipo_avaliacao === "TPI");
    const trabalhosExistentes = outrasAvaliacoes.filter((avaliacao) => avaliacao.tipo_avaliacao === "TRABALHO");

    if (payload.tipo_avaliacao === "PROVA") {
      if (provasExistentes.length >= REGRAS_AVALIACAO.maxProvas) {
        throw new Error("Ja existem 3 provas cadastradas de 20 pontos.");
      }

      payload.valor_avaliacao = REGRAS_AVALIACAO.valorProva;
    }

    if (payload.tipo_avaliacao === "TPI") {
      if (tpisExistentes.length >= 1) {
        throw new Error("Ja existe um TPI cadastrado de 5 pontos.");
      }

      payload.valor_avaliacao = REGRAS_AVALIACAO.valorTpi;
    }

    if (payload.tipo_avaliacao === "TRABALHO") {
      if (payload.valor_avaliacao <= 0) {
        throw new Error("Informe um valor maior que zero para o trabalho.");
      }

      const totalTrabalhos = trabalhosExistentes.reduce(
        (total: number, avaliacao: Avaliacao) => total + Number(avaliacao.valor_avaliacao || 0),
        0,
      );

      if (totalTrabalhos + payload.valor_avaliacao > REGRAS_AVALIACAO.limiteTrabalhos) {
        throw new Error("Os trabalhos podem somar no maximo 25 pontos.");
      }
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: AvaliacaoPayload = {
        id_disciplina: Number(form.id_disciplina),
        tipo_avaliacao: form.tipo_avaliacao,
        descricao_avaliacao: form.descricao_avaliacao?.trim() || undefined,
        texto_tarefa: form.texto_tarefa?.trim() || undefined,
        valor_avaliacao: Number(form.valor_avaliacao),
        data_avaliacao: form.data_avaliacao,
        data_devolucao_avaliacao: form.data_devolucao_avaliacao || undefined,
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

  async function handleDelete(id: number) {
    const confirmed = window.confirm("Deseja realmente excluir esta avaliacao?");

    if (!confirmed) {
      return;
    }

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
      field: "id_avaliacao",
      headerName: "Id",
      width: 80,
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
      field: "id_disciplina",
      headerName: "Disciplina",
      width: 110,
    },
    {
      field: "valor_avaliacao",
      headerName: "Valor",
      width: 110,
      valueFormatter: (value) => `${Number(value).toFixed(1)} pts`,
    },
    {
      field: "data_avaliacao",
      headerName: "Aplicacao",
      width: 120,
      valueFormatter: (value) => formatarData(String(value)),
    },
    {
      field: "data_devolucao_avaliacao",
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
          <IconButton size="small" color="error" onClick={() => handleDelete(row.id_avaliacao)}>
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
                  placeholder="Pesquisar por tipo, disciplina, valor ou data"
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
            <DataTable
              rows={rows}
              columns={columns}
            />
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
              <Grid size={4}>
                <TextField
                  label="Disciplina"
                  name="id_disciplina"
                  type="number"
                  value={form.id_disciplina}
                  onChange={handleChange}
                  inputProps={{ min: 0 }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={8}>
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
              <Grid size={12}>
                <MuiTextField
                  label="Texto da tarefa"
                  name="texto_tarefa"
                  value={form.texto_tarefa}
                  onChange={handleChange}
                  placeholder="Digite as instrucoes, enunciado ou orientacoes da tarefa"
                  multiline
                  minRows={4}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    
                    "& .MuiInputBase-root": {
                      height: "auto",
                      alignItems: "flex-start",
                    }
                  }}
                />
              </Grid>
              <Grid size={4}>
                <TextField
                  label="Valor"
                  name="valor_avaliacao"
                  type="number"
                  value={form.valor_avaliacao}
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
                  label="Data de aplicacao"
                  name="data_avaliacao"
                  type="date"
                  value={form.data_avaliacao}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={4}>
                <TextField
                  label="Data de devolucao"
                  name="data_devolucao_avaliacao"
                  type="date"
                  value={form.data_devolucao_avaliacao}
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