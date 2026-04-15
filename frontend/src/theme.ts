import { createTheme } from "@mui/material";

export const theme = createTheme({
    palette: {
        primary: {
            main: "#05b5e6",
            light: "#66D1E6",
            dark: "#05b5e6",
            contrastText: "#FFFFFF"
        },
        background: {
            default: "#FFF",
            paper: "#F9F7F0"
        },
        text: {
            primary: "#363535",
            secondary: "#302F2F"
        },
        error: {
            main: "#FF0000"
        },
        success: {
            main: "#008000"
        },
        warning: {
            main: "#080808"
        },
        grey: {
            50: "#f5f5f5f8",
            100: "#F5F4F5",
            200: "#B2AFB6",
            300: "#98959D",
            400: "#7A767F",
            500: "#3E3C41",
            600: "#2E2C30",
            700: "#232225",
            800: "#19181B",
            900: "#050505",
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
                    color: "#080808",

                    "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#B2AFB6",
                    },

                    "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#000000",
                    },

                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#05b5e6",
                        borderWidth: 2,
                    },
                },
                input: {
                    fontSize: 14,

                    "&::placeholder": {
                        fontSize: 13,
                        opaciy: 0.6,
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