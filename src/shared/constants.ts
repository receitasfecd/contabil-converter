export const TRANSFER_HISTORICO_PATTERNS = [
  /transferência da conta/i,
  /transferência para conta/i,
  /transferencia da conta/i,
  /transferencia para conta/i,
];

export const TRANSFER_DOCUMENTO_PATTERNS = [
  /RESG AUTOMATIC/i,
  /RESGATE/i,
  /RESGATE POUPANCA/i,
  /INT RESGATE TRUST DI/i,
  /INT APLICACAO/i,
  /APLICAÇÃO/i,
  /APLICACAO/i,
  /APLICAÇAO/i,
];

export const DATE_FORMAT = 'dd/MM/yyyy';

export const CSV_HEADERS = [
  'Data',
  'Débito',
  'Crédito',
  'Centro de Custo',
  'Histórico',
  'Valor',
];
