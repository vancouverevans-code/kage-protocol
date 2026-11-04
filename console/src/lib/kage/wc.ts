import type { Eip1193 } from "./wallet-types";

const PROJECT_ID = "b56e18d47c72ab683b10814fe9495694";

export async function startWalletConnect(onUri: (uri: string) => void): Promise<Eip1193> {
  const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
  const origin = typeof window === "undefined" ? "https://kage.desk" : window.location.origin;
  const provider = await EthereumProvider.init({
    projectId: PROJECT_ID,
    optionalChains: [968],
    rpcMap: { 968: "https://rpc.bohr.life" },
    showQrModal: false,
    metadata: {
      name: "Kage",
      description: "Kage reputation desk on BOT Chain",
      url: origin,
      icons: [`${origin}/favicon.svg`],
    },
  });
  provider.on("display_uri", onUri);
  await provider.connect();
  return provider as Eip1193;
}
