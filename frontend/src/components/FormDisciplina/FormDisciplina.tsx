import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Paper, Select,
  Stack, Tab, Tabs, Typography,
} from "@mui/material";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ValidationError } from "yup";
import Button from "../Button";
import Container from "../Container";
import TextField from "../TextField";
import { useDisciplina } from "../../hooks/use-disciplina";
import type {
  AreaConhecimento, CompetenciaResponse, DisciplinaCompetenciaRequest, NivelCompetencia, TipoCompetencia,
} from "../../models/disciplina-model";
import { competenciaApi } from "../../services/competencia-api";
import { disciplinaSchema } from "../../validators/disciplina-schema";

type FormDisciplinaProps = { disciplinaId?: string };
type FormType = {
  codigo: string; nome: string; areaConhecimento: AreaConhecimento | ""; ementa: string;
  cargaHoraria: string; cargaHorariaTeorica: string; cargaHorariaPratica: string;
  cargaHorariaLaboratorio: string; cargaHorariaExtensao: string;
  preRequisito: string; observacoes: string; ativo: boolean;
};

const inicial: FormType = {
  codigo: "", nome: "", areaConhecimento: "", ementa: "", cargaHoraria: "",
  cargaHorariaTeorica: "", cargaHorariaPratica: "", cargaHorariaLaboratorio: "",
  cargaHorariaExtensao: "", preRequisito: "", observacoes: "", ativo: true,
};
const AREAS: Array<{ value: AreaConhecimento; label: string }> = [
  { value: "COMPUTACAO", label: "Computação" }, { value: "MATEMATICA", label: "Matemática" },
  { value: "CIENCIAS_HUMANAS", label: "Ciências Humanas" }, { value: "ADMINISTRACAO_GESTAO", label: "Administração e Gestão" },
  { value: "COMUNICACAO", label: "Comunicação" }, { value: "CIENCIAS_NATUREZA", label: "Ciências da Natureza" },
  { value: "FORMACAO_GERAL", label: "Formação Geral" }, { value: "OUTRA", label: "Outra" },
];
const NIVEIS: Array<{ value: NivelCompetencia; label: string }> = [
  { value: "INTRODUZIR", label: "Introduzir" }, { value: "DESENVOLVER", label: "Desenvolver" },
  { value: "CONSOLIDAR", label: "Consolidar" },
];

export default function FormDisciplina({ disciplinaId }: FormDisciplinaProps) {
  const navigate = useNavigate();
  const { carregando, buscarDisciplinaPorId, criarDisciplina, atualizarDisciplina } = useDisciplina();
  const [aba, setAba] = useState(0);
  const [form, setForm] = useState<FormType>(inicial);
  const [catalogo, setCatalogo] = useState<CompetenciaResponse[]>([]);
  const [competencias, setCompetencias] = useState<DisciplinaCompetenciaRequest[]>([]);
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error" | "warning"; mensagem: string } | null>(null);
  const [dialogNova, setDialogNova] = useState(false);
  const [nova, setNova] = useState<{ codigo: string; nome: string; descricao: string; tipo: TipoCompetencia }>({
    codigo: "", nome: "", descricao: "", tipo: "TECNICA",
  });

  useEffect(() => {
    void (async () => {
      try {
        const [lista, disciplina] = await Promise.all([
          competenciaApi.listar(),
          disciplinaId ? buscarDisciplinaPorId(disciplinaId) : Promise.resolve(null),
        ]);
        setCatalogo(lista);
        if (!disciplina) return;
        setForm({
          codigo: disciplina.codigo, nome: disciplina.nome,
          areaConhecimento: disciplina.area_conhecimento ?? "", ementa: disciplina.ementa ?? "",
          cargaHoraria: String(disciplina.carga_horaria),
          cargaHorariaTeorica: disciplina.carga_horaria_teorica === undefined ? "" : String(disciplina.carga_horaria_teorica),
          cargaHorariaPratica: disciplina.carga_horaria_pratica === undefined ? "" : String(disciplina.carga_horaria_pratica),
          cargaHorariaLaboratorio: disciplina.carga_horaria_laboratorio === undefined ? "" : String(disciplina.carga_horaria_laboratorio),
          cargaHorariaExtensao: disciplina.carga_horaria_extensao === undefined ? "" : String(disciplina.carga_horaria_extensao),
          preRequisito: disciplina.pre_requisito ?? "", observacoes: disciplina.observacoes ?? "", ativo: disciplina.ativo,
        });
        setCompetencias((disciplina.competencias ?? []).map((item, ordem) => ({
          competenciaId: item.competencia_id, nivelEsperado: item.nivel_esperado,
          obrigatoria: item.obrigatoria, ordem,
        })));
        if (!disciplina.cadastro_completo) {
          setAlerta({ tipo: "warning", mensagem: "Cadastro legado: complete os dados acadêmicos antes de salvar." });
        }
      } catch {
        setAlerta({ tipo: "error", mensagem: "Não foi possível carregar os dados da disciplina." });
      }
    })();
    // O hook de CRUD expõe funções sem identidade estável; reagir a elas criaria
    // recarregamentos contínuos. O identificador é a dependência funcional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disciplinaId]);

  const catalogoDisponivel = catalogo.filter((item) => !competencias.some((vinculo) => vinculo.competenciaId === item.id));
  const somaCarga = useMemo(() => [form.cargaHorariaTeorica, form.cargaHorariaPratica, form.cargaHorariaLaboratorio, form.cargaHorariaExtensao]
    .reduce((soma, valor) => soma + (Number(valor) || 0), 0), [form]);

  function alterar<K extends keyof FormType>(campo: K, valor: FormType[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function adicionarCompetencia(id = competenciaSelecionada) {
    if (!id || competencias.some((item) => item.competenciaId === id)) return;
    setCompetencias((atual) => [...atual, { competenciaId: id, nivelEsperado: "DESENVOLVER", obrigatoria: true, ordem: atual.length }]);
    setCompetenciaSelecionada("");
  }

  function atualizarVinculo(indice: number, patch: Partial<DisciplinaCompetenciaRequest>) {
    setCompetencias((atual) => atual.map((item, posicao) => posicao === indice ? { ...item, ...patch } : item));
  }

  function mover(indice: number, deslocamento: -1 | 1) {
    const destino = indice + deslocamento;
    if (destino < 0 || destino >= competencias.length) return;
    setCompetencias((atual) => {
      const copia = [...atual];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia.map((item, ordem) => ({ ...item, ordem }));
    });
  }

  async function cadastrarCompetencia() {
    if (!nova.codigo.trim() || !nova.nome.trim() || !nova.descricao.trim()) {
      setAlerta({ tipo: "error", mensagem: "Preencha código, nome e descrição da nova competência." });
      return;
    }
    try {
      const criada = await competenciaApi.criar(nova);
      setCatalogo((atual) => [...atual, criada].sort((a, b) => a.nome.localeCompare(b.nome)));
      adicionarCompetencia(criada.id);
      setNova({ codigo: "", nome: "", descricao: "", tipo: "TECNICA" });
      setDialogNova(false);
      setAlerta({ tipo: "success", mensagem: "Competência criada e vinculada." });
    } catch {
      setAlerta({ tipo: "error", mensagem: "Não foi possível criar a competência. Verifique se o código já existe." });
    }
  }

  async function salvar() {
    const payload = {
      ...form,
      areaConhecimento: form.areaConhecimento as AreaConhecimento,
      cargaHoraria: Number(form.cargaHoraria), cargaHorariaTeorica: Number(form.cargaHorariaTeorica),
      cargaHorariaPratica: Number(form.cargaHorariaPratica), cargaHorariaLaboratorio: Number(form.cargaHorariaLaboratorio),
      cargaHorariaExtensao: Number(form.cargaHorariaExtensao),
      preRequisito: form.preRequisito || undefined, observacoes: form.observacoes || undefined,
      competencias: competencias.map((item, ordem) => ({ ...item, ordem })),
    };
    try {
      await disciplinaSchema.validate(payload, { abortEarly: false });
      setErros({});
    } catch (error) {
      if (!(error instanceof ValidationError)) return;
      const formatados: Record<string, string> = {};
      error.inner.forEach((item) => { if (item.path && !formatados[item.path]) formatados[item.path] = item.message; });
      setErros(formatados);
      const camposAcademicos = ["areaConhecimento", "ementa", "cargaHoraria", "cargaHorariaTeorica", "cargaHorariaPratica", "cargaHorariaLaboratorio", "cargaHorariaExtensao"];
      setAba(error.inner.some((item) => camposAcademicos.includes(item.path ?? "")) ? 1 : 0);
      setAlerta({ tipo: "error", mensagem: "Revise os campos destacados antes de salvar." });
      return;
    }
    try {
      if (disciplinaId) await atualizarDisciplina(disciplinaId, payload); else await criarDisciplina(payload);
      navigate("/disciplinas/lista", { replace: true });
    } catch {
      setAlerta({ tipo: "error", mensagem: disciplinaId ? "Não foi possível atualizar a disciplina." : "Não foi possível cadastrar a disciplina." });
    }
  }

  return (
    <Container>
      <Stack gap={2} py={2}>
        <Box>
          <Typography component="h1" variant="h5" fontWeight={800}>{disciplinaId ? "Editar disciplina" : "Nova disciplina"}</Typography>
          <Typography variant="body2" color="text.secondary">Dados do catálogo acadêmico e competências planejadas.</Typography>
        </Box>
        {alerta && <Alert severity={alerta.tipo} onClose={() => setAlerta(null)}>{alerta.mensagem}</Alert>}
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Tabs value={aba} onChange={(_, valor) => setAba(valor)} variant="scrollable" scrollButtons="auto" sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}>
            <Tab label="Dados gerais" /><Tab label="Dados acadêmicos" /><Tab label={`Competências (${competencias.length})`} /><Tab label="Requisitos" />
          </Tabs>
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {aba === 0 && <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth required label="Código" value={form.codigo} error={!!erros.codigo} helperText={erros.codigo} onChange={(e) => alterar("codigo", e.target.value)} /></Grid>
              <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth required label="Nome" value={form.nome} error={!!erros.nome} helperText={erros.nome} onChange={(e) => alterar("nome", e.target.value)} /></Grid>
              <Grid size={{ xs: 12, md: 3 }}><FormControl fullWidth required error={!!erros.areaConhecimento}><InputLabel>Área</InputLabel><Select label="Área" value={form.areaConhecimento} onChange={(e) => alterar("areaConhecimento", e.target.value as AreaConhecimento)}>{AREAS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</Select></FormControl></Grid>
              <Grid size={12}><FormControlLabel control={<Checkbox checked={form.ativo} onChange={(e) => alterar("ativo", e.target.checked)} />} label="Disciplina ativa e disponível para novos vínculos" /></Grid>
            </Grid>}
            {aba === 1 && <Stack gap={2.5}>
              <TextField fullWidth required multiline minRows={4} label="Ementa" value={form.ementa} error={!!erros.ementa} helperText={erros.ementa} onChange={(e) => alterar("ementa", e.target.value)} />
              <Box><Typography fontWeight={750}>Composição da carga horária</Typography><Typography variant="body2" color={somaCarga === Number(form.cargaHoraria) ? "success.main" : "warning.main"}>Distribuídas {somaCarga}h de {Number(form.cargaHoraria) || 0}h.</Typography></Box>
              <Grid container spacing={2}>
                {([[
                  "cargaHoraria", "Total"], ["cargaHorariaTeorica", "Teórica"], ["cargaHorariaPratica", "Prática"],
                  ["cargaHorariaLaboratorio", "Laboratório"], ["cargaHorariaExtensao", "Extensão"],
                ] as Array<[keyof FormType, string]>).map(([campo, rotulo]) => <Grid key={campo} size={{ xs: 12, sm: 6, md: campo === "cargaHoraria" ? 4 : 2 }}><TextField fullWidth required type="number" label={`${rotulo} (h)`} value={form[campo] as string} error={!!erros[campo]} helperText={erros[campo]} inputProps={{ min: 0 }} onChange={(e) => alterar(campo, e.target.value as never)} /></Grid>)}
              </Grid>
              <TextField fullWidth multiline minRows={3} label="Observações internas" value={form.observacoes} onChange={(e) => alterar("observacoes", e.target.value)} helperText="Visível apenas para a gestão acadêmica." />
            </Stack>}
            {aba === 2 && <Stack gap={2.5}>
              <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} gap={1.5}>
                <FormControl fullWidth sx={{ flex: 1, minWidth: 0 }}><InputLabel>Adicionar competência</InputLabel><Select label="Adicionar competência" value={competenciaSelecionada} onChange={(e) => setCompetenciaSelecionada(e.target.value)}>{catalogoDisponivel.map((item) => <MenuItem key={item.id} value={item.id}>{item.codigo} — {item.nome}</MenuItem>)}</Select></FormControl>
                <Button variant="contained" startIcon={<Plus size={17} />} disabled={!competenciaSelecionada} onClick={() => adicionarCompetencia()} sx={{ width: "auto", minWidth: 118, height: 36, whiteSpace: "nowrap", flexShrink: 0 }}>Adicionar</Button>
                <Button variant="outlined" onClick={() => setDialogNova(true)} sx={{ width: "auto", minWidth: 154, height: 36, whiteSpace: "nowrap", flexShrink: 0 }}>Nova competência</Button>
              </Stack>
              {!competencias.length && <Alert severity="info">Nenhuma competência vinculada. O dashboard poderá exibir a disciplina, mas ainda não haverá cobertura planejada.</Alert>}
              {competencias.map((vinculo, indice) => {
                const item = catalogo.find((competencia) => competencia.id === vinculo.competenciaId);
                return <Paper key={vinculo.competenciaId} variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems={{ md: "center" }}>
                  <Box flex={1}><Stack direction="row" gap={1} alignItems="center" flexWrap="wrap"><Typography fontWeight={750}>{item?.nome ?? "Competência"}</Typography><Chip size="small" label={item?.codigo ?? "—"} /><Chip size="small" variant="outlined" label={item?.tipo ?? "—"} /></Stack><Typography variant="body2" color="text.secondary" mt={0.5}>{item?.descricao}</Typography></Box>
                  <FormControl size="small" sx={{ minWidth: 150 }}><InputLabel>Nível esperado</InputLabel><Select label="Nível esperado" value={vinculo.nivelEsperado} onChange={(e) => atualizarVinculo(indice, { nivelEsperado: e.target.value as NivelCompetencia })}>{NIVEIS.map((nivel) => <MenuItem key={nivel.value} value={nivel.value}>{nivel.label}</MenuItem>)}</Select></FormControl>
                  <FormControlLabel control={<Checkbox checked={vinculo.obrigatoria} onChange={(e) => atualizarVinculo(indice, { obrigatoria: e.target.checked })} />} label="Obrigatória" />
                  <Stack direction="row"><IconButton aria-label="Mover para cima" disabled={indice === 0} onClick={() => mover(indice, -1)}><ArrowUp size={18} /></IconButton><IconButton aria-label="Mover para baixo" disabled={indice === competencias.length - 1} onClick={() => mover(indice, 1)}><ArrowDown size={18} /></IconButton><IconButton aria-label="Remover vínculo" color="error" onClick={() => setCompetencias((atual) => atual.filter((_, posicao) => posicao !== indice).map((v, ordem) => ({ ...v, ordem })))}><Trash2 size={18} /></IconButton></Stack>
                </Stack></Paper>;
              })}
            </Stack>}
            {aba === 3 && <Stack gap={2}><Alert severity="info">Nesta leva, o pré-requisito continua textual. A relação estruturada será implementada junto das matrizes versionadas.</Alert><TextField fullWidth multiline minRows={3} label="Pré-requisito" value={form.preRequisito} onChange={(e) => alterar("preRequisito", e.target.value)} /></Stack>}
          </Box>
          <Divider />
          <Stack direction="row" justifyContent="flex-end" flexWrap="wrap" gap={1.5} p={2} sx={{ "& > button": { width: "auto", minWidth: 100, height: 36, whiteSpace: "nowrap" } }}><Button variant="outlined" onClick={() => navigate("/disciplinas/lista")}>Cancelar</Button><Button variant="contained" isLoading={carregando} onClick={() => void salvar()} sx={{ minWidth: 158 }}>{disciplinaId ? "Salvar alterações" : "Cadastrar disciplina"}</Button></Stack>
        </Paper>
      </Stack>
      <Dialog open={dialogNova} onClose={() => setDialogNova(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nova competência</DialogTitle><DialogContent><Stack gap={2} mt={1}><TextField label="Código" value={nova.codigo} onChange={(e) => setNova((v) => ({ ...v, codigo: e.target.value }))} /><TextField label="Nome" value={nova.nome} onChange={(e) => setNova((v) => ({ ...v, nome: e.target.value }))} /><TextField multiline minRows={3} label="Descrição" value={nova.descricao} onChange={(e) => setNova((v) => ({ ...v, descricao: e.target.value }))} /><FormControl><InputLabel>Tipo</InputLabel><Select label="Tipo" value={nova.tipo} onChange={(e) => setNova((v) => ({ ...v, tipo: e.target.value as TipoCompetencia }))}><MenuItem value="GERAL">Geral</MenuItem><MenuItem value="TECNICA">Técnica</MenuItem><MenuItem value="SOCIOEMOCIONAL">Socioemocional</MenuItem></Select></FormControl></Stack></DialogContent>
        <DialogActions sx={{ "& > button": { width: "auto", minWidth: 100, height: 36, whiteSpace: "nowrap" } }}><Button onClick={() => setDialogNova(false)}>Cancelar</Button><Button variant="contained" onClick={() => void cadastrarCompetencia()} sx={{ minWidth: 140 }}>Criar e vincular</Button></DialogActions>
      </Dialog>
    </Container>
  );
}
