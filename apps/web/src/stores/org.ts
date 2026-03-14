import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Org {
  id: string;
  name: string;
  slug: string;
  role: string;
  plan: string;
}

interface OrgState {
  activeOrg: Org | null;
  setActiveOrg: (org: Org | null) => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      activeOrg: null,
      setActiveOrg: (org) => set({ activeOrg: org })
    }),
    { name: "org" }
  )
);
