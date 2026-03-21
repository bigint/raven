import { SUPPORTED_PROVIDERS } from "@raven/data";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const listAvailableProviders = () => async (c: AuthContext) => {
  return success(c, SUPPORTED_PROVIDERS);
};
