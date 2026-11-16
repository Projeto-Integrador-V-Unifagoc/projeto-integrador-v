import { Box, Button, Stack, Typography } from "@mui/material";
import { BookOpen, Calculator, Cpu, Database, MessageSquareText, Network, SquareTerminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  BotaoIa,
  CORES_DASHBOARD,
  DashboardPainel,
  PESO,
  SeloRisco,
  TIPO_DASHBOARD,
  sxBotaoSecundario,
  sxIconeQuadrado,
  sxNumeroColuna,
  sxTabelaLeve,
  sxRotuloColuna,
} from "../../../components/DashboardLayout";
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

// Colunas: disciplina | média | frequência | ações.
const TABELA = sxTabelaLeve("minmax(0, 1fr) 64px 64px auto");

export default function TabelaDisciplinasAluno({ disciplinas, onDetalhes, onBoletim, onEntender }: TabelaDisciplinasAlunoProps) {
  return (
    <DashboardPainel titulo="Minhas disciplinas" contador={disciplinas.length || undefined} acao={{ rotulo: "Boletim completo", onClick: onBoletim }} semPadding>
      {disciplinas.length ? (
        <Box sx={TABELA.tabela}>
          {/* Rótulos das colunas uma vez só, em vez de "Média"/"Freq." repetidos em cada linha. */}
          <Box aria-hidden="true" sx={TABELA.cabecalho}>
            <span>Disciplina</span>
            <Box component="span" textAlign="right">Média</Box>
            <Box component="span" textAlign="right">Freq.</Box>
            <span />
          </Box>
          <Box component="ul" sx={TABELA.lista}>
            {disciplinas.map((disciplina) => {
              const Icone = iconeDaDisciplina(disciplina.codigo);
              return (
                <Box key={disciplina.turmaDisciplinaId} component="li" aria-label={disciplina.nome} sx={TABELA.linha}>
                  <Stack direction="row" gap={1.5} alignItems="center" minWidth={0}>
                    <Box aria-hidden="true" sx={sxIconeQuadrado()}>
                      <Icone size={15} />
                    </Box>
                    <Box minWidth={0}>
                      <Typography title={disciplina.nome} sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {disciplina.nome}
                      </Typography>
                      <Stack direction="row" alignItems="center" gap={1} mt={0.25} minWidth={0}>
                        <SeloRisco nivel={disciplina.nivel} titulo={disciplina.motivos.join(" · ")} />
                        <Typography noWrap title={disciplina.professorNome} sx={{ fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado }}>
                          {disciplina.professorNome}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                  <Typography sx={{ ...sxNumeroColuna, color: corTexto(corMedia(disciplina.media)), textAlign: { xs: "left", sm: "right" } }}>
                    <Box component="span" sx={sxRotuloColuna}>Média</Box>
                    {fmtPct(disciplina.media, 1)}
                  </Typography>
                  <Typography sx={{ ...sxNumeroColuna, color: corTexto(corFrequencia(disciplina.frequencia)), textAlign: { xs: "left", sm: "right" } }}>
                    <Box component="span" sx={sxRotuloColuna}>Frequência</Box>
                    {fmtPct(disciplina.frequencia, 1)}
                  </Typography>
                  <Stack direction="row" gap={0.75} justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
                    <Button size="small" onClick={() => onDetalhes(disciplina.turmaDisciplinaId)} aria-label={`Consultar detalhes de ${disciplina.nome}`} sx={sxBotaoSecundario}>
                      Consultar detalhes
                    </Button>
                    <BotaoIa rotulo="Entender meu desempenho" compacto onClick={onEntender ? () => onEntender(disciplina) : undefined} />
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Box>
      ) : (
        <Stack minHeight={160} alignItems="center" justifyContent="center" gap={1} sx={{ color: CORES_DASHBOARD.textoApagado }}>
          <BookOpen size={24} aria-hidden="true" />
          <Typography sx={{ fontSize: TIPO_DASHBOARD.corpo }}>Nenhuma disciplina ativa no período atual.</Typography>
        </Stack>
      )}
    </DashboardPainel>
  );
}
