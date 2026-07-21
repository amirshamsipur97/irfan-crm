// Row types for the CRM tables (public schema, crm_ prefix)

export type CrmRole = "developer" | "ceo" | "media" | "manager" | "agent" | "finance";
export type LeadPriority = "low" | "medium" | "high";
export type TaskStatus = "open" | "done" | "cancelled";
export type ActivityType =
  | "note"
  | "call"
  | "email"
  | "meeting"
  | "whatsapp"
  | "stage_change"
  | "system";

export interface CrmUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  title: string | null;
  role: CrmRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmInvite {
  id: string;
  email: string;
  full_name: string;
  role: CrmRole;
  invited_by: string | null;
  created_at: string;
  used_at: string | null;
}

export interface CrmPipeline {
  id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface CrmStage {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
}

export interface CrmLeadGroup {
  id: string;
  name: string;
  color: string;
  position: number;
  is_collapsed: boolean;
  created_at: string;
}

export interface CrmLead {
  id: string;
  name: string;
  phone: string | null;
  country_code: string | null;
  email: string | null;
  company: string | null;
  title: string | null;
  group_id: string | null;
  source: string;
  interest: string | null;
  budget: number | null;
  currency: string;
  pipeline_id: string;
  stage_id: string;
  owner_id: string | null;
  priority: LeadPriority;
  is_archived: boolean;
  next_followup_at: string | null;
  last_activity_at: string | null;
  website_lead_id: string | null;
  converted_contact_id: string | null;
  converted_at: string | null;
  assigned_at: string | null;
  first_response_at: string | null;
  lead_score: number | null;
  score_band: "hot" | "warm" | "cold" | null;
  score_components: { rule: string; points: number }[] | null;
  scored_at: string | null;
  custom: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmDealStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
}

export interface CrmDealGroup {
  id: string;
  name: string;
  color: string;
  position: number;
  is_collapsed: boolean;
  created_at: string;
}

export type ForecastCategory = "best_case" | "commit" | "pipeline";

export interface CrmDeal {
  id: string;
  name: string;
  group_id: string | null;
  stage_id: string;
  owner_id: string | null;
  deal_value: number | null;
  close_probability: number | null;
  expected_close_date: string | null;
  is_done: boolean;
  contact_name: string | null;
  account_name: string | null;
  forecast_category: ForecastCategory | null;
  last_interaction_at: string | null;
  lead_id: string | null;
  contact_id: string | null;
  account_id: string | null;
  currency: string;
  lost_reason: string | null;
  next_step: string | null;
  custom: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmContactGroup {
  id: string;
  name: string;
  color: string;
  position: number;
  is_collapsed: boolean;
  created_at: string;
}

export interface CrmContact {
  id: string;
  name: string;
  email: string | null;
  email_label: string | null;
  phone: string | null;
  country_code: string | null;
  title: string | null;
  contact_type: string | null;
  priority: "high" | "medium" | "low" | null;
  comments: string | null;
  account_name: string | null;
  account_id: string | null;
  group_id: string | null;
  last_interaction_at: string | null;
  custom: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmAccountGroup {
  id: string;
  name: string;
  color: string;
  position: number;
  is_collapsed: boolean;
  created_at: string;
}

export interface CrmAccount {
  id: string;
  name: string;
  domain: string | null;
  industries: string[];
  description: string | null;
  employees_range: string | null;
  hq_location: string | null;
  group_id: string | null;
  last_interaction_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmProjectGroup {
  id: string;
  name: string;
  color: string;
  position: number;
  is_collapsed: boolean;
  created_at: string;
}

export interface CrmProject {
  id: string;
  name: string;
  group_id: string | null;
  owner_id: string | null;
  status: string | null;
  priority: string | null;
  start_date: string | null;
  end_date: string | null;
  project_value: number | null;
  account_name: string | null;
  notes: string | null;
  last_interaction_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmProductGroup {
  id: string;
  name: string;
  color: string;
  position: number;
  is_collapsed: boolean;
  created_at: string;
}

export interface CrmProduct {
  id: string;
  name: string;
  group_id: string | null;
  owner_id: string | null;
  status: string | null;
  price: number | null;
  billing: string | null;
  sku: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmDevelopmentGroup {
  id: string;
  name: string;
  color: string;
  position: number;
  is_collapsed: boolean;
  created_at: string;
}

export interface CrmDevelopment {
  id: string;
  name: string;
  group_id: string | null;
  owner_id: string | null;
  developer_name: string | null;
  developer_account_id: string | null;
  status: string | null;
  location: string | null;
  completion_date: string | null;
  description: string | null;
  currency: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmUnitGroup {
  id: string;
  name: string;
  color: string;
  position: number;
  is_collapsed: boolean;
  created_at: string;
}

export interface CrmUnit {
  id: string;
  name: string;
  group_id: string | null;
  owner_id: string | null;
  development_name: string | null;
  development_id: string | null;
  unit_type: string | null;
  bedrooms: number | null;
  area_sqm: number | null;
  floor_label: string | null;
  price: number | null;
  currency: string;
  status: string;
  handover_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmViewingGroup {
  id: string;
  name: string;
  color: string;
  position: number;
  is_collapsed: boolean;
  created_at: string;
}

export interface CrmViewing {
  id: string;
  name: string;
  group_id: string | null;
  agent_id: string | null;
  contact_name: string | null;
  contact_id: string | null;
  unit_name: string | null;
  unit_id: string | null;
  deal_name: string | null;
  deal_id: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  status: string;
  feedback: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmPropertyInterest {
  id: string;
  lead_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  development_id: string | null;
  unit_id: string | null;
  interest_level: "hot" | "warm" | "cold";
  status: "active" | "shortlisted" | "rejected";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** joined for display */
  unit_name?: string | null;
  development_name?: string | null;
}

export interface CrmOffer {
  id: string;
  deal_id: string | null;
  contact_id: string | null;
  unit_id: string | null;
  amount: number | null;
  currency: string;
  status: string;
  submitted_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmReservation {
  id: string;
  deal_id: string | null;
  contact_id: string | null;
  unit_id: string;
  amount: number | null;
  currency: string;
  status: string;
  reserved_at: string;
  expires_at: string | null;
  cancellation_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** joined for display */
  unit_name?: string | null;
}

export interface CrmTransaction {
  id: string;
  reference: string;
  deal_id: string | null;
  transaction_type: string | null;
  buyer_contact_id: string | null;
  seller_account_id: string | null;
  development_id: string | null;
  unit_id: string | null;
  agreed_price: number | null;
  currency: string;
  contract_date: string | null;
  expected_completion_date: string | null;
  completed_at: string | null;
  status: string;
  cancellation_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmPayment {
  id: string;
  transaction_id: string | null;
  deal_id: string | null;
  payer_contact_id: string | null;
  amount: number;
  currency: string;
  payment_type: string | null;
  method: string | null;
  reference: string | null;
  status: string;
  payment_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmDealCommission {
  id: string;
  deal_id: string;
  transaction_id: string | null;
  agreement_id: string | null;
  gross_commission: number | null;
  adjustment: number;
  tax: number;
  net_commission: number | null;
  currency: string;
  expected_payment_date: string | null;
  received_amount: number;
  received_at: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmActivityGroup {
  id: string;
  name: string;
  color: string;
  position: number;
  is_collapsed: boolean;
  created_at: string;
}

export interface CrmActivityItem {
  id: string;
  name: string;
  group_id: string | null;
  owner_id: string | null;
  activity_type: string | null;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
  related_item: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmActivity {
  id: string;
  lead_id: string;
  user_id: string | null;
  type: ActivityType;
  content: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface CrmTask {
  id: string;
  lead_id: string | null;
  title: string;
  description: string;
  assigned_to: string | null;
  created_by: string | null;
  due_at: string | null;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
