const CaptureTheFlag = artifacts.require("CaptureTheFlag");

const WhiteListPaymaster = artifacts.require("WhitelistPaymaster");
const VerifyingPaymaster = artifacts.require("VerifyingPaymaster");
const ToketV3 = artifacts.require("ToketV3");
const RelayHub = artifacts.require("RelayHub");

// const RelayHubContract = require("./RelayHub.json");

module.exports = async function (deployer) {
  const forwarder = require("../build/gsn/Forwarder").address;
  await deployer.deploy(CaptureTheFlag, forwarder);

  const relayHubAddress = require("../build/gsn/RelayHub.json").address;
  const relayHub = await RelayHub.at(relayHubAddress);

  // const relayHub = new web3.eth.Contract(RelayHubContract.abi, relayHubAddress);

  await deployer.deploy(WhiteListPaymaster);
  const pm = await WhiteListPaymaster.deployed();

  await pm.setTrustedForwarder(forwarder);

  const userAddress = "0x1dF62f291b2E969fB0849d99D9Ce41e2F137006e";
  await pm.whitelistSender(userAddress, true);
  await pm.whitelistSender("0x58a78411bc31982E0D28527ceCE155dA1cd93c53", false);
  await pm.setConfiguration(true, false, false, false);

  await relayHub.depositFor(pm.address, { value: 1e18 });

  await pm.setRelayHub(relayHubAddress);

  const signer = "0xc07648fd3311b7b97171efb2db9da7625b234487";

  await deployer.deploy(VerifyingPaymaster);
  const pmVery = await VerifyingPaymaster.deployed();
  await pmVery.setTrustedForwarder(forwarder);
  await pmVery.setSigner(signer);
  await pmVery.setRelayHub(relayHubAddress);

  await relayHub.depositFor(pmVery.address, { value: 1e18 });

  await deployer.deploy(
    ToketV3,
    "Toket",
    "TKT",
    10,
    signer,
    signer,
    [userAddress],
    signer,
    0,
    forwarder
  );
  const toketV3 = await ToketV3.deployed();

  console.log("*AC DEPLOYED TOKET: ", toketV3.address);

  console.log(
    `Deployed CTF at ${CaptureTheFlag.address} with forwarder ${forwarder}`
  );
};
