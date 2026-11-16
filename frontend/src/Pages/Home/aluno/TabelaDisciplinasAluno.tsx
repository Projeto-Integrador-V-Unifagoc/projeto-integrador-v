import { Box, Button, Stack, Typography } from "@mui/material";
import { BookOpen, Calculator, Cpu, Database, MessageSquareText, Network, SquareTerminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BotaoIa, CORES_DASHBOARD, DashboardPainel, SeloRisco } from "../../../components/DashboardLayout";
import { fmtPct } from "./regras-dashboard-aluno";
import type { DisciplinaPainel } from "./regras-dashboard-aluno";
import { corFrequencia, corMedia, corTexto } from "./estilos-risco";

const ICONES: LucideIcon[] = [SquareTerminal, Network, Calculator, Database, Cpu, MessageSquareText, BookOpen];

function iconeDaDisciplina(codigo: string) {
  const soma = [...codigo].reduce((total, letra) => total + letra.charCodeAt(0), 0);
  return ICONES[soma % ICONES.length];
}

interface TabelaDisciplinasAlunoProps {
  disciplinas: DisciplinaPainel[];
  onDetalhes: (turmaDisciplinaId: string) => void;
  onBoletim: () => void;
  /** Abre o assistente com a ação "entender_desempenho" da disciplina. Sem ela, o botão fica inerte. */
  onEntender?: (disciplina: DisciplinaPainel) => void;
}

function Indicador({ rotulo, valor, cor }: { rotulo: string; valor: number | null; cor: ReturnType<typeof corMedia> }) {
  return (
    <Box textAlign={{ xs: "left", md: "center" }} minWidth={56}>
      <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado, letterSpacing: 0.4, textTransform: "uppercase", fontSize: 11 }}>
        {rotulo}
      </Typography>
      <Typography fontWeight={700} sx={{ color: corTexto(cor) }}>{fmtPct(valor, 1)}</Typography>
    </Box>
  );
}

export default function TabelaDisciplinasAluno({ disciplinas, onDetalhes, onBoletim, onEntender }: TabelaDisciplinasAlunoProps) {
  return (
    <DashboardPainel
      titulo={`Minhas disciplinas (${disciplinas.length})`}
      subtitulo="Ordenadas por risco"
      acao={{ rotulo: "Boletim completo", onClick: onBoletim }}
    >
      {disciplinas.length ? (
        <Stack divider={<Box sx={{ borderTop: `1px solid ${CORES_DASHBOARD.borda}` }} />}>
          {disciplinas.map((disciplina) => {
            const Icone = iconeDaDisciplina(disciplina.codigo);
            return (
              <Box
                key={disciplina.turmaDisciplinaId}
                component="article"
                aria-label={disciplina.nome}
                sx={{
                  py: 1.5,
                  display: "grid",
                  alignItems: "center",
                  gap: { xs: 1.25, md: 2 },
                  gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto auto auto", xl: "minmax(0, 1fr) auto auto auto auto" },
                }}
              >
                <Stack direction="row" gap={1.5} alignItems="center" minWidth={0}>
                  <Box aria-hidden="true" sx={{ width: 38, height: 38, borderRadius: 2, flexShrink: 0, display: "grid", placeItems: "center", bgcolor: "#E6F6FB", color: CORES_DASHBOARD.acento }}>
                    <Icone size={18} />
                  </Box>
                  <Box minWidth={0}>
                    <Typography fontWeight={700} noWrap title={disciplina.nome}>{disciplina.nome}</Typography>
                    <Typography variant="body2" noWrap sx={{ color: CORES_DASHBOARD.textoApagado }} title={disciplina.professorNome}>
                      {disciplina.professorNome}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" gap={2}>
                  <Indicador rotulo="Média" valor={disciplina.media} cor={corMedia(disciplina.media)} />
                  <Indicador rotulo="Freq." valor={disciplina.frequencia} cor={corFrequencia(disciplina.frequencia)} />
                </Stack>

                <Box>
                  <SeloRisco nivel={disciplina.nivel} titulo={disciplina.motivos.join(" · ")} />
                </Box>

                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ gridColumn: { md: "1 / -1", xl: "auto" } }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onDetalhes(disciplina.turmaDisciplinaId)}
                    aria-label={`Consultar detalhes de ${disciplina.nome}`}
                    sx={{ width: "auto", height: 32, whiteSpace: "nowrap", borderColor: CORES_DASHBOARD.borda, color: "text.primary" }}
                  >
                    Consultar detalhes
                  </Button>
                  <BotaoIa rotulo="Entender meu desempenho" compacto onClick={onEntender ? () => onEntender(disciplina) : undefined} />
                </Stack>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Stack minHeight={160} alignItems="center" justifyContent="center" gap={1} sx={{ color: CORES_DASHBOARD.textoApagado }}>
          <BookOpen size={28} aria-hidden="true" />
          <Typography>Nenhuma disciplina ativa no período atual.</Typography>
        </Stack>
      )}
    </DashboardPainel>
  );
}
