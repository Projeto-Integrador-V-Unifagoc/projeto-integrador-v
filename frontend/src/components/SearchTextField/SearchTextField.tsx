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

interface SearchTextFieldProps {
    children: ReactNode;
    buttonOnClick?: () => void;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    filterValues?: {
        codigo?: string;
        matricula?: string;
        curso?: Cursos | '';
        periodo?: string;
    };
    onFilterChange?: (filters: {
        codigo?: string;
        matricula?: string;
        curso?: Cursos | '';
        periodo?: string;
    }) => void;
}

export default function SearchTextField(props: SearchTextFieldProps) {
    const { children, buttonOnClick, searchValue = '', onSearchChange, filterValues = {}, onFilterChange } = props;
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [localFilters, setLocalFilters] = useState(filterValues);

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
        // Aplicar filtros ao fechar
        onFilterChange?.(localFilters);
    };

    const open = Boolean(anchorEl);

    const handleFilterChange = (key: keyof typeof localFilters, value: string) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
    };

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
                    placeholder="Pesquisar professor"
                    fullWidth
                    value={searchValue}
                    onChange={(e) => onSearchChange?.(e.target.value)}
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
                <Button variant="contained" onClick={buttonOnClick} sx={{ width: '80px' }}>Adicionar</Button>
            </Stack>
            <FilterMenu.Root
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
            >
                <FilterMenu.Content>
                    <TextField
                        label="Nome"
                        value={localFilters.matricula || ''}
                        onChange={(e) => handleFilterChange('matricula', e.target.value)}
                        InputLabelProps={{
                            shrink: true
                        }}
                    />
                    <TextField
                        label="CPF"
                        value={localFilters.codigo || ''}
                        onChange={(e) => handleFilterChange('codigo', e.target.value)}
                        InputLabelProps={{
                            shrink: true
                        }}
                    />
                    <DropDownCursos
                        value={localFilters.curso || ''}
                        onChange={(value) => handleFilterChange('curso', value)}
                    />
                    <TextField
                        label="Faculdade"
                        value={localFilters.periodo || ''}
                        onChange={(e) => handleFilterChange('periodo', e.target.value)}
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