export const YOU = "cipher";

export type Score = "negative" | "neutral" | "positive";
export type Side = "trust" | "distrust";
export type View =
  | "overview"
  | "profiles"
  | "vouch"
  | "reviews"
  | "markets"
  | "rewards"
  | "slash"
  | "token"
  | "contracts";

export type Profile = {
  id: string;
  name: string;
  handle: string;
  role: string;
  bio: string;
  score: number;
};

export type Vouch = {
  id: string;
  from: string;
  to: string;
  amount: number;
  note: string;
};

export type Review = {
  id: string;
  author: string;
  subject: string;
  score: Score;
  comment: string;
};

export type Market = {
  id: string;
  subject: string;
  trust: number;
  distrust: number;
  volume: number;
};

export type SlashCase = {
  id: string;
  author: string;
  target: string;
  reason: string;
  amount: number;
  status: "open" | "executed" | "dismissed";
};

export type Transfer = {
  id: string;
  from: string;
  to: string;
  amount: number;
  label: string;
};

export type FeedItem = {
  id: string;
  text: string;
};

export const PROFILES: Profile[] = [
  {
    id: "cipher",
    name: "Cipher",
    handle: "kageciphereth",
    role: "Operator",
    bio: "Runs this Kage desk. Vouches are stake, not compliments.",
    score: 74,
  },
  {
    id: "amina",
    name: "Amina Okello",
    handle: "amina",
    role: "Treasury",
    bio: "Moves USDC without parking it on an exchange.",
    score: 81,
  },
  {
    id: "jomo",
    name: "Jomo Kariuki",
    handle: "jomo",
    role: "Raids",
    bio: "Turns a quiet chat into a coordinated push.",
    score: 66,
  },
  {
    id: "zuri",
    name: "Zuri Ade",
    handle: "zuri",
    role: "Markets",
    bio: "Prices trust the way a book prices a rumor.",
    score: 70,
  },
  {
    id: "kenji",
    name: "Kenji Mori",
    handle: "kenji",
    role: "Security",
    bio: "Seedless by default. Asks who holds the upgrade key.",
    score: 88,
  },
  {
    id: "nia",
    name: "Nia Wanjiku",
    handle: "nia",
    role: "Stories",
    bio: "Writes the thread people actually finish.",
    score: 77,
  },
];

export const LMSR_B = 80;
export const ENTRY_FEE = 0.01;
export const EXIT_FEE = 0.005;
export const REVIEW_FEE = 15;

export function profileById(id: string) {
  return PROFILES.find((p) => p.id === id);
}

export function price(selfQty: number, otherQty: number) {
  const a = Math.exp(selfQty / LMSR_B);
  const b = Math.exp(otherQty / LMSR_B);
  return a / (a + b);
}

export function tradeCost(trust: number, distrust: number, side: Side, shares: number) {
  const before = lmsr(trust, distrust);
  const after =
    side === "trust" ? lmsr(trust + shares, distrust) : lmsr(trust, distrust + shares);
  const gross = Math.max(0, after - before);
  const fee = gross * ENTRY_FEE;
  return { gross, fee, total: gross + fee };
}

function lmsr(trust: number, distrust: number) {
  return LMSR_B * Math.log(Math.exp(trust / LMSR_B) + Math.exp(distrust / LMSR_B));
}

export function formatKage(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export const CONTRACTS = [
  { name: "KAGE token", address: "0x64b60e9575bC0b09F802e55a15B18a5C86aE5cf7" },
  { name: "Vouch V2", address: "0xDC139924D5f948871Ae9f8050c3b8FA43D493fA2" },
  { name: "Market", address: "0x801FF0a5364E2c4E0cEF6202e6B0Da9698C09D8e" },
  { name: "Rewards", address: "0x7319FD13FACd97e0c3D70Bf53BDeF91c87Bc45fC" },
  { name: "Adaptive LMSR", address: "0x3D9Fe14da291F5034Cf7D2128A6e7d8E8F20980D" },
  { name: "Registry", address: "0x397b3A679612F60Dc73D43a6f79b910DD60172a7" },
  { name: "Interaction control", address: "0x40D2a96feFAC6074160bAa79d94aFC9D95C40a70" },
  { name: "Lock list", address: "0x1fA6e418D2B0bc1d48f18dd559Ce9689a2B93A00" },
  { name: "Signer", address: "0x59f497EE3e5b97299c409ac9fCF275Cd009E38C6" },
] as const;
