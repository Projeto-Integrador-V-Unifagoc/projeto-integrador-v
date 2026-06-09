import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";

interface ConfirmDialogProps {
    open: boolean;
    titulo: string;
    mensagem: string;
    textoConfirmar?: string;
    textoCancelar?: string;
    cor?: "primary" | "error" | "warning" | "success";
    onConfirmar: () => void;
    onCancelar: () => void;
}

export default function ConfirmDialog({
    open,
    titulo,
    mensagem,
    textoConfirmar = "Confirmar",
    textoCancelar = "Cancelar",
    cor = "error",
    onConfirmar,
    onCancelar,
}: ConfirmDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onCancelar}
            maxWidth="xs"
            fullWidth
            slotProps={{ paper: { sx: { backgroundColor: "background.default" } } }}
        >
            <DialogTitle sx={{ fontWeight: "bold", color: `${cor}.main` }}>
                {titulo}
            </DialogTitle>
            <DialogContent>
                <DialogContentText>{mensagem}</DialogContentText>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onCancelar} color="inherit">
                    {textoCancelar}
                </Button>
                <Button onClick={onConfirmar} variant="contained" color={cor}>
                    {textoConfirmar}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
