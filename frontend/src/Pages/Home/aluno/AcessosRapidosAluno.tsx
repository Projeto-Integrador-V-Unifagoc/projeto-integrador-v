import { Box, Grid, Stack, Tooltip, Typography } from "@mui/material";
import { ArrowUpRight, BookMarked, CalendarCheck, Sparkles, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CORES_DASHBOARD, DashboardPainel } from "../../../components/DashboardLayout";

interface Atalho {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  destaque?: boolean;
  /** Sem ação: atalho visível, inerte, com aviso de assistente indisponível. */
  onClick?: () => void;
}

interface AcessosRapidosAlunoProps {
  navegar: (rota: string) => void;
  /** Abre o assistente com a ação "orientacoes". Sem ela, o atalho fica inerte. */
  onOrientacoesIa?: () => void;
}

function CartaoAtalho({ atalho }: { atalho: Atalho }) {
  const { icone: Icone, onClick } = atalho;
  const disponivel = Boolean(onClick);
  const ativar = () => onClick?.();
  return (
    <Tooltip title={disponivel ? "" : "Assistente indisponível no momento"} disableHoverListener={disponivel}>
      <Box
        role="button"
        tabIndex={0}
        aria-label={atalho.titulo}
        aria-disabled={!disponivel}
        onClick={ativar}
        onKeyDown={(evento) => {
          if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            ativar();
          }
        }}
        sx={{
          height: "100%",
          p: 1.5,
          borderRadius: 2,
          border: `1px solid ${CORES_DASHBOARD.borda}`,
          cursor: disponivel ? "pointer" : "default",
          opacity: disponivel ? 1 : 0.75,
          transition: "border-color .15s ease, background-color .15s ease",
          "&:hover, &:focus-visible": disponivel ? { borderColor: CORES_DASHBOARD.acento, bgcolor: CORES_DASHBOARD.superficieSutil, outline: "none" } : { outline: "none" },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box
            aria-hidden="true"
            sx={{ width: 32, height: 32, borderRadius: 1.5, display: "grid", placeItems: "center", bgcolor: atalho.destaque ? CORES_DASHBOARD.acento : "#E6F6FB", color: atalho.destaque ? "#fff" : CORES_DASHBOARD.acento }}
          >
            <Icone size={17} />
          </Box>
          <ArrowUpRight size={16} color={CORES_DASHBOARD.textoApagado} aria-hidden="true" />
        </Stack>
        <Typography variant="body2" fontWeight={700} mt={1}>{atalho.titulo}</Typography>
        <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado }}>{atalho.descricao}</Typography>
      </Box>
    </Tooltip>
  );
}

export default function AcessosRapidosAluno({ navegar, onOrientacoesIa }: AcessosRapidosAlunoProps) {
  const atalhos: Atalho[] = [
    { titulo: "Orientações IA", descricao: "Com base nos seus dados", icone: Sparkles, destaque: true, onClick: onOrientacoesIa },
    { titulo: "Minhas notas", descricao: "Boletim e fórmulas", icone: Star, onClick: () => navegar("/minhas-notas") },
    { titulo: "Minha frequência", descricao: "Extrato aula a aula", icone: CalendarCheck, onClick: () => navegar("/minha-frequencia") },
    { titulo: "Critérios do curso", descricao: "Manual do sistema", icone: BookMarked, onClick: () => navegar("/manual-do-sistema") },
  ];

  return (
    <DashboardPainel titulo="Orientações e acessos rápidos">
      <Grid container spacing={1.25}>
        {atalhos.map((atalho) => (
          <Grid key={atalho.titulo} size={6}>
            <CartaoAtalho atalho={atalho} />
          </Grid>
        ))}
      </Grid>
      {/* Sem link "Ver relatórios": os relatórios do aluno repetem Minhas notas/Minha frequência
          e o acesso completo já está no menu lateral "Relatórios". */}
    </DashboardPainel>
  );
}
