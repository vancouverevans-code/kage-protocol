import { useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import {
  ArrowUpRight,
  Coins,
  Copy,
  Gavel,
  Gift,
  Handshake,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  RotateCcw,
  Scale,
  Unplug,
  Users,
  Wallet,
} from "lucide-react";
import { BOT_TESTNET, DEPLOY_ROLES, formatBot, isAddress, parseBot, shortAddress } from "@/lib/kage/chain";
import {
  REVIEW_FEE,
  YOU,
  formatKage,
  price,
  profileById,
  tradeCost,
  type Score,
  type Side,
  type View,
} from "@/lib/kage/model";
import { receivedBy, stakedBy, useKage } from "@/lib/kage/store";
import { useWallet } from "@/lib/kage/wallet";
import { Field, Panel, Primary, fieldClass } from "./ui";

const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "profiles", label: "People", icon: Users },
  { id: "vouch", label: "Vouch", icon: Handshake },
  { id: "reviews", label: "Reviews", icon: MessageSquare },
  { id: "markets", label: "Markets", icon: LineChart },
  { id: "rewards", label: "Rewards", icon: Gift },
  { id: "slash", label: "Slash", icon: Gavel },
  { id: "token", label: "KAGE", icon: Coins },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "contracts", label: "Contracts", icon: Scale },
];

function act(error: string | null, ok: string) {
  if (error) toast.error(error);
  else toast.success(ok);
}

export function KageApp() {
  const view = useKage((s) => s.view);
  const setView = useKage((s) => s.setView);
  const balance = useKage((s) => s.balance);
  const rewards = useKage((s) => s.rewards);
  const vouches = useKage((s) => s.vouches);
  const reset = useKage((s) => s.reset);
  const staked = stakedBy(YOU, vouches);
  const discover = useWallet((s) => s.discover);
  const address = useWallet((s) => s.address);

  useEffect(() => discover(), [discover]);

  return (
    <div className="min-h-screen bg-ink text-paper">
      <Toaster theme="dark" />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-5 md:px-6 md:py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-brass">BOT Chain desk</p>
            <h1 className="font-display text-5xl leading-none text-paper italic">Kage</h1>
            <p className="mt-2 max-w-xl text-mute">
              The book below is a preview ledger. The wallet talks to BOT Chain. Your address is the owner. The gas key is not.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Stat label="Liquid" value={`${formatKage(balance)} KAGE`} />
            <Stat label="Staked" value={formatKage(staked)} />
            <Stat label="Rewards" value={formatKage(rewards)} />
            <button
              type="button"
              onClick={() => setView("wallet")}
              className={
                address
                  ? "inline-flex min-h-11 items-center gap-2 rounded-full bg-brass px-4 text-sm font-semibold text-brass-ink"
                  : "inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm text-paper"
              }
            >
              <Wallet className="size-4" />
              {address ? shortAddress(address) : "Connect wallet"}
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                toast("Ledger reset to the opening book.");
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm text-mute"
            >
              <RotateCcw className="size-4" />
              Reset
            </button>
          </div>
        </header>

        <nav className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={
                  on
                    ? "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-brass px-4 text-sm font-semibold text-brass-ink"
                    : "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-panel px-4 text-sm text-paper"
                }
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {view === "overview" && <Overview />}
        {view === "profiles" && <People />}
        {view === "vouch" && <VouchDesk />}
        {view === "reviews" && <Reviews />}
        {view === "markets" && <Markets />}
        {view === "rewards" && <Rewards />}
        {view === "slash" && <Slash />}
        {view === "token" && <Token />}
        {view === "wallet" && <WalletDesk />}
        {view === "contracts" && <Contracts />}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-28 rounded-card border border-line bg-panel px-4 py-2">
      <p className="text-xs uppercase tracking-wider text-mute">{label}</p>
      <p className="font-display text-2xl leading-tight text-paper">{value}</p>
    </div>
  );
}

function Overview() {
  const feed = useKage((s) => s.feed);
  const markets = useKage((s) => s.markets);
  const scores = useKage((s) => s.scores);
  const setView = useKage((s) => s.setView);
  const featured = markets[0];
  const odds = featured ? price(featured.trust, featured.distrust) : 0.5;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Panel className="lg:col-span-3">
        <p className="text-sm text-mute">What you can do from this desk</p>
        <h2 className="mt-1 font-display text-4xl text-paper italic">Every control moves the book.</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["vouch", "Stake KAGE on someone"],
              ["reviews", "Leave a signed review"],
              ["markets", "Buy trust or distrust"],
              ["rewards", "Claim the stream"],
              ["slash", "Open or close a case"],
              ["token", "Send liquid KAGE"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className="flex min-h-14 items-center justify-between rounded-2xl border border-line bg-panel-2 px-4 text-left text-paper"
            >
              <span>{label}</span>
              <ArrowUpRight className="size-4 text-brass" />
            </button>
          ))}
        </div>
      </Panel>
      <Panel className="lg:col-span-2">
        <p className="text-sm text-mute">Latest</p>
        <ul className="mt-3 flex flex-col gap-3">
          {feed.map((item) => (
            <li key={item.id} className="border-b border-line pb-3 text-sm last:border-0">
              {item.text}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel className="lg:col-span-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-mute">Featured market</p>
            <h3 className="font-display text-3xl text-paper italic">
              {profileById(featured?.subject ?? "amina")?.name}
            </h3>
          </div>
          <p className="font-display text-4xl text-brass">{Math.round(odds * 100)}% trust</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {markets.map((m) => {
            const trust = price(m.trust, m.distrust);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setView("markets")}
                className="rounded-2xl border border-line bg-ink p-3 text-left"
              >
                <p className="text-sm text-paper">{profileById(m.subject)?.name}</p>
                <p className="mt-2 font-display text-2xl text-brass">{Math.round(trust * 100)}</p>
                <p className="text-xs text-mute">score {scores[m.subject]}</p>
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function People() {
  const selected = useKage((s) => s.selected);
  const select = useKage((s) => s.select);
  const scores = useKage((s) => s.scores);
  const vouches = useKage((s) => s.vouches);
  const reviews = useKage((s) => s.reviews);
  const setView = useKage((s) => s.setView);
  const person = profileById(selected ?? "amina");

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="flex flex-col gap-2 lg:col-span-2">
        {["cipher", "amina", "jomo", "zuri", "kenji", "nia"].map((id) => {
          const p = profileById(id);
          if (!p) return null;
          const on = selected === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => select(id)}
              className={
                on
                  ? "flex min-h-16 items-center justify-between rounded-2xl bg-brass px-4 text-left text-brass-ink"
                  : "flex min-h-16 items-center justify-between rounded-2xl border border-line bg-panel px-4 text-left text-paper"
              }
            >
              <span>
                <span className="block font-semibold">{p.name}</span>
                <span className={on ? "text-sm text-brass-ink" : "text-sm text-mute"}>@{p.handle}</span>
              </span>
              <span className="font-display text-3xl">{scores[id]}</span>
            </button>
          );
        })}
      </div>
      {person && (
        <Panel className="lg:col-span-3">
          <p className="text-sm text-mute">{person.role}</p>
          <h2 className="font-display text-4xl text-paper italic">{person.name}</h2>
          <p className="mt-2 max-w-md text-mute">{person.bio}</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Mini label="Score" value={String(scores[person.id] ?? person.score)} />
            <Mini label="Vouched in" value={formatKage(receivedBy(person.id, vouches))} />
            <Mini label="Reviews" value={String(reviews.filter((r) => r.subject === person.id).length)} />
          </div>
          {person.id !== YOU && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Primary onClick={() => setView("vouch")}>Vouch</Primary>
              <Primary tone="ghost" onClick={() => setView("reviews")}>
                Review
              </Primary>
              <Primary tone="ghost" onClick={() => setView("markets")}>
                Trade
              </Primary>
              <Primary tone="clay" onClick={() => setView("slash")}>
                Slash
              </Primary>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ink p-3">
      <p className="text-xs uppercase tracking-wider text-mute">{label}</p>
      <p className="font-display text-2xl text-paper">{value}</p>
    </div>
  );
}

function VouchDesk() {
  const selected = useKage((s) => s.selected);
  const vouches = useKage((s) => s.vouches);
  const vouch = useKage((s) => s.vouch);
  const unvouch = useKage((s) => s.unvouch);
  const increase = useKage((s) => s.increase);
  const [to, setTo] = useState(selected && selected !== YOU ? selected : "amina");
  const [amount, setAmount] = useState("100");
  const [note, setNote] = useState("");
  const mine = vouches.filter((v) => v.from === YOU);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <h2 className="font-display text-3xl text-paper italic">Open a vouch</h2>
        <p className="mt-1 text-sm text-mute">1% entry fee burns. Stake stays locked until you unwind it.</p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            act(vouch(to, Number(amount), note), "Vouch locked.");
          }}
        >
          <PersonSelect value={to} onChange={setTo} excludeYou />
          <Field label="Amount">
            <input className={fieldClass} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {["50", "100", "500"].map((n) => (
              <Primary key={n} tone="ghost" onClick={() => setAmount(n)}>
                {n}
              </Primary>
            ))}
          </div>
          <Field label="Note">
            <input className={fieldClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this stake" />
          </Field>
          <Primary type="submit">Lock vouch</Primary>
        </form>
      </Panel>
      <Panel>
        <h2 className="font-display text-3xl text-paper italic">Your stake</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {mine.length === 0 && <li className="text-mute">No open vouches. Lock one on the left.</li>}
          {mine.map((v) => (
            <li key={v.id} className="rounded-2xl border border-line bg-ink p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{profileById(v.to)?.name}</p>
                  <p className="text-sm text-mute">{v.note}</p>
                </div>
                <p className="font-display text-3xl text-brass">{formatKage(v.amount)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Primary tone="ghost" onClick={() => act(increase(v.id, 50), "Stake increased by 50.")}>
                  Add 50
                </Primary>
                <Primary tone="clay" onClick={() => act(unvouch(v.id), "Vouch unwound.")}>
                  Unvouch
                </Primary>
              </div>
            </li>
          ))}
        </ul>
        <h3 className="mt-6 text-sm uppercase tracking-wider text-mute">Incoming</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {vouches
            .filter((v) => v.to === YOU)
            .map((v) => (
              <li key={v.id} className="flex items-center justify-between text-sm">
                <span>{profileById(v.from)?.name}</span>
                <span className="text-brass">{formatKage(v.amount)} KAGE</span>
              </li>
            ))}
        </ul>
      </Panel>
    </div>
  );
}

function Reviews() {
  const reviews = useKage((s) => s.reviews);
  const review = useKage((s) => s.review);
  const selected = useKage((s) => s.selected);
  const [subject, setSubject] = useState(selected && selected !== YOU ? selected : "kenji");
  const [score, setScore] = useState<Score>("positive");
  const [comment, setComment] = useState("");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <h2 className="font-display text-3xl text-paper italic">Write a review</h2>
        <p className="mt-1 text-sm text-mute">Burns {REVIEW_FEE} KAGE. Positive lifts score by 2, negative cuts 3.</p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const err = review(subject, score, comment);
            act(err, "Review posted.");
            if (!err) setComment("");
          }}
        >
          <PersonSelect value={subject} onChange={setSubject} excludeYou />
          <div className="flex flex-wrap gap-2">
            {(["positive", "neutral", "negative"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScore(s)}
                className={
                  score === s
                    ? "min-h-11 rounded-full bg-brass px-4 text-sm font-semibold text-brass-ink capitalize"
                    : "min-h-11 rounded-full border border-line px-4 text-sm text-paper capitalize"
                }
              >
                {s}
              </button>
            ))}
          </div>
          <Field label="What happened">
            <textarea
              className={`${fieldClass} min-h-28 py-3`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>
          <Primary type="submit">Publish review</Primary>
        </form>
      </Panel>
      <Panel>
        <h2 className="font-display text-3xl text-paper italic">Board</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-ink p-4">
              <p className="text-sm text-mute">
                {profileById(r.author)?.name} on {profileById(r.subject)?.name}
              </p>
              <p className="mt-1 capitalize text-brass">{r.score}</p>
              <p className="mt-1">{r.comment}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Markets() {
  const markets = useKage((s) => s.markets);
  const trade = useKage((s) => s.trade);
  const [subject, setSubject] = useState(markets[0]?.subject ?? "amina");
  const [shares, setShares] = useState(25);
  const market = markets.find((m) => m.subject === subject) ?? markets[0];
  const quote = useMemo(() => {
    if (!market) return null;
    return {
      trust: tradeCost(market.trust, market.distrust, "trust", shares),
      distrust: tradeCost(market.trust, market.distrust, "distrust", shares),
      trustPx: price(market.trust, market.distrust),
      distrustPx: price(market.distrust, market.trust),
    };
  }, [market, shares]);

  if (!market || !quote) return null;

  function buy(side: Side) {
    act(trade(market.subject, side, shares), `${side} filled.`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Panel className="lg:col-span-2">
        <h2 className="font-display text-3xl text-paper italic">Pick a book</h2>
        <div className="mt-4 flex flex-col gap-2">
          {markets.map((m) => {
            const px = price(m.trust, m.distrust);
            const on = m.subject === market.subject;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSubject(m.subject)}
                className={
                  on
                    ? "flex min-h-14 items-center justify-between rounded-2xl bg-brass px-4 text-brass-ink"
                    : "flex min-h-14 items-center justify-between rounded-2xl border border-line bg-ink px-4 text-paper"
                }
              >
                <span>{profileById(m.subject)?.name}</span>
                <span className="font-display text-2xl">{Math.round(px * 100)}</span>
              </button>
            );
          })}
        </div>
      </Panel>
      <Panel className="lg:col-span-3">
        <p className="text-sm text-mute">Adaptive LMSR · 1% entry</p>
        <h2 className="font-display text-4xl text-paper italic">{profileById(market.subject)?.name}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Mini label="Trust price" value={quote.trustPx.toFixed(3)} />
          <Mini label="Distrust price" value={quote.distrustPx.toFixed(3)} />
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-panel-2">
          <div className="h-full bg-brass" style={{ width: `${Math.round(quote.trustPx * 100)}%` }} />
        </div>
        <p className="mt-2 text-sm text-mute">Volume {formatKage(market.volume)} KAGE</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[10, 25, 50, 100].map((n) => (
            <Primary key={n} tone={shares === n ? "brass" : "ghost"} onClick={() => setShares(n)}>
              {n} shares
            </Primary>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => buy("trust")}
            className="min-h-20 rounded-2xl bg-brass px-4 text-left text-brass-ink"
          >
            <span className="block text-sm">Buy trust</span>
            <span className="font-display text-3xl">{formatKage(quote.trust.total)} KAGE</span>
          </button>
          <button
            type="button"
            onClick={() => buy("distrust")}
            className="min-h-20 rounded-2xl bg-clay px-4 text-left text-paper"
          >
            <span className="block text-sm">Buy distrust</span>
            <span className="font-display text-3xl">{formatKage(quote.distrust.total)} KAGE</span>
          </button>
        </div>
      </Panel>
    </div>
  );
}

function Rewards() {
  const rewards = useKage((s) => s.rewards);
  const claim = useKage((s) => s.claim);
  const vouches = useKage((s) => s.vouches);
  const staked = stakedBy(YOU, vouches);

  return (
    <Panel>
      <p className="text-sm text-mute">Streamed against stake</p>
      <h2 className="font-display text-5xl text-paper italic">{formatKage(rewards)} KAGE</h2>
      <p className="mt-2 max-w-lg text-mute">
        You have {formatKage(staked)} KAGE vouched out. New vouches accrue about 1% into this pool. Claim moves it to liquid KAGE.
      </p>
      <div className="mt-5">
        <Primary onClick={() => act(claim(), "Rewards claimed.")}>Claim rewards</Primary>
      </div>
    </Panel>
  );
}

function Slash() {
  const slashes = useKage((s) => s.slashes);
  const slash = useKage((s) => s.slash);
  const resolveSlash = useKage((s) => s.resolveSlash);
  const [target, setTarget] = useState("jomo");
  const [reason, setReason] = useState("");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <h2 className="font-display text-3xl text-paper italic">Open a case</h2>
        <p className="mt-1 text-sm text-mute">Needs stake already sitting on the target. Size is 10% of incoming vouches.</p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const err = slash(target, reason);
            act(err, "Slash opened.");
            if (!err) setReason("");
          }}
        >
          <PersonSelect value={target} onChange={setTarget} excludeYou />
          <Field label="Reason">
            <textarea className={`${fieldClass} min-h-24 py-3`} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Primary type="submit" tone="clay">
            File slash
          </Primary>
        </form>
      </Panel>
      <Panel>
        <h2 className="font-display text-3xl text-paper italic">Cases</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {slashes.map((s) => (
            <li key={s.id} className="rounded-2xl border border-line bg-ink p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{profileById(s.target)?.name}</p>
                  <p className="text-sm text-mute">{s.reason}</p>
                </div>
                <p className="text-sm capitalize text-brass">{s.status}</p>
              </div>
              <p className="mt-2 font-display text-2xl">{formatKage(s.amount)} KAGE</p>
              {s.status === "open" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Primary tone="clay" onClick={() => act(resolveSlash(s.id, true), "Slash executed.")}>
                    Execute
                  </Primary>
                  <Primary tone="ghost" onClick={() => act(resolveSlash(s.id, false), "Slash dismissed.")}>
                    Dismiss
                  </Primary>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Token() {
  const balance = useKage((s) => s.balance);
  const transfers = useKage((s) => s.transfers);
  const send = useKage((s) => s.send);
  const [to, setTo] = useState("nia");
  const [amount, setAmount] = useState("25");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <p className="text-sm text-mute">Liquid balance</p>
        <h2 className="font-display text-5xl text-paper italic">{formatKage(balance)}</h2>
        <p className="text-mute">KAGE · cap 1,000,000,000</p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            act(send(to, Number(amount)), "Transfer sent.");
          }}
        >
          <PersonSelect value={to} onChange={setTo} excludeYou />
          <Field label="Amount">
            <input className={fieldClass} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Primary type="submit">Send KAGE</Primary>
        </form>
      </Panel>
      <Panel>
        <h2 className="font-display text-3xl text-paper italic">Movements</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {transfers.map((t) => (
            <li key={t.id} className="flex items-center justify-between border-b border-line pb-3 text-sm">
              <span>
                <span className="block text-paper">{t.label}</span>
                <span className="text-mute">
                  {t.from === "protocol" || t.from === "rewards" ? t.from : profileById(t.from)?.name} →{" "}
                  {t.to === YOU ? "you" : profileById(t.to)?.name}
                </span>
              </span>
              <span className="text-brass">{formatKage(t.amount)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function WalletDesk() {
  const extensions = useWallet((s) => s.extensions);
  const extensionName = useWallet((s) => s.extensionName);
  const address = useWallet((s) => s.address);
  const chainId = useWallet((s) => s.chainId);
  const balanceWei = useWallet((s) => s.balanceWei);
  const connecting = useWallet((s) => s.connecting);
  const sending = useWallet((s) => s.sending);
  const error = useWallet((s) => s.error);
  const txHash = useWallet((s) => s.txHash);
  const connect = useWallet((s) => s.connect);
  const disconnect = useWallet((s) => s.disconnect);
  const switchNetwork = useWallet((s) => s.switchNetwork);
  const send = useWallet((s) => s.send);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("0.01");
  const onBot = chainId === BOT_TESTNET.chainId;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <p className="text-sm text-brass">Browser extension</p>
        <h2 className="mt-1 font-display text-4xl text-paper italic">Connect the wallet that will own Kage.</h2>
        <p className="mt-2 text-mute">
          MetaMask, Rabby, and any other injected wallet. This does not touch the preview ledger.
        </p>
        {address ? (
          <div className="mt-5 flex flex-col gap-3">
            <div className="rounded-2xl border border-line bg-ink p-4">
              <p className="text-xs uppercase tracking-wider text-mute">{extensionName ?? "Wallet"}</p>
              <p className="mt-1 break-all font-display text-2xl text-paper">{address}</p>
              <p className="mt-2 text-sm text-mute">
                {onBot ? BOT_TESTNET.name : `Wrong network · chain ${chainId ?? "unknown"}`}
              </p>
              <p className="mt-1 font-display text-3xl text-brass">{formatBot(balanceWei)} BOT</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Primary
                tone="ghost"
                onClick={() => {
                  void navigator.clipboard?.writeText(address);
                  toast.success("Address copied. This is the owner address.");
                }}
              >
                <Copy className="size-4" />
                Copy owner
              </Primary>
              <a
                className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm text-paper"
                href={`${BOT_TESTNET.explorer}/address/${address}`}
                target="_blank"
                rel="noreferrer"
              >
                Explorer
              </a>
              {onBot ? null : (
                <Primary
                  onClick={() => {
                    void switchNetwork().then(() => toast.success("Asked the wallet for BOT Chain testnet."));
                  }}
                >
                  Switch to testnet
                </Primary>
              )}
              <Primary
                tone="ghost"
                onClick={() => {
                  void disconnect();
                  toast("Wallet disconnected from the desk.");
                }}
              >
                <Unplug className="size-4" />
                Disconnect
              </Primary>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            {extensions.length === 0 ? (
              <p className="rounded-2xl border border-line bg-ink p-4 text-sm text-mute">
                No wallet extension answered. Install MetaMask or Rabby, open this desk in that browser, then connect.
              </p>
            ) : (
              extensions.map((ext) => (
                <button
                  key={ext.uuid}
                  type="button"
                  disabled={connecting}
                  onClick={() => {
                    void connect(ext.uuid).then(() => {
                      const next = useWallet.getState();
                      if (next.address) toast.success(`${ext.name} connected.`);
                      else if (next.error) toast.error(next.error);
                    });
                  }}
                  className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-ink px-4 text-left disabled:opacity-50"
                >
                  {ext.icon ? (
                    <img src={ext.icon} alt="" className="size-8 rounded-lg" />
                  ) : (
                    <Wallet className="size-5 text-brass" />
                  )}
                  <span>
                    <span className="block font-semibold text-paper">{ext.name}</span>
                    <span className="text-sm text-mute">{connecting ? "Waiting for approval" : "Connect"}</span>
                  </span>
                </button>
              ))
            )}
            {extensions.length === 0 ? (
              <Primary
                disabled={connecting}
                onClick={() => {
                  void connect().then(() => {
                    const next = useWallet.getState();
                    if (next.error) toast.error(next.error);
                  });
                }}
              >
                {connecting ? "Waiting" : "Connect wallet"}
              </Primary>
            ) : null}
          </div>
        )}
        {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
      </Panel>

      <Panel>
        <p className="text-sm text-mute">On-chain transfer</p>
        <h2 className="mt-1 font-display text-3xl text-paper italic">Send testnet BOT.</h2>
        <p className="mt-2 text-sm text-mute">
          Your wallet signs this. It moves BOT on chain {BOT_TESTNET.chainId}, not the preview KAGE balance.
        </p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isAddress(to)) {
              toast.error("Enter a full 0x address.");
              return;
            }
            const wei = parseBot(amount);
            if (wei == null || wei <= 0n) {
              toast.error("Enter a BOT amount.");
              return;
            }
            void send(to.trim(), wei).then((hash) => {
              if (hash) toast.success("Transfer submitted.");
              else if (useWallet.getState().error) toast.error(useWallet.getState().error ?? "Send failed.");
            });
          }}
        >
          <Field label="To">
            <input
              className={fieldClass}
              value={to}
              placeholder="0x"
              onChange={(e) => setTo(e.target.value)}
              spellCheck={false}
            />
          </Field>
          <Field label="Amount in BOT">
            <input className={fieldClass} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          </Field>
          <Primary type="submit" disabled={sending || !address}>
            {sending ? "Waiting for the wallet" : "Send BOT"}
          </Primary>
        </form>
        {txHash ? (
          <a
            className="mt-3 inline-flex text-sm text-brass underline"
            href={`${BOT_TESTNET.explorer}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction
          </a>
        ) : null}
      </Panel>
    </div>
  );
}

function Contracts() {
  const address = useWallet((s) => s.address);
  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <p className="text-sm text-brass">Testnet · chain {BOT_TESTNET.chainId} · not mined</p>
        <h2 className="mt-1 font-display text-4xl text-paper italic">Your wallet owns it. Nothing is deployed.</h2>
        <p className="mt-2 max-w-2xl text-mute">
          Connect the owner wallet, then fund the gas payer with 1 test BOT. The gas address never receives owner,
          admin, or signer. Mint and pricing stay transactions only you can send.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            className="inline-flex min-h-11 items-center text-brass underline"
            href="https://github.com/vancouverevans-code/kage-protocol"
            target="_blank"
            rel="noreferrer"
          >
            Source on GitHub
          </a>
          <a
            className="inline-flex min-h-11 items-center text-brass underline"
            href="https://faucet.botchain.ai/en/basic"
            target="_blank"
            rel="noreferrer"
          >
            Testnet faucet
          </a>
        </div>
      </Panel>
      <div className="grid gap-3 md:grid-cols-2">
        <Panel>
          <p className="text-sm text-mute">Owner address</p>
          <p className="mt-2 break-all font-display text-2xl text-paper">{address ?? "Connect a wallet"}</p>
        </Panel>
        {DEPLOY_ROLES.map((role) => (
          <Panel key={role.name} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">{role.name}</p>
              <p className="truncate text-sm text-mute">{role.detail}</p>
            </div>
            {role.detail.startsWith("0x") ? (
              <Primary
                tone="ghost"
                onClick={() => {
                  void navigator.clipboard?.writeText(role.detail);
                  toast.success("Address copied.");
                }}
              >
                <Copy className="size-4" />
              </Primary>
            ) : null}
          </Panel>
        ))}
      </div>
    </div>
  );
}

function PersonSelect({
  value,
  onChange,
  excludeYou,
}: {
  value: string;
  onChange: (id: string) => void;
  excludeYou?: boolean;
}) {
  const ids = ["amina", "jomo", "zuri", "kenji", "nia", "cipher"].filter((id) => !excludeYou || id !== YOU);
  return (
    <Field label="Person">
      <select className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {ids.map((id) => (
          <option key={id} value={id}>
            {profileById(id)?.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
