import { createTheme } from "@mui/material";
import { CORES_DASHBOARD, ESTADOS } from "./components/DashboardLayout/dashboard-estilos";

// As cores vêm dos tokens do padrão visual (dashboard-estilos.ts): o mesmo azul de ação e o mesmo
// vermelho em todas as telas, sem precisar mexer em cada página. Todas passam em contraste AA.

export const theme = createTheme({
    palette: {
        primary: {
            main: CORES_DASHBOARD.acento,
            light: "#4FA3BE",
            dark: CORES_DASHBOARD.acentoHover,
            contrastText: "#FFFFFF"
        },
        background: {
            default: "#FFF",
            paper: CORES_DASHBOARD.superficie
        },
        text: {
            primary: CORES_DASHBOARD.texto,
            secondary: CORES_DASHBOARD.textoSuave
        },
        error: {
            main: ESTADOS.critico.texto
        },
        success: {
            main: ESTADOS.ok.texto
        },
        warning: {
            main: "#B54708",
            light: "#FFB74D",
            dark: ESTADOS.atencao.texto,
            contrastText: "#FFFFFF"
        },
        info: {
            main: CORES_DASHBOARD.acento
        },
        grey: {
            50: "#F9FAFB",
            100: CORES_DASHBOARD.superficieSutil,
            200: "#B9C0CB",
            300: CORES_DASHBOARD.iconeApagado,
            400: CORES_DASHBOARD.textoApagado,
            500: "#475467",
            600: "#344054",
            700: "#1D2939",
            800: "#101828",
            900: "#0C111D",
        },
    },

    typography: {
        fontFamily: "Roboto, Arial, sans-serif",

        button: {
            fontWeight: '700',
            textTransform: 'none',
        },
    },
    components: {
        MuiTextField: {
            defaultProps: {
                fullWidth: true,
                variant: 'outlined',
                size: 'small',
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    height: 36,
                    color: CORES_DASHBOARD.texto,

                    "&.MuiInputBase-multiline": {
                        height: "auto",
                    },

                    "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#B9C0CB",
                    },

                    "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#000000",
                    },

                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: CORES_DASHBOARD.acento,
                        borderWidth: 2,
                    },
                },
                input: {
                    fontSize: 14,

                    "&::placeholder": {
                        fontSize: 13,
                        opacity: 0.6,
                    }
                }
            },
        },

        MuiInputLabel: {
            styleOverrides: {
                root: {
                    fontSize: 13,
                },
                shrink: {
                    fontSize: 16, 
                },
            },
        },

        MuiButton: {
            styleOverrides: {
                root: {
                    height: 30,
                    width: 75,
                }
            }
        },

        MuiCardContent: {
            styleOverrides: {
                root: {
                    backgroundColor: '#FFF'
                }
            }
        },

        MuiCardHeader: {
            styleOverrides: {
                root: {
                    backgroundColor: '#FFF'
                }
            }
        },
    }

})
