import { 
    getDeleGatorEnvironment,
    createDelegation,
    createCaveatBuilder,
    signDelegation,
    redeemDelegations,
    createExecution,
    getDelegationHashOffchain,
    type DeleGatorEnvironment,
    type Delegation,
    type Redemption,
    type ExecutionStruct
  } from '@metamask/delegation-utils';
  import { createWalletClient, custom, type WalletClient, createPublicClient, http, type Address, type Account } from 'viem';
  import { monadTestnet } from './wagmi-config';
  
  export interface DelegationResult {
    success: boolean;
    transactionHash?: string;
    delegationId?: string;
    error?: string;
    delegation?: Delegation;
  }
  
  export class DelegationService {
    private walletClient: WalletClient | null = null;
    private publicClient: any = null;
    private account: Account | null = null;
  
    async initialize(): Promise<boolean> {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask is not installed');
      }
  
      this.walletClient = createWalletClient({
        transport: custom(window.ethereum),
        chain: monadTestnet
      });
  
      this.publicClient = createPublicClient({
        chain: monadTestnet,
        transport: http()
      });
  
      const [address] = await this.walletClient.getAddresses();
      if (!address) {
        throw new Error('No accounts found');
      }
  
      // Get the account with proper typing
      this.account = {
        address: address as `0x${string}`,
        type: 'json-rpc' as const
      };
  
      return true;
    }
  
    async setupAutomationDelegation(automation: any): Promise<DelegationResult> {
      try {
        if (!this.walletClient || !this.account) {
          await this.initialize();
        }
  
        const environment = getDeleGatorEnvironment(10143);
  
        const caveatBuilder = createCaveatBuilder(environment);
        const caveats = this.buildAutomationCaveats(caveatBuilder, automation);
        
        const delegation = createDelegation({
          from: this.account!.address,
          to: await this.getDelegateAddress(automation.type),
          caveats: caveats
        });
  
        // Create a properly typed signer object with guaranteed account
        const signer = {
          ...this.walletClient!,
          account: this.account!,
        };
    
        const signature = await signDelegation({
            signer: signer as any, // Use type assertion to bypass strict typing
            delegation: delegation,
            delegationManager: environment.DelegationManager,
            chainId: 10143,
            name: 'AutoPayAI',
            version: '1.0.0'
        });
  
        const signedDelegation: Delegation = { ...delegation, signature };
  
        // Submit the delegation on-chain using redeemDelegations
        const transactionHash = await this.submitDelegation(signedDelegation, environment);
        
        return {
          success: true,
          transactionHash,
          delegationId: getDelegationHashOffchain(signedDelegation),
          delegation: signedDelegation
        };
  
      } catch (error) {
        console.error('Delegation setup failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Delegation setup failed'
        };
      }
    }
  
    async checkDelegationStatus(delegationId: string): Promise<boolean> {
      try {
        if (!this.publicClient) {
          await this.initialize();
        }
  
        const environment = getDeleGatorEnvironment(10143);
        
        const isActive = await this.publicClient.readContract({
          address: environment.DelegationManager as Address,
          abi: [{
            inputs: [{ name: 'delegationHash', type: 'bytes32' }],
            name: 'isDelegationActive',
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'view',
            type: 'function'
          }],
          functionName: 'isDelegationActive',
          args: [delegationId as `0x${string}`]
        });
  
        return isActive as boolean;
  
      } catch (error) {
        console.error('Failed to check delegation status:', error);
        return false;
      }
    }
  
    async executeAutomation(delegation: Delegation, automation: any): Promise<DelegationResult> {
      try {
        if (!this.walletClient || !this.account) {
          await this.initialize();
        }
  
        const environment = getDeleGatorEnvironment(10143);
        
        const execution = this.createExecutionForAutomation(automation);
        
        const redemption: Redemption = {
          permissionContext: [delegation],
          executions: [execution],
          mode: '0x0000000000000000000000000000000000000000000000000000000000000000' as const
        };
  
        // Create signer with guaranteed account
        const signer = {
          ...this.walletClient!,
          account: this.account!,
        };
  
        const transactionHash = await redeemDelegations(
          signer as any, // Use type assertion
          this.publicClient,
          environment.DelegationManager as Address,
          [redemption]
        );
  
        return {
          success: true,
          transactionHash,
          delegationId: getDelegationHashOffchain(delegation)
        };
  
      } catch (error) {
        console.error('Automation execution failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Automation execution failed'
        };
      }
    }
  
    private buildAutomationCaveats(caveatBuilder: any, automation: any) {
      const { type, params } = automation;
      
      switch (type) {
        case 'recurring_payment':
          const amountWei = BigInt(Math.floor(parseFloat(params.amount || '0') * 1e18));
          return caveatBuilder
            .allowedTargets([params.recipient as `0x${string}`])
            .nativeTokenTransferAmount(amountWei)
            .timestamp(
              Math.floor(Date.now() / 1000),
              Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
            )
            .build();
        
        case 'reward_claim':
          const contract = (params.contractAddress || '0xStakingContract') as `0x${string}`;
          return caveatBuilder
            .allowedTargets([contract])
            .allowedMethods(['claimRewards()'])
            .timestamp(
              Math.floor(Date.now() / 1000),
              Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
            )
            .build();
        
        default:
          return caveatBuilder
            .timestamp(
              Math.floor(Date.now() / 1000),
              Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
            )
            .build();
      }
    }
  
    private createExecutionForAutomation(automation: any): ExecutionStruct {
      switch (automation.type) {
        case 'recurring_payment':
          const amountWei = BigInt(Math.floor(parseFloat(automation.params.amount || '0') * 1e18));
          return createExecution(
            automation.params.recipient as `0x${string}`,
            amountWei,
            '0x'
          );
        
        case 'reward_claim':
          // Encode claimRewards function call
          const claimRewardsData = '0x4e71d92d'; // claimRewards() function selector
          return createExecution(
            (automation.params.contractAddress || '0xStakingContract') as `0x${string}`,
            BigInt(0),
            claimRewardsData as `0x${string}`
          );
        
        default:
          return createExecution(
            '0x0000000000000000000000000000000000000000' as `0x${string}`,
            BigInt(0),
            '0x'
          );
      }
    }
  
    private async submitDelegation(delegation: Delegation, environment: DeleGatorEnvironment): Promise<string> {
      // Create a redemption that stores the delegation on-chain
      const redemption: Redemption = {
        permissionContext: [delegation],
        executions: [createExecution(
          environment.DelegationManager as `0x${string}`,
          BigInt(0),
          '0x' // No execution, just storing delegation
        )],
        mode: '0x0000000000000000000000000000000000000000000000000000000000000000' as const
      };
  
      // Create signer with guaranteed account
      const signer = {
        ...this.walletClient!,
        account: this.account!,
      };
  
      const transactionHash = await redeemDelegations(
        signer as any, // Use type assertion
        this.publicClient,
        environment.DelegationManager as Address,
        [redemption]
      );
  
      return transactionHash;
    }
  
    private async getDelegateAddress(automationType: string): Promise<`0x${string}`> {
      return this.account!.address;
    }
}