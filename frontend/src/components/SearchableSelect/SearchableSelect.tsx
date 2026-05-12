import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import TextField from '../TextField';
import { InputAdornment, CircularProgress, Paper, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export interface SelectOption {
    id: string;
    label: string;
    sublabel?: string;
}

interface SearchableSelectProps {
    label?: string;
    placeholder?: string;
    value: string;           // ID selecionado
    displayValue?: string;   // Texto exibido (nome do item)
    options: SelectOption[];
    onSearch: (query: string) => void;
    onSelect: (option: SelectOption) => void;
    loading?: boolean;
    error?: boolean;
    helperText?: string;
    disabled?: boolean;
}

export default function SearchableSelect({
    label,
    placeholder = 'Digite para buscar...',
    value,
    displayValue,
    options,
    onSearch,
    onSelect,
    loading = false,
    error = false,
    helperText,
    disabled = false,
}: SearchableSelectProps) {
    const [inputText, setInputText] = useState(displayValue || '');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sincroniza o texto exibido quando o valor externo muda
    useLayoutEffect(() => {
        setInputText(displayValue || '');
    }, [displayValue]);

    // Fecha o dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                // Se o usuário saiu sem selecionar, restaura o texto do valor selecionado
                if (value && displayValue) {
                    setInputText(displayValue);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, displayValue]);

    const handleInputChange = (text: string) => {
        setInputText(text);
        setOpen(true);
        onSearch(text);
        // Se o usuário apagou tudo, limpa a seleção
        if (!text) {
            onSelect({ id: '', label: '' });
        }
    };

    const handleSelect = (option: SelectOption) => {
        setInputText(option.label);
        setOpen(false);
        onSelect(option);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            {label && (
                <Typography
                    variant="caption"
                    sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5, display: 'block' }}
                >
                    {label}
                </Typography>
            )}
            <TextField
                placeholder={placeholder}
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => {
                    setOpen(true);
                    onSearch(inputText);
                }}
                error={error}
                helperText={helperText}
                disabled={disabled}
                autoComplete="off"
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon sx={{ fontSize: 18, color: 'grey.300' }} />
                        </InputAdornment>
                    ),
                    endAdornment: loading ? (
                        <InputAdornment position="end">
                            <CircularProgress size={16} />
                        </InputAdornment>
                    ) : null,
                }}
            />

            {open && (
                <Paper
                    elevation={4}
                    sx={{
                        position: 'absolute',
                        top: label ? 'calc(100% - 4px)' : 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        zIndex: 1300,
                        maxHeight: 240,
                        overflow: 'auto',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'grey.200',
                    }}
                >
                    {loading ? (
                        <List dense disablePadding>
                            <ListItemButton disabled>
                                <ListItemText
                                    primary="Buscando..."
                                    primaryTypographyProps={{ fontSize: 13, color: 'text.secondary' }}
                                />
                            </ListItemButton>
                        </List>
                    ) : options.length === 0 ? (
                        <List dense disablePadding>
                            <ListItemButton disabled>
                                <ListItemText
                                    primary={inputText ? 'Nenhum resultado encontrado' : 'Digite para buscar'}
                                    primaryTypographyProps={{ fontSize: 13, color: 'text.secondary' }}
                                />
                            </ListItemButton>
                        </List>
                    ) : (
                        <List dense disablePadding>
                            {options.map((option) => (
                                <ListItemButton
                                    key={option.id}
                                    selected={option.id === value}
                                    onClick={() => handleSelect(option)}
                                    sx={{
                                        py: 0.75,
                                        '&.Mui-selected': {
                                            backgroundColor: 'primary.light',
                                            color: 'white',
                                        },
                                        '&:hover': {
                                            backgroundColor: 'grey.50',
                                        },
                                        '&.Mui-selected:hover': {
                                            backgroundColor: 'primary.main',
                                            color: 'white',
                                        },
                                    }}
                                >
                                    <ListItemText
                                        primary={option.label}
                                        secondary={option.sublabel}
                                        primaryTypographyProps={{ fontSize: 13 }}
                                        secondaryTypographyProps={{ fontSize: 11 }}
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    )}
                </Paper>
            )}
        </div>
    );
}