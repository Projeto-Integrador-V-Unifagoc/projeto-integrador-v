import { useEffect, useState } from "react";
import { Alert, Grid, MenuItem, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ValidationError } from "yup";
import Container from "../Container";
import { Card } from "../Card";
import TextField from "../TextField";
import Button from "../Button";
import { useTurma } from "../../hooks/use-turma";
import { useCurso } from "../../hooks/use-curso";
import { usePeriodoLetivo } from "../../hooks/use-periodo-letivo";
import { turmaSchema } from "../../validators/turma-schema";
import type { CursoResponse } from "../../models/curso-model";
import type { PeriodoLetivoResponse } from "../../models/periodo-letivo-model";
import { TurmaDisciplinasSection } from "../TurmaDisciplinasSection/TurmaDisciplinasSection";

type FormTurmaProps = {
  turmaId?: string
}

type FormType = {
  periodoLetivoId: string
  cursoId: string
  periodoCurricular: string
  descricao: string
  sigla: string
  capacidadeAlunos: string
  turno: string
  status: string
}

const initialForm: FormType = {
  periodoLetivoId: "",
  cursoId: "",
  periodoCurricular: "",
  descricao: "",
  sigla: "",
  capacidadeAlunos: "",
  turno: "noturno",
  status: "ativa",
};

export default function FormTurma({ turmaId }: FormTurmaProps) {
  const [form, setForm] = useState<FormType>(initialForm);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error"; mensagem: string } | null>(null);
  const [cursos, setCursos] = useState<CursoResponse[]>([]);
  const [periodosLetivos, setPeriodosLetivos] = useState<PeriodoLetivoResponse[]>([]);
  const navigate = useNavigate();
  const { carregando, buscarTurmaPorId, criarTurma, atualizarTurma } = useTurma();
  const { listarCursos } = useCurso();
  const { listarPeriodosLetivos } = usePeriodoLetivo();

  useEffect(() => {
    async function carregarDados() {
      const [cursosResponse, periodosResponse] = await Promise.all([
        listarCursos(),
        listarPeriodosLetivos(),
      ]);

      setCursos(cursosResponse);
      setPeriodosLetivos(periodosResponse);
    }

    void (async () => {
      await carregarDados();
    })();
  }, []);

  useEffect(() => {
    async function carregarTurma() {
      if (!turmaId) {
        return;
      }

      try {
        const turma = await buscarTurmaPorId(turmaId);
        setForm({
          periodoLetivoId: turma.periodo_letivo.id,
          cursoId: turma.curso.id,
          periodoCurricular: String(turma.periodo_curricular),
          descricao: turma.descricao,
          sigla: turma.sigla,
          capacidadeAlunos: String(turma.capacidade_alunos),
          turno: turma.turno,
          status: turma.status,
        });
      } catch {
        setAlerta({
          tipo: "error",
          mensagem: "Nao foi possivel carregar a turma.",
        });
      }
    }

    void (async () => {
      await carregarTurma();
    })();
  }, [turmaId]);

  function handleChange<K extends keyof FormType>(name: K, value: FormType[K]) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit() {
    const payload = {
      ...form,
      periodoCurricular: Number(form.periodoCurricular),
      capacidadeAlunos: Number(form.capacidadeAlunos),
    };

    try {
      await turmaSchema.validate(payload, { abortEarly: false });
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
      if (turmaId) {
        await atualizarTurma(turmaId, payload);
        setAlerta({ tipo: "success", mensagem: "Turma atualizada com sucesso!" });
      } else {
        const novaTurma = await criarTurma(payload);
        setAlerta({ tipo: "success", mensagem: "Turma cadastrada com sucesso!" });
        setTimeout(() => {
          navigate(`/turmas/${novaTurma.id}`);
        }, 1200);
        return;
      }
    } catch {
      setAlerta({
        tipo: "error",
        mensagem: turmaId
          ? "Nao foi possivel atualizar a turma."
          : "Nao foi possivel cadastrar a turma.",
      });
    }
  }

  return (
    <Container>
      <Stack mt={2} gap={2}>
        <Card.Root>
          <Card.Header>
            <Card.Title>{turmaId ? "Detalhes da Turma" : "Cadastrar Turma"}</Card.Title>
          </Card.Header>
          <Card.Content>
            <Grid container spacing={1}>
              <Grid size={4}>
                <TextField
                  required
                  label="Curso"
                  select
                  value={form.cursoId}
                  error={!!erros.cursoId}
                  helperText={erros.cursoId}
                  onChange={(e) => handleChange("cursoId", e.target.value)}
                >
                  {cursos.map((curso) => (
                    <MenuItem key={curso.id} value={curso.id}>{curso.nome}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={4}>
                <TextField
                  required
                  label="Periodo Letivo"
                  select
                  value={form.periodoLetivoId}
                  error={!!erros.periodoLetivoId}
                  helperText={erros.periodoLetivoId}
                  onChange={(e) => handleChange("periodoLetivoId", e.target.value)}
                >
                  {periodosLetivos.map((periodo) => (
                    <MenuItem key={periodo.id} value={periodo.id}>{periodo.codigo}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={4}>
                <TextField
                  required
                  label="Periodo Curricular"
                  value={form.periodoCurricular}
                  error={!!erros.periodoCurricular}
                  helperText={erros.periodoCurricular}
                  onChange={(e) => handleChange("periodoCurricular", e.target.value)}
                />
              </Grid>
              <Grid size={5}>
                <TextField
                  required
                  label="Descricao"
                  value={form.descricao}
                  error={!!erros.descricao}
                  helperText={erros.descricao}
                  onChange={(e) => handleChange("descricao", e.target.value)}
                />
              </Grid>
              <Grid size={2}>
                <TextField
                  required
                  label="Sigla"
                  value={form.sigla}
                  error={!!erros.sigla}
                  helperText={erros.sigla}
                  onChange={(e) => handleChange("sigla", e.target.value)}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  required
                  label="Capacidade"
                  value={form.capacidadeAlunos}
                  error={!!erros.capacidadeAlunos}
                  helperText={erros.capacidadeAlunos}
                  onChange={(e) => handleChange("capacidadeAlunos", e.target.value)}
                />
              </Grid>
              <Grid size={2}>
                <TextField
                  required
                  label="Turno"
                  select
                  value={form.turno}
                  error={!!erros.turno}
                  helperText={erros.turno}
                  onChange={(e) => handleChange("turno", e.target.value)}
                >
                  <MenuItem value="matutino">Matutino</MenuItem>
                  <MenuItem value="vespertino">Vespertino</MenuItem>
                  <MenuItem value="noturno">Noturno</MenuItem>
                  <MenuItem value="integral">Integral</MenuItem>
                </TextField>
              </Grid>
              <Grid size={2}>
                <TextField
                  required
                  label="Status"
                  select
                  value={form.status}
                  error={!!erros.status}
                  helperText={erros.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                >
                  <MenuItem value="ativa">Ativa</MenuItem>
                  <MenuItem value="planejada">Planejada</MenuItem>
                  <MenuItem value="encerrada">Encerrada</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Card.Content>
        </Card.Root>

        <Stack direction="row" justifyContent="space-between" gap={2}>
          {alerta && (
            <Alert severity={alerta.tipo} sx={{ width: "100%", display: "flex", alignItems: "center" }}>
              {alerta.mensagem}
            </Alert>
          )}
          <Button variant="contained" sx={{ width: "120px", height: "35px" }} onClick={handleSubmit} isLoading={carregando}>
            {turmaId ? "Salvar" : "Cadastrar"}
          </Button>
        </Stack>

        {turmaId && (
          <>
            <Typography variant="h6">Disciplinas da Turma</Typography>
            <TurmaDisciplinasSection turmaId={turmaId} cursoId={form.cursoId} />
          </>
        )}
      </Stack>
    </Container>
  );
}
