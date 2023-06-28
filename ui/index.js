const ethers = require("ethers");
const { RelayProvider } = require("@opengsn/provider");

const paymasterAddress = require("../build/gsn/Paymaster").address;
const relayHubAddress = require("../build/gsn/RelayHub.json").address;

const contractArtifact = require("../build/contracts/CaptureTheFlag.json");
const contractAbi = contractArtifact.abi;

const toketV3Artifact = require("../build/contracts/ToketV3.json");
const toketV3Abi = toketV3Artifact.abi;

const paymasterArtifact = require("../build/contracts/WhitelistPaymaster.json");
const veryPaymasterArtifact = require("../build/contracts/VerifyingPaymaster.json");
// const veryPaymasterAbi = veryPaymasterArtifact.abi;

const relayHubArtifact = require("../build/contracts/RelayHub.json");
const relayHubAbi = relayHubArtifact.abi;
const { signRelayRequest } = require("@opengsn/paymasters");

let theContract;
let toketV3Contract;
let provider;

const asyncApprovalData = async function (relayRequest) {
  const signerPk =
    "d433933b6e578c621129d400cbe27caca4d3c70cfec4729739ea8c363bd79761";

  // Create buffer from pk string
  const signerBuffer = Buffer.from(signerPk, "hex");
  try {
    const sig = signRelayRequest(relayRequest, signerBuffer);
    return sig;
  } catch (error) {
    console.log("*AC SIGNATURE FAILED");
    throw error;
  }
};

// Create a new RelayProvider instance in the place where you normally initialize your Web3.js/Ethers.js provider:
async function getProvider(selectedPaymaster) {
  const config = {
    maxApprovalDataLength: 65,
    loggerConfiguration: { logLevel: "debug" },
    paymasterAddress: selectedPaymaster,
  };

  const { gsnProvider, gsnSigner } = await RelayProvider.newEthersV5Provider({
    provider: window.ethereum,
    config: config,
    overrideDependencies: { asyncApprovalData },
  });

  return gsnProvider;
}

async function initContract() {
  if (!window.ethereum) {
    throw new Error("provider not found");
  }
  window.ethereum.on("accountsChanged", () => {
    console.log("acct");
    window.location.reload();
  });
  window.ethereum.on("chainChanged", () => {
    console.log("chainChained");
    window.location.reload();
  });

  const networkId = await window.ethereum.request({ method: "net_version" });
  const whitelistPaymasterAddress =
    paymasterArtifact.networks[networkId].address;
  const veryPaymasterAddress =
    veryPaymasterArtifact.networks[networkId].address;

  const selectedPaymaster = veryPaymasterAddress;

  provider = await getProvider(selectedPaymaster);
  const network = await provider.getNetwork();
  const artifactNetwork = contractArtifact.networks[networkId];
  if (!artifactNetwork)
    throw new Error("Can't find deployment on network " + networkId);
  const contractAddress = artifactNetwork.address;
  theContract = new ethers.Contract(
    contractAddress,
    contractAbi,
    provider.getSigner()
  );

  toketV3Contract = new ethers.Contract(
    toketV3Artifact.networks[networkId].address,
    toketV3Abi,
    provider.getSigner()
  );

  //   const role = await toketV3Contract.MINTER_ROLE();
  //   console.log("*AC ROLE: ", role);
  //   const hasRole = await toketV3Contract.hasRole(
  //     role,
  //     "0xc07648fd3311b7b97171efb2db9da7625b234487"
  //   );
  //   console.log("*AC hasRole: ", hasRole);
  //   const hasRole2 = await toketV3Contract.hasRole(
  //     role,
  //     "0x1dF62f291b2E969fB0849d99D9Ce41e2F137006e"
  //   );
  //   console.log("*AC hasRole2: ", hasRole2);

  const relayH = new ethers.Contract(
    relayHubAddress,
    relayHubAbi,
    provider.getSigner()
  );

  const paymasterBalance = await relayH.balanceOf(selectedPaymaster);
  console.log(`PAYMASTER BALANCE:`, paymasterBalance);

  //   const veryContract = new ethers.Contract(
  //     veryPaymasterAddress,
  //     veryPaymasterAbi,
  //     provider.getSigner()
  //   );
  //   console.log(`veryContract:`, veryContract);
  //
  //   const verySIGNER = await veryContract.functions["signer"]();
  //   const provAddress = await provider.getSigner().getAddress();
  //   console.log(`provider.getSigner():`, provAddress);
  //   console.log(`verySIGNER:`, verySIGNER);

  await listenToEvents();
  return { contractAddress, network };
}

async function contractCall() {
  await window.ethereum.send("eth_requestAccounts");

  const txOptions = { gasPrice: await provider.getGasPrice() };
  //   const transaction = await toketV3Contract.safeMint(
  //     "0xc07648fd3311b7b97171efb2db9da7625b234487",
  //     "URI",
  //     txOptions
  //   );
  const transaction = await theContract.captureTheFlag(txOptions);
  const hash = transaction.hash;
  console.log(`Transaction ${hash} sent`);
  const receipt = await transaction.wait();
  console.log(`Receipt: ${JSON.stringify(receipt)}`);
  console.log(`Mined in block: ${receipt.blockNumber}`);
}

let logview;

function log(message) {
  message = message.replace(/(0x\w\w\w\w)\w*(\w\w\w\w)\b/g, "<b>$1...$2</b>");
  if (!logview) {
    logview = document.getElementById("logview");
  }
  logview.innerHTML = message + "<br>\n" + logview.innerHTML;
}

async function listenToEvents() {
  theContract.on("FlagCaptured", (previousHolder, currentHolder, rawEvent) => {
    log(`Flag Captured from&nbsp;${previousHolder} by&nbsp;${currentHolder}`);
    console.log(`Flag Captured from ${previousHolder} by ${currentHolder}`);
  });
}

window.app = {
  initContract,
  contractCall,
  log,
};
