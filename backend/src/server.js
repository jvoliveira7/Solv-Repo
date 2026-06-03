require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const chamadoRoutes = require('./routes/chamados');

const app = express();

app.use(cors());
app.use(express.json());

//Rotas
app.use('/api/auth', authRoutes);
app.use('/api/chamados', chamadoRoutes);


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', projeto: 'Solv', versao: '1.0.0' });
});

//handler de erros global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Solv API rodando na porta ${PORT}`);
});
