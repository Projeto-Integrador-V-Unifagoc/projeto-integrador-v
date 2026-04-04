import express from 'express';
import cors from 'cors';
import { professorRouter } from './Modules/routes/professorRoutes.js';

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors({
  origin: '*',
}));

app.use(express.json());

app.use('/professores', professorRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});