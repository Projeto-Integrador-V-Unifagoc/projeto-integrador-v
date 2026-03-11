import { useState } from "react";

import Container from "../../components/Container";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import { Card } from "../../components/Card";

import { Alert, Grid, IconButton, Stack } from "@mui/material";

import { useAluno } from "../../hooks/use-aluno";
import { MapPin } from "lucide-react";
import { useViaCep } from "../../hooks/use-cep";
import { alunoSchema } from "../../validators/aluno-schema";

export default function CadastroAlunos() {

  const initialForm = {
    nome: "",
    cpf: "",
    dataNascimento: "",
    tipoUsuario: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    curso: "",
    periodo: ""
  }

  const [form, setForm] = useState(initialForm)
  const [alerta, setAlerta] = useState<{
    tipo: "success" | "error"
    mensagem: string
  } | null>(null)
  const [erros, setErros] = useState<Record<string, string>>({})
  const { carregando, criarAluno } = useAluno()
  const { carregando: isCarregando, buscarCep } = useViaCep()

  async function buscarEnderecoPeloCep() {
    const data = await buscarCep(form.cep)

    if (!data) {
      return
    }

    setForm((prev) => ({
      ...prev,
      logradouro: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.estado
    }))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target

    setForm({
      ...form,
      [name]: value
    })
  }

  async function handleSubmit() {
    console.log('clicou no botão')

    if (form.senha !== form.confirmarSenha) {
      alert("As senhas não coincidem")
      return
    }

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
        matricula: Date.now().toString(),
        periodo: Number(form.periodo),
        pessoa: {
          cpf: form.cpf,
          nome: form.nome,
          dataNascimento: form.dataNascimento,
          logradouro: form.logradouro,
          numero: Number(form.numero),
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
          cep: form.cep
        },
        usuario: {
          email: form.email,
          tipoUsuario: "Aluno",
          password: form.senha
        }
      }

      await criarAluno(alunoData)
      setAlerta({
        tipo: "success",
        mensagem: "Que beleza, seu aluno foi cadastrado com sucesso!"
      })

      setForm(initialForm)

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
                    onChange={handleChange}
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
                    onChange={handleChange}
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
                    onChange={handleChange}
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
                    onChange={handleChange}
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
                    onChange={handleChange}
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
                    onChange={handleChange}
                  />
                </Grid>

                <Grid size={4}>
                  <TextField
                    required
                    label="Cidade"
                    name="cidade"
                    value={form.cidade}
                    error={!!erros.cidade}
                    helperText={erros.cidade}                    
                    onChange={handleChange}
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
                    onChange={handleChange}
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
                      handleChange(e)
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

        <Stack component='div'>
          <Card.Root>
            <Card.Header>
              <Card.Title>Dados de Usuário</Card.Title>
            </Card.Header>

            <Card.Content>
              <Grid container spacing={1}>

                <Grid size={6}>
                  <TextField
                    required
                    label="Email"
                    name="email"
                    value={form.email}
                    error={!!erros.email}
                    helperText={erros.email}                    
                    onChange={handleChange}
                  />
                </Grid>

                <Grid size={3}>
                  <TextField
                    required
                    label="Senha"
                    type="password"
                    name="senha"
                    value={form.senha}
                    error={!!erros.senha}
                    helperText={erros.senha}
                    onChange={handleChange}
                  />
                </Grid>

                <Grid size={3}>
                  <TextField
                    required
                    label="Confirme a senha"
                    type="password"
                    name="confirmarSenha"
                    value={form.confirmarSenha}
                    error={!!erros.confirmarSenha}
                    helperText={erros.confirmarSenha}                    
                    onChange={handleChange}
                  />
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
                  <TextField
                    required
                    label="Curso"
                    name="curso"
                    value={form.curso}
                    error={!!erros.curso}
                    helperText={erros.curso}                    
                    onChange={handleChange}
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
                    onChange={handleChange}
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
    </Container>
  )
}