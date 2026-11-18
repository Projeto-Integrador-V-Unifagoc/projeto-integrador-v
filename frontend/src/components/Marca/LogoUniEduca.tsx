import "@fontsource/montserrat/latin-800.css";
import { Box, Stack } from "@mui/material";

// Logo do sistema na versão horizontal, a partir de public/assets/logo-unieduca.svg:
// mesmo capelo e mesmas cores ("Uni" azul-marinho, "Educa" azul). A Montserrat 800 é a fonte da
// marca e vale só aqui; o restante da interface segue a fonte do tema. Estas cores são só da logo:
// o ciano da sidebar e do site institucional é CORES_DASHBOARD.marca.
export const CORES_MARCA = { azulMarinho: "#0F2E6B", azul: "#159BE0", azulClaro: "#2BB6EF" } as const;
export const FONTE_MARCA = '"Montserrat", "Segoe UI", Arial, sans-serif';

/** Capelo da logo oficial (viewBox recortado do SVG original). */
function Capelo({ tamanho }: { tamanho: number }) {
  return (
    <svg width={tamanho} height={tamanho * 0.62} viewBox="-76 -36 160 84" aria-hidden="true" focusable="false">
      <path d="M0 -34 L74 0 L0 34 L-74 0 Z" fill={CORES_MARCA.azul} />
      <path d="M0 -34 L74 0 L0 12 L-74 0 Z" fill={CORES_MARCA.azulClaro} />
      <path d="M-44 12 v20 a44 20 0 0 0 88 0 v-20 l-16 7 v13 a28 12 0 0 1 -56 0 v-13 Z" fill={CORES_MARCA.azul} />
      <path d="M70 2 v34 a6 6 0 0 0 12 0 v-34 Z" fill={CORES_MARCA.azul} />
      <circle cx="76" cy="40" r="7" fill={CORES_MARCA.azul} />
    </svg>
  );
}

export default function LogoUniEduca({ tamanho = 18 }: { tamanho?: number }) {
  return (
    <Stack direction="row" alignItems="center" gap={0.75} role="img" aria-label="UniEduca" sx={{ userSelect: "none" }}>
      <Capelo tamanho={Math.round(tamanho * 1.6)} />
      <Box
        component="span"
        aria-hidden="true"
        sx={{ fontFamily: FONTE_MARCA, fontWeight: 800, fontSize: tamanho, lineHeight: 1, letterSpacing: "-0.02em", color: CORES_MARCA.azulMarinho }}
      >
        Uni
        <Box component="span" sx={{ color: CORES_MARCA.azul }}>Educa</Box>
      </Box>
    </Stack>
  );
}
