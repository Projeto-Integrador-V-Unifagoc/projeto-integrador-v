import { useId, useRef } from "react";
import { Typography } from "@mui/material";
import Button from "../Button";
import { Dialog } from "../Dialog";
import type { ConfiguracaoConfirmacao } from "../../hooks/use-confirmacao";

interface ConfirmacaoDialogProps {
  aberto: boolean;
  configuracao: ConfiguracaoConfirmacao | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export default function ConfirmacaoDialog({ aberto, configuracao, onConfirmar, onCancelar }: ConfirmacaoDialogProps) {
  const tituloId = useId();
  const mensagemId = useId();
  const cancelar = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root open={aberto} onClose={onCancelar} maxWidth="xs"
      aria-labelledby={tituloId} aria-describedby={mensagemId}
      slotProps={{ transition: { onEntered: () => cancelar.current?.focus() } }}>
      <Dialog.Header>
        <Dialog.Title id={tituloId}>{configuracao?.titulo}</Dialog.Title>
        <Dialog.ActionClose onClose={onCancelar} />
      </Dialog.Header>
      <Dialog.Content>
        <Typography id={mensagemId}>{configuracao?.mensagem}</Typography>
      </Dialog.Content>
      <Dialog.Footer>
        <Button ref={cancelar} variant="outlined" autoFocus onClick={onCancelar}>Cancelar</Button>
        <Button variant="contained" color={configuracao?.cor ?? "warning"} onClick={onConfirmar}>
          {configuracao?.textoConfirmar}
        </Button>
      </Dialog.Footer>
    </Dialog.Root>
  );
}
