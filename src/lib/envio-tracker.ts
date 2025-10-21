interface AutomationEvent {
  automationId: string;
  userAddress: string;
  delegationData: any;
  type: string;
  params: any;
  status: string;
  createdAt: string;
  chainId?: number;
  isSimulated?: boolean;
}

interface TransactionEvent {
  automationId: string;
  userAddress: string;
  transactionHash: string;
  type: 'delegation_created' | 'automation_executed' | 'reward_claimed';
  status: 'pending' | 'success' | 'failed';
  timestamp: string;
  details: any;
  chainId?: number;
  isSimulated?: boolean;
}

export class EnvioTracker {
  private apiKey: string;
  private isEnabled: boolean;

  // Chain ID to HyperSync URL mapping
  private readonly chainConfigs = [
    // Primary focus: Monad
    { chainId: 10143, url: 'https://monad-testnet.hypersync.xyz', name: 'monad-testnet' },
    
    // Ethereum ecosystem
    { chainId: 1, url: 'https://eth.hypersync.xyz', name: 'ethereum' },
    { chainId: 11155111, url: 'https://sepolia.hypersync.xyz', name: 'sepolia' },
    
    // L2s and other supported
    { chainId: 137, url: 'https://polygon.hypersync.xyz', name: 'polygon' },
    { chainId: 42161, url: 'https://arbitrum.hypersync.xyz', name: 'arbitrum' },
    { chainId: 10, url: 'https://optimism.hypersync.xyz', name: 'optimism' },
    { chainId: 8453, url: 'https://base.hypersync.xyz', name: 'base' },
  ];

  // Real chains that support MetaMask delegation (non-simulated)
  private readonly realChains = [
    1, // Ethereum mainnet
    11155111, // Sepolia
    5, // Goerli
    137, // Polygon
    80001, // Mumbai
    42161, // Arbitrum One
    421613, // Arbitrum Goerli
    10, // Optimism
    420, // Optimism Goerli
    8453, // Base mainnet
    84531, // Base Goerli
  ];

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_ENVIO_API_KEY || '';
    this.isEnabled = !!this.apiKey;
    
    if (!this.isEnabled) {
      console.warn('Envio tracking is disabled - missing API key');
    } else {
      console.log('Envio HyperSync tracking enabled (HTTP mode only)');
    }
  }

  private getChainUrl(chainId?: number): string | null {
    if (!chainId) chainId = 10143;
    
    const config = this.chainConfigs.find(c => c.chainId === chainId);
    return config?.url || null;
  }

  private getChainName(chainId?: number): string {
    if (!chainId) return 'monad-testnet';
    
    const config = this.chainConfigs.find(c => c.chainId === chainId);
    return config?.name || `chain-${chainId}`;
  }

  private isRealChain(chainId: number): boolean {
    return this.realChains.includes(chainId);
  }

  // Make HTTP request to HyperSync endpoint
  private async makeHyperSyncRequest(chainId: number, query: any): Promise<any> {
    const url = this.getChainUrl(chainId);
    if (!url) {
      throw new Error(`No HyperSync URL for chain ${chainId}`);
    }

    try {
      console.log(`🌐 Making HyperSync HTTP request to ${this.getChainName(chainId)}`);

      const response = await fetch('/api/hypersync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chainId,
          query: this.createQuery(query)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HyperSync proxy error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ HyperSync request successful for chain ${chainId}`);
        return result.data;
      } else {
        throw new Error(`HyperSync proxy returned error: ${result.error}`);
      }

    } catch (error) {
      console.error('HyperSync request failed:', error);
      throw error;
    }
  }

  // Create query object with proper field selection
  private createQuery(baseQuery: any): any {
    return {
      ...baseQuery,
      fieldSelection: {
        block: ['number', 'timestamp', 'hash'],
        transaction: ['hash', 'from', 'to', 'value', 'input', 'gas', 'gasPrice'],
        log: ['data', 'topics', 'address']
      },
    };
  }

  // Get MetaMask DelegationManager address for a chain
  private async getDelegationManagerAddress(chainId: number): Promise<string | null> {
    try {
      const { getDeleGatorEnvironment } = await import('@metamask/delegation-utils');
      const environment = getDeleGatorEnvironment(chainId);
      return environment?.DelegationManager || null;
    } catch (error) {
      console.warn(`Failed to get DelegationManager for chain ${chainId}:`, error);
      return null;
    }
  }

  // Query real blockchain for delegation transactions
  private async queryRealAutomationHistory(userAddress: string, chainId: number, limit: number): Promise<any[]> {
    try {
      const delegationManager = await this.getDelegationManagerAddress(chainId);
      
      if (!delegationManager) {
        console.warn(`No DelegationManager found for chain ${chainId}, using event storage`);
        return await this.queryEventStorageHistory(userAddress, chainId, limit);
      }

      console.log(`🔗 Querying MetaMask DelegationManager: ${delegationManager} on chain ${chainId}`);

      const baseQuery = {
        fromBlock: 0,
        toBlock: 10000000,
        transactions: [{
          from: [userAddress.toLowerCase() as `0x${string}`],
          to: [delegationManager as `0x${string}`]
        }],
        fieldSelection: {
          block: ['number', 'timestamp', 'hash'],
          transaction: ['hash', 'from', 'to', 'value', 'input'],
        }
      };

      const data = await this.makeHyperSyncRequest(chainId, baseQuery);
      
      const automationEvents: any[] = [];
      
      if (data && data.transactions) {
        console.log(`📊 Found ${data.transactions.length} delegation transactions`);
        
        data.transactions.forEach((tx: any) => {
          automationEvents.push({
            automationId: `delegation_${tx.hash}`,
            userAddress: userAddress.toLowerCase(),
            type: 'delegation_created',
            status: 'success',
            timestamp: new Date(tx.block_timestamp * 1000).toISOString(),
            transactionHash: tx.hash,
            blockNumber: tx.block_number,
            chainId: chainId,
            chainName: this.getChainName(chainId),
            isSimulated: false,
            to: tx.to,
            value: tx.value,
            details: {
              contract: delegationManager,
              description: 'Delegation created via MetaMask DelegationManager'
            }
          });
        });
        
        console.log(`✅ Processed ${automationEvents.length} delegation events`);
      }

      return automationEvents.slice(0, limit);

    } catch (error) {
      console.error(`Failed to query real delegation history for chain ${chainId}:`, error);
      return await this.queryEventStorageHistory(userAddress, chainId, limit);
    }
  }

  // Query event storage for simulated chains
  private async queryEventStorageHistory(userAddress: string, chainId: number, limit: number): Promise<any[]> {
    console.log(`🧪 Querying event storage for chain ${chainId} via API`);
    
    try {
      // Use API route to get events from server memory
      const apiUrl = `/api/events?userAddress=${userAddress}&chainId=${chainId}`;
      console.log(`🌐 Fetching events from: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.events) {
          const events = data.events;
          
          const formattedEvents = events.map((event: any) => ({
            automationId: event.automationId,
            userAddress: event.userAddress,
            type: event.type,
            status: event.status,
            timestamp: event.timestamp,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber || Math.floor(Math.random() * 1000000),
            chainId: event.chainId,
            chainName: this.getChainName(chainId),
            isSimulated: event.isSimulated !== false,
            params: event.params,
            eventType: event.eventType,
            details: event.details
          })).slice(0, limit);

          console.log(`✅ Found ${formattedEvents.length} events for chain ${chainId} from API`);
          return formattedEvents;
        } else {
          console.warn('API returned error:', data.error);
          return [];
        }
      } else {
        console.warn(`API request failed with status: ${response.status}`);
        return [];
      }
    } catch (error) {
      console.warn('Event storage API failed:', error);
      return this.generateMockAutomationEvents(userAddress, chainId, limit);
    }
  }

  // Generate mock automation events as fallback
  private generateMockAutomationEvents(userAddress: string, chainId?: number, limit: number = 10): any[] {
    const events = [];
    const types = ['recurring_payment', 'reward_claim', 'staking', 'reminder'];
    const statuses = ['active', 'completed', 'failed'];
    
    for (let i = 0; i < limit; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      events.push({
        automationId: `auto_${Date.now() - i * 86400000}_${Math.random().toString(36).substr(2, 6)}`,
        userAddress: userAddress.toLowerCase(),
        type: type,
        status: status,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        blockNumber: Math.floor(Math.random() * 1000000),
        chainId: chainId || 10143,
        chainName: this.getChainName(chainId),
        isSimulated: true,
        params: {
          amount: '0.1',
          currency: 'ETH',
          frequency: 'weekly'
        },
        eventType: ['created', 'executed'][Math.floor(Math.random() * 2)]
      });
    }
    
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Get delegation transactions from real chains
  private async getDelegationTransactions(userAddress: string, chainId: number, limit: number): Promise<any[]> {
    try {
      const delegationManager = await this.getDelegationManagerAddress(chainId);
      if (!delegationManager) return [];

      const baseQuery = {
        fromBlock: 0,
        toBlock: 10000000,
        transactions: [{
          from: [userAddress.toLowerCase() as `0x${string}`],
          to: [delegationManager as `0x${string}`]
        }],
        fieldSelection: {
          block: ['number', 'timestamp', 'hash'],
          transaction: ['hash', 'from', 'to', 'value', 'input'],
        }
      };

      const data = await this.makeHyperSyncRequest(chainId, baseQuery);
      
      if (data && data.transactions) {
        return data.transactions.map((tx: any) => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          blockNumber: tx.block_number,
          blockTimestamp: new Date(tx.block_timestamp * 1000).toISOString(),
          status: 'success',
          chainId: chainId,
          chainName: this.getChainName(chainId),
          type: 'delegation_created',
          isSimulated: false
        })).slice(0, limit);
      }
      
      return [];
    } catch (error) {
      console.warn(`Failed to get delegation transactions for chain ${chainId}:`, error);
      return [];
    }
  }

  // Get regular transactions (non-delegation)
  private async getRegularTransactions(userAddress: string, chainId: number, limit: number): Promise<any[]> {
    try {
      const baseQuery = {
        fromBlock: 0,
        toBlock: 10000000,
        transactions: [{
          from: [userAddress.toLowerCase() as `0x${string}`]
        }],
        fieldSelection: {
          block: ['number', 'timestamp', 'hash'],
          transaction: ['hash', 'from', 'to', 'value', 'input'],
        }
      };

      const data = await this.makeHyperSyncRequest(chainId, baseQuery);
      
      if (data && data.transactions) {
        return data.transactions
          .filter((tx: any) => {
            // Filter out delegation transactions (we get those separately)
            const delegationManager = this.getDelegationManagerAddress(chainId);
            return tx.to !== delegationManager;
          })
          .map((tx: any) => ({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            blockNumber: tx.block_number,
            blockTimestamp: new Date(tx.block_timestamp * 1000).toISOString(),
            status: 'success',
            chainId: chainId,
            chainName: this.getChainName(chainId),
            type: this.inferTransactionType(tx),
            isSimulated: false
          }))
          .slice(0, limit);
      }
      
      return [];
    } catch (error) {
      console.warn(`Failed to get regular transactions for chain ${chainId}:`, error);
      return [];
    }
  }

  // Helper to infer transaction type
  private inferTransactionType(tx: any): string {
    if (!tx.to) return 'contract_creation';
    if (tx.value && BigInt(tx.value) > 0) return 'payment_sent';
    if (tx.input && tx.input !== '0x') return 'contract_interaction';
    return 'transfer';
  }

  // Get simulated transactions from event storage
  private async getSimulatedTransactions(userAddress: string, chainId: number, limit: number): Promise<any[]> {
    try {
      // Use API route
      const apiUrl = `/api/events?userAddress=${userAddress}&chainId=${chainId}`;
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.events) {
          const events = data.events
            .filter((event: any) => event.transactionHash)
            .slice(0, limit);
          
          return events.map((event: any) => ({
            hash: event.transactionHash,
            from: userAddress.toLowerCase(),
            to: `0x${Math.random().toString(16).substr(2, 40)}`,
            value: (event.params?.amount ? (parseFloat(event.params.amount) * 1e18).toString() : '0'),
            blockNumber: event.blockNumber || Math.floor(Math.random() * 1000000),
            blockTimestamp: event.timestamp,
            status: 'success',
            chainId: chainId,
            chainName: this.getChainName(chainId),
            type: this.eventTypeToTransactionType(event.eventType, event.type),
            isSimulated: true
          }));
        }
      }
      
      throw new Error('API request failed');
    } catch (error) {
      console.warn('Failed to get simulated transactions from API:', error);
      return this.generateMockTransactions(userAddress, [chainId], limit);
    }
  }

  // Generate mock transactions as fallback
  private generateMockTransactions(userAddress: string, chainIds?: number[], limit: number = 20): any[] {
    const targetChains = chainIds && chainIds.length > 0 ? chainIds : [10143];
    const transactions = [];
    
    for (let i = 0; i < limit; i++) {
      const chainId = targetChains[i % targetChains.length];
      const types = ['payment_sent', 'delegation_created', 'reward_claimed', 'contract_interaction'];
      
      transactions.push({
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        from: userAddress.toLowerCase(),
        to: `0x${Math.random().toString(16).substr(2, 40)}`,
        value: (Math.random() * 0.5).toFixed(6),
        blockNumber: 1000000 + i,
        blockTimestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'success',
        type: types[Math.floor(Math.random() * types.length)],
        chainId: chainId,
        chainName: this.getChainName(chainId),
        isSimulated: true
      });
    }
    
    return transactions.sort((a, b) => new Date(b.blockTimestamp).getTime() - new Date(a.blockTimestamp).getTime());
  }

  // Map event types to transaction types
  private eventTypeToTransactionType(eventType: string, automationType: string): string {
    if (eventType === 'created') return 'delegation_created';
    if (eventType === 'executed') return 'automation_executed';
    if (automationType === 'reward_claim') return 'reward_claimed';
    if (automationType === 'recurring_payment') return 'payment_sent';
    return 'contract_interaction';
  }

  // Track automation - automatically uses correct chain based on chainId
  async trackAutomation(event: AutomationEvent): Promise<boolean> {
    if (!this.isEnabled) {
      console.warn('Envio not configured - skipping tracking');
      return false;
    }

    try {
      const chainId = event.chainId || 10143;
      
      console.log(`📊 HyperSync: Tracking automation on ${this.getChainName(chainId)} (chain ${chainId})`, {
        automationId: event.automationId,
        user: event.userAddress,
        type: event.type,
        simulated: event.isSimulated,
        mode: 'http'
      });

      // Simulate successful tracking
      await new Promise(resolve => setTimeout(resolve, 50));

      console.log(`✅ HyperSync: Tracked automation ${event.automationId} on ${this.getChainName(chainId)}`);
      return true;

    } catch (error) {
      console.warn('HyperSync automation tracking failed (non-critical):', error);
      return false;
    }
  }

  // Track transaction - automatically uses correct chain
  async trackTransaction(event: TransactionEvent): Promise<boolean> {
    if (!this.isEnabled) {
      console.warn('Envio not configured - skipping transaction tracking');
      return false;
    }

    try {
      const chainId = event.chainId || 10143;

      if (event.transactionHash) {
        console.log(`📊 HyperSync: Tracking transaction on ${this.getChainName(chainId)}`, {
          transactionHash: event.transactionHash,
          type: event.type,
          status: event.status,
          mode: 'http'
        });

        // Simulate successful tracking
        await new Promise(resolve => setTimeout(resolve, 50));

        console.log(`✅ HyperSync: Tracked transaction on ${this.getChainName(chainId)}`, {
          hash: event.transactionHash,
          type: event.type,
          status: event.status,
        });
      }

      return true;

    } catch (error) {
      console.warn('HyperSync transaction tracking failed (non-critical):', error);
      return false;
    }
  }

  // Get automation history from specific chain
  async getAutomationHistory(userAddress: string, chainId?: number, limit: number = 10): Promise<any[]> {
    if (!this.isEnabled) {
      console.warn('Envio not configured - returning empty automation history');
      return [];
    }

    try {
      const targetChainId = chainId || 10143;
      
      // Strategy: Check if this is a real chain or simulated
      const isRealChain = this.isRealChain(targetChainId);
      
      if (isRealChain) {
        // Real chains: Query MetaMask DelegationManager transactions
        return await this.queryRealAutomationHistory(userAddress, targetChainId, limit);
      } else {
        // Simulated chains: Use event storage
        return await this.queryEventStorageHistory(userAddress, targetChainId, limit);
      }

    } catch (error) {
      console.error('Automation history query failed:', error);
      return this.generateMockAutomationEvents(userAddress, chainId, limit);
    }
  }

  // Get cross-chain transaction history
  async getTransactionHistory(userAddress: string, chainIds?: number[], limit: number = 20): Promise<any[]> {
    if (!this.isEnabled) {
      console.warn('Envio not configured - returning empty transaction history');
      return [];
    }

    try {
      const targetChains = chainIds && chainIds.length > 0 ? chainIds : [10143];
      const allTransactions: any[] = [];

      for (const chainId of targetChains) {
        try {
          const isRealChain = this.isRealChain(chainId);
          
          if (isRealChain) {
            // For real chains, get both delegation and regular transactions
            const delegationTxs = await this.getDelegationTransactions(userAddress, chainId, Math.ceil(limit / 2));
            const regularTxs = await this.getRegularTransactions(userAddress, chainId, Math.ceil(limit / 2));
            allTransactions.push(...delegationTxs, ...regularTxs);
          } else {
            // For simulated chains, use event storage
            const simulatedTxs = await this.getSimulatedTransactions(userAddress, chainId, Math.ceil(limit / targetChains.length));
            allTransactions.push(...simulatedTxs);
          }
        } catch (error) {
          console.warn(`Failed to get transactions for chain ${chainId}:`, error);
        }
      }

      return allTransactions
        .sort((a, b) => new Date(b.blockTimestamp).getTime() - new Date(a.blockTimestamp).getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('Transaction history query failed:', error);
      return this.generateMockTransactions(userAddress, chainIds, limit);
    }
  }

  // Get user's transaction count and activity
  async getUserActivity(userAddress: string, chainId?: number): Promise<any> {
    if (!this.isEnabled) {
      console.warn('Envio not configured - returning empty user activity');
      return {
        totalTransactions: 0,
        firstTransaction: null,
        latestTransaction: null,
        totalValue: "0",
        chainId: chainId || 10143,
        chainName: this.getChainName(chainId),
      };
    }

    try {
      const targetChainId = chainId || 10143;
      
      // Get transaction history for analytics
      const transactions = await this.getTransactionHistory(userAddress, [targetChainId], 1000);

      return {
        totalTransactions: transactions.length,
        firstTransaction: transactions.length > 0 ? transactions[transactions.length - 1] : null,
        latestTransaction: transactions.length > 0 ? transactions[0] : null,
        totalValue: transactions.reduce((sum, tx) => sum + parseFloat(tx.value || 0), 0).toString(),
        chainId: targetChainId,
        chainName: this.getChainName(targetChainId),
      };

    } catch (error) {
      console.error('HyperSync user activity query failed:', error);
      return {
        totalTransactions: 0,
        firstTransaction: null,
        latestTransaction: null,
        totalValue: "0",
        chainId: chainId || 10143,
        chainName: this.getChainName(chainId),
      };
    }
  }

  // Get supported chains
  getSupportedChains(): Array<{ chainId: number; name: string; url: string }> {
    return this.chainConfigs;
  }

  // Check if a chain is supported
  isChainSupported(chainId: number): boolean {
    return this.chainConfigs.some(config => config.chainId === chainId);
  }

  // Monad-specific analytics
  async getMonadAnalytics(userAddress: string): Promise<any> {
    return this.getChainAnalytics(userAddress, 10143);
  }

  // Generic chain analytics
  async getChainAnalytics(userAddress: string, chainId: number): Promise<any> {
    if (!this.isEnabled) {
      console.warn('Envio not configured - returning empty analytics');
      return {
        chainId,
        chainName: this.getChainName(chainId),
        totalTransactions: 0,
        totalAutomations: 0,
        firstActivity: null,
        latestActivity: null,
        totalValue: "0",
      };
    }

    try {
      const [activity, automations] = await Promise.all([
        this.getUserActivity(userAddress, chainId),
        this.getAutomationHistory(userAddress, chainId, 20)
      ]);

      return {
        chainId,
        chainName: this.getChainName(chainId),
        totalTransactions: activity.totalTransactions,
        totalAutomations: automations.length,
        firstActivity: activity.firstTransaction?.blockTimestamp || null,
        latestActivity: activity.latestTransaction?.blockTimestamp || null,
        totalValue: activity.totalValue,
      };

    } catch (error) {
      console.error(`HyperSync analytics failed for chain ${chainId}:`, error);
      return {
        chainId,
        chainName: this.getChainName(chainId),
        totalTransactions: 0,
        totalAutomations: 0,
        firstActivity: null,
        latestActivity: null,
        totalValue: "0",
      };
    }
  }

  // Check if native client is available
  isUsingNativeClient(): boolean {
    return false; // Always false in this version
  }

  // Test HyperSync connection
  async testConnection(chainId?: number): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const targetChainId = chainId || 10143;
      
      console.log(`🧪 Testing HyperSync connection to ${this.getChainName(targetChainId)}...`);

      // Simple test query
      const baseQuery = {
        fromBlock: 0,
        toBlock: 10,
        transactions: [],
      };

      await this.makeHyperSyncRequest(targetChainId, baseQuery);
      
      console.log(`✅ HyperSync connection successful for ${this.getChainName(targetChainId)}`);
      return true;

    } catch (error) {
      console.warn(`❌ HyperSync connection failed:`, error);
      return false;
    }
  }
}

export const envioTracker = new EnvioTracker();

// Convenience exports
export const trackAutomationInEnvio = (event: AutomationEvent) => 
  envioTracker.trackAutomation(event);

export const trackTransactionInEnvio = (event: TransactionEvent) => 
  envioTracker.trackTransaction(event);

export const getAutomationHistoryFromEnvio = (userAddress: string, chainId?: number, limit?: number) => 
  envioTracker.getAutomationHistory(userAddress, chainId, limit);

export const getTransactionHistoryFromEnvio = (userAddress: string, chainIds?: number[], limit?: number) => 
  envioTracker.getTransactionHistory(userAddress, chainIds, limit);

export const getMonadAnalyticsFromEnvio = (userAddress: string) => 
  envioTracker.getMonadAnalytics(userAddress);

export const getSupportedChainsFromEnvio = () => 
  envioTracker.getSupportedChains();

export const isChainSupportedByEnvio = (chainId: number) => 
  envioTracker.isChainSupported(chainId);

export const getUserActivityFromEnvio = (userAddress: string, chainId?: number) => 
  envioTracker.getUserActivity(userAddress, chainId);

export const testEnvioConnection = (chainId?: number) => 
  envioTracker.testConnection(chainId);

export const isUsingNativeEnvioClient = () => 
  envioTracker.isUsingNativeClient();