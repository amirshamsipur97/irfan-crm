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
      className="ml-[6px] flex shrink-0 items-center gap-[4px] rounded-[10px] bg-[#00c875] px-[7px] py-[1px] font-sans text-[10.5px] font-medium leading-[15px] text-white"
    >
      <svg width="9" height="9" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path
          d="M2.6 7.4l3 3L11.4 4"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Deal done
    </span>
  );
}
