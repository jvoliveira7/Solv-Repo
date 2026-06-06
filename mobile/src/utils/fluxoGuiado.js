// Árvore de decisão do Modo Guiado
// Cada nó tem: id, pergunta, opções
// Cada opção tem: label, proximoId (ou resultado final)

export const FLUXO_GUIADO = {
  inicio: {
    id: 'inicio',
    pergunta: 'Qual é o seu problema hoje?',
    opcoes: [
      { label: '💻 Computador', proximoId: 'computador' },
      { label: '🖨️ Impressora', proximoId: 'impressora' },
      { label: '🌐 Internet / Rede', proximoId: 'rede' },
      { label: '🔑 Acesso / Senha', proximoId: 'acesso' },
      { label: '📁 Arquivos / Sistema', proximoId: 'arquivos' },
      { label: '📞 Outro problema', proximoId: 'outro' },
    ],
  },

  // === COMPUTADOR ===
  computador: {
    id: 'computador',
    pergunta: 'O que está acontecendo com o computador?',
    opcoes: [
      { label: '⚡ Não liga', proximoId: 'computador_nao_liga' },
      { label: '🐢 Está lento ou travando', proximoId: 'computador_lento' },
      { label: '💀 Tela azul ou erro grave', proximoId: 'computador_erro' },
      { label: '🖥️ Monitor sem imagem', proximoId: 'computador_monitor' },
      { label: '⌨️ Teclado ou mouse não funciona', proximoId: 'computador_periferico' },
    ],
  },
  computador_nao_liga: {
    resultado: {
      titulo: 'Computador não liga',
      descricao: 'O computador não está ligando. Já foi verificado cabo de energia e tomada.',
      categoria: 'HARDWARE',
      prioridade: 'ALTA',
    },
  },
  computador_lento: {
    resultado: {
      titulo: 'Computador lento ou travando',
      descricao: 'O computador está com desempenho muito baixo, travando durante o uso.',
      categoria: 'SOFTWARE',
      prioridade: 'MEDIA',
    },
  },
  computador_erro: {
    resultado: {
      titulo: 'Tela azul ou erro crítico',
      descricao: 'O computador apresenta tela azul ou erro grave impedindo o uso.',
      categoria: 'SOFTWARE',
      prioridade: 'ALTA',
    },
  },
  computador_monitor: {
    resultado: {
      titulo: 'Monitor sem imagem',
      descricao: 'O monitor não exibe imagem. O computador parece ligar normalmente.',
      categoria: 'HARDWARE',
      prioridade: 'ALTA',
    },
  },
  computador_periferico: {
    resultado: {
      titulo: 'Teclado ou mouse não funciona',
      descricao: 'O teclado ou mouse não está respondendo ao uso.',
      categoria: 'HARDWARE',
      prioridade: 'MEDIA',
    },
  },

  // === IMPRESSORA ===
  impressora: {
    id: 'impressora',
    pergunta: 'Qual é o problema com a impressora?',
    opcoes: [
      { label: '🔴 Não imprime nada', proximoId: 'impressora_nao_imprime' },
      { label: '📄 Papel preso', proximoId: 'impressora_papel' },
      { label: '🎨 Impressão com qualidade ruim', proximoId: 'impressora_qualidade' },
      { label: '⚡ Não liga', proximoId: 'impressora_nao_liga' },
      { label: '📡 Computador não encontra a impressora', proximoId: 'impressora_conexao' },
    ],
  },
  impressora_nao_imprime: {
    resultado: {
      titulo: 'Impressora não imprime',
      descricao: 'A impressora está ligada mas não realiza a impressão dos documentos.',
      categoria: 'IMPRESSORA',
      prioridade: 'ALTA',
    },
  },
  impressora_papel: {
    resultado: {
      titulo: 'Papel preso na impressora',
      descricao: 'Há papel preso na impressora impedindo o funcionamento.',
      categoria: 'IMPRESSORA',
      prioridade: 'MEDIA',
    },
  },
  impressora_qualidade: {
    resultado: {
      titulo: 'Impressão com qualidade ruim',
      descricao: 'A impressora está funcionando mas com qualidade de impressão ruim (manchas, falhas ou cores erradas).',
      categoria: 'IMPRESSORA',
      prioridade: 'BAIXA',
    },
  },
  impressora_nao_liga: {
    resultado: {
      titulo: 'Impressora não liga',
      descricao: 'A impressora não está ligando.',
      categoria: 'IMPRESSORA',
      prioridade: 'ALTA',
    },
  },
  impressora_conexao: {
    resultado: {
      titulo: 'Computador não encontra a impressora',
      descricao: 'O computador não reconhece ou não encontra a impressora na rede.',
      categoria: 'IMPRESSORA',
      prioridade: 'MEDIA',
    },
  },

  // === REDE ===
  rede: {
    id: 'rede',
    pergunta: 'Qual é o problema com a internet ou rede?',
    opcoes: [
      { label: '🚫 Sem acesso à internet', proximoId: 'rede_sem_acesso' },
      { label: '🐌 Internet muito lenta', proximoId: 'rede_lenta' },
      { label: '📁 Não acessa pasta de rede', proximoId: 'rede_pasta' },
      { label: '🖨️ Não acessa impressora de rede', proximoId: 'rede_impressora' },
    ],
  },
  rede_sem_acesso: {
    resultado: {
      titulo: 'Sem acesso à internet',
      descricao: 'O computador não está conseguindo acessar a internet.',
      categoria: 'REDE',
      prioridade: 'ALTA',
    },
  },
  rede_lenta: {
    resultado: {
      titulo: 'Internet muito lenta',
      descricao: 'A conexão com a internet está funcionando, porém com velocidade muito baixa.',
      categoria: 'REDE',
      prioridade: 'MEDIA',
    },
  },
  rede_pasta: {
    resultado: {
      titulo: 'Sem acesso à pasta de rede',
      descricao: 'Não está sendo possível acessar a pasta compartilhada na rede.',
      categoria: 'REDE',
      prioridade: 'ALTA',
    },
  },
  rede_impressora: {
    resultado: {
      titulo: 'Sem acesso à impressora de rede',
      descricao: 'Não está sendo possível imprimir na impressora compartilhada em rede.',
      categoria: 'REDE',
      prioridade: 'MEDIA',
    },
  },

  // === ACESSO / SENHA ===
  acesso: {
    id: 'acesso',
    pergunta: 'Qual é o problema de acesso?',
    opcoes: [
      { label: '🔐 Senha expirada ou bloqueada', proximoId: 'acesso_senha' },
      { label: '🚫 Sem permissão para acessar sistema', proximoId: 'acesso_permissao' },
      { label: '👤 Preciso de novo acesso ao sistema', proximoId: 'acesso_novo' },
    ],
  },
  acesso_senha: {
    resultado: {
      titulo: 'Senha expirada ou bloqueada',
      descricao: 'A senha de acesso expirou ou a conta foi bloqueada.',
      categoria: 'ACESSO',
      prioridade: 'ALTA',
    },
  },
  acesso_permissao: {
    resultado: {
      titulo: 'Sem permissão para acessar sistema',
      descricao: 'Não está sendo possível acessar um sistema ou recurso por falta de permissão.',
      categoria: 'ACESSO',
      prioridade: 'MEDIA',
    },
  },
  acesso_novo: {
    resultado: {
      titulo: 'Solicitação de novo acesso',
      descricao: 'Preciso de acesso a um sistema ou recurso ainda não liberado.',
      categoria: 'ACESSO',
      prioridade: 'MEDIA',
    },
  },

  // === ARQUIVOS / SISTEMA ===
  arquivos: {
    id: 'arquivos',
    pergunta: 'Qual é o problema com arquivos ou sistema?',
    opcoes: [
      { label: '📁 Arquivo deletado ou perdido', proximoId: 'arquivos_perdido' },
      { label: '🔒 Arquivo bloqueado ou corrompido', proximoId: 'arquivos_corrompido' },
      { label: '💾 Sistema não abre ou trava', proximoId: 'arquivos_sistema' },
    ],
  },
  arquivos_perdido: {
    resultado: {
      titulo: 'Arquivo deletado ou perdido',
      descricao: 'Um arquivo importante foi deletado ou não está mais sendo encontrado.',
      categoria: 'SOFTWARE',
      prioridade: 'ALTA',
    },
  },
  arquivos_corrompido: {
    resultado: {
      titulo: 'Arquivo bloqueado ou corrompido',
      descricao: 'Um arquivo está corrompido ou bloqueado e não pode ser aberto.',
      categoria: 'SOFTWARE',
      prioridade: 'MEDIA',
    },
  },
  arquivos_sistema: {
    resultado: {
      titulo: 'Sistema não abre ou trava',
      descricao: 'Um sistema ou programa não está abrindo ou trava durante o uso.',
      categoria: 'SOFTWARE',
      prioridade: 'MEDIA',
    },
  },

  // === OUTRO ===
  outro: {
    resultado: {
      titulo: 'Outro problema de TI',
      descricao: 'Problema não categorizado. A equipe de TI entrará em contato para mais detalhes.',
      categoria: 'OUTRO',
      prioridade: 'MEDIA',
    },
  },
};
