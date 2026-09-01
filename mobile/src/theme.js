// Design tokens do Solv — extraídos do mockup oficial (fundo azul-marinho
// escuro, acentos em azul profundo, cards arredondados). Toda tela deve
// puxar cores/espaçamento daqui em vez de hex soltos por arquivo.

export const cores = {
  fundo: '#0a0c14',
  fundoAlt: '#0d0f18',
  card: '#151824',
  cardBorda: '#1e212c',
  divisor: '#1e212c',

  azul: '#2d6fff',
  azulClaro: '#5b8cff',
  azulSuave: '#2d6fff22',

  roxo: '#7c5cff',

  texto: '#ffffff',
  textoSecundario: '#9aa0ad',
  textoTerciario: '#5c6270',
  placeholder: '#5c6270',

  sucesso: '#22c55e',
  sucessoSuave: '#22c55e22',
  aviso: '#f59e0b',
  avisoSuave: '#f59e0b22',
  erro: '#ef4444',
  erroSuave: '#ef444422',
  info: '#8b5cf6',
  infoSuave: '#8b5cf622',
};

export const statusCor = {
  ABERTO: cores.azul,
  EM_ATENDIMENTO: cores.aviso,
  AGUARDANDO: cores.info,
  RESOLVIDO: cores.sucesso,
  FECHADO: cores.textoTerciario,
};

export const statusLabel = {
  ABERTO: 'Aberto',
  EM_ATENDIMENTO: 'Em atendimento',
  AGUARDANDO: 'Aguardando',
  RESOLVIDO: 'Resolvido',
  FECHADO: 'Fechado',
};

export const prioridadeCor = {
  BAIXA: cores.sucesso,
  MEDIA: cores.azul,
  ALTA: cores.aviso,
  CRITICA: cores.erro,
};

export const espaco = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const raio = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

export const fonte = {
  titulo: { fontSize: 24, fontWeight: '700', color: cores.texto },
  subtitulo: { fontSize: 15, fontWeight: '400', color: cores.textoSecundario },
  secao: { fontSize: 12, fontWeight: '700', color: cores.textoSecundario, letterSpacing: 0.6, textTransform: 'uppercase' },
  corpo: { fontSize: 15, fontWeight: '400', color: cores.texto },
  legenda: { fontSize: 12, fontWeight: '400', color: cores.textoTerciario },
};

// Estilos compartilhados de botão/input pra reuso entre telas
export const comum = {
  botaoPrimario: {
    backgroundColor: cores.azul,
    borderRadius: raio.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  botaoPrimarioTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
  input: {
    backgroundColor: cores.card,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: cores.texto,
    fontSize: 15,
  },
  card: {
    backgroundColor: cores.card,
    borderRadius: raio.lg,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    padding: espaco.lg,
  },
};
