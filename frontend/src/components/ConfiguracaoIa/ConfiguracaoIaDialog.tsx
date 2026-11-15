import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    CircularProgress,
    FormControlLabel,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";

import Button from "../Button";
import { Dialog } from "../Dialog";
import {
    assistenteApi,
    PROVEDORES_IA,
    type ConfiguracaoIa,
    type ProvedorIa,
} from "../../services/assistente-api";

interface ConfiguracaoIaDialogProps {
    aberto: boolean;
    onFechar: () => void;
}

function mensagemErro(err: unknown, fallback: string): string {
    const axiosErr = err as { response?: { data?: { error?: string } } };
    if (axiosErr?.response?.data?.error) return axiosErr.response.data.error;
    return fallback;
}

export default function ConfiguracaoIaDialog({ aberto, onFechar }: ConfiguracaoIaDialogProps) {
    const [salva, setSalva] = useState<ConfiguracaoIa | null>(null);
    const [provedor, setProvedor] = useState<ProvedorIa>("anthropic");
    const [modelo, setModelo] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [ativo, setAtivo] = useState(false);

    const [carregando, setCarregando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [testando, setTestando] = useState(false);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");

    const aplicar = (config: ConfiguracaoIa) => {
        setSalva(config);
        setProvedor(config.provedor);
        // Modelo salvo fora da lista (digitado antes do campo virar seleção) é tratado como o padrão.
        const lista = config.modelosDisponiveis?.[config.provedor] ?? [];
        setModelo(lista.some((m) => m.valor === config.modelo) ? config.modelo : (lista[0]?.valor ?? ""));
        setAtivo(config.ativo);
        setApiKey("");
    };

    const carregar = useCallback(async () => {
        setCarregando(true);
        setErro("");
        try {
            aplicar(await assistenteApi.buscarConfiguracao());
        } catch (err) {
            setErro(mensagemErro(err, "Não foi possível carregar a configuração do assistente."));
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

    const trocouProvedor = Boolean(salva && salva.possuiChave && provedor !== salva.provedor);
    const precisaChave = !salva?.possuiChave || trocouProvedor;

    async function salvar() {
        setSalvando(true);
        setErro("");
        setSucesso("");
        try {
            aplicar(
                await assistenteApi.salvarConfiguracao({
                    provedor,
                    modelo: modelo.trim(),
                    ativo,
                    ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
                }),
            );
            setSucesso("Configuração salva.");
        } catch (err) {
            setErro(mensagemErro(err, "Não foi possível salvar a configuração."));
        } finally {
            setSalvando(false);
        }
    }

    async function testar() {
        setTestando(true);
        setErro("");
        setSucesso("");
        try {
            const resultado = await assistenteApi.testarConexao();
            if (resultado.sucesso) setSucesso(resultado.mensagem);
            else setErro(resultado.mensagem);
        } catch (err) {
            setErro(mensagemErro(err, "Não foi possível testar a conexão."));
        } finally {
            setTestando(false);
        }
    }

    const modelosDoProvedor = salva?.modelosDisponiveis?.[provedor] ?? [];
    const alterado =
        !!salva &&
        (provedor !== salva.provedor || modelo.trim() !== salva.modelo || ativo !== salva.ativo || apiKey.trim() !== "");

    return (
        <Dialog.Root open={aberto} onClose={onFechar} maxWidth="sm">
            <Dialog.Header>
                <Dialog.Title>Assistente de IA</Dialog.Title>
                <Dialog.ActionClose onClose={onFechar} />
            </Dialog.Header>

            <Dialog.Content>
                <Stack spacing={2.5}>
                    <Typography variant="body2" color="text.secondary">
                        O assistente responde dúvidas de uso do sistema e consulta dados acadêmicos de quem está
                        conversando, dentro das permissões de cada perfil: o aluno vê só os próprios dados, e o
                        professor, só as turmas dele. Ele não altera nenhum dado.
                    </Typography>

                    <Alert severity="info" variant="outlined">
                        Para responder, o assistente envia ao provedor escolhido as perguntas e os dados consultados,
                        como nomes de alunos, notas e frequência. Confira se o uso desse provedor está de acordo com a
                        política de privacidade da instituição antes de ativar.
                    </Alert>

                    {erro && <Alert severity="error" onClose={() => setErro("")}>{erro}</Alert>}
                    {sucesso && <Alert severity="success" onClose={() => setSucesso("")}>{sucesso}</Alert>}

                    {carregando || !salva ? (
                        <Stack alignItems="center" py={5}>
                            <CircularProgress size={30} />
                        </Stack>
                    ) : (
                        <>
                            <TextField
                                select
                                label="Provedor"
                                value={provedor}
                                onChange={(e) => {
                                    const novo = e.target.value as ProvedorIa;
                                    setProvedor(novo);
                                    setModelo(salva.modelosDisponiveis[novo]?.[0]?.valor ?? "");
                                }}
                                fullWidth
                            >
                                {PROVEDORES_IA.map((p) => (
                                    <MenuItem key={p.valor} value={p.valor}>
                                        {p.rotulo}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                label="Modelo"
                                value={modelosDoProvedor.some((m) => m.valor === modelo) ? modelo : ""}
                                onChange={(e) => setModelo(e.target.value)}
                                helperText="Os modelos mostrados são os do provedor escolhido."
                                fullWidth
                            >
                                {modelosDoProvedor.map((m) => (
                                    <MenuItem key={m.valor} value={m.valor}>
                                        {m.rotulo}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                label="Chave de acesso"
                                type="password"
                                autoComplete="off"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={salva.possuiChave && !trocouProvedor ? `•••• ${salva.chaveFinal}` : ""}
                                helperText={
                                    trocouProvedor
                                        ? "Ao trocar o provedor, informe a chave do novo provedor."
                                        : salva.possuiChave
                                          ? "Chave salva. Preencha só para trocar."
                                          : "Cole a chave gerada no painel do provedor."
                                }
                                required={precisaChave}
                                fullWidth
                            />

                            <FormControlLabel
                                control={<Switch checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />}
                                label="Assistente ativo"
                            />

                            {salva.testadoEm && (
                                <Typography variant="caption" color="text.secondary">
                                    Último teste: {new Date(salva.testadoEm).toLocaleString("pt-BR")} —{" "}
                                    {salva.resultadoTeste.replace(/^(ok|erro):\s*/, "")}
                                </Typography>
                            )}
                        </>
                    )}
                </Stack>
            </Dialog.Content>

            <Dialog.Footer>
                <Button variant="outlined" onClick={onFechar}>
                    Fechar
                </Button>
                <Button
                    variant="outlined"
                    onClick={testar}
                    isLoading={testando}
                    disabled={!salva?.possuiChave || alterado}
                    title={alterado ? "Salve antes de testar" : undefined}
                >
                    Testar conexão
                </Button>
                <Button variant="contained" onClick={salvar} isLoading={salvando} disabled={!alterado}>
                    Salvar
                </Button>
            </Dialog.Footer>
        </Dialog.Root>
    );
}
