# Kage Protocol

Independent BOT Chain deployment of the Ethos V2 contract system.

This repository is a fork of [trust-ethos/ethos-smart-contracts](https://github.com/trust-ethos/ethos-smart-contracts) under the MIT license. The copyright notice in `LICENSE` stays with Ethos Network. Contract identifiers are unchanged so the logic matches upstream. The one product change is the currency token: on-chain name **Kage**, symbol **KAGE** (upstream is Whuffie / WHUF).

This is not an official Ethos Network deployment. The Guardian audits below reviewed upstream Ethos commits, not this BOT Chain instance.

## Networks

| Network | Chain ID | RPC | Explorer |
| --- | --- | --- | --- |
| BOT Chain testnet | 968 | https://rpc.bohr.life | https://scan.bohr.life |
| BOT Chain mainnet | 677 | https://rpc.botchain.ai | https://scan.botchain.ai |

Testnet gas comes from the [BOT Chain faucet](https://faucet.botchain.ai/en/basic). Do not reuse the testnet deployer on mainnet.

```shell
forge soldeer install
forge build
forge test

source .env
forge script script/DeployKage.s.sol --rpc-url "$BOTCHAIN_TESTNET_RPC" --broadcast --slow
# export KAGE_CAM, KAGE_IC, and SIGNATURE_VERIFIER from that log, then:
forge script script/DeployKageLegacy.s.sol --rpc-url "$BOTCHAIN_TESTNET_RPC" --broadcast --slow
```

Use `BOTCHAIN_MAINNET_RPC` for mainnet, with a new gas key. `OWNER` is your wallet on that network too.

The deployer key pays gas only. `OWNER` is your wallet: token owner, admin, expected signer, registry owner, and pause-switch owner. Nothing is mined yet.

Do not treat the addresses below as live. They were predicted for a deployer-owned run and no longer apply once `OWNER` is your address.

After the broadcast confirms, you send three transactions from that wallet:

1. `mint` on the KAGE token to your address for 10,000,000 KAGE.
2. `mint` on the KAGE token to the rewards contract for 1,000,000 KAGE.
3. `setPricingAllowed` on the market for the adaptive pricing contract.

The gas key cannot do those. It has no role once the second script confirms.

The clickable desk source is in [console/](console/).

## Upstream notes

# Ethos Protocol Contracts

This repository is the canonical source for the Ethos V2 protocol smart contracts: a
standalone Foundry package containing Solidity sources, Solidity tests, Foundry config,
and Soldeer lock data.

## Audits

| Guardian security review | July 2026                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Report                   | [Guardian Audits repository](https://github.com/GuardianAudits/Audits/blob/main/Ethos/Ethos-Network-Guardian-Report.pdf) |
| Review window            | June 9–25, 2026 · final report July 9, 2026                                                                                                                                          |
| Findings                 | 0 Critical · 0 High · 5 Medium · 17 Low · 34 Informational                                                                                                                           |
| Audited commit           | `2e16c17110929849d15dd1357a68d904c18ada23`                                                                                                                                           |

| Guardian WHUF transfer lock review | September 2026                                                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Report                             | [Guardian Audits repository](https://github.com/GuardianAudits/Audits/blob/main/Ethos%20Network/2026-09-25_Ethos_Network_WHUF_Transfer_Lock.pdf) |
| Review window                      | September 25, 2026                                                                                                                              |
| Findings                           | 0 Critical · 0 High · 0 Medium · 0 Low · 5 Informational                                                                                        |
| Audited commit                     | `92f8e0424235b228246451b6c0d53142bad458fd`                                                                                                      |

Previous Ethos Sherlock contests:

- https://github.com/sherlock-audit/2024-10-ethos-network
- https://github.com/sherlock-audit/2024-11-ethos-network-ii
- https://github.com/sherlock-audit/2024-12-ethos-update

## Setup

Install dependencies and run the full Solidity suite:

```shell
forge soldeer install
forge build
forge test
```

Optional formatting check:

```shell
forge fmt --check src test
```

No Node install is required for the test suite.

## Tests Included

Solidity test suites:

- `test/EthosVouchV2.t.sol`
- `test/EthosVouchV2.invariant.t.sol`
- `test/EthosWhuffie.t.sol`
- `test/WhuffieLockList.t.sol`
- `test/EthosReviewWhuffieLockWorkflow.t.sol`
- `test/EthosMarket.t.sol`
- `test/EthosMarket.invariant.t.sol`
- `test/EthosMarketAdaptiveLMSR.t.sol`
- `test/EthosMarketAdaptiveLMSR.invariant.t.sol`
- `test/EthosRewards.t.sol`
- `test/EthosRewards.invariant.t.sol`
- `test/AdaptiveLMSRPricing.t.sol`
- `test/PositionToken.t.sol`
- `test/AccessControlV2.t.sol`
- `test/EthosReview.t.sol`
- `test/EthosSlash.t.sol`

## Trust Assumptions

- Owner and admin roles are trusted governance or operations actors.
- The expected signer is trusted to authorize only valid signed actions.
- `ContractAddressManager` ownership and registered addresses are trusted.
- The registered slasher address is trusted only for the intended slash/freeze flow.
- The `WhuffieLockList` owner (the Ethos owner Safe) is trusted to add accounts to the
  pre-listing lock list; the list is append-only. The token owner is trusted to end the
  lock early.
- UUPS upgrades are performed by the authorized owner through the intended proxy flow.
- WHUF (`EthosWhuffie`) is the registered burnable token for V2 fee burns and claims.
- Market and vouch flows assume configured ERC20 tokens behave as standard non-rebasing,
  non-fee-on-transfer tokens unless explicitly handled by the contract.
