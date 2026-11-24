// Tags de especialidade do técnico. Os ids precisam ser os mesmos da API
// (backend/src/controllers/authController.js - ESPECIALIDADES).
export const ESPECIALIDADES = [
  { id: 'SUPORTE', label: 'Suporte técnico' },
  { id: 'REDES', label: 'Redes' },
  { id: 'IMPRESSORAS', label: 'Impressoras' },
  { id: 'HARDWARE', label: 'Hardware' },
  { id: 'SOFTWARE', label: 'Software' },
  { id: 'ACESSOS', label: 'Acessos e senhas' },
  { id: 'SERVIDORES', label: 'Servidores' },
  { id: 'SEGURANCA', label: 'Segurança' },
];

export const MAX_ESPECIALIDADES = 4;

export const ROTULO_ESPECIALIDADE = Object.fromEntries(ESPECIALIDADES.map((e) => [e.id, e.label]));
