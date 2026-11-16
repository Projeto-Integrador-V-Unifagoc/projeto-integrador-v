import { useState } from "react";
import { Alert, FormControlLabel, MenuItem, Radio, RadioGroup, Stack, Typography } from "@mui/material";
import Button from "./BotaoConteudo";
import { Dialog } from "../../../components/Dialog";
import TextField from "../../../components/TextField";
import type { DetalheConteudo, PaginaCompleta, TopicoConteudo } from "../../../models/conteudo-model";

// Nome + descrição: usado para criar e renomear tópico, e (sem descrição) para renomear página.
export function DialogoNome({
    open,
    titulo,
    rotulo,
    valorInicial = "",
    descricaoInicial,
    comDescricao = false,
    obrigatorio = true,
    aviso,
    textoConfirmar = "Salvar",
    onFechar,
    onConfirmar,
}: {
    open: boolean;
    titulo: string;
    rotulo: string;
    valorInicial?: string;
    descricaoInicial?: string | null;
    comDescricao?: boolean;
    obrigatorio?: boolean;
    aviso?: string;
    textoConfirmar?: string;
    onFechar: () => void;
    onConfirmar: (valor: string, descricao: string) => Promise<void>;
}) {
    const [valor, setValor] = useState(valorInicial);
    const [descricao, setDescricao] = useState(descricaoInicial ?? "");
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [abertoAntes, setAbertoAntes] = useState(open);
    // Reinicia os campos a cada abertura (ajuste durante o render, sem efeito).
    if (open !== abertoAntes) {
        setAbertoAntes(open);
        if (open) {
            setValor(valorInicial);
            setDescricao(descricaoInicial ?? "");
            setErro(null);
        }
    }

    const confirmar = async () => {
        if (obrigatorio && !valor.trim()) {
            setErro("Campo obrigatório.");
            return;
        }
        setSalvando(true);
        try {
            await onConfirmar(valor.trim(), descricao.trim());
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Dialog.Root open={open} onClose={onFechar} maxWidth="sm">
            <Dialog.Header>
                <Dialog.Title>{titulo}</Dialog.Title>
                <Dialog.ActionClose onClose={onFechar} />
            </Dialog.Header>
            <Dialog.Content>
                <Stack gap={2} sx={{ pt: 1 }}>
                    <TextField
                        autoFocus
                        label={rotulo}
                        value={valor}
                        required={obrigatorio}
                        error={Boolean(erro)}
                        helperText={erro || " "}
                        inputProps={{ maxLength: 150 }}
                        onChange={(e) => (setValor(e.target.value), setErro(null))}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !comDescricao) void confirmar();
                        }}
                    />
                    {comDescricao && (
                        <TextField
                            label="Descrição (opcional)"
                            value={descricao}
                            multiline
                            minRows={3}
                            inputProps={{ maxLength: 1000 }}
                            onChange={(e) => setDescricao(e.target.value)}
                        />
                    )}
                    {aviso && <Typography variant="body2" color="text.secondary">{aviso}</Typography>}
                </Stack>
            </Dialog.Content>
            <Dialog.Footer>
                <Button variant="outlined" onClick={onFechar} disabled={salvando}>Cancelar</Button>
                <Button variant="contained" onClick={() => void confirmar()} isLoading={salvando}>{textoConfirmar}</Button>
            </Dialog.Footer>
        </Dialog.Root>
    );
}

export function DialogoPublicar({
    topico,
    onFechar,
    onConfirmar,
}: {
    topico: TopicoConteudo | null;
    onFechar: () => void;
    onConfirmar: () => Promise<void>;
}) {
    const [salvando, setSalvando] = useState(false);
    if (!topico) return null;
    const visiveis = topico.paginas.filter((p) => !p.oculta).length;
    const ocultas = topico.paginas.length - visiveis;
    return (
        <Dialog.Root open onClose={onFechar} maxWidth="sm">
            <Dialog.Header>
                <Dialog.Title>Publicar tópico</Dialog.Title>
                <Dialog.ActionClose onClose={onFechar} />
            </Dialog.Header>
            <Dialog.Content>
                <Stack gap={2}>
                    <Typography>
                        Ao publicar, as páginas visíveis de <strong>{topico.titulo}</strong> ficarão disponíveis para os alunos das
                        turmas desta disciplina.
                    </Typography>
                    {visiveis === 0 ? (
                        <Alert severity="warning">Adicione ao menos uma página visível antes de publicar.</Alert>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            {visiveis} {visiveis === 1 ? "página será exibida" : "páginas serão exibidas"}
                            {ocultas > 0 ? ` · ${ocultas} ${ocultas === 1 ? "página oculta" : "páginas ocultas"}` : ""}
                        </Typography>
                    )}
                </Stack>
            </Dialog.Content>
            <Dialog.Footer>
                <Button variant="outlined" onClick={onFechar} disabled={salvando}>Cancelar</Button>
                <Button
                    variant="contained"
                    disabled={visiveis === 0}
                    isLoading={salvando}
                    onClick={async () => {
                        setSalvando(true);
                        try {
                            await onConfirmar();
                        } finally {
                            setSalvando(false);
                        }
                    }}
                >
                    Publicar
                </Button>
            </Dialog.Footer>
        </Dialog.Root>
    );
}

export function DialogoMoverPagina({
    topicos,
    topicoAtualId,
    onFechar,
    onConfirmar,
    maximoPaginas,
}: {
    topicos: TopicoConteudo[] | null;
    topicoAtualId: string;
    maximoPaginas: number;
    onFechar: () => void;
    onConfirmar: (topicoId: string) => void;
}) {
    const [destino, setDestino] = useState("");
    const [topicosAntes, setTopicosAntes] = useState(topicos);
    if (topicos !== topicosAntes) {
        setTopicosAntes(topicos);
        setDestino("");
    }
    if (!topicos) return null;
    return (
        <Dialog.Root open onClose={onFechar} maxWidth="xs">
            <Dialog.Header>
                <Dialog.Title>Mover página para outro tópico</Dialog.Title>
                <Dialog.ActionClose onClose={onFechar} />
            </Dialog.Header>
            <Dialog.Content>
                <RadioGroup value={destino} onChange={(e) => setDestino(e.target.value)}>
                    {topicos
                        .filter((t) => t.id !== topicoAtualId)
                        .map((t) => (
                            <FormControlLabel
                                key={t.id}
                                value={t.id}
                                disabled={t.paginas.length >= maximoPaginas}
                                control={<Radio size="small" />}
                                label={`${t.titulo}${t.paginas.length >= maximoPaginas ? " (cheio)" : ""}`}
                            />
                        ))}
                </RadioGroup>
                {topicos.length < 2 && (
                    <Typography variant="body2" color="text.secondary">Crie outro tópico para mover a página.</Typography>
                )}
            </Dialog.Content>
            <Dialog.Footer>
                <Button variant="outlined" onClick={onFechar}>Cancelar</Button>
                <Button variant="contained" disabled={!destino} onClick={() => onConfirmar(destino)}>Mover</Button>
            </Dialog.Footer>
        </Dialog.Root>
    );
}

export function DialogoConflito({
    atual,
    onVerAtual,
    onManterMinha,
    onCancelar,
}: {
    atual: PaginaCompleta | null;
    onVerAtual: () => void;
    onManterMinha: () => void;
    onCancelar: () => void;
}) {
    if (!atual) return null;
    return (
        <Dialog.Root open onClose={onCancelar} maxWidth="sm">
            <Dialog.Header>
                <Dialog.Title>Esta página foi alterada</Dialog.Title>
                <Dialog.ActionClose onClose={onCancelar} />
            </Dialog.Header>
            <Dialog.Content>
                <Typography>
                    {atual.atualizadoPorNome ?? "Outra pessoa"} salvou alterações nesta página enquanto você editava. Escolha como
                    continuar.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    "Ver versão atual" descarta o que você digitou desde o último salvamento. "Manter a minha versão" substitui a
                    versão salva pela sua.
                </Typography>
            </Dialog.Content>
            <Dialog.Footer>
                <Button variant="text" onClick={onCancelar}>Cancelar</Button>
                <Button variant="outlined" onClick={onVerAtual}>Ver versão atual</Button>
                <Button variant="contained" onClick={onManterMinha}>Manter a minha versão</Button>
            </Dialog.Footer>
        </Dialog.Root>
    );
}

export function DialogoTransferir({
    detalhe,
    open,
    onFechar,
    onConfirmar,
}: {
    detalhe: DetalheConteudo;
    open: boolean;
    onFechar: () => void;
    onConfirmar: (professorId: string) => Promise<void>;
}) {
    const [professorId, setProfessorId] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [abertoAntes, setAbertoAntes] = useState(open);
    if (open !== abertoAntes) {
        setAbertoAntes(open);
        if (open) setProfessorId("");
    }
    const candidatos = detalhe.professoresVinculados.filter((p) => p.ativo && p.id !== detalhe.responsavel?.id);
    return (
        <Dialog.Root open={open} onClose={onFechar} maxWidth="sm">
            <Dialog.Header>
                <Dialog.Title>Transferir responsável</Dialog.Title>
                <Dialog.ActionClose onClose={onFechar} />
            </Dialog.Header>
            <Dialog.Content>
                <Stack gap={2} sx={{ pt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        O novo responsável passa a ser o único professor com acesso ao conteúdo de {detalhe.disciplina.nome} em{" "}
                        {detalhe.curso.nome}. O conteúdo é mantido.
                    </Typography>
                    {candidatos.length === 0 ? (
                        <Alert severity="info">
                            Não há outro professor ativo vinculado a esta disciplina neste curso. Vincule um professor no cadastro de
                            professores.
                        </Alert>
                    ) : (
                        <TextField select label="Novo responsável" value={professorId} onChange={(e) => setProfessorId(e.target.value)}>
                            {candidatos.map((p) => (
                                <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>
                            ))}
                        </TextField>
                    )}
                </Stack>
            </Dialog.Content>
            <Dialog.Footer>
                <Button variant="outlined" onClick={onFechar} disabled={salvando}>Cancelar</Button>
                <Button
                    variant="contained"
                    disabled={!professorId}
                    isLoading={salvando}
                    onClick={async () => {
                        setSalvando(true);
                        try {
                            await onConfirmar(professorId);
                        } finally {
                            setSalvando(false);
                        }
                    }}
                >
                    Transferir
                </Button>
            </Dialog.Footer>
        </Dialog.Root>
    );
}
