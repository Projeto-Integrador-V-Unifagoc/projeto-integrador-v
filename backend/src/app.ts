import express from 'express';
import cors from 'cors';
import { AlunoController } from './Modules/core-gestao-de-alunos/controller/AlunoController';
import { PessoaController } from './Modules/core-gestao-de-alunos/controller/PessoaController';
import { CidadeController } from './Modules/cidades/controller/CidadeController';


const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors({
    origin: '*',
}))

app.use(express.json());

const alunoController = new AlunoController();
const cidadeController = new CidadeController()

app.post('/alunos', (req, res) => alunoController.criarAluno(req, res))
app.get('/alunos', (req, res) => alunoController.listarAlunos(req, res))
app.get('/alunos/:matricula', (req, res) => alunoController.buscarAlunoPorMatricula(req, res))
app.get('/cidades', (req, res) => cidadeController.listarCidades(req, res))

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});