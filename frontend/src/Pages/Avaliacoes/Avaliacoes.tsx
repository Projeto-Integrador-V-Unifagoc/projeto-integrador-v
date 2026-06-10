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
import { api } from "../../lib/axios";

const tipoOptions: TipoAvaliacao[] = ["PROVA", "TPI", "TRABALHO"];

interface TurmaDisciplina {
  id: string;
  turma: {
    id: string;
    sigla: string;
    descricao: string;
  };
  disciplina: {
    id: string;
    codigo: string;
    nome: string;
  };
  professor: {
    id: string;
    pessoa: {
      nome: string;
    };
  };
}

interface AvaliacaoFormState {
  turma_disciplina_id: string;
  matricula_turma_disciplina_id: string | null;
  tipo_avaliacao: TipoAvaliacao;
  descricao_avaliacao: string;
  valor: number | "";
  data_lancamento: string;
  data_devolucao: string;
}

function criarFormularioInicial(): AvaliacaoFormState {
  return {
    turma_disciplina_id: "",
    matricula_turma_disciplina_id: null,
    tipo_avaliacao: "PROVA",
    descricao_avaliacao: "",
    valor: REGRAS_AVALIACAO.valorProva,
    data_lancamento: new Date().toISOString().slice(0, 10),
    data_devolucao: "",
  };
}

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

function formatarTurmaDisciplina(turma: TurmaDisciplina | undefined) {
  if (!turma) return "-";
  return `${turma.turma.sigla} - ${turma.disciplina.nome}`;
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
  const [turmaDisciplinas, setTurmaDisciplinas] = useState<TurmaDisciplina[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [loadingTurmas, setLoadingTurmas] = useState<boolean>(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDeleteOpen, setDialogDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [avaliacaoParaExcluir, setAvaliacaoParaExcluir] = useState<Avaliacao | null>(null);
  const [form, setForm] = useState<AvaliacaoFormState>(criarFormularioInicial());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function carregarAvaliacoes() {
    setErrorMessage(null);
    try {
      const data = await avaliacaoApi.listar();
      setAvaliacoes(data);
    } catch (error) {
      console.error(error);
      setErrorMessage(getMensagemErro(error, "Não foi possível carregar as avaliações."));
    }
  }

  async function carregarTurmaDisciplinas() {
    setErrorMessage(null);
    try {
      const response = await api.get<TurmaDisciplina[]>("/turma-disciplina");
      setTurmaDisciplinas(response.data);
    } catch (error) {
      console.error(error);
      setErrorMessage(getMensagemErro(error, "Não foi possível carregar as turmas-disciplinas."));
    } finally {
      setLoadingTurmas(false);
    }
  }

  useEffect(() => {
    carregarAvaliacoes();
    carregarTurmaDisciplinas();
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
      const turmaDisciplina = turmaDisciplinas.find((td) => td.id === av.turma_disciplina_id);
      const camposPesquisaveis = [
        av.id,
        formatarTurmaDisciplina(turmaDisciplina),
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
  }, [avaliacoes, search, turmaDisciplinas]);

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
    setForm(criarFormularioInicial());
    setErrorMessage(null);
    setSuccessMessage(null);
    setDialogOpen(true);
  }

  function abrirEdicao(avaliacao: Avaliacao) {
    setEditingId(avaliacao.id);
    setForm({
      turma_disciplina_id: avaliacao.turma_disciplina_id,
      matricula_turma_disciplina_id: avaliacao.matricula_turma_disciplina_id || null,
      tipo_avaliacao: avaliacao.tipo_avaliacao,
      descricao_avaliacao: avaliacao.descricao_avaliacao ?? "",
      valor: Number(avaliacao.valor),
      data_lancamento: (avaliacao.data_lancamento as string).slice(0, 10),
      data_devolucao: (avaliacao.data_devolucao as string)?.slice(0, 10) ?? "",
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setDialogOpen(true);
  }

  function fecharDialog() {
    if (saving) return;
    setDialogOpen(false);
  }

  function abrirDialogExclusao(avaliacao: Avaliacao) {
    setAvaliacaoParaExcluir(avaliacao);
    setDialogDeleteOpen(true);
  }

  function fecharDialogExclusao() {
    if (deleting) return;
    setDialogDeleteOpen(false);
    setAvaliacaoParaExcluir(null);
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
    if (!payload.turma_disciplina_id) {
      throw new Error("Informe a turma-disciplina para a avaliação.");
    }

    if (!payload.data_lancamento) {
      throw new Error("Informe a data de lançamento da avaliação.");
    }

    const outrasAvaliacoes = avaliacoes.filter(
      (av) => av.id !== editingId && av.turma_disciplina_id === payload.turma_disciplina_id,
    );
    const provasExistentes = outrasAvaliacoes.filter((av) => av.tipo_avaliacao === "PROVA");
    const tpisExistentes = outrasAvaliacoes.filter((av) => av.tipo_avaliacao === "TPI");
    const trabalhosExistentes = outrasAvaliacoes.filter((av) => av.tipo_avaliacao === "TRABALHO");

    if (payload.tipo_avaliacao === "PROVA") {
      if (provasExistentes.length >= REGRAS_AVALIACAO.maxProvas) {
        throw new Error("Já existem 3 provas cadastradas de 20 pontos.");
      }
    }

    if (payload.tipo_avaliacao === "TPI") {
      if (tpisExistentes.length >= 1) {
        throw new Error("Já existe um TPI cadastrado de 5 pontos.");
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
        throw new Error("Os trabalhos podem somar no máximo 25 pontos.");
      }
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: CriarAvaliacaoDTO = {
        turma_disciplina_id: form.turma_disciplina_id,
        matricula_turma_disciplina_id: form.matricula_turma_disciplina_id || undefined,
        tipo_avaliacao: form.tipo_avaliacao,
        descricao_avaliacao: form.descricao_avaliacao?.trim() || undefined,
        valor: Number(form.valor),
        data_lancamento: form.data_lancamento,
        data_devolucao: form.data_devolucao || null,
      };

      validarFormulario(payload);

      if (editingId !== null) {
        await avaliacaoApi.atualizar(editingId, payload);
        setSuccessMessage("Avaliação atualizada com sucesso.");
      } else {
        await avaliacaoApi.criar(payload);
        setSuccessMessage("Avaliação cadastrada com sucesso.");
      }

      await carregarAvaliacoes();
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      setErrorMessage(getMensagemErro(error, "Não foi possível salvar a avaliação."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmarExclusao() {
    if (!avaliacaoParaExcluir) return;
    setDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await avaliacaoApi.deletar(avaliacaoParaExcluir.id);
      setSuccessMessage("Avaliação removida com sucesso.");
      await carregarAvaliacoes();
      fecharDialogExclusao();
    } catch (error) {
      console.error(error);
      setErrorMessage(getMensagemErro(error, "Não foi possível remover a avaliação."));
    } finally {
      setDeleting(false);
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
      field: "turma_disciplina_id",
      headerName: "Turma - Disciplina",
      minWidth: 220,
      flex: 1,
      valueGetter: (_, row) => {
        const turmaDisciplina = turmaDisciplinas.find((td) => td.id === row.turma_disciplina_id);
        return formatarTurmaDisciplina(turmaDisciplina);
      },
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
          <IconButton size="small" color="error" onClick={() => abrirDialogExclusao(row)}>
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
            <Card.Title>Gestão de avaliações</Card.Title>
          </Card.Header>
          <Card.Content>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
              <Stack spacing={0.5}>
                <Typography variant="body1" fontWeight="bold">
                  Cadastre, acompanhe e atualize as avaliações acadêmicas.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Regras ativas por turma-disciplina: 3 provas de 20 pontos, 1 TPI de 5 pontos e até 25 pontos livres para trabalhos.
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <TextField
                  placeholder="Pesquisar por tipo, turma-disciplina, valor ou data"
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
            <Card.Title>Lista de avaliações</Card.Title>
          </Card.Header>
          <Card.Content sx={{ minHeight: 520 }}>
            <DataTable rows={rows} columns={columns} />
          </Card.Content>
        </Card.Root>
      </Stack>

      <Dialog.Root open={dialogOpen} onClose={fecharDialog} maxWidth="md">
        <Dialog.Header>
          <Dialog.Title>{editingId !== null ? "Editar avaliação" : "Nova avaliação"}</Dialog.Title>
          <Dialog.ActionClose onClose={fecharDialog} />
        </Dialog.Header>
        <Dialog.Content>
          <Stack spacing={2}>
            <Alert severity="info">
              Provas sempre valem 20 pontos, o TPI sempre vale 5 e os trabalhos podem somar no máximo 25 pontos.
            </Alert>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  label="Turma - Disciplina"
                  name="turma_disciplina_id"
                  select
                  value={form.turma_disciplina_id}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  disabled={loadingTurmas}
                  fullWidth
                >
                  {turmaDisciplinas.map((td) => (
                    <MenuItem key={td.id} value={td.id}>
                      {formatarTurmaDisciplina(td)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Tipo"
                  name="tipo_avaliacao"
                  select
                  value={form.tipo_avaliacao}
                  onChange={(event) => handleChange(event as React.ChangeEvent<HTMLInputElement>)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
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
                  label="Descrição"
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
                  disabled={form.tipo_avaliacao === "PROVA" || form.tipo_avaliacao === "TPI"}
                  inputProps={{ min: 0 }}
                  helperText={
                    form.tipo_avaliacao === "TRABALHO"
                      ? `Disponível para trabalhos: ${pontosTrabalhoRestantesNoFormulario.toFixed(1)} pts`
                      : form.tipo_avaliacao === "PROVA"
                        ? "Cada prova vale 20 pontos."
                        : "O TPI vale 5 pontos."
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid size={4}>
                <TextField
                  label="Data de lançamento"
                  name="data_lancamento"
                  type="date"
                  value={form.data_lancamento}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid size={4}>
                <TextField
                  label="Data de devolução"
                  name="data_devolucao"
                  type="date"
                  value={form.data_devolucao}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
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

      <Dialog.Root
        open={dialogDeleteOpen}
        onClose={fecharDialogExclusao}
        maxWidth="xs"
      >
        <Dialog.Header>
          <Dialog.Title>Confirmar Exclusão</Dialog.Title>
          <Dialog.ActionClose onClose={fecharDialogExclusao} />
        </Dialog.Header>
        <Dialog.Content>
          <p style={{ margin: 0 }}>
            Tem certeza que deseja excluir a avaliação{" "}
            <strong>{avaliacaoParaExcluir?.descricao_avaliacao || formatarTipo(avaliacaoParaExcluir?.tipo_avaliacao || "PROVA")}</strong>
            ?
            Esta ação não pode ser desfeita.
          </p>
        </Dialog.Content>
        <Dialog.Footer>
          <Button variant="outlined" onClick={fecharDialogExclusao} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmarExclusao}
            isLoading={deleting}
          >
            Excluir
          </Button>
        </Dialog.Footer>
      </Dialog.Root>
    </Container>
  );
}
