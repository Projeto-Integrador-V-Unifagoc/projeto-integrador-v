import { Alert, Stack } from "@mui/material";
import Button from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import TextField from "../../components/TextField";

interface JustificativaDialogProps {
  open: boolean;
  substituindo: boolean;
  motivo: string;
  observacao: string;
  saving: boolean;
  onMotivo: (valor: string) => void;
  onObservacao: (valor: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function JustificativaDialog({
  open,
  substituindo,
  motivo,
  observacao,
  saving,
  onMotivo,
  onObservacao,
  onClose,
  onSave,
}: JustificativaDialogProps) {
  const campoSx = {
    textAlign: "left",
    "& .MuiInputBase-input": { textAlign: "left" },
    "& .MuiFormHelperText-root": { mx: 0, mt: 0.75, textAlign: "left" },
  } as const;

  const fechar = () => {
    if (!saving) onClose();
  };

  return (
    <Dialog.Root open={open} onClose={fechar} maxWidth="sm" aria-labelledby="dialog-justificativa-title">
      <Dialog.Header>
        <Dialog.Title>
          <span id="dialog-justificativa-title">{substituindo ? "Substituir justificativa" : "Justificar ausência"}</span>
        </Dialog.Title>
        <Dialog.ActionClose onClose={fechar} />
      </Dialog.Header>
      <Dialog.Content>
        <Stack gap={2}>
          {substituindo && (
            <Alert severity="warning">Ao salvar, a justificativa anterior será substituída e permanecerá na auditoria.</Alert>
          )}
          <TextField
            label="Motivo"
            required
            value={motivo}
            onChange={(e) => onMotivo(e.target.value)}
            inputProps={{ maxLength: 200, "aria-label": "Motivo da justificativa" }}
            InputLabelProps={{ shrink: true }}
            helperText="Obrigatório. A falta permanece no cálculo da frequência."
            sx={campoSx}
          />
          <TextField
            label="Observação"
            multiline
            minRows={3}
            value={observacao}
            onChange={(e) => onObservacao(e.target.value)}
            inputProps={{ maxLength: 1000, "aria-label": "Observação da justificativa" }}
            InputLabelProps={{ shrink: true }}
            helperText="Opcional."
            sx={{
              ...campoSx,
              "& .MuiOutlinedInput-root": {
                height: "auto",
                minHeight: 88,
                alignItems: "flex-start",
                py: 1,
              },
              "& .MuiInputBase-inputMultiline": {
                p: 0,
                lineHeight: 1.5,
              },
            }}
          />
        </Stack>
      </Dialog.Content>
      <Dialog.Footer>
        <Button variant="outlined" disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="contained" disabled={saving || !motivo.trim()} isLoading={saving} onClick={onSave}>
          Salvar
        </Button>
      </Dialog.Footer>
    </Dialog.Root>
  );
}
