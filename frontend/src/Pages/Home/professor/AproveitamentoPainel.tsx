import { Box, Button, Stack, Typography } from "@mui/material";
import { Download } from "lucide-react";
import { CORES_DASHBOARD, DashboardPainel, ESTADOS, PESO, TIPO_DASHBOARD, sxBotaoTexto } from "../../../components/DashboardLayout";
import { fmtPct } from "../aluno/regras-dashboard-aluno";
import { FREQUENCIA_LIMITROFE, FREQUENCIA_MINIMA, MEDIA_REFERENCIA } from "./regras-dashboard-professor";
import type { calcularAproveitamento } from "./regras-dashboard-professor";

type Aproveitamento = ReturnType<typeof calcularAproveitamento>;

interface AproveitamentoPainelProps {
  aproveitamento: Aproveitamento;
  podeExportar: boolean;
  onExportar: () => void;
  onRelatorios: () => void;
}

const fmtNumero = (valor: number) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valor);

/** Uma linha por métrica: rótulo, barra fina (4 px) e valor. Acento por padrão; tom de estado só abaixo do limite. */
function Barra({ rotulo, valor, detalhe, cor }: { rotulo: string; valor: number | null; detalhe?: string; cor: string }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(64px, 96px) 64px", alignItems: "center", columnGap: 1.5, minHeight: 28 }}>
      <Typography noWrap sx={{ fontSize: TIPO_DASHBOARD.secundario, color: CORES_DASHBOARD.textoSuave }}>{rotulo}</Typography>
      <Box
        role="progressbar"
        aria-label={rotulo}
        aria-valuenow={valor === null ? undefined : Math.round(valor)}
        aria-valuemin={0}
        aria-valuemax={100}
        sx={{ height: 4, borderRadius: 4, bgcolor: ESTADOS.neutro.fundo, overflow: "hidden" }}
      >
        <Box sx={{ height: "100%", width: `${Math.min(Math.max(valor ?? 0, 0), 100)}%`, bgcolor: cor, borderRadius: 4 }} />
      </Box>
      <Typography noWrap sx={{ fontSize: TIPO_DASHBOARD.secundario, fontWeight: PESO.forte, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{detalhe ?? fmtPct(valor, 1)}</Typography>
    </Box>
  );
}

export default function AproveitamentoPainel({ aproveitamento, podeExportar, onExportar, onRelatorios }: AproveitamentoPainelProps) {
  const corMedia = (valor: number | null) => (valor !== null && valor < MEDIA_REFERENCIA ? ESTADOS.atencao.ponto : CORES_DASHBOARD.acento);
  const corFreq = (valor: number | null) => (valor === null ? CORES_DASHBOARD.acento : valor < FREQUENCIA_MINIMA ? ESTADOS.critico.ponto : valor <= FREQUENCIA_LIMITROFE ? ESTADOS.atencao.ponto : CORES_DASHBOARD.acento);

  return (
    <DashboardPainel titulo="Aproveitamento" acao={{ rotulo: "Ver relatórios", onClick: onRelatorios }}>
      <Stack direction="row" alignItems="baseline" gap={1}>
        <Typography sx={{ fontSize: TIPO_DASHBOARD.valorKpi, fontWeight: PESO.forte, lineHeight: "28px", color: aproveitamento.mediaGeral !== null && aproveitamento.mediaGeral < MEDIA_REFERENCIA ? ESTADOS.atencao.texto : CORES_DASHBOARD.texto }}>
          {fmtPct(aproveitamento.mediaGeral, 0)}
        </Typography>
        <Typography sx={{ fontSize: TIPO_DASHBOARD.secundario, color: CORES_DASHBOARD.textoApagado }}>
          {aproveitamento.escala10 !== null ? `média parcial · ${fmtNumero(aproveitamento.escala10)} / 10` : "Aguardando as primeiras notas"}
        </Typography>
      </Stack>

      <Stack gap={0.5} mt={1.25}>
        <Barra
          rotulo={`Média ≥ ${MEDIA_REFERENCIA}%`}
          valor={aproveitamento.percentualAcimaReferencia}
          detalhe={aproveitamento.alunosComNota ? `${aproveitamento.alunosAcimaReferencia} de ${aproveitamento.alunosComNota}` : "—"}
          cor={CORES_DASHBOARD.acento}
        />
        {aproveitamento.porTipo.map((item) => (
          <Barra key={item.tipo} rotulo={item.rotulo} valor={item.media} cor={corMedia(item.media)} />
        ))}
        <Barra rotulo="Frequência agregada" valor={aproveitamento.frequenciaAgregada} cor={corFreq(aproveitamento.frequenciaAgregada)} />
      </Stack>

      {/* O horário da atualização fica só no rodapé do dashboard. */}
      {podeExportar && (
        <Stack direction="row" justifyContent="flex-end" mt="auto" pt={1.5}>
          <Button size="small" onClick={onExportar} startIcon={<Download size={14} />} sx={{ ...sxBotaoTexto, height: 26, fontSize: TIPO_DASHBOARD.legenda }}>
            Exportar CSV
          </Button>
        </Stack>
      )}
    </DashboardPainel>
  );
}
