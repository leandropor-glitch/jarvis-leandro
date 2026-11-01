/* Dados da prévia (?demo): nomes reais da central Vinci da casa do Leandro (painel felyx_painel, 01/11/2026).
   Só nomes e tipos; nenhum comando sai daqui e nenhum estado é inventado. */
if (/[?&]demo/.test(location.search)) window.VINCI_DEMO = {
  cenas: ['Boa Noite', 'Cama', 'Closet', 'Mesa', 'Porta', 'Cozinha', 'Bancada', 'Sanca', 'Luminárias', 'Luz Alta', 'Luz Baixa',
    'Persianas', 'CortDir', 'Música', 'Globo', 'Apple TV', 'PlayStation', 'TV Sala', 'TV Suíte', 'Mudo', 'MudoSM', 'Vol Z1', 'Vol SM',
    'AC Suíte', 'AC Felipe', 'Estante Felipe', 'Master OFF', 'OFF_Sala', 'PW Z1', 'PW Z2', 'PW Net', 'CH', '3wBM', 'ONAutACSala', 'OffautACSala'],
  aparelhos: [
    { nome: 'Lustre', tipo: 'SWITCH' }, { nome: 'Indireta', tipo: 'SWITCH' }, { nome: 'Sala', tipo: 'SWITCH' }, { nome: 'Varanda', tipo: 'LIGHT' },
    { nome: 'Estante', tipo: 'LIGHT' }, { nome: 'Muxarabi', tipo: 'LIGHT' }, { nome: 'Painel', tipo: 'LIGHT' }, { nome: 'Abajur', tipo: 'SMARTPLUG' },
    { nome: 'Luminária Varanda', tipo: 'SMARTPLUG' }, { nome: 'Corredor', tipo: 'SWITCH' }, { nome: 'Entrada', tipo: 'SWITCH' }, { nome: 'Lavabo', tipo: 'SWITCH' },
    { nome: 'Café', tipo: 'SWITCH' }, { nome: 'Nespresso', tipo: 'SMARTPLUG' }, { nome: 'Fita Pia', tipo: 'LIGHT' }, { nome: 'Área Serviço', tipo: 'SWITCH' },
    { nome: 'Suíte', tipo: 'SWITCH' }, { nome: 'Casal Cama', tipo: 'SWITCH' }, { nome: 'Banho Master', tipo: 'SWITCH' }, { nome: 'Cab Leandro', tipo: 'SWITCH' },
    { nome: 'Cab Joana', tipo: 'SWITCH' }, { nome: 'Ventilador', tipo: 'SWITCH' }, { nome: 'Quarto do Felipe', tipo: 'SWITCH' }, { nome: 'Mesa do Felipe', tipo: 'SWITCH' },
    { nome: 'Ar da Sala', tipo: 'THERMOSTAT' }, { nome: 'Ar da Suíte', tipo: 'THERMOSTAT' }, { nome: 'Ar do Felipe', tipo: 'THERMOSTAT' },
    { nome: 'TV da Sala', tipo: 'OTHER' }, { nome: 'TV da Suíte', tipo: 'OTHER' }, { nome: 'TV do Felipe', tipo: 'OTHER' }
  ]
};
