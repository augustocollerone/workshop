const ethers = require("ethers");
const { RelayProvider } = require("@opengsn/provider");

const paymasterAddress = require("../build/gsn/Paymaster").address;
const contractArtifact = require("../build/contracts/CaptureTheFlag.json");
const contractAbi = contractArtifact.abi;

const paymasterArtifact = require("../build/contracts/WhitelistPaymaster.json");
const veryPaymasterArtifact = require("../build/contracts/VerifyingPaymaster.json");

let theContract;
let provider;
let gsnProvider;

const asyncApprovalData = async function (relayRequest) {
  console.log("*AC im here in the async approval");
  const signer = provider.getSigner();
  console.log("*AC got the signer");
  // Pack the ForwardRequest and RelayData just like in the smart contract
  const packedForwardRequest = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "uint256", "uint256", "uint256", "bytes"],
    [
      relayRequest.request.from,
      relayRequest.request.to,
      relayRequest.request.value,
      relayRequest.request.gas,
      relayRequest.request.nonce,
      relayRequest.request.data,
    ]
  );

  console.log("*AC STEP 1 ");
  const packedRelayData = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256", "address", "address", "bytes", "string"],
    [
      relayRequest.relayData.maxFeePerGas,
      relayRequest.relayData.maxPriorityFeePerGas,
      relayRequest.relayData.relayWorker,
      relayRequest.relayData.paymaster,
      relayRequest.relayData.paymasterData,
      relayRequest.relayData.clientId,
    ]
  );

  // Hash the packed data
  const requestHash = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes", "bytes"],
      [packedForwardRequest, packedRelayData]
    )
  );

  // Sign the hash
  const signature = await signer.signMessage(
    ethers.utils.arrayify(requestHash)
  );

  return signature;
  //   return Promise.resolve("0x1234567890");
};

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

  console.log("*AC whitelistPaymasterAddress: ", whitelistPaymasterAddress);

  const { gsnProvider, gsnSigner } = await RelayProvider.newEthersV5Provider({
    provider: window.ethereum,
    config: {
      loggerConfiguration: { logLevel: "debug" },
      paymasterAddress: veryPaymasterAddress,
    },
    overrideDependencies: { asyncApprovalData },
  });

  console.log("*AC here1: ", gsnProvider);

  provider = gsnProvider;
  console.log("*AC here2");

  const network = await provider.getNetwork();
  console.log("*AC here3");
  const artifactNetwork = contractArtifact.networks[networkId];
  console.log("*AC here4");
  if (!artifactNetwork)
    throw new Error("Can't find deployment on network " + networkId);
  const contractAddress = artifactNetwork.address;
  theContract = new ethers.Contract(
    contractAddress,
    contractAbi,
    provider.getSigner()
  );

  await listenToEvents();
  return { contractAddress, network };
}

async function contractCall() {
  await window.ethereum.send("eth_requestAccounts");

  const txOptions = { gasPrice: await provider.getGasPrice() };
  const transaction = await theContract.captureTheFlag(txOptions);
  const hash = transaction.hash;
  console.log(`Transaction ${hash} sent`);
  const receipt = await transaction.wait();
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
