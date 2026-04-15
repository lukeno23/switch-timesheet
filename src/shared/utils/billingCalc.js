export const calcEffectiveRate = (hoursWorked, eurEquivalent) => {
  if (!hoursWorked || hoursWorked === 0 || !eurEquivalent) return null;
  return eurEquivalent / hoursWorked;
};

export const calcOverUnderIndicator = (effectiveRate, targetRate) => {
  if (!effectiveRate || !targetRate) return null;
  const delta = ((effectiveRate - targetRate) / targetRate) * 100;
  if (Math.abs(delta) <= 5) return { status: 'on-target', delta: 0, label: 'on target' };
  if (delta > 0) return { status: 'under-serviced', delta: Math.round(delta), label: `+${Math.round(delta)}% vs target` };
  return { status: 'over-serviced', delta: Math.round(delta), label: `${Math.round(delta)}% vs target` };
};

export const formatCurrency = (amount, currency = 'EUR') => {
  if (amount == null) return '--';
  const symbol = currency === 'USD' ? '$' : '\u20AC';
  return `${symbol}${Number(amount).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatRawAmount = (amount, currency, fxRate, eurEquivalent) => {
  if (currency === 'EUR') return null; // No raw display needed for EUR
  return `$${Number(amount).toLocaleString('en', { minimumFractionDigits: 0 })} USD @ ${fxRate} = \u20AC${Number(eurEquivalent).toLocaleString('en', { minimumFractionDigits: 0 })}`;
};
