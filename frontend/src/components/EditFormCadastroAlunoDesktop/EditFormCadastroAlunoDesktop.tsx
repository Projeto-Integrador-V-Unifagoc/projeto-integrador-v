import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

import { Grid, IconButton, Stack } from "@mui/material";

import DropDownCursos from "../DropDownCursos/DropDownCursos";
import DropDownCidades from "../DropDownCidades/DropDownCidades";
import TextField from "../TextField";
import Button from "../Button";

import { useAluno } from "../../hooks/use-aluno";
import { useParams } from "react-router-dom";

import { Card } from "../Card";

export default function EditFormCadastroAlunoDesktop() {

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
        <Stack mt={2} gap={2} component='div'>
            <Stack>
                <Card.Root>
                    <Card.Header>
                        <Card.Title>Dados Pessoais</Card.Title>
                    </Card.Header>
                    <Card.Content>
                        <Grid container spacing={1}>

                            <Grid size={6}>
                                <TextField
                                    disabled
                                    label="Nome"
                                    name="nome"
                                    value={form.nome}
                                    onChange={(e) => handleChange("nome", e.target.value)}
                                />
                            </Grid>

                            <Grid size={3}>
                                <TextField
                                    disabled
                                    label="CPF"
                                    name="cpf"
                                    value={form.cpf}
                                    onChange={(e) => handleChange("cpf", e.target.value)}
                                />
                            </Grid>

                            <Grid size={3}>
                                <TextField
                                    disabled
                                    label="Data Nascimento"
                                    name="dataNascimento"
                                    type="date"
                                    value={form.dataNascimento}
                                    onChange={(e) => handleChange("dataNascimento", e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            <Grid size={6}>
                                <TextField
                                    disabled
                                    label="Logradouro"
                                    name="logradouro"
                                    value={form.logradouro}
                                    onChange={(e) => handleChange("logradouro", e.target.value)}
                                />
                            </Grid>

                            <Grid size={2}>
                                <TextField
                                    disabled
                                    label="Número"
                                    name="numero"
                                    value={form.numero}
                                    onChange={(e) => handleChange("numero", e.target.value)}
                                />
                            </Grid>

                            <Grid size={4}>
                                <TextField
                                    disabled
                                    label="Bairro"
                                    name="bairro"
                                    value={form.bairro}
                                    onChange={(e) => handleChange("bairro", e.target.value)}
                                />
                            </Grid>

                            <Grid size={4}>
                                <DropDownCidades
                                    disabled
                                    value={form.cidadeIbge}
                                    onChange={(value) => handleChange("cidadeIbge", value)}
                                />
                            </Grid>

                            <Grid size={2}>
                                <TextField
                                    disabled
                                    label="Estado"
                                    name="estado"
                                    value={form.estado}
                                    onChange={(e) => handleChange("estado", e.target.value)}
                                />
                            </Grid>

                            <Grid size={2}>
                                <TextField
                                    disabled
                                    label="CEP"
                                    name="cep"
                                    value={form.cep}
                                    onChange={(e) => {
                                        handleChange("cep", e.target.value)
                                    }}
                                />
                            </Grid>

                            <Grid size={2}>
                                <IconButton
                                    disabled
                                    color="primary"
                                //onClick={buscarEnderecoPeloCep}
                                >
                                    <MapPin size={22} />
                                </IconButton>
                            </Grid>

                        </Grid>
                    </Card.Content>
                </Card.Root>
            </Stack>

            <Stack>
                <Card.Root>

                    <Card.Header>
                        <Card.Title>Dados do Curso</Card.Title>
                    </Card.Header>

                    <Card.Content>
                        <Grid container spacing={1}>

                            <Grid size={4}>
                                <DropDownCursos
                                    disabled
                                    value={form.curso}
                                    onChange={(value) => handleChange("curso", value)}
                                />
                            </Grid>

                            <Grid size={2}>
                                <TextField
                                    disabled
                                    label="Periodo"
                                    name="periodo"
                                    value={form.periodo}
                                    onChange={(e) => handleChange("periodo", e.target.value)}
                                />
                            </Grid>

                        </Grid>
                    </Card.Content>
                </Card.Root>
            </Stack>



            <Stack
                display="flex"
                flexDirection="row"
                justifyContent="space-between"
                gap={2}
            >
                <Button
                    variant="contained"
                    sx={{ width: "auto", height: "35px" }}
                >
                    Editar Aluno
                </Button>
            </Stack>
        </Stack>
    )
}