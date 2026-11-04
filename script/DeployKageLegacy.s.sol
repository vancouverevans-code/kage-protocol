// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {EthosProfile} from "../src/legacy/EthosProfile.sol";
import {EthosReview} from "../src/legacy/EthosReview.sol";
import {EthosSlash} from "../src/legacy/EthosSlash.sol";
import {EthosVouch} from "../src/legacy/EthosVouch.sol";
import {ETHOS_PROFILE, ETHOS_REVIEW, ETHOS_VOUCH, SLASHER} from "../src/utils/Constants.sol";
import {ContractAddressManager} from "../src/utils/ContractAddressManager.sol";
import {InteractionControl} from "../src/utils/InteractionControl.sol";

/// @title DeployKageLegacy
/// @notice Deploys profile, review, legacy vouch, and slash onto an existing Kage registry.
/// @dev Requires KAGE_CAM, KAGE_IC, and SIGNATURE_VERIFIER from the V2 deployment.
contract DeployKageLegacy is Script {
  function run() external {
    uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
    address owner = vm.addr(pk);
    address admin = vm.envOr("ADMIN", owner);
    address signer = vm.envAddress("EXPECTED_SIGNER");
    address verifier = vm.envAddress("SIGNATURE_VERIFIER");
    ContractAddressManager cam = ContractAddressManager(vm.envAddress("KAGE_CAM"));
    InteractionControl interactionControl = InteractionControl(vm.envAddress("KAGE_IC"));

    vm.startBroadcast(pk);

    EthosProfile profile = EthosProfile(
      _proxy(
        address(new EthosProfile()),
        abi.encodeCall(EthosProfile.initialize, (owner, admin, signer, verifier, address(cam)))
      )
    );
    EthosReview review = EthosReview(
      _proxy(
        address(new EthosReview()),
        abi.encodeCall(EthosReview.initialize, (owner, admin, signer, verifier, address(cam)))
      )
    );
    EthosVouch vouch = EthosVouch(
      _proxy(
        address(new EthosVouch()),
        abi.encodeCall(EthosVouch.initialize, (owner, admin, signer, verifier, address(cam), owner, 100, 0, 0, 50))
      )
    );
    EthosSlash slash = EthosSlash(
      _proxy(
        address(new EthosSlash()),
        abi.encodeCall(EthosSlash.initialize, (owner, admin, signer, verifier, address(cam)))
      )
    );

    _register(cam, ETHOS_PROFILE, address(profile));
    _register(cam, ETHOS_REVIEW, address(review));
    _register(cam, ETHOS_VOUCH, address(vouch));
    _register(cam, SLASHER, address(slash));

    string[] memory controlled = new string[](4);
    controlled[0] = ETHOS_PROFILE;
    controlled[1] = ETHOS_REVIEW;
    controlled[2] = ETHOS_VOUCH;
    controlled[3] = SLASHER;
    interactionControl.addControlledContractNames(controlled);

    vm.stopBroadcast();

    console2.log("profile", address(profile));
    console2.log("review", address(review));
    console2.log("vouchV1", address(vouch));
    console2.log("slash", address(slash));

    string memory json = "legacy";
    vm.serializeUint(json, "chainId", block.chainid);
    vm.serializeAddress(json, "profile", address(profile));
    vm.serializeAddress(json, "review", address(review));
    vm.serializeAddress(json, "vouchV1", address(vouch));
    string memory out = vm.serializeAddress(json, "slash", address(slash));
    vm.writeJson(out, string.concat("deployments/", vm.toString(block.chainid), "-legacy.json"));
  }

  function _proxy(address implementation, bytes memory initData) internal returns (address) {
    return address(new ERC1967Proxy(implementation, initData));
  }

  function _register(ContractAddressManager cam, string memory name, address deployed) internal {
    address[] memory addrs = new address[](1);
    string[] memory names = new string[](1);
    addrs[0] = deployed;
    names[0] = name;
    cam.updateContractAddressesForNames(addrs, names);
  }
}
