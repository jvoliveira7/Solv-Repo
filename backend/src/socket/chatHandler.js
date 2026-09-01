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
      const chamado = await prisma.chamado.findUnique({
        where: { id: chamadoId },
        include: {
          solicitante: { select: { id: true, nome: true } },
          tecnico: { select: { id: true, nome: true } },
        },
      });

      if (!chamado) throw { erro: 'Chamado não encontrado' };

      // RN14: chat só é permitido com o chamado em "Em atendimento" — ou
      // seja, o técnico já precisa ter assumido o chamado antes de poder
      // abrir ou aceitar qualquer chat, dos dois lados.
      if (chamado.status !== 'EM_ATENDIMENTO' || !chamado.tecnicoId) {
        throw { erro: 'O chamado precisa estar "Em atendimento" para abrir o chat' };
      }

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

      // RN15/RN16: usuário SOLICITA (fica PENDENTE até o técnico aceitar);
      // técnico ABRE DIRETO (já nasce ATIVA, sem aprovação do usuário).
      const statusInicial = iniciadoPor === 'TECNICO' ? 'ATIVA' : 'PENDENTE';

      const sessao = await prisma.chatSessao.upsert({
        where: { chamadoId },
        update: {
          status: statusInicial,
          iniciadoPor,
          encerradoPorResolucao: false,
        },
        create: {
          chamadoId,
          usuarioId: chamado.solicitanteId,
          tecnicoId: chamado.tecnicoId,
          status: statusInicial,
          iniciadoPor,
        },
      });

      return { sessao, chamado, reaproveitada: false };
    }

    // ── USUÁRIO solicita chat ──────────────────────────────────────
    socket.on('solicitar_chat', async ({ chamadoId }) => {
      try {
        const { sessao, chamado, reaproveitada } = await abrirSolicitacao({ chamadoId, iniciadoPor: 'USUARIO' });

        if (reaproveitada) return socket.emit('chat_solicitado', { sessaoId: sessao.id, chamadoId, status: sessao.status, iniciadoPor: sessao.iniciadoPor });

        io.to(`usuario:${chamado.tecnicoId}`).emit('solicitacao_chat', {
          sessaoId: sessao.id,
          chamadoId,
          chamadoTitulo: chamado.titulo,
          solicitante: { id: usuarioId, nome },
        });

        socket.emit('chat_solicitado', { sessaoId: sessao.id, chamadoId, status: sessao.status, iniciadoPor: sessao.iniciadoPor });
        console.log(`Chat solicitado: ${nome} → ${chamado.tecnico.nome}`);
      } catch (err) {
        console.error('Erro em solicitar_chat:', err);
        socket.emit('erro', { mensagem: err.erro || 'Erro ao solicitar chat' });
      }
    });

    // ── TÉCNICO abre chat direto (RN16 — sem aprovação do usuário) ──
    socket.on('convidar_chat', async ({ chamadoId }) => {
      try {
        const { sessao, chamado } = await abrirSolicitacao({ chamadoId, iniciadoPor: 'TECNICO' });

        // Chat já nasce ATIVO: o técnico entra na sala e ambos são avisados
        socket.join(`chat:${sessao.id}`);

        // Avisa o usuário que o técnico abriu um chat (sessão já ativa)
        io.to(`usuario:${chamado.solicitanteId}`).emit('chat_aceito', {
          sessaoId: sessao.id,
          chamadoId,
          contato: { id: usuarioId, nome },
        });

        // Confirma pro próprio técnico que já pode abrir a conversa
        socket.emit('chat_iniciado', {
          sessaoId: sessao.id,
          chamadoId,
          contato: chamado.solicitante,
        });

        console.log(`Chat aberto direto pelo técnico: ${nome} → ${chamado.solicitante.nome}`);
      } catch (err) {
        console.error('Erro em convidar_chat:', err);
        socket.emit('erro', { mensagem: err.erro || 'Erro ao abrir chat' });
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
          include: {
            autor: { select: { id: true, nome: true, perfil: true } },
            respostaA: { select: { id: true, texto: true, autor: { select: { nome: true } } } },
          },
        });

        // Ao abrir um chat ATIVO, marca como lidas as mensagens do outro lado
        if (sessao.status === 'ATIVA') {
          const { count } = await prisma.mensagem.updateMany({
            where: { sessaoId, autorId: { not: usuarioId }, status: { not: 'LIDA' } },
            data: { status: 'LIDA' },
          });
          if (count > 0) {
            io.to(`chat:${sessaoId}`).emit('mensagens_lidas', { sessaoId, lidasPor: usuarioId });
          }
        }

        socket.emit('historico_chat', {
          sessaoId,
          mensagens,
          somenteLeitura: sessao.status === 'ENCERRADA',
          encerradoPorResolucao: sessao.encerradoPorResolucao,
          contatoOnline,
          iniciadoPor: sessao.iniciadoPor,
        });
      } catch (err) {
        console.error('Erro em entrar_chat:', err);
        socket.emit('erro', { mensagem: 'Erro ao entrar no chat' });
      }
    });

    // ── ENVIAR mensagem ────────────────────────────────────────────
    socket.on('mensagem', async ({ sessaoId, texto, respostaAId }) => {
      if (!texto?.trim()) return;

      try {
        const sessao = await prisma.chatSessao.findUnique({ where: { id: sessaoId } });

        if (!sessao || sessao.status !== 'ATIVA') {
          return socket.emit('erro', { mensagem: 'Chat não está ativo' });
        }

        const temAcesso = sessao.usuarioId === usuarioId || sessao.tecnicoId === usuarioId;
        if (!temAcesso) return socket.emit('erro', { mensagem: 'Acesso negado' });

        // ENTREGUE de cara se o outro lado já está com a sala aberta
        const room = io.sockets.adapter.rooms.get(`chat:${sessaoId}`);
        const outroJaPresente = !!room && [...room].some((sid) => io.sockets.sockets.get(sid)?.usuario?.id !== usuarioId);

        const mensagem = await prisma.mensagem.create({
          data: {
            texto: texto.trim(),
            autorId: usuarioId,
            sessaoId,
            respostaAId: respostaAId || undefined,
            status: outroJaPresente ? 'ENTREGUE' : 'ENVIADA',
          },
          include: {
            autor: { select: { id: true, nome: true, perfil: true } },
            sessao: { select: { chamadoId: true } },
            respostaA: {
              select: { id: true, texto: true, autor: { select: { nome: true } } },
            },
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
