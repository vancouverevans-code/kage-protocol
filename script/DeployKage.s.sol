// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Script, console2} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {AdaptiveLMSRPricing} from "../src/AdaptiveLMSRPricing.sol";
import {EthosMarket} from "../src/EthosMarket.sol";
import {EthosRewards} from "../src/EthosRewards.sol";
import {EthosVouchV2} from "../src/EthosVouchV2.sol";
import {EthosWhuffie} from "../src/EthosWhuffie.sol";
import {WhuffieLockList} from "../src/WhuffieLockList.sol";
import {SignatureVerifier} from "../src/legacy/SignatureVerifier.sol";
import {AccessControlV2} from "../src/utils/AccessControlV2.sol";
import {
  ETHOS_INTERACTION_CONTROL,
  ETHOS_MARKET,
  ETHOS_REWARDS,
  ETHOS_VOUCH_V2,
  ETHOS_WHUFFIE
} from "../src/utils/Constants.sol";
import {ContractAddressManager} from "../src/utils/ContractAddressManager.sol";
import {InteractionControl} from "../src/utils/InteractionControl.sol";

/// @title DeployKage
/// @notice Deploys the Kage V2 stack: registry, KAGE token, vouch, market, rewards, pricing.
/// @dev Legacy profile / review / vouch / slash are a separate 0.8.26 compilation unit.
///      Run script/DeployKageLegacy.s.sol after this one. It reads KAGE_CAM, KAGE_IC,
///      and SIGNATURE_VERIFIER from the log.
contract DeployKage is Script {
  uint256 internal constant TOKEN_CAP = 1_000_000_000 ether;
  uint256 internal constant GENESIS_MINT = 10_000_000 ether;
  uint256 internal constant REWARDS_SEED = 1_000_000 ether;
  uint256 internal constant MARKET_INITIAL_SUPPLY = 100 ether;
  uint256 internal constant LMSR_B0 = 100 ether;
  uint256 internal constant LMSR_ALPHA = 0.1 ether;

  address internal owner;
  address internal admin;
  address internal signer;
  SignatureVerifier internal verifier;
  ContractAddressManager internal cam;
  InteractionControl internal interactionControl;
  WhuffieLockList internal lockList;
  EthosWhuffie internal token;
  EthosVouchV2 internal vouchV2;
  EthosMarket internal market;
  EthosRewards internal rewards;
  AdaptiveLMSRPricing internal pricing;

  function run() external {
    uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
    address broadcaster = vm.addr(pk);
    owner = vm.envAddress("OWNER");
    if (owner == address(0)) revert("OWNER required");
    admin = vm.envOr("ADMIN", owner);
    if (admin == address(0)) admin = owner;
    signer = vm.envOr("EXPECTED_SIGNER", owner);
    if (signer == address(0)) signer = owner;

    vm.startBroadcast(pk);
    _deployInfra(broadcaster);
    _deployToken();
    _deployV2();
    _wire();
    vm.stopBroadcast();
    _log(broadcaster);
  }

  function _deployInfra(address broadcaster) internal {
    verifier = new SignatureVerifier();
    cam = new ContractAddressManager();
    // Broadcaster owns the registry and the pause switch only until the legacy
    // script finishes registration, then both are transferred to OWNER.
    interactionControl = new InteractionControl(broadcaster, address(cam));
    _register(ETHOS_INTERACTION_CONTROL, address(interactionControl));
  }

  function _deployToken() internal {
    lockList = new WhuffieLockList(owner);
    address impl = address(new EthosWhuffie(lockList));
    token = EthosWhuffie(_proxy(impl, abi.encodeCall(EthosWhuffie.initialize, (owner, address(cam), TOKEN_CAP))));
  }

  function _deployV2() internal {
    AccessControlV2.AccessControlInitParams memory access = AccessControlV2.AccessControlInitParams({
      owner: owner,
      admin: admin,
      expectedSigner: signer,
      signatureVerifier: address(verifier),
      contractAddressManager: address(cam)
    });
    vouchV2 = EthosVouchV2(_proxy(address(new EthosVouchV2()), _vouchInit(access)));
    market = EthosMarket(_proxy(address(new EthosMarket()), _marketInit(access)));
    rewards = EthosRewards(_proxy(address(new EthosRewards()), _rewardsInit(access)));
    pricing = new AdaptiveLMSRPricing(LMSR_B0, LMSR_ALPHA);
    // setPricingAllowed is onlyOwner. OWNER calls it from their wallet after deploy.
  }

  function _vouchInit(AccessControlV2.AccessControlInitParams memory access) internal view returns (bytes memory) {
    return abi.encodeCall(EthosVouchV2.initialize, (access, address(token), 100, 50, 1 ether, 50_000 ether, 256, 0));
  }

  function _marketInit(AccessControlV2.AccessControlInitParams memory access) internal view returns (bytes memory) {
    return abi.encodeCall(EthosMarket.initialize, (access, address(token), MARKET_INITIAL_SUPPLY));
  }

  function _rewardsInit(AccessControlV2.AccessControlInitParams memory access) internal view returns (bytes memory) {
    return abi.encodeCall(EthosRewards.initialize, (access, address(token), 1000));
  }

  function _wire() internal {
    _register(ETHOS_VOUCH_V2, address(vouchV2));
    _register(ETHOS_MARKET, address(market));
    _register(ETHOS_REWARDS, address(rewards));
    _register(ETHOS_WHUFFIE, address(token));

    string[] memory controlled = new string[](3);
    controlled[0] = ETHOS_VOUCH_V2;
    controlled[1] = ETHOS_MARKET;
    controlled[2] = ETHOS_REWARDS;
    interactionControl.addControlledContractNames(controlled);
  }

  function _log(address broadcaster) internal {
    console2.log("broadcaster", broadcaster);
    console2.log("owner", owner);
    console2.log("admin", admin);
    console2.log("expectedSigner", signer);
    console2.log("signatureVerifier", address(verifier));
    console2.log("contractAddressManager", address(cam));
    console2.log("interactionControl", address(interactionControl));
    console2.log("lockList", address(lockList));
    console2.log("kageToken", address(token));
    console2.log("vouchV2", address(vouchV2));
    console2.log("market", address(market));
    console2.log("rewards", address(rewards));
    console2.log("adaptiveLmsr", address(pricing));

    string memory json = "v2";
    vm.serializeUint(json, "chainId", block.chainid);
    vm.serializeAddress(json, "broadcaster", broadcaster);
    vm.serializeAddress(json, "owner", owner);
    vm.serializeAddress(json, "admin", admin);
    vm.serializeAddress(json, "expectedSigner", signer);
    vm.serializeAddress(json, "signatureVerifier", address(verifier));
    vm.serializeAddress(json, "contractAddressManager", address(cam));
    vm.serializeAddress(json, "interactionControl", address(interactionControl));
    vm.serializeAddress(json, "lockList", address(lockList));
    vm.serializeAddress(json, "kageToken", address(token));
    vm.serializeAddress(json, "vouchV2", address(vouchV2));
    vm.serializeAddress(json, "market", address(market));
    vm.serializeAddress(json, "rewards", address(rewards));
    string memory out = vm.serializeAddress(json, "adaptiveLmsr", address(pricing));
    vm.writeJson(out, string.concat("deployments/", vm.toString(block.chainid), "-v2.json"));
  }

  function _proxy(address implementation, bytes memory initData) internal returns (address) {
    return address(new ERC1967Proxy(implementation, initData));
  }

  function _register(string memory name, address deployed) internal {
    address[] memory addrs = new address[](1);
    string[] memory names = new string[](1);
    addrs[0] = deployed;
    names[0] = name;
    cam.updateContractAddressesForNames(addrs, names);
  }
}
