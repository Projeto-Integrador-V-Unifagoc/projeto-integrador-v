import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';
import { Card } from '../../components/Card/index';
import TextField from '../../components/TextField';
import Button from '../../components/Button';
import SearchableSelect from '../../components/SearchableSelect/SearchableSelect.tsx';
import type { SelectOption } from '../../components/SearchableSelect/SearchableSelect.tsx';
import { professorApi } from '../../services/professor-api';
import type { CriarProfessorDTO } from '../../models/professor-model';
import {
    buscarCidadesOptions,
    buscarCursosOptions,
    buscarEstadosOptions,
    buscarFaculdadesOptions,
} from './professor-lookups';

interface ProfessorFormData {
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

const initialState: ProfessorFormData = {
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
};

export default function Cadastro() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<ProfessorFormData>(initialState);
    const [errors, setErrors] = useState<Partial<Record<keyof ProfessorFormData, string>>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
                setCursoOptions(await buscarCursosOptions(query));
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
                setFaculdadeOptions(await buscarFaculdadesOptions(query));
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
                setEstadoOptions(await buscarEstadosOptions(query));
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
                setCidadeOptions(await buscarCidadesOptions(query, formData.uf));
            } catch {
                setCidadeOptions([]);
            } finally {
                setLoadingCidades(false);
            }
        });
    }, [formData.uf]);

    // ── Handlers de seleção ────────────────────────────────────────────

    const handleSelectCurso = (option: SelectOption) => {
        setFormData(prev => ({ ...prev, curso_id: option.id, curso_nome: option.label }));
        clearError('curso_id');
    };

    const handleSelectFaculdade = (option: SelectOption) => {
        setFormData(prev => ({ ...prev, faculdade_id: option.id, faculdade_nome: option.label }));
        clearError('faculdade_id');
    };

    const handleSelectEstado = (option: SelectOption) => {
        // Ao trocar estado, limpa a cidade selecionada
        setFormData(prev => ({
            ...prev,
            uf: option.id,
            uf_nome: option.label || option.id,
            cidade_id: '',
            cidade_nome: '',
        }));
        setCidadeOptions([]);
        clearError('uf');
    };

    const handleSelectCidade = (option: SelectOption) => {
        setFormData(prev => ({
            ...prev,
            cidade_id: option.id,
            cidade_nome: option.label,
            uf: option.sublabel || prev.uf,
            uf_nome: option.sublabel || prev.uf_nome,
        }));
        clearError('cidade_id');
    };

    // ── Utilidades ─────────────────────────────────────────────────────

    const handleInputChange = (field: keyof ProfessorFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        clearError(field);
    };

    const clearError = (field: keyof ProfessorFormData) => {
        setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const validarCampos = (): boolean => {
        const novosErros: Partial<Record<keyof ProfessorFormData, string>> = {};

        // Apenas campos pessoais/básicos são obrigatórios por enquanto
        const camposObrigatorios: (keyof ProfessorFormData)[] = [
            'nome', 'cpf', 'dataNascimento', 'email', 'senha',
            'curso_id', 'faculdade_id', 'cidade_id', 'uf',
            'logradouro', 'bairro', 'numero', 'cep',
        ];

        camposObrigatorios.forEach((campo) => {
            if (!formData[campo] || formData[campo].toString().trim() === '') {
                novosErros[campo] = 'Campo obrigatório';
            }
        });

        // Validações específicas
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
            novosErros.email = 'E-mail inválido';
        }

        if (formData.cpf && formData.cpf.replace(/\D/g, '').length !== 11) {
            novosErros.cpf = 'CPF deve ter 11 dígitos';
        }

        if (formData.senha && formData.senha.length < 6) {
            novosErros.senha = 'A senha deve ter no mínimo 6 caracteres';
        }

        // Validar formato de data
        if (formData.dataNascimento) {
            const data = new Date(formData.dataNascimento);
            if (isNaN(data.getTime())) {
                novosErros.dataNascimento = 'Data inválida';
            }
        }

        setErrors(novosErros);
        return Object.keys(novosErros).length === 0;
    };

    const gravarAlteracoes = async () => {
        if (!validarCampos()) return;

        setIsLoading(true);
        try {
            const payload: CriarProfessorDTO = {
                nome: formData.nome,
                email: formData.email,
                senha: formData.senha,
                cpf: formData.cpf.replace(/\D/g, ''),
                data_nascimento: formData.dataNascimento,
                logradouro: formData.logradouro,
                numero: formData.numero,
                bairro: formData.bairro,
                cidade_id: formData.cidade_id,
                estado: formData.uf,
                cep: formData.cep,
                curso_id: formData.curso_id,
                faculdade_id: formData.faculdade_id,
                curso_nome: formData.curso_nome,
                faculdade_nome: formData.faculdade_nome,
                cidade_nome: formData.cidade_nome,
                uf_nome: formData.uf_nome,
            };

            await professorApi.criar(payload);
            setSuccessMessage('Professor cadastrado com sucesso!');
            setTimeout(() => navigate('/professores/lista'), 1200);
        } catch (error: unknown) {
            const erroDaApi = error as { response?: { data?: { mensagem?: string; message?: string } } };
            const mensagem =
                erroDaApi.response?.data?.mensagem ||
                erroDaApi.response?.data?.message ||
                (error instanceof Error ? error.message : '') ||
                'Erro ao cadastrar professor.';
            
            // Tentar mapear mensagem para campo específico
            if (mensagem.toLowerCase().includes('cpf')) {
                setErrors({ cpf: mensagem });
            } else if (mensagem.toLowerCase().includes('email')) {
                setErrors({ email: mensagem });
            } else if (mensagem.toLowerCase().includes('senha')) {
                setErrors({ senha: mensagem });
            } else {
                setErrorMessage(mensagem);
            }
        } finally {
            setIsLoading(false);
        }
    };

    function cancelarCadastro() {
        navigate('/professores/lista');
    }

    return (
        <Card.Root>
            <Card.Header>Cadastro de Professor</Card.Header>
            <Card.Content>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* ── Dados pessoais ── */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 2 }}>
                            <Card.Title>Nome:</Card.Title>
                            <TextField
                                value={formData.nome}
                                onChange={(e) => handleInputChange('nome', e.target.value)}
                                error={!!errors.nome}
                                helperText={errors.nome}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <Card.Title>CPF:</Card.Title>
                            <TextField
                                value={formData.cpf}
                                onChange={(e) => handleInputChange('cpf', e.target.value)}
                                error={!!errors.cpf}
                                helperText={errors.cpf}
                                placeholder="000.000.000-00"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <Card.Title>Nascimento:</Card.Title>
                            <TextField
                                type="date"
                                value={formData.dataNascimento}
                                onChange={(e) => handleInputChange('dataNascimento', e.target.value)}
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
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                error={!!errors.email}
                                helperText={errors.email}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <Card.Title>Senha:</Card.Title>
                            <TextField
                                type="password"
                                value={formData.senha}
                                onChange={(e) => handleInputChange('senha', e.target.value)}
                                error={!!errors.senha}
                                helperText={errors.senha}
                            />
                        </div>
                    </div>

                    {/* ── Dados de instituição ── */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                            <Card.Title>Curso:</Card.Title>
                            <SearchableSelect
                                placeholder="Buscar curso..."
                                value={formData.curso_id}
                                displayValue={formData.curso_nome}
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
                                value={formData.faculdade_id}
                                displayValue={formData.faculdade_nome}
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
                                    value={formData.logradouro}
                                    onChange={(e) => handleInputChange('logradouro', e.target.value)}
                                    error={!!errors.logradouro}
                                    helperText={errors.logradouro}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Card.Title>Bairro:</Card.Title>
                                <TextField
                                    value={formData.bairro}
                                    onChange={(e) => handleInputChange('bairro', e.target.value)}
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
                                    value={formData.uf}
                                    displayValue={formData.uf_nome}
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
                                    placeholder={formData.uf ? 'Buscar cidade...' : 'Selecione um estado primeiro'}
                                    value={formData.cidade_id}
                                    displayValue={formData.cidade_nome}
                                    options={cidadeOptions}
                                    onSearch={handleSearchCidade}
                                    onSelect={handleSelectCidade}
                                    loading={loadingCidades}
                                    error={!!errors.cidade_id}
                                    helperText={errors.cidade_id}
                                    disabled={!formData.uf}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Card.Title>Número:</Card.Title>
                                <TextField
                                    value={formData.numero}
                                    onChange={(e) => handleInputChange('numero', e.target.value)}
                                    error={!!errors.numero}
                                    helperText={errors.numero}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Card.Title>CEP:</Card.Title>
                                <TextField
                                    value={formData.cep}
                                    onChange={(e) => handleInputChange('cep', e.target.value)}
                                    error={!!errors.cep}
                                    helperText={errors.cep}
                                    placeholder="00000-000"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'end', marginTop: '30px', gap: '10px' }}>
                    <Button variant="outlined" onClick={cancelarCadastro} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button variant="contained" onClick={gravarAlteracoes} isLoading={isLoading}>
                        Salvar
                    </Button>
                </div>
            </Card.Content>
        </Card.Root>
    );
}
