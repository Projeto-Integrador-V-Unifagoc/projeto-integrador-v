import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, IconButton, Tooltip } from "@mui/material";
import { Pencil, Trash2 } from "lucide-react";
import type { GridColDef } from "@mui/x-data-grid";

import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import SearchTextField from "../../components/SearchTextField/SearchTextField";
import { Dialog } from "../../components/Dialog";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import { Card } from "../../components/Card/index";
import SearchableSelect from "../../components/SearchableSelect/SearchableSelect.tsx";
import type { SelectOption } from "../../components/SearchableSelect/SearchableSelect.tsx";

import { professorApi } from "../../services/professor-api";
import type { Professor, AtualizarProfessorDTO } from "../../models/professor-model";
import type { Cursos } from "../../enums/cursos";

// Dados mockados
const MOCK_CURSOS: SelectOption[] = [
    { id: '550e8400-e29b-41d4-a716-446655440001', label: 'Engenharia da Computação', sublabel: 'EC001' },
    { id: '550e8400-e29b-41d4-a716-446655440002', label: 'Sistemas de Informação', sublabel: 'SI001' },
    { id: '550e8400-e29b-41d4-a716-446655440003', label: 'Ciência da Computação', sublabel: 'CC001' },
    { id: '550e8400-e29b-41d4-a716-446655440004', label: 'Engenharia de Software', sublabel: 'ES001' },
];

const MOCK_FACULDADES: SelectOption[] = [
    { id: '550e8400-e29b-41d4-a716-446655440010', label: 'Faculdade de Tecnologia', sublabel: undefined },
    { id: '550e8400-e29b-41d4-a716-446655440011', label: 'Faculdade de Engenharia', sublabel: undefined },
    { id: '550e8400-e29b-41d4-a716-446655440012', label: 'Faculdade de Ciências Exatas', sublabel: undefined },
];

const MOCK_ESTADOS: SelectOption[] = [
    { id: 'SP', label: 'SP — São Paulo', sublabel: 'SP' },
    { id: 'RJ', label: 'RJ — Rio de Janeiro', sublabel: 'RJ' },
    { id: 'MG', label: 'MG — Minas Gerais', sublabel: 'MG' },
    { id: 'RS', label: 'RS — Rio Grande do Sul', sublabel: 'RS' },
    { id: 'BA', label: 'BA — Bahia', sublabel: 'BA' },
];

const MOCK_CIDADES: Record<string, SelectOption[]> = {
    SP: [
        { id: '550e8400-e29b-41d4-a716-446655440100', label: 'São Paulo', sublabel: 'SP' },
        { id: '550e8400-e29b-41d4-a716-446655440101', label: 'Campinas', sublabel: 'SP' },
        { id: '550e8400-e29b-41d4-a716-446655440102', label: 'Santos', sublabel: 'SP' },
        { id: '550e8400-e29b-41d4-a716-446655440103', label: 'Sorocaba', sublabel: 'SP' },
    ],
    RJ: [
        { id: '550e8400-e29b-41d4-a716-446655440104', label: 'Rio de Janeiro', sublabel: 'RJ' },
        { id: '550e8400-e29b-41d4-a716-446655440105', label: 'Niterói', sublabel: 'RJ' },
        { id: '550e8400-e29b-41d4-a716-446655440106', label: 'Duque de Caxias', sublabel: 'RJ' },
    ],
    MG: [
        { id: '550e8400-e29b-41d4-a716-446655440107', label: 'Belo Horizonte', sublabel: 'MG' },
        { id: '550e8400-e29b-41d4-a716-446655440108', label: 'Uberlândia', sublabel: 'MG' },
        { id: '550e8400-e29b-41d4-a716-446655440109', label: 'Contagem', sublabel: 'MG' },
    ],
    RS: [
        { id: '550e8400-e29b-41d4-a716-446655440110', label: 'Porto Alegre', sublabel: 'RS' },
        { id: '550e8400-e29b-41d4-a716-446655440111', label: 'Caxias do Sul', sublabel: 'RS' },
        { id: '550e8400-e29b-41d4-a716-446655440112', label: 'Pelotas', sublabel: 'RS' },
    ],
    BA: [
        { id: '550e8400-e29b-41d4-a716-446655440113', label: 'Salvador', sublabel: 'BA' },
        { id: '550e8400-e29b-41d4-a716-446655440114', label: 'Feira de Santana', sublabel: 'BA' },
        { id: '550e8400-e29b-41d4-a716-446655440115', label: 'Vitória da Conquista', sublabel: 'BA' },
    ],
};

interface ProfessorEditData {
    nome: string;
    cpf: string;
    dataNascimento: string;
    email: string;
    senha: string;
    // IDs para envio ao backend
    curso_id: string;
    faculdade_id: string;
    cidade_id: string;
    uf: string;
    // Textos exibidos nos inputs (label do item selecionado)
    curso_nome: string;
    faculdade_nome: string;
    cidade_nome: string;
    uf_nome: string;
    // Dados de endereço
    logradouro: string;
    bairro: string;
    numero: string;
    cep: string;
}

export default function Professores() {
    const pgCadastro = useNavigate();
    const [professores, setProfessores] = useState<Professor[]>([]);

    const [dialogEditOpen, setDialogEditOpen] = useState(false);
    const [dialogDeleteOpen, setDialogDeleteOpen] = useState(false);
    const [professorSelecionado, setProfessorSelecionado] = useState<Professor | null>(null);
    const [loadingSalvar, setLoadingSalvar] = useState(false);
    const [loadingDeletar, setLoadingDeletar] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof ProfessorEditData, string>>>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Estados para pesquisa e filtros
    const [searchValue, setSearchValue] = useState('');
    const [filters, setFilters] = useState<{
        codigo?: string;
        matricula?: string;
        curso?: Cursos | '';
        periodo?: string;
    }>({});

    const [editData, setEditData] = useState<ProfessorEditData>({
        nome: '',
        cpf: '',
        dataNascimento: '',
        email: '',
        senha: '',
        curso_id: '',
        faculdade_id: '',
        cidade_id: '',
        uf: '',
        curso_nome: '',
        faculdade_nome: '',
        cidade_nome: '',
        uf_nome: '',
        logradouro: '',
        bairro: '',
        numero: '',
        cep: '',
    });

    // Opções dos selects
    const [cursoOptions, setCursoOptions] = useState<SelectOption[]>([]);
    const [faculdadeOptions, setFaculdadeOptions] = useState<SelectOption[]>([]);
    const [cidadeOptions, setCidadeOptions] = useState<SelectOption[]>([]);
    const [estadoOptions, setEstadoOptions] = useState<SelectOption[]>([]);

    // Estados de loading individuais
    const [loadingCursos, setLoadingCursos] = useState(false);
    const [loadingFaculdades, setLoadingFaculdades] = useState(false);
    const [loadingCidades, setLoadingCidades] = useState(false);
    const [loadingEstados, setLoadingEstados] = useState(false);

    useEffect(() => {
        if (!successMessage && !errorMessage) return;
        const timer = setTimeout(() => {
            setSuccessMessage(null);
            setErrorMessage(null);
        }, 4000);
        return () => clearTimeout(timer);
    }, [successMessage, errorMessage]);

    // Função para filtrar professores
    const professoresFiltrados = professores.filter(professor => {
        // Filtro de pesquisa (busca geral)
        if (searchValue) {
            const searchLower = searchValue.toLowerCase();
            const matchesSearch = 
                professor.nome.toLowerCase().includes(searchLower) ||
                professor.email.toLowerCase().includes(searchLower) ||
                professor.cpf.toLowerCase().includes(searchLower) ||
                (professor.curso && professor.curso.toLowerCase().includes(searchLower)) ||
                (professor.faculdade_id && professor.faculdade_id.toLowerCase().includes(searchLower));
            if (!matchesSearch) return false;
        }

        // Filtros específicos
        if (filters.matricula && !professor.nome.toLowerCase().includes(filters.matricula.toLowerCase())) return false;
        if (filters.codigo && !professor.cpf.toLowerCase().includes(filters.codigo.toLowerCase())) return false;
        if (filters.curso && professor.curso && professor.curso !== filters.curso) return false;
        if (filters.periodo && professor.faculdade_id && professor.faculdade_id !== filters.periodo) return false;

        return true;
    });

    // Debounce refs
    const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const debounce = (key: string, fn: () => void, delay = 350) => {
        clearTimeout(debounceRefs.current[key]);
        debounceRefs.current[key] = setTimeout(fn, delay);
    };

    // ── Handlers de busca ──────────────────────────────────────────────

    const handleSearchCurso = useCallback((query: string) => {
        debounce('curso', async () => {
            setLoadingCursos(true);
            try {
                // Filtra cursos mockados por query
                const filtered = MOCK_CURSOS.filter(c =>
                    c.label.toLowerCase().includes(query.toLowerCase()) ||
                    c.sublabel?.toLowerCase().includes(query.toLowerCase())
                );
                setCursoOptions(filtered);
            } catch {
                setCursoOptions([]);
            } finally {
                setLoadingCursos(false);
            }
        });
    }, []);

    const handleSearchFaculdade = useCallback((query: string) => {
        debounce('faculdade', async () => {
            setLoadingFaculdades(true);
            try {
                // Filtra faculdades mockadas por query
                const filtered = MOCK_FACULDADES.filter(f =>
                    f.label.toLowerCase().includes(query.toLowerCase())
                );
                setFaculdadeOptions(filtered);
            } catch {
                setFaculdadeOptions([]);
            } finally {
                setLoadingFaculdades(false);
            }
        });
    }, []);

    const handleSearchEstado = useCallback((query: string) => {
        debounce('estado', async () => {
            setLoadingEstados(true);
            try {
                // Filtra estados mockados por query
                const filtered = MOCK_ESTADOS.filter(e =>
                    e.label.toLowerCase().includes(query.toLowerCase()) ||
                    e.id.toLowerCase().includes(query.toLowerCase())
                );
                setEstadoOptions(filtered);
            } catch {
                setEstadoOptions([]);
            } finally {
                setLoadingEstados(false);
            }
        });
    }, []);

    const handleSearchCidade = useCallback((query: string) => {
        // Só busca cidades depois de um estado ser selecionado
        debounce('cidade', async () => {
            setLoadingCidades(true);
            try {
                // Pega cidades do estado mockado
                const cidades = MOCK_CIDADES[editData.uf] || [];
                const filtered = cidades.filter(c =>
                    c.label.toLowerCase().includes(query.toLowerCase())
                );
                setCidadeOptions(filtered);
            } catch {
                setCidadeOptions([]);
            } finally {
                setLoadingCidades(false);
            }
        });
    }, [editData.uf]);

    // ── Handlers de seleção ────────────────────────────────────────────

    const handleSelectCurso = (option: SelectOption) => {
        setEditData(prev => ({ ...prev, curso_id: option.id, curso_nome: option.label }));
        clearError('curso_id');
    };

    const handleSelectFaculdade = (option: SelectOption) => {
        setEditData(prev => ({ ...prev, faculdade_id: option.id, faculdade_nome: option.label }));
        clearError('faculdade_id');
    };

    const handleSelectEstado = (option: SelectOption) => {
        // Ao trocar estado, limpa a cidade selecionada
        setEditData(prev => ({
            ...prev,
            uf: option.id,
            uf_nome: option.label,
            cidade_id: '',
            cidade_nome: '',
        }));
        setCidadeOptions([]);
        clearError('uf');
    };

    const handleSelectCidade = (option: SelectOption) => {
        setEditData(prev => ({ ...prev, cidade_id: option.id, cidade_nome: option.label }));
        clearError('cidade_id');
    };

    const buscarProfessores = async () => {
        try {
            const data = await professorApi.listar();
            setProfessores(data);
        } catch (error) {
            console.error("Erro ao buscar professores:", error);
        }
    };

    useEffect(() => {
        buscarProfessores();
    }, []);

    const abrirEdicao = (professor: Professor) => {
        setProfessorSelecionado(professor);
        setEditData({
            nome: professor.nome,
            cpf: professor.cpf,
            dataNascimento: '', // Não disponível na API atual
            email: professor.email,
            senha: '', // Não exibimos senha na edição
            curso_id: professor.curso_id || '',
            faculdade_id: professor.faculdade_id || '',
            cidade_id: '', // Não disponível na API atual
            uf: '', // Não disponível na API atual
            curso_nome: professor.curso || '',
            faculdade_nome: professor.faculdade || '',
            cidade_nome: '', // Não disponível na API atual
            uf_nome: '', // Não disponível na API atual
            logradouro: '', // Não disponível na API atual
            bairro: '', // Não disponível na API atual
            numero: '', // Não disponível na API atual
            cep: '', // Não disponível na API atual
        });
        setErrors({});
        setDialogEditOpen(true);
    };

    const abrirEdicaoCompleta = async (professor: Professor) => {
        try {
            const professorCompleto = await professorApi.buscarPorId(professor.id);
            abrirEdicao(professorCompleto);
        } catch (error) {
            console.error("Erro ao carregar professor para ediÃ§Ã£o:", error);
            setErrorMessage("Erro ao carregar os dados completos do professor.");
        }
    };

    const abrirExclusao = (professor: Professor) => {
        setProfessorSelecionado(professor);
        setDialogDeleteOpen(true);
    };

    const handleEditChange = (field: keyof ProfessorEditData, value: string) => {
        setEditData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const clearError = (field: keyof ProfessorEditData) => {
        setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const validarEdicao = (): boolean => {
        const novosErros: Partial<Record<keyof ProfessorEditData, string>> = {};

        // Validações específicas (apenas para campos preenchidos)
        if (editData.email && !/\S+@\S+\.\S+/.test(editData.email)) {
            novosErros.email = 'E-mail inválido';
        }

        if (editData.cpf && editData.cpf.replace(/\D/g, '').length !== 11) {
            novosErros.cpf = 'CPF deve ter 11 dígitos';
        }

        // Validar formato de data se preenchida
        if (editData.dataNascimento) {
            const data = new Date(editData.dataNascimento);
            if (isNaN(data.getTime())) {
                novosErros.dataNascimento = 'Data inválida';
            }
        }

        // Verificar se pelo menos um campo foi preenchido
        const camposPreenchidos = [
            editData.nome,
            editData.email,
            editData.cpf,
            editData.dataNascimento,
            editData.logradouro,
            editData.numero,
            editData.bairro,
            editData.cidade_id,
            editData.uf,
            editData.cep,
            editData.curso_id,
            editData.faculdade_id,
        ].filter(campo => campo && campo.toString().trim() !== '');

        if (camposPreenchidos.length === 0) {
            novosErros.nome = 'Pelo menos um campo deve ser preenchido';
        }

        setErrors(novosErros);
        return Object.keys(novosErros).length === 0;
    };

    const salvarEdicao = async () => {
        if (!professorSelecionado || !validarEdicao()) return;
        setLoadingSalvar(true);
        try {
            // Valores originais do professor (removido pois não é usado)
            const payload: AtualizarProfessorDTO = {
                nome: editData.nome,
                email: editData.email,
                cpf: editData.cpf, // Mantém a formatação do frontend
                data_nascimento: editData.dataNascimento,
                logradouro: editData.logradouro,
                numero: editData.numero,
                bairro: editData.bairro,
                cidade_id: editData.cidade_id,
                estado: editData.uf,
                cep: editData.cep,
                curso_id: editData.curso_id,
                faculdade_id: editData.faculdade_id,
                curso_nome: editData.curso_nome,
                faculdade_nome: editData.faculdade_nome,
                cidade_nome: editData.cidade_nome,
                uf_nome: editData.uf_nome,
            };

            const payloadFiltrado = Object.fromEntries(
                Object.entries(payload).filter(([_, valor]) => valor !== undefined && valor !== '')
            );

            if (Object.keys(payloadFiltrado).length === 0) {
                setErrorMessage('Nenhum campo foi alterado ou os valores são inválidos.');
                return;
            }

            await professorApi.atualizar(professorSelecionado.id, payloadFiltrado as AtualizarProfessorDTO);
            await buscarProfessores();
            setSuccessMessage('professor atualizado com sucesso!');
            setDialogEditOpen(false);
        } catch (error) {
            console.error("Erro ao atualizar professor:", error);
            const erroDaApi = error as { response?: { data?: { mensagem?: string; message?: string } } };
            setErrorMessage(
                erroDaApi.response?.data?.mensagem ||
                erroDaApi.response?.data?.message ||
                (error instanceof Error ? error.message : '') ||
                "Erro ao atualizar professor."
            );
        } finally {
            setLoadingSalvar(false);
        }
    };

    const confirmarExclusao = async () => {
        if (!professorSelecionado) return;
        setLoadingDeletar(true);
        try {
            await professorApi.deletar(professorSelecionado.id);
            await buscarProfessores();
            setSuccessMessage('professor excluído com sucesso!');
            setDialogDeleteOpen(false);
        } catch (error) {
            console.error("Erro ao excluir professor:", error);
            const erroDaApi = error as { response?: { data?: { mensagem?: string; message?: string } } };
            setErrorMessage(
                erroDaApi.response?.data?.mensagem ||
                erroDaApi.response?.data?.message ||
                (error instanceof Error ? error.message : '') ||
                "Erro ao excluir professor."
            );
        } finally {
            setLoadingDeletar(false);
        }
    };

    const columns: GridColDef[] = [
        { field: "id", headerName: "Id", width: 90 },
        { field: "nome", headerName: "Nome", flex: 1 },
        { field: "curso", headerName: "Curso", flex: 1 },
        { field: "email", headerName: "Email", flex: 1 },
        { field: "cpf", headerName: "CPF", flex: 1 },
        { field: "faculdade", headerName: "Faculdade", flex: 1 },
        {
            field: "acoes",
            headerName: "Ações",
            width: 100,
            sortable: false,
            renderCell: (params) => (
                <>
                    <Tooltip title="Editar">
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={() => abrirEdicaoCompleta(params.row as Professor)}
                        >
                            <Pencil size={16} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                        <IconButton
                            size="small"
                            color="error"
                            onClick={() => abrirExclusao(params.row as Professor)}
                        >
                            <Trash2 size={16} />
                        </IconButton>
                    </Tooltip>
                </>
            ),
        },
    ];

    return (
        <>
            <Container>
                <SearchTextField 
                    buttonOnClick={() => pgCadastro('/professores/cadastro')}
                    searchValue={searchValue}
                    onSearchChange={setSearchValue}
                    filterValues={filters}
                    onFilterChange={setFilters}
                    searchPlaceholder="Pesquisar professor"
                    firstFilterLabel="CPF"
                    secondFilterLabel="Nome"
                    fourthFilterLabel="Faculdade"
                    usePeriodFilter={false}
                >
                    Professores
                </SearchTextField>
                {(successMessage || errorMessage) && (
                    <Alert
                        severity={errorMessage ? 'error' : 'success'}
                        onClose={() => {
                            setSuccessMessage(null);
                            setErrorMessage(null);
                        }}
                        sx={{ mb: 2 }}
                    >
                        {errorMessage || successMessage}
                    </Alert>
                )}
                <DataTable columns={columns} rows={professoresFiltrados} />
            </Container>

            {/* Dialog de Edição */}
            <Dialog.Root open={dialogEditOpen} onClose={() => setDialogEditOpen(false)}>
                <Dialog.Header>
                    <Dialog.Title>Editar Professor</Dialog.Title>
                    <Dialog.ActionClose onClose={() => setDialogEditOpen(false)} />
                </Dialog.Header>
                <Dialog.Content>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* ── Dados pessoais ── */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 2 }}>
                                <Card.Title>Nome:</Card.Title>
                                <TextField
                                    value={editData.nome}
                                    onChange={(e) => handleEditChange('nome', e.target.value)}
                                    error={!!errors.nome}
                                    helperText={errors.nome}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Card.Title>CPF:</Card.Title>
                                <TextField
                                    value={editData.cpf}
                                    onChange={(e) => handleEditChange('cpf', e.target.value)}
                                    error={!!errors.cpf}
                                    helperText={errors.cpf}
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Card.Title>Nascimento:</Card.Title>
                                <TextField
                                    type="date"
                                    value={editData.dataNascimento}
                                    onChange={(e) => handleEditChange('dataNascimento', e.target.value)}
                                    error={!!errors.dataNascimento}
                                    helperText={errors.dataNascimento}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </div>
                        </div>

                        {/* ── Dados de acesso ── */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <Card.Title>Email:</Card.Title>
                                <TextField
                                    value={editData.email}
                                    onChange={(e) => handleEditChange('email', e.target.value)}
                                    error={!!errors.email}
                                    helperText={errors.email}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Card.Title>Senha (opcional):</Card.Title>
                                <TextField
                                    type="password"
                                    value={editData.senha}
                                    onChange={(e) => handleEditChange('senha', e.target.value)}
                                    placeholder="Deixe vazio para manter a atual"
                                />
                            </div>
                        </div>

                        {/* ── Dados de instituição ── */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <Card.Title>Curso:</Card.Title>
                                <SearchableSelect
                                    placeholder="Buscar curso..."
                                    value={editData.curso_id}
                                    displayValue={editData.curso_nome}
                                    options={cursoOptions}
                                    onSearch={handleSearchCurso}
                                    onSelect={handleSelectCurso}
                                    loading={loadingCursos}
                                    error={!!errors.curso_id}
                                    helperText={errors.curso_id}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Card.Title>Faculdade:</Card.Title>
                                <SearchableSelect
                                    placeholder="Buscar faculdade..."
                                    value={editData.faculdade_id}
                                    displayValue={editData.faculdade_nome}
                                    options={faculdadeOptions}
                                    onSearch={handleSearchFaculdade}
                                    onSelect={handleSelectFaculdade}
                                    loading={loadingFaculdades}
                                    error={!!errors.faculdade_id}
                                    helperText={errors.faculdade_id}
                                />
                            </div>
                        </div>

                        {/* ── Endereço ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 2 }}>
                                    <Card.Title>Logradouro:</Card.Title>
                                    <TextField
                                        value={editData.logradouro}
                                        onChange={(e) => handleEditChange('logradouro', e.target.value)}
                                        error={!!errors.logradouro}
                                        helperText={errors.logradouro}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Card.Title>Bairro:</Card.Title>
                                    <TextField
                                        value={editData.bairro}
                                        onChange={(e) => handleEditChange('bairro', e.target.value)}
                                        error={!!errors.bairro}
                                        helperText={errors.bairro}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                {/* Estado primeiro — Cidade depende do estado selecionado */}
                                <div style={{ flex: 1 }}>
                                    <Card.Title>Estado:</Card.Title>
                                    <SearchableSelect
                                        placeholder="Buscar estado..."
                                        value={editData.uf}
                                        displayValue={editData.uf_nome}
                                        options={estadoOptions}
                                        onSearch={handleSearchEstado}
                                        onSelect={handleSelectEstado}
                                        loading={loadingEstados}
                                        error={!!errors.uf}
                                        helperText={errors.uf}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Card.Title>Cidade:</Card.Title>
                                    <SearchableSelect
                                        placeholder={editData.uf ? 'Buscar cidade...' : 'Selecione um estado primeiro'}
                                        value={editData.cidade_id}
                                        displayValue={editData.cidade_nome}
                                        options={cidadeOptions}
                                        onSearch={handleSearchCidade}
                                        onSelect={handleSelectCidade}
                                        loading={loadingCidades}
                                        error={!!errors.cidade_id}
                                        helperText={errors.cidade_id}
                                        disabled={!editData.uf}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Card.Title>Número:</Card.Title>
                                    <TextField
                                        value={editData.numero}
                                        onChange={(e) => handleEditChange('numero', e.target.value)}
                                        error={!!errors.numero}
                                        helperText={errors.numero}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Card.Title>CEP:</Card.Title>
                                    <TextField
                                        value={editData.cep}
                                        onChange={(e) => handleEditChange('cep', e.target.value)}
                                        error={!!errors.cep}
                                        helperText={errors.cep}
                                        placeholder="00000-000"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Dialog.Content>
                <Dialog.Footer>
                    <Button variant="outlined" onClick={() => setDialogEditOpen(false)}>
                        Cancelar
                    </Button>
                    <Button variant="contained" onClick={salvarEdicao} isLoading={loadingSalvar}>
                        Salvar
                    </Button>
                </Dialog.Footer>
            </Dialog.Root>

            {/* Dialog de Confirmação de Exclusão */}
            <Dialog.Root
                open={dialogDeleteOpen}
                onClose={() => setDialogDeleteOpen(false)}
                maxWidth="xs"
            >
                <Dialog.Header>
                    <Dialog.Title>Confirmar Exclusão</Dialog.Title>
                    <Dialog.ActionClose onClose={() => setDialogDeleteOpen(false)} />
                </Dialog.Header>
                <Dialog.Content>
                    <p style={{ margin: 0 }}>
                        Tem certeza que deseja excluir o professor{' '}
                        <strong>{professorSelecionado?.nome}</strong>?
                        Esta ação não pode ser desfeita.
                    </p>
                </Dialog.Content>
                <Dialog.Footer>
                    <Button variant="outlined" onClick={() => setDialogDeleteOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={confirmarExclusao}
                        isLoading={loadingDeletar}
                    >
                        Excluir
                    </Button>
                </Dialog.Footer>
            </Dialog.Root>
        </>
    );
}
