import { TaxaAdministracaoConfig, DEFAULT_TAXA_CONFIG } from '../types/TaxaAdministracaoConfig';

const STORAGE_KEY = 'taxa-administracao-config';

export function loadTaxaConfig(): TaxaAdministracaoConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Erro ao carregar configuração de taxas:', error);
  }

  return DEFAULT_TAXA_CONFIG;
}

export function saveTaxaConfig(config: TaxaAdministracaoConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Erro ao salvar configuração de taxas:', error);
  }
}

export function resetTaxaConfig(): void {
  saveTaxaConfig(DEFAULT_TAXA_CONFIG);
}
