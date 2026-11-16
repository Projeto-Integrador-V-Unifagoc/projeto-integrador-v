import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Checkbox, Chip, FormControlLabel, Grid, IconButton, MenuItem, Stack, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { GitBranch, Pencil, Trash2 } from "lucide-react";
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
import type { CursoDisciplinaResponse, MatrizCurricularResponse, RequisitoCurricularResponse, TipoRequisitoCurricular } from "../../models/curso-disciplina-model";
import RequisitosMatrizDialog from "./RequisitosMatrizDialog";

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

const hoje = new Date().toISOString().slice(0, 10);
const initialMatrizForm = { codigo: "", versao: "", vigenciaInicio: hoje, copiarAtual: true };

export default function MatrizCurricularCurso() {
  const { id } = useParams();
  const cursoId = id ?? "";
  const [curso, setCurso] = useState<CursoResponse | null>(null);
  const [disciplinas, setDisciplinas] = useState<DisciplinaResponse[]>([]);
  const [matriz, setMatriz] = useState<CursoDisciplinaResponse[]>([]);
  const [matrizes, setMatrizes] = useState<MatrizCurricularResponse[]>([]);
  const [matrizSelecionadaId, setMatrizSelecionadaId] = useState("");
  const [requisitos, setRequisitos] = useState<RequisitoCurricularResponse[]>([]);
  const [itemRequisitos, setItemRequisitos] = useState<CursoDisciplinaResponse | null>(null);
  const [dialogoMatrizAberto, setDialogoMatrizAberto] = useState(false);
  const [confirmarPublicacao, setConfirmarPublicacao] = useState(false);
  const [formMatriz, setFormMatriz] = useState(initialMatrizForm);
  const [filtroPeriodoIdeal, setFiltroPeriodoIdeal] = useState("");
  const [filtroObrigatoria, setFiltroObrigatoria] = useState<"todas" | "sim" | "nao">("todas");
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error"; mensagem: string } | null>(null);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [registroEdicao, setRegistroEdicao] = useState<CursoDisciplinaResponse | null>(null);
  const [registroExclusao, setRegistroExclusao] = useState<CursoDisciplinaResponse | null>(null);
  const [form, setForm] = useState<FormType>(initialForm);
  const [erros, setErros] = useState<Record<string, string>>({});
  const { buscarCursoPorId } = useCurso();
  const { listarDisciplinas } = useDisciplina();
  const { carregando, listarMatrizCurricularPorCursoId, criarCursoDisciplina, atualizarCursoDisciplina, removerCursoDisciplina, listarMatrizes, criarMatriz, publicarMatriz, listarRequisitos, criarRequisito, atualizarRequisito, removerRequisito } = useCursoDisciplina();

  async function carregarDados() {
    if (!cursoId) {
      return;
    }

    const matrizesResponse: MatrizCurricularResponse[] = await listarMatrizes(cursoId);
    const selecionada = matrizesResponse.find((item) => item.id === matrizSelecionadaId)
      ?? matrizesResponse.find((item) => item.status === "VIGENTE")
      ?? matrizesResponse[0];
    const [cursoResponse, disciplinasResponse, matrizResponse, requisitosResponse] = await Promise.all([
      buscarCursoPorId(cursoId),
      listarDisciplinas(),
      listarMatrizCurricularPorCursoId(cursoId, selecionada?.id),
      selecionada?.id ? listarRequisitos(selecionada.id) : Promise.resolve([]),
    ]);

    setCurso(cursoResponse);
    setDisciplinas(disciplinasResponse);
    setMatriz(matrizResponse);
    setRequisitos(requisitosResponse);
    setMatrizes(matrizesResponse);
    if (selecionada && selecionada.id !== matrizSelecionadaId) setMatrizSelecionadaId(selecionada.id);
  }

  useEffect(() => {
    void (async () => {
      await carregarDados();
    })();
    // Os métodos dos hooks atuais não são memoizados; as chaves abaixo controlam a recarga sem criar loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoId, matrizSelecionadaId]);

  const matrizSelecionada = matrizes.find((item) => item.id === matrizSelecionadaId) ?? null;
  const editavel = matrizSelecionada?.status === "RASCUNHO";

  async function salvarNovaMatriz() {
    if (!formMatriz.codigo.trim() || !formMatriz.versao.trim() || !formMatriz.vigenciaInicio) {
      setAlerta({ tipo: "error", mensagem: "Informe código, versão e início da vigência." });
      return;
    }
    try {
      const nova = await criarMatriz(cursoId, {
        codigo: formMatriz.codigo,
        versao: formMatriz.versao,
        vigenciaInicio: formMatriz.vigenciaInicio,
        matrizOrigemId: formMatriz.copiarAtual ? matrizSelecionadaId : undefined,
      });
      setDialogoMatrizAberto(false);
      setFormMatriz(initialMatrizForm);
      setMatrizSelecionadaId(nova.id);
      setAlerta({ tipo: "success", mensagem: "Nova versão criada em rascunho." });
    } catch (error) {
      setAlerta({ tipo: "error", mensagem: axios.isAxiosError(error) ? error.response?.data?.error ?? "Não foi possível criar a matriz." : "Não foi possível criar a matriz." });
    }
  }

  async function publicarSelecionada() {
    if (!matrizSelecionada) return;
    try {
      await publicarMatriz(matrizSelecionada.id, true);
      setConfirmarPublicacao(false);
      setAlerta({ tipo: "success", mensagem: "Matriz publicada e definida como vigente." });
      await carregarDados();
    } catch (error) {
      setAlerta({ tipo: "error", mensagem: axios.isAxiosError(error) ? error.response?.data?.error ?? "Não foi possível publicar a matriz." : "Não foi possível publicar a matriz." });
    }
  }

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

  function handlePeriodoIdealChange(value: string) {
    const apenasDigitos = value.replace(/\D/g, "").slice(0, 2);

    if (!apenasDigitos) {
      setForm((prev) => ({ ...prev, periodoIdeal: "" }));
      return;
    }

    const periodo = Number(apenasDigitos);

    if (periodo >= 1 && periodo <= 12) {
      setForm((prev) => ({ ...prev, periodoIdeal: apenasDigitos }));
    }
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
          matrizCurricularId: matrizSelecionadaId,
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

  async function adicionarRequisito(requisitoCursoDisciplinaId: string, tipo: TipoRequisitoCurricular) {
    if (!itemRequisitos) return;
    await criarRequisito({ cursoDisciplinaId: itemRequisitos.id, requisitoCursoDisciplinaId, tipo });
    await carregarDados();
    setAlerta({ tipo: "success", mensagem: "Requisito adicionado com sucesso." });
  }

  async function alterarTipoRequisito(id: string, tipo: TipoRequisitoCurricular) {
    try {
      await atualizarRequisito(id, tipo);
      await carregarDados();
      setAlerta({ tipo: "success", mensagem: "Tipo do requisito atualizado." });
    } catch (error) {
      setAlerta({ tipo: "error", mensagem: axios.isAxiosError(error) ? error.response?.data?.error ?? "Não foi possível atualizar o requisito." : "Não foi possível atualizar o requisito." });
    }
  }

  async function excluirRequisito(id: string) {
    try {
      await removerRequisito(id);
      await carregarDados();
      setAlerta({ tipo: "success", mensagem: "Requisito removido com sucesso." });
    } catch (error) {
      setAlerta({ tipo: "error", mensagem: axios.isAxiosError(error) ? error.response?.data?.error ?? "Não foi possível remover o requisito." : "Não foi possível remover o requisito." });
    }
  }

  const disciplinasDisponiveis = disciplinas.filter((disciplina) => {
    if (registroEdicao?.disciplina.id === disciplina.id) {
      return true;
    }

    return !matriz.some((item) => item.disciplina.id === disciplina.id);
  });

  const periodosDisponiveis = [...new Set(matriz.map((item) => item.periodo_ideal).filter((periodo) => periodo !== undefined && periodo !== null))]
    .sort((a, b) => Number(a) - Number(b));

  const matrizFiltrada = matriz.filter((item) => {
    const correspondePeriodo =
      !filtroPeriodoIdeal || String(item.periodo_ideal ?? "") === filtroPeriodoIdeal;

    const correspondeObrigatoria =
      filtroObrigatoria === "todas" ||
      (filtroObrigatoria === "sim" && item.obrigatoria) ||
      (filtroObrigatoria === "nao" && !item.obrigatoria);

    return correspondePeriodo && correspondeObrigatoria;
  });

  const matrizOrdenada = [...matrizFiltrada].sort((a, b) => {
    const periodoA = a.periodo_ideal ?? Number.MAX_SAFE_INTEGER;
    const periodoB = b.periodo_ideal ?? Number.MAX_SAFE_INTEGER;

    if (periodoA !== periodoB) {
      return periodoA - periodoB;
    }

    return a.disciplina.nome.localeCompare(b.disciplina.nome);
  });

  const columns: GridColDef<CursoDisciplinaResponse>[] = [
    { field: "codigo", headerName: "Codigo", width: 140, valueGetter: (_, row) => row.disciplina.codigo },
    { field: "nome", headerName: "Disciplina", flex: 1, valueGetter: (_, row) => row.disciplina.nome },
    { field: "periodo", headerName: "Periodo Ideal", width: 140, valueGetter: (_, row) => row.periodo_ideal ?? "-" },
    { field: "carga", headerName: "Carga Horaria", width: 140, valueGetter: (_, row) => row.carga_horaria },
    { field: "obrigatoria", headerName: "Obrigatoria", width: 130, valueGetter: (_, row) => (row.obrigatoria ? "Sim" : "Nao") },
    { field: "status", headerName: "Status", width: 120, valueGetter: (_, row) => (row.ativo ? "Ativa" : "Inativa") },
    { field: "requisitos", headerName: "Requisitos", width: 115, valueGetter: (_, row) => requisitos.filter((item) => item.cursoDisciplinaId === row.id).length },
    {
      field: "acoes",
      headerName: "Acoes",
      width: 165,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton aria-label={`Gerenciar requisitos de ${params.row.disciplina.nome}`} onClick={() => setItemRequisitos(params.row)} color="primary">
            <GitBranch size={18} />
          </IconButton>
          <IconButton disabled={!editavel} onClick={() => abrirDialogoEdicao(params.row)} color="primary">
            <Pencil size={18} />
          </IconButton>
          <IconButton disabled={!editavel} onClick={() => setRegistroExclusao(params.row)} color="error">
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
          <Card.Header><Card.Title>Versões da matriz</Card.Title></Card.Header>
          <Card.Content>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField label="Matriz selecionada" select value={matrizSelecionadaId} onChange={(e) => setMatrizSelecionadaId(e.target.value)}>
                  {matrizes.map((item) => <MenuItem key={item.id} value={item.id}>{item.codigo} · {item.versao} · {item.status}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                {matrizSelecionada && <Stack direction="row" gap={1} flexWrap="wrap"><Chip color={matrizSelecionada.status === "VIGENTE" ? "success" : matrizSelecionada.status === "RASCUNHO" ? "warning" : "default"} label={matrizSelecionada.status} /><Chip variant="outlined" label={`${matrizSelecionada.total_disciplinas} disciplinas`} /><Chip variant="outlined" label={`${matrizSelecionada.carga_horaria_total}h`} /><Chip variant="outlined" label={`${matrizSelecionada.total_turmas} turmas`} /></Stack>}
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Stack direction="row" justifyContent={{ md: "flex-end" }} gap={1}>
                  <Button variant="outlined" onClick={() => setDialogoMatrizAberto(true)} sx={{ width: "auto", whiteSpace: "nowrap" }}>Nova versão</Button>
                  {editavel && <Button variant="contained" onClick={() => setConfirmarPublicacao(true)} sx={{ width: "auto" }}>Publicar</Button>}
                </Stack>
              </Grid>
            </Grid>
            {matrizSelecionada?.status !== "RASCUNHO" && <Alert severity="info" sx={{ mt: 2 }}>Matrizes publicadas preservam o histórico e são somente leitura. Crie uma nova versão para alterar disciplinas.</Alert>}
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title>Resumo do Curso</Card.Title>
          </Card.Header>
          <Card.Content>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Typography variant="body2"><strong>Codigo:</strong> {curso?.codigo ?? "-"}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Typography variant="body2"><strong>Nome:</strong> {curso?.nome ?? "-"}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Typography variant="body2"><strong>Departamento:</strong> {curso?.departamento.nome ?? "-"}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Typography variant="body2"><strong>Faculdade:</strong> {curso?.departamento.faculdade.nome ?? "-"}</Typography>
              </Grid>
            </Grid>
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title>Disciplinas do Curso</Card.Title>
          </Card.Header>
          <Card.Content>
            <Stack gap={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    label="Filtrar por Periodo"
                    select
                    value={filtroPeriodoIdeal}
                    onChange={(e) => setFiltroPeriodoIdeal(e.target.value)}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {periodosDisponiveis.map((periodo) => (
                      <MenuItem key={String(periodo)} value={String(periodo)}>
                        {periodo}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    label="Filtrar por Tipo"
                    select
                    value={filtroObrigatoria}
                    onChange={(e) => setFiltroObrigatoria(e.target.value as "todas" | "sim" | "nao")}
                  >
                    <MenuItem value="todas">Todas</MenuItem>
                    <MenuItem value="sim">Obrigatorias</MenuItem>
                    <MenuItem value="nao">Optativas</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack justifyContent="center" height="100%">
                    <Typography variant="body2" color="text.secondary">
                      Exibindo {matrizOrdenada.length} disciplina(s) na matriz com ordenacao por periodo ideal e nome.
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
              <Stack direction="row" justifyContent="flex-end">
                <Button
                  variant="contained"
                  onClick={abrirDialogoCriacao}
                  disabled={!editavel}
                  sx={{ width: "auto", minWidth: 170, whiteSpace: "nowrap" }}
                >
                  Adicionar Disciplina
                </Button>
              </Stack>
              <DataTable columns={columns} rows={matrizOrdenada} loading={carregando} />
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
              <Typography variant="body2" color="text.secondary">
                Somente disciplinas ainda nao vinculadas a este curso estao disponiveis para selecao.
              </Typography>
            </Grid>
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
              {!registroEdicao && (
                <Typography variant="caption" color="text.secondary">
                  {disciplinasDisponiveis.length} disciplina(s) disponivel(is) para vinculacao.
                </Typography>
              )}
            </Grid>
            <Grid size={6}>
              <TextField
                required
                label="Periodo Ideal"
                type="number"
                value={form.periodoIdeal}
                error={!!erros.periodoIdeal}
                helperText={erros.periodoIdeal}
                onChange={(e) => handlePeriodoIdealChange(e.target.value)}
                inputProps={{ min: 1, max: 12, step: 1 }}
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

      <Dialog.Root open={dialogoMatrizAberto} onClose={() => setDialogoMatrizAberto(false)} maxWidth="sm">
        <Dialog.Header><Dialog.Title>Nova versão da matriz</Dialog.Title><Dialog.ActionClose onClose={() => setDialogoMatrizAberto(false)} /></Dialog.Header>
        <Dialog.Content>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Código" required value={formMatriz.codigo} onChange={(e) => setFormMatriz((atual) => ({ ...atual, codigo: e.target.value }))} placeholder="Ex.: ADS-2027-1" /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Versão" required value={formMatriz.versao} onChange={(e) => setFormMatriz((atual) => ({ ...atual, versao: e.target.value }))} placeholder="Ex.: 2027.1" /></Grid>
            <Grid size={12}><TextField label="Início da vigência" type="date" required value={formMatriz.vigenciaInicio} onChange={(e) => setFormMatriz((atual) => ({ ...atual, vigenciaInicio: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid size={12}><FormControlLabel control={<Checkbox checked={formMatriz.copiarAtual} onChange={(e) => setFormMatriz((atual) => ({ ...atual, copiarAtual: e.target.checked }))} />} label="Copiar disciplinas da matriz selecionada" /></Grid>
          </Grid>
        </Dialog.Content>
        <Dialog.Footer><Button variant="outlined" onClick={() => setDialogoMatrizAberto(false)}>Cancelar</Button><Button variant="contained" onClick={() => void salvarNovaMatriz()}>Criar rascunho</Button></Dialog.Footer>
      </Dialog.Root>

      <Dialog.Root open={confirmarPublicacao} onClose={() => setConfirmarPublicacao(false)} maxWidth="sm">
        <Dialog.Header><Dialog.Title>Publicar nova matriz</Dialog.Title><Dialog.ActionClose onClose={() => setConfirmarPublicacao(false)} /></Dialog.Header>
        <Dialog.Content><Alert severity="warning">A matriz vigente atual será encerrada. Turmas existentes continuarão vinculadas à versão anterior e somente novas turmas usarão a nova matriz.</Alert></Dialog.Content>
        <Dialog.Footer><Button variant="outlined" onClick={() => setConfirmarPublicacao(false)}>Cancelar</Button><Button variant="contained" onClick={() => void publicarSelecionada()}>Confirmar publicação</Button></Dialog.Footer>
      </Dialog.Root>

      <RequisitosMatrizDialog
        open={!!itemRequisitos}
        item={itemRequisitos}
        matriz={matriz}
        requisitos={requisitos}
        editavel={editavel}
        onClose={() => setItemRequisitos(null)}
        onAdicionar={adicionarRequisito}
        onAtualizar={alterarTipoRequisito}
        onRemover={excluirRequisito}
      />
    </Container>
  );
}
