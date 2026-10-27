import {
  Alert, Box, Chip, Dialog, DialogContent, DialogTitle, Grid, IconButton, Paper, Skeleton,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from "@mui/material";
import { AlertTriangle, BookOpenCheck, CalendarCheck, UserRound, X } from "lucide-react";
import type { DetalheAlunoAtencaoProfessor, NivelAtencaoProfessor } from "../../models/home-professor-model";

const TRACO = "—";
const percentual = (valor: number | null) => valor === null ? TRACO : `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const pontos = (valor: number | null, total: number) => valor === null ? TRACO : `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} / ${total}`;
const data = (valor: string | null) => valor ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${valor}T12:00:00`)) : TRACO;
const corNivel = (nivel: NivelAtencaoProfessor): "error" | "warning" | "success" | "default" => nivel === "CRITICO" ? "error" : nivel === "ATENCAO" ? "warning" : nivel === "REGULAR" ? "success" : "default";
const rotuloNivel = (nivel: NivelAtencaoProfessor) => ({ CRITICO: "Crítico", ATENCAO: "Atenção", REGULAR: "Regular", SEM_DADOS: "Sem dados" })[nivel];

interface Props {
  open: boolean;
  carregando: boolean;
  erro: string;
  detalhe: DetalheAlunoAtencaoProfessor | null;
  onClose: () => void;
}

function Indicador({ titulo, valor, apoio, icon: Icon }: { titulo: string; valor: string; apoio: string; icon: typeof UserRound }) {
  return <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2.5, height: "100%" }}><Stack direction="row" justifyContent="space-between" gap={1}><Box><Typography variant="caption" color="text.secondary">{titulo}</Typography><Typography variant="h6" fontWeight={850}>{valor}</Typography><Typography variant="caption" color="text.secondary">{apoio}</Typography></Box><Box color="primary.main"><Icon size={20} /></Box></Stack></Paper>;
}

export default function AlunoAtencaoDialog({ open, carregando, erro, detalhe, onClose }: Props) {
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle><Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}><Box><Typography variant="h6" fontWeight={850}>{detalhe?.aluno.nome ?? "Detalhamento do aluno"}</Typography>{detalhe && <Typography variant="body2" color="text.secondary">Matrícula {detalhe.aluno.matricula} · {detalhe.contexto.disciplina.nome} · {detalhe.contexto.turma.sigla}</Typography>}</Box><IconButton aria-label="Fechar detalhamento" onClick={onClose}><X size={20} /></IconButton></Stack></DialogTitle>
    <DialogContent dividers>
      {carregando && <Stack gap={2}><Skeleton variant="rounded" height={80} /><Grid container spacing={1.5}>{[1, 2, 3, 4].map((item) => <Grid key={item} size={{ xs: 12, sm: 6, md: 3 }}><Skeleton variant="rounded" height={105} /></Grid>)}</Grid><Skeleton variant="rounded" height={220} /></Stack>}
      {!carregando && erro && <Alert severity="error">{erro}</Alert>}
      {!carregando && detalhe && <Stack gap={2.5}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1.5}>
          <Box><Typography fontWeight={800}>{detalhe.contexto.curso.nome}</Typography><Typography variant="body2" color="text.secondary">{detalhe.contexto.periodo.codigo} · {detalhe.contexto.turma.descricao}</Typography></Box>
          <TooltipNivel nivel={detalhe.resumo.nivel} motivo={detalhe.resumo.motivo} />
        </Stack>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Indicador titulo="Média parcial" valor={percentual(detalhe.resumo.media)} apoio={`Referência: ${detalhe.criterios.mediaMinima}%`} icon={BookOpenCheck} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Indicador titulo="Frequência" valor={percentual(detalhe.resumo.frequencia)} apoio={`Mínimo: ${detalhe.criterios.frequenciaMinima}%`} icon={CalendarCheck} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Indicador titulo="Presenças e faltas" valor={`${detalhe.resumo.presencas} / ${detalhe.resumo.faltas}`} apoio={`${detalhe.resumo.totalAulas} chamadas registradas`} icon={UserRound} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Indicador titulo="Notas lançadas" valor={`${detalhe.resumo.avaliacoesLancadas}/${detalhe.resumo.totalAvaliacoes}`} apoio="avaliações com nota" icon={BookOpenCheck} /></Grid>
        </Grid>
        <Box><Stack direction="row" gap={1} alignItems="center" mb={1}><AlertTriangle size={19} /><Typography fontWeight={800}>Pontos de atenção</Typography></Stack><Stack gap={1}>{detalhe.pontosAtencao.length ? detalhe.pontosAtencao.map((item) => <Alert key={item.id} severity={item.severidade === "CRITICO" ? "error" : item.severidade === "ATENCAO" ? "warning" : "info"}><Typography fontWeight={750}>{item.titulo}</Typography><Typography variant="body2">{item.descricao}</Typography></Alert>) : <Alert severity="success">Nenhum ponto de atenção identificado com os dados atuais.</Alert>}</Stack></Box>
        <Box><Typography fontWeight={800} mb={1}>Desempenho por avaliação</Typography><TableContainer component={Paper} variant="outlined"><Table size="small"><TableHead><TableRow><TableCell>Avaliação</TableCell><TableCell>Tipo</TableCell><TableCell>Devolução</TableCell><TableCell align="right">Nota</TableCell><TableCell align="right">Aproveitamento</TableCell><TableCell>Status</TableCell></TableRow></TableHead><TableBody>{detalhe.avaliacoes.map((item) => <TableRow key={item.id}><TableCell>{item.titulo}</TableCell><TableCell>{item.tipo}</TableCell><TableCell>{data(item.dataDevolucao)}</TableCell><TableCell align="right">{pontos(item.nota, item.valor)}</TableCell><TableCell align="right">{percentual(item.percentual)}</TableCell><TableCell><Chip size="small" color={item.status === "LANCADA" ? "success" : "warning"} label={item.status === "LANCADA" ? "Lançada" : "Pendente"} /></TableCell></TableRow>)}</TableBody></Table></TableContainer></Box>
      </Stack>}
    </DialogContent>
  </Dialog>;
}

function TooltipNivel({ nivel, motivo }: { nivel: NivelAtencaoProfessor; motivo: string }) {
  return <Stack alignItems={{ sm: "flex-end" }}><Chip color={corNivel(nivel)} label={rotuloNivel(nivel)} /><Typography variant="caption" color="text.secondary" mt={0.5}>{motivo}</Typography></Stack>;
}
