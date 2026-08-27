require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const chamadoRoutes = require('./routes/chamados');
const chatRoutes = require('./routes/chat');
const configurarSocket = require('./socket/chatHandler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

//Rotas REST
app.use('/api/auth', authRoutes);
app.use('/api/chamados', chamadoRoutes);
app.use('/api', chatRoutes);

//Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', projeto: 'Solv', versao: '1.0.0' });
});

//Handler de erros global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

//Socket.io
configurarSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Solv API rodando na porta ${PORT}`);
  console.log(`Socket.io ativo`);
});
