import { Tab, Tabs } from "@mui/material";

import type { AbaFicha } from "./types";

interface FichaAlunoTabsProps {
  abas: { label: string; value: AbaFicha }[];
  abaAtual: AbaFicha;
  onChange: (value: AbaFicha) => void;
}

export function FichaAlunoTabs(props: FichaAlunoTabsProps) {
  const { abas, abaAtual, onChange } = props;

  return (
    <Tabs
      value={abaAtual}
      onChange={(_, value: AbaFicha) => onChange(value)}
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        "& .MuiTab-root": {
          textTransform: "none",
          minHeight: { xs: 36, sm: 40 },
          minWidth: "max-content",
          px: { xs: 1, sm: 1.5 },
          fontSize: { xs: "0.8rem", sm: "0.875rem" },
        },
      }}
    >
      {abas.map((aba) => (
        <Tab key={aba.value} label={aba.label} value={aba.value} />
      ))}
    </Tabs>
  );
}
