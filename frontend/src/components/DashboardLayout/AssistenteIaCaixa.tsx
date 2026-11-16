import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Box, ButtonBase, IconButton, InputBase, Stack, Tooltip } from "@mui/material";
import { ArrowUp, Sparkles } from "lucide-react";
import { CORES_DASHBOARD, TIPO_DASHBOARD, sxCartaoDashboard, sxSelo } from "./dashboard-estilos";

/** No máximo duas sugestões: mais que isso vira ruído ao lado da saudação. */
const MAX_SUGESTOES = 2;

export interface AssistenteIaCaixaProps {
  placeholder?: string;
  sugestoes?: string[];
  /** Sem este callback (assistente desativado ou não configurado) a caixa fica visível, mas não envia. */
  onEnviar?: (pergunta: string) => void;
}

export default function AssistenteIaCaixa({ placeholder = "Pergunte sobre seus dados…", sugestoes = [], onEnviar }: AssistenteIaCaixaProps) {
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

  function aoTeclar(evento: KeyboardEvent) {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      enviar(pergunta);
    }
  }

  return (
    <Box
      component="form"
      aria-label="Assistente de IA"
      onSubmit={aoSubmeter}
      sx={{ ...sxCartaoDashboard, px: 1.5, pt: 1.25, pb: 1, transition: "border-color .15s ease", "&:focus-within": { borderColor: CORES_DASHBOARD.acento } }}
    >
      <Stack direction="row" alignItems="flex-start" gap={1}>
        <Box component="span" aria-hidden="true" sx={{ color: CORES_DASHBOARD.acento, pt: "3px", display: "flex" }}>
          <Sparkles size={16} />
        </Box>
        <InputBase
          value={pergunta}
          onChange={(evento) => setPergunta(evento.target.value)}
          onKeyDown={aoTeclar}
          placeholder={placeholder}
          multiline
          maxRows={3}
          inputProps={{ "aria-label": "Pergunta para o assistente de IA" }}
          sx={{ flex: 1, minWidth: 0, p: 0, fontSize: TIPO_DASHBOARD.corpo, color: CORES_DASHBOARD.texto, "& textarea::placeholder": { color: CORES_DASHBOARD.textoApagado, opacity: 1 } }}
        />
      </Stack>
      {/* As sugestões quebram linha quando não cabem (nunca ficam cortadas pelo botão de envio);
          o botão fica sempre no canto inferior direito. */}
      <Stack direction="row" alignItems="flex-end" gap={1} mt={1}>
        <Stack direction="row" gap={0.75} flexWrap="wrap" flex={1} minWidth={0}>
          {sugestoes.slice(0, MAX_SUGESTOES).map((sugestao) => (
            <ButtonBase
              key={sugestao}
              type="button"
              title={sugestao}
              disabled={!disponivel}
              onClick={() => enviar(sugestao)}
              sx={{ ...sxSelo("neutro"), maxWidth: "100%", display: "block", overflow: "hidden", textOverflow: "ellipsis", py: 0.4, px: 1.25, "&:hover": { bgcolor: CORES_DASHBOARD.borda } }}
            >
              {sugestao}
            </ButtonBase>
          ))}
        </Stack>
        <Tooltip title={disponivel ? "Enviar pergunta" : "Assistente indisponível no momento"}>
          <Box component="span" sx={{ flexShrink: 0 }}>
            <IconButton
              type="submit"
              aria-label="Enviar pergunta"
              aria-disabled={!disponivel}
              onClick={(evento) => {
                if (!disponivel) evento.preventDefault();
              }}
              sx={{
                width: 32,
                height: 32,
                bgcolor: CORES_DASHBOARD.acento,
                color: "#fff",
                opacity: disponivel ? 1 : 0.5,
                cursor: disponivel ? "pointer" : "default",
                "&:hover": { bgcolor: disponivel ? CORES_DASHBOARD.acentoHover : CORES_DASHBOARD.acento },
              }}
            >
              <ArrowUp size={16} />
            </IconButton>
          </Box>
        </Tooltip>
      </Stack>
    </Box>
  );
}
