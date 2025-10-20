AutoPay AI 🤖
=============

A revolutionary AI-powered automation platform for blockchain transactions and smart contract interactions. Create, manage, and execute automated blockchain operations with natural language commands.

🌟 Features
-----------

### 🤖 AI-Powered Automation

-   **Natural Language Processing**: Create automations using plain English

-   **Smart Intent Recognition**: AI understands your automation needs

-   **Automated Parameter Extraction**: AI extracts relevant parameters from your requests

### 🔗 Multi-Chain Support

-   **Monad Testnet**: Primary testing environment with simulated delegations

-   **Ethereum Sepolia**: Real on-chain delegations

-   **Polygon, Arbitrum, Optimism, Base**: Additional supported chains

-   **Chain-Agnostic Architecture**: Easy to add new blockchain networks

Important Note: Monad Testnet uses simulated delegations because MetaMask's delegation system doesn't currently support the Monad network. This allows you to test automation workflows safely without real transactions, while other supported chains use actual on-chain delegations.

### ⚡ Automation Types

-   **💰 Recurring Payments**: Automated periodic transfers

-   **🎁 Reward Claims**: Automatic staking reward collection

-   **⚡ Staking Operations**: Automated staking and delegation

-   **⏰ Smart Reminders**: Notification-based automations

### 🛡️ Security & Delegation

-   **MetaMask Delegation**: Secure smart contract delegations

-   **Simulation Mode**: Safe testing environment for unsupported chains

-   **Transaction Signing**: Secure cryptographic signatures

-   **WalletConnect Integration**: Enhanced wallet compatibility

### 📊 Advanced Analytics

-   **Multi-Chain History**: View activity across all supported chains

-   **Real-time Tracking**: Live transaction and event monitoring

-   **Envio Integration**: High-performance blockchain data indexing

-   **Smart Dashboard**: Intuitive visualization of automation performance

🚀 Quick Start
--------------

### Prerequisites

-   Node.js 18+

-   npm or yarn

-   MetaMask wallet

-   Envio API key (optional)

### Installation

1.  **Clone the repository**

```bash

git clone https://github.com/your-username/autopay-ai.git
cd autopay-ai

```

1.  **Install dependencies**

```bash

npm install

```

1.  **Set up environment variables**

``` bash

cp .env.example .env.local

```

Edit `.env.local`:

``` env

ENVIO_API_KEY=your_envio_api_key_here

```

1.  **Run the development server**

``` bash

npm run dev

```

1.  **Open your browser**

``` text

http://localhost:3000

```

🏗️ Architecture
----------------

### Core Components

#### Frontend (Next.js 14)

-   **React 18** with TypeScript

-   **Wagmi V2** for blockchain interactions

-   **Tailwind CSS** for styling

-   **Real-time updates** with WebSocket events

#### Backend (Next.js API Routes)

-   **AI Processing**: `/api/ai/parse` - Natural language to automation

-   **Automation Management**: `/api/automations` - CRUD operations

-   **Delegation Service**: `/api/automations/confirm` - Smart contract interactions

-   **Data Proxy**: `/api/hypersync` - Blockchain data access

-   **Event Tracking**: `/api/events` - Automation event storage

#### Blockchain Integration

-   **MetaMask Delegation**: Using `@metamask/delegation-utils`

-   **Multi-Chain Support**: Configurable chain configurations

-   **Transaction Management**: Secure signing and broadcasting

-   **Event Listening**: Real-time blockchain event monitoring

#### Data Layer

-   **Envio HyperSync**: High-performance blockchain indexing

-   **In-Memory Storage**: Development data persistence

-   **Event Sourcing**: Comprehensive activity tracking

-   **Cross-Chain Analytics**: Unified multi-chain data views

💡 Usage Guide
--------------

### Creating Your First Automation

1.  **Connect Your Wallet**

    -   Click "Connect Wallet" in the header

    -   Authorize with MetaMask

    -   Ensure you're on a supported network

2.  **Describe Your Automation**\
    In the chat interface, type natural language commands like:

    ``` text

        "Send 0.1 ETH to vitalik.eth every week"
        "Claim my staking rewards daily"
        "Notify me when gas prices are low"

    ```

1.  **Review Automation Details**

    -   AI will parse your request

    -   Review extracted parameters

    -   Confirm automation settings

2.  **Activate Automation**

    -   Sign the delegation transaction

    -   Choose simulation or real mode

    -   Monitor activation status

### Supported Commands

#### Payment Automations

``` text

"Send 0.05 ETH to alice.eth every Friday"
"Transfer 100 USDC to bob.eth monthly"
"Pay 0.1 MATIC to charlie.eth every 15 days"

```

#### Staking & Rewards

``` text

"Claim my staking rewards every day"
"Restake my rewards weekly"
"Compound my yields every 12 hours"

```

#### Notifications & Alerts

``` text

"Alert me when ETH price drops below $2000"
"Notify when gas fees are under 20 gwei"
"Remind me to check my portfolio daily"

```

🔧 Configuration
----------------

### Chain Configuration

Add new chains in `lib/wagmi-config.ts`:

``` typescript

export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MONAD',
  },
  rpcUrls: {
    public: { http: ['https://testnet-rpc.monad.xyz'] },
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadExplorer', url: 'https://testnet.monadexplorer.com' },
  },
}

```
### Automation Types

Extend supported automation types in `lib/automation.ts`:

``` typescript

export type AutomationType =
  | 'recurring_payment'
  | 'reward_claim'
  | 'staking'
  | 'reminder'
  | 'your_custom_type'  // Add new types here

export interface AutomationParams {
  amount?: string
  currency?: string
  recipient?: string
  frequency?: string
  // Add custom parameters
  customParam?: string
}

```

### AI Processing

Customize AI parsing in `app/api/ai/parse/route.ts`:

``` typescript

// Add new intent recognition patterns
const intentPatterns = {
  recurring_payment: /\b(send|transfer|pay).*\b(every|daily|weekly|monthly)\b/i,
  reward_claim: /\b(claim|collect).*(reward|yield|staking)\b/i,
  // Add new patterns
  your_custom_type: /your_pattern_here/i
}

```

🗃️ API Reference
-----------------

### AI Processing Endpoint

**POST**  `/api/ai/parse`

Process natural language into automation instructions:

``` json

{
  "message": "Send 0.1 ETH to vitalik.eth every week"
}

```

Response:

``` json

{
  "type": "recurring_payment",
  "params": {
    "amount": "0.1",
    "currency": "ETH",
    "recipient": "vitalik.eth",
    "frequency": "weekly"
  },
  "description": "Recurring payment of 0.1 ETH to vitalik.eth every week"
}

``` 

### Automation Management

**GET**  `/api/automations?user={address}`\
Retrieve user's automations

**POST**  `/api/automations/confirm`\
Activate automation with signed delegation

### Blockchain Data

**POST**  `/api/hypersync`\
Proxy for Envio HyperSync queries

**GET**  `/api/events?userAddress={address}&chainId={chainId}`\
Retrieve automation events

🔒 Security
-----------

### Delegation Security

-   **Time-limited delegations**: Automated expiration

-   **Scope restrictions**: Limited contract access

-   **Multi-sig support**: Enhanced security for large amounts

-   **Revocation mechanisms**: Immediate delegation cancellation

### Data Protection

-   **No private key storage**: Keys remain in user's wallet

-   **Encrypted communications**: All API calls use HTTPS

-   **Minimal data collection**: Only essential information stored

-   **Regular security audits**: Continuous vulnerability assessment

### Smart Contract Safety

-   **Verified contracts**: Only interact with audited contracts

-   **Simulation mode**: Test transactions without real funds

-   **Gas optimization**: Efficient transaction execution

-   **Fail-safe mechanisms**: Automatic transaction reversion on errors

🚢 Deployment
-------------

### Netlify Deployment

1.  **Build Configuration**

``` toml

# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

```

1.  **Environment Variables**

-   `ENVIO_API_KEY`: Your Envio HyperSync API key

1.  **Deploy**

``` bash

# Build locally to test
npm run build

# Deploy to Netlify
netlify deploy --prod

```

### Vercel Deployment

1.  **Import Project**

    -   Connect GitHub repository

    -   Configure build settings

    -   Add environment variables

2.  **Automatic Deploys**

    -   Push to main branch triggers deployment

    -   Preview deployments for PRs

### Docker Deployment

``` dockerfile

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

```

🧪 Testing
----------

### Test Automation Creation

``` bash

# Test AI parsing
curl -X POST http://localhost:3000/api/ai/parse\
  -H "Content-Type: application/json"\
  -d '{"message":"Send 0.1 ETH weekly"}'

# Test automation activation
curl -X POST http://localhost:3000/api/automations/confirm\
  -H "Content-Type: application/json"\
  -d '{"automationId":"auto_123","userAddress":"0x...","signedDelegation":{...}}'

```

### Integration Tests

``` bash

# Run full test suite
npm test

# Run specific test groups
npm run test:unit
npm run test:integration
npm run test:e2e

```

🔍 Monitoring & Analytics
-------------------------

### Performance Metrics

-   **Transaction Success Rate**: Track automation execution success

-   **Gas Usage Optimization**: Monitor and optimize transaction costs

-   **User Engagement**: Analyze automation creation and usage patterns

-   **Multi-Chain Activity**: Cross-chain performance comparison

### Health Checks

``` bash

# API health check
curl https://yourapp.vercel.app/api/health

# Blockchain connectivity
curl https://yourapp.vercel.app/api/hypersync/status

```

🤝 Contributing
---------------

We welcome contributions! Please see our [Contributing Guide](https://CONTRIBUTING.md) for details.

### Development Setup

1.  Fork the repository

2.  Create a feature branch

3.  Make your changes

4.  Add tests

5.  Submit a pull request

### Code Standards

-   TypeScript for type safety

-   ESLint for code quality

-   Prettier for formatting

-   Husky for git hooks

📊 Roadmap
----------

### Phase 1: Core Platform ✅

-   AI-powered automation creation

-   Multi-chain support

-   Basic automation types

-   MetaMask integration

### Phase 2: Enhanced Features 🚧

-   Advanced automation triggers

-   Cross-chain arbitrage

-   Portfolio rebalancing

-   Yield optimization

### Phase 3: Enterprise Ready 🔮

-   Institutional-grade security

-   Compliance features

-   Advanced analytics

-   API marketplace

🐛 Troubleshooting
------------------

### Common Issues

**Wallet Connection Problems**

-   Ensure MetaMask is installed and unlocked

-   Check network compatibility

-   Clear browser cache and cookies

**Transaction Failures**

-   Verify sufficient gas funds

-   Check contract approvals

-   Review transaction limits

**AI Parsing Errors**

-   Use clear, specific language

-   Include all necessary parameters

-   Check supported automation types

📄 License
----------

This project is licensed under the MIT License - see the [LICENSE](https://LICENSE) file for details.

🙏 Acknowledgments
------------------

-   **MetaMask** for delegation infrastructure

-   **Envio** for high-performance blockchain data

-   **Next.js** for the amazing React framework

-   **Wagmi** for excellent blockchain hooks

-   **The Web3 community** for inspiration and support