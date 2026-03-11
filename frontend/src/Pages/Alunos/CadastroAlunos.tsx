import { Grid, Stack } from "@mui/material";
import { useState } from "react";
import axios from "axios";
import { Card } from "../../components/Card";
import Container from "../../components/Container";
import TextField from "../../components/TextField";
import Button from "../../components/Button";

export default function CadastroAlunos(){

  const initialForm = {
    nome: "",
    cpf: "",
    dataNascimento: "",
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
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target

    setForm({
      ...form,
      [name]: value
    })
  }

  async function buscarCep(cep: string){

    if(cep.length !== 8) return

    try{

      const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`)

      const data = response.data

      setForm((prev)=>({
        ...prev,
        logradouro: data.logradouro || "",
        bairro: data.bairro || "",
        cidade: data.localidade || "",
        estado: data.uf || ""
      }))

    }catch(err){
      console.log("Erro ao buscar CEP")
      console.log(err)
    }
  }

  async function handleSubmit(){

    if(form.senha !== form.confirmarSenha){
      alert("As senhas não coincidem")
      return
    }

    try{

      setLoading(true)

      const response = await axios.post(
        "http://localhost:8080/alunos",
        form
      )

      console.log(response.data)

      alert("Aluno cadastrado com sucesso!")

      setForm(initialForm)

    }catch(err){
      console.error(err)
      alert("Erro ao cadastrar aluno")
    }finally{
      setLoading(false)
    }

  }

  return(
    <Container>

      <Card.Root>

        <Card.Header>
          <Card.Title>Dados pessoais</Card.Title>
        </Card.Header>

        <Card.Content>
          <Grid container spacing={4}>

            <Grid size={6}>
              <TextField label="Nome" name="nome" value={form.nome} onChange={handleChange}/>
            </Grid>

            <Grid size={3}>
              <TextField label="CPF" name="cpf" value={form.cpf} onChange={handleChange}/>
            </Grid>

            <Grid size={3}>
              <TextField
                label="Data Nascimento"
                name="dataNascimento"
                type="date"
                value={form.dataNascimento}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={6}>
              <TextField label="Logradouro" name="logradouro" value={form.logradouro} onChange={handleChange}/>
            </Grid>

            <Grid size={2}>
              <TextField label="Número" name="numero" value={form.numero} onChange={handleChange}/>
            </Grid>

            <Grid size={4}>
              <TextField label="Bairro" name="bairro" value={form.bairro} onChange={handleChange}/>
            </Grid>

            <Grid size={4}>
              <TextField label="Cidade" name="cidade" value={form.cidade} onChange={handleChange}/>
            </Grid>

            <Grid size={2}>
              <TextField label="Estado" name="estado" value={form.estado} onChange={handleChange}/>
            </Grid>

            <Grid size={2}>
              <TextField
                label="CEP"
                name="cep"
                value={form.cep}
                onChange={(e)=>{
                  handleChange(e)
                  buscarCep(e.target.value)
                }}
              />
            </Grid>

          </Grid>
        </Card.Content>


        <Card.Header>
          <Card.Title>Dados de Usuário</Card.Title>
        </Card.Header>

        <Card.Content>
          <Grid container spacing={4}>

            <Grid size={6}>
              <TextField label="Email" name="email" value={form.email} onChange={handleChange}/>
            </Grid>

            <Grid size={3}>
              <TextField
                label="Senha"
                type="password"
                name="senha"
                value={form.senha}
                onChange={handleChange}
              />
            </Grid>

            <Grid size={3}>
              <TextField
                label="Confirme a senha"
                type="password"
                name="confirmarSenha"
                value={form.confirmarSenha}
                onChange={handleChange}
              />
            </Grid>

          </Grid>
        </Card.Content>


        <Card.Header>
          <Card.Title>Dados do curso</Card.Title>
        </Card.Header>

        <Card.Content>
          <Grid container spacing={4}>

            <Grid size={4}>
              <TextField label="Curso" name="curso" value={form.curso} onChange={handleChange}/>
            </Grid>

            <Grid size={2}>
              <TextField label="Periodo" name="periodo" value={form.periodo} onChange={handleChange}/>
            </Grid>

          </Grid>
        </Card.Content>

      </Card.Root>


      <Stack
        display="flex"
        flexDirection="row"
        justifyContent="flex-end"
        mt="4px"
      >

        <Button
          variant="contained"
          sx={{width:"120px", height:"35px"}}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Salvando..." : "Cadastrar"}
        </Button>

      </Stack>

    </Container>
  )
}