import { useState, useEffect } from "react";
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Stack, Typography, Box, InputAdornment, MenuItem
} from "@mui/material";
import { Search } from "lucide-react";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import { authService } from "../../services/auth-services"; 
import { Perfil } from "../../enums/perfil"; 

export default function Usuarios() {
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState<any[]>([]); 
    
    const [novoUsuario, setNovoUsuario] = useState({
        nome: '',
        email: '',
        senha: 'Mudar@123',
        tipo_usuario: Perfil.ALUNO 
    });

    const carregarUsuarios = async () => {
        try {
            const token = localStorage.getItem('@UniEduca:token');
            const response = await fetch('http://localhost:3000/usuarios', { 
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setRows(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Erro ao carregar usuários:", error);
            setRows([]);
        }
    };

    useEffect(() => {
        carregarUsuarios();
    }, []);

    const handleSalvar = async () => {
        try {
            await authService.cadastrar(novoUsuario); 
            alert("Usuário cadastrado com sucesso!");
            setOpen(false);
            carregarUsuarios();
        } catch (error) {
            console.error("Erro ao cadastrar:", error);
            alert("Erro ao realizar o cadastro.");
        }
    };

    const columns = [
        { field: "nome", headerName: "Nome", flex: 1 },
        { field: "email", headerName: "E-mail", flex: 1 },
        { field: "tipo_usuario", headerName: "Perfil", width: 150 },
    ];

    return (
        <Container>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3, mt: 1 }}>
                <Typography variant="h6" fontWeight="bold">Usuários</Typography>
                <Box display="flex" alignItems="center" gap={2} sx={{ width: '100%' }}>
                    <TextField
                        size="small"
                        placeholder="Pesquisar..."
                        sx={{ width: "100%", backgroundColor: 'white', '& .MuiOutlinedInput-root': { borderRadius: '20px' }, paddingLeft: 1 }}
                    />
                    <Button variant="contained" onClick={() => setOpen(true)} sx={{ backgroundColor: '#00B4D8', fontWeight: 'bold' }}>
                        Adicionar
                    </Button>
                </Box>
            </Box>
            
            <DataTable columns={columns} rows={rows || []} />

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 'bold' }}>Novo Usuário</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField 
                            label="Nome" 
                            fullWidth 
                            value={novoUsuario.nome}
                            onChange={(e) => setNovoUsuario({...novoUsuario, nome: e.target.value})}
                        />
                        <TextField 
                            label="E-mail" 
                            fullWidth 
                            value={novoUsuario.email}
                            onChange={(e) => setNovoUsuario({...novoUsuario, email: e.target.value})}
                        />
                        <TextField
                            select
                            label="Perfil"
                            fullWidth
                            value={novoUsuario.tipo_usuario}
                            onChange={(e) => setNovoUsuario({
                                ...novoUsuario, 
                                tipo_usuario: e.target.value as Perfil 
                            })}
                        >
                            <MenuItem value={Perfil.ALUNO}>Aluno</MenuItem>
                            <MenuItem value={Perfil.PROFESSOR}>Professor</MenuItem>
                            <MenuItem value={Perfil.SECRETARIA}>Secretaria</MenuItem>
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSalvar} variant="contained" sx={{ backgroundColor: '#00B4D8' }}>
                        Salvar
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}