import { useEffect, useState } from "react";
import { Alert, Grid, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import Container from "../Container";
import { Card } from "../Card";
import TextField from "../TextField";
import Button from "../Button";
import DropDownDepartamentos from "../DropDownDepartamentos/DropDownDepartamentos";
import { useCurso } from "../../hooks/use-curso";
import { cursoSchema } from "../../validators/curso-schema";

type FormCursoProps = {
  cursoId?: string
}

type FormType = {
  codigo: string
  nome: string
  departamentoId: string
}

const initialForm: FormType = {
  codigo: "",
  nome: "",
  departamentoId: "",
}

export default function FormCurso({ cursoId }: FormCursoProps) {
  const [form, setForm] = useState<FormType>(initialForm)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [alerta, setAlerta] = useState<{
    tipo: "success" | "error"
    mensagem: string
  } | null>(null)

  const navigate = useNavigate()
  const {
    carregando,
    buscarCursoPorId,
    criarCurso,
    atualizarCurso,
  } = useCurso()

  useEffect(() => {
    async function carregarCurso() {
      if (!cursoId) {
        return
      }

      try {
        const curso = await buscarCursoPorId(cursoId)
        setForm({
          codigo: curso.codigo,
          nome: curso.nome,
          departamentoId: curso.departamento.id,
        })
      } catch {
        setAlerta({
          tipo: "error",
          mensagem: "Não foi possível carregar o curso.",
        })
      }
    }

    carregarCurso()
  }, [cursoId])

  function handleChange<K extends keyof FormType>(name: K, value: FormType[K]) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit() {
    try {
      await cursoSchema.validate(form, { abortEarly: false })
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
      if (cursoId) {
        await atualizarCurso(cursoId, form)
        setAlerta({
          tipo: "success",
          mensagem: "Curso atualizado com sucesso!",
        })
      } else {
        await criarCurso(form)
        setAlerta({
          tipo: "success",
          mensagem: "Curso cadastrado com sucesso!",
        })
        setForm(initialForm)
      }

      setTimeout(() => {
        navigate("/cursos/lista")
      }, 1500)
    } catch {
      setAlerta({
        tipo: "error",
        mensagem: cursoId
          ? "Não foi possível atualizar o curso."
          : "Não foi possível cadastrar o curso.",
      })
    }
  }

  return (
    <Container>
      <Stack mt={2} gap={2}>
        <Card.Root>
          <Card.Header>
            <Card.Title>{cursoId ? "Editar Curso" : "Cadastrar Curso"}</Card.Title>
          </Card.Header>
          <Card.Content>
            <Grid container spacing={1}>
              <Grid size={3}>
                <TextField
                  required
                  label="Código"
                  value={form.codigo}
                  error={!!erros.codigo}
                  helperText={erros.codigo}
                  onChange={(e) => handleChange("codigo", e.target.value)}
                />
              </Grid>
              <Grid size={5}>
                <TextField
                  required
                  label="Nome"
                  value={form.nome}
                  error={!!erros.nome}
                  helperText={erros.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                />
              </Grid>
              <Grid size={4}>
                <DropDownDepartamentos
                  required
                  value={form.departamentoId}
                  error={!!erros.departamentoId}
                  helperText={erros.departamentoId}
                  onChange={(value) => handleChange("departamentoId", value)}
                />
              </Grid>
            </Grid>
          </Card.Content>
        </Card.Root>

        <Stack direction="row" justifyContent="space-between" gap={2}>
          {alerta && (
            <Alert
              severity={alerta.tipo}
              sx={{
                width: "100%",
                height: "35px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {alerta.mensagem}
            </Alert>
          )}
          <Button
            variant="contained"
            sx={{ width: "120px", height: "35px" }}
            onClick={handleSubmit}
            isLoading={carregando}
          >
            {cursoId ? "Salvar" : "Cadastrar"}
          </Button>
        </Stack>
      </Stack>
    </Container>
  )
}
