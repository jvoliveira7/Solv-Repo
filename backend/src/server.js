require('dotenv').config();

// Falha cedo e com mensagem clara se o .env não foi lido (arquivo ausente, vazio,
// com nome errado como ".env.txt", ou servidor iniciado fora da pasta do backend).
const OBRIGATORIAS = ['DATABASE_URL', 'JWT_SECRET'];
const faltando = OBRIGATORIAS.filter((nome) => !process.env[nome]);
if (faltando.length > 0) {
  console.error(
    `Variáveis ausentes: ${faltando.join(', ')}. Confira se o arquivo .env existe na pasta do backend ` +
    '(de onde você roda npm start) e se o nome é exatamente ".env".'
  );
  process.exit(1);
}
// Sem estes códigos o cadastro correspondente fica indisponível (o resto funciona).
['ORGANIZACAO_ACCESS_CODE', 'TECNICO_ACCESS_CODE'].forEach((nome) => {
  if (!process.env[nome]) console.warn(`Aviso: ${nome} não está no .env — o cadastro correspondente ficará indisponível.`);
});

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const chamadoRoutes = require('./routes/chamados');
const chatRoutes = require('./routes/chat');
const timeRoutes = require('./routes/times');
const adminRoutes = require('./routes/admin');
const denunciaRoutes = require('./routes/denuncias');
const configurarSocket = require('./socket/chatHandler');

const app = express();

// O app chega por túnel/proxy (X-Forwarded-For). Com isso o limitador de tentativas
// conta cada cliente pelo IP real, e não todo mundo como o IP do túnel.
app.set('trust proxy', 1);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json({ limit: '5mb' })); // aumentado pra caber foto de perfil em base64

//Health check — antes dos routers montados em /api, senão o middleware de
//autenticação deles roda primeiro e a rota pública nunca é alcançada
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', projeto: 'Solv', versao: '1.0.0' });
});

//Rotas REST
app.use('/api/auth', authRoutes);
app.use('/api/chamados', chamadoRoutes);
app.use('/api/times', timeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/denuncias', denunciaRoutes);
app.use('/api', chatRoutes);

//Handler de erros global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

//Socket.io
app.set('io', io);
configurarSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Solv API rodando na porta ${PORT}`);
  console.log(`Socket.io ativo`);
});