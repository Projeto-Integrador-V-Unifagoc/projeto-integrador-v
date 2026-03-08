import 'dotenv/config';
import express from 'express';
import cors from 'cors';
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors({
    origin: '*',
}));
app.use(express.json());
app.listen(PORT, () => {
    console.log(`Olá, eu sou o servidor!`);
});
//# sourceMappingURL=index.js.map