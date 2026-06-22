import { useState, useRef, useEffect, useId, useLayoutEffect } from 'react';
import TextField from '../TextField';
import { InputAdornment, CircularProgress, Paper, List, ListItemButton, ListItemText } from '@mui/material';
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
    required?: boolean;
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
    required = false,
}: SearchableSelectProps) {
    const [inputText, setInputText] = useState(displayValue || '');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputId = useId();
    const listboxId = `${inputId}-listbox`;
    const [activeIndex, setActiveIndex] = useState(-1);

    // Sincroniza o texto exibido quando o valor externo muda
    useLayoutEffect(() => {
        // O texto digitado e o identificador selecionado são estados distintos deste combobox.
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            setOpen(false);
            return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            setActiveIndex((current) => {
                const next = current < 0 ? (direction > 0 ? 0 : options.length - 1) : current + direction;
                return Math.max(0, Math.min(options.length - 1, next));
            });
            return;
        }
        if (event.key === 'Enter' && open && activeIndex >= 0 && options[activeIndex]) {
            event.preventDefault();
            handleSelect(options[activeIndex]);
        }
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <TextField
                id={inputId}
                label={label}
                required={required}
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
                onKeyDown={handleKeyDown}
                inputProps={{
                    role: 'combobox',
                    'aria-expanded': open,
                    'aria-controls': open ? listboxId : undefined,
                    'aria-autocomplete': 'list',
                    'aria-activedescendant': activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined,
                }}
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
                        top: 'calc(100% - 18px)',
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
                        <List dense disablePadding id={listboxId} role="listbox">
                            <ListItemButton disabled>
                                <ListItemText
                                    primary="Buscando..."
                                    primaryTypographyProps={{ fontSize: 13, color: 'text.secondary' }}
                                />
                            </ListItemButton>
                        </List>
                    ) : options.length === 0 ? (
                        <List dense disablePadding id={listboxId} role="listbox">
                            <ListItemButton disabled>
                                <ListItemText
                                    primary={inputText ? 'Nenhum resultado encontrado' : 'Digite para buscar'}
                                    primaryTypographyProps={{ fontSize: 13, color: 'text.secondary' }}
                                />
                            </ListItemButton>
                        </List>
                    ) : (
                        <List dense disablePadding id={listboxId} role="listbox">
                            {options.map((option, index) => (
                                <ListItemButton
                                    key={option.id}
                                    id={`${listboxId}-${index}`}
                                    role="option"
                                    aria-selected={option.id === value}
                                    selected={option.id === value}
                                    onMouseEnter={() => setActiveIndex(index)}
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
