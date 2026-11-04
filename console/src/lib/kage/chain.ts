export const BOT_TESTNET = {
  chainId: 968,
  chainIdHex: "0x3c8",
  name: "BOT Chain Testnet",
  rpc: "https://rpc.bohr.life",
  explorer: "https://scan.bohr.life",
  symbol: "BOT",
} as const;

export const GAS_ADDRESS = "0x6f2fca583D3aFB8d76f82E692Bfa3F5B04222b57";
export const OWNER_ADDRESS = "0x0EbE98279Cfa8bF30a0B6ad5Af5829E801102b76";

export const CONTRACTS = [
  { name: "KAGE token", address: "0x64b60e9575bC0b09F802e55a15B18a5C86aE5cf7" },
  { name: "Vouch V2", address: "0xDC139924D5f948871Ae9f8050c3b8FA43D493fA2" },
  { name: "Market", address: "0x801FF0a5364E2c4E0cEF6202e6B0Da9698C09D8e" },
  { name: "Rewards", address: "0x7319FD13FACd97e0c3D70Bf53BDeF91c87Bc45fC" },
  { name: "Adaptive LMSR", address: "0x3D9Fe14da291F5034Cf7D2128A6e7d8E8F20980D" },
  { name: "Registry", address: "0x397b3A679612F60Dc73D43a6f79b910DD60172a7" },
  { name: "Pause switch", address: "0x40D2a96feFAC6074160bAa79d94aFC9D95C40a70" },
  { name: "Lock list", address: "0x1fA6e418D2B0bc1d48f18dd559Ce9689a2B93A00" },
  { name: "Profile", address: "0xB700Ba4BaE80365e024476d05f7349B4bAEE14D9" },
  { name: "Review", address: "0x8d585141aCfD570C6c5eBF1b0393AeD891812b7E" },
  { name: "Slash", address: "0x0EcDA84b455220BC7f2b995EB2Ae832BF2c0b29a" },
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
