import { useEffect, useMemo, useState } from "react";
import { Alert, Grid, IconButton, MenuItem, Stack, Typography } from "@mui/material";
import { Pencil, Trash2 } from "lucide-react";
import { ValidationError } from "yup";
import DataTable from "../DataTable/DataTable";
import Button from "../Button";
import { Dialog } from "../Dialog";
import TextField from "../TextField";
import { Card } from "../Card";
import { useTurma } from "../../hooks/use-turma";
import { useCursoDisciplina } from "../../hooks/use-curso-disciplina";
import { useProfessor } from "../../hooks/use-professor";
import { turmaDisciplinaSchema } from "../../validators/turma-disciplina-schema";
import type { CursoDisciplinaResponse } from "../../models/curso-disciplina-model";
import type { ProfessorResponse } from "../../models/professor-model";
import type { TurmaDisciplinaResponse } from "../../models/turma-model";
import type { GridColDef } from "@mui/x-data-grid";

type Props = {
  turmaId: string
  cursoId: string
}

type FormType = {
  cursoDisciplinaId: string
  professorId: string
  status: string
}

const initialForm: FormType = {
  cursoDisciplinaId: "",
  professorId: "",
  status: "ativa",
};

export function TurmaDisciplinasSection({ turmaId, cursoId }: Props) {
  const [disciplinasTurma, setDisciplinasTurma] = useState<TurmaDisciplinaResponse[]>([]);
  const [disciplinasMatriz, setDisciplinasMatriz] = useState<CursoDisciplinaResponse[]>([]);
  const [professores, setProfessores] = useState<ProfessorResponse[]>([]);
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error"; mensagem: string } | null>(null);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [registroEdicao, setRegistroEdicao] = useState<TurmaDisciplinaResponse | null>(null);
  const [registroExclusao, setRegistroExclusao] = useState<TurmaDisciplinaResponse | null>(null);
  const [form, setForm] = useState<FormType>(initialForm);
  const [erros, setErros] = useState<Record<string, string>>({});
  const { carregando, listarDisciplinasDaTurma, criarDisciplinaDaTurma, atualizarDisciplinaDaTurma, removerDisciplinaDaTurma } = useTurma();
  const { listarMatrizCurricularPorCursoId } = useCursoDisciplina();
  const { listarProfessores } = useProfessor();

  async function carregarDados() {
    if (!cursoId) {
      return;
    }

    const [disciplinasTurmaResponse, matrizResponse, professoresResponse] = await Promise.all([
      listarDisciplinasDaTurma(turmaId),
      listarMatrizCurricularPorCursoId(cursoId),
      listarProfessores(),
    ]);

    setDisciplinasTurma(disciplinasTurmaResponse);
    setDisciplinasMatriz(matrizResponse);
    setProfessores(professoresResponse);
  }

  useEffect(() => {
    void (async () => {
      await carregarDados();
    })();
  }, [turmaId, cursoId]);

  const disciplinasDisponiveis = useMemo(() => {
    const idsEmUso = new Set(disciplinasTurma.map((item) => item.curso_disciplina.id));
    return disciplinasMatriz.filter((item) => !idsEmUso.has(item.id) || item.id === form.cursoDisciplinaId);
  }, [disciplinasMatriz, disciplinasTurma, form.cursoDisciplinaId]);

  function abrirDialogoCriacao() {
    setRegistroEdicao(null);
    setForm(initialForm);
    setErros({});
    setDialogoAberto(true);
  }

  function abrirDialogoEdicao(item: TurmaDisciplinaResponse) {
    setRegistroEdicao(item);
    setForm({
      cursoDisciplinaId: item.curso_disciplina.id,
      professorId: item.professor.id,
      status: item.status,
    });
    setErros({});
    setDialogoAberto(true);
  }

  async function salvar() {
    try {
      await turmaDisciplinaSchema.validate(form, { abortEarly: false });
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
        await atualizarDisciplinaDaTurma(turmaId, registroEdicao.id, form);
        setAlerta({ tipo: "success", mensagem: "Disciplina da turma atualizada com sucesso!" });
      } else {
        await criarDisciplinaDaTurma(turmaId, form);
        setAlerta({ tipo: "success", mensagem: "Disciplina adicionada a turma com sucesso!" });
      }

      setDialogoAberto(false);
      setForm(initialForm);
      void carregarDados();
    } catch {
      setAlerta({ tipo: "error", mensagem: "Nao foi possivel salvar a disciplina da turma." });
    }
  }

  async function confirmarExclusao() {
    if (!registroExclusao) {
      return;
    }

    try {
      await removerDisciplinaDaTurma(turmaId, registroExclusao.id);
      setAlerta({ tipo: "success", mensagem: "Disciplina removida da turma com sucesso!" });
      setRegistroExclusao(null);
      void carregarDados();
    } catch {
      setAlerta({ tipo: "error", mensagem: "Nao foi possivel remover a disciplina da turma." });
    }
  }

  const columns: GridColDef<TurmaDisciplinaResponse>[] = [
    { field: "codigo", headerName: "Codigo", width: 140, valueGetter: (_, row) => row.curso_disciplina.disciplina.codigo },
    { field: "nome", headerName: "Disciplina", flex: 1, valueGetter: (_, row) => row.curso_disciplina.disciplina.nome },
    { field: "professor", headerName: "Professor", flex: 1, valueGetter: (_, row) => row.professor.nome },
    { field: "cargaHoraria", headerName: "Carga Horaria", width: 150, valueGetter: (_, row) => row.curso_disciplina.carga_horaria },
    { field: "status", headerName: "Status", width: 120 },
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
    <Stack gap={2}>
      {alerta && <Alert severity={alerta.tipo}>{alerta.mensagem}</Alert>}

      <Card.Root>
        <Card.Header>
          <Card.Title>Oferta de Disciplinas</Card.Title>
        </Card.Header>
        <Card.Content>
          <Stack gap={2}>
            <Stack direction="row" justifyContent="flex-end">
              <Button variant="contained" onClick={abrirDialogoCriacao}>
                Adicionar Disciplina
              </Button>
            </Stack>
            <DataTable columns={columns} rows={disciplinasTurma} loading={carregando} />
          </Stack>
        </Card.Content>
      </Card.Root>

      <Dialog.Root open={dialogoAberto} onClose={() => setDialogoAberto(false)} maxWidth="sm">
        <Dialog.Header>
          <Dialog.Title>{registroEdicao ? "Editar Disciplina da Turma" : "Adicionar Disciplina da Turma"}</Dialog.Title>
          <Dialog.ActionClose onClose={() => setDialogoAberto(false)} />
        </Dialog.Header>
        <Dialog.Content>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                required
                label="Disciplina da Matriz"
                select
                disabled={!!registroEdicao}
                value={form.cursoDisciplinaId}
                error={!!erros.cursoDisciplinaId}
                helperText={erros.cursoDisciplinaId}
                onChange={(e) => setForm((prev) => ({ ...prev, cursoDisciplinaId: e.target.value }))}
              >
                {disciplinasDisponiveis.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.disciplina.codigo} - {item.disciplina.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField
                required
                label="Professor"
                select
                value={form.professorId}
                error={!!erros.professorId}
                helperText={erros.professorId}
                onChange={(e) => setForm((prev) => ({ ...prev, professorId: e.target.value }))}
              >
                {professores.map((professor) => (
                  <MenuItem key={professor.id} value={professor.id}>
                    {professor.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField
                required
                label="Status"
                select
                value={form.status}
                error={!!erros.status}
                helperText={erros.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="ativa">Ativa</MenuItem>
                <MenuItem value="planejada">Planejada</MenuItem>
                <MenuItem value="encerrada">Encerrada</MenuItem>
              </TextField>
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
          <Dialog.Title>Remover disciplina</Dialog.Title>
          <Dialog.ActionClose onClose={() => setRegistroExclusao(null)} />
        </Dialog.Header>
        <Dialog.Content>
          <Typography>
            Deseja remover a disciplina {registroExclusao?.curso_disciplina.disciplina.nome} da turma?
          </Typography>
        </Dialog.Content>
        <Dialog.Footer>
          <Button variant="outlined" onClick={() => setRegistroExclusao(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmarExclusao}>Remover</Button>
        </Dialog.Footer>
      </Dialog.Root>
    </Stack>
  );
}
