import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
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


import { ListFilter, Search } from "lucide-react";
import type { PERIODOS } from "../../enums/periodos";

type SearchFilters = {
  codigo?: string;
  matricula?: string;
  cursoId?: Cursos | "";
  periodo?: string;
};

const EMPTY_FILTERS: SearchFilters = {};

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
  addPath?: string;
  placeholder?: string;
  showFilters?: boolean;
  onSearchFilters?: (filters: SearchFilters) => void;
}

export default function SearchTextField(props: SearchTextFieldProps) {
  const {
    children,
    buttonOnClick,
    searchValue = "",
    onSearchChange,
    filterValues = EMPTY_FILTERS,
    onFilterChange,
    searchPlaceholder = "Pesquisar Alunos",
    firstFilterLabel = "Código",
    secondFilterLabel = "Matrícula",
    fourthFilterLabel = "Período",
    usePeriodFilter = true,
    defaultAddPath = "/alunos/cadastro",
    addPath,
    placeholder,
    showFilters = true,
    onSearchFilters,
  } = props;

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filterValues);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

  useEffect(() => {
    setLocalFilters(filterValues);
  }, [filterValues]);

  const usuarioStorage = localStorage.getItem("@UniEduca:user");
  let tipoUsuario = "";

  if (usuarioStorage) {
    try {
      const usuario = JSON.parse(usuarioStorage);
      tipoUsuario = String(usuario?.tipo_usuario || "").trim().toLowerCase();
    } catch {
      tipoUsuario = "";
    }
  }

  const ehSecretaria = tipoUsuario === "secretaria";
  const open = Boolean(anchorEl);

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    onFilterChange?.(localFilters);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  function handleAddClick() {
    if (!ehSecretaria) return;

    if (buttonOnClick) {
      buttonOnClick();
      return;
    }

    navigate(addPath || defaultAddPath);
  }

  const handleSearch = () => {
    onFilterChange?.(localFilters)
    handleClose()
  }

  return (
    <>
      <Stack
        display="flex"
        alignItems={isMobile ? "flex-start" : "center"}
        flexDirection={isMobile ? "column" : "row"}
        gap={1}
        pt={1}
      >
        <Typography fontWeight="bold" variant="subtitle2">
          {children}
        </Typography>

        <TextField
          variant="outlined"
          placeholder={placeholder || searchPlaceholder}
          fullWidth
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          InputProps={{
            endAdornment: showFilters ? (
              <InputAdornment position="end">
                <IconButton onClick={handleOpen}>
                  <ListFilter size={18} />
                </IconButton>
              </InputAdornment>
            ) : undefined,
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
              borderRadius: "17px",
            },
            width: "100%",
          }}
        />

        {ehSecretaria && (
          <Button
            variant="contained"
            onClick={handleAddClick}
            sx={{ width: isMobile ? "100%" : "80px" }}
          >
            Adicionar
          </Button>
        )}
      </Stack>

      {showFilters && (
        <FilterMenu.Root open={open} anchorEl={anchorEl} onClose={handleClose}>
          <FilterMenu.Content>
            <TextField
              label={firstFilterLabel}
              value={localFilters.codigo || ""}
              onChange={(e) => handleFilterChange("codigo", e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />

            <TextField
              label={secondFilterLabel}
              value={localFilters.matricula || ""}
              onChange={(e) => handleFilterChange("matricula", e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />

            <DropDownCursos
              optionValue="id"
              value={localFilters.cursoId || ""}
              onChange={(value) => handleFilterChange("cursoId", value)}
            />

            {usePeriodFilter ? (
              <DropDownPeriodos
                value={(localFilters.periodo as typeof PERIODOS[number]['value'] | "") || ""}
                onChange={(value) => handleFilterChange("periodo", value)}
              />
            ) : (
              <TextField
                label={fourthFilterLabel}
                value={localFilters.periodo || ""}
                onChange={(e) => handleFilterChange("periodo", e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            )}
          </FilterMenu.Content>

          <FilterMenu.Footer onSearch={handleSearch} onReset={handleClose} />
        </FilterMenu.Root>
      )}
    </>
  );
}
