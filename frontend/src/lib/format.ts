/** Format an ISO date/datetime string for display (e.g. 03 Oct 2026). */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Format an enquiry number as a reference, e.g. 7 -> ENQ-0007 (never truncates). */
export function formatEnquiryRef(n: number): string {
  return `ENQ-${String(n).padStart(4, '0')}`;
}

/** Format a global (database-wide) enquiry id for the admin view, e.g. 7 -> G-ENQ-0007. */
export function formatGlobalEnquiryRef(id: number): string {
  return `G-${formatEnquiryRef(id)}`;
}
