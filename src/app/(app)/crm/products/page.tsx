import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { recordBoardVisit } from "@/lib/visits";
import { ProductsBoard } from "@/components/crm/products/ProductsBoard";
import type { CrmProduct, CrmProductGroup, CrmUser } from "@/lib/types";

export default async function ProductsBoardPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient(), recordBoardVisit("products")]);

  const [{ data: groups }, { data: products }, { data: users }] = await Promise.all([
    supabase
      .from("crm_product_groups")
      .select("*")
      .order("position")
      .returns<CrmProductGroup[]>(),
    supabase.from("crm_products").select("*").order("created_at").returns<CrmProduct[]>(),
    supabase
      .from("crm_users")
      .select("*")
      .eq("is_active", true)
      .order("full_name")
      .returns<CrmUser[]>(),
  ]);

  return (
    <ProductsBoard
      profile={profile}
      groups={groups ?? []}
      products={products ?? []}
      users={users ?? []}
    />
  );
}
