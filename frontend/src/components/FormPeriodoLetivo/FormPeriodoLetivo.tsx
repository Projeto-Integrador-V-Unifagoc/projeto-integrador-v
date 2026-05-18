import { useEffect, useState } from "react";
import { Alert, Grid, MenuItem, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ValidationError } from "yup";
import Container from "../Container";
import { Card } from "../Card";
import TextField from "../TextField";
import Button from "../Button";
import { usePeriodoLetivo } from "../../hooks/use-periodo-letivo";
import { periodoLetivoSchema } from "../../validators/periodo-letivo-schema";

type FormPeriodoLetivoProps = {
  periodoLetivoId?: string
}

type FormType = {
  codigo: string
  ano: string
  semestre: string
  dataInicio: string
  dataFim: string
  status: string
}

const initialForm: FormType = {
  codigo: "",
  ano: "",
  semestre: "",
  dataInicio: "",
  dataFim: "",
  status: "planejado",
};

export default function FormPeriodoLetivo({ periodoLetivoId }: FormPeriodoLetivoProps) {
  const [form, setForm] = useState<FormType>(initialForm);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error"; mensagem: string } | null>(null);
  const navigate = useNavigate();
  const {
    carregando,
    buscarPeriodoLetivoPorId,
    criarPeriodoLetivo,
    atualizarPeriodoLetivo,
  } = usePeriodoLetivo();

  useEffect(() => {
    async function carregarPeriodoLetivo() {
      if (!periodoLetivoId) {
        return;
      }

      try {
        const periodoLetivo = await buscarPeriodoLetivoPorId(periodoLetivoId);
        setForm({
          codigo: periodoLetivo.codigo,
          ano: String(periodoLetivo.ano),
          semestre: String(periodoLetivo.semestre),
          dataInicio: periodoLetivo.data_inicio?.slice(0, 10) ?? "",
          dataFim: periodoLetivo.data_fim?.slice(0, 10) ?? "",
          status: periodoLetivo.status,
        });
      } catch {
        setAlerta({
          tipo: "error",
          mensagem: "Nao foi possivel carregar o periodo letivo.",
        });
      }
    }

    void (async () => {
      await carregarPeriodoLetivo();
    })();
  }, [periodoLetivoId]);

  function handleChange<K extends keyof FormType>(name: K, value: FormType[K]) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit() {
    const payload = {
      ...form,
      ano: Number(form.ano),
      semestre: Number(form.semestre),
    };

    try {
      await periodoLetivoSchema.validate(payload, { abortEarly: false });
      setErros({});
    } catch (error: unknown) {
      const errosFormatados: Record<string, string> = {};
      if (!(error instanceof ValidationError)) {
        return;
      }
      error.inner.forEach((err) => {
        if (err.path) {
          errosFormatados[err.path] = err.message;
        }
      });
      setErros(errosFormatados);
      return;
    }

    try {
      if (periodoLetivoId) {
        await atualizarPeriodoLetivo(periodoLetivoId, payload);
        setAlerta({ tipo: "success", mensagem: "Periodo letivo atualizado com sucesso!" });
      } else {
        await criarPeriodoLetivo(payload);
        setAlerta({ tipo: "success", mensagem: "Periodo letivo cadastrado com sucesso!" });
        setForm(initialForm);
      }

      setTimeout(() => {
        navigate("/periodos-letivos/lista");
      }, 1500);
    } catch {
      setAlerta({
        tipo: "error",
        mensagem: periodoLetivoId
          ? "Nao foi possivel atualizar o periodo letivo."
          : "Nao foi possivel cadastrar o periodo letivo.",
      });
    }
  }

  return (
    <Container>
      <Stack mt={2} gap={2}>
        <Card.Root>
          <Card.Header>
            <Card.Title>{periodoLetivoId ? "Editar Periodo Letivo" : "Cadastrar Periodo Letivo"}</Card.Title>
          </Card.Header>
          <Card.Content>
            <Grid container spacing={1}>
              <Grid size={3}>
                <TextField
                  required
                  label="Codigo"
                  value={form.codigo}
                  error={!!erros.codigo}
                  helperText={erros.codigo}
                  onChange={(e) => handleChange("codigo", e.target.value)}
                />
              </Grid>
              <Grid size={2}>
                <TextField
                  required
                  label="Ano"
                  value={form.ano}
                  error={!!erros.ano}
                  helperText={erros.ano}
                  onChange={(e) => handleChange("ano", e.target.value)}
                />
              </Grid>
              <Grid size={2}>
                <TextField
                  required
                  label="Semestre"
                  select
                  value={form.semestre}
                  error={!!erros.semestre}
                  helperText={erros.semestre}
                  onChange={(e) => handleChange("semestre", e.target.value)}
                >
                  <MenuItem value="1">1</MenuItem>
                  <MenuItem value="2">2</MenuItem>
                </TextField>
              </Grid>
              <Grid size={3}>
                <TextField
                  required
                  label="Data Inicio"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.dataInicio}
                  error={!!erros.dataInicio}
                  helperText={erros.dataInicio}
                  onChange={(e) => handleChange("dataInicio", e.target.value)}
                />
              </Grid>
              <Grid size={2}>
                <TextField
                  required
                  label="Data Fim"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.dataFim}
                  error={!!erros.dataFim}
                  helperText={erros.dataFim}
                  onChange={(e) => handleChange("dataFim", e.target.value)}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  required
                  label="Status"
                  select
                  value={form.status}
                  error={!!erros.status}
                  helperText={erros.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                >
                  <MenuItem value="planejado">Planejado</MenuItem>
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="encerrado">Encerrado</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Card.Content>
        </Card.Root>

        <Stack direction="row" justifyContent="space-between" gap={2}>
          {alerta && (
            <Alert severity={alerta.tipo} sx={{ width: "100%", height: "35px", display: "flex", alignItems: "center" }}>
              {alerta.mensagem}
            </Alert>
          )}
          <Button variant="contained" sx={{ width: "120px", height: "35px" }} onClick={handleSubmit} isLoading={carregando}>
            {periodoLetivoId ? "Salvar" : "Cadastrar"}
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
