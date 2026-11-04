export type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export type NamedProvider = Eip1193 & {
  providers?: NamedProvider[];
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  isOkxWallet?: boolean;
  isBraveWallet?: boolean;
  isTokenPocket?: boolean;
  isBitKeep?: boolean;
  isPhantom?: boolean;
  isZerion?: boolean;
  isRainbow?: boolean;
};

export function walletName(provider: NamedProvider) {
  if (provider.isRabby) return "Rabby";
  if (provider.isRainbow) return "Rainbow";
  if (provider.isTrust || provider.isTrustWallet) return "Trust Wallet";
  if (provider.isCoinbaseWallet) return "Coinbase Wallet";
  if (provider.isOkxWallet) return "OKX Wallet";
  if (provider.isBitKeep) return "Bitget Wallet";
  if (provider.isTokenPocket) return "TokenPocket";
  if (provider.isBraveWallet) return "Brave Wallet";
  if (provider.isPhantom) return "Phantom";
  if (provider.isZerion) return "Zerion";
  if (provider.isMetaMask) return "MetaMask";
  return "Browser wallet";
}
