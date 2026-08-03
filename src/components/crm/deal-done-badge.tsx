/**
 * The one "this deal is DONE" marker, shown on every board a completed
 * client appears on — the lead, the contact, the offer. Driven by
 * crm_deals.downpayment_completed_at (stamped by trigger the moment the
 * part payments cover the downpayment, cleared if they drop below it).
 */
export function DealDoneBadge({
  title = "Downpayment complete — deal done",
}: {
  title?: string;
}) {
  return (
    <span
      title={title}
      className="ml-[6px] flex shrink-0 items-center gap-[4px] rounded-full border border-[#a9e8cd] bg-[#e6f7ef] py-px pl-[3px] pr-[8px] font-sans text-[10.5px] font-semibold leading-[15px] text-[#00784a]"
    >
      {/* rosette seal + check — a "certified" mark rather than a plain tick */}
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 0l1.8 1.4 2.2-.3 1 2 2.1.8-.3 2.2L16 8l-1.2 1.9.3 2.2-2.1.8-1 2-2.2-.3L8 16l-1.8-1.4-2.2.3-1-2-2.1-.8.3-2.2L0 8l1.2-1.9-.3-2.2 2.1-.8 1-2 2.2.3L8 0z"
          fill="#00c875"
        />
        <path
          d="M5.2 8.2l2 2 3.6-4.2"
          stroke="#fff"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Deal done
    </span>
  );
}
