# Kage desk

Clickable reputation console for the protocol in this repo.

The screens are People, Vouch, Reviews, Markets, Rewards, Slash, KAGE, and Contracts. Actions move a sandbox ledger in the browser. They do not call BOT Chain until the contracts are mined.

Source for that desk:

- `src/components/kage` — screens
- `src/lib/kage` — ledger and predicted addresses
- `public/favicon.svg` and `public/og.jpg` — icon and share card

The running app is the Grok project that hosts this preview. A public website URL is created when that project is published. This folder is the desk source, not a second host.
