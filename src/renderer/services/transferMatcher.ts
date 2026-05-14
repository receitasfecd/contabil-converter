import { Transfer, TransferPair } from '../types/Transfer';

export function matchTransfers(pending: Transfer[]): TransferPair[] {
  const pairs: TransferPair[] = [];
  const matched = new Set<string>();

  console.log('🔍 matchTransfers - Iniciando pareamento:', {
    totalPending: pending.length,
    outCount: pending.filter(t => t.direction === 'OUT').length,
    inCount: pending.filter(t => t.direction === 'IN').length
  });

  // Separar por direção
  const outTransfers = pending.filter(t => t.direction === 'OUT');
  const inTransfers = pending.filter(t => t.direction === 'IN');

  // Para cada transferência de saída, buscar entrada correspondente
  for (const out of outTransfers) {
    if (matched.has(out.id)) continue;

    // Buscar transferências de entrada com mesma data e valor
    const candidates = inTransfers.filter(inTransfer =>
      !matched.has(inTransfer.id) &&
      inTransfer.date === out.date &&
      inTransfer.amount === out.amount
    );

    if (candidates.length === 0) continue;

    // Calcular score de similaridade para cada candidato
    const scored = candidates.map(candidate => ({
      transfer: candidate,
      score: calculateMatchScore(out, candidate)
    }));

    // Ordenar por score (maior primeiro)
    scored.sort((a, b) => b.score - a.score);

    // Parear com o melhor candidato se score >= 70
    const best = scored[0];
    if (best.score >= 70) {
      pairs.push({
        id: `pair-${out.id}-${best.transfer.id}`,
        outTransfer: out,
        inTransfer: best.transfer,
        matchScore: best.score,
        matchedAt: new Date(),
        exported: false
      });

      matched.add(out.id);
      matched.add(best.transfer.id);
    }
  }

  console.log('✅ matchTransfers - Pareamento concluído:', {
    pairsFound: pairs.length,
    remainingPending: pending.length - (pairs.length * 2)
  });

  return pairs;
}

function calculateMatchScore(out: Transfer, inTransfer: Transfer): number {
  let score = 0;

  // Data e valor já são iguais (pré-filtro), +30 pontos
  score += 30;

  // Referência cruzada de contas no histórico (+50 pontos) - MAIS IMPORTANTE
  const crossRef = checkCrossReference(out, inTransfer);
  if (crossRef) {
    score += 50;
  }

  // Similaridade de histórico (+20 pontos)
  const histScore = calculateHistoricoSimilarity(out.historico, inTransfer.historico);
  score += histScore * 20;

  return Math.min(score, 100);
}

function calculateHistoricoSimilarity(hist1: string, hist2: string): number {
  // Normalizar textos
  const normalize = (s: string) => s.toLowerCase()
    .replace(/transferência/gi, 'transf')
    .replace(/da conta|para conta/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const h1 = normalize(hist1);
  const h2 = normalize(hist2);

  // Calcular palavras em comum
  const words1 = new Set(h1.split(' '));
  const words2 = new Set(h2.split(' '));

  const intersection = [...words1].filter(w => words2.has(w));
  const union = new Set([...words1, ...words2]);

  return intersection.length / union.size;
}

function extractAccountFromHistorico(historico: string): string | null {
  // Extrair conta entre colchetes, ex: [10789-1 A] ou [10789-1 APLI C]
  const match = historico.match(/\[([^\]]+)\]/);
  if (match) {
    // Pegar apenas o número da conta (antes do espaço)
    const fullAccount = match[1].trim();
    // Remover sufixos como "A", "A2", "A3", "APLI C", etc.
    const accountNumber = fullAccount.split(/\s+/)[0];
    return accountNumber;
  }
  return null;
}

function checkCrossReference(out: Transfer, inTransfer: Transfer): boolean {
  // Extrair conta mencionada no histórico de OUT
  const outMentionedAccount = extractAccountFromHistorico(out.historico);

  // Extrair conta mencionada no histórico de IN
  const inMentionedAccount = extractAccountFromHistorico(inTransfer.historico);

  // Verificar se OUT menciona a conta de IN
  const outMentionsIn = outMentionedAccount === inTransfer.accountNumber;

  // Verificar se IN menciona a conta de OUT
  const inMentionsOut = inMentionedAccount === out.accountNumber;

  // Também verificar se ambos mencionam a mesma conta (aplicação)
  const bothMentionSame = outMentionedAccount && inMentionedAccount &&
                          outMentionedAccount === inMentionedAccount;

  return outMentionsIn || inMentionsOut || bothMentionSame;
}
