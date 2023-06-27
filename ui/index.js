const ethers = require("ethers");
const { RelayProvider } = require("@opengsn/provider");
const { TurnkeySigner } = require("@turnkey/ethers");

const paymasterAddress = require("../build/gsn/Paymaster").address;
const contractArtifact = require("../build/contracts/CaptureTheFlag.json");
const contractAbi = contractArtifact.abi;

const paymasterArtifact = require("../build/contracts/WhitelistPaymaster.json");

let theContract;
let provider;
let gsnProvider;

// Create a new RelayProvider instance in the place where you normally initialize your Web3.js/Ethers.js provider:
async function getProvider() {
  const config = {
    paymasterAddress,
    loggerConfiguration: {
      logLevel: "debug",
    },
  };

  // Initialize a Turnkey Signer
  const turnkeySigner = new TurnkeySigner({
    apiPublicKey: TK_API_PUBLIC_KEY,
    apiPrivateKey: TK_API_PRIVATE_KEY,
    baseUrl: TK_BASE_URL,
    organizationId: ORGANIZATION_ID,
    privateKeyId,
  });

  const localRpc = "http://127.0.0.1:8545";
  const provider = new ethers.providers.JsonRpcProvider(localRpc);
  const connectedSigner = turnkeySigner.connect(provider);

  //   const address = await connectedSigner.getAddress();

  //   console.log("*DEV address: ", address);

  // to create a pair of Ethers.js Provider and Signer:
  const { gsnProvider, gsnSigner } = await RelayProvider.newEthersV5Provider({
    provider: connectedSigner,
    config,
  });

  console.log("*DEV gsnProvider: ", gsnProvider);
  console.log("*DEV gsnSigner: ", gsnSigner);

  return gsnProvider;
}

async function initContract() {
  gsnProvider = await getProvider();

  console.log("*DEV gsnProvider; ", gsnProvider);
  provider = new ethers.providers.Web3Provider(gsnProvider);

  const networkId = "1337";
  const whitelistPaymasterAddress = paymasterArtifact.networks["1337"].address;

  const artifactNetwork = contractArtifact.networks[networkId];
  if (!artifactNetwork)
    throw new Error("Can't find deployment on network " + networkId);
  const contractAddress = artifactNetwork.address;
  theContract = new ethers.Contract(contractAddress, contractAbi, provider);

  const transaction = await theContract.captureTheFlag();
  console.log("*DEV transaction: ", transaction);

  //   await listenToEvents();
  return { contractAddress, network: {} };
}

async function contractCall() {
  //   await window.ethereum.send("eth_requestAccounts");

  //   try {
  //     //   const txOptions = { gasPrice: await provider.getGasPrice() };
  //     //   console.log("*AC txOptions: ", txOptions);
  console.log("*AC PRE transaction: ");
  const transaction = await theContract.captureTheFlag();
  console.log("*AC transaction: ", transaction);
  //     const hash = transaction.hash;
  //     console.log(`Transaction ${hash} sent`);
  //     const receipt = await transaction.wait();
  //     console.log(`Mined in block: ${receipt.blockNumber}`);
  //   } catch (error) {
  //     console.log("*AC error: ", error);
  //   }
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
