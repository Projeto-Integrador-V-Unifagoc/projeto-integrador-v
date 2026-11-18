import { Box, Button, Chip, Grid, LinearProgress, Skeleton, Stack, Typography } from "@mui/material";
import { ArrowRight, UserRound } from "lucide-react";
import {
  AvisoDetalhe,
  CORES_DASHBOARD,
  MetricaDetalhe,
  PainelDetalhe,
  SecaoDetalhe,
  SeloRisco,
  ESTADOS,
  sxBotaoPrimario,
  sxBotaoSecundario,
  sxCartaoDashboard,
} from "../../components/DashboardLayout";
import type { GravidadeAviso } from "../../components/DashboardLayout";
import type { DetalheAlunoAtencaoProfessor } from "../../models/home-professor-model";
import { formatarDataPtBr, formatarPontos, ROTULO_TIPO_AVALIACAO, type TipoAvaliacaoVisual } from "../../utils/avaliacao";
import { corFrequencia, corMedia, corTexto } from "./aluno/estilos-risco";
import { fmtPct } from "./aluno/regras-dashboard-aluno";
import { nivelVisual } from "./professor/regras-dashboard-professor";

interface AlunoDetalhesDrawerProps {
  open: boolean;
  carregando: boolean;
  erro: string;
  detalhe: DetalheAlunoAtencaoProfessor | null;
  onClose: () => void;
  onLancarNotas?: () => void;
  onRegistrarFrequencia?: () => void;
}

const GRAVIDADE: Record<DetalheAlunoAtencaoProfessor["pontosAtencao"][number]["severidade"], GravidadeAviso> = {
  CRITICO: "alta",
  ATENCAO: "media",
  INFORMATIVO: "info",
};

const numero = (valor: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(valor);
const rotuloTipo = (tipo: string) => ROTULO_TIPO_AVALIACAO[tipo as TipoAvaliacaoVisual] ?? tipo;

function Carregando() {
  return (
    <Stack gap={2} aria-label="Carregando detalhes do aluno" aria-busy="true">
      <Skeleton variant="rounded" height={56} />
      <Grid container spacing={1.25}>
        {[1, 2, 3, 4].map((item) => <Grid key={item} size={6}><Skeleton variant="rounded" height={92} /></Grid>)}
      </Grid>
      <Skeleton variant="rounded" height={260} />
    </Stack>
  );
}

/** "Consultar detalhes" do professor: mesmo painel lateral do detalhe de disciplina do aluno. */
export default function AlunoDetalhesDrawer({ open, carregando, erro, detalhe, onClose, onLancarNotas, onRegistrarFrequencia }: AlunoDetalhesDrawerProps) {
  const resumo = detalhe?.resumo;

  return (
    <PainelDetalhe
      aberto={open}
      onFechar={onClose}
      icone={UserRound}
      titulo={detalhe?.aluno.nome ?? "Detalhes do aluno"}
      subtitulo={detalhe ? `Matrícula ${detalhe.aluno.matricula} · ${detalhe.contexto.disciplina.nome} · ${detalhe.contexto.turma.sigla}` : undefined}
      contexto={detalhe ? `${detalhe.contexto.curso.nome} · Período ${detalhe.contexto.periodo.codigo}` : undefined}
      selo={resumo ? <SeloRisco nivel={nivelVisual(resumo.nivel)} titulo={resumo.motivo} /> : undefined}
      rotuloFechar="Fechar detalhes do aluno"
      acoes={detalhe && (onLancarNotas || onRegistrarFrequencia) ? (
        <>
          {onLancarNotas && (
            <Button endIcon={<ArrowRight size={15} />} onClick={onLancarNotas} sx={{ ...sxBotaoPrimario, height: 36, px: 2 }}>
              Lançar notas
            </Button>
          )}
          {onRegistrarFrequencia && (
            <Button endIcon={<ArrowRight size={15} />} onClick={onRegistrarFrequencia} sx={{ ...sxBotaoSecundario, height: 36, px: 2 }}>
              Registrar frequência
            </Button>
          )}
        </>
      ) : undefined}
    >
      {carregando && <Carregando />}
      {!carregando && erro && <AvisoDetalhe gravidade="alta">{erro}</AvisoDetalhe>}

      {!carregando && detalhe && resumo && (
        <>
          <Grid container spacing={1.25}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MetricaDetalhe titulo="Média parcial" valor={fmtPct(resumo.media, 1)} apoio={`referência de ${detalhe.criterios.mediaMinima}%`} cor={corTexto(corMedia(resumo.media))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MetricaDetalhe titulo="Frequência" valor={fmtPct(resumo.frequencia, 1)} apoio={`mínimo de ${detalhe.criterios.frequenciaMinima}%`} cor={corTexto(corFrequencia(resumo.frequencia))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MetricaDetalhe titulo="Presenças · faltas" valor={`${resumo.presencas} · ${resumo.faltas}`} apoio={`${resumo.totalAulas} chamadas`} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MetricaDetalhe titulo="Notas lançadas" valor={`${resumo.avaliacoesLancadas}/${resumo.totalAvaliacoes}`} apoio="avaliações com nota" />
            </Grid>
          </Grid>

          <SecaoDetalhe titulo="Pontos de atenção">
            <Stack gap={1}>
              {detalhe.pontosAtencao.length ? (
                detalhe.pontosAtencao.map((ponto) => (
                  <AvisoDetalhe key={ponto.id} gravidade={GRAVIDADE[ponto.severidade]} titulo={ponto.titulo}>{ponto.descricao}</AvisoDetalhe>
                ))
              ) : (
                <AvisoDetalhe gravidade="ok">Nenhum ponto de atenção com os dados atuais.</AvisoDetalhe>
              )}
            </Stack>
          </SecaoDetalhe>

          <SecaoDetalhe titulo="Desempenho por competência">
            {detalhe.competencias.length ? (
              <Stack gap={1}>
                {detalhe.competencias.map((competencia) => (
                  <Box key={competencia.id} sx={{ ...sxCartaoDashboard, p: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                      <Box minWidth={0}>
                        <Typography variant="body2" fontWeight={700}>{competencia.codigo} · {competencia.nome}</Typography>
                        <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado }}>Cobertura de {fmtPct(competencia.cobertura, 1)}</Typography>
                      </Box>
                      <Chip size="small" color={competencia.classificacao === "DIFICULDADE" ? "error" : competencia.classificacao === "ATENCAO" ? "warning" : competencia.classificacao === "ADEQUADO" ? "success" : "default"} label={competencia.classificacao === "DIFICULDADE" ? "Dificuldade" : competencia.classificacao === "ATENCAO" ? "Atenção" : competencia.classificacao === "ADEQUADO" ? "Adequado" : "Dados insuficientes"} />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" mt={1}><Typography variant="caption">Aproveitamento</Typography><Typography variant="caption" fontWeight={700}>{fmtPct(competencia.media, 1)}</Typography></Stack>
                    <LinearProgress variant="determinate" value={competencia.media ?? 0} color={competencia.classificacao === "DIFICULDADE" ? "error" : competencia.classificacao === "ATENCAO" ? "warning" : "primary"} sx={{ mt: .5, height: 4, borderRadius: 4 }} />
                    <Typography variant="caption" display="block" mt={.75} sx={{ color: CORES_DASHBOARD.textoApagado }}>{competencia.fontes.length ? competencia.fontes.map((fonte) => `${fonte.titulo} (${fonte.pesoPercentual}%)`).join(" · ") : "Nenhuma avaliação mapeada"}</Typography>
                  </Box>
                ))}
              </Stack>
            ) : <AvisoDetalhe gravidade="info">Nenhum resultado por competência disponível para este aluno.</AvisoDetalhe>}
          </SecaoDetalhe>

          <SecaoDetalhe titulo="Notas por avaliação">
            <Box sx={{ ...sxCartaoDashboard, overflow: "hidden" }}>
              {detalhe.avaliacoes.length ? (
                <Stack divider={<Box sx={{ borderTop: `1px solid ${CORES_DASHBOARD.borda}` }} />}>
                  {detalhe.avaliacoes.map((avaliacao) => {
                    const lancada = avaliacao.status === "LANCADA";
                    return (
                      <Box key={avaliacao.id} px={1.75} py={1.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
                          <Box minWidth={0}>
                            <Typography variant="body2" fontWeight={700}>{avaliacao.titulo}</Typography>
                            <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado }}>
                              {rotuloTipo(avaliacao.tipo)}{avaliacao.dataDevolucao ? ` · devolução ${formatarDataPtBr(avaliacao.dataDevolucao).slice(0, 5)}` : ""}
                            </Typography>
                          </Box>
                          <Stack alignItems="flex-end" flexShrink={0} gap={0.25}>
                            <Typography variant="body2" fontWeight={700}>
                              {lancada && avaliacao.nota !== null ? `${numero(avaliacao.nota)} / ${numero(avaliacao.valor)}` : formatarPontos(avaliacao.valor)}
                            </Typography>
                            <Chip
                              size="small"
                              label={lancada ? "Nota lançada" : "Nota não lançada"}
                              sx={{
                                height: 20,
                                fontSize: 12,
                                fontWeight: 700,
                                bgcolor: ESTADOS.neutro.fundo,
                                color: lancada ? CORES_DASHBOARD.texto : CORES_DASHBOARD.textoApagado,
                              }}
                            />
                          </Stack>
                        </Stack>
                        {lancada && avaliacao.percentual !== null && (
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(avaliacao.percentual, 100)}
                            aria-label={`Aproveitamento de ${avaliacao.titulo}: ${fmtPct(avaliacao.percentual, 1)}`}
                            sx={{ mt: 1, height: 4, borderRadius: 4, bgcolor: ESTADOS.neutro.fundo, "& .MuiLinearProgress-bar": { borderRadius: 4, bgcolor: avaliacao.percentual < detalhe.criterios.mediaMinima ? ESTADOS.atencao.ponto : CORES_DASHBOARD.acento } }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="body2" p={2} sx={{ color: CORES_DASHBOARD.textoApagado }}>Nenhuma avaliação cadastrada.</Typography>
              )}
            </Box>
          </SecaoDetalhe>
        </>
      )}
    </PainelDetalhe>
  );
}
