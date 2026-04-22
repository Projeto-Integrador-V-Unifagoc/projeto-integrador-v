import { 
    useState, 
    type ReactNode 
} from "react";

import { useNavigate } from "react-router-dom";

import {
    IconButton,
    InputAdornment,
    Stack,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import type { Periodos } from "../../enums/periodos";
import type { Cursos } from "../../enums/cursos";

import DropDownPeriodos from "../DropDownPeriodos/DropDownsPeriodos";
import DropDownCursos from "../DropDownCursos/DropDownCursos";
import { FilterMenu } from "../FilterMenu/FilterMenu";
import TextField from "../TextField";
import Button from "../Button";

import { ListFilter, Search } from "lucide-react";


interface SearchTextFieldProps {
    children: ReactNode
}

export default function SearchTextField(props: SearchTextFieldProps) {
    const { children } = props
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [curso, setCurso] = useState<Cursos | ''>('')
    const [periodo, setPeiodo] = useState<Periodos | ''>('')
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"))

    const navigate = useNavigate()

    function navegarPaginaCadastro(){
        navigate("/alunos/cadastro")
    }

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    return (
        <>
            <Stack
                display='flex'
                alignItems={isMobile ? "flex-start" : "center"}
                flexDirection={isMobile ? "column" : "row"}
                gap={1}
                pt={1}
            >
                <Typography 
                    fontWeight='bold' 
                    variant="subtitle2"
                >
                    {children}
                </Typography>
                <TextField
                    variant="outlined"
                    placeholder="Pesquisar Alunos"
                    fullWidth
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton onClick={handleOpen}>
                                    <ListFilter size={18} />
                                </IconButton>
                            </InputAdornment>
                        ),
                        startAdornment: (
                            <InputAdornment position="start">
                                <IconButton>
                                    <Search size={18} />
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            borderRadius: '17px',
                        },
                        width: '100%',
                    }}
                />
                <Button 
                    variant="contained" 
                    onClick={navegarPaginaCadastro}
                    sx={{ 
                        width: isMobile ? "100%" : "80px"  
                    }} 
                >
                    Adicionar
                </Button>
            </Stack>
            <FilterMenu.Root
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
            >
                <FilterMenu.Content>
                    <TextField
                        label="Código"
                        InputLabelProps={{
                            shrink: true
                        }}
                    />
                    <TextField
                        label="Matrícula"
                        InputLabelProps={{
                            shrink: true
                        }}
                    />
                    <DropDownCursos
                        value={curso}
                        onChange={(value) => setCurso(value as Cursos | '')}
                    />
                    <DropDownPeriodos 
                        value={periodo}
                        onChange={(value) => setPeiodo(value as Periodos | '')}
                    />
                </FilterMenu.Content>
                <FilterMenu.Footer />
            </FilterMenu.Root>
        </>
    )
}
