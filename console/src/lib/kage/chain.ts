export const BOT_TESTNET = {
  chainId: 968,
  chainIdHex: "0x3c8",
  name: "BOT Chain Testnet",
  rpc: "https://rpc.bohr.life",
  explorer: "https://scan.bohr.life",
  symbol: "BOT",
} as const;

export const GAS_ADDRESS = "0x6f2fca583D3aFB8d76f82E692Bfa3F5B04222b57";

export const DEPLOY_ROLES = [
  { name: "Owner, admin, and signer", detail: "The wallet you connect here" },
  { name: "Gas payer", detail: GAS_ADDRESS },
  { name: "KAGE token", detail: "Not deployed" },
  { name: "Vouch, market, rewards", detail: "Not deployed" },
  { name: "Registry and pause switch", detail: "Transfer to your wallet in the same deploy" },
] as const;

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatBot(wei: bigint) {
  const base = 10n ** 18n;
  const whole = wei / base;
  const frac = (wei % base).toString().padStart(18, "0").slice(0, 4);
  return `${whole.toLocaleString()}.${frac}`;
}

export function parseBot(amount: string) {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  if (whole.length > 12) return null;
  const padded = `${frac}${"0".repeat(18)}`.slice(0, 18);
  return BigInt(whole) * 10n ** 18n + BigInt(padded);
}

export function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}
