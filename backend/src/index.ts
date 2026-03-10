import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { AvaliacaoController } from './modules/avaliacoes-vinculo/controller/avaliacao-controller.js';

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors({
  origin: "*"
}));

app.use(express.json());

const avaliacaoController = new AvaliacaoController();

app.put('/avaliacoes/:id', avaliacaoController.atualizar);

app.listen(PORT, () => {
  console.log('Olá, eu sou o servidor!');
});
