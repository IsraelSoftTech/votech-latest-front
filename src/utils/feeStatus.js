/** Display helpers for API fee status values (Point 4D — do not recalculate in UI). */

export const FEE_STATUS_LABELS = {
  paid: 'Paid',
  partial: 'Partial',
  unpaid: 'Unpaid',
  overpaid: 'Overpaid',
  no_fees: 'No Fees',
};

export function normalizeFeeStatus(status) {
  if (!status) return 'unknown';
  return String(status).toLowerCase();
}

export function getFeeStatusLabel(status) {
  const key = normalizeFeeStatus(status);
  return FEE_STATUS_LABELS[key] || 'Unknown';
}

export function getFeeStatusColors(status) {
  switch (normalizeFeeStatus(status)) {
    case 'paid':
      return { background: '#2ecc71', color: '#fff' };
    case 'partial':
      return { background: '#ffc107', color: '#fff' };
    case 'unpaid':
      return { background: '#e53e3e', color: '#fff' };
    case 'overpaid':
      return { background: '#17a2b8', color: '#fff' };
    case 'no_fees':
      return { background: '#6c757d', color: '#fff' };
    default:
      return { background: '#6c757d', color: '#fff' };
  }
}

export function isFeeSettled(status) {
  const key = normalizeFeeStatus(status);
  return key === 'paid' || key === 'overpaid' || key === 'no_fees';
}

export function getFeeStatusFromSummary(summary) {
  return summary?.status || 'unknown';
}
