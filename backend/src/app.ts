import express from 'express';
import cors from 'cors';
import { AlunoController } from './Modules/core-gestao-de-alunos/controller/AlunoController';
import { PessoaController } from './Modules/core-gestao-de-alunos/controller/PessoaController';


const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors({
    origin: '*',
}))

app.use(express.json());

const alunoController = new AlunoController();

app.post('/alunos', (req, res) => alunoController.criarAluno(req, res))

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});