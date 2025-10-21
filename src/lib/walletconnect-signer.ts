import { createWalletClient, custom, type WalletClient } from 'viem';
import { mainnet, sepolia, polygon, arbitrum, optimism, base } from 'viem/chains';
import EthereumProvider from '@walletconnect/ethereum-provider';

/**
 * Creates a WalletConnect signer that works with viem + delegation-utils.
 * Automatically connects if not already connected.
 */
export async function getWalletConnectSigner(chainId: number): Promise<WalletClient> {
  // Get project ID from environment variables
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  
  if (!projectId) {
    throw new Error('WalletConnect project ID not found. Please set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID');
  }

  const provider = await EthereumProvider.init({
    projectId: projectId,
    showQrModal: true,
    chains: [chainId],
    methods: ['eth_sendTransaction', 'eth_signTransaction', 'eth_sign', 'personal_sign', 'eth_signTypedData'],
    events: ['chainChanged', 'accountsChanged'],
    metadata: {
      name: 'AutoPayAI',
      description: 'Delegation signing via WalletConnect',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://auto-pay-ai.vercel.app/',
      icons: ['https://auto-pay-ai.vercel.app/'],
    },
  });

  // Wait for connection (opens QR modal if needed)
  console.log('🔗 Opening WalletConnect QR modal...');
  await provider.enable();

  // Get the chain configuration
  const chain = getChainById(chainId);

  const walletClient = createWalletClient({
    chain: chain,
    transport: custom(provider),
  });

  // Get accounts to verify connection
  const accounts = await walletClient.getAddresses();
  console.log('✅ WalletConnect connected:', accounts[0]);
  
  return walletClient;
}

/**
 * Get chain configuration by chain ID
 */
function getChainById(chainId: number) {
  switch (chainId) {
    case 1: return mainnet;
    case 11155111: return sepolia;
    case 137: return polygon;
    case 80001: return polygon; // fallback for Mumbai
    case 42161: return arbitrum;
    case 421613: return arbitrum; // fallback for Arbitrum Goerli
    case 10: return optimism;
    case 420: return optimism; // fallback for Optimism Goerli
    case 8453: return base;
    case 84531: return base; // fallback for Base Goerli
    default: return mainnet;
  }
}

/**
 * Check if WalletConnect is already connected
 */
export async function isWalletConnectConnected(): Promise<boolean> {
  try {
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    if (!projectId) return false;

    const provider = await EthereumProvider.init({
      projectId,
      showQrModal: false, // Don't show modal for check
      chains: [1],
    });

    return provider.connected;
  } catch {
    return false;
  }
}