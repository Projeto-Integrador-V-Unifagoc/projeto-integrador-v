import { MapPin } from "lucide-react"

import { IconButton, Stack, TextField } from "@mui/material"

import { FormCadatroMobile } from "../FormCadastroMobile/FormCadastroMobile"
import DropDownCidades from "../DropDownCidades/DropDownCidades"
import DropDownCursos from "../DropDownCursos/DropDownCursos"
import Container from "../Container"
import Button from "../Button"

import { useAluno } from "../../hooks/use-aluno"
import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"

export default function EditFormCadastroAlunoMobile() {

    type FormType = {
        nome: string
        cpf: string
        dataNascimento: string
        logradouro: string
        numero: string
        bairro: string
        cidadeIbge: string | number
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
    const { matricula } = useParams()
    const { buscarAlunoPorMatricula } = useAluno()

    useEffect(() => {
        async function carregarAluno() {
            if (!matricula) return

            const data = await buscarAlunoPorMatricula(matricula)

            setForm({
                nome: data.pessoa?.nome || "",
                cpf: data.pessoa?.cpf || "",
                dataNascimento: data.pessoa?.dataNascimento
                    ? data.pessoa.dataNascimento.split("T")[0]
                    : "",
                logradouro: data.pessoa?.logradouro || "",
                numero: data.pessoa?.numero || "",
                bairro: data.pessoa?.bairro || "",
                cidadeIbge: data.pessoa?.cidade?.ibge || "",
                estado: data.pessoa?.estado || "",
                cep: data.pessoa?.cep || "",
                curso: data.curso || "",
                periodo: data.periodo || ""
            })
        }

        carregarAluno()
    }, [matricula])

    function handleChange<K extends keyof FormType>(
        name: K,
        value: FormType[K]
    ) {
        setForm((prev) => ({
            ...prev,
            [name]: value
        }))
    }

    return (
        <>
            <Container>
                <FormCadatroMobile.Title>Editar Aluno</FormCadatroMobile.Title>
                <Stack
                    spacing={2}
                    width='100%'
                    mt={1}
                >

                    <TextField
                        disabled
                        label="Nome"
                        name="nome"
                        value={form.nome}
                        onChange={(e) => handleChange("nome", e.target.value)}
                    />
                    <TextField
                        disabled
                        label="CPF"
                        name="cpf"
                        value={form.cpf}
                        onChange={(e) => handleChange("cpf", e.target.value)}
                    />
                    <TextField
                        disabled
                        label="Data Nascimento"
                        name="dataNascimento"
                        type="date"
                        value={form.dataNascimento}
                        onChange={(e) => handleChange("dataNascimento", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        disabled
                        label="Logradouro"
                        name="logradouro"
                        value={form.logradouro}
                        onChange={(e) => handleChange("logradouro", e.target.value)}
                    />
                    <TextField
                        disabled
                        label="Número"
                        name="numero"
                        value={form.numero}
                        onChange={(e) => handleChange("numero", e.target.value)}
                    />
                    <TextField
                        disabled
                        label="Bairro"
                        name="bairro"
                        value={form.bairro}
                        onChange={(e) => handleChange("bairro", e.target.value)}
                    />
                    <Stack
                        display='flex'

                        flexDirection='row'
                    >
                        <TextField
                            label="CEP"
                            name="cep"
                            value={form.cep}
                            disabled
                            onChange={(e) => {
                                handleChange("cep", e.target.value)
                            }}
                        />

                        <IconButton
                            disabled
                            color="primary"
                        //onClick={buscarEnderecoPeloCep}
                        >
                            <MapPin size={22} />
                        </IconButton>

                    </Stack>
                    <DropDownCidades
                        disabled
                        value={form.cidadeIbge}
                        onChange={(value) => handleChange("cidadeIbge", value)}
                    />
                    <TextField
                        disabled
                        label="Estado"
                        name="estado"
                        value={form.estado}
                        onChange={(e) => handleChange("estado", e.target.value)}
                    />
                    <DropDownCursos
                        disabled
                        value={form.curso}
                        onChange={(value) => handleChange("curso", value)}
                    />
                    <TextField
                        disabled
                        label="Periodo"
                        name="periodo"
                        value={form.periodo}
                        onChange={(e) => handleChange("periodo", e.target.value)}
                    />
                    <Button
                        variant="contained"
                        sx={{
                            width: "100%",
                            mt: 2
                        }}
                    >
                        Editar Aluno
                    </Button>
                </Stack>
            </Container>
        </>
    )
}