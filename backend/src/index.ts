import 'dotenv/config';
import express from 'express'; 
import cors from 'cors';

const PORT = process.env.PORT || 3000; 

const app = express();

app.use(cors({
    origin: '*', 
}))

app.use(express.json());

app.listen(PORT, () => {
    console.log(`Olá, eu sou o servidor!`);
});
/*
import express from 'express';
import avaliacaoRoutes from '../src/routes/avaliacao-routes'; 

const app = express();

app.use(express.json()); 

app.use('/api/avaliacoes', avaliacaoRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Olá, eu sou o servidor e estou rodando na porta ${PORT}!!`);
}); */