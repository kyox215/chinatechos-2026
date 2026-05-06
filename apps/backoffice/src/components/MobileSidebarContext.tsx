"use client";

import { createContext, useContext } from "react";

type MobileSidebarCtx = {
  mobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
};

export const MobileSidebarContext = createContext<MobileSidebarCtx | null>(null);

export function useMobileSidebar() {
  return useContext(MobileSidebarContext);
}
