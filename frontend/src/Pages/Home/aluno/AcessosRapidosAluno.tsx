import { Box, Tooltip, Typography } from "@mui/material";
import { ArrowUpRight, BookMarked, CalendarCheck, Sparkles, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CORES_DASHBOARD, DashboardPainel, ESTADOS, PESO, TIPO_DASHBOARD, sxIconeQuadrado } from "../../../components/DashboardLayout";

interface Atalho {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  /** Atalho da IA: ícone preenchido no acento, para se destacar dos demais. */
  destaque?: boolean;
  /** Sem ação: atalho visível, inerte, com aviso de assistente indisponível. */
  onClick?: () => void;
}

interface AcessosRapidosAlunoProps {
  navegar: (rota: string) => void;
  /** Abre o assistente com a ação "orientacoes". Sem ela, o atalho fica inerte. */
  onOrientacoesIa?: () => void;
}

/** Cartão de atalho: borda, ícone em destaque, título, descrição curta e seta. */
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
          display: "flex",
          flexDirection: "column",
          gap: 1,
          minHeight: 96,
          p: 1.5,
          borderRadius: 2,
          border: `1px solid ${CORES_DASHBOARD.borda}`,
          bgcolor: CORES_DASHBOARD.superficie,
          cursor: disponivel ? "pointer" : "default",
          opacity: disponivel ? 1 : 0.7,
          transition: "border-color .15s ease, background-color .15s ease",
          "&:hover": disponivel ? { borderColor: CORES_DASHBOARD.acento, bgcolor: CORES_DASHBOARD.superficieSutil } : undefined,
          "&:focus-visible": { outline: `2px solid ${CORES_DASHBOARD.acento}`, outlineOffset: 2 },
        }}
      >
        {/* Ícone acima do título (seta no canto), sem espaço vazio entre eles. */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box aria-hidden="true" sx={sxIconeQuadrado(atalho.destaque ? { texto: "#FFFFFF", fundo: CORES_DASHBOARD.acento } : ESTADOS.acento, 30)}>
            <Icone size={16} />
          </Box>
          <ArrowUpRight size={16} color={CORES_DASHBOARD.iconeApagado} aria-hidden="true" style={{ flexShrink: 0 }} />
        </Box>
        <Box minWidth={0}>
          <Typography noWrap sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte, lineHeight: 1.35 }}>{atalho.titulo}</Typography>
          <Typography noWrap sx={{ fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado }}>{atalho.descricao}</Typography>
        </Box>
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
    <DashboardPainel titulo="Acessos rápidos">
      {/* Sem "Ver relatórios": os relatórios do aluno repetem Minhas notas/Minha frequência
          e o acesso completo já está no menu lateral "Relatórios".
          Blocos compactos em grade 2×2 (~100 px de altura, ícone acima do título), em qualquer largura:
          numa coluna só, os 4 blocos alongariam a linha de painéis. */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", alignContent: "start", gap: 1 }}>
        {atalhos.map((atalho) => <CartaoAtalho key={atalho.titulo} atalho={atalho} />)}
      </Box>
    </DashboardPainel>
  );
}
