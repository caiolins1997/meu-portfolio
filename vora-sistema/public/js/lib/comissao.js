// Regras financeiras (Módulo 2.2 e Etapa 9): honorários líquidos, repasse a parceiros, faixas de comissão
// (15% a 25%) e liberação conforme a forma de pagamento escolhida pelo cliente no Asaas.

export const FORMAS = {
  pix: 'PIX à vista', cartao: 'Cartão de crédito', debito: 'Cartão de débito', boleto: 'Boleto à vista',
  boleto_parcelado: 'Boleto parcelado', permuta: 'Permuta (mídia)',
};
const INTEGRAL = ['pix', 'cartao', 'debito'];
const mes = (d) => String(d || '').slice(0, 7);

export function liquidoVenda(v, parceiros = []) {
  if (v.forma === 'permuta') return { bruto: +v.valor || 0, taxa: 0, repasse: 0, liquido: 0 };
  const bruto = +v.valor || 0;
  const taxa = bruto * ((+v.taxaPlataforma || 0) / 100);
  const par = parceiros.find(p => p.id === v.parceiroId);
  const repasse = par ? (bruto - taxa) * ((+par.percentual || 0) / 100) : 0;
  return { bruto, taxa, repasse, liquido: bruto - taxa - repasse };
}

export function pctFaixa(valor, cfgC) {
  const f = (cfgC.faixas || []).find(x => x.ate === null || x.ate === '' || valor <= +x.ate);
  return f ? +f.pct : 15;
}

export function trimestre(m) {
  const [a, mm] = m.split('-').map(Number);
  const q = Math.floor((mm - 1) / 3);
  return [0, 1, 2].map(i => `${a}-${String(q * 3 + i + 1).padStart(2, '0')}`);
}

// Calcula a comissão de cada colaborador para o mês de referência `ref` (AAAA-MM).
export function comissoes(vendas, parceiros, cfgC, ref) {
  const porColab = {};
  const base = (colab, m) => vendas.filter(v => v.colaborador === colab && mes(v.data) === m && v.forma !== 'permuta')
    .reduce((s, v) => s + liquidoVenda(v, parceiros).liquido, 0);
  const pctDe = (colab, m) => {
    const tri = trimestre(m).reduce((s, x) => s + base(colab, x), 0);
    let p = pctFaixa(base(colab, m), cfgC);
    if (tri >= (+cfgC.metaTrimestral || Infinity)) p += +cfgC.bonusTrimestral || 0;
    return Math.min(p, +cfgC.tetoPct || 25);
  };
  const colabs = [...new Set(vendas.map(v => v.colaborador).filter(Boolean))];
  for (const c of colabs) {
    const vendido = base(c, ref);
    const pct = pctDe(c, ref);
    let liberada = 0, aLiberar = 0, gerada = 0;
    const detalhes = [];
    for (const v of vendas.filter(x => x.colaborador === c && x.forma !== 'permuta')) {
      const { liquido, bruto } = liquidoVenda(v, parceiros);
      const p = pctDe(c, mes(v.data)) / 100;
      const total = liquido * p;
      if (mes(v.data) === ref) gerada += total;
      if (INTEGRAL.includes(v.forma) || v.forma === 'boleto') {
        // PIX/cartão: liberada integralmente no fechamento do mês (após confirmação do pagamento)
        const pagas = (v.parcelas || []).length && (v.parcelas || []).every(x => x.pago);
        if (!pagas) { aLiberar += total; continue; }
        const ultimoPag = (v.parcelas || []).map(x => mes(x.dataPago)).sort().pop();
        const quando = [mes(v.data), ultimoPag].sort().pop();
        if (quando === ref) { liberada += total; detalhes.push({ v, valor: total, regra: 'integral no fechamento do mês' }); }
        else if (quando > ref) aLiberar += total;
      } else {
        const parcelas = v.parcelas || [];
        if (cfgC.regraBoleto === '50-50') {
          [0, 1].forEach(i => {
            const pc = parcelas[i];
            if (pc?.pago && mes(pc.dataPago) === ref) { liberada += total / 2; detalhes.push({ v, valor: total / 2, regra: i === 0 ? '50% na entrada' : '50% na 2ª parcela' }); }
            else if (!pc?.pago) aLiberar += total / 2;
          });
        } else {
          for (const pc of parcelas) {
            const share = bruto ? (+pc.valor / bruto) * total : 0;
            if (pc.pago && mes(pc.dataPago) === ref) { liberada += share; detalhes.push({ v, valor: share, regra: `parcela ${pc.n} liquidada` }); }
            else if (!pc.pago) aLiberar += share;
          }
        }
      }
    }
    const faixas = cfgC.faixas || [];
    const atual = faixas.findIndex(x => x.ate === null || x.ate === '' || vendido <= +x.ate);
    const prox = faixas[atual + 1];
    porColab[c] = { vendido, pct, gerada, liberada, aLiberar, detalhes, proxFaixa: prox ? { falta: +faixas[atual].ate - vendido + 0.01, pct: prox.pct } : null,
      trimestre: trimestre(ref).reduce((s, x) => s + base(c, x), 0) };
  }
  return porColab;
}

export function gerarParcelas(valor, n, primeiroVenc) {
  const parcelas = [];
  const total = Math.round(+valor * 100);
  const cada = Math.floor(total / n);
  const d0 = new Date(primeiroVenc || new Date());
  for (let i = 0; i < n; i++) {
    const d = new Date(d0); d.setMonth(d.getMonth() + i);
    parcelas.push({ n: i + 1, valor: (i === n - 1 ? total - cada * (n - 1) : cada) / 100, vencimento: d.toISOString().slice(0, 10), pago: false, dataPago: '' });
  }
  return parcelas;
}
