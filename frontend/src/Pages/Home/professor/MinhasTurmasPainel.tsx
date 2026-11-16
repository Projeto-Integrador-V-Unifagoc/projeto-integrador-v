import { Box, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CORES_DASHBOARD, DashboardPainel } from "../../../components/DashboardLayout";
import type { AtribuicaoProfessor } from "../../../models/home-professor-model";
import { fmtPct } from "../aluno/regras-dashboard-aluno";

interface MinhasTurmasPainelProps {
  atribuicoes: AtribuicaoProfessor[];
  /** Ofertas com pendência de nota ou chamada (para o ponto de status). */
  ofertasComPendencia: Set<string>;
  carregandoDetalhe: boolean;
  onAbrir: (atribuicao: AtribuicaoProfessor) => void;
  onAvaliacoes: () => void;
}

export default function MinhasTurmasPainel({ atribuicoes, ofertasComPendencia, carregandoDetalhe, onAbrir, onAvaliacoes }: MinhasTurmasPainelProps) {
  const theme = useTheme();
  return (
    <DashboardPainel titulo="Minhas turmas" contador={atribuicoes.length || undefined} acao={{ rotulo: "Avaliações", onClick: onAvaliacoes }}>
      {atribuicoes.length ? (
        <Stack gap={1.25}>
          {atribuicoes.map((item) => {
            const alerta = item.alunosEmAtencao > 0 || ofertasComPendencia.has(item.id);
            const abrir = () => { if (!carregandoDetalhe) onAbrir(item); };
            return (
              <Box
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`Abrir ${item.disciplina.nome} — ${item.turma.sigla}`}
                onClick={abrir}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter" || evento.key === " ") {
                    evento.preventDefault();
                    abrir();
                  }
                }}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${CORES_DASHBOARD.borda}`,
                  cursor: carregandoDetalhe ? "progress" : "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 1.5,
                  transition: "border-color .15s ease, background-color .15s ease",
                  "&:hover, &:focus-visible": { borderColor: CORES_DASHBOARD.acento, bgcolor: CORES_DASHBOARD.superficieSutil, outline: "none" },
                }}
              >
                <Box minWidth={0}>
                  <Stack direction="row" gap={0.75} alignItems="center">
                    <Typography variant="body2" fontWeight={700} sx={{ color: CORES_DASHBOARD.acento }}>{item.turma.sigla}</Typography>
                    <Box
                      component="span"
                      title={alerta ? "Há alunos em atenção ou lançamentos pendentes" : "Sem pendências"}
                      sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: alerta ? theme.palette.warning.main : theme.palette.success.main }}
                    />
                  </Stack>
                  <Typography fontWeight={700} noWrap title={item.disciplina.nome}>{item.disciplina.nome}</Typography>
                  <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado }}>
                    Média {fmtPct(item.mediaTurma, 1)} • Freq. {fmtPct(item.frequenciaMedia, 1)}
                    {item.alunosEmAtencao > 0 ? ` • ${item.alunosEmAtencao} em atenção` : ""}
                  </Typography>
                </Box>
                <Box textAlign="right" flexShrink={0}>
                  <Typography fontWeight={800} fontSize={20} lineHeight={1.2}>{item.totalAlunos}</Typography>
                  <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado }}>{item.totalAlunos === 1 ? "aluno" : "alunos"}</Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: CORES_DASHBOARD.textoApagado }}>Nenhuma oferta para o filtro selecionado.</Typography>
      )}
    </DashboardPainel>
  );
}
