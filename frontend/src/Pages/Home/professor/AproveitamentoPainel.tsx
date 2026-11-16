import { Box, CircularProgress, LinearProgress, Link, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { BadgeCheck, Download } from "lucide-react";
import { CORES_DASHBOARD, DashboardPainel } from "../../../components/DashboardLayout";
import { fmtPct } from "../aluno/regras-dashboard-aluno";
import { FREQUENCIA_LIMITROFE, FREQUENCIA_MINIMA, MEDIA_REFERENCIA } from "./regras-dashboard-professor";
import type { calcularAproveitamento } from "./regras-dashboard-professor";

type Aproveitamento = ReturnType<typeof calcularAproveitamento>;

interface AproveitamentoPainelProps {
  aproveitamento: Aproveitamento;
  geradoEm: string;
  podeExportar: boolean;
  onExportar: () => void;
  onRelatorios: () => void;
}

const fmtNumero = (valor: number) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valor);

function Barra({ rotulo, valor, detalhe, cor }: { rotulo: string; valor: number | null; detalhe?: string; cor: string }) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" gap={1}>
        <Typography variant="body2" sx={{ color: CORES_DASHBOARD.textoSuave }}>{rotulo}</Typography>
        <Typography variant="body2" fontWeight={700}>{detalhe ?? fmtPct(valor, 1)}</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(valor ?? 0, 100)}
        aria-label={rotulo}
        sx={{ mt: 0.5, height: 7, borderRadius: 9, bgcolor: "#EEF2F6", "& .MuiLinearProgress-bar": { bgcolor: cor, borderRadius: 9 } }}
      />
    </Box>
  );
}

export default function AproveitamentoPainel({ aproveitamento, geradoEm, podeExportar, onExportar, onRelatorios }: AproveitamentoPainelProps) {
  const theme = useTheme();
  const corValor = (valor: number | null, limite: number) => (valor !== null && valor < limite ? theme.palette.warning.main : CORES_DASHBOARD.acento);
  const corFreq = (valor: number | null) => (valor === null ? CORES_DASHBOARD.acento : valor < FREQUENCIA_MINIMA ? theme.palette.error.main : valor <= FREQUENCIA_LIMITROFE ? theme.palette.warning.main : theme.palette.success.main);
  const horario = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(geradoEm));

  return (
    <DashboardPainel
      titulo="Aproveitamento acadêmico"
      acao={{ rotulo: "Ver relatórios", onClick: onRelatorios }}
    >
      <Stack direction="row" gap={2} alignItems="center" sx={{ p: 1.75, borderRadius: 2, border: `1px solid ${CORES_DASHBOARD.borda}` }}>
        <Box sx={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
          <CircularProgress variant="determinate" value={100} size={72} thickness={4.5} sx={{ color: "#EEF2F6", position: "absolute" }} aria-hidden="true" />
          <CircularProgress
            variant="determinate"
            value={Math.min(aproveitamento.mediaGeral ?? 0, 100)}
            size={72}
            thickness={4.5}
            aria-label="Média parcial geral"
            sx={{ color: corValor(aproveitamento.mediaGeral, MEDIA_REFERENCIA), position: "absolute" }}
          />
          <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <Typography fontWeight={800} fontSize={15}>{fmtPct(aproveitamento.mediaGeral, 0)}</Typography>
          </Box>
        </Box>
        <Box minWidth={0}>
          <Typography variant="body2" fontWeight={700}>Média parcial</Typography>
          <Typography variant="body2" sx={{ color: CORES_DASHBOARD.textoApagado }}>
            {aproveitamento.escala10 !== null
              ? `${fmtNumero(aproveitamento.escala10)} / 10 · ${aproveitamento.alunosComNota} alunos com nota`
              : "Aguardando as primeiras notas"}
          </Typography>
        </Box>
      </Stack>

      <Stack gap={1.75} mt={2}>
        <Barra
          rotulo="Média ≥ 60%"
          valor={aproveitamento.percentualAcimaReferencia}
          detalhe={aproveitamento.alunosComNota ? `${aproveitamento.alunosAcimaReferencia} de ${aproveitamento.alunosComNota} (${fmtPct(aproveitamento.percentualAcimaReferencia, 0)})` : "—"}
          cor={CORES_DASHBOARD.marca}
        />
        {aproveitamento.porTipo.map((item) => (
          <Barra key={item.tipo} rotulo={item.rotulo} valor={item.media} cor={corValor(item.media, MEDIA_REFERENCIA)} />
        ))}
        <Barra rotulo="Frequência agregada" valor={aproveitamento.frequenciaAgregada} cor={corFreq(aproveitamento.frequenciaAgregada)} />
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" mt="auto" pt={2} gap={1} flexWrap="wrap">
        <Stack direction="row" gap={0.75} alignItems="center" sx={{ color: CORES_DASHBOARD.textoApagado }}>
          <BadgeCheck size={15} aria-hidden="true" />
          <Typography variant="caption">Atualizado às {horario}</Typography>
        </Stack>
        {podeExportar && (
          <Link component="button" type="button" variant="caption" underline="hover" onClick={onExportar} sx={{ color: CORES_DASHBOARD.acento, display: "inline-flex", alignItems: "center", gap: 0.5, fontWeight: 700 }}>
            <Download size={14} aria-hidden="true" /> Exportar CSV
          </Link>
        )}
      </Stack>
    </DashboardPainel>
  );
}
