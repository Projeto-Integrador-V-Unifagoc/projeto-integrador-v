import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  FlaskConical,
  GraduationCap,
  Microscope,
  Pencil,
  Target,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/Button";
import Container from "../../components/Container";
import type {
  AreaConhecimento,
  DisciplinaResponse,
  NivelCompetencia,
  TipoCompetencia,
} from "../../models/disciplina-model";
import { disciplinaApi } from "../../services/disciplina-api";

const AREAS: Record<AreaConhecimento, string> = {
  COMPUTACAO: "Computação",
  MATEMATICA: "Matemática",
  CIENCIAS_HUMANAS: "Ciências Humanas",
  ADMINISTRACAO_GESTAO: "Administração e Gestão",
  COMUNICACAO: "Comunicação",
  CIENCIAS_NATUREZA: "Ciências da Natureza",
  FORMACAO_GERAL: "Formação Geral",
  OUTRA: "Outra",
};

const NIVEIS: Record<NivelCompetencia, string> = {
  INTRODUZIR: "Introduzir",
  DESENVOLVER: "Desenvolver",
  CONSOLIDAR: "Consolidar",
};

const TIPOS: Record<TipoCompetencia, string> = {
  GERAL: "Geral",
  TECNICA: "Técnica",
  SOCIOEMOCIONAL: "Socioemocional",
};

function horas(valor?: number) {
  return valor == null ? "Não informada" : `${valor} h`;
}

function Campo({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>{rotulo}</Typography>
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{valor?.trim() || "Não informado"}</Typography>
    </Box>
  );
}

function Carregando() {
  return (
    <Container>
      <Stack gap={2}>
        <Skeleton variant="rounded" height={92} />
        <Grid container spacing={2}>{[1, 2, 3, 4, 5].map((item) => <Grid key={item} size={{ xs: 12, sm: 6, md: 2.4 }}><Skeleton variant="rounded" height={96} /></Grid>)}</Grid>
        <Skeleton variant="rounded" height={220} />
        <Skeleton variant="rounded" height={190} />
      </Stack>
    </Container>
  );
}

export default function DetalheDisciplina() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [disciplina, setDisciplina] = useState<DisciplinaResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    if (!id) {
      setErro("Disciplina não identificada.");
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      setDisciplina(await disciplinaApi.buscarDisciplinaPorId(id));
      setErro("");
    } catch (error) {
      const mensagem = axios.isAxiosError(error) && error.response?.status === 404
        ? "A disciplina solicitada não foi encontrada."
        : "Não foi possível carregar os detalhes da disciplina.";
      setErro(mensagem);
      setDisciplina(null);
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => { void carregar(); }, [carregar]);

  const cargas = useMemo(() => disciplina ? [
    disciplina.carga_horaria_teorica,
    disciplina.carga_horaria_pratica,
    disciplina.carga_horaria_laboratorio,
    disciplina.carga_horaria_extensao,
  ] : [], [disciplina]);
  const cargasInformadas = cargas.length > 0 && cargas.every((valor) => valor != null);
  const cargaDistribuida = cargas.reduce<number>((soma, valor) => soma + Number(valor ?? 0), 0);
  const percentualDistribuido = disciplina?.carga_horaria
    ? Math.min(100, (cargaDistribuida / disciplina.carga_horaria) * 100)
    : 0;
  const competencias = useMemo(
    () => [...(disciplina?.competencias ?? [])].sort((a, b) => a.ordem - b.ordem),
    [disciplina],
  );

  if (carregando) return <Carregando />;

  if (!disciplina) {
    return (
      <Container>
        <Alert
          severity="error"
          action={<Button color="inherit" onClick={() => void carregar()} sx={{ width: "auto", minWidth: 120, whiteSpace: "nowrap" }}>Tentar novamente</Button>}
        >
          {erro}
        </Alert>
        <Button startIcon={<ArrowLeft size={17} />} onClick={() => navigate("/disciplinas/lista")} sx={{ mt: 2, width: "auto", minWidth: 160 }}>
          Voltar para disciplinas
        </Button>
      </Container>
    );
  }

  const area = disciplina.area_conhecimento ? AREAS[disciplina.area_conhecimento] : "Não informada";

  return (
    <Container>
      <Stack gap={2.5}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1.5}>
          <Button variant="text" startIcon={<ArrowLeft size={17} />} onClick={() => navigate("/disciplinas/lista")} sx={{ width: "auto", alignSelf: "flex-start", minWidth: 100 }}>
            Voltar
          </Button>
          <Button variant="contained" startIcon={<Pencil size={17} />} onClick={() => navigate(`/disciplinas/${disciplina.id}`)} sx={{ width: "auto", minWidth: 150, whiteSpace: "nowrap" }}>
            Editar disciplina
          </Button>
        </Stack>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} gap={2}>
            <Box>
              <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
                <BookOpen size={23} aria-hidden="true" />
                <Typography component="h1" variant="h5" fontWeight={850}>{disciplina.nome}</Typography>
              </Stack>
              <Typography color="text.secondary">{disciplina.codigo} · {area}</Typography>
            </Box>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Chip color={disciplina.ativo ? "success" : "default"} label={disciplina.ativo ? "Ativa" : "Inativa"} />
              <Chip color={disciplina.cadastro_completo ? "success" : "warning"} variant="outlined" label={disciplina.cadastro_completo ? "Dados acadêmicos completos" : "Dados acadêmicos pendentes"} />
            </Stack>
          </Stack>
        </Paper>

        {!disciplina.cadastro_completo && <Alert severity="warning">Este é um cadastro legado ou incompleto. Edite a disciplina para informar a ementa, a área e a composição da carga horária.</Alert>}
        {!competencias.length && <Alert severity="info">Nenhuma competência foi planejada para esta disciplina.</Alert>}

        <Grid container spacing={2}>
          {[
            { rotulo: "Carga total", valor: horas(disciplina.carga_horaria), icon: Clock3 },
            { rotulo: "Teórica", valor: horas(disciplina.carga_horaria_teorica), icon: GraduationCap },
            { rotulo: "Prática", valor: horas(disciplina.carga_horaria_pratica), icon: Microscope },
            { rotulo: "Laboratório", valor: horas(disciplina.carga_horaria_laboratorio), icon: FlaskConical },
            { rotulo: "Extensão", valor: horas(disciplina.carga_horaria_extensao), icon: Target },
          ].map(({ rotulo, valor, icon: Icon }) => (
            <Grid key={rotulo} size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: "100%" }}>
                <Stack direction="row" justifyContent="space-between" gap={1}>
                  <Box><Typography variant="caption" color="text.secondary">{rotulo}</Typography><Typography variant="h6" fontWeight={800}>{valor}</Typography></Box>
                  <Box color="primary.main"><Icon size={20} aria-hidden="true" /></Box>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={800}>Dados acadêmicos</Typography>
          <Divider sx={{ my: 1.5 }} />
          <Stack gap={2}>
            <Campo rotulo="Ementa" valor={disciplina.ementa} />
            <Box>
              <Stack direction="row" justifyContent="space-between" gap={2} mb={0.75}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>Distribuição da carga horária</Typography>
                <Typography variant="caption" fontWeight={750}>{cargasInformadas ? `${cargaDistribuida} de ${disciplina.carga_horaria} horas` : "Não informada"}</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={cargasInformadas ? percentualDistribuido : 0} color={cargasInformadas && cargaDistribuida === disciplina.carga_horaria ? "success" : "warning"} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
          <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
            <Target size={20} aria-hidden="true" />
            <Typography variant="h6" fontWeight={800}>Competências planejadas</Typography>
            <Chip size="small" label={competencias.length} />
          </Stack>
          {competencias.length ? (
            <Grid container spacing={1.5}>
              {competencias.map((competencia) => (
                <Grid key={competencia.competencia_id} size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: "100%" }}>
                    <Stack gap={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                        <Box><Typography fontWeight={800}>{competencia.nome}</Typography><Typography variant="caption" color="text.secondary">{competencia.codigo}</Typography></Box>
                        <Chip size="small" color={competencia.obrigatoria ? "primary" : "default"} variant={competencia.obrigatoria ? "filled" : "outlined"} label={competencia.obrigatoria ? "Obrigatória" : "Opcional"} />
                      </Stack>
                      <Typography variant="body2">{competencia.descricao}</Typography>
                      <Stack direction="row" gap={1} flexWrap="wrap"><Chip size="small" variant="outlined" label={TIPOS[competencia.tipo]} /><Chip size="small" variant="outlined" label={`Nível: ${NIVEIS[competencia.nivel_esperado]}`} /></Stack>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : <Typography variant="body2" color="text.secondary">Nenhuma competência vinculada.</Typography>}
        </Paper>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}><Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: "100%" }}><Campo rotulo="Pré-requisito" valor={disciplina.pre_requisito} /></Paper></Grid>
          <Grid size={{ xs: 12, md: 6 }}><Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: "100%" }}><Campo rotulo="Observações internas" valor={disciplina.observacoes} /></Paper></Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
