import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Stack } from "@mui/material";

import Container from "../../components/Container";
import {
  abasFicha,
  alunoMock,
  FichaAlunoConteudoAba,
  FichaAlunoHeader,
  FichaAlunoNotasTabela,
  FichaAlunoResumoCard,
  FichaAlunoTabs,
  notasMock,
  opcoesSemestre,
  type AbaFicha,
} from "../../components/FichaAluno";

export default function FichaAluno() {
  const { matricula } = useParams();

  const [busca, setBusca] = useState("");
  const [semestre, setSemestre] = useState(alunoMock.semestre);
  const [abaAtual, setAbaAtual] = useState<AbaFicha>("notas");

  const aluno = useMemo(
    () => ({
      ...alunoMock,
      ra: matricula ?? alunoMock.ra,
    }),
    [matricula]
  );

  const abaSelecionada = abasFicha.find((aba) => aba.value === abaAtual);

  return (
    <Stack spacing={{ xs: 1.5, md: 2 }}>
      <Container sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <FichaAlunoHeader
            busca={busca}
            semestre={semestre}
            opcoesSemestre={opcoesSemestre}
            onBuscaChange={setBusca}
            onSemestreChange={setSemestre}
          />
          <FichaAlunoResumoCard aluno={aluno} />
        </Stack>
      </Container>

      <Container sx={{ p: { xs: 1.25, md: 2.5 } }}>
        <Stack spacing={2}>
          <FichaAlunoTabs
            abas={abasFicha}
            abaAtual={abaAtual}
            onChange={setAbaAtual}
          />

          {abaAtual === "notas" ? (
            <FichaAlunoNotasTabela notas={notasMock} semestre={semestre} />
          ) : (
            <FichaAlunoConteudoAba titulo={abaSelecionada?.label ?? ""} />
          )}
        </Stack>
      </Container>
    </Stack>
  );
}
