import { create } from "zustand";
import { BOT_TESTNET } from "./chain";
import { walletName, type Eip1193, type NamedProvider } from "./wallet-types";

export type { Eip1193 } from "./wallet-types";

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
  pickerOpen: boolean;
  wcUri: string | null;
  wcQr: string | null;
  discover: () => () => void;
  openPicker: () => void;
  closePicker: () => void;
  connect: (uuid?: string) => Promise<void>;
  connectOther: () => Promise<void>;
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

function browserWallets(): NamedProvider[] {
  if (typeof window === "undefined") return [];
  const bag = window as Window & {
    ethereum?: NamedProvider;
    okxwallet?: NamedProvider;
    trustwallet?: NamedProvider;
    coinbaseWalletExtension?: NamedProvider;
    rabby?: NamedProvider;
    phantom?: { ethereum?: NamedProvider };
  };
  const roots = [bag.ethereum, bag.okxwallet, bag.trustwallet, bag.coinbaseWalletExtension, bag.rabby, bag.phantom?.ethereum];
  const list: NamedProvider[] = [];
  for (const root of roots) {
    if (!root) continue;
    const group = root.providers?.length ? root.providers : [root];
    for (const provider of group) {
      if (!list.includes(provider)) list.push(provider);
    }
  }
  return list;
}

function rememberInjected() {
  const seen = new Set(Array.from(found.values(), (item) => item.provider));
  browserWallets().forEach((provider, index) => {
    if (seen.has(provider)) return;
    const name = walletName(provider);
    const uuid = `injected-${name}-${index}`;
    found.set(uuid, { uuid, name, icon: "", rdns: "injected", provider });
    seen.add(provider);
  });
}

function unbind() {
  if (!active || !onAccounts || !onChain) return;
  active.removeListener?.("accountsChanged", onAccounts);
  active.removeListener?.("chainChanged", onChain);
  onAccounts = null;
  onChain = null;
}

export const useWallet = create<WalletState>((set, get) => {
  async function bind(provider: Eip1193, name: string) {
    unbind();
    active = provider;
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    const chainId = hexChain(await provider.request({ method: "eth_chainId" }));
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
    provider.on?.("accountsChanged", onAccounts);
    provider.on?.("chainChanged", onChain);
    set({
      address,
      chainId,
      extensionName: name,
      extensions: [...found.values()],
      connecting: false,
      pickerOpen: false,
      wcUri: null,
      wcQr: null,
      error: null,
    });
    await get().refresh();
  }

  return {
    extensions: [],
    extensionName: null,
    address: null,
    chainId: null,
    balanceWei: 0n,
    connecting: false,
    sending: false,
    error: null,
    txHash: null,
    pickerOpen: false,
    wcUri: null,
    wcQr: null,

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
      }, 200);
      return () => {
        window.clearTimeout(fallback);
        window.removeEventListener("eip6963:announceProvider", onAnnounce);
      };
    },

    openPicker: () => {
      rememberInjected();
      window.dispatchEvent(new Event("eip6963:requestProvider"));
      set({ pickerOpen: true, error: null, wcUri: null, wcQr: null, extensions: [...found.values()] });
    },

    closePicker: () => set({ pickerOpen: false, wcUri: null, wcQr: null }),

    connect: async (uuid) => {
      rememberInjected();
      const list = [...found.values()];
      const chosen = (uuid && found.get(uuid)) || list[0];
      if (!chosen) {
        set({ pickerOpen: true, error: "No browser wallet yet. Use phone or other wallet, or install one." });
        return;
      }
      set({ connecting: true, error: null, txHash: null, pickerOpen: true });
      try {
        await bind(chosen.provider, chosen.name);
      } catch (error) {
        const rejected = (error as { code?: number }).code === 4001;
        set({
          connecting: false,
          error: rejected ? "Connection cancelled in the wallet." : "The wallet refused to connect.",
        });
      }
    },

    connectOther: async () => {
      set({ connecting: true, error: null, pickerOpen: true, wcUri: null, wcQr: null });
      try {
        const { startWalletConnect } = await import("./wc");
        const QRCode = (await import("qrcode")).default;
        const provider = await startWalletConnect(async (uri) => {
          const qr = await QRCode.toDataURL(uri, { margin: 1, width: 280, color: { dark: "#100e0c", light: "#f3eadf" } });
          set({ wcUri: uri, wcQr: qr, error: null });
        });
        const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
        if (!accounts[0]) {
          const requested = (await provider.request({ method: "eth_requestAccounts" })) as string[];
          if (!requested[0]) throw new Error("empty");
        }
        await bind(provider, "WalletConnect");
      } catch (error) {
        const rejected = (error as { code?: number }).code === 4001;
        set({
          connecting: false,
          error: rejected ? "Connection cancelled in the wallet." : "That wallet did not finish connecting.",
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
        wcUri: null,
        wcQr: null,
        pickerOpen: false,
      });
      try {
        await provider?.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch {
        try {
          await provider?.request({ method: "wallet_disconnect" });
        } catch {
          /* Some wallets have no disconnect method. */
        }
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
  };
});
