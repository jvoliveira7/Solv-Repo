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

    // Sala pessoal para notificações direcionadas — funciona em qualquer tela
    socket.join(`usuario:${usuarioId}`);

    // Presença — usada pelo indicador "● Online" no chat
    io.emit('usuario_status', { usuarioId, online: true });

    // ── Cria ou reaproveita uma sessão de chat (usada por ambos os lados) ──
    async function abrirSolicitacao({ chamadoId, iniciadoPor }) {
      let chamado = await prisma.chamado.findUnique({
        where: { id: chamadoId },
        include: {
          solicitante: { select: { id: true, nome: true } },
          tecnico: { select: { id: true, nome: true } },
        },
      });

      if (!chamado) throw { erro: 'Chamado não encontrado' };

      // Técnico pode convidar pra chat mesmo sem ter assumido o chamado
      // formalmente ainda — convidar já vale como assumir o atendimento.
      if (iniciadoPor === 'TECNICO' && !chamado.tecnicoId) {
        if (perfil !== 'TECNICO' && perfil !== 'ADMIN') throw { erro: 'Acesso negado' };
        chamado = await prisma.chamado.update({
          where: { id: chamadoId },
          data: { tecnicoId: usuarioId },
          include: {
            solicitante: { select: { id: true, nome: true } },
            tecnico: { select: { id: true, nome: true } },
          },
        });
      }

      if (!chamado.tecnicoId) throw { erro: 'Chamado sem técnico atribuído' };

      const souSolicitante = chamado.solicitanteId === usuarioId;
      const souTecnico = chamado.tecnicoId === usuarioId;
      if (!souSolicitante && !souTecnico) throw { erro: 'Acesso negado' };
      if (iniciadoPor === 'USUARIO' && !souSolicitante) throw { erro: 'Acesso negado' };
      if (iniciadoPor === 'TECNICO' && !souTecnico) throw { erro: 'Acesso negado' };

      // Sessão existente (qualquer status) — 1 sessão por chamado
      const sessaoExistente = await prisma.chatSessao.findUnique({ where: { chamadoId } });

      if (sessaoExistente && sessaoExistente.status !== 'ENCERRADA') {
        return { sessao: sessaoExistente, chamado, reaproveitada: true };
      }

      // Recria (ou cria) sessão PENDENTE — upsert cobre o caso de sessão ENCERRADA anterior
      const sessao = await prisma.chatSessao.upsert({
        where: { chamadoId },
        update: {
          status: 'PENDENTE',
          iniciadoPor,
          encerradoPorResolucao: false,
        },
        create: {
          chamadoId,
          usuarioId: chamado.solicitanteId,
          tecnicoId: chamado.tecnicoId,
          status: 'PENDENTE',
          iniciadoPor,
        },
      });

      return { sessao, chamado, reaproveitada: false };
    }

    // ── USUÁRIO solicita chat ──────────────────────────────────────
    socket.on('solicitar_chat', async ({ chamadoId }) => {
      try {
        const { sessao, chamado, reaproveitada } = await abrirSolicitacao({ chamadoId, iniciadoPor: 'USUARIO' });

        if (reaproveitada) return socket.emit('chat_solicitado', { sessaoId: sessao.id });

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
        socket.emit('erro', { mensagem: err.erro || 'Erro ao solicitar chat' });
      }
    });

    // ── TÉCNICO convida para chat (fluxo inverso) ───────────────────
    socket.on('convidar_chat', async ({ chamadoId }) => {
      try {
        const { sessao, chamado, reaproveitada } = await abrirSolicitacao({ chamadoId, iniciadoPor: 'TECNICO' });

        if (reaproveitada) return socket.emit('chat_solicitado', { sessaoId: sessao.id });

        io.to(`usuario:${chamado.solicitanteId}`).emit('convite_chat', {
          sessaoId: sessao.id,
          chamadoId,
          chamadoTitulo: chamado.titulo,
          tecnico: { id: usuarioId, nome },
        });

        socket.emit('chat_solicitado', { sessaoId: sessao.id });
        console.log(`Convite de chat: ${nome} → ${chamado.solicitante.nome}`);
      } catch (err) {
        console.error('Erro em convidar_chat:', err);
        socket.emit('erro', { mensagem: err.erro || 'Erro ao convidar para chat' });
      }
    });

    // ── Aceita o chat (funciona pros dois lados — quem aceita é sempre quem NÃO iniciou) ──
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

        const destinatarioId = sessao.iniciadoPor === 'USUARIO' ? sessao.tecnicoId : sessao.usuarioId;
        if (destinatarioId !== usuarioId) return socket.emit('erro', { mensagem: 'Acesso negado' });

        await prisma.chatSessao.update({
          where: { id: sessaoId },
          data: { status: 'ATIVA' },
        });

        socket.join(`chat:${sessaoId}`);

        const outroLadoId = sessao.iniciadoPor === 'USUARIO' ? sessao.usuarioId : sessao.tecnicoId;
        const contatoAceitante = { id: usuarioId, nome };

        io.to(`usuario:${outroLadoId}`).emit('chat_aceito', {
          sessaoId,
          chamadoId: sessao.chamadoId,
          contato: contatoAceitante,
        });

        socket.emit('chat_iniciado', {
          sessaoId,
          chamadoId: sessao.chamadoId,
          contato: sessao.iniciadoPor === 'USUARIO' ? sessao.chamado.solicitante : sessao.chamado.tecnico,
        });

        console.log(`Chat aceito: ${nome} aceitou sessão ${sessaoId}`);
      } catch (err) {
        console.error('Erro em aceitar_chat:', err);
        socket.emit('erro', { mensagem: 'Erro ao aceitar chat' });
      }
    });

    // ── Recusa o chat (idem — funciona pros dois lados) ─────────────
    socket.on('recusar_chat', async ({ sessaoId }) => {
      try {
        const sessao = await prisma.chatSessao.findUnique({ where: { id: sessaoId } });

        if (!sessao) return socket.emit('erro', { mensagem: 'Sessão não encontrada' });

        const destinatarioId = sessao.iniciadoPor === 'USUARIO' ? sessao.tecnicoId : sessao.usuarioId;
        if (destinatarioId !== usuarioId) return socket.emit('erro', { mensagem: 'Acesso negado' });

        await prisma.chatSessao.update({
          where: { id: sessaoId },
          data: { status: 'ENCERRADA' },
        });

        const iniciadorId = sessao.iniciadoPor === 'USUARIO' ? sessao.usuarioId : sessao.tecnicoId;
        io.to(`usuario:${iniciadorId}`).emit('chat_recusado', { sessaoId, chamadoId: sessao.chamadoId });
        console.log(`Chat recusado: ${nome}`);
      } catch (err) {
        console.error('Erro em recusar_chat:', err);
        socket.emit('erro', { mensagem: 'Erro ao recusar chat' });
      }
    });

    // ── ENTRAR na sala do chat (ATIVA = conversa normal, ENCERRADA = histórico) ──
    socket.on('entrar_chat', async ({ sessaoId }) => {
      try {
        const sessao = await prisma.chatSessao.findUnique({ where: { id: sessaoId } });

        if (!sessao) return socket.emit('erro', { mensagem: 'Sessão não encontrada' });

        const temAcesso = sessao.usuarioId === usuarioId || sessao.tecnicoId === usuarioId;
        if (!temAcesso) return socket.emit('erro', { mensagem: 'Acesso negado' });

        if (sessao.status === 'PENDENTE') {
          return socket.emit('erro', { mensagem: 'Chat ainda não foi aceito' });
        }

        // ATIVA entra na room pra receber mensagens em tempo real; ENCERRADA é só leitura, não precisa da room
        if (sessao.status === 'ATIVA') socket.join(`chat:${sessaoId}`);

        const outroId = sessao.usuarioId === usuarioId ? sessao.tecnicoId : sessao.usuarioId;
        const salaOutro = io.sockets.adapter.rooms.get(`usuario:${outroId}`);
        const contatoOnline = !!salaOutro && salaOutro.size > 0;

        const mensagens = await prisma.mensagem.findMany({
          where: { sessaoId },
          orderBy: { criadoEm: 'asc' },
          include: { autor: { select: { id: true, nome: true, perfil: true } } },
        });

        socket.emit('historico_chat', {
          sessaoId,
          mensagens,
          somenteLeitura: sessao.status === 'ENCERRADA',
          encerradoPorResolucao: sessao.encerradoPorResolucao,
          contatoOnline,
        });
      } catch (err) {
        console.error('Erro em entrar_chat:', err);
        socket.emit('erro', { mensagem: 'Erro ao entrar no chat' });
      }
    });

    // ── ENVIAR mensagem ────────────────────────────────────────────
    socket.on('mensagem', async ({ sessaoId, texto }) => {
      if (!texto?.trim()) return;

      try {
        const sessao = await prisma.chatSessao.findUnique({ where: { id: sessaoId } });

        if (!sessao || sessao.status !== 'ATIVA') {
          return socket.emit('erro', { mensagem: 'Chat não está ativo' });
        }

        const temAcesso = sessao.usuarioId === usuarioId || sessao.tecnicoId === usuarioId;
        if (!temAcesso) return socket.emit('erro', { mensagem: 'Acesso negado' });

        const mensagem = await prisma.mensagem.create({
          data: { texto: texto.trim(), autorId: usuarioId, sessaoId },
          include: {
            autor: { select: { id: true, nome: true, perfil: true } },
            sessao: { select: { chamadoId: true } },
          },
        });

        io.to(`chat:${sessaoId}`).emit('nova_mensagem', { ...mensagem, chamadoId: mensagem.sessao.chamadoId });
      } catch (err) {
        console.error('Erro em mensagem:', err);
        socket.emit('erro', { mensagem: 'Erro ao enviar mensagem' });
      }
    });

    // ── ENCERRAR chat manualmente (técnico) ─────────────────────────
    socket.on('encerrar_chat', async ({ sessaoId }) => {
      try {
        const sessao = await prisma.chatSessao.findUnique({ where: { id: sessaoId } });

        if (!sessao) return socket.emit('erro', { mensagem: 'Sessão não encontrada' });
        if (sessao.tecnicoId !== usuarioId) return socket.emit('erro', { mensagem: 'Apenas o técnico pode encerrar' });

        await prisma.chatSessao.update({
          where: { id: sessaoId },
          data: { status: 'ENCERRADA' },
        });

        io.to(`chat:${sessaoId}`).emit('chat_encerrado', { sessaoId, chamadoId: sessao.chamadoId, encerradoPorResolucao: false });
        console.log(`Chat encerrado: ${nome}`);
      } catch (err) {
        console.error('Erro em encerrar_chat:', err);
        socket.emit('erro', { mensagem: 'Erro ao encerrar chat' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket desconectado: ${nome}`);
      io.emit('usuario_status', { usuarioId, online: false });
    });
  });
};
