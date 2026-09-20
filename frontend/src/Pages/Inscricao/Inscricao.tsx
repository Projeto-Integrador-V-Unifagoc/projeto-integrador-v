import { useEffect, useRef, useState } from "react";
import {
    Alert,
    AppBar,
    Box,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    LinearProgress,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Stack,
    Step,
    StepLabel,
    Stepper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Toolbar,
    Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle, GraduationCap, Mail, Phone, Upload } from "lucide-react";

import { COR_BORDA, COR_DESTAQUE, COR_INSTITUCIONAL, GRADIENTE_CLARO, irParaPortal } from "../LandingPage/conteudo";
import { useViaCep } from "../../hooks/use-cep";
import { inscricaoPublicaApi } from "../../services/site-api";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import CampoSenha, { senhaForte } from "../../components/CampoSenha";
import { cpfValido } from "../../utils/cpf";
import { ACCEPT_DOCUMENTOS, TEXTO_FORMATOS, validarDocumento } from "../../utils/arquivo-documento";

const TIPOS_DOCUMENTO = [
    { tipo: "RG", label: "RG (Registro Geral)", obrigatorio: true },
    { tipo: "CPF", label: "CPF (Cadastro de Pessoa Física)", obrigatorio: false },
    { tipo: "HISTORICO", label: "Histórico Escolar do Ensino Médio", obrigatorio: true },
    { tipo: "COMPROVANTE_RESIDENCIA", label: "Comprovante de Residência", obrigatorio: true },
    { tipo: "NOTAS_ENEM", label: "Boletim de Desempenho do ENEM", obrigatorio: true },
    { tipo: "COMPROVANTE_INSCRICAO_ENEM", label: "Comprovante de Inscrição no ENEM", obrigatorio: true },
];

const STEPS = ["Dados pessoais", "Endereço", "Curso e ingresso", "Documentos", "Confirmar", "Concluído"];

interface Curso {
    id: string;
    nome: string;
    codigo: string;
}

interface DisciplinaMatriz {
    id: string;
    periodo_ideal?: number;
    obrigatoria: boolean;
    carga_horaria: number;
    disciplina: {
        id: string;
        codigo: string;
        nome: string;
    };
}

interface FormDados {
    nome: string;
    cpf: string;
    dataNascimento: string;
    email: string;
    senha: string;
    confirmarSenha: string;
}

const DADOS_INICIAIS: FormDados = {
    nome: "", cpf: "", dataNascimento: "", email: "", senha: "", confirmarSenha: "",
};

const REQUISITOS_SENHA =
    "Mínimo de 8 caracteres, com maiúscula, minúscula, número e caractere especial.";

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMAIL_EM_USO =
    "Este e-mail já está cadastrado. Use outro endereço ou entre no portal com ele.";

function mensagemCpfEmUso(matricula: number | null): string {
    if (matricula) {
        return `Este CPF já tem inscrição na instituição (matrícula ${matricula}). Entre no portal ou fale com a secretaria.`;
    }
    return "Já existe um cadastro com este CPF. Fale com a secretaria para continuar.";
}

interface FormEndereco {
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidadeIbge: string;
    cidadeNome: string;
    estado: string;
}

interface DocumentoUpload {
    tipo: string;
    arquivo: File;
}

const PADRAO_ERRO_TECNICO = /insert into|select |update |delete from|constraint|restrição de unicidade|violates|duplicar valor|relation |column /i;

function getMensagemErro(err: unknown, fallback: string): string {
    const axiosErr = err as { response?: { data?: { error?: string; mensagem?: string } } };
    const bruta =
        axiosErr?.response?.data?.error ??
        axiosErr?.response?.data?.mensagem ??
        (err instanceof Error ? err.message : "");

    if (!bruta || PADRAO_ERRO_TECNICO.test(bruta)) return fallback;
    return bruta;
}

function formatCpf(value: string): string {
    const d = value.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

const CHAVE_RASCUNHO = "@UniEduca:inscricao-rascunho";

interface Rascunho {
    dados: FormDados;
    endereco: FormEndereco;
    cursoId: string;
    activeStep: number;
}

function lerRascunho(): Rascunho | null {
    try {
        const bruto = localStorage.getItem(CHAVE_RASCUNHO);
        return bruto ? (JSON.parse(bruto) as Rascunho) : null;
    } catch {
        return null;
    }
}

function salvarRascunho(rascunho: Rascunho): void {
    try {
        localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(rascunho));
    } catch {
        return;
    }
}

function apagarRascunho(): void {
    try {
        localStorage.removeItem(CHAVE_RASCUNHO);
    } catch {
        return;
    }
}

function formatCep(value: string): string {
    const d = value.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export default function Inscricao() {
    const navigate = useNavigate();
    const { buscarCep, carregando: buscandoCep } = useViaCep();

    const [carregandoCursos, setCarregandoCursos] = useState(true);
    const [activeStep, setActiveStep] = useState(0);
    const [dados, setDados] = useState<FormDados>(DADOS_INICIAIS);
    const [endereco, setEndereco] = useState<FormEndereco>({
        cep: "", logradouro: "", numero: "", bairro: "", cidadeIbge: "", cidadeNome: "", estado: "",
    });
    const [cursoId, setCursoId] = useState("");
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [matrizPeriodo1, setMatrizPeriodo1] = useState<DisciplinaMatriz[]>([]);
    const [carregandoMatriz, setCarregandoMatriz] = useState(false);
    const [documentos, setDocumentos] = useState<DocumentoUpload[]>([]);
    const [enviando, setEnviando] = useState(false);
    const [verificandoCpf, setVerificandoCpf] = useState(false);
    const [erros, setErros] = useState<Record<string, string>>({});
    const [snackbar, setSnackbar] = useState<{ aberto: boolean; mensagem: string; severidade: "success" | "error" }>({
        aberto: false, mensagem: "", severidade: "success",
    });
    const [matriculaGerada, setMatriculaGerada] = useState<string | null>(null);
    const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false);
    const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => {
        inscricaoPublicaApi
            .cursos()
            .then((data) => setCursos(Array.isArray(data) ? data : []))
            .catch(() => setCursos([]))
            .finally(() => setCarregandoCursos(false));
    }, []);

    useEffect(() => {
        const rascunho = lerRascunho();
        if (!rascunho) return;

        setDados({ ...DADOS_INICIAIS, ...rascunho.dados, senha: "", confirmarSenha: "" });
        setEndereco((atual) => ({ ...atual, ...rascunho.endereco }));
        setCursoId(rascunho.cursoId ?? "");
        setActiveStep(Math.min(rascunho.activeStep ?? 0, 4));
        setRascunhoRestaurado(true);
    }, []);

    useEffect(() => {
        if (activeStep >= 5) return;

        const vazio = !dados.nome && !dados.cpf && !dados.email && !endereco.cep && !cursoId;
        if (vazio) return;

        salvarRascunho({
            dados: { ...dados, senha: "", confirmarSenha: "" },
            endereco,
            cursoId,
            activeStep,
        });
    }, [dados, endereco, cursoId, activeStep]);

    useEffect(() => {
        if (!cursoId) {
            setMatrizPeriodo1([]);
            return;
        }
        setCarregandoMatriz(true);
        inscricaoPublicaApi.matrizCurricular(cursoId, 1)
            .then((data) => setMatrizPeriodo1(Array.isArray(data) ? data : []))
            .catch(() => setMatrizPeriodo1([]))
            .finally(() => setCarregandoMatriz(false));
    }, [cursoId]);

    function docDeTipo(tipo: string): File | undefined {
        return documentos.find((d) => d.tipo === tipo)?.arquivo;
    }

    async function handleAdicionarDoc(tipo: string, arquivo: File) {
        const problema = await validarDocumento(arquivo);

        if (problema) {
            setErros((e) => ({ ...e, documentos: problema }));
            setSnackbar({ aberto: true, mensagem: problema, severidade: "error" });
            return;
        }

        setErros((e) => { const proximo = { ...e }; delete proximo.documentos; return proximo; });
        setDocumentos((prev) => [...prev.filter((d) => d.tipo !== tipo), { tipo, arquivo }]);
    }

    function validarStep(step: number): Record<string, string> {
        const e: Record<string, string> = {};
        if (step === 0) {
            if (!dados.nome.trim()) e.nome = "Nome obrigatório.";
            if (!cpfValido(dados.cpf)) e.cpf = "Informe um CPF válido.";
            if (!dados.dataNascimento) e.dataNascimento = "Data de nascimento obrigatória.";
            if (!FORMATO_EMAIL.test(dados.email.trim())) e.email = "Informe um e-mail válido.";
            if (!senhaForte(dados.senha)) e.senha = REQUISITOS_SENHA;
            if (dados.senha !== dados.confirmarSenha) e.confirmarSenha = "As senhas não conferem.";
        }
        if (step === 1) {
            if (endereco.cep.replace(/\D/g, "").length !== 8) e.cep = "CEP inválido.";
            if (!endereco.logradouro.trim()) e.logradouro = "Logradouro obrigatório.";
            if (!endereco.numero.trim()) e.numero = 'Informe o número ou "S/N".';
            if (!endereco.bairro.trim()) e.bairro = "Bairro obrigatório.";
            if (!endereco.cidadeIbge) e.cidadeIbge = "Busque um CEP válido para preencher a cidade.";
        }
        if (step === 2) {
            if (!cursoId) e.cursoId = "Selecione um curso.";
        }
        if (step === 3) {
            const faltando = TIPOS_DOCUMENTO
                .filter(({ tipo, obrigatorio }) => obrigatorio && !docDeTipo(tipo))
                .map(({ label }) => label);
            if (faltando.length > 0) {
                e.documentos = `Envie os documentos obrigatórios: ${faltando.join(", ")}.`;
            }
        }
        return e;
    }

    function definirErro(campo: string, mensagem: string | null) {
        setErros((atual) => {
            const proximo = { ...atual };
            if (mensagem) proximo[campo] = mensagem;
            else delete proximo[campo];
            return proximo;
        });
    }

    async function checarCpfCadastrado(): Promise<string | null> {
        if (!cpfValido(dados.cpf)) return null;

        try {
            const resultado = await inscricaoPublicaApi.cpfCadastrado(dados.cpf);
            const mensagem = resultado.cadastrado ? mensagemCpfEmUso(resultado.matricula) : null;
            definirErro("cpf", mensagem);
            return mensagem;
        } catch {
            return null;
        }
    }

    async function checarEmailCadastrado(): Promise<string | null> {
        const email = dados.email.trim();
        if (!FORMATO_EMAIL.test(email)) return null;

        try {
            const cadastrado = await inscricaoPublicaApi.emailCadastrado(email);
            const mensagem = cadastrado ? EMAIL_EM_USO : null;
            definirErro("email", mensagem);
            return mensagem;
        } catch {
            return null;
        }
    }

    async function avancar() {
        const e = validarStep(activeStep);
        if (Object.keys(e).length > 0) { setErros(e); return; }

        if (activeStep === 0) {
            setVerificandoCpf(true);
            const [erroCpf, erroEmail] = await Promise.all([checarCpfCadastrado(), checarEmailCadastrado()]);
            setVerificandoCpf(false);

            if (erroCpf || erroEmail) {
                setErros({
                    ...(erroCpf ? { cpf: erroCpf } : {}),
                    ...(erroEmail ? { email: erroEmail } : {}),
                });
                return;
            }
        }

        setErros({});
        setActiveStep((s) => s + 1);
    }

    function voltar() {
        setErros({});
        setActiveStep((s) => s - 1);
    }

    async function handleBuscarCep() {
        const resultado = await buscarCep(endereco.cep);
        if (!resultado) {
            setErros((e) => ({ ...e, cep: "CEP não encontrado." }));
            return;
        }
        setEndereco((prev) => ({
            ...prev,
            logradouro: resultado.logradouro || prev.logradouro,
            bairro: resultado.bairro || prev.bairro,
            cidadeIbge: String(resultado.ibge),
            cidadeNome: resultado.localidade,
            estado: resultado.uf,
        }));
        setErros((e) => { const next = { ...e }; delete next.cep; delete next.cidadeIbge; return next; });
    }

    async function handleEnviar() {
        const pendencias = [validarStep(0), validarStep(1), validarStep(2), validarStep(3)]
            .reduce((acc, atual) => ({ ...acc, ...atual }), {});

        if (Object.keys(pendencias).length > 0) {
            setErros(pendencias);
            setSnackbar({
                aberto: true,
                mensagem: pendencias.documentos ?? "Revise os dados da inscrição antes de confirmar.",
                severidade: "error",
            });
            setActiveStep(pendencias.documentos ? 3 : 0);
            return;
        }

        setEnviando(true);
        try {
            const payload = {
                periodo: 1,
                curso: cursoId,
                usuario: {
                    email: dados.email.trim().toLowerCase(),
                    senha: dados.senha,
                },
                pessoa: {
                    cpf: dados.cpf.replace(/\D/g, ""),
                    nome: dados.nome.trim(),
                    dataNascimento: dados.dataNascimento,
                    logradouro: endereco.logradouro.trim(),
                    numero: endereco.numero.trim(),
                    bairro: endereco.bairro.trim(),
                    cidadeIbge: endereco.cidadeIbge,
                    estado: endereco.estado,
                    cep: endereco.cep.replace(/\D/g, ""),
                },
            };

            const alunoCreated = await inscricaoPublicaApi.inscrever(payload);

            for (const doc of documentos) {
                await inscricaoPublicaApi.enviarDocumento(alunoCreated.id, doc.tipo, doc.arquivo);
            }

            setMatriculaGerada(alunoCreated.matricula ? String(alunoCreated.matricula) : null);
            apagarRascunho();
            setRascunhoRestaurado(false);
            setActiveStep(5);
        } catch (err) {
            const mensagem = getMensagemErro(
                err,
                "Não foi possível concluir a inscrição. Confira os dados e tente novamente.",
            );

            if (/cpf/i.test(mensagem)) {
                setErros({ cpf: mensagem });
                setActiveStep(0);
            } else if (/e-?mail/i.test(mensagem)) {
                setErros({ email: mensagem });
                setActiveStep(0);
            }

            setSnackbar({ aberto: true, mensagem, severidade: "error" });
        } finally {
            setEnviando(false);
        }
    }

    function resetar() {
        apagarRascunho();
        setRascunhoRestaurado(false);
        setActiveStep(0);
        setDados(DADOS_INICIAIS);
        setEndereco({ cep: "", logradouro: "", numero: "", bairro: "", cidadeIbge: "", cidadeNome: "", estado: "" });
        setCursoId("");
        setMatrizPeriodo1([]);
        setDocumentos([]);
        setMatriculaGerada(null);
        setErros({});
    }

    const cursoSelecionado = cursos.find((c) => c.id === cursoId);
    const totalCH = matrizPeriodo1.reduce((acc, d) => acc + d.carga_horaria, 0);

    // ── Step content ─────────────────────────────────────────────────────────────

    const step0 = (
        <Stack spacing={2.5}>
            <Typography variant="h6" fontWeight={700}>Dados pessoais</Typography>

            {rascunhoRestaurado && (
                <Alert severity="info" onClose={() => setRascunhoRestaurado(false)}>
                    Recuperamos o que você já tinha preenchido. Por segurança, a senha e os documentos precisam
                    ser informados de novo.
                </Alert>
            )}
            <TextField
                label="Nome completo *"
                value={dados.nome}
                onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))}
                error={!!erros.nome}
                helperText={erros.nome}
                InputLabelProps={{ shrink: true }}
            />
            <TextField
                label="CPF *"
                value={dados.cpf}
                placeholder="000.000.000-00"
                onChange={(e) => setDados((d) => ({ ...d, cpf: formatCpf(e.target.value) }))}
                onBlur={() => void checarCpfCadastrado()}
                error={!!erros.cpf}
                helperText={erros.cpf}
                InputLabelProps={{ shrink: true }}
            />
            <TextField
                label="Data de nascimento *"
                type="date"
                value={dados.dataNascimento}
                onChange={(e) => setDados((d) => ({ ...d, dataNascimento: e.target.value }))}
                error={!!erros.dataNascimento}
                helperText={erros.dataNascimento}
                InputLabelProps={{ shrink: true }}
            />

            <Divider sx={{ pt: 1 }} />

            <Typography variant="subtitle1" fontWeight={700}>Acesso ao portal</Typography>
            <Alert severity="info">
                Guarde este e-mail e senha: o acesso ao portal do aluno é liberado assim que a secretaria aprovar a sua
                documentação.
            </Alert>

            <TextField
                label="E-mail *"
                type="email"
                placeholder="voce@exemplo.com"
                value={dados.email}
                onChange={(e) => setDados((d) => ({ ...d, email: e.target.value }))}
                onBlur={() => void checarEmailCadastrado()}
                error={!!erros.email}
                helperText={erros.email ?? "Será o seu login no portal do aluno."}
                InputLabelProps={{ shrink: true }}
            />
            <CampoSenha
                label="Senha *"
                value={dados.senha}
                onChange={(valor) => setDados((d) => ({ ...d, senha: valor }))}
                error={!!erros.senha}
                helperText={erros.senha}
                mostrarForca
                mostrarRequisitos
            />
            <CampoSenha
                label="Confirmar senha *"
                value={dados.confirmarSenha}
                onChange={(valor) => setDados((d) => ({ ...d, confirmarSenha: valor }))}
                error={!!erros.confirmarSenha}
                helperText={
                    erros.confirmarSenha ??
                    (dados.confirmarSenha && dados.senha === dados.confirmarSenha ? "As senhas conferem." : undefined)
                }
            />
        </Stack>
    );

    const step1 = (
        <Stack spacing={2.5}>
            <Typography variant="h6" fontWeight={700}>Endereço</Typography>
            <Stack direction="row" spacing={1}>
                <TextField
                    label="CEP *"
                    value={endereco.cep}
                    placeholder="00000-000"
                    onChange={(e) => setEndereco((d) => ({ ...d, cep: formatCep(e.target.value) }))}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleBuscarCep(); }}
                    error={!!erros.cep}
                    helperText={erros.cep}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                />
                <Button
                    variant="outlined"
                    sx={{ width: "auto", minWidth: 110, height: 56 }}
                    onClick={() => void handleBuscarCep()}
                    isLoading={buscandoCep}
                    disabled={endereco.cep.replace(/\D/g, "").length !== 8}
                >
                    Buscar CEP
                </Button>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                    label="Logradouro *"
                    value={endereco.logradouro}
                    onChange={(e) => setEndereco((d) => ({ ...d, logradouro: e.target.value }))}
                    error={!!erros.logradouro}
                    helperText={erros.logradouro}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 2 }}
                />
                <TextField
                    label="Número *"
                    value={endereco.numero}
                    placeholder="120 ou S/N"
                    onChange={(e) => setEndereco((d) => ({ ...d, numero: e.target.value.slice(0, 20) }))}
                    error={!!erros.numero}
                    helperText={erros.numero}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                    label="Bairro *"
                    value={endereco.bairro}
                    onChange={(e) => setEndereco((d) => ({ ...d, bairro: e.target.value }))}
                    error={!!erros.bairro}
                    helperText={erros.bairro}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                />
                <TextField
                    label="Cidade"
                    value={endereco.cidadeNome}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                    disabled
                />
                <TextField
                    label="Estado"
                    value={endereco.estado}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                    disabled
                />
            </Stack>
            {erros.cidadeIbge && <Alert severity="error">{erros.cidadeIbge}</Alert>}
        </Stack>
    );

    const step2 = (
        <Stack spacing={2.5}>
            <Typography variant="h6" fontWeight={700}>Curso e forma de ingresso</Typography>

            <FormControl fullWidth error={!!erros.cursoId}>
                <InputLabel shrink>Curso *</InputLabel>
                {carregandoCursos ? (
                    <Stack direction="row" alignItems="center" spacing={1} py={2}>
                        <CircularProgress size={18} />
                        <Typography variant="body2" color="text.secondary">Carregando cursos...</Typography>
                    </Stack>
                ) : (
                    <Select
                        value={cursoId}
                        label="Curso *"
                        notched
                        displayEmpty
                        onChange={(e) => setCursoId(e.target.value)}
                    >
                        <MenuItem value="" disabled>
                            <Typography color="text.secondary">Selecione um curso</Typography>
                        </MenuItem>
                        {cursos.map((c) => (
                            <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>
                        ))}
                    </Select>
                )}
                {erros.cursoId && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>{erros.cursoId}</Typography>
                )}
            </FormControl>

            {!carregandoCursos && cursos.length === 0 && (
                <Alert severity="warning">
                    Nenhum curso com inscrições abertas no momento. Se o problema persistir, entre em contato com a
                    secretaria.
                </Alert>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Box
                    flex={1}
                    sx={(t) => ({
                        border: `1px solid ${t.palette.grey[300]}`,
                        borderRadius: 1,
                        px: 2,
                        py: 1.5,
                        backgroundColor: t.palette.grey[50],
                    })}
                >
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                        Período de ingresso
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip label="1º Período" color="primary" size="small" />
                        <Typography variant="body2" color="text.secondary">
                            Definido automaticamente para candidatos novos.
                        </Typography>
                    </Stack>
                </Box>

                <Box
                    flex={1}
                    sx={(t) => ({
                        border: `1px solid ${t.palette.grey[300]}`,
                        borderRadius: 1,
                        px: 2,
                        py: 1.5,
                        backgroundColor: t.palette.grey[50],
                    })}
                >
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                        Forma de ingresso
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip label="ENEM" color="success" size="small" />
                        <Typography variant="body2" color="text.secondary">
                            Única modalidade aceita neste processo seletivo.
                        </Typography>
                    </Stack>
                </Box>
            </Stack>

            {cursoId && (
                <Box>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>
                        Disciplinas do 1º Período
                    </Typography>

                    {carregandoMatriz ? (
                        <Stack direction="row" alignItems="center" spacing={1} py={1}>
                            <CircularProgress size={18} />
                            <Typography variant="body2" color="text.secondary">Carregando matriz curricular...</Typography>
                        </Stack>
                    ) : matrizPeriodo1.length === 0 ? (
                        <Alert severity="warning">
                            Nenhuma disciplina cadastrada para o 1º período deste curso. Entre em contato com a secretaria.
                        </Alert>
                    ) : (
                        <Box sx={{ overflowX: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Disciplina</TableCell>
                                        <TableCell>Código</TableCell>
                                        <TableCell align="right">C.H.</TableCell>
                                        <TableCell align="center">Obrigatória</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {matrizPeriodo1.map((d) => (
                                        <TableRow key={d.id}>
                                            <TableCell>{d.disciplina.nome}</TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">
                                                    {d.disciplina.codigo}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">{d.carga_horaria}h</TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={d.obrigatoria ? "Sim" : "Não"}
                                                    size="small"
                                                    color={d.obrigatoria ? "primary" : "default"}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                Total de carga horária no período: <strong>{totalCH}h</strong>
                            </Typography>
                        </Box>
                    )}
                </Box>
            )}
        </Stack>
    );

    const step3 = (
        <Stack spacing={2.5}>
            <Typography variant="h6" fontWeight={700}>Documentos</Typography>
            <Alert severity="info">
                Para ingresso via ENEM, envie os documentos abaixo. Os marcados com <strong>*</strong> são obrigatórios
                para concluir a inscrição. Formatos aceitos: PDF, imagem (JPG, PNG, WEBP, GIF) ou ZIP,
                com no máximo 10 MB cada.
            </Alert>

            {erros.documentos && <Alert severity="error">{erros.documentos}</Alert>}
            <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Documento</TableCell>
                            <TableCell>Arquivo selecionado</TableCell>
                            <TableCell align="right">Ação</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {TIPOS_DOCUMENTO.map(({ tipo, label, obrigatorio }) => {
                            const arquivo = docDeTipo(tipo);
                            return (
                                <TableRow key={tipo}>
                                    <TableCell>
                                        {label}
                                        {obrigatorio && (
                                            <Typography component="span" color="error" ml={0.5}>*</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {arquivo ? (
                                            <Chip
                                                label={arquivo.name}
                                                size="small"
                                                color="success"
                                                onDelete={() => setDocumentos((d) => d.filter((x) => x.tipo !== tipo))}
                                                sx={{ maxWidth: 220 }}
                                            />
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">Não enviado</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <input
                                            type="file"
                                            accept={ACCEPT_DOCUMENTOS}
                                            style={{ display: "none" }}
                                            ref={(el) => { fileRefs.current[tipo] = el; }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) void handleAdicionarDoc(tipo, file);
                                                e.target.value = "";
                                            }}
                                        />
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            sx={{ width: "auto", minWidth: 100 }}
                                            onClick={() => fileRefs.current[tipo]?.click()}
                                        >
                                            <Upload size={14} style={{ marginRight: 4 }} />
                                            {arquivo ? "Substituir" : "Enviar"}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Box>
        </Stack>
    );

    const step4 = (
        <Stack spacing={2.5}>
            <Typography variant="h6" fontWeight={700}>Confirmar inscrição</Typography>
            <Divider />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
                <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" display="block">Nome</Typography>
                    <Typography variant="body2" fontWeight={600}>{dados.nome}</Typography>
                </Box>
                <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" display="block">CPF</Typography>
                    <Typography variant="body2">{dados.cpf}</Typography>
                </Box>
                <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" display="block">Data de nascimento</Typography>
                    <Typography variant="body2">{dados.dataNascimento}</Typography>
                </Box>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
                <Box flex={2}>
                    <Typography variant="caption" color="text.secondary" display="block">Endereço</Typography>
                    <Typography variant="body2">
                        {endereco.logradouro}, {endereco.numero} — {endereco.bairro},{" "}
                        {endereco.cidadeNome}/{endereco.estado}
                    </Typography>
                </Box>
                <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" display="block">CEP</Typography>
                    <Typography variant="body2">{endereco.cep}</Typography>
                </Box>
            </Stack>

            <Divider />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
                <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" display="block">Curso</Typography>
                    <Typography variant="body2" fontWeight={600}>{cursoSelecionado?.nome ?? "—"}</Typography>
                </Box>
                <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" display="block">Período de ingresso</Typography>
                    <Chip label="1º Período" color="primary" size="small" sx={{ mt: 0.5 }} />
                </Box>
                <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" display="block">Forma de ingresso</Typography>
                    <Chip label="ENEM" color="success" size="small" sx={{ mt: 0.5 }} />
                </Box>
            </Stack>

            {matrizPeriodo1.length > 0 && (
                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                        Disciplinas do 1º Período ({matrizPeriodo1.length} disciplinas · {totalCH}h)
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {matrizPeriodo1.map((d) => (
                            <Chip
                                key={d.id}
                                label={d.disciplina.nome}
                                size="small"
                                variant="outlined"
                                color={d.obrigatoria ? "primary" : "default"}
                            />
                        ))}
                    </Stack>
                </Box>
            )}

            <Divider />

            <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Documentos selecionados ({documentos.length})
                </Typography>
                {documentos.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Nenhum documento selecionado.</Typography>
                ) : (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {documentos.map((d) => (
                            <Chip
                                key={d.tipo}
                                label={TIPOS_DOCUMENTO.find((t) => t.tipo === d.tipo)?.label ?? d.tipo}
                                size="small"
                                color="success"
                            />
                        ))}
                    </Stack>
                )}
            </Box>
        </Stack>
    );

    const step5 = (
        <Stack alignItems="center" spacing={3} py={4} textAlign="center">
            <CheckCircle size={64} color="#2e7d32" />
            <Typography variant="h5" fontWeight={700} color="success.dark">Inscrição realizada!</Typography>
            <Typography variant="body2" color="text.secondary">
                Sua inscrição foi enviada com sucesso.
                {matriculaGerada && (
                    <> Número de matrícula: <strong>{matriculaGerada}</strong>.</>
                )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Aguarde a confirmação da secretaria. Os documentos enviados serão analisados em breve.
            </Typography>

            <Alert severity="info" sx={{ textAlign: "left", maxWidth: 560 }}>
                O acesso ao portal é liberado quando a secretaria aprovar a sua documentação. Assim que isso acontecer,
                você receberá um e-mail em <strong>{dados.email || "seu e-mail"}</strong> com o link para entrar, usando
                a senha que acabou de cadastrar.
            </Alert>

            <Button variant="outlined" sx={{ width: "auto", minWidth: 200, height: 46, borderRadius: 2, mt: 1 }} onClick={resetar}>
                Nova inscrição
            </Button>
        </Stack>
    );

    const stepContent = [step0, step1, step2, step3, step4, step5];

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#fff", display: "flex", flexDirection: "column" }}>
            <AppBar position="sticky" elevation={0} sx={{ bgcolor: "#fff", borderBottom: `1px solid ${COR_BORDA}` }}>
                <Toolbar sx={{ maxWidth: 1180, width: "100%", mx: "auto", px: { xs: 2, md: 4 }, minHeight: 68 }}>
                    <Stack
                        direction="row"
                        spacing={1.2}
                        alignItems="center"
                        sx={{ flexGrow: 1, cursor: "pointer" }}
                        onClick={() => navigate("/")}
                    >
                        <Box
                            sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 1.6,
                                bgcolor: COR_INSTITUCIONAL,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <GraduationCap size={20} color="#fff" />
                        </Box>
                        <Typography sx={{ fontSize: 20, fontWeight: 800, color: COR_INSTITUCIONAL }}>
                            Uni<Box component="span" sx={{ color: COR_DESTAQUE }}>Educa</Box>
                        </Typography>
                    </Stack>

                    <Button
                        variant="text"
                        sx={{ width: "auto", color: "#5b6472", fontSize: 14.5, display: { xs: "none", sm: "flex" } }}
                        onClick={() => navigate("/")}
                    >
                        <ArrowLeft size={16} style={{ marginRight: 6 }} />
                        Voltar ao site
                    </Button>

                    <Button
                        variant="outlined"
                        sx={{ width: "auto", ml: 1.5, height: 40, px: 2.5, fontSize: 14.5, borderRadius: 2 }}
                        onClick={() => irParaPortal(navigate)}
                    >
                        Já tenho acesso
                    </Button>
                </Toolbar>
            </AppBar>

            <Snackbar
                open={snackbar.aberto}
                autoHideDuration={6000}
                onClose={() => setSnackbar((s) => ({ ...s, aberto: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    severity={snackbar.severidade}
                    variant="filled"
                    onClose={() => setSnackbar((s) => ({ ...s, aberto: false }))}
                    sx={{ width: "100%" }}
                >
                    {snackbar.mensagem}
                </Alert>
            </Snackbar>

            <Box
                component="section"
                sx={{
                    background: GRADIENTE_CLARO,
                    borderBottom: `1px solid ${COR_BORDA}`,
                    py: { xs: 4, md: 5.5 },
                }}
            >
                <Box sx={{ maxWidth: 860, mx: "auto", px: { xs: 3, md: 2 } }}>
                    <Typography
                        component="h1"
                        sx={{ color: COR_INSTITUCIONAL, fontWeight: 800, fontSize: { xs: "1.7rem", md: "2.2rem" }, lineHeight: 1.2 }}
                    >
                        Inscrição online
                    </Typography>
                    <Typography sx={{ color: "#5b6472", fontSize: { xs: ".96rem", md: "1.05rem" }, mt: 1.2, lineHeight: 1.7 }}>
                        Preencha os dados, envie os documentos e acompanhe a validação pelo portal do aluno. Leva poucos
                        minutos e não tem taxa.
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={2.5}>
                        {["Sem taxa de inscrição", "Ingresso pela nota do ENEM", "100% online"].map((item) => (
                            <Chip
                                key={item}
                                label={item}
                                size="small"
                                sx={{ bgcolor: "#fff", color: COR_INSTITUCIONAL, fontWeight: 600, border: `1px solid ${COR_BORDA}` }}
                            />
                        ))}
                    </Stack>
                </Box>
            </Box>

            <Stack alignItems="center" py={{ xs: 3, md: 5 }} px={2} spacing={3.5} sx={{ flex: 1 }}>
                <Box sx={{ width: "100%", maxWidth: 860 }}>
                    <Stepper activeStep={activeStep} alternativeLabel sx={{ display: { xs: "none", sm: "flex" } }}>
                        {STEPS.map((label) => (
                            <Step key={label}><StepLabel>{label}</StepLabel></Step>
                        ))}
                    </Stepper>

                    <Box sx={{ display: { xs: "block", sm: "none" } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1}>
                            <Typography sx={{ fontWeight: 700, color: COR_INSTITUCIONAL, fontSize: "1rem" }}>
                                {STEPS[activeStep]}
                            </Typography>
                            <Typography sx={{ fontSize: ".82rem", color: "text.secondary" }}>
                                Etapa {Math.min(activeStep + 1, STEPS.length)} de {STEPS.length}
                            </Typography>
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={((activeStep + 1) / STEPS.length) * 100}
                            sx={{ height: 6, borderRadius: 999 }}
                        />
                    </Box>
                </Box>

                <Paper
                    elevation={0}
                    sx={{
                        width: "100%",
                        maxWidth: 860,
                        bgcolor: "#fff",
                        border: `1px solid ${COR_BORDA}`,
                        borderRadius: 3,
                        boxShadow: "0 10px 30px rgba(20,104,143,.07)",
                        p: { xs: 2.5, sm: 4 },
                    }}
                >
                    {stepContent[activeStep]}

                    {activeStep < 5 && (
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            mt={4}
                            pt={3}
                            sx={{ borderTop: `1px solid ${COR_BORDA}` }}
                        >
                            {activeStep > 0 ? (
                                <Button variant="outlined" sx={{ width: "auto", minWidth: 120, height: 46, borderRadius: 2 }} onClick={voltar}>
                                    <ArrowLeft size={16} style={{ marginRight: 6 }} />
                                    Anterior
                                </Button>
                            ) : (
                                <Box />
                            )}
                            {activeStep < 4 && (
                                <Button
                                    variant="contained"
                                    sx={{ width: "auto", minWidth: 150, height: 46, borderRadius: 2 }}
                                    isLoading={verificandoCpf}
                                    onClick={() => void avancar()}
                                >
                                    Continuar
                                    <ArrowRight size={16} style={{ marginLeft: 6 }} />
                                </Button>
                            )}
                            {activeStep === 4 && (
                                <Button
                                    variant="contained"
                                    sx={{ width: "auto", minWidth: 210, height: 46, borderRadius: 2 }}
                                    isLoading={enviando}
                                    onClick={() => void handleEnviar()}
                                >
                                    Confirmar inscrição
                                </Button>
                            )}
                        </Stack>
                    )}
                </Paper>

                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={{ xs: 1, sm: 3 }}
                    alignItems="center"
                    justifyContent="center"
                    sx={{ width: "100%", maxWidth: 860 }}
                >
                    <Typography sx={{ fontSize: ".9rem", color: "text.secondary" }}>
                        Ficou com dúvida? Fale com a secretaria:
                    </Typography>
                    <Stack direction="row" spacing={2.5}>
                        <Stack direction="row" spacing={.7} alignItems="center">
                            <Phone size={15} color={COR_DESTAQUE} />
                            <Typography sx={{ fontSize: ".9rem", color: COR_INSTITUCIONAL, fontWeight: 600 }}>
                                (32) 3000-0000
                            </Typography>
                        </Stack>
                        <Stack direction="row" spacing={.7} alignItems="center">
                            <Mail size={15} color={COR_DESTAQUE} />
                            <Typography sx={{ fontSize: ".9rem", color: COR_INSTITUCIONAL, fontWeight: 600 }}>
                                contato@unieduca.net.br
                            </Typography>
                        </Stack>
                    </Stack>
                </Stack>
            </Stack>
        </Box>
    );
}
