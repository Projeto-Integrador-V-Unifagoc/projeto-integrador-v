import { useEffect, useState } from "react";
import { Alert, Checkbox, FormControlLabel, Grid, IconButton, MenuItem, Stack, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { Pencil, Trash2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { ValidationError } from "yup";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import { Card } from "../../components/Card";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import { Dialog } from "../../components/Dialog";
import { useCurso } from "../../hooks/use-curso";
import { useDisciplina } from "../../hooks/use-disciplina";
import { useCursoDisciplina } from "../../hooks/use-curso-disciplina";
import { cursoDisciplinaSchema } from "../../validators/curso-disciplina-schema";
import type { CursoResponse } from "../../models/curso-model";
import type { DisciplinaResponse } from "../../models/disciplina-model";
import type { CursoDisciplinaResponse } from "../../models/curso-disciplina-model";

type FormType = {
  disciplinaId: string
  periodoIdeal: string
  obrigatoria: boolean
  cargaHoraria: string
}

const initialForm: FormType = {
  disciplinaId: "",
  periodoIdeal: "",
  obrigatoria: true,
  cargaHoraria: "",
};

export default function MatrizCurricularCurso() {
  const { id } = useParams();
  const cursoId = id ?? "";
  const [curso, setCurso] = useState<CursoResponse | null>(null);
  const [disciplinas, setDisciplinas] = useState<DisciplinaResponse[]>([]);
  const [matriz, setMatriz] = useState<CursoDisciplinaResponse[]>([]);
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error"; mensagem: string } | null>(null);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [registroEdicao, setRegistroEdicao] = useState<CursoDisciplinaResponse | null>(null);
  const [registroExclusao, setRegistroExclusao] = useState<CursoDisciplinaResponse | null>(null);
  const [form, setForm] = useState<FormType>(initialForm);
  const [erros, setErros] = useState<Record<string, string>>({});
  const { buscarCursoPorId } = useCurso();
  const { listarDisciplinas } = useDisciplina();
  const { carregando, listarMatrizCurricularPorCursoId, criarCursoDisciplina, atualizarCursoDisciplina, removerCursoDisciplina } = useCursoDisciplina();

  async function carregarDados() {
    if (!cursoId) {
      return;
    }

    const [cursoResponse, disciplinasResponse, matrizResponse] = await Promise.all([
      buscarCursoPorId(cursoId),
      listarDisciplinas(),
      listarMatrizCurricularPorCursoId(cursoId),
    ]);

    setCurso(cursoResponse);
    setDisciplinas(disciplinasResponse);
    setMatriz(matrizResponse);
  }

  useEffect(() => {
    void (async () => {
      await carregarDados();
    })();
  }, [cursoId]);

  function abrirDialogoCriacao() {
    setRegistroEdicao(null);
    setForm(initialForm);
    setErros({});
    setDialogoAberto(true);
  }

  function abrirDialogoEdicao(item: CursoDisciplinaResponse) {
    setRegistroEdicao(item);
    setForm({
      disciplinaId: item.disciplina.id,
      periodoIdeal: String(item.periodo_ideal ?? ""),
      obrigatoria: item.obrigatoria,
      cargaHoraria: String(item.carga_horaria),
    });
    setErros({});
    setDialogoAberto(true);
  }

  async function salvar() {
    const payload = {
      ...form,
      periodoIdeal: Number(form.periodoIdeal),
      cargaHoraria: Number(form.cargaHoraria),
    };

    try {
      await cursoDisciplinaSchema.validate(payload, { abortEarly: false });
      setErros({});
    } catch (error: unknown) {
      const errosFormatados: Record<string, string> = {};
      if (!(error instanceof ValidationError)) {
        return;
      }
      error.inner.forEach((err) => {
        if (err.path) {
          errosFormatados[err.path] = err.message;
        }
      });
      setErros(errosFormatados);
      return;
    }

    try {
      if (registroEdicao) {
        await atualizarCursoDisciplina(registroEdicao.id, payload);
        setAlerta({ tipo: "success", mensagem: "Associacao atualizada com sucesso!" });
      } else {
        await criarCursoDisciplina({
          cursoId,
          disciplinaId: form.disciplinaId,
          periodoIdeal: Number(form.periodoIdeal),
          obrigatoria: form.obrigatoria,
          cargaHoraria: Number(form.cargaHoraria),
        });
        setAlerta({ tipo: "success", mensagem: "Disciplina adicionada a matriz com sucesso!" });
      }

      setDialogoAberto(false);
      setForm(initialForm);
      void carregarDados();
    } catch {
      setAlerta({ tipo: "error", mensagem: "Nao foi possivel salvar a matriz curricular." });
    }
  }

  async function confirmarExclusao() {
    if (!registroExclusao) {
      return;
    }

    try {
      await removerCursoDisciplina(registroExclusao.id);
      setAlerta({ tipo: "success", mensagem: "Disciplina removida da matriz com sucesso!" });
      setRegistroExclusao(null);
      void carregarDados();
    } catch {
      setAlerta({ tipo: "error", mensagem: "Nao foi possivel remover a disciplina da matriz." });
    }
  }

  const disciplinasDisponiveis = disciplinas.filter((disciplina) => {
    if (registroEdicao?.disciplina.id === disciplina.id) {
      return true;
    }

    return !matriz.some((item) => item.disciplina.id === disciplina.id);
  });

  const columns: GridColDef<CursoDisciplinaResponse>[] = [
    { field: "codigo", headerName: "Codigo", width: 140, valueGetter: (_, row) => row.disciplina.codigo },
    { field: "nome", headerName: "Disciplina", flex: 1, valueGetter: (_, row) => row.disciplina.nome },
    { field: "periodo", headerName: "Periodo Ideal", width: 140, valueGetter: (_, row) => row.periodo_ideal ?? "-" },
    { field: "carga", headerName: "Carga Horaria", width: 140, valueGetter: (_, row) => row.carga_horaria },
    { field: "obrigatoria", headerName: "Obrigatoria", width: 130, valueGetter: (_, row) => (row.obrigatoria ? "Sim" : "Nao") },
    { field: "status", headerName: "Status", width: 120, valueGetter: (_, row) => (row.ativo ? "Ativa" : "Inativa") },
    {
      field: "acoes",
      headerName: "Acoes",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton onClick={() => abrirDialogoEdicao(params.row)} color="primary">
            <Pencil size={18} />
          </IconButton>
          <IconButton onClick={() => setRegistroExclusao(params.row)} color="error">
            <Trash2 size={18} />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <Container>
      <Stack gap={2}>
        <Typography variant="h5">
          Matriz Curricular {curso ? `- ${curso.nome}` : ""}
        </Typography>

        {alerta && <Alert severity={alerta.tipo}>{alerta.mensagem}</Alert>}

        <Card.Root>
          <Card.Header>
            <Card.Title>Disciplinas do Curso</Card.Title>
          </Card.Header>
          <Card.Content>
            <Stack gap={2}>
              <Stack direction="row" justifyContent="flex-end">
                <Button
                  variant="contained"
                  onClick={abrirDialogoCriacao}
                  sx={{ width: "auto", minWidth: 170, whiteSpace: "nowrap" }}
                >
                  Adicionar Disciplina
                </Button>
              </Stack>
              <DataTable columns={columns} rows={matriz} loading={carregando} />
            </Stack>
          </Card.Content>
        </Card.Root>
      </Stack>

      <Dialog.Root open={dialogoAberto} onClose={() => setDialogoAberto(false)} maxWidth="sm">
        <Dialog.Header>
          <Dialog.Title>{registroEdicao ? "Editar Associacao" : "Adicionar Disciplina a Matriz"}</Dialog.Title>
          <Dialog.ActionClose onClose={() => setDialogoAberto(false)} />
        </Dialog.Header>
        <Dialog.Content>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                required
                label="Disciplina"
                select
                disabled={!!registroEdicao}
                value={form.disciplinaId}
                error={!!erros.disciplinaId}
                helperText={erros.disciplinaId}
                onChange={(e) => {
                  const disciplinaSelecionada = disciplinas.find((item) => item.id === e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    disciplinaId: e.target.value,
                    cargaHoraria: disciplinaSelecionada ? String(disciplinaSelecionada.carga_horaria) : prev.cargaHoraria,
                  }));
                }}
              >
                {disciplinasDisponiveis.map((disciplina) => (
                  <MenuItem key={disciplina.id} value={disciplina.id}>
                    {disciplina.codigo} - {disciplina.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={6}>
              <TextField
                required
                label="Periodo Ideal"
                value={form.periodoIdeal}
                error={!!erros.periodoIdeal}
                helperText={erros.periodoIdeal}
                onChange={(e) => setForm((prev) => ({ ...prev, periodoIdeal: e.target.value }))}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                required
                label="Carga Horaria"
                value={form.cargaHoraria}
                error={!!erros.cargaHoraria}
                helperText={erros.cargaHoraria}
                onChange={(e) => setForm((prev) => ({ ...prev, cargaHoraria: e.target.value }))}
              />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.obrigatoria}
                    onChange={(e) => setForm((prev) => ({ ...prev, obrigatoria: e.target.checked }))}
                  />
                }
                label="Disciplina obrigatoria"
              />
            </Grid>
          </Grid>
        </Dialog.Content>
        <Dialog.Footer>
          <Button variant="outlined" onClick={() => setDialogoAberto(false)}>Cancelar</Button>
          <Button variant="contained" onClick={salvar} isLoading={carregando}>Salvar</Button>
        </Dialog.Footer>
      </Dialog.Root>

      <Dialog.Root open={!!registroExclusao} onClose={() => setRegistroExclusao(null)} maxWidth="xs">
        <Dialog.Header>
          <Dialog.Title>Excluir associacao</Dialog.Title>
          <Dialog.ActionClose onClose={() => setRegistroExclusao(null)} />
        </Dialog.Header>
        <Dialog.Content>
          <Typography>
            Deseja remover a disciplina {registroExclusao?.disciplina.nome} da matriz curricular?
          </Typography>
        </Dialog.Content>
        <Dialog.Footer>
          <Button variant="outlined" onClick={() => setRegistroExclusao(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmarExclusao}>Excluir</Button>
        </Dialog.Footer>
      </Dialog.Root>
    </Container>
  );
}
