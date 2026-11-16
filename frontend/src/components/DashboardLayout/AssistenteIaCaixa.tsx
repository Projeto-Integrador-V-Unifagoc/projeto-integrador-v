import { useState } from "react";
import type { FormEvent } from "react";
import { Box, Chip, IconButton, InputBase, Stack, Tooltip, Typography } from "@mui/material";
import { ArrowUp, Sparkles } from "lucide-react";
import { CORES_DASHBOARD, sxCartaoDashboard } from "./dashboard-estilos";

export interface AssistenteIaCaixaProps {
  placeholder?: string;
  sugestoes?: string[];
  /** Sem este callback (assistente desativado ou não configurado) a caixa fica visível, mas não envia. */
  onEnviar?: (pergunta: string) => void;
}

export default function AssistenteIaCaixa({
  placeholder = "Pergunte sobre seus dados…",
  sugestoes = [],
  onEnviar,
}: AssistenteIaCaixaProps) {
  const [pergunta, setPergunta] = useState("");
  const disponivel = Boolean(onEnviar);

  function enviar(texto: string) {
    const valor = texto.trim();
    if (!onEnviar || !valor) return;
    onEnviar(valor);
    setPergunta("");
  }

  function aoSubmeter(evento: FormEvent) {
    evento.preventDefault();
    enviar(pergunta);
  }

  return (
    <Box component="section" aria-label="Assistente de IA">
      <Box
        component="form"
        onSubmit={aoSubmeter}
        sx={{
          ...sxCartaoDashboard,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          pl: 1.75,
          pr: 0.75,
          py: 0.75,
          transition: "border-color .15s ease",
          "&:focus-within": { borderColor: CORES_DASHBOARD.acento },
        }}
      >
        <Sparkles size={19} color={CORES_DASHBOARD.acento} aria-hidden="true" />
        <InputBase
          value={pergunta}
          onChange={(evento) => setPergunta(evento.target.value)}
          placeholder={placeholder}
          inputProps={{ "aria-label": "Pergunta para o assistente de IA" }}
          sx={{ flex: 1, fontSize: 14, minWidth: 0 }}
        />
        <Tooltip title={disponivel ? "Enviar pergunta" : "Assistente indisponível no momento"}>
          <span>
            <IconButton
              type="submit"
              aria-label="Enviar pergunta"
              aria-disabled={!disponivel}
              onClick={(evento) => {
                if (!disponivel) evento.preventDefault();
              }}
              sx={{
                width: 34,
                height: 34,
                bgcolor: CORES_DASHBOARD.acento,
                color: "#fff",
                opacity: disponivel ? 1 : 0.55,
                cursor: disponivel ? "pointer" : "default",
                "&:hover": { bgcolor: disponivel ? CORES_DASHBOARD.acentoHover : CORES_DASHBOARD.acento },
              }}
            >
              <ArrowUp size={18} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {sugestoes.length > 0 && (
        <Stack direction="row" gap={0.75} mt={1} flexWrap="wrap" alignItems="center">
          <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado }}>
            Sugestões:
          </Typography>
          {sugestoes.map((sugestao) => (
            <Chip
              key={sugestao}
              label={sugestao}
              size="small"
              variant="outlined"
              onClick={disponivel ? () => enviar(sugestao) : undefined}
              sx={{ borderColor: CORES_DASHBOARD.borda, bgcolor: CORES_DASHBOARD.superficie, color: CORES_DASHBOARD.textoSuave }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
