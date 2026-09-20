"use client";

import { useEffect, useState } from "react";
import { shortDate } from "@/components/crm/leads/board-config";
import { listNegotiations } from "@/app/(app)/crm/contacts/negotiation-actions";
import { negotiationSummary } from "./negotiation-config";
import type { CrmContactNegotiation } from "@/lib/types";

/**
 * The negotiation log in the side panel: every round with this client, oldest
 * first, on the same vertical trail the rest of the drawer uses. Read-only —
 * rounds are added and edited in the popup on the board, so there is one place
 * to write and one place to read.
 */
export function NegotiationLogSection({ contactId }: { contactId: string }) {
  const [rounds, setRounds] = useState<CrmContactNegotiation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const rows = await listNegotiations(contactId);
      if (!alive) return;
      setRounds(rows);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [contactId]);

  if (loading || rounds.length === 0) return null;

  const next = rounds[rounds.length - 1]?.next_at ?? null;

  return (
    <>
      <h4 className="m-0 flex items-baseline gap-[8px] pb-[8px] pt-[20px] font-display text-[14px] font-semibold leading-[20px] text-ink">
        Negotiation log
        <span className="font-sans text-[11.5px] font-normal tabular-nums text-ink-muted">
          {rounds.length} {rounds.length === 1 ? "round" : "rounds"}
        </span>
      </h4>

      {next && (
        <p className="m-0 mb-[10px] rounded-[6px] border border-[#0086c0]/40 bg-[#0086c0]/8 px-[10px] py-[7px] font-sans text-[12.5px] leading-[18px] text-ink">
          Next negotiation planned for <b>{shortDate(next)}</b>
        </p>
      )}

      <div>
        {rounds.map((round, i) => {
          const chips = negotiationSummary({
            negotiation_channel: round.channel,
            negotiation_resident: round.resident,
            negotiation_purpose: round.purpose,
            negotiation_purpose_other: round.purpose_other,
            negotiation_readiness: round.readiness,
            negotiation_has_offer: round.has_offer,
            negotiation_alt_project: round.alt_project,
          });
          return (
            <div key={round.id} className="relative flex gap-[10px]">
              <div className="relative flex w-[28px] shrink-0 justify-center">
                {i < rounds.length - 1 && (
                  <span className="absolute left-1/2 top-[14px] h-full w-px -translate-x-1/2 bg-line-strong" />
                )}
                <span
                  className="relative z-10 flex size-[28px] items-center justify-center rounded-[7px] bg-teal-deep font-sans text-[12px] tabular-nums text-white ring-4 ring-white"
                  aria-hidden
                >
                  {round.round}
                </span>
              </div>
              <div className="min-w-0 flex-1 pb-[14px]">
                <div className="flex items-baseline justify-between gap-[8px]">
                  <span className="min-w-0 truncate font-sans text-[12.5px] font-medium leading-[18px] text-ink">
                    {round.round === 1 ? "First negotiation" : `Negotiation ${round.round}`}
                  </span>
                  <span className="shrink-0 font-sans text-[11.5px] leading-[16px] text-ink-muted">
                    {round.negotiated_at ? shortDate(round.negotiated_at) : "no date"}
                  </span>
                </div>
                {chips.length > 0 && (
                  <div className="flex flex-wrap gap-[4px] pt-[4px]">
                    {chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-[10px] border border-line bg-canvas px-[7px] py-[1px] font-sans text-[11.5px] leading-[16px] text-ink"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
                {round.note && (
                  <p className="m-0 whitespace-pre-wrap pt-[4px] font-sans text-[12.5px] leading-[18px] text-ink-muted">
                    {round.note}
                  </p>
                )}
                {round.next_at && (
                  <p className="m-0 pt-[3px] font-sans text-[11.5px] leading-[16px] text-ink-muted">
                    Next call agreed for {shortDate(round.next_at)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
