import { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { CheckCircle2 } from "lucide-react";
import {
  BotaoIa,
  CORES_DASHBOARD,
  DashboardPainel,
  ESTADOS,
  PESO,
  SeloRisco,
  TIPO_DASHBOARD,
  sxBotaoSecundario,
  sxIconeQuadrado,
  sxNumeroColuna,
  sxTabelaLeve,
} from "../../../components/DashboardLayout";
import { corFrequencia, corMedia, corTexto } from "../aluno/estilos-risco";
import { fmtPct } from "../aluno/regras-dashboard-aluno";
import { nivelVisual } from "./regras-dashboard-professor";
import type { AlunoEmAtencao } from "./regras-dashboard-professor";

// Quatro linhas, como as listas da referência: o resto fica em "Ver todos" e a primeira linha de painéis cabe na primeira tela.
const VISIVEIS = 4;

const iniciais = (nome: string) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join("");

interface AlunosAtencaoPainelProps {
  alunos: AlunoEmAtencao[];
  onConsultar: (turmaDisciplinaId: string, alunoId: string) => void;
  /** Abre o assistente com a ação "analisar_aluno". Sem ela, o botão fica inerte. */
  onAnalisar?: (aluno: AlunoEmAtencao) => void;
}

// Mesmas colunas da lista de disciplinas do aluno: nome | média | frequência | ações.
const TABELA = sxTabelaLeve("minmax(0, 1fr) 64px 64px auto");

export default function AlunosAtencaoPainel({ alunos, onConsultar, onAnalisar }: AlunosAtencaoPainelProps) {
  const [expandido, setExpandido] = useState(false);
  const lista = expandido ? alunos : alunos.slice(0, VISIVEIS);

  return (
    <DashboardPainel
      titulo="Alunos em atenção"
      contador={alunos.length || undefined}
      acao={alunos.length > VISIVEIS ? { rotulo: expandido ? "Mostrar menos" : "Ver todos", onClick: () => setExpandido((valor) => !valor) } : undefined}
      // Cabeçalho das colunas + 4 linhas: o painel mantém o tamanho quando o filtro traz menos alunos.
      alturaMinima={32 + VISIVEIS * 57}
      semPadding
    >
      {lista.length ? (
        <Box sx={TABELA.tabela}>
          <Box aria-hidden="true" sx={TABELA.cabecalho}>
            <span>Aluno</span>
            <Box component="span" textAlign="right">Média</Box>
            <Box component="span" textAlign="right">Freq.</Box>
            <span />
          </Box>
          <Box component="ul" sx={TABELA.lista}>
            {lista.map((aluno) => {
              const tom = aluno.nivel === "CRITICO" ? ESTADOS.critico : ESTADOS.atencao;
              return (
                <Box
                  key={aluno.chave}
                  component="li"
                  aria-label={`${aluno.nome} — ${aluno.disciplinaNome}`}
                  sx={TABELA.linha}
                >
                  <Stack direction="row" gap={1.5} alignItems="center" minWidth={0}>
                    <Box aria-hidden="true" sx={{ ...sxIconeQuadrado(tom, 32), borderRadius: "50%", fontSize: TIPO_DASHBOARD.legenda, fontWeight: PESO.forte }}>
                      {iniciais(aluno.nome)}
                    </Box>
                    <Box minWidth={0}>
                      <Typography title={aluno.nome} sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{aluno.nome}</Typography>
                      <Stack direction="row" alignItems="center" gap={1} mt={0.25} minWidth={0}>
                        <SeloRisco nivel={nivelVisual(aluno.nivel)} titulo={aluno.motivo} />
                        <Typography noWrap title={`${aluno.disciplinaNome} · ${aluno.turmaSigla}`} sx={{ fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado }}>
                          {aluno.disciplinaNome} · {aluno.turmaSigla}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                  <Typography aria-label={`Média ${fmtPct(aluno.media, 1)}`} sx={{ ...sxNumeroColuna, color: corTexto(corMedia(aluno.media)), textAlign: { xs: "left", sm: "right" } }}>
                    {fmtPct(aluno.media, 1)}
                  </Typography>
                  <Typography aria-label={`Frequência ${fmtPct(aluno.frequencia, 1)}`} sx={{ ...sxNumeroColuna, color: corTexto(corFrequencia(aluno.frequencia)), textAlign: { xs: "left", sm: "right" } }}>
                    {fmtPct(aluno.frequencia, 1)}
                  </Typography>
                  <Stack direction="row" gap={0.75} justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
                    <Button size="small" onClick={() => onConsultar(aluno.turmaDisciplinaId, aluno.id)} aria-label={`Consultar detalhes de ${aluno.nome}`} sx={sxBotaoSecundario}>
                      Consultar detalhes
                    </Button>
                    <BotaoIa rotulo="Analisar com IA" compacto onClick={onAnalisar ? () => onAnalisar(aluno) : undefined} />
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Box>
      ) : (
        <Stack minHeight={160} alignItems="center" justifyContent="center" textAlign="center" gap={0.75} px={2}>
          <CheckCircle2 size={24} color={ESTADOS.ok.ponto} aria-hidden="true" />
          <Typography sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte }}>Nenhum aluno em atenção</Typography>
          <Typography sx={{ fontSize: TIPO_DASHBOARD.secundario, color: CORES_DASHBOARD.textoApagado }}>Todos dentro dos critérios de nota e frequência.</Typography>
        </Stack>
      )}
    </DashboardPainel>
  );
}
