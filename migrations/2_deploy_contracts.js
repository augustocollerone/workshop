const CaptureTheFlag = artifacts.require("CaptureTheFlag");

const WhiteListPaymaster = artifacts.require("WhitelistPaymaster");

module.exports = async function (deployer) {
  const forwarder = require("../build/gsn/Forwarder").address;
  await deployer.deploy(CaptureTheFlag, forwarder);

  await deployer.deploy(WhiteListPaymaster);
  const pm = await WhiteListPaymaster.deployed();

  await pm.setTrustedForwarder(forwarder);

  await pm.whitelistSender("0x1dF62f291b2E969fB0849d99D9Ce41e2F137006e");

  const relayHubAddress = "0xC89Ce4735882C9F0f0FE26686c53074E09B0D550";

  await pm.setRelayHub(relayHubAddress);

  console.log(
    `Deployed CTF at ${CaptureTheFlag.address} with forwarder ${forwarder}`
  );
};
