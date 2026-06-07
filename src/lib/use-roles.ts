import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "expert" | "pm";

export function useRoles() {
  const [roles, setRoles] = useState<AppRole[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (active) setRoles([]);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      if (active) setRoles(((data ?? []).map((r) => r.role)) as AppRole[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  return roles;
}
