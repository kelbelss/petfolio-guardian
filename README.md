# Petfolio Guardian 🐾

A DeFi platform that combines automated DCA (Dollar-Cost Averaging) trading with virtual pet care. Feed your digital hippo while building your crypto portfolio through intelligent, automated trading strategies.

## 🚀 Quick Start

1. **Connect Wallet** - Link your Web3 wallet to access tokens and balances
2. **Set Up DCA** - Configure automated trading strategies with token pairs and intervals  
3. **Feed Your Pet** - Watch your hippo's happiness grow as DCA orders execute automatically

## 🏗️ Smart Contracts

### Core Architecture
- **TwapDcaHook**: Custom hook implementing 1inch's interface for time-weighted recurring fills
- **Permit2**: Gas-efficient token approvals and transfers
- **Keeper Bots**: Automated execution of DCA orders at specified intervals

### Technical Benefits
- Hands-off automation with on-chain schedule enforcement
- Gas-optimized transactions via Permit2
- Built-in slippage protection and security measures
- Composable integration with Aave and other DeFi protocols

## 🌐 APIs & Data Integration

### 1inch API Integration
- **Quote API (v6.0)**: Real-time swap quotes and price estimates
- **Swap API (v6.0)**: Executable swap transactions
- **Token API (v1.3)**: Token metadata, logos, and lists
- **Balance API (v1.2)**: User token balances across networks
- **Price API (v1.1)**: Live token prices in USD
- **Gas Price API (v1.4)**: Current gas prices for transaction optimization
- **Approval APIs (v6.1)**: Token allowances and approval transactions
- **Limit Order SDK**: Order creation and management

### Frontend Features
- React Query for efficient API state management
- Real-time price feeds and updates
- Interactive token selection and search
- Responsive design with Tailwind CSS
- Wallet integration with Wagmi

## 🎮 Pet Happiness System

Your virtual hippo's health is directly tied to your trading activity:

- **DCA Yield**: +3.0 health (highest reward for complex yield strategies)
- **DCA to Friend**: +2.0 health (social bonus for helping others)
- **Regular DCA**: +1.0 health (standard automated trading)
- **Manual Swap**: +0.5 health (basic trading activity)

Health ranges from 0 (very sad) to 10 (absolutely chuffed). Your pet loses 0.5 health every 6 hours without activity.

## 📊 Key Features

- **Automated DCA**: Set-and-forget dollar-cost averaging strategies
- **Real-time Analytics**: Live portfolio tracking and performance metrics
- **Health Monitoring**: Track your pet's happiness alongside trading success
- **Multi-token Support**: Trade any ERC-20 token on supported networks
- **Gas Optimization**: Smart transaction batching and Permit2 approvals

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Blockchain**: Ethereum, Base Network
- **APIs**: 1inch Aggregation Protocol
- **Database**: Supabase (PostgreSQL)
- **Wallet**: Wagmi (Ethereum wallet integration)
- **State Management**: React Query (TanStack Query)

## 🔗 Links

- **Smart Contracts**: [GitHub](https://github.com/kelbelss/petfolio-guardian/tree/main/contracts)
- **Frontend**: [GitHub](https://github.com/kelbelss/petfolio-guardian/tree/main/web)
- **Live Demo**: [Petfolio Guardian](https://petfolio.site)

---

*Build your portfolio while caring for your digital companion. The future of DeFi is both profitable and playful.* 🚀
