import { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { CheckCircle2 } from "lucide-react";
import { BotaoIa, CORES_DASHBOARD, DashboardPainel, SeloRisco } from "../../../components/DashboardLayout";
import { corFrequencia, corMedia, corTexto } from "../aluno/estilos-risco";
import { fmtPct } from "../aluno/regras-dashboard-aluno";
import { nivelVisual } from "./regras-dashboard-professor";
import type { AlunoEmAtencao } from "./regras-dashboard-professor";

const VISIVEIS = 5;

const iniciais = (nome: string) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join("");

interface AlunosAtencaoPainelProps {
  alunos: AlunoEmAtencao[];
  onConsultar: (turmaDisciplinaId: string, alunoId: string) => void;
  /** Abre o assistente com a ação "analisar_aluno". Sem ela, o botão fica inerte. */
  onAnalisar?: (aluno: AlunoEmAtencao) => void;
}

export default function AlunosAtencaoPainel({ alunos, onConsultar, onAnalisar }: AlunosAtencaoPainelProps) {
  const theme = useTheme();
  const [expandido, setExpandido] = useState(false);
  const lista = expandido ? alunos : alunos.slice(0, VISIVEIS);

  return (
    <DashboardPainel
      titulo="Alunos em atenção acadêmica"
      contador={alunos.length || undefined}
      subtitulo="Ordenados por risco · passe o cursor no selo para ver o motivo"
      acao={alunos.length > VISIVEIS ? { rotulo: expandido ? "Mostrar menos" : `Ver todos os ${alunos.length} alunos`, onClick: () => setExpandido((valor) => !valor) } : undefined}
    >
      {lista.length ? (
        <Stack divider={<Box sx={{ borderTop: `1px solid ${CORES_DASHBOARD.borda}` }} />}>
          {lista.map((aluno) => {
            const critico = aluno.nivel === "CRITICO";
            const cor = critico ? theme.palette.error : theme.palette.warning;
            return (
              <Box
                key={aluno.chave}
                component="article"
                aria-label={`${aluno.nome} — ${aluno.disciplinaNome}`}
                sx={{
                  py: 1.5,
                  display: "grid",
                  alignItems: "center",
                  gap: { xs: 1.25, md: 2 },
                  gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto", xl: "minmax(0, 1fr) auto auto" },
                }}
              >
                <Stack direction="row" gap={1.5} alignItems="center" minWidth={0}>
                  <Box aria-hidden="true" sx={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800, bgcolor: alpha(cor.main, 0.12), color: cor.dark }}>
                    {iniciais(aluno.nome)}
                  </Box>
                  <Box minWidth={0}>
                    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                      <Typography fontWeight={700} noWrap title={aluno.nome}>{aluno.nome}</Typography>
                      <SeloRisco nivel={nivelVisual(aluno.nivel)} titulo={aluno.motivo} />
                    </Stack>
                    {/* O motivo repete a média/frequência das colunas ao lado; fica no tooltip do selo. */}
                    <Typography variant="body2" noWrap title={`${aluno.disciplinaNome} · ${aluno.turmaSigla}`} sx={{ color: CORES_DASHBOARD.textoApagado }}>
                      {aluno.disciplinaNome} · {aluno.turmaSigla}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" gap={2} justifyContent={{ md: "flex-end" }}>
                  <Box minWidth={56}>
                    <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado, textTransform: "uppercase", fontSize: 11 }}>Média</Typography>
                    <Typography fontWeight={700} sx={{ color: corTexto(corMedia(aluno.media)) }}>{fmtPct(aluno.media, 1)}</Typography>
                  </Box>
                  <Box minWidth={56}>
                    <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado, textTransform: "uppercase", fontSize: 11 }}>Freq.</Typography>
                    <Typography fontWeight={700} sx={{ color: corTexto(corFrequencia(aluno.frequencia)) }}>{fmtPct(aluno.frequencia, 1)}</Typography>
                  </Box>
                </Stack>

                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ gridColumn: { md: "1 / -1", xl: "auto" } }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onConsultar(aluno.turmaDisciplinaId, aluno.id)}
                    aria-label={`Consultar detalhes de ${aluno.nome}`}
                    sx={{ width: "auto", height: 32, whiteSpace: "nowrap", borderColor: CORES_DASHBOARD.borda, color: "text.primary" }}
                  >
                    Consultar detalhes
                  </Button>
                  <BotaoIa rotulo="Analisar com IA" compacto onClick={onAnalisar ? () => onAnalisar(aluno) : undefined} />
                </Stack>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Stack minHeight={160} alignItems="center" justifyContent="center" textAlign="center" gap={1}>
          <CheckCircle2 size={30} color={theme.palette.success.main} aria-hidden="true" />
          <Typography fontWeight={700}>Nenhum aluno em atenção</Typography>
          <Typography variant="body2" sx={{ color: CORES_DASHBOARD.textoApagado }}>Todos dentro dos critérios de nota e frequência.</Typography>
        </Stack>
      )}
    </DashboardPainel>
  );
}
