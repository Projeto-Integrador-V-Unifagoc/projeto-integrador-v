import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import {
    IconButton,
    InputAdornment,
    Stack,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import DropDownCursos from "../DropDownCursos/DropDownCursos";
import DropDownPeriodos from "../DropDownPeriodos/DropDownsPeriodos";
import { FilterMenu } from "../FilterMenu/FilterMenu";
import type { Cursos } from "../../enums/cursos";
import TextField from "../TextField";
import Button from "../Button";
import type { Periodos } from "../../enums/periodos";

import { ListFilter, Search } from "lucide-react";

type SearchFilters = {
    codigo?: string;
    matricula?: string;
    curso?: Cursos | '';
    periodo?: string;
};

interface SearchTextFieldProps {
    children: ReactNode;
    buttonOnClick?: () => void;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    filterValues?: SearchFilters;
    onFilterChange?: (filters: SearchFilters) => void;
    searchPlaceholder?: string;
    firstFilterLabel?: string;
    secondFilterLabel?: string;
    fourthFilterLabel?: string;
    usePeriodFilter?: boolean;
    defaultAddPath?: string;
}

export default function SearchTextField(props: SearchTextFieldProps) {
    const {
        children,
        buttonOnClick,
        searchValue = '',
        onSearchChange,
        filterValues = {},
        onFilterChange,
        searchPlaceholder = "Pesquisar Alunos",
        firstFilterLabel = "Código",
        secondFilterLabel = "Matrícula",
        fourthFilterLabel = "Período",
        usePeriodFilter = true,
        defaultAddPath = "/alunos/cadastro",
    } = props;
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [localFilters, setLocalFilters] = useState(filterValues);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const navigate = useNavigate();

    useEffect(() => {
        setLocalFilters(filterValues);
    }, [filterValues]);

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

    function handleAddClick() {
        if (buttonOnClick) {
            buttonOnClick();
            return;
        }

        navigate(defaultAddPath);
    }

    return (
        <>
            <Stack
                display='flex'
                alignItems={isMobile ? "flex-start" : "center"}
                flexDirection={isMobile ? "column" : "row"}
                gap={1}
                pt={1}
            >
                <Typography fontWeight='bold' variant="subtitle2">{children}</Typography>
                <TextField
                    variant="outlined"
                    placeholder={searchPlaceholder}
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
                        width: '100%',
                    }}
                />
                <Button
                    variant="contained"
                    onClick={handleAddClick}
                    sx={{ width: isMobile ? '100%' : '80px' }}
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
                        label={firstFilterLabel}
                        value={localFilters.codigo || ''}
                        onChange={(e) => handleFilterChange('codigo', e.target.value)}
                        InputLabelProps={{
                            shrink: true
                        }}
                    />
                    <TextField
                        label={secondFilterLabel}
                        value={localFilters.matricula || ''}
                        onChange={(e) => handleFilterChange('matricula', e.target.value)}
                        InputLabelProps={{
                            shrink: true
                        }}
                    />
                    <DropDownCursos
                        value={localFilters.curso || ''}
                        onChange={(value) => handleFilterChange('curso', value)}
                    />
                    {usePeriodFilter ? (
                        <DropDownPeriodos
                            value={(localFilters.periodo as Periodos | '') || ''}
                            onChange={(value) => handleFilterChange('periodo', value)}
                        />
                    ) : (
                        <TextField
                            label={fourthFilterLabel}
                            value={localFilters.periodo || ''}
                            onChange={(e) => handleFilterChange('periodo', e.target.value)}
                            InputLabelProps={{
                                shrink: true
                            }}
                        />
                    )}
                </FilterMenu.Content>
                <FilterMenu.Footer />
            </FilterMenu.Root>
        </>
    )
}
