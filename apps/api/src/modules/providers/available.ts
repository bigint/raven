import { SUPPORTED_PROVIDERS } from "@/lib/model-sync";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const listAvailableProviders = () => async (c: AppContext) => {
  return success(c, SUPPORTED_PROVIDERS);
};
