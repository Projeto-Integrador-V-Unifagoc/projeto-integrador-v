import { useState } from "react";
import { useViaCep } from "../../hooks/use-cep";
import { useCidade } from "../../hooks/use-cidade";
import { useAluno } from "../../hooks/use-aluno";
import { useNavigate } from "react-router-dom";
import { alunoSchema } from "../../validators/aluno-schema";
import TextField from "../TextField";
import DropDownCidades from "../DropDownCidades/DropDownCidades";
import { Alert, IconButton, Stack, } from "@mui/material";
import { MapPin } from "lucide-react";
import DropDownCursos from "../DropDownCursos/DropDownCursos";
import Button from "../Button";


export default function FormCadastroAluno() {

    type FormType = {
        nome: string
        cpf: string
        dataNascimento: string
        logradouro: string
        numero: string
        bairro: string
        cidadeIbge: string
        estado: string
        cep: string
        curso: string
        periodo: string
    }
    const initialForm = {
        nome: "",
        cpf: "",
        dataNascimento: "",
        logradouro: "",
        numero: "",
        bairro: "",
        cidadeIbge: "",
        estado: "",
        cep: "",
        curso: "",
        periodo: ""
    }
    const [form, setForm] = useState<FormType>(initialForm)

    const [alerta, setAlerta] = useState<{
        tipo: "success" | "error"
        mensagem: string
    } | null>(null)
    const [erros, setErros] = useState<Record<string, string>>({})

    const { carregando: isCarregando, buscarCep } = useViaCep()
    const { carregando, criarAluno } = useAluno()
    const navigate = useNavigate();


    async function buscarEnderecoPeloCep() {
        const data = await buscarCep(form.cep)

        if (!data) {
            return
        }


        setForm((prev) => ({
            ...prev,
            logradouro: data.logradouro,
            bairro: data.bairro,
            estado: data.uf,
            cidadeIbge: String(data.ibge),
        }))
    }

    function handleChange<K extends keyof FormType>(
        name: K,
        value: FormType[K]
    ) {
        setForm((prev) => ({
            ...prev,
            [name]: value
        }))
    }

    async function handleSubmit() {

        try {

            await alunoSchema.validate(form, { abortEarly: false })

            setErros({})

        } catch (error: any) {

            const errosFormatados: Record<string, string> = {}

            error.inner.forEach((err: any) => {
                errosFormatados[err.path] = err.message
            })

            setErros(errosFormatados)

            return
        }

        try {
            const alunoData = {
                periodo: Number(form.periodo),
                pessoa: {
                    cpf: form.cpf,
                    nome: form.nome,
                    dataNascimento: form.dataNascimento,
                    logradouro: form.logradouro,
                    numero: Number(form.numero),
                    bairro: form.bairro,
                    cidadeIbge: form.cidadeIbge,
                    estado: form.estado,
                    cep: form.cep
                }
            }
            console.log(alunoData)

            await criarAluno(alunoData)
            setAlerta({
                tipo: "success",
                mensagem: "Que beleza, seu aluno foi cadastrado com sucesso!"
            })

            setForm(initialForm)

            setTimeout(() => {
                navigate("/alunos/lista")
            }, 2000)

        } catch (err) {
            console.error(err)
            setAlerta({
                tipo: "error",
                mensagem: "Opss, parece que algo deu errado durante o cadastro do aluno." // precisamos mapear esse erro depois no back pra vir do response by João Pedro Vidal
            })
        }
    }
    return (
        <>
            <Stack
                spacing={2}
                width='100%'
                mt={1}
            >

                <TextField
                    required
                    label="Nome"
                    name="nome"
                    value={form.nome}
                    error={!!erros.nome}
                    helperText={erros.nome}
                    onChange={(e) => handleChange("nome", e.target.value)}
                />
                <TextField
                    required
                    label="CPF"
                    name="cpf"
                    value={form.cpf}
                    error={!!erros.cpf}
                    helperText={erros.cpf}
                    onChange={(e) => handleChange("cpf", e.target.value)}
                />
                <TextField
                    required
                    label="Data Nascimento"
                    name="dataNascimento"
                    type="date"
                    value={form.dataNascimento}
                    error={!!erros.dataNascimento}
                    helperText={erros.dataNascimento}
                    onChange={(e) => handleChange("dataNascimento", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    required
                    label="Logradouro"
                    name="logradouro"
                    value={form.logradouro}
                    error={!!erros.logradouro}
                    helperText={erros.logradouro}
                    onChange={(e) => handleChange("logradouro", e.target.value)}
                />
                <TextField
                    required
                    label="Número"
                    name="numero"
                    value={form.numero}
                    error={!!erros.numero}
                    helperText={erros.numero}
                    onChange={(e) => handleChange("numero", e.target.value)}
                />
                <TextField
                    required
                    label="Bairro"
                    name="bairro"
                    value={form.bairro}
                    error={!!erros.bairro}
                    helperText={erros.bairro}
                    onChange={(e) => handleChange("bairro", e.target.value)}
                />
                <Stack
                    display='flex'

                    flexDirection='row'
                >
                    <TextField
                        required
                        label="CEP"
                        name="cep"
                        value={form.cep}
                        error={!!erros.cep}
                        helperText={erros.cep}
                        onChange={(e) => {
                            handleChange("cep", e.target.value)
                        }}
                    />

                    <IconButton
                        color="primary"
                        onClick={buscarEnderecoPeloCep}
                    >
                        <MapPin size={22} />
                    </IconButton>

                </Stack>
                <DropDownCidades
                    value={form.cidadeIbge}
                    onChange={(value) => handleChange("cidadeIbge", value)}
                />
                <TextField
                    required
                    label="Estado"
                    name="estado"
                    value={form.estado}
                    error={!!erros.estado}
                    helperText={erros.estado}
                    onChange={(e) => handleChange("estado", e.target.value)}
                />
                <DropDownCursos
                    value={form.curso}
                    onChange={(value) => handleChange("curso", value)}
                />
                <TextField
                    required
                    label="Periodo"
                    name="periodo"
                    value={form.periodo}
                    error={!!erros.periodo}
                    helperText={erros.periodo}
                    onChange={(e) => handleChange("periodo", e.target.value)}
                />
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    isLoading={carregando}
                    sx={{
                        width: "100%",
                        mt: 2
                    }}
                >
                    Cadastrar Aluno
                </Button>
                {alerta && (
                    <Alert
                        severity={alerta.tipo}
                        sx={{
                            width: '100%',
                            height: '45px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        {alerta.mensagem}
                    </Alert>
                )}
            </Stack>
        </>
    )
}