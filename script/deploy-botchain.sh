#!/bin/sh
# Broadcast Kage on BOT Chain. Fund the deployer first. Do not send any other
# transaction from that key before this finishes, or the addresses will move.
set -eu
cd "$(dirname "$0")/.."
set -a
# shellcheck disable=SC1091
. ./.env
set +a

RPC="${1:-$BOTCHAIN_TESTNET_RPC}"
mkdir -p deployments

forge script script/DeployKage.s.sol --rpc-url "$RPC" --broadcast --slow -vv | tee /tmp/kage-v2.log

export SIGNATURE_VERIFIER="$(grep -m1 'signatureVerifier' /tmp/kage-v2.log | awk '{print $2}')"
export KAGE_CAM="$(grep -m1 'contractAddressManager' /tmp/kage-v2.log | awk '{print $2}')"
export KAGE_IC="$(grep -m1 'interactionControl' /tmp/kage-v2.log | awk '{print $2}')"

forge script script/DeployKageLegacy.s.sol --rpc-url "$RPC" --broadcast --slow -vv | tee /tmp/kage-legacy.log

echo "V2 addresses: deployments/*-v2.json"
echo "Legacy addresses: deployments/*-legacy.json"
