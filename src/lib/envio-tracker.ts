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
  private hyperSyncUrl: string;
  private apiKey: string;

  constructor() {
    this.hyperSyncUrl = process.env.NEXT_PUBLIC_ENVIO_HYPERSYNC_URL || '';
    this.apiKey = process.env.ENVIO_API_KEY || '';
  }

  async trackAutomation(event: AutomationEvent): Promise<boolean> {
    try {
      if (!this.hyperSyncUrl || !this.apiKey) {
        console.warn('Envio not configured - skipping tracking');
        return false;
      }

      // Determine chain name based on chainId
      const chainName = this.getChainName(event.chainId);

      const response = await fetch(`${this.hyperSyncUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          event: 'automation_created',
          data: event,
          chain: chainName,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Envio API error: ${response.status}`);
      }

      return true;

    } catch (error) {
      console.error('Envio tracking failed:', error);
      return false;
    }
  }

  async trackTransaction(event: TransactionEvent): Promise<boolean> {
    try {
      if (!this.hyperSyncUrl || !this.apiKey) {
        console.warn('Envio not configured - skipping tracking');
        return false;
      }

      // Determine chain name based on chainId
      const chainName = this.getChainName(event.chainId);

      const response = await fetch(`${this.hyperSyncUrl}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          event: 'transaction_executed',
          data: event,
          chain: chainName,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Envio API error: ${response.status}`);
      }

      return true;

    } catch (error) {
      console.error('Envio transaction tracking failed:', error);
      return false;
    }
  }

  // Helper method to get chain name from chainId
  private getChainName(chainId?: number): string {
    if (!chainId) return 'monad-testnet';
    
    switch (chainId) {
      case 10143: return 'monad-testnet';
      case 11155111: return 'sepolia';
      case 1: return 'ethereum';
      case 5: return 'goerli';
      case 137: return 'polygon';
      case 80001: return 'mumbai';
      case 42161: return 'arbitrum';
      case 421613: return 'arbitrum-goerli';
      case 10: return 'optimism';
      case 420: return 'optimism-goerli';
      case 8453: return 'base';
      case 84531: return 'base-goerli';
      default: return `chain-${chainId}`;
    }
  }

  async getAutomationHistory(userAddress: string, limit: number = 10): Promise<any[]> {
    try {
      if (!this.hyperSyncUrl || !this.apiKey) {
        throw new Error('Envio not configured');
      }

      const query = {
        query: `
          query GetAutomationHistory($userAddress: String!, $limit: Int!) {
            automationEvents(
              where: { userAddress: $userAddress }
              orderBy: timestamp
              orderDirection: desc
              limit: $limit
            ) {
              automationId
              userAddress
              type
              status
              timestamp
              transactionHash
              params
              chainId
              isSimulated
            }
          }
        `,
        variables: { userAddress, limit }
      };

      const response = await fetch(this.hyperSyncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(query)
      });

      if (!response.ok) {
        throw new Error(`Envio query failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`Envio query errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data?.automationEvents || [];

    } catch (error) {
      console.error('Envio query failed:', error);
      throw error;
    }
  }

  async getAutomationStatus(automationId: string, userAddress: string): Promise<any> {
    try {
      if (!this.hyperSyncUrl || !this.apiKey) {
        throw new Error('Envio not configured');
      }

      const query = {
        query: `
          query GetAutomationStatus($automationId: String!, $userAddress: String!) {
            automationStates(
              where: { 
                automationId: $automationId 
                userAddress: $userAddress 
              }
              orderBy: timestamp
              orderDirection: desc
              limit: 1
            ) {
              status
              lastExecuted
              nextExecution
              transactionHash
              blockNumber
              chainId
              isSimulated
            }
          }
        `,
        variables: { automationId, userAddress }
      };

      const response = await fetch(this.hyperSyncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(query)
      });

      if (!response.ok) {
        throw new Error(`Envio status query failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`Envio status query errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data?.automationStates[0] || { status: 'unknown' };

    } catch (error) {
      console.error('Envio status query failed:', error);
      throw error;
    }
  }

  async getTransactionHistory(userAddress: string, limit: number = 20): Promise<any[]> {
    try {
      if (!this.hyperSyncUrl || !this.apiKey) {
        throw new Error('Envio not configured');
      }

      const query = {
        query: `
          query GetTransactionHistory($userAddress: String!, $limit: Int!) {
            transactions(
              where: { from: $userAddress }
              orderBy: blockTimestamp
              orderDirection: desc
              limit: $limit
            ) {
              hash
              from
              to
              value
              blockNumber
              blockTimestamp
              status
              chainId
            }
          }
        `,
        variables: { userAddress, limit }
      };

      const response = await fetch(this.hyperSyncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(query)
      });

      if (!response.ok) {
        throw new Error(`Envio transaction query failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`Envio transaction query errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data?.transactions || [];

    } catch (error) {
      console.error('Envio transaction query failed:', error);
      throw error;
    }
  }
}

export const envioTracker = new EnvioTracker();

export const trackAutomationInEnvio = (event: AutomationEvent) => 
  envioTracker.trackAutomation(event);

export const trackTransactionInEnvio = (event: TransactionEvent) => 
  envioTracker.trackTransaction(event);

export const getAutomationHistoryFromEnvio = (userAddress: string, limit?: number) => 
  envioTracker.getAutomationHistory(userAddress, limit);

export const getAutomationStatusFromEnvio = (automationId: string, userAddress: string) => 
  envioTracker.getAutomationStatus(automationId, userAddress);

export const getTransactionHistoryFromEnvio = (userAddress: string, limit?: number) => 
  envioTracker.getTransactionHistory(userAddress, limit);