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

Testnet is deployed. Owner, admin, and expected signer are `0x0EbE98279Cfa8bF30a0B6ad5Af5829E801102b76`. The gas key is not an owner.

| Contract | Address |
| --- | --- |
| KAGE token | `0x64b60e9575bC0b09F802e55a15B18a5C86aE5cf7` |
| Vouch V2 | `0xDC139924D5f948871Ae9f8050c3b8FA43D493fA2` |
| Market | `0x801FF0a5364E2c4E0cEF6202e6B0Da9698C09D8e` |
| Rewards | `0x7319FD13FACd97e0c3D70Bf53BDeF91c87Bc45fC` |
| Adaptive LMSR | `0x3D9Fe14da291F5034Cf7D2128A6e7d8E8F20980D` |
| Registry | `0x397b3A679612F60Dc73D43a6f79b910DD60172a7` |
| Pause switch | `0x40D2a96feFAC6074160bAa79d94aFC9D95C40a70` |
| Lock list | `0x1fA6e418D2B0bc1d48f18dd559Ce9689a2B93A00` |
| Profile | `0xB700Ba4BaE80365e024476d05f7349B4bAEE14D9` |
| Review | `0x8d585141aCfD570C6c5eBF1b0393AeD891812b7E` |
| Slash | `0x0EcDA84b455220BC7f2b995EB2Ae832BF2c0b29a` |

Explorer: https://scan.bohr.life

The owner still sends three transactions. The gas key cannot:

1. `mint` 10,000,000 KAGE to the owner.
2. `mint` 1,000,000 KAGE to the rewards contract.
3. `setPricingAllowed` on the market for the adaptive pricing contract.

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
