import { mappingService as localMappingService } from './mappingService';
import { loadContasBancarias, saveContasBancarias, loadClassificacoes, saveClassificacoes } from './supabaseMappingService';
import { supabase } from './supabaseClient';
import { ContaBancariaMapping, ClassificacaoMapping } from '../types/Mapping';

class HybridMappingService {
  private async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }

  // Contas Bancárias
  async getContasBancarias(): Promise<ContaBancariaMapping[]> {
    if (await this.isAuthenticated()) {
      return await loadContasBancarias();
    }
    return localMappingService.getContasBancarias();
  }

  async addContaBancaria(conta: Omit<ContaBancariaMapping, 'id'>): Promise<void> {
    if (await this.isAuthenticated()) {
      const contas = await loadContasBancarias();
      contas.push(conta as ContaBancariaMapping);
      await saveContasBancarias(contas);
    } else {
      localMappingService.addContaBancaria(conta);
    }
  }

  async updateContaBancaria(id: string, conta: Partial<ContaBancariaMapping>): Promise<void> {
    if (await this.isAuthenticated()) {
      const contas = await loadContasBancarias();
      const index = contas.findIndex((c: any) => c.numeroConta === id);
      if (index !== -1) {
        contas[index] = { ...contas[index], ...conta };
        await saveContasBancarias(contas);
      }
    } else {
      localMappingService.updateContaBancaria(id, conta);
    }
  }

  async deleteContaBancaria(id: string): Promise<void> {
    if (await this.isAuthenticated()) {
      const contas = await loadContasBancarias();
      const filtered = contas.filter((c: any) => c.numeroConta !== id);
      await saveContasBancarias(filtered);
    } else {
      localMappingService.deleteContaBancaria(id);
    }
  }

  // Classificações
  async getClassificacoes(): Promise<ClassificacaoMapping[]> {
    if (await this.isAuthenticated()) {
      return await loadClassificacoes();
    }
    return localMappingService.getClassificacoes();
  }

  async addClassificacao(classificacao: Omit<ClassificacaoMapping, 'id'>): Promise<void> {
    if (await this.isAuthenticated()) {
      const classificacoes = await loadClassificacoes();
      classificacoes.push(classificacao as ClassificacaoMapping);
      await saveClassificacoes(classificacoes);
    } else {
      localMappingService.addClassificacao(classificacao);
    }
  }

  async updateClassificacao(id: string, classificacao: Partial<ClassificacaoMapping>): Promise<void> {
    if (await this.isAuthenticated()) {
      const classificacoes = await loadClassificacoes();
      const index = classificacoes.findIndex((c: any) => c.classificacaoFinanceira === id);
      if (index !== -1) {
        classificacoes[index] = { ...classificacoes[index], ...classificacao };
        await saveClassificacoes(classificacoes);
      }
    } else {
      localMappingService.updateClassificacao(id, classificacao);
    }
  }

  async deleteClassificacao(id: string): Promise<void> {
    if (await this.isAuthenticated()) {
      const classificacoes = await loadClassificacoes();
      const filtered = classificacoes.filter((c: any) => c.classificacaoFinanceira !== id);
      await saveClassificacoes(filtered);
    } else {
      localMappingService.deleteClassificacao(id);
    }
  }

  // Plano de Contas (mantém localStorage por enquanto)
  getPlanoContas() {
    return localMappingService.getPlanoContas();
  }

  addPlanoContasItem(item: any) {
    return localMappingService.addPlanoContasItem(item);
  }

  updatePlanoContasItem(id: string, item: any) {
    return localMappingService.updatePlanoContasItem(id, item);
  }

  deletePlanoContasItem(id: string) {
    return localMappingService.deletePlanoContasItem(id);
  }

  // Export/Import
  async exportMappings(): Promise<string> {
    if (await this.isAuthenticated()) {
      const contas = await loadContasBancarias();
      const classificacoes = await loadClassificacoes();
      const planoContas = localMappingService.getPlanoContas();
      return JSON.stringify({ contas, classificacoes, planoContas }, null, 2);
    }
    return localMappingService.exportMappings();
  }

  async importMappings(data: string): Promise<void> {
    const parsed = JSON.parse(data);
    if (await this.isAuthenticated()) {
      if (parsed.contas || parsed.contasBancarias) {
        await saveContasBancarias(parsed.contas || parsed.contasBancarias);
      }
      if (parsed.classificacoes) {
        await saveClassificacoes(parsed.classificacoes);
      }
      if (parsed.planoContas) {
        // Plano de contas ainda usa localStorage
        localMappingService.importMappings(JSON.stringify({ planoContas: parsed.planoContas }));
      }
    } else {
      localMappingService.importMappings(data);
    }
  }
}

export const hybridMappingService = new HybridMappingService();
