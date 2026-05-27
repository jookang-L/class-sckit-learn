import { create } from "zustand";

type ApiKeyStore = {
  apiKey: string | null;
  verified: boolean;
  setApiKey: (key: string) => void;
  setVerified: (v: boolean) => void;
  clear: () => void;
};

export const useApiKeyStore = create<ApiKeyStore>((set) => ({
  apiKey: null,
  verified: false,
  setApiKey: (key) => set({ apiKey: key }),
  setVerified: (v) => set({ verified: v }),
  clear: () => set({ apiKey: null, verified: false }),
}));
