import { FormControl, InputLabel, MenuItem, Select, Stack } from "@mui/material";
import { CORES_DASHBOARD } from "../../../components/DashboardLayout";
import type { PeriodoProfessor } from "../../../models/home-professor-model";
import { TODAS } from "./regras-dashboard-professor";
import type { SelecaoProfessor } from "./regras-dashboard-professor";

interface Opcao { id: string; rotulo: string }

interface FiltrosProfessorProps {
  periodos: PeriodoProfessor[];
  periodoId: string;
  onPeriodo: (periodoId: string) => void;
  turmas: Opcao[];
  disciplinas: Opcao[];
  selecao: SelecaoProfessor;
  onSelecao: (selecao: SelecaoProfessor) => void;
}

// Larguras fixas: trocar a turma ou a disciplina não pode mudar o tamanho do cabeçalho.
// Texto longo vira reticências; a lista aberta mostra o nome completo.
const sxCampo = (largura: number) => ({
  width: { xs: "100%", sm: largura },
  flexShrink: 0,
  bgcolor: CORES_DASHBOARD.superficie,
  borderRadius: 1,
  "& .MuiSelect-select": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
});

export default function FiltrosProfessor({ periodos, periodoId, onPeriodo, turmas, disciplinas, selecao, onSelecao }: FiltrosProfessorProps) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} gap={1} component="section" aria-label="Filtros do dashboard">
      <FormControl size="small" sx={sxCampo(140)}>
        <InputLabel id="filtro-periodo">Período</InputLabel>
        <Select labelId="filtro-periodo" label="Período" value={periodoId} onChange={(evento) => onPeriodo(evento.target.value)}>
          {periodos.map((item) => <MenuItem key={item.id} value={item.id}>{item.codigo}{item.ativo ? " (ativo)" : ""}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl size="small" sx={sxCampo(170)}>
        <InputLabel id="filtro-turma">Turma</InputLabel>
        <Select labelId="filtro-turma" label="Turma" value={selecao.turmaId} onChange={(evento) => onSelecao({ ...selecao, turmaId: evento.target.value })}>
          <MenuItem value={TODAS}>Todas as turmas</MenuItem>
          {turmas.map((item) => <MenuItem key={item.id} value={item.id}>{item.rotulo}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl size="small" sx={sxCampo(200)}>
        <InputLabel id="filtro-disciplina">Disciplina</InputLabel>
        <Select labelId="filtro-disciplina" label="Disciplina" value={selecao.disciplinaId} onChange={(evento) => onSelecao({ ...selecao, disciplinaId: evento.target.value })}>
          <MenuItem value={TODAS}>Todas as disciplinas</MenuItem>
          {disciplinas.map((item) => <MenuItem key={item.id} value={item.id} title={item.rotulo}>{item.rotulo}</MenuItem>)}
        </Select>
      </FormControl>
    </Stack>
  );
}
