import { useState, type ReactNode } from "react";

import {
    IconButton,
    InputAdornment,
    Stack,
    Typography,
} from "@mui/material";

import DropDownCursos from "../DropDownCursos/DropDownCursos";
import { FilterMenu } from "../FilterMenu/FilterMenu";
import type { Cursos } from "../../enums/cursos";
import TextField from "../TextField";
import Button from "../Button";

import { ListFilter, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SearchTextFieldProps {
    children: ReactNode
}

export default function SearchTextField(props: SearchTextFieldProps) {
    const { children } = props
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [curso, setCurso] = useState<Cursos | ''>('');
    
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
                alignItems='center'
                flexDirection='row'
                gap={1}
                pt={1}
            >
                <Typography fontWeight='bold' variant="subtitle2">{children}</Typography>
                <TextField
                    variant="outlined"
                    placeholder="Pesquisar alunos"
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
                    }}
                />
                <Button variant="contained" sx={{ width: '80px' }} onClick={navegarPaginaCadastro}>Adicionar</Button>
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
                        onChange={setCurso}
                    />
                    <TextField
                        label="Período"
                        InputLabelProps={{
                            shrink: true
                        }}
                    />
                </FilterMenu.Content>
                <FilterMenu.Footer />
            </FilterMenu.Root>
        </>
    )
}