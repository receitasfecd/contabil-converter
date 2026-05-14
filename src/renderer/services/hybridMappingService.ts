import { mappingService as localMappingService } from './mappingService';
import { loadContasBancarias, saveContasBancarias, loadClassificacoes, saveClassificacoes, loadPlanoContas, savePlanoContas } from './supabaseMappingService';
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
      const index = contas.findIndex((c: any) => c.id === id);
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
      const filtered = contas.filter((c: any) => c.id !== id);
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

  // Plano de Contas
  async getPlanoContas() {
    if (await this.isAuthenticated()) {
      return await loadPlanoContas();
    }
    return localMappingService.getPlanoContas();
  }

  async addPlanoContasItem(item: any) {
    if (await this.isAuthenticated()) {
      const planoContas = await loadPlanoContas();
      planoContas.push(item);
      await savePlanoContas(planoContas);
    } else {
      localMappingService.addPlanoContasItem(item);
    }
  }

  async updatePlanoContasItem(id: string, item: any) {
    if (await this.isAuthenticated()) {
      const planoContas = await loadPlanoContas();
      const index = planoContas.findIndex((p: any) => p.id === id);
      if (index !== -1) {
        planoContas[index] = { ...planoContas[index], ...item };
        await savePlanoContas(planoContas);
      }
    } else {
      localMappingService.updatePlanoContasItem(id, item);
    }
  }

  async deletePlanoContasItem(id: string) {
    if (await this.isAuthenticated()) {
      const planoContas = await loadPlanoContas();
      const filtered = planoContas.filter((p: any) => p.id !== id);
      await savePlanoContas(filtered);
    } else {
      localMappingService.deletePlanoContasItem(id);
    }
  }

  // Export/Import
  async exportMappings(): Promise<string> {
    if (await this.isAuthenticated()) {
      const contas = await loadContasBancarias();
      const classificacoes = await loadClassificacoes();
      const planoContas = await loadPlanoContas();
      return JSON.stringify({ contas, classificacoes, planoContas }, null, 2);
    }
    return localMappingService.exportMappings();
  }

  async importMappings(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data);
      if (await this.isAuthenticated()) {
        // Contas bancárias
        if (parsed.contas || parsed.contasBancarias) {
          const contas = (parsed.contas || parsed.contasBancarias).map((c: any) => ({
            banco: c.banco || 'BANCO DO BRASIL', // Default se não tiver
            numeroConta: c.numeroConta,
            codigoContabil: c.codigoContabil,
            tipoAplicacao: c.tipoAplicacao,
            descricao: c.descricao,
          }));
          console.log('Salvando contas bancárias:', contas.length);
          await saveContasBancarias(contas);
        }

        // Classificações
        if (parsed.classificacoes) {
          const classificacoes = parsed.classificacoes.map((c: any) => ({
            classificacaoFinanceira: c.classificacaoFinanceira,
            classificacaoContabil: c.classificacaoContabil,
            descricao: c.descricao,
          }));
          console.log('Salvando classificações:', classificacoes.length);
          await saveClassificacoes(classificacoes);
        }

        // Plano de contas
        if (parsed.planoContas) {
          const planoContas = parsed.planoContas.map((p: any) => ({
            codigo: p.codigo,
            descricao: p.descricao,
            tipo: p.tipo,
          }));
          console.log('Salvando plano de contas:', planoContas.length);
          await savePlanoContas(planoContas);
        }
      } else {
        localMappingService.importMappings(data);
      }
    } catch (error: any) {
      console.error('Erro detalhado na importação:', error);
      throw new Error(`Falha ao importar: ${error?.message || error}`);
    }
  }
}

export const hybridMappingService = new HybridMappingService();
