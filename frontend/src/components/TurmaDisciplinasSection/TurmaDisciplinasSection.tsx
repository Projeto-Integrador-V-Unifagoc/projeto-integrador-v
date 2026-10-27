import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Alert, Grid, IconButton, MenuItem, Stack, Typography } from "@mui/material";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { AtrelarProfessorDialog } from "./AtrelarProfessorDialog";
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
import type { ProfessorOpcao } from "../../models/professor-model";
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
  const [professores, setProfessores] = useState<ProfessorOpcao[]>([]);
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error"; mensagem: string } | null>(null);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [registroEdicao, setRegistroEdicao] = useState<TurmaDisciplinaResponse | null>(null);
  const [registroExclusao, setRegistroExclusao] = useState<TurmaDisciplinaResponse | null>(null);
  const [form, setForm] = useState<FormType>(initialForm);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [atrelarAberto, setAtrelarAberto] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<"todas" | "ativa" | "planejada" | "encerrada">("todas");
  const { carregando, listarDisciplinasDaTurma, criarDisciplinaDaTurma, atualizarDisciplinaDaTurma, removerDisciplinaDaTurma } = useTurma();
  const { listarMatrizCurricularPorCursoId } = useCursoDisciplina();
  const { listarOpcoes } = useProfessor();

  async function carregarDados() {
    if (!cursoId) {
      return;
    }

    const [disciplinasTurmaResponse, matrizResponse, professoresResponse] = await Promise.all([
      listarDisciplinasDaTurma(turmaId),
      listarMatrizCurricularPorCursoId(cursoId),
      listarOpcoes(),
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

  const disciplinaSelecionada = useMemo(
    () => disciplinasMatriz.find((item) => item.id === form.cursoDisciplinaId)?.disciplina
      ?? registroEdicao?.curso_disciplina.disciplina
      ?? null,
    [disciplinasMatriz, form.cursoDisciplinaId, registroEdicao],
  );
  const disciplinaSelecionadaId = disciplinaSelecionada?.id;

  // So aparecem os professores que lecionam a disciplina escolhida. Na edicao o professor atual
  // continua na lista (marcado) para nao sumir do campo: so ocorre em oferta encerrada ou anterior
  // a regra, ja que o cadastro do professor bloqueia remover disciplina de oferta em andamento.
  const professoresDisponiveis = useMemo(() => {
    if (!disciplinaSelecionadaId) {
      return [];
    }

    const lecionam = professores
      .filter((professor) => professor.disciplinas.some((disciplina) => disciplina.id === disciplinaSelecionadaId))
      .map((professor) => ({ ...professor, semVinculo: false }));

    const atual = registroEdicao?.professor;
    if (atual && !lecionam.some((professor) => professor.id === atual.id)) {
      lecionam.push({ id: atual.id, nome: atual.nome, disciplinas: [], semVinculo: true });
    }

    return lecionam;
  }, [professores, disciplinaSelecionadaId, registroEdicao]);

  const disciplinasTurmaOrdenadas = [...disciplinasTurma]
    .filter((item) => filtroStatus === "todas" || item.status === filtroStatus)
    .sort((a, b) => {
      const comparacaoDisciplina = a.curso_disciplina.disciplina.nome.localeCompare(b.curso_disciplina.disciplina.nome);

      if (comparacaoDisciplina !== 0) {
        return comparacaoDisciplina;
      }

      return a.professor.nome.localeCompare(b.professor.nome);
    });

  // O cadastro do professor pode ter mudado com a turma aberta; recarrega antes de cada atribuicao.
  function recarregarProfessores() {
    void listarOpcoes().then(setProfessores).catch(() => undefined);
  }

  async function concluirAtrelamento(professorId: string) {
    try {
      setProfessores(await listarOpcoes());
    } catch {
      // Sem a lista nova o professor nao apareceria no campo; o backend ja gravou o vinculo.
    }
    setForm((prev) => ({ ...prev, professorId }));
    setErros((prev) => ({ ...prev, professorId: "" }));
    setAtrelarAberto(false);
  }

  function abrirDialogoCriacao() {
    recarregarProfessores();
    setRegistroEdicao(null);
    setForm(initialForm);
    setErros({});
    setDialogoAberto(true);
  }

  function abrirDialogoEdicao(item: TurmaDisciplinaResponse) {
    recarregarProfessores();
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
    } catch (error) {
      const mensagem =
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : "Nao foi possivel salvar a disciplina da turma.";

      setAlerta({ tipo: "error", mensagem });
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
            <Typography variant="body2" color="text.secondary">
              Somente disciplinas da matriz curricular do curso da turma podem ser ofertadas. Cada disciplina pode ser vinculada apenas uma vez por turma.
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="Filtrar por Status"
                  select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value as "todas" | "ativa" | "planejada" | "encerrada")}
                >
                  <MenuItem value="todas">Todas</MenuItem>
                  <MenuItem value="ativa">Ativas</MenuItem>
                  <MenuItem value="planejada">Planejadas</MenuItem>
                  <MenuItem value="encerrada">Encerradas</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 9 }}>
                <Stack justifyContent="center" height="100%">
                  <Typography variant="body2" color="text.secondary">
                    {disciplinasTurmaOrdenadas.length} disciplina(s) exibida(s). {disciplinasDisponiveis.length} opcao(oes) disponivel(is) para nova oferta.
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
            <Stack direction="row" justifyContent="flex-end">
              <Button
                variant="contained"
                onClick={abrirDialogoCriacao}
                sx={{ width: "auto", minWidth: 170, whiteSpace: "nowrap" }}
              >
                Adicionar Disciplina
              </Button>
            </Stack>
            <DataTable columns={columns} rows={disciplinasTurmaOrdenadas} loading={carregando} />
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
              <Typography variant="body2" color="text.secondary">
                Escolha uma disciplina disponivel da matriz curricular do curso e vincule um professor academico responsavel pela oferta.
              </Typography>
            </Grid>
            <Grid size={12}>
              <TextField
                required
                label="Disciplina da Matriz"
                select
                disabled={!!registroEdicao}
                value={form.cursoDisciplinaId}
                error={!!erros.cursoDisciplinaId}
                helperText={erros.cursoDisciplinaId}
                onChange={(e) => setForm((prev) => ({ ...prev, cursoDisciplinaId: e.target.value, professorId: "" }))}
              >
                {disciplinasDisponiveis.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.disciplina.codigo} - {item.disciplina.nome}
                  </MenuItem>
                ))}
              </TextField>
              {!registroEdicao && (
                <Typography variant="caption" color="text.secondary">
                  {disciplinasDisponiveis.length} disciplina(s) disponivel(is) para vinculacao nesta turma.
                </Typography>
              )}
            </Grid>
            <Grid size={12}>
              <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ xs: "stretch", sm: "flex-start" }}>
                <TextField
                  required
                  fullWidth
                  sx={{ flex: 1 }}
                  label="Professor"
                  select
                  disabled={!disciplinaSelecionadaId}
                  value={form.professorId}
                  error={!!erros.professorId}
                  helperText={erros.professorId}
                  onChange={(e) => setForm((prev) => ({ ...prev, professorId: e.target.value }))}
                >
                  {professoresDisponiveis.map((professor) => (
                    <MenuItem key={professor.id} value={professor.id}>
                      {professor.semVinculo ? `${professor.nome} (nao leciona mais esta disciplina)` : professor.nome}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="outlined"
                  startIcon={<UserPlus size={16} />}
                  disabled={!disciplinaSelecionadaId}
                  onClick={() => setAtrelarAberto(true)}
                  sx={{ width: "auto", minWidth: 170, alignSelf: { sm: "stretch" }, whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  Atrelar professor
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {!disciplinaSelecionadaId
                  ? "Escolha a disciplina para ver os professores que a lecionam."
                  : professoresDisponiveis.length === 0
                    ? "Nenhum professor leciona esta disciplina. Use \"Atrelar professor\" para habilitar um."
                    : "Somente professores que lecionam esta disciplina. Para outro professor, use \"Atrelar professor\"."}
              </Typography>
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

      <AtrelarProfessorDialog
        open={atrelarAberto}
        disciplina={disciplinaSelecionada}
        professores={professores}
        onClose={() => setAtrelarAberto(false)}
        onAtrelado={(professorId) => void concluirAtrelamento(professorId)}
      />

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
