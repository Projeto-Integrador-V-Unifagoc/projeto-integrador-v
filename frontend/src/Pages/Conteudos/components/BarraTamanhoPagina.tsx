import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import { Timer } from "lucide-react";
import Button from "./BotaoConteudo";
import type { LimitesConteudo, MetricasPagina } from "../../../models/conteudo-model";
import { avaliarTamanho, formatarMinutos } from "../conteudo-metricas";

interface Props {
    metricas: MetricasPagina;
    limites: LimitesConteudo["pagina"];
    onDividir?: () => void;
    onNovaPagina?: () => void;
    dividindo?: boolean;
}

const COR = { ok: "#05b5e6", aviso: "#C77700", bloqueio: "#FF0000" } as const;

function plural(n: number, um: string, varios: string) {
    return `${n} ${n === 1 ? um : varios}`;
}

export default function BarraTamanhoPagina({ metricas, limites, onDividir, onNovaPagina, dividindo }: Props) {
    const { estado, mensagem, percentual } = avaliarTamanho(metricas, limites);
    const marcaRecomendado = (limites.minutosRecomendado / limites.minutosMaximo) * 100;
    const detalhes = [
        plural(metricas.palavras, "palavra", "palavras"),
        plural(metricas.imagens, "imagem", "imagens"),
        plural(metricas.videos, "vídeo", "vídeos"),
        plural(metricas.arquivos, "arquivo", "arquivos"),
    ].join(" · ");

    return (
        <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ md: "center" }}
            gap={2}
            sx={{ px: 3, py: 1.5, borderTop: 1, borderColor: "divider", bgcolor: "background.default", flexShrink: 0,
                // Telas estreitas: a página rola no <main> do layout; o offset negativo compensa o padding dele.
                position: { xs: "sticky", md: "static" }, bottom: { xs: -16, sm: -24 }, zIndex: 2 }}
        >
            <Box sx={{ minWidth: 200 }}>
                <Stack direction="row" alignItems="center" gap={0.75}>
                    <Timer size={16} />
                    <Typography variant="body2" fontWeight={700}>{formatarMinutos(metricas.minutosEstimados)} de leitura</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">{detalhes}</Typography>
            </Box>

            <Box sx={{ flex: 1, minWidth: { md: 260 } }}>
                <Box sx={{ position: "relative" }}>
                    <LinearProgress
                        variant="determinate"
                        value={percentual}
                        aria-label="Tamanho da página"
                        sx={{ height: 8, borderRadius: 4, bgcolor: "grey.100", "& .MuiLinearProgress-bar": { bgcolor: COR[estado], borderRadius: 4 } }}
                    />
                    <Box
                        title={`Recomendado: ${limites.minutosRecomendado} min`}
                        sx={{ position: "absolute", top: -3, bottom: -3, left: `${marcaRecomendado}%`, width: 2, bgcolor: "grey.400" }}
                    />
                </Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">0</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Recomendado {limites.minutosRecomendado} min · Máximo {limites.minutosMaximo} min
                    </Typography>
                </Stack>
            </Box>

            <Stack direction="row" alignItems="center" gap={1.5} sx={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
                <Typography variant="body2" sx={{ color: COR[estado], fontWeight: 600 }}>
                    {percentual}% · {mensagem}
                </Typography>
                {estado === "aviso" && onDividir && (
                    <Button variant="text" size="small" onClick={onDividir} isLoading={dividindo} sx={{ whiteSpace: "nowrap" }}>
                        Dividir a partir daqui
                    </Button>
                )}
                {estado === "bloqueio" && onNovaPagina && (
                    <Button variant="contained" size="small" onClick={onNovaPagina} sx={{ whiteSpace: "nowrap" }}>
                        Criar nova página
                    </Button>
                )}
            </Stack>
        </Stack>
    );
}
