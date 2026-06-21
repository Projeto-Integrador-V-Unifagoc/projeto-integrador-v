import { Alert, Stack } from "@mui/material";
import Button from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import TextField from "../../components/TextField";

const MOTIVO_MAXIMO = 500;
const MOTIVO_MINIMO = 5;

interface AutorizacaoDialogProps {
  open: boolean;
  motivo: string;
  saving: boolean;
  onMotivo: (valor: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function AutorizacaoDialog({ open, motivo, saving, onMotivo, onClose, onSave }: AutorizacaoDialogProps) {
  const fechar = () => {
    if (!saving) onClose();
  };

  const tamanho = motivo.trim().length;
  const curto = tamanho > 0 && tamanho < MOTIVO_MINIMO;
  const invalido = tamanho < MOTIVO_MINIMO;

  return (
    <Dialog.Root open={open} onClose={fechar} maxWidth="sm" aria-labelledby="dialog-autorizacao-title">
      <Dialog.Header>
        <Dialog.Title>
          <span id="dialog-autorizacao-title">Autorizar retificação excepcional</span>
        </Dialog.Title>
        <Dialog.ActionClose onClose={fechar} />
      </Dialog.Header>
      <Dialog.Content>
        <Stack gap={2}>
          <Alert severity="info">
            A autorização libera a edição fora do prazo de 7 dias enquanto o período estiver aberto e fica registrada em auditoria.
          </Alert>
          <TextField
            label="Motivo"
            required
            multiline
            minRows={3}
            value={motivo}
            onChange={(e) => onMotivo(e.target.value)}
            error={curto}
            inputProps={{ maxLength: MOTIVO_MAXIMO, "aria-label": "Motivo da autorização excepcional" }}
            helperText={curto ? `Informe ao menos ${MOTIVO_MINIMO} caracteres.` : `${motivo.length}/${MOTIVO_MAXIMO} caracteres.`}
          />
        </Stack>
      </Dialog.Content>
      <Dialog.Footer>
        <Button variant="outlined" disabled={saving} onClick={fechar}>
          Cancelar
        </Button>
        <Button variant="contained" disabled={saving || invalido} isLoading={saving} onClick={onSave}>
          Registrar autorização
        </Button>
      </Dialog.Footer>
    </Dialog.Root>
  );
}
