import 'dotenv/config'; // Essencial para ler o .env
import express from 'express'; 
import cors from 'cors';

const PORT = process.env.PORT || 3000; 

const app = express();

app.use(cors({
    origin: '*', //"Qualquer site, de qualquer lugar do mundo, tem permissão para consumir os dados desta API."
}))

app.use(express.json());

app.listen(PORT, () => {
    console.log(`Olá, Lorena!!! Eu sou o servidor!!`);
});