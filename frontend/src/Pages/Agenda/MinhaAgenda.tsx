import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Skeleton, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { ArrowLeft, CalendarDays, CheckCircle2, RefreshCw } from "lucide-react";
import {
  ALTURA_LINHA,
  CORES_DASHBOARD,
  DashboardPainel,
  ESTADOS,
  IconeTipoAvaliacao,
  LinhaPainel,
  ListaPainel,
  PESO,
  PaginaCabecalho,
  PaginaPadrao,
  TIPO_DASHBOARD,
  sxBotaoSecundario,
  sxBotaoTexto,
  sxSelo,
} from "../../components/DashboardLayout";
import type { TomEstado } from "../../components/DashboardLayout";
import type { TarefaAluno, TipoTarefa } from "../../models/home-aluno-model";
import { homeAlunoApi } from "../../services/home-aluno-api";
import { formatarPontos, ROTULO_TIPO_AVALIACAO } from "../../utils/avaliacao";
import { corPrazo, diasAte, filtrarTarefasPorJanela, type JanelaAgenda } from "./agenda-utils";

// Prazo como estado: vence hoje (ou passou) = crítico, até 3 dias = atenção, o resto neutro.
const TOM_PRAZO: Record<ReturnType<typeof corPrazo>, TomEstado> = { error: "critico", warning: "atencao", info: "neutro", default: "neutro" };

function dataResumida(dataIso: string) {
  const [ano, mes, dia] = dataIso.slice(0, 10).split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return {
    dia: String(dia).padStart(2, "0"),
    mes: new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(data).replace(".", ""),
  };
}

/** A data já está no bloco à esquerda: o selo mostra só o prazo relativo. */
function rotuloPrazo(dataIso: string) {
  const dias = diasAte(dataIso);
  if (dias < 0) return "Prazo passou";
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Amanhã";
  return `Em ${dias} dias`;
}

function ItemAgenda({ tarefa }: { tarefa: TarefaAluno }) {
  const data = dataResumida(tarefa.dataVencimento);
  const tipo = tarefa.tipo as TipoTarefa;
  const tom = TOM_PRAZO[corPrazo(tarefa.dataVencimento)];
  return (
    <LinhaPainel rotulo={`${tarefa.titulo} — ${tarefa.disciplinaNome}`}>
      <Box aria-hidden="true" sx={{ width: 44, flexShrink: 0, py: 0.5, borderRadius: 2, border: `1px solid ${CORES_DASHBOARD.borda}`, textAlign: "center" }}>
        <Typography sx={{ fontSize: TIPO_DASHBOARD.legenda, lineHeight: 1.3, color: CORES_DASHBOARD.textoApagado }}>{data.mes}</Typography>
        <Typography sx={{ fontSize: 18, fontWeight: PESO.forte, lineHeight: 1.2 }}>{data.dia}</Typography>
      </Box>
      <Box flex={1} minWidth={0}>
        <Typography noWrap title={tarefa.titulo} sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte }}>{tarefa.titulo}</Typography>
        <Stack direction="row" alignItems="center" gap={0.75} mt={0.25} minWidth={0} sx={{ color: CORES_DASHBOARD.textoApagado }}>
          <IconeTipoAvaliacao tipo={tipo} />
          <Typography noWrap sx={{ fontSize: TIPO_DASHBOARD.legenda }}>
            {tarefa.disciplinaNome} · {ROTULO_TIPO_AVALIACAO[tipo] ?? tarefa.tipo} · {formatarPontos(tarefa.valor)}
          </Typography>
        </Stack>
      </Box>
      <Box component="span" sx={sxSelo(tom, { ponto: tom !== "neutro" })}>{rotuloPrazo(tarefa.dataVencimento)}</Box>
    </LinhaPainel>
  );
}

const sxSegmentado = {
  "& .MuiToggleButton-root": {
    height: 30,
    px: 1.25,
    textTransform: "none",
    fontSize: TIPO_DASHBOARD.secundario,
    fontWeight: PESO.forte,
    color: CORES_DASHBOARD.textoSuave,
    borderColor: CORES_DASHBOARD.bordaControle,
    "&.Mui-selected, &.Mui-selected:hover": { bgcolor: CORES_DASHBOARD.superficieSutil, color: CORES_DASHBOARD.texto },
  },
} as const;

export default function MinhaAgenda() {
  const navigate = useNavigate();
  const [tarefas, setTarefas] = useState<TarefaAluno[]>([]);
  const [janela, setJanela] = useState<JanelaAgenda>("todas");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string>();

  const carregar = useCallback(async () => {
    setErro(undefined);
    setCarregando(true);
    try {
      setTarefas(await homeAlunoApi.minhasTarefas());
    } catch {
      setErro("Não foi possível carregar sua agenda acadêmica.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const tarefasVisiveis = useMemo(() => filtrarTarefasPorJanela(tarefas, janela), [tarefas, janela]);
  const totalSeteDias = filtrarTarefasPorJanela(tarefas, 7).length;
  const totalTrintaDias = filtrarTarefasPorJanela(tarefas, 30).length;

  return (
    <PaginaPadrao>
      <PaginaCabecalho
        titulo="Minha agenda"
        subtitulo="Avaliações futuras organizadas por prazo."
        icone={CalendarDays}
        acoes={<Button startIcon={<ArrowLeft size={15} />} onClick={() => navigate("/home")} sx={sxBotaoTexto}>Voltar ao início</Button>}
      />

      {erro && (
        <Alert severity="error" action={<Button color="inherit" onClick={() => void carregar()} startIcon={<RefreshCw size={15} />} sx={{ width: "auto" }}>Tentar novamente</Button>}>
          {erro}
        </Alert>
      )}

      <DashboardPainel
        titulo="Avaliações programadas"
        contador={carregando ? undefined : tarefasVisiveis.length}
        subtitulo={carregando ? undefined : `${totalSeteDias} em 7 dias · ${totalTrintaDias} em 30 dias`}
        extra={(
          <ToggleButtonGroup
            exclusive
            size="small"
            value={janela}
            onChange={(_evento, valor: JanelaAgenda | null) => valor && setJanela(valor)}
            aria-label="Período da agenda"
            sx={sxSegmentado}
          >
            <ToggleButton value={7} aria-label="Avaliações dos próximos 7 dias">7 dias</ToggleButton>
            <ToggleButton value={30} aria-label="Avaliações dos próximos 30 dias">30 dias</ToggleButton>
            <ToggleButton value="todas" aria-label="Todas as avaliações futuras">Todas</ToggleButton>
          </ToggleButtonGroup>
        )}
        semPadding
      >
        {carregando ? (
          <Stack aria-label="Carregando agenda" aria-busy="true" gap={0.5} p={2}>
            {[0, 1, 2, 3].map((item) => <Skeleton key={item} variant="rounded" height={ALTURA_LINHA - 8} />)}
          </Stack>
        ) : erro && !tarefas.length ? (
          <Stack minHeight={240} alignItems="center" justifyContent="center" textAlign="center" px={2}>
            <Typography sx={{ fontSize: TIPO_DASHBOARD.secundario, color: CORES_DASHBOARD.textoApagado, maxWidth: 420 }}>
              Sua agenda não pôde ser carregada. Use “Tentar novamente” acima.
            </Typography>
          </Stack>
        ) : tarefasVisiveis.length ? (
          <ListaPainel rotulo="Avaliações programadas">
            {tarefasVisiveis.map((tarefa) => <ItemAgenda key={tarefa.avaliacaoId} tarefa={tarefa} />)}
          </ListaPainel>
        ) : (
          <Stack minHeight={240} alignItems="center" justifyContent="center" textAlign="center" gap={0.75} px={2}>
            <CheckCircle2 size={24} color={ESTADOS.ok.ponto} aria-hidden="true" />
            <Typography sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte }}>Nenhuma avaliação neste período</Typography>
            <Typography sx={{ fontSize: TIPO_DASHBOARD.secundario, color: CORES_DASHBOARD.textoApagado, maxWidth: 420 }}>
              {janela === "todas" ? "Novas avaliações aparecerão aqui quando forem publicadas." : `Não há avaliações previstas para os próximos ${janela} dias.`}
            </Typography>
            {janela !== "todas" && <Button onClick={() => setJanela("todas")} sx={{ ...sxBotaoSecundario, mt: 0.5 }}>Ver todas as futuras</Button>}
          </Stack>
        )}
      </DashboardPainel>
    </PaginaPadrao>
  );
}
