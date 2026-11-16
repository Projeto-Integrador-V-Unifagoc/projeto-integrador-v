import { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { ChevronRight } from "lucide-react";
import { CORES_DASHBOARD, DashboardPainel, LinhaPainel, ListaPainel, PESO, TIPO_DASHBOARD, sxBotaoTexto, sxSelo } from "../../../components/DashboardLayout";
import type { AtribuicaoProfessor } from "../../../models/home-professor-model";
import { fmtPct } from "../aluno/regras-dashboard-aluno";

interface MinhasTurmasPainelProps {
  atribuicoes: AtribuicaoProfessor[];
  /** Ofertas com pendência de nota ou chamada. */
  ofertasComPendencia: Set<string>;
  carregandoDetalhe: boolean;
  onAbrir: (atribuicao: AtribuicaoProfessor) => void;
  onAvaliacoes: () => void;
}

// Com muitas ofertas a lista estica a linha de painéis; o resto aparece em "Mostrar todas".
const VISIVEIS = 5;

export default function MinhasTurmasPainel({ atribuicoes, ofertasComPendencia, carregandoDetalhe, onAbrir, onAvaliacoes }: MinhasTurmasPainelProps) {
  const [expandido, setExpandido] = useState(false);
  const lista = expandido ? atribuicoes : atribuicoes.slice(0, VISIVEIS);
  return (
    <DashboardPainel titulo="Minhas turmas" contador={atribuicoes.length || undefined} acao={{ rotulo: "Avaliações", onClick: onAvaliacoes }} semPadding alturaMinima={VISIVEIS * 56 + 40}>
      {atribuicoes.length > VISIVEIS && (
        <Button size="small" onClick={() => setExpandido((valor) => !valor)} sx={{ ...sxBotaoTexto, order: 1, alignSelf: "flex-start", mx: 1, my: 0.5, color: CORES_DASHBOARD.textoSuave }}>
          {expandido ? "Mostrar menos" : `Mostrar todas as ${atribuicoes.length}`}
        </Button>
      )}
      {atribuicoes.length ? (
        <ListaPainel rotulo="Minhas turmas">
          {lista.map((item) => {
            const abrir = () => { if (!carregandoDetalhe) onAbrir(item); };
            const pendente = ofertasComPendencia.has(item.id);
            return (
              <LinhaPainel key={item.id} rotulo={`Abrir ${item.disciplina.nome} — ${item.turma.sigla}`} onClick={abrir}>
                <Box flex={1} minWidth={0}>
                  <Typography noWrap title={item.disciplina.nome} sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte }}>
                    {item.disciplina.nome}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado }}>
                    {item.turma.sigla} · {item.totalAlunos} {item.totalAlunos === 1 ? "aluno" : "alunos"} · média {fmtPct(item.mediaTurma, 0)} · freq. {fmtPct(item.frequenciaMedia, 0)}
                  </Typography>
                </Box>
                <Stack direction="row" alignItems="center" gap={0.75} flexShrink={0}>
                  {item.alunosEmAtencao > 0 ? (
                    <Box component="span" sx={sxSelo("atencao", { ponto: true })}>{item.alunosEmAtencao} em atenção</Box>
                  ) : pendente ? (
                    <Box component="span" sx={sxSelo("neutro", { ponto: true })}>Pendência</Box>
                  ) : (
                    <Box component="span" sx={sxSelo("neutro")}>Em dia</Box>
                  )}
                  <ChevronRight size={16} color={CORES_DASHBOARD.iconeApagado} aria-hidden="true" />
                </Stack>
              </LinhaPainel>
            );
          })}
        </ListaPainel>
      ) : (
        <Typography sx={{ px: 2, py: 1.5, fontSize: TIPO_DASHBOARD.corpo, color: CORES_DASHBOARD.textoApagado }}>Nenhuma oferta para o filtro selecionado.</Typography>
      )}
    </DashboardPainel>
  );
}
