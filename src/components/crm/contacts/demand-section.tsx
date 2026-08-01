"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isTempId, STILL_SAVING_MESSAGE } from "@/components/crm/persist";
import { money } from "@/components/crm/deals/deals-config";
import type { CrmContact, CrmContactDocument } from "@/lib/types";
import {
  BEDROOM_OPTIONS,
  DOC_TYPES,
  MAX_DOC_BYTES,
  PROPERTY_TYPES,
  humanSize,
} from "./demand-config";
import {
  deleteDocument,
  documentUrl,
  listDocuments,
  registerDocument,
  updateDemand,
} from "@/app/(app)/crm/contacts/demand-actions";
import { createOfferForContact } from "@/app/(app)/crm/deals/actions";

const fieldCls =
  "h-[34px] w-full rounded-[4px] border border-line-strong bg-white px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep";
const labelCls = "block pb-[4px] font-sans text-[12px] leading-[16px] text-ink-muted";

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex h-[22px] items-center rounded-[12px] px-[10px] font-sans text-[12px] leading-[16px] text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

/**
 * The client's Demand: what they are looking for, plus their paperwork.
 * Shown on a contact, which is where a lead lands once it is converted.
 */
export function DemandSection({
  contact,
  canEdit,
  currency = "OMR",
  onToast,
}: {
  contact: CrmContact;
  canEdit: boolean;
  currency?: string;
  onToast?: (message: string, tone?: "success" | "alert") => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [demand, setDemand] = useState({
    property_type: contact.property_type ?? "",
    bedrooms: contact.bedrooms ?? "",
    budget: contact.budget?.toString() ?? "",
    preferred_area: contact.preferred_area ?? "",
    requirements: contact.requirements ?? "",
  });

  const [docs, setDocs] = useState<CrmContactDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("passport");
  const [offering, setOffering] = useState(false);

  useEffect(() => {
    if (isTempId(contact.id)) return;
    listDocuments(contact.id).then(setDocs);
  }, [contact.id]);

  const save = async () => {
    if (isTempId(contact.id)) {
      onToast?.(STILL_SAVING_MESSAGE, "alert");
      return;
    }
    setSaving(true);
    const result = await updateDemand(contact.id, {
      property_type: demand.property_type || null,
      bedrooms: demand.bedrooms || null,
      budget: demand.budget ? Number(demand.budget) : null,
      preferred_area: demand.preferred_area || null,
      requirements: demand.requirements || null,
    });
    setSaving(false);
    if (result.error) {
      onToast?.(result.error, "alert");
      return;
    }
    setEditing(false);
    onToast?.("Demand updated");
  };

  const upload = async (file: File) => {
    if (isTempId(contact.id)) {
      onToast?.(STILL_SAVING_MESSAGE, "alert");
      return;
    }
    if (file.size > MAX_DOC_BYTES) {
      onToast?.(`"${file.name}" is larger than 25 MB`, "alert");
      return;
    }
    setUploading(true);

    // straight to the private bucket; row-level security decides who may write
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${contact.id}/${crypto.randomUUID()}-${safe}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("crm-documents")
      .upload(path, file, { contentType: file.type || undefined });

    if (uploadError) {
      setUploading(false);
      onToast?.(uploadError.message, "alert");
      return;
    }

    const result = await registerDocument({
      contactId: contact.id,
      name: file.name,
      storagePath: path,
      mimeType: file.type || null,
      sizeBytes: file.size,
      docType,
    });
    setUploading(false);
    if (result.error || !result.document) {
      onToast?.(result.error ?? "could not save the document", "alert");
      return;
    }
    setDocs((prev) => [result.document as CrmContactDocument, ...prev]);
    onToast?.(`"${file.name}" uploaded`);
  };

  const open = async (doc: CrmContactDocument) => {
    const result = await documentUrl(doc.storage_path);
    if (result.error || !result.url) {
      onToast?.(result.error ?? "could not open the document", "alert");
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  };

  const remove = async (doc: CrmContactDocument) => {
    const prev = docs;
    setDocs((d) => d.filter((x) => x.id !== doc.id));
    const result = await deleteDocument(doc.id, doc.storage_path);
    if (result.error) {
      setDocs(prev);
      onToast?.(result.error, "alert");
    }
  };

  const typeChip = PROPERTY_TYPES.find((p) => p.key === contact.property_type);
  const bedChip = BEDROOM_OPTIONS.find((b) => b.key === contact.bedrooms);

  return (
    <>
      <div className="flex items-center justify-between pt-[20px]">
        <h4 className="m-0 font-display text-[14px] font-semibold leading-[20px] text-ink">
          Demand
        </h4>
        <span className="flex items-center gap-[6px]">
          {canEdit && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-[4px] border border-line-strong px-[8px] py-[2px] font-sans text-[12px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
            >
              Edit
            </button>
          )}
          {/* a client can hold several offers, so this always starts a new one */}
          <button
            type="button"
            disabled={offering || isTempId(contact.id)}
            onClick={async () => {
              setOffering(true);
              const result = await createOfferForContact(contact.name);
              setOffering(false);
              onToast?.(
                result.error ?? `Sales offer started for ${contact.name} — open Deals to price it`,
                result.error ? "alert" : "success"
              );
            }}
            className="rounded-[4px] bg-teal-deep px-[10px] py-[3px] font-sans text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {offering ? "Creating…" : "New sales offer"}
          </button>
        </span>
      </div>

      {!editing ? (
        <div className="pt-[8px]">
          {typeChip || bedChip || contact.budget ? (
            <div className="flex flex-wrap items-center gap-[6px] pb-[8px]">
              {typeChip && <Chip label={typeChip.label} color={typeChip.color} />}
              {bedChip && <Chip label={bedChip.label} color={bedChip.color} />}
              {contact.budget != null && (
                <span className="font-sans text-[13px] font-medium text-ink">
                  {money(contact.budget, currency)}
                </span>
              )}
            </div>
          ) : (
            <p className="m-0 pb-[8px] font-sans text-[13px] text-ink-muted">
              Nothing recorded yet — {canEdit ? "use Edit to add what the client wants." : "the owner can add it."}
            </p>
          )}
          {contact.preferred_area && (
            <p className="m-0 font-sans text-[13px] leading-[19px] text-ink">
              <span className="text-ink-muted">Area · </span>
              {contact.preferred_area}
            </p>
          )}
          {contact.requirements && (
            <p className="m-0 whitespace-pre-wrap pt-[4px] font-sans text-[13px] leading-[19px] text-ink">
              {contact.requirements}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-[10px] pt-[8px]">
          <div>
            <label className={labelCls} htmlFor="dm-type">
              Type of property
            </label>
            <select
              id="dm-type"
              className={fieldCls}
              value={demand.property_type}
              onChange={(e) => setDemand({ ...demand, property_type: e.target.value })}
            >
              <option value="">—</option>
              {PROPERTY_TYPES.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="dm-beds">
              Size
            </label>
            <select
              id="dm-beds"
              className={fieldCls}
              value={demand.bedrooms}
              onChange={(e) => setDemand({ ...demand, bedrooms: e.target.value })}
            >
              <option value="">—</option>
              {BEDROOM_OPTIONS.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="dm-budget">
              Budget ({currency})
            </label>
            <input
              id="dm-budget"
              type="number"
              min="0"
              step="1000"
              className={fieldCls}
              value={demand.budget}
              onChange={(e) => setDemand({ ...demand, budget: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="dm-area">
              Preferred area
            </label>
            <input
              id="dm-area"
              className={fieldCls}
              value={demand.preferred_area}
              onChange={(e) => setDemand({ ...demand, preferred_area: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls} htmlFor="dm-req">
              Requirements
            </label>
            <textarea
              id="dm-req"
              rows={3}
              className="w-full resize-none rounded-[4px] border border-line-strong bg-white px-[8px] py-[6px] font-sans text-[13px] leading-[19px] text-ink outline-none focus:border-teal-deep"
              value={demand.requirements}
              onChange={(e) => setDemand({ ...demand, requirements: e.target.value })}
            />
          </div>
          <div className="col-span-2 flex justify-end gap-[8px]">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-[30px] rounded-[4px] border border-line-strong px-[12px] font-sans text-[13px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="h-[30px] rounded-[4px] bg-teal-deep px-[14px] font-sans text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      <h4 className="m-0 pb-[8px] pt-[20px] font-display text-[14px] font-semibold leading-[20px] text-ink">
        Documents
      </h4>

      {canEdit && (
        <div className="flex items-center gap-[8px] pb-[10px]">
          <select
            aria-label="Document type"
            className="h-[30px] rounded-[4px] border border-line-strong bg-white px-[6px] font-sans text-[12px] text-ink outline-none focus:border-teal-deep"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            {DOC_TYPES.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
          <label className="flex h-[30px] cursor-pointer items-center rounded-[4px] border border-dashed border-line-strong px-[12px] font-sans text-[12px] text-ink transition-colors hover:bg-[var(--hover-ghost)]">
            {uploading ? "Uploading…" : "Upload file"}
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) upload(file);
              }}
            />
          </label>
        </div>
      )}

      {docs.length === 0 ? (
        <p className="m-0 font-sans text-[13px] text-ink-muted">
          No documents yet — passport, ID or signed paperwork goes here.
        </p>
      ) : (
        <ul className="m-0 list-none p-0">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-[8px] border-b border-line-soft py-[7px] last:border-b-0"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#676879" strokeWidth="1.3" aria-hidden>
                <path d="M9 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5L9 1.5z" />
                <path d="M9 1.5v4h4" />
              </svg>
              <button
                type="button"
                onClick={() => open(doc)}
                className="min-w-0 flex-1 truncate text-left font-sans text-[13px] text-[#0073ea] hover:underline"
                title={doc.name}
              >
                {doc.name}
              </button>
              {doc.doc_type && (
                <span className="shrink-0 font-sans text-[11px] text-ink-muted">
                  {DOC_TYPES.find((d) => d.key === doc.doc_type)?.label ?? doc.doc_type}
                </span>
              )}
              <span className="shrink-0 font-sans text-[11px] text-ink-muted">
                {humanSize(doc.size_bytes)}
              </span>
              {canEdit && (
                <button
                  type="button"
                  aria-label={`Remove ${doc.name}`}
                  onClick={() => remove(doc)}
                  className="shrink-0 rounded-[4px] px-[5px] py-[2px] font-sans text-[12px] text-alert transition-colors hover:bg-[#ffe9ec]"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
