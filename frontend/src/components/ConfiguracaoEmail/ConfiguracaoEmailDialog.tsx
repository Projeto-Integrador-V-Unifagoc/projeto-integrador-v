import { useCallback, useEffect, useState } from "react";
import { Alert, CircularProgress, Stack, Tab, Tabs } from "@mui/material";

import Button from "../Button";
import { Dialog } from "../Dialog";
import ServidorEmailPanel from "./ServidorEmailPanel";
import MensagensPanel from "./MensagensPanel";
import {
    configuracaoEmailApi,
    type ConfiguracaoEmail,
    type EmailRemetente,
} from "../../services/configuracao-email-api";

interface ConfiguracaoEmailDialogProps {
    aberto: boolean;
    onFechar: () => void;
}

function mensagemErro(err: unknown, fallback: string): string {
    const axiosErr = err as { response?: { data?: { error?: string } } };
    if (axiosErr?.response?.data?.error) return axiosErr.response.data.error;
    if (err instanceof Error) return err.message;
    return fallback;
}

export default function ConfiguracaoEmailDialog({ aberto, onFechar }: ConfiguracaoEmailDialogProps) {
    const [disparadores, setDisparadores] = useState<ConfiguracaoEmail[]>([]);
    const [remetentes, setRemetentes] = useState<EmailRemetente[]>([]);
    const [aba, setAba] = useState(0);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");

    const carregar = useCallback(async () => {
        setCarregando(true);
        setErro("");

        try {
            const [lista, enderecos] = await Promise.all([
                configuracaoEmailApi.listar(),
                configuracaoEmailApi.listarRemetentes().catch(() => []),
            ]);

            setDisparadores(lista);
            setRemetentes(enderecos);
        } catch (err) {
            setErro(mensagemErro(err, "Não foi possível carregar as configurações de e-mail."));
            setDisparadores([]);
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        if (aberto) {
            setSucesso("");
            void carregar();
        }
    }, [aberto, carregar]);

    function avisar(texto: string, tipo: "success" | "error") {
        if (tipo === "success") {
            setSucesso(texto);
            setErro("");
        } else {
            setErro(texto);
            setSucesso("");
        }
    }

    function alterarDisparador(chave: string, campo: keyof ConfiguracaoEmail, valor: string | boolean) {
        setDisparadores((lista) =>
            lista.map((item) => (item.chave === chave ? { ...item, [campo]: valor } : item)),
        );
    }

    function aplicarSalvo(atualizado: ConfiguracaoEmail) {
        setDisparadores((lista) =>
            lista.map((item) => (item.chave === atualizado.chave ? atualizado : item)),
        );
    }

    return (
        <Dialog.Root open={aberto} onClose={onFechar} maxWidth="md">
            <Dialog.Header>
                <Dialog.Title>Configuração de e-mails</Dialog.Title>
                <Dialog.ActionClose onClose={onFechar} />
            </Dialog.Header>

            <Dialog.Content>
                <Stack spacing={2}>
                    {erro && <Alert severity="error" onClose={() => setErro("")}>{erro}</Alert>}
                    {sucesso && <Alert severity="success" onClose={() => setSucesso("")}>{sucesso}</Alert>}

                    <Tabs
                        value={aba}
                        onChange={(_, valor: number) => {
                            setAba(valor);
                            setSucesso("");
                            setErro("");
                        }}
                        sx={{ borderBottom: 1, borderColor: "divider" }}
                    >
                        <Tab label="Servidor de e-mail" />
                        <Tab label={`E-mails cadastrados (${disparadores.length})`} />
                    </Tabs>

                    {carregando ? (
                        <Stack alignItems="center" py={5}>
                            <CircularProgress size={30} />
                        </Stack>
                    ) : aba === 0 ? (
                        <ServidorEmailPanel onRemetentesMudaram={setRemetentes} onMensagem={avisar} />
                    ) : disparadores.length === 0 ? (
                        <Alert severity="warning">Nenhuma mensagem automática cadastrada.</Alert>
                    ) : (
                        <MensagensPanel
                            disparadores={disparadores}
                            remetentes={remetentes}
                            onAlterar={alterarDisparador}
                            onSalvo={aplicarSalvo}
                            onMensagem={avisar}
                        />
                    )}
                </Stack>
            </Dialog.Content>

            <Dialog.Footer>
                <Button variant="outlined" onClick={onFechar}>Fechar</Button>
            </Dialog.Footer>
        </Dialog.Root>
    );
}
