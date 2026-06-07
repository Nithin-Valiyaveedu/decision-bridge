import { useEffect, useState } from "react";
import { getRole, subscribe, type AppRole } from "./local-auth";

export type { AppRole };

export function useRole(): AppRole | null {
  const [role, setRoleState] = useState<AppRole | null>(() => getRole());
  useEffect(() => {
    setRoleState(getRole());
    return subscribe(() => setRoleState(getRole()));
  }, []);
  return role;
}
