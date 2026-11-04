import { create } from "zustand";
import {
  ENTRY_FEE,
  EXIT_FEE,
  PROFILES,
  REVIEW_FEE,
  YOU,
  tradeCost,
  uid,
  type FeedItem,
  type Market,
  type Review,
  type Score,
  type Side,
  type SlashCase,
  type Transfer,
  type View,
  type Vouch,
} from "./model";

type Ledger = {
  view: View;
  selected: string | null;
  balance: number;
  rewards: number;
  scores: Record<string, number>;
  vouches: Vouch[];
  reviews: Review[];
  markets: Market[];
  slashes: SlashCase[];
  transfers: Transfer[];
  feed: FeedItem[];
  setView: (view: View) => void;
  select: (id: string | null) => void;
  vouch: (to: string, amount: number, note: string) => string | null;
  unvouch: (id: string) => string | null;
  increase: (id: string, amount: number) => string | null;
  review: (subject: string, score: Score, comment: string) => string | null;
  trade: (subject: string, side: Side, shares: number) => string | null;
  claim: () => string | null;
  slash: (target: string, reason: string) => string | null;
  resolveSlash: (id: string, execute: boolean) => string | null;
  send: (to: string, amount: number) => string | null;
  reset: () => void;
};

function seed(): Pick<
  Ledger,
  "balance" | "rewards" | "scores" | "vouches" | "reviews" | "markets" | "slashes" | "transfers" | "feed" | "selected"
> {
  return {
    balance: 9_500,
    rewards: 42,
    selected: "amina",
    scores: Object.fromEntries(PROFILES.map((p) => [p.id, p.score])),
    vouches: [
      { id: "v-seed-1", from: YOU, to: "amina", amount: 500, note: "Treasury that does not leak." },
      { id: "v-seed-2", from: "jomo", to: YOU, amount: 800, note: "Shows up when the raid starts." },
      { id: "v-seed-3", from: "nia", to: YOU, amount: 300, note: "Threads that land." },
      { id: "v-seed-4", from: "zuri", to: "kenji", amount: 200, note: "Asks the upgrade-key question." },
    ],
    reviews: [
      {
        id: "r-seed-1",
        author: YOU,
        subject: "kenji",
        score: "positive",
        comment: "Caught a signer reuse before it shipped.",
      },
      {
        id: "r-seed-2",
        author: "amina",
        subject: YOU,
        score: "positive",
        comment: "Paid the card in USDC and kept the keys offline.",
      },
    ],
    markets: PROFILES.filter((p) => p.id !== YOU).map((p, i) => ({
      id: `m-${p.id}`,
      subject: p.id,
      trust: 100 + i * 12,
      distrust: 100 - i * 6,
      volume: 240 + i * 80,
    })),
    slashes: [
      {
        id: "s-seed-1",
        author: "kenji",
        target: "jomo",
        reason: "Posted a signer key in a public raid note.",
        amount: 80,
        status: "open",
      },
    ],
    transfers: [
      { id: "t-seed-1", from: "protocol", to: YOU, label: "Genesis mint", amount: 10_000 },
    ],
    feed: [
      { id: "f1", text: "Jomo vouched 800 KAGE for Cipher." },
      { id: "f2", text: "Kenji opened a slash on Jomo." },
      { id: "f3", text: "Amina's trust market is leaning long." },
    ],
  };
}

function note(feed: FeedItem[], text: string): FeedItem[] {
  return [{ id: uid("f"), text }, ...feed].slice(0, 12);
}

export const useKage = create<Ledger>((set, get) => ({
  view: "overview",
  ...seed(),
  setView: (view) => set({ view }),
  select: (id) => set({ selected: id, view: id ? "profiles" : get().view }),
  vouch: (to, amount, text) => {
    const { balance, vouches } = get();
    if (to === YOU) return "You cannot vouch for yourself.";
    if (amount < 1) return "Minimum vouch is 1 KAGE.";
    if (vouches.some((v) => v.from === YOU && v.to === to)) return "You already vouch for them. Increase it instead.";
    const fee = amount * ENTRY_FEE;
    const total = amount + fee;
    if (total > balance) return "Not enough KAGE for the stake plus 1% entry fee.";
    const who = PROFILES.find((p) => p.id === to)?.name ?? to;
    set({
      balance: balance - total,
      vouches: [{ id: uid("v"), from: YOU, to, amount, note: text || "Stake, not a compliment." }, ...vouches],
      rewards: get().rewards + amount * 0.01,
      feed: note(get().feed, `You vouched ${amount} KAGE for ${who}.`),
    });
    return null;
  },
  unvouch: (id) => {
    const vouch = get().vouches.find((v) => v.id === id);
    if (!vouch || vouch.from !== YOU) return "Only your own vouch can be unwound.";
    const fee = vouch.amount * EXIT_FEE;
    const back = vouch.amount - fee;
    const who = PROFILES.find((p) => p.id === vouch.to)?.name ?? vouch.to;
    set({
      balance: get().balance + back,
      vouches: get().vouches.filter((v) => v.id !== id),
      feed: note(get().feed, `You unwound the vouch for ${who}. ${fee.toFixed(2)} KAGE exit fee burned.`),
    });
    return null;
  },
  increase: (id, amount) => {
    if (amount < 1) return "Add at least 1 KAGE.";
    const vouch = get().vouches.find((v) => v.id === id && v.from === YOU);
    if (!vouch) return "That vouch is not yours.";
    const fee = amount * ENTRY_FEE;
    if (amount + fee > get().balance) return "Not enough KAGE.";
    set({
      balance: get().balance - amount - fee,
      vouches: get().vouches.map((v) => (v.id === id ? { ...v, amount: v.amount + amount } : v)),
      rewards: get().rewards + amount * 0.01,
      feed: note(get().feed, `You added ${amount} KAGE to an open vouch.`),
    });
    return null;
  },
  review: (subject, score, comment) => {
    if (!comment.trim()) return "Write what happened.";
    if (subject === YOU) return "Reviews are for other people.";
    if (get().balance < REVIEW_FEE) return "A review burns 15 KAGE. Balance is short.";
    const delta = score === "positive" ? 2 : score === "negative" ? -3 : 0;
    const who = PROFILES.find((p) => p.id === subject)?.name ?? subject;
    set({
      balance: get().balance - REVIEW_FEE,
      scores: { ...get().scores, [subject]: (get().scores[subject] ?? 50) + delta },
      reviews: [{ id: uid("r"), author: YOU, subject, score, comment: comment.trim() }, ...get().reviews],
      feed: note(get().feed, `You left a ${score} review for ${who}.`),
    });
    return null;
  },
  trade: (subject, side, shares) => {
    const market = get().markets.find((m) => m.subject === subject);
    if (!market) return "No market for that person.";
    if (shares < 1) return "Buy at least 1 share.";
    const quote = tradeCost(market.trust, market.distrust, side, shares);
    if (quote.total > get().balance) return "Not enough KAGE for that clip.";
    const who = PROFILES.find((p) => p.id === subject)?.name ?? subject;
    set({
      balance: get().balance - quote.total,
      markets: get().markets.map((m) =>
        m.subject === subject
          ? {
              ...m,
              trust: side === "trust" ? m.trust + shares : m.trust,
              distrust: side === "distrust" ? m.distrust + shares : m.distrust,
              volume: m.volume + quote.total,
            }
          : m,
      ),
      feed: note(get().feed, `You bought ${shares} ${side} on ${who}.`),
    });
    return null;
  },
  claim: () => {
    const { rewards, balance } = get();
    if (rewards < 0.01) return "Nothing accrued yet. Vouch to stream rewards.";
    set({
      balance: balance + rewards,
      rewards: 0,
      transfers: [
        { id: uid("t"), from: "rewards", to: YOU, label: "Reward claim", amount: rewards },
        ...get().transfers,
      ],
      feed: note(get().feed, `You claimed ${rewards.toFixed(2)} KAGE in rewards.`),
    });
    return null;
  },
  slash: (target, reason) => {
    if (!reason.trim()) return "Say what they did.";
    if (target === YOU) return "You cannot slash yourself.";
    const incoming = get().vouches.filter((v) => v.to === target);
    if (incoming.length === 0) return "Nothing staked on them to slash.";
    if (get().slashes.some((s) => s.target === target && s.status === "open")) {
      return "An open slash already exists.";
    }
    const amount = Math.round(incoming.reduce((sum, v) => sum + v.amount, 0) * 0.1);
    const who = PROFILES.find((p) => p.id === target)?.name ?? target;
    set({
      slashes: [
        { id: uid("s"), author: YOU, target, reason: reason.trim(), amount, status: "open" },
        ...get().slashes,
      ],
      feed: note(get().feed, `You opened a slash on ${who} for ${amount} KAGE.`),
    });
    return null;
  },
  resolveSlash: (id, execute) => {
    const item = get().slashes.find((s) => s.id === id && s.status === "open");
    if (!item) return "That case is already closed.";
    if (execute) {
      const hit = get().vouches.find((v) => v.to === item.target);
      set({
        slashes: get().slashes.map((s) => (s.id === id ? { ...s, status: "executed" } : s)),
        vouches: hit
          ? get().vouches.map((v) =>
              v.id === hit.id ? { ...v, amount: Math.max(1, v.amount - item.amount) } : v,
            )
          : get().vouches,
        balance: get().balance + Math.round(item.amount * 0.2),
        scores: {
          ...get().scores,
          [item.target]: (get().scores[item.target] ?? 50) - 8,
        },
        feed: note(get().feed, `Slash executed. Score dropped and a cut returned to you.`),
      });
      return null;
    }
    set({
      slashes: get().slashes.map((s) => (s.id === id ? { ...s, status: "dismissed" } : s)),
      feed: note(get().feed, "Slash dismissed. Stake stays put."),
    });
    return null;
  },
  send: (to, amount) => {
    if (to === YOU) return "Pick someone else.";
    if (amount < 1) return "Send at least 1 KAGE.";
    if (amount > get().balance) return "Not enough liquid KAGE. Staked vouches stay locked.";
    const who = PROFILES.find((p) => p.id === to)?.name ?? to;
    set({
      balance: get().balance - amount,
      transfers: [{ id: uid("t"), from: YOU, to, label: "Transfer", amount }, ...get().transfers],
      feed: note(get().feed, `You sent ${amount} KAGE to ${who}.`),
    });
    return null;
  },
  reset: () => set({ view: "overview", ...seed() }),
}));

export function stakedBy(from: string, vouches: Vouch[]) {
  return vouches.filter((v) => v.from === from).reduce((sum, v) => sum + v.amount, 0);
}

export function receivedBy(to: string, vouches: Vouch[]) {
  return vouches.filter((v) => v.to === to).reduce((sum, v) => sum + v.amount, 0);
}
