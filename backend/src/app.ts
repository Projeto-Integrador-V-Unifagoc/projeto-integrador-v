import express from 'express';
import cors from 'cors';
import matriculaRoutes from './Modules/matricula-vinculos/routes/matricula.routes';

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_, response) => {
  return response.status(200).json({ status: 'ok' });
});

app.use('/api', matriculaRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
