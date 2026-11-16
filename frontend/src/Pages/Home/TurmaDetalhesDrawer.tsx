import { Box, Button, Chip, Grid, Stack, Typography } from "@mui/material";
import { ArrowRight, ChevronRight, Users } from "lucide-react";
import {
  AvisoDetalhe,
  CORES_DASHBOARD,
  MetricaDetalhe,
  PainelDetalhe,
  SecaoDetalhe,
  SeloRisco,
  sxCartaoDashboard,
} from "../../components/DashboardLayout";
import type { DetalheAtribuicaoProfessor } from "../../models/home-professor-model";
import { corFrequencia, corMedia, corTexto } from "./aluno/estilos-risco";
import { fmtPct } from "./aluno/regras-dashboard-aluno";
import { nivelVisual } from "./professor/regras-dashboard-professor";

interface TurmaDetalhesDrawerProps {
  detalhe: DetalheAtribuicaoProfessor | null;
  onFechar: () => void;
  /** Clique num aluno da lista: abre o detalhe do aluno nesta turma/disciplina. */
  onAbrirAluno: (turmaDisciplinaId: string, alunoId: string) => void;
  onLancarNotas: () => void;
  onRegistrarFrequencia: () => void;
}

const ORDEM = ["CRITICO", "ATENCAO", "SEM_DADOS", "REGULAR"];

/** Detalhe da turma (card de "Minhas turmas"), no mesmo painel lateral dos outros detalhes do dashboard. */
export default function TurmaDetalhesDrawer({ detalhe, onFechar, onAbrirAluno, onLancarNotas, onRegistrarFrequencia }: TurmaDetalhesDrawerProps) {
  if (!detalhe) return null;
  // Alunos em atenção primeiro; dentro do mesmo nível, pelo nome.
  const alunos = [...detalhe.alunos].sort((a, b) => ORDEM.indexOf(a.nivel) - ORDEM.indexOf(b.nivel) || a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <PainelDetalhe
      aberto
      onFechar={onFechar}
      icone={Users}
      titulo={detalhe.disciplina.nome}
      subtitulo={`${detalhe.disciplina.codigo} · ${detalhe.turma.sigla} · ${detalhe.curso.nome}`}
      contexto={`Período ${detalhe.periodo.codigo} · Carga horária: ${detalhe.disciplina.cargaHoraria}h`}
      rotuloFechar="Fechar detalhes da turma"
      acoes={(
        <>
          <Button variant="contained" disableElevation endIcon={<ArrowRight size={16} />} onClick={onLancarNotas} sx={{ minWidth: 170, bgcolor: CORES_DASHBOARD.acento, "&:hover": { bgcolor: CORES_DASHBOARD.acentoHover } }}>
            Lançar notas
          </Button>
          <Button variant="outlined" endIcon={<ArrowRight size={16} />} onClick={onRegistrarFrequencia} sx={{ minWidth: 170, borderColor: CORES_DASHBOARD.borda, color: "text.primary" }}>
            Registrar frequência
          </Button>
        </>
      )}
    >
      <Grid container spacing={1.25}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricaDetalhe titulo="Alunos" valor={String(detalhe.totalAlunos)} apoio={`${detalhe.alunosComNota} com nota`} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricaDetalhe titulo="Média da turma" valor={fmtPct(detalhe.mediaTurma, 1)} apoio="referência de 60%" cor={corTexto(corMedia(detalhe.mediaTurma))} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricaDetalhe titulo="Frequência" valor={fmtPct(detalhe.frequenciaMedia, 1)} apoio="mínimo de 75%" cor={corTexto(corFrequencia(detalhe.frequenciaMedia))} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricaDetalhe titulo="Em atenção" valor={String(detalhe.alunosEmAtencao)} apoio={detalhe.lancamentosPendentes ? `${detalhe.lancamentosPendentes} ${detalhe.lancamentosPendentes === 1 ? "lançamento atrasado" : "lançamentos atrasados"}` : "sem lançamentos atrasados"} cor={detalhe.alunosEmAtencao ? corTexto("warning") : undefined} />
        </Grid>
      </Grid>

      <SecaoDetalhe titulo="Competências planejadas">
        {detalhe.competencias.length ? (
          <Stack direction="row" gap={0.75} flexWrap="wrap">
            {detalhe.competencias.map((item) => (
              <Chip
                key={item.id}
                size="small"
                label={`${item.codigo} · ${item.nome} (${item.nivel_esperado.toLowerCase()})`}
                sx={{ bgcolor: CORES_DASHBOARD.acentoSuave, color: CORES_DASHBOARD.acento, fontWeight: 600 }}
              />
            ))}
          </Stack>
        ) : (
          <AvisoDetalhe gravidade="info">Nenhuma competência vinculada a esta disciplina.</AvisoDetalhe>
        )}
      </SecaoDetalhe>

      <SecaoDetalhe titulo="Alunos" extra={<Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado }}>clique para ver o detalhe</Typography>}>
        <Box sx={{ ...sxCartaoDashboard, overflow: "hidden" }}>
          {alunos.length ? (
            <Stack divider={<Box sx={{ borderTop: `1px solid ${CORES_DASHBOARD.borda}` }} />}>
              {alunos.map((aluno) => {
                const abrir = () => onAbrirAluno(detalhe.id, aluno.id);
                return (
                  <Box
                    key={aluno.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Consultar detalhes de ${aluno.nome}`}
                    onClick={abrir}
                    onKeyDown={(evento) => {
                      if (evento.key === "Enter" || evento.key === " ") {
                        evento.preventDefault();
                        abrir();
                      }
                    }}
                    sx={{
                      px: 1.75,
                      py: 1.25,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      cursor: "pointer",
                      "&:hover, &:focus-visible": { bgcolor: CORES_DASHBOARD.superficieSutil, outline: "none" },
                    }}
                  >
                    <Box flex={1} minWidth={0}>
                      <Typography variant="body2" fontWeight={700} noWrap>{aluno.nome}</Typography>
                      <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado }}>Matrícula {aluno.matricula}</Typography>
                    </Box>
                    <Box textAlign="right" minWidth={52}>
                      <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado, fontSize: 10.5, textTransform: "uppercase" }}>Média</Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ color: corTexto(corMedia(aluno.media)) }}>{fmtPct(aluno.media, 1)}</Typography>
                    </Box>
                    <Box textAlign="right" minWidth={52}>
                      <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado, fontSize: 10.5, textTransform: "uppercase" }}>Freq.</Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ color: corTexto(corFrequencia(aluno.frequencia)) }}>{fmtPct(aluno.frequencia, 1)}</Typography>
                    </Box>
                    <Box sx={{ display: { xs: "none", sm: "block" } }}>
                      <SeloRisco nivel={nivelVisual(aluno.nivel)} titulo={aluno.motivo} />
                    </Box>
                    <ChevronRight size={16} color={CORES_DASHBOARD.textoApagado} aria-hidden="true" />
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Typography variant="body2" p={2} sx={{ color: CORES_DASHBOARD.textoApagado }}>Nenhum aluno vinculado.</Typography>
          )}
        </Box>
      </SecaoDetalhe>
    </PainelDetalhe>
  );
}
