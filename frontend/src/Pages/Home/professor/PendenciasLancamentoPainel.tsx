import { Box, Button, Stack, Typography } from "@mui/material";
import { CalendarCheck, CheckCircle2, ClipboardPen } from "lucide-react";
import {
  CORES_DASHBOARD,
  DashboardPainel,
  ESTADOS,
  LinhaPainel,
  ListaPainel,
  PESO,
  TIPO_DASHBOARD,
  sxBotaoPrimario,
  sxBotaoSecundario,
  sxIconeQuadrado,
} from "../../../components/DashboardLayout";
import { formatarDataPtBr } from "../../../utils/avaliacao";
import type { PendenciaLancamento } from "./regras-dashboard-professor";

// Quatro linhas, como as listas da referência: o resto fica em "Ir para lançamentos" e o painel não estica a segunda linha.
const VISIVEIS = 4;

interface PendenciasLancamentoPainelProps {
  pendencias: PendenciaLancamento[];
  onLancarNotas: () => void;
  onRegistrarPresenca: () => void;
}

/** Padrão "Needs your approval" da referência: tipo, contexto curto e uma ação à direita. */
export default function PendenciasLancamentoPainel({ pendencias, onLancarNotas, onRegistrarPresenca }: PendenciasLancamentoPainelProps) {
  const visiveis = pendencias.slice(0, VISIVEIS);

  return (
    <DashboardPainel
      titulo="Pendências de lançamento"
      contador={pendencias.length || undefined}
      subtitulo={pendencias.length > VISIVEIS ? `${VISIVEIS} mais urgentes` : undefined}
      acao={{ rotulo: "Ir para lançamentos", onClick: onLancarNotas }}
      alturaMinima={VISIVEIS * 54}
      semPadding
    >
      {visiveis.length ? (
        <ListaPainel rotulo="Pendências mais urgentes">
          {visiveis.map((item) => {
            const ehChamada = item.tipo === "chamada";
            const Icone = ehChamada ? CalendarCheck : ClipboardPen;
            const data = item.data ? formatarDataPtBr(item.data).slice(0, 5) : null;
            const titulo = ehChamada ? `Chamada de ${data}` : item.titulo;
            const faltam = ehChamada ? `Faltam ${item.faltantes} de ${item.esperados} registros` : `Faltam ${item.faltantes} de ${item.esperados} notas`;
            return (
              <LinhaPainel key={item.id} rotulo={`${titulo} — ${item.disciplinaNome}`}>
                <Box aria-hidden="true" sx={sxIconeQuadrado(item.vencida ? ESTADOS.atencao : ESTADOS.neutro)}>
                  <Icone size={15} />
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography noWrap title={`${titulo} · ${item.turmaSigla} · ${item.disciplinaNome}`} sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte }}>
                    {titulo}
                    <Box component="span" sx={{ fontWeight: PESO.regular, color: CORES_DASHBOARD.textoSuave }}> · {item.turmaSigla} · {item.disciplinaNome}</Box>
                  </Typography>
                  <Typography noWrap sx={{ fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado }}>
                    {item.vencida && <Box component="span" sx={{ color: ESTADOS.atencao.texto, fontWeight: PESO.forte }}>Devolução passou · </Box>}
                    {faltam}
                    {!ehChamada && data && !item.vencida ? ` · devolução ${data}` : ""}
                  </Typography>
                </Box>
                <Button size="small" onClick={ehChamada ? onRegistrarPresenca : onLancarNotas} sx={ehChamada ? sxBotaoSecundario : sxBotaoPrimario}>
                  {ehChamada ? "Registrar presença" : "Lançar notas"}
                </Button>
              </LinhaPainel>
            );
          })}
        </ListaPainel>
      ) : (
        <Stack minHeight={150} alignItems="center" justifyContent="center" textAlign="center" gap={0.75} px={2}>
          <CheckCircle2 size={24} color={ESTADOS.ok.ponto} aria-hidden="true" />
          <Typography sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte }}>Nenhuma pendência de lançamento</Typography>
          <Typography sx={{ fontSize: TIPO_DASHBOARD.secundario, color: CORES_DASHBOARD.textoApagado }}>Notas e chamadas em dia.</Typography>
        </Stack>
      )}
    </DashboardPainel>
  );
}
