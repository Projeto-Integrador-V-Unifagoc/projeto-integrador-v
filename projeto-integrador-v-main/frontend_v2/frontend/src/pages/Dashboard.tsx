import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem
} from '@mui/material'

import Header from '../components/Header'
import { emitirRelatorioFrequencia } from '../reports/FrequenciaReport'
import { emitirRelatorioNotas } from '../reports/NotasReport'
import { emitirConsultaAluno } from '../reports/ConsultaAlunoReport'
import { emitirHistoricoEscolar } from '../reports/HistoricoEscolarReport'

const relatorios = [
  {
    nome: 'Relatório de Notas',
    tipo: 'Acadêmico',
    descricao: 'Exibe as notas dos alunos por disciplina'
  },
  {
    nome: 'Relatório de Frequência',
    tipo: 'Acadêmico',
    descricao: 'Mostra presença e faltas dos alunos'
  },
  {
    nome: 'Consulta de Alunos',
    tipo: 'Consulta',
    descricao: 'Busca dados cadastrais dos alunos'
  },
  {
    nome: 'Histórico Escolar',
    tipo: 'Acadêmico',
    descricao: 'Lista todo histórico acadêmico do aluno'
  }
]

export default function Dashboard() {
  return (
    <Box>
      <Header />

      {/* CONTEÚDO */}
      <Box sx={{ p: 4, maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* TÍTULO */}
        <Typography variant="h5" sx={{ mb: 3 }}>
          Relatórios e Consultas
        </Typography>

        {/* BUSCA */}
        <TextField
          label="Buscar relatório ou aluno..."
          fullWidth
          sx={{ mb: 3 }}
        />

        {/* FILTROS */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <TextField
            select
            label="Ano"
            defaultValue="2026"
            sx={{ width: 150 }}
          >
            <MenuItem value="2026">2026</MenuItem>
            <MenuItem value="2025">2025</MenuItem>
          </TextField>

          <TextField
            select
            label="Tipo"
            defaultValue="todos"
            sx={{ width: 200 }}
          >
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="academico">Acadêmico</MenuItem>
            <MenuItem value="consulta">Consulta</MenuItem>
          </TextField>
        </Box>

        {/* LISTA */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {relatorios.map((item, index) => (
            <Paper
              key={index}
              sx={{
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Box>
                <Typography variant="h6">{item.nome}</Typography>

                <Typography variant="body2" color="text.secondary">
                  {item.descricao}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  Tipo: {item.tipo}
                </Typography>
              </Box>

              <Button
                variant="contained"
                onClick={() => {
                  switch (item.nome) {
                    case 'Relatório de Frequência':
                      emitirRelatorioFrequencia()
                      break
                    case 'Relatório de Notas':
                      emitirRelatorioNotas()
                      break
                    case 'Consulta de Alunos':
                      emitirConsultaAluno()
                      break
                    case 'Histórico Escolar':
                      emitirHistoricoEscolar()
                      break
                    default:
                      alert('Relatório em desenvolvimento: em breve estará disponível.')
                  }
                }}
              >
                Emitir
              </Button>
            </Paper>
          ))}
        </Box>

      </Box>
    </Box>
  )
}