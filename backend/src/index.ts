import 'dotenv/config'; // Essencial para ler o .env
import express from 'express'; 
import cors from 'cors';
import routes from '../src/routes/routes-avaliacoes.js';

const PORT = process.env.PORT || 3000; 

const app = express();

app.use(cors({
    origin: '*', //"Qualquer site, de qualquer lugar do mundo, tem permissão para consumir os dados desta API."
}))

app.use(express.json());
app.use(routes);

app.listen(PORT, () => {
    console.log(`Olá, eu sou o servidor!`);
});