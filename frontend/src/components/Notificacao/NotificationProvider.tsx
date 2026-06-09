import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { Alert, Snackbar, type AlertColor } from "@mui/material";

type Severidade = AlertColor;

interface NotificacaoContextoTipo {
    notificar: (mensagem: string, severidade?: Severidade) => void;
}

const NotificacaoContexto = createContext<NotificacaoContextoTipo | undefined>(
    undefined
);

interface EstadoNotificacao {
    aberto: boolean;
    mensagem: string;
    severidade: Severidade;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [estado, setEstado] = useState<EstadoNotificacao>({
        aberto: false,
        mensagem: "",
        severidade: "success",
    });

    const notificar = useCallback(
        (mensagem: string, severidade: Severidade = "success") => {
            setEstado({ aberto: true, mensagem, severidade });
        },
        []
    );

    const fechar = useCallback((_?: unknown, motivo?: string) => {
        // Não fecha ao clicar fora, para o usuário conseguir ler a mensagem.
        if (motivo === "clickaway") return;
        setEstado((s) => ({ ...s, aberto: false }));
    }, []);

    const valor = useMemo(() => ({ notificar }), [notificar]);

    return (
        <NotificacaoContexto.Provider value={valor}>
            {children}
            <Snackbar
                open={estado.aberto}
                autoHideDuration={5000}
                onClose={fechar}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert
                    onClose={() => fechar()}
                    severity={estado.severidade}
                    variant="filled"
                    sx={{ width: "100%", boxShadow: 3 }}
                >
                    {estado.mensagem}
                </Alert>
            </Snackbar>
        </NotificacaoContexto.Provider>
    );
}

export function useNotificacao() {
    const contexto = useContext(NotificacaoContexto);
    if (!contexto) {
        throw new Error(
            "useNotificacao precisa ser usado dentro de um NotificationProvider"
        );
    }
    return contexto;
}
