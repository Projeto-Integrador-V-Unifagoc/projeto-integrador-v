import { MapPin } from "lucide-react"

import { Alert, IconButton, Stack, TextField } from "@mui/material"

import { FormCadatroMobile } from "../FormCadastroMobile/FormCadastroMobile"
import DropDownCidades from "../DropDownCidades/DropDownCidades"
import DropDownCursos from "../DropDownCursos/DropDownCursos"
import Container from "../Container"
import Button from "../Button"

import { useAluno } from "../../hooks/use-aluno"
import { useNavigate, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import type { CidadeModel } from "../../models/cidade-model"

export default function EditFormCadastroAlunoMobile() {

    type FormType = {
        nome: string
        cpf: string
        dataNascimento: string
        logradouro: string
        numero: string
        bairro: string
        cidade: CidadeModel | null
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
        cidade: null,
        estado: "",
        cep: "",
        curso: "",
        periodo: ""
    }
    const [form, setForm] = useState<FormType>(initialForm)
    const { matricula } = useParams()
    const { buscarAlunoPorMatricula } = useAluno()
    const [alerta, setAlerta] = useState<{
    tipo: "success" | "error";
    mensagem: string;
  } | null>(null);
    const navigate = useNavigate()

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
                cidade: data.pessoa?.cidade || null,
                estado: data.pessoa?.estado || "",
                cep: data.pessoa?.cep || "",
                curso: data?.curso?.id || "",
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

    function salvarAlunoEditado(aluno: FormType) {
    try {
      fetch(`http://localhost:3000/alunos/editar-aluno/${matricula}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(aluno),
      });
      setAlerta({
        tipo: "success",
        mensagem: "Aluno atualizado com sucesso!",
      });

      setTimeout(() => {
        navigate("/alunos/lista")
      }, 1500)

    } catch (error: any) {
      setAlerta({
        tipo: "error",
        mensagem: error.message || "Erro ao atualizar aluno",
      });
    }
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
                        label="Nome"
                        name="nome"
                        value={form.nome}
                        onChange={(e) => handleChange("nome", e.target.value)}
                    />
                    <TextField
                        label="CPF"
                        name="cpf"
                        value={form.cpf}
                        onChange={(e) => handleChange("cpf", e.target.value)}
                    />
                    <TextField
                        label="Data Nascimento"
                        name="dataNascimento"
                        type="date"
                        value={form.dataNascimento}
                        onChange={(e) => handleChange("dataNascimento", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="Logradouro"
                        name="logradouro"
                        value={form.logradouro}
                        onChange={(e) => handleChange("logradouro", e.target.value)}
                    />
                    <TextField
                        label="Número"
                        name="numero"
                        value={form.numero}
                        onChange={(e) => handleChange("numero", e.target.value)}
                    />
                    <TextField
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
                            onChange={(e) => {
                                handleChange("cep", e.target.value)
                            }}
                        />

                        <IconButton
                            color="primary"
                        //onClick={buscarEnderecoPeloCep}
                        >
                            <MapPin size={22} />
                        </IconButton>

                    </Stack>
                    <DropDownCidades
                        value={form.cidade}
                        onChange={(value) => handleChange("cidade", value)}
                    />
                    <TextField
                        label="Estado"
                        name="estado"
                        value={form.estado}
                        onChange={(e) => handleChange("estado", e.target.value)}
                    />
                    <DropDownCursos
                        optionValue="id"
                        value={form.curso}
                        onChange={(value) => handleChange("curso", value)}
                    />
                    <TextField
                        label="Periodo"
                        name="periodo"
                        value={form.periodo}
                        onChange={(e) => handleChange("periodo", e.target.value)}
                    />
                    <Button
                        onClick={() => salvarAlunoEditado(form)}
                        variant="contained"
                        sx={{
                            width: "100%",
                            mt: 2
                        }}
                    >
                        Editar Aluno
                    </Button>
                    {alerta && (
                            <Alert severity={alerta.tipo} onClose={() => setAlerta(null)}>
                              {alerta.mensagem}
                            </Alert>
                          )}
                </Stack>
            </Container>
        </>
    )
}
