import { useState } from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Autocomplete,
    Box,
    Chip,
    Divider,
    FormControlLabel,
    Stack,
    Switch,
    Typography,
} from "@mui/material";
import { ChevronDown, Send } from "lucide-react";

import Button from "../Button";
import TextField from "../TextField";
import { configuracaoEmailApi } from "../../services/configuracao-email-api";
import type { ConfiguracaoEmail, EmailRemetente } from "../../services/configuracao-email-api";

interface MensagensPanelProps {
    disparadores: ConfiguracaoEmail[];
    remetentes: EmailRemetente[];
    onAlterar: (chave: string, campo: keyof ConfiguracaoEmail, valor: string | boolean) => void;
    onSalvo: (atualizado: ConfiguracaoEmail) => void;
    onMensagem: (texto: string, tipo: "success" | "error") => void;
}

export default function MensagensPanel({
    disparadores,
    remetentes,
    onAlterar,
    onSalvo,
    onMensagem,
}: MensagensPanelProps) {
    const [emailTeste, setEmailTeste] = useState("");
    const [testando, setTestando] = useState("");
    const [salvando, setSalvando] = useState("");
    const [aberto, setAberto] = useState<string | false>(false);

    async function testar(item: ConfiguracaoEmail) {
        if (!emailTeste.trim()) {
            onMensagem("Informe o e-mail que vai receber o teste.", "error");
            return;
        }

        setTestando(item.chave);
        try {
            const resultado = await configuracaoEmailApi.enviarTeste(item.chave, emailTeste.trim());
            onMensagem(resultado.mensagem, resultado.sucesso ? "success" : "error");
        } catch (err: any) {
            onMensagem(err?.response?.data?.error ?? "Não foi possível enviar o teste.", "error");
        } finally {
            setTestando("");
        }
    }

    async function salvar(item: ConfiguracaoEmail) {
        setSalvando(item.chave);
        try {
            const atualizado = await configuracaoEmailApi.atualizar(item.chave, {
                ativo: item.ativo,
                remetente_nome: item.remetente_nome,
                remetente_email: item.remetente_email,
                assunto: item.assunto,
                titulo: item.titulo,
                mensagem: item.mensagem,
            });

            onSalvo(atualizado);
            onMensagem(`Mensagem "${atualizado.nome}" salva.`, "success");
        } catch (err: any) {
            onMensagem(err?.response?.data?.error ?? "Não foi possível salvar.", "error");
        } finally {
            setSalvando("");
        }
    }

    return (
        <Stack spacing={2} pt={1}>
            <Alert severity="info">
                Estas são as mensagens que o sistema envia sozinho. Informe um e-mail abaixo e use "Testar" para receber
                uma cópia de qualquer uma delas.
            </Alert>

            <TextField
                label="E-mail para receber os testes"
                type="email"
                value={emailTeste}
                onChange={(e) => setEmailTeste(e.target.value)}
                placeholder="voce@exemplo.com"
                InputLabelProps={{ shrink: true }}
            />

            <Divider />

            {disparadores.map((item) => (
                <Accordion
                    key={item.chave}
                    expanded={aberto === item.chave}
                    onChange={() => setAberto(aberto === item.chave ? false : item.chave)}
                    elevation={0}
                    sx={{
                        border: "1px solid #e4eaf0",
                        borderRadius: 2,
                        bgcolor: "#fff",
                        "&::before": { display: "none" },
                    }}
                >
                    <AccordionSummary expandIcon={<ChevronDown size={18} />}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            alignItems={{ sm: "center" }}
                            sx={{ width: "100%", pr: 2 }}
                        >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography fontWeight={700}>{item.nome}</Typography>
                                    <Chip
                                        size="small"
                                        label={item.ativo ? "Ativo" : "Inativo"}
                                        color={item.ativo ? "success" : "default"}
                                    />
                                </Stack>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: .3 }}>
                                    De: {item.remetente_email}
                                </Typography>
                            </Box>

                            <Button
                                variant="outlined"
                                sx={{ width: "auto", minWidth: 120, flexShrink: 0 }}
                                isLoading={testando === item.chave}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void testar(item);
                                }}
                            >
                                <Send size={15} style={{ marginRight: 6 }} />
                                Testar
                            </Button>
                        </Stack>
                    </AccordionSummary>

                    <AccordionDetails>
                        <Stack spacing={2.5} pt={1}>
                            <Typography variant="body2" color="text.secondary">
                                {item.descricao}
                            </Typography>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={item.ativo}
                                        onChange={(e) => onAlterar(item.chave, "ativo", e.target.checked)}
                                    />
                                }
                                label={item.ativo ? "Enviando automaticamente" : "Desligado"}
                            />

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                <TextField
                                    label="Nome do remetente"
                                    value={item.remetente_nome}
                                    onChange={(e) => onAlterar(item.chave, "remetente_nome", e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                                <Autocomplete
                                    freeSolo
                                    fullWidth
                                    options={remetentes.map((r) => r.email)}
                                    value={item.remetente_email}
                                    onChange={(_, valor) =>
                                        onAlterar(item.chave, "remetente_email", String(valor ?? ""))
                                    }
                                    onInputChange={(_, valor) =>
                                        onAlterar(item.chave, "remetente_email", valor)
                                    }
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="E-mail do remetente"
                                            placeholder="escolha ou digite um e-mail"
                                            InputLabelProps={{ shrink: true }}
                                            helperText="Pode digitar qualquer endereço para testar."
                                        />
                                    )}
                                />
                            </Stack>

                            <TextField
                                label="Assunto"
                                value={item.assunto}
                                onChange={(e) => onAlterar(item.chave, "assunto", e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />

                            <TextField
                                label="Título dentro da mensagem"
                                value={item.titulo}
                                onChange={(e) => onAlterar(item.chave, "titulo", e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />

                            <TextField
                                label="Mensagem"
                                value={item.mensagem}
                                onChange={(e) => onAlterar(item.chave, "mensagem", e.target.value)}
                                multiline
                                rows={5}
                                InputLabelProps={{ shrink: true }}
                                helperText="Nome, matrícula e curso entram automaticamente."
                            />

                            <Box>
                                <Button
                                    variant="contained"
                                    sx={{ width: "auto", minWidth: 150 }}
                                    isLoading={salvando === item.chave}
                                    onClick={() => void salvar(item)}
                                >
                                    Salvar mensagem
                                </Button>
                            </Box>
                        </Stack>
                    </AccordionDetails>
                </Accordion>
            ))}
        </Stack>
    );
}
