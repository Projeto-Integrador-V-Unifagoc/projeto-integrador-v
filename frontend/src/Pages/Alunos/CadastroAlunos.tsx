import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { MapPin } from "lucide-react";


import { FormCadatroMobile } from "../../components/FormCadastroMobile/FormCadastroMobile";
import FormCadastroAluno from "../../components/FormCadastroAluno/FormCadastroAluno";
import DropDownCidades from "../../components/DropDownCidades/DropDownCidades";
import Container from "../../components/Container";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import { Card } from "../../components/Card";

import {
  Alert,
  Grid,
  IconButton,
  Stack,
  useMediaQuery,
  useTheme
} from "@mui/material";

import { useAluno } from "../../hooks/use-aluno";
import { useViaCep } from "../../hooks/use-cep";

import { alunoSchema } from "../../validators/aluno-schema";
import DropDownCursos from "../../components/DropDownCursos/DropDownCursos";

export default function CadastroAlunos() {

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

  const { buscarCep } = useViaCep()
  const { carregando, criarAluno } = useAluno()
  const navigate = useNavigate();

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))

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
    <Container>
      {isMobile ? (
        <Stack>
          <FormCadatroMobile.Title>Cadastrar Aluno</FormCadatroMobile.Title>
          <FormCadatroMobile.Content>
            <FormCadastroAluno />
          </FormCadatroMobile.Content>          
        </Stack>

      ) : (
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
                      required
                      label="Nome"
                      name="nome"
                      value={form.nome}
                      error={!!erros.nome}
                      helperText={erros.nome}
                      onChange={(e) => handleChange("nome", e.target.value)}
                    />
                  </Grid>

                  <Grid size={3}>
                    <TextField
                      required
                      label="CPF"
                      name="cpf"
                      value={form.cpf}
                      error={!!erros.cpf}
                      helperText={erros.cpf}
                      onChange={(e) => handleChange("cpf", e.target.value)}
                    />
                  </Grid>

                  <Grid size={3}>
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
                  </Grid>

                  <Grid size={6}>
                    <TextField
                      required
                      label="Logradouro"
                      name="logradouro"
                      value={form.logradouro}
                      error={!!erros.logradouro}
                      helperText={erros.logradouro}
                      onChange={(e) => handleChange("logradouro", e.target.value)}
                    />
                  </Grid>

                  <Grid size={2}>
                    <TextField
                      required
                      label="Número"
                      name="numero"
                      value={form.numero}
                      error={!!erros.numero}
                      helperText={erros.numero}
                      onChange={(e) => handleChange("numero", e.target.value)}
                    />
                  </Grid>

                  <Grid size={4}>
                    <TextField
                      required
                      label="Bairro"
                      name="bairro"
                      value={form.bairro}
                      error={!!erros.bairro}
                      helperText={erros.bairro}
                      onChange={(e) => handleChange("bairro", e.target.value)}
                    />
                  </Grid>

                  <Grid size={4}>
                    <DropDownCidades
                      value={form.cidadeIbge}
                      onChange={(value) => handleChange("cidadeIbge", value)}
                    />
                  </Grid>

                  <Grid size={2}>
                    <TextField
                      required
                      label="Estado"
                      name="estado"
                      value={form.estado}
                      error={!!erros.estado}
                      helperText={erros.estado}
                      onChange={(e) => handleChange("estado", e.target.value)}
                    />
                  </Grid>

                  <Grid size={2}>
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
                  </Grid>

                  <Grid size={2}>
                    <IconButton
                      color="primary"
                      onClick={buscarEnderecoPeloCep}
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
                      value={form.curso}
                      onChange={(value) => handleChange("curso", value)}
                    />
                  </Grid>

                  <Grid size={2}>
                    <TextField
                      required
                      label="Periodo"
                      name="periodo"
                      value={form.periodo}
                      error={!!erros.periodo}
                      helperText={erros.periodo}
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
            {alerta && (
              <Alert
                severity={alerta.tipo}
                sx={{
                  width: '100%',
                  height: '35px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {alerta.mensagem}
              </Alert>
            )}
            <Button
              variant="contained"
              sx={{ width: "90px", height: "35px" }}
              onClick={handleSubmit}
              isLoading={carregando}
            >
              Cadastrar
            </Button>
          </Stack>
        </Stack>
      )}

    </Container>

  )
}
