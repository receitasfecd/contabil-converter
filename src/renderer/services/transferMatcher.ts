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

  console.log('🔍 Tentando parear:', {
    out: { date: out.date, amount: out.amount, account: out.accountNumber, historico: out.historico.substring(0, 80) },
    in: { date: inTransfer.date, amount: inTransfer.amount, account: inTransfer.accountNumber, historico: inTransfer.historico.substring(0, 80) }
  });

  // Data e valor já são iguais (pré-filtro), +30 pontos
  score += 30;

  // Referência cruzada de contas no histórico (+50 pontos) - MAIS IMPORTANTE
  const crossRef = checkCrossReference(out, inTransfer);
  if (crossRef) {
    score += 50;
    console.log('  ✅ Cross-reference encontrado! +50 pontos');
  } else {
    console.log('  ❌ Cross-reference não encontrado');
  }

  // Similaridade de histórico (+20 pontos)
  const histScore = calculateHistoricoSimilarity(out.historico, inTransfer.historico);
  score += histScore * 20;
  console.log(`  📝 Similaridade de histórico: ${(histScore * 100).toFixed(1)}% (+${(histScore * 20).toFixed(1)} pontos)`);

  console.log(`  📊 Score final: ${score} (mínimo necessário: 70)`);

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

  console.log('    🔎 Cross-reference check:', {
    outAccount: out.accountNumber,
    outMentions: outMentionedAccount,
    inAccount: inTransfer.accountNumber,
    inMentions: inMentionedAccount
  });

  // Verificar se OUT menciona a conta de IN
  const outMentionsIn = outMentionedAccount && (outMentionedAccount === inTransfer.accountNumber || outMentionedAccount === inTransfer.accountNumber.replace('-', ''));

  // Verificar se IN menciona a conta de OUT
  const inMentionsOut = inMentionedAccount && (inMentionedAccount === out.accountNumber || inMentionedAccount === out.accountNumber.replace('-', ''));

  // Também verificar se ambos mencionam a mesma conta (aplicação)
  const bothMentionSame = outMentionedAccount && inMentionedAccount &&
                          outMentionedAccount === inMentionedAccount;

  // Caso especial: Taxa de Administração (sempre vai para a conta 14300-4)
  const isTaxaOut = out.historico.toLowerCase().includes('taxa adm') || out.historico.toLowerCase().includes('tx adm');
  const isAccountAdm = inTransfer.accountNumber === '143004' || inTransfer.accountNumber === '14300-4';
  const isTaxaMatch = isTaxaOut && isAccountAdm;

  if (outMentionsIn) console.log('    ✓ OUT menciona IN');
  if (inMentionsOut) console.log('    ✓ IN menciona OUT');
  if (bothMentionSame) console.log('    ✓ Ambos mencionam mesma conta');
  if (isTaxaMatch) console.log('    ✓ Match de Taxa de Administração (OUT -> 14300-4)');

  return outMentionsIn || inMentionsOut || bothMentionSame || isTaxaMatch;
}
