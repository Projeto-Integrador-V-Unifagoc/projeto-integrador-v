import { useState } from "react";
import { Box, IconButton, InputAdornment, LinearProgress, Stack, Typography } from "@mui/material";
import { Check, Eye, EyeOff, X } from "lucide-react";

import TextField from "../TextField";

export const REGRAS_SENHA = [
    { rotulo: "Mínimo de 8 caracteres", valida: (s: string) => s.length >= 8 },
    { rotulo: "Uma letra maiúscula", valida: (s: string) => /[A-Z]/.test(s) },
    { rotulo: "Uma letra minúscula", valida: (s: string) => /[a-z]/.test(s) },
    { rotulo: "Um número", valida: (s: string) => /[0-9]/.test(s) },
    { rotulo: "Um caractere especial", valida: (s: string) => /[^A-Za-z0-9\s]/.test(s) },
    { rotulo: "Sem espaços", valida: (s: string) => s.length > 0 && !/\s/.test(s) },
];

export function senhaForte(senha: string): boolean {
    return REGRAS_SENHA.every((regra) => regra.valida(senha));
}

const NIVEIS = [
    { rotulo: "Muito fraca", cor: "#d64545" },
    { rotulo: "Fraca", cor: "#e08c2f" },
    { rotulo: "Razoável", cor: "#d9b310" },
    { rotulo: "Boa", cor: "#3aa76d" },
    { rotulo: "Forte", cor: "#1f8a4c" },
];

function medirForca(senha: string): { indice: number; percentual: number } {
    if (!senha) return { indice: 0, percentual: 0 };

    const atendidas = REGRAS_SENHA.filter((regra) => regra.valida(senha)).length;
    const percentual = Math.round((atendidas / REGRAS_SENHA.length) * 100);

    if (atendidas <= 2) return { indice: 0, percentual };
    if (atendidas === 3) return { indice: 1, percentual };
    if (atendidas === 4) return { indice: 2, percentual };
    if (atendidas === 5) return { indice: 3, percentual };
    return { indice: senha.length >= 12 ? 4 : 3, percentual };
}

interface CampoSenhaProps {
    label: string;
    value: string;
    onChange: (valor: string) => void;
    error?: boolean;
    helperText?: string;
    mostrarForca?: boolean;
    mostrarRequisitos?: boolean;
    fullWidth?: boolean;
    autoComplete?: string;
}

export default function CampoSenha({
    label,
    value,
    onChange,
    error,
    helperText,
    mostrarForca = false,
    mostrarRequisitos = false,
    fullWidth = true,
    autoComplete = "new-password",
}: CampoSenhaProps) {
    const [visivel, setVisivel] = useState(false);

    const { indice, percentual } = medirForca(value);
    const nivel = NIVEIS[indice];

    return (
        <Box sx={{ width: fullWidth ? "100%" : "auto" }}>
            <TextField
                label={label}
                type={visivel ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                error={error}
                helperText={helperText}
                fullWidth={fullWidth}
                autoComplete={autoComplete}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                onClick={() => setVisivel((v) => !v)}
                                edge="end"
                                aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
                                tabIndex={-1}
                            >
                                {visivel ? <EyeOff size={19} /> : <Eye size={19} />}
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />

            {mostrarForca && value.length > 0 && (
                <Box sx={{ mt: 1.2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.6}>
                        <Typography sx={{ fontSize: ".78rem", color: "text.secondary" }}>
                            Força da senha
                        </Typography>
                        <Typography sx={{ fontSize: ".78rem", fontWeight: 700, color: nivel.cor }}>
                            {nivel.rotulo}
                        </Typography>
                    </Stack>

                    <LinearProgress
                        variant="determinate"
                        value={percentual}
                        sx={{
                            height: 6,
                            borderRadius: 999,
                            bgcolor: "#e6ebf0",
                            "& .MuiLinearProgress-bar": {
                                borderRadius: 999,
                                bgcolor: nivel.cor,
                                transition: "transform 300ms ease, background-color 300ms ease",
                            },
                        }}
                    />
                </Box>
            )}

            {mostrarRequisitos && value.length > 0 && (
                <Box
                    sx={{
                        mt: 1.4,
                        display: "grid",
                        gap: 0.6,
                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                    }}
                >
                    {REGRAS_SENHA.map((regra) => {
                        const ok = regra.valida(value);

                        return (
                            <Stack key={regra.rotulo} direction="row" spacing={0.8} alignItems="center">
                                {ok ? <Check size={14} color="#1f8a4c" /> : <X size={14} color="#b0bac4" />}
                                <Typography
                                    sx={{ fontSize: ".78rem", color: ok ? "#1f8a4c" : "text.secondary" }}
                                >
                                    {regra.rotulo}
                                </Typography>
                            </Stack>
                        );
                    })}
                </Box>
            )}
        </Box>
    );
}
