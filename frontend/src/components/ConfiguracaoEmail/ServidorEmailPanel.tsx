import { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Divider,
    FormControlLabel,
    MenuItem,
    Stack,
    Switch,
    Typography,
} from "@mui/material";
import { Plus, Trash2 } from "lucide-react";

import Button from "../Button";
import TextField from "../TextField";
import { configuracaoEmailApi } from "../../services/configuracao-email-api";
import type { ConfiguracaoSmtp, EmailRemetente } from "../../services/configuracao-email-api";

const PORTAS = [
    { valor: 465, rotulo: "465 — SSL (recomendado)", seguro: true },
    { valor: 587, rotulo: "587 — TLS/STARTTLS", seguro: false },
    { valor: 25, rotulo: "25 — sem criptografia", seguro: false },
];

interface ServidorEmailPanelProps {
    onMensagem: (texto: string, tipo: "success" | "error") => void;
    onRemetentesMudaram?: (remetentes: EmailRemetente[]) => void;
}

export default function ServidorEmailPanel({ onMensagem, onRemetentesMudaram }: ServidorEmailPanelProps) {
    const [config, setConfig] = useState<ConfiguracaoSmtp | null>(null);
    const [senha, setSenha] = useState("");
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [testando, setTestando] = useState(false);
    const [remetentes, setRemetentes] = useState<EmailRemetente[]>([]);
    const [novoEmail, setNovoEmail] = useState("");
    const [novoNome, setNovoNome] = useState("");
    const [salvandoRemetente, setSalvandoRemetente] = useState(false);

    function publicarRemetentes(lista: EmailRemetente[]) {
        setRemetentes(lista);
        onRemetentesMudaram?.(lista);
    }

    async function adicionarRemetente() {
        if (!novoEmail.trim()) {
            onMensagem("Informe o e-mail que vai disparar as mensagens.", "error");
            return;
        }

        setSalvandoRemetente(true);
        try {
            publicarRemetentes(await configuracaoEmailApi.adicionarRemetente(novoEmail.trim(), novoNome.trim()));
            setNovoEmail("");
            setNovoNome("");
            onMensagem("E-mail remetente cadastrado.", "success");
        } catch (err: any) {
            onMensagem(err?.response?.data?.error ?? "Não foi possível cadastrar o e-mail.", "error");
        } finally {
            setSalvandoRemetente(false);
        }
    }

    async function removerRemetente(id: string) {
        try {
            publicarRemetentes(await configuracaoEmailApi.removerRemetente(id));
            onMensagem("E-mail removido.", "success");
        } catch (err: any) {
            onMensagem(err?.response?.data?.error ?? "Não foi possível remover o e-mail.", "error");
        }
    }

    async function carregar() {
        setCarregando(true);
        try {
            const [smtp, lista] = await Promise.all([
                configuracaoEmailApi.buscarSmtp(),
                configuracaoEmailApi.listarRemetentes(),
            ]);

            setConfig(smtp);
            publicarRemetentes(lista);
        } catch (err: any) {
            onMensagem(err?.response?.data?.error ?? "Não foi possível carregar o servidor de e-mail.", "error");
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, []);

    function alterar<C extends keyof ConfiguracaoSmtp>(campo: C, valor: ConfiguracaoSmtp[C]) {
        setConfig((atual) => (atual ? { ...atual, [campo]: valor } : atual));
    }

    async function salvar() {
        if (!config) return;

        setSalvando(true);
        try {
            const salvo = await configuracaoEmailApi.salvarSmtp({
                host: config.host,
                porta: config.porta,
                seguro: config.seguro,
                usuario: config.usuario,
                senha: senha || undefined,
                remetente_nome: config.remetente_nome,
                remetente_email: config.remetente_email,
                ativo: config.ativo,
            });

            setConfig(salvo);
            setSenha("");
            onMensagem("Servidor de e-mail salvo.", "success");
        } catch (err: any) {
            onMensagem(err?.response?.data?.error ?? "Não foi possível salvar o servidor de e-mail.", "error");
        } finally {
            setSalvando(false);
        }
    }

    async function testar() {
        setTestando(true);
        try {
            const resultado = await configuracaoEmailApi.testarConexao();
            onMensagem(resultado.mensagem, resultado.sucesso ? "success" : "error");
            carregar();
        } catch (err: any) {
            onMensagem(err?.response?.data?.error ?? "Não foi possível testar a conexão.", "error");
        } finally {
            setTestando(false);
        }
    }

    if (carregando) {
        return (
            <Stack alignItems="center" py={5}>
                <CircularProgress size={30} />
            </Stack>
        );
    }

    if (!config) return null;

    return (
        <Stack spacing={2.5} pt={1}>
            {config.modo_teste && (
                <Alert severity="warning">
                    O servidor está com <strong>EMAIL_MODO_TESTE=true</strong>: as mensagens são geradas mas
                    <strong> nenhum e-mail sai de verdade</strong>. Desligue essa variável no ambiente para enviar.
                </Alert>
            )}

            {!config.ativo && !config.modo_teste && (
                <Alert severity="warning">
                    O envio está desligado. Preencha os dados da caixa postal e ligue a chave abaixo.
                </Alert>
            )}

            {config.resultado_teste && (
                <Alert severity={config.resultado_teste.startsWith("ok") ? "success" : "error"}>
                    Último teste: {config.resultado_teste}
                    {config.testado_em && ` — ${new Date(config.testado_em).toLocaleString("pt-BR")}`}
                </Alert>
            )}

            <FormControlLabel
                control={<Switch checked={config.ativo} onChange={(e) => alterar("ativo", e.target.checked)} />}
                label={config.ativo ? "Envio de e-mails ligado" : "Envio de e-mails desligado"}
            />

            <Divider />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                    label="Servidor (host)"
                    value={config.host}
                    onChange={(e) => alterar("host", e.target.value)}
                    placeholder="email-ssl.com.br"
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    select
                    label="Porta"
                    value={config.porta}
                    onChange={(e) => {
                        const porta = Number(e.target.value);
                        const opcao = PORTAS.find((p) => p.valor === porta);
                        alterar("porta", porta);
                        if (opcao) alterar("seguro", opcao.seguro);
                    }}
                    InputLabelProps={{ shrink: true }}
                >
                    {PORTAS.map((opcao) => (
                        <MenuItem key={opcao.valor} value={opcao.valor}>
                            {opcao.rotulo}
                        </MenuItem>
                    ))}
                </TextField>
            </Stack>

            <FormControlLabel
                control={<Switch checked={config.seguro} onChange={(e) => alterar("seguro", e.target.checked)} />}
                label="Conexão SSL direta (ligue na porta 465, desligue na 587)"
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                    label="Usuário (caixa postal)"
                    value={config.usuario}
                    onChange={(e) => alterar("usuario", e.target.value)}
                    placeholder="naoresponda@unieduca.net.br"
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    label="Senha da caixa postal"
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder={config.senha_definida ? "•••••• (já cadastrada)" : "Informe a senha"}
                    helperText={
                        config.senha_definida
                            ? "Deixe em branco para manter a senha atual."
                            : "A senha é gravada criptografada."
                    }
                    InputLabelProps={{ shrink: true }}
                />
            </Stack>

            <Divider />

            <Typography variant="subtitle2" fontWeight={700}>
                E-mails que podem disparar
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: -1.2 }}>
                Os endereços cadastrados aqui aparecem para escolher em cada disparador (inscrição, documentação e
                recuperação de senha).
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="flex-start">
                <TextField
                    label="E-mail"
                    type="email"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    placeholder="contato@unieduca.net.br"
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    label="Nome exibido"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="UniEduca"
                    InputLabelProps={{ shrink: true }}
                />
                <Button
                    variant="outlined"
                    sx={{ width: "auto", minWidth: 130, mt: { sm: 0.2 } }}
                    isLoading={salvandoRemetente}
                    onClick={() => void adicionarRemetente()}
                >
                    <Plus size={16} style={{ marginRight: 6 }} />
                    Adicionar
                </Button>
            </Stack>

            {remetentes.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {remetentes.map((item) => (
                        <Chip
                            key={item.id}
                            label={`${item.email}${item.nome && item.nome !== "UniEduca" ? ` (${item.nome})` : ""}`}
                            onDelete={() => void removerRemetente(item.id)}
                            deleteIcon={<Trash2 size={15} />}
                            sx={{ fontSize: ".85rem" }}
                        />
                    ))}
                </Stack>
            )}

            <Divider />

            <Typography variant="subtitle2" fontWeight={700}>
                Remetente padrão
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                    label="Nome exibido"
                    value={config.remetente_nome}
                    onChange={(e) => alterar("remetente_nome", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    label="E-mail remetente"
                    value={config.remetente_email}
                    onChange={(e) => alterar("remetente_email", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    helperText="Alguns provedores exigem que seja igual ao usuário."
                />
            </Stack>

            <Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button
                        variant="contained"
                        sx={{ width: "auto", minWidth: 150 }}
                        isLoading={salvando}
                        onClick={() => void salvar()}
                    >
                        Salvar servidor
                    </Button>
                    <Button
                        variant="outlined"
                        sx={{ width: "auto", minWidth: 170 }}
                        isLoading={testando}
                        onClick={() => void testar()}
                    >
                        Testar conexão
                    </Button>
                </Stack>
            </Box>
        </Stack>
    );
}
