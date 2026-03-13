import { resolve } from "node:dns/promises";

export const verifyDomainOwnership = async (
  domain: string,
  expectedToken: string
): Promise<boolean> => {
  try {
    const records = await resolve(`_raven-verify.${domain}`, "TXT");
    const flat = records.flat();
    return flat.some((r) => r === `raven-verification=${expectedToken}`);
  } catch {
    return false;
  }
};
