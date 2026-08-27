const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

module.exports = function configurarSocket(io) {
  // Middleware de autenticação via token no handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token não fornecido'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.usuario = payload;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const { id: usuarioId, nome, perfil } = socket.usuario;
    console.log(`Socket conectado: ${nome} (${perfil})`);

    // Sala pessoal para notificações direcionadas
    socket.join(`usuario:${usuarioId}`);

    // ── USUÁRIO solicita chat ──────────────────────────────────────
    socket.on('solicitar_chat', async ({ chamadoId }) => {
      try {
        const chamado = await prisma.chamado.findUnique({
          where: { id: chamadoId },
          include: { tecnico: { select: { id: true, nome: true } } },
        });

        if (!chamado) return socket.emit('erro', { mensagem: 'Chamado não encontrado' });
        if (!chamado.tecnicoId) return socket.emit('erro', { mensagem: 'Chamado sem técnico atribuído' });
        if (chamado.solicitanteId !== usuarioId) return socket.emit('erro', { mensagem: 'Acesso negado' });

        // Verifica sessão já existente
        const sessaoExistente = await prisma.chatSessao.findFirst({
          where: { chamadoId, status: { in: ['PENDENTE', 'ATIVA'] } },
        });
        if (sessaoExistente) {
          return socket.emit('chat_solicitado', { sessaoId: sessaoExistente.id });
        }

        // Cria sessão PENDENTE com usuário e técnico
        const sessao = await prisma.chatSessao.create({
          data: {
            chamadoId,
            usuarioId,
            tecnicoId: chamado.tecnicoId,
            status: 'PENDENTE',
          },
        });

        // Notifica o técnico
        io.to(`usuario:${chamado.tecnicoId}`).emit('solicitacao_chat', {
          sessaoId: sessao.id,
          chamadoId,
          chamadoTitulo: chamado.titulo,
          solicitante: { id: usuarioId, nome },
        });

        socket.emit('chat_solicitado', { sessaoId: sessao.id });
        console.log(`Chat solicitado: ${nome} → ${chamado.tecnico.nome}`);
      } catch (err) {
        console.error('Erro em solicitar_chat:', err);
        socket.emit('erro', { mensagem: 'Erro ao solicitar chat' });
      }
    });

    // ── TÉCNICO aceita o chat ──────────────────────────────────────
    socket.on('aceitar_chat', async ({ sessaoId }) => {
      try {
        const sessao = await prisma.chatSessao.findUnique({
          where: { id: sessaoId },
          include: {
            chamado: {
              include: {
                solicitante: { select: { id: true, nome: true } },
                tecnico: { select: { id: true, nome: true } },
              },
            },
          },
        });

        if (!sessao) return socket.emit('erro', { mensagem: 'Sessão não encontrada' });
        if (sessao.status !== 'PENDENTE') return socket.emit('erro', { mensagem: 'Sessão não está pendente' });
        if (sessao.tecnicoId !== usuarioId) return socket.emit('erro', { mensagem: 'Acesso negado' });

        await prisma.chatSessao.update({
          where: { id: sessaoId },
          data: { status: 'ATIVA' },
        });

        socket.join(`chat:${sessaoId}`);

        io.to(`usuario:${sessao.usuarioId}`).emit('chat_aceito', {
          sessaoId,
          chamadoId: sessao.chamadoId,
          tecnico: { id: usuarioId, nome },
        });

        socket.emit('chat_iniciado', {
          sessaoId,
          chamadoId: sessao.chamadoId,
          contato: sessao.chamado.solicitante,
        });

        console.log(`Chat aceito: ${nome} aceitou sessão ${sessaoId}`);
      } catch (err) {
        console.error('Erro em aceitar_chat:', err);
        socket.emit('erro', { mensagem: 'Erro ao aceitar chat' });
      }
    });

    // ── TÉCNICO recusa o chat ──────────────────────────────────────
    socket.on('recusar_chat', async ({ sessaoId }) => {
      try {
        const sessao = await prisma.chatSessao.findUnique({
          where: { id: sessaoId },
        });

        if (!sessao) return socket.emit('erro', { mensagem: 'Sessão não encontrada' });
        if (sessao.tecnicoId !== usuarioId) return socket.emit('erro', { mensagem: 'Acesso negado' });

        await prisma.chatSessao.update({
          where: { id: sessaoId },
          data: { status: 'ENCERRADA' },
        });

        io.to(`usuario:${sessao.usuarioId}`).emit('chat_recusado', { sessaoId });
        console.log(`Chat recusado: ${nome}`);
      } catch (err) {
        console.error('Erro em recusar_chat:', err);
        socket.emit('erro', { mensagem: 'Erro ao recusar chat' });
      }
    });

    // ── ENTRAR na sala do chat ─────────────────────────────────────
    socket.on('entrar_chat', async ({ sessaoId }) => {
      try {
        const sessao = await prisma.chatSessao.findUnique({
          where: { id: sessaoId },
        });

        if (!sessao || sessao.status !== 'ATIVA') {
          return socket.emit('erro', { mensagem: 'Sessão inativa ou não encontrada' });
        }

        const temAcesso = sessao.usuarioId === usuarioId || sessao.tecnicoId === usuarioId;
        if (!temAcesso) return socket.emit('erro', { mensagem: 'Acesso negado' });

        socket.join(`chat:${sessaoId}`);

        const mensagens = await prisma.mensagem.findMany({
          where: { sessaoId },
          orderBy: { criadoEm: 'asc' },
          include: { autor: { select: { id: true, nome: true, perfil: true } } },
        });

        socket.emit('historico_chat', { sessaoId, mensagens });
      } catch (err) {
        console.error('Erro em entrar_chat:', err);
        socket.emit('erro', { mensagem: 'Erro ao entrar no chat' });
      }
    });

    // ── ENVIAR mensagem ────────────────────────────────────────────
    socket.on('mensagem', async ({ sessaoId, texto }) => {
      if (!texto?.trim()) return;

      try {
        const sessao = await prisma.chatSessao.findUnique({
          where: { id: sessaoId },
        });

        if (!sessao || sessao.status !== 'ATIVA') {
          return socket.emit('erro', { mensagem: 'Chat não está ativo' });
        }

        const temAcesso = sessao.usuarioId === usuarioId || sessao.tecnicoId === usuarioId;
        if (!temAcesso) return socket.emit('erro', { mensagem: 'Acesso negado' });

        const mensagem = await prisma.mensagem.create({
          data: { texto: texto.trim(), autorId: usuarioId, sessaoId },
          include: { autor: { select: { id: true, nome: true, perfil: true } } },
        });

        io.to(`chat:${sessaoId}`).emit('nova_mensagem', mensagem);
      } catch (err) {
        console.error('Erro em mensagem:', err);
        socket.emit('erro', { mensagem: 'Erro ao enviar mensagem' });
      }
    });

    // ── ENCERRAR chat ──────────────────────────────────────────────
    socket.on('encerrar_chat', async ({ sessaoId }) => {
      try {
        const sessao = await prisma.chatSessao.findUnique({
          where: { id: sessaoId },
        });

        if (!sessao) return socket.emit('erro', { mensagem: 'Sessão não encontrada' });
        if (sessao.tecnicoId !== usuarioId) return socket.emit('erro', { mensagem: 'Apenas o técnico pode encerrar' });

        await prisma.chatSessao.update({
          where: { id: sessaoId },
          data: { status: 'ENCERRADA' },
        });

        io.to(`chat:${sessaoId}`).emit('chat_encerrado', { sessaoId });
        console.log(`Chat encerrado: ${nome}`);
      } catch (err) {
        console.error('Erro em encerrar_chat:', err);
        socket.emit('erro', { mensagem: 'Erro ao encerrar chat' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket desconectado: ${nome}`);
    });
  });
};
