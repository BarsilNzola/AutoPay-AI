'use client'

import { useAccount } from 'wagmi'
import dynamic from 'next/dynamic'

// Dynamically import components to avoid hydration issues
const ConnectWallet = dynamic(() => import('@/components/ConnectWallet'), {
  ssr: false,
  loading: () => <div className="connect-wallet-skeleton" />
})
const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  ssr: false,
  loading: () => <div className="dashboard-skeleton" />
})
const ChatBox = dynamic(() => import('@/components/ChatBox'), {
  ssr: false,
  loading: () => <div className="chatbox-skeleton" />
})

export default function Home() {
  const { isConnected } = useAccount()

  return (
    <main className="main-container">
      <div className="hero-section">
        <h1 className="hero-title">
          AutoPay AI 🤖
        </h1>
        <p className="hero-subtitle">
          Automate your on-chain tasks with AI-powered wallet automation
        </p>
      </div>

      {!isConnected ? (
        <div className="connect-container">
          <ConnectWallet />
        </div>
      ) : (
        <div className="app-grid">
          <div className="chat-section">
            <div className="chat-container">
              <h2 className="section-title">AI Assistant</h2>
              <ChatBox />
            </div>
          </div>
          <div className="dashboard-section">
            <Dashboard />
          </div>
        </div>
      )}

      <style jsx>{`
        .main-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
          min-height: 100vh;
        }

        .hero-section {
          text-align: center;
          margin-bottom: 3rem;
        }

        .hero-title {
          font-size: 3rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--color-ocean) 0%, var(--color-root) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 1rem;
          font-family: var(--font-display);
        }

        .hero-subtitle {
          font-size: 1.25rem;
          color: var(--color-root-600);
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .connect-container {
          max-width: 28rem;
          margin: 0 auto;
        }

        .app-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        .chat-container {
          background: var(--color-white);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          padding: 1.5rem;
          border: 1px solid var(--color-coral);
          height: fit-content;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--color-root-700);
          margin-bottom: 1.5rem;
          font-family: var(--font-display);
        }

        /* Loading Skeletons */
        .connect-wallet-skeleton,
        .dashboard-skeleton,
        .chatbox-skeleton {
          background: var(--color-sand);
          border-radius: var(--radius-lg);
          padding: 2rem;
          text-align: center;
          color: var(--color-root-500);
        }

        /* Responsive Design */
        @media (min-width: 1024px) {
          .main-container {
            padding: 3rem 2rem;
          }

          .app-grid {
            grid-template-columns: 2fr 1fr;
            gap: 2rem;
          }

          .hero-title {
            font-size: 3.5rem;
          }
        }

        @media (max-width: 768px) {
          .main-container {
            padding: 1.5rem 1rem;
          }

          .hero-title {
            font-size: 2.5rem;
          }

          .hero-subtitle {
            font-size: 1.125rem;
          }

          .chat-container {
            padding: 1rem;
          }
        }
      `}</style>
    </main>
  )
}