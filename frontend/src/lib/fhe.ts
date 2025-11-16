import { bytesToHex, encodeAbiParameters, getAddress } from "viem";
import type { Address } from "viem";

declare global {
  interface Window {
    RelayerSDK?: any;
    relayerSDK?: any;
    ethereum?: any;
  }
}

let fheInstance: any = null;
let initPromise: Promise<any> | null = null;

const getSDK = () => {
  if (typeof window === "undefined") throw new Error("FHE SDK requires browser environment");
  const sdk = window.RelayerSDK || window.relayerSDK;
  if (!sdk) throw new Error("Relayer SDK not loaded. Make sure the SDK script is loaded in index.html");
  return sdk;
};

const getProvider = () => {
  if (!window.ethereum) throw new Error("No wallet provider found. Please install MetaMask.");
  return window.ethereum;
};

export function isFHEReady() {
  return fheInstance !== null;
}

export function resetFHEInstance() {
  fheInstance = null;
  initPromise = null;
}

export async function initializeFHE(provider?: any) {
  if (fheInstance) return fheInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log("[FHE] Loading SDK...");
      const sdk = getSDK();
      const { initSDK, createInstance, SepoliaConfig } = sdk;

      console.log("[FHE] Initializing WASM...");
      await initSDK();

      const networkProvider = provider || getProvider();
      console.log("[FHE] Creating instance with network provider...");
      const config = {
        ...SepoliaConfig,
        network: networkProvider,
        gatewayUrl: 'https://gateway.zama.ai'
      };

      fheInstance = await createInstance(config);
      console.log("[FHE] ✅ Initialized successfully");
      return fheInstance;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[FHE] ❌ Initialization failed:", errorMsg);
      initPromise = null;
      throw new Error(`FHE initialization failed: ${errorMsg}`);
    }
  })();

  return initPromise;
}

export async function decryptValue(handle: `0x${string}`) {
  if (!isFHEReady()) {
    await initializeFHE(getProvider());
  }

  const instance = fheInstance;
  if (!instance) throw new Error("FHE SDK not initialized");

  try {
    const { decryptedValues, signatures } = await instance.getDecryption([handle]);
    const value = BigInt(decryptedValues[0]);

    const clearValue = encodeAbiParameters([{ type: "uint64" }], [value]) as `0x${string}`;
    const decryptionProof = bytesToHex(signatures) as `0x${string}`;

    return { clearValue, decryptionProof };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[FHE] ❌ Decryption failed:", errorMsg);
    throw new Error(`FHE decryption failed: ${errorMsg}`);
  }
}

export async function decryptDirections(handles: `0x${string}`[]) {
  if (handles.length === 0) throw new Error("No handles to decrypt");
  if (!isFHEReady()) {
    await initializeFHE(getProvider());
  }

  const instance = fheInstance;
  if (!instance) throw new Error("FHE SDK not initialized");

  const { decryptedValues, signatures } = await instance.getDecryption(handles);
  const values = decryptedValues.map((value: string | number) => BigInt(value));
  const clearDirections = encodeAbiParameters([{ type: "uint8[]" }], [values]) as `0x${string}`;
  const decryptionProof = bytesToHex(signatures) as `0x${string}`;

  return { clearDirections, decryptionProof };
}

export function getFHEInstance() {
  return fheInstance;
}

export async function encryptDirection(
  predictUp: boolean,
  contractAddress: Address,
  userAddress: Address
) {
  if (!isFHEReady()) {
    await initializeFHE(getProvider());
  }

  const instance = fheInstance;
  if (!instance) throw new Error("FHE SDK not initialized");

  const input = instance.createEncryptedInput(getAddress(contractAddress), getAddress(userAddress));
  input.add8(BigInt(predictUp ? 1 : 0));

  const { handles, inputProof } = await input.encrypt();
  if (!handles || handles.length === 0) {
    throw new Error("FHE SDK returned no handles");
  }

  return {
    ciphertext: bytesToHex(handles[0]) as `0x${string}`,
    proof: bytesToHex(inputProof) as `0x${string}`
  };
}
