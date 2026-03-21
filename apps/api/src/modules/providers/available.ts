import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

const SUPPORTED_PROVIDERS = [
  { name: "Anthropic", slug: "anthropic" },
  { name: "OpenAI", slug: "openai" }
];

export const listAvailableProviders = () => async (c: AuthContext) => {
  return success(c, SUPPORTED_PROVIDERS);
};
