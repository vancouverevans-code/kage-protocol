import { create } from "zustand";
import { BOT_TESTNET } from "./chain";

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export type WalletExtension = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
  provider: Eip1193;
};

type WalletState = {
  extensions: WalletExtension[];
  extensionName: string | null;
  address: string | null;
  chainId: number | null;
  balanceWei: bigint;
  connecting: boolean;
  sending: boolean;
  error: string | null;
  txHash: string | null;
  discover: () => () => void;
  connect: (uuid?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  send: (to: string, amountWei: bigint) => Promise<string | null>;
};

const found = new Map<string, WalletExtension>();
let active: Eip1193 | null = null;
let onAccounts: ((accounts: unknown) => void) | null = null;
let onChain: ((chainId: unknown) => void) | null = null;

function hexChain(value: unknown) {
  const hex = String(value);
  return Number.parseInt(hex, hex.startsWith("0x") ? 16 : 10);
}

function injected(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  const eth = (window as Window & { ethereum?: Eip1193 }).ethereum;
  return eth ?? null;
}

function rememberInjected() {
  const provider = injected();
  if (!provider || found.size > 0) return;
  found.set("injected", {
    uuid: "injected",
    name: "Browser wallet",
    icon: "",
    rdns: "injected",
    provider,
  });
}

function unbind() {
  if (!active || !onAccounts || !onChain) return;
  active.removeListener?.("accountsChanged", onAccounts);
  active.removeListener?.("chainChanged", onChain);
  onAccounts = null;
  onChain = null;
}

export const useWallet = create<WalletState>((set, get) => ({
  extensions: [],
  extensionName: null,
  address: null,
  chainId: null,
  balanceWei: 0n,
  connecting: false,
  sending: false,
  error: null,
  txHash: null,

  discover: () => {
    if (typeof window === "undefined") return () => {};
    const onAnnounce = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          info: { uuid: string; name: string; icon: string; rdns: string };
          provider: Eip1193;
        }>
      ).detail;
      if (!detail?.info || !detail.provider) return;
      found.set(detail.info.uuid, { ...detail.info, provider: detail.provider });
      set({ extensions: [...found.values()] });
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    const fallback = window.setTimeout(() => {
      rememberInjected();
      set({ extensions: [...found.values()] });
    }, 400);
    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
    };
  },

  connect: async (uuid) => {
    rememberInjected();
    const chosen = (uuid && found.get(uuid)) || [...found.values()][0];
    if (!chosen) {
      set({ error: "No wallet extension found in this browser." });
      return;
    }
    set({ connecting: true, error: null, txHash: null });
    try {
      unbind();
      active = chosen.provider;
      const accounts = (await active.request({ method: "eth_requestAccounts" })) as string[];
      const chainId = hexChain(await active.request({ method: "eth_chainId" }));
      const address = accounts[0] ?? null;
      onAccounts = (next) => {
        const list = Array.isArray(next) ? (next as string[]) : [];
        if (!list[0]) {
          unbind();
          active = null;
          set({ address: null, chainId: null, balanceWei: 0n, extensionName: null });
          return;
        }
        set({ address: list[0] });
        void get().refresh();
      };
      onChain = (next) => {
        set({ chainId: hexChain(next) });
        void get().refresh();
      };
      active.on?.("accountsChanged", onAccounts);
      active.on?.("chainChanged", onChain);
      set({
        address,
        chainId,
        extensionName: chosen.name,
        extensions: [...found.values()],
        connecting: false,
      });
      await get().refresh();
    } catch (error) {
      const rejected = (error as { code?: number }).code === 4001;
      set({
        connecting: false,
        error: rejected ? "Connection cancelled in the wallet." : "The wallet refused to connect.",
      });
    }
  },

  disconnect: async () => {
    const provider = active;
    unbind();
    active = null;
    set({
      address: null,
      chainId: null,
      balanceWei: 0n,
      extensionName: null,
      error: null,
      txHash: null,
    });
    try {
      await provider?.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      /* Extensions that cannot revoke still drop the session in the desk. */
    }
  },

  refresh: async () => {
    const { address } = get();
    if (!active || !address) return;
    try {
      const chainId = hexChain(await active.request({ method: "eth_chainId" }));
      const hex = (await active.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      })) as string;
      set({ chainId, balanceWei: BigInt(hex), error: null });
    } catch {
      set({ error: "Could not read the BOT balance." });
    }
  },

  switchNetwork: async () => {
    if (!active) {
      set({ error: "Connect a wallet first." });
      return;
    }
    set({ error: null });
    try {
      await active.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BOT_TESTNET.chainIdHex }],
      });
    } catch (error) {
      const missing = (error as { code?: number }).code === 4902;
      if (!missing) {
        set({ error: "The wallet did not switch networks." });
        return;
      }
      try {
        await active.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: BOT_TESTNET.chainIdHex,
              chainName: BOT_TESTNET.name,
              nativeCurrency: { name: "BOT", symbol: BOT_TESTNET.symbol, decimals: 18 },
              rpcUrls: [BOT_TESTNET.rpc],
              blockExplorerUrls: [BOT_TESTNET.explorer],
            },
          ],
        });
      } catch {
        set({ error: "Add BOT Chain testnet in the wallet, then switch to it." });
      }
    }
    await get().refresh();
  },

  send: async (to, amountWei) => {
    const { address, chainId } = get();
    if (!active || !address) {
      set({ error: "Connect a wallet first." });
      return null;
    }
    if (chainId !== BOT_TESTNET.chainId) {
      set({ error: "Switch to BOT Chain testnet before sending." });
      return null;
    }
    if (amountWei <= 0n) {
      set({ error: "Enter an amount greater than zero." });
      return null;
    }
    set({ sending: true, error: null, txHash: null });
    try {
      const hash = (await active.request({
        method: "eth_sendTransaction",
        params: [{ from: address, to, value: `0x${amountWei.toString(16)}` }],
      })) as string;
      set({ sending: false, txHash: hash });
      await get().refresh();
      return hash;
    } catch (error) {
      const rejected = (error as { code?: number }).code === 4001;
      set({
        sending: false,
        error: rejected ? "Transaction cancelled in the wallet." : "The wallet did not send the transfer.",
      });
      return null;
    }
  },
}));
