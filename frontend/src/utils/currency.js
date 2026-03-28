const currencyFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatCurrency(value) {
  return `$${currencyFormatter.format(Number(value || 0))}`;
}
