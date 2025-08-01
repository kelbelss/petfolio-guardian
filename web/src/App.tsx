import { Routes, Route, Link } from 'react-router-dom';
import { Web3Providers } from '@/lib/wagmi';
import Dashboard from '@/pages/dashboard/dashboard';
import ConnectButton from '@/components/ConnectButton';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { emeraldColors } from '@/lib/styles';
import DcaSetup from '@/pages/dca/setup';
import DcaReview from '@/pages/dca/review';
import MyFeeds from '@/pages/dca/feeds';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ApiPlayground from '@/pages/api-playground';
import SwapPlayground from '@/pages/swap-playground';
import MarketAnalysis from '@/pages/market-analysis/market-analysis';
import GasBadge from '@/components/GasBadge';
import WalletSummary from '@/components/WalletSummary';

export default function App() {
  return (
    <Web3Providers>
      <header className="flex justify-between items-center p-4 w-full bg-white border-b border-gray-200">
        <Link to="/" className="text-lg font-semibold text-emerald-600">🦛 Petfolio Guardian</Link>
        <nav className="flex gap-3">
          <Link to="/">
            <Button variant="outline" className="text-gray-700">
              Dashboard
            </Button>
          </Link>
          <Link to="/market-analysis">
            <Button variant="outline" className="text-gray-700">
              Market Analysis
            </Button>
          </Link>
          <Link to="/dca/setup">
            <Button variant="outline" className="text-gray-700">
              DCA Setup
            </Button>
          </Link>
          <Link to="/dca/feeds">
            <Button variant="outline" className="text-gray-700">
              My Feeds
            </Button>
          </Link>
          <Link to="/playground">
            <Button variant="outline" className="text-gray-700">
              Playground
            </Button>
          </Link>
          <Link to="/swap">
            <Button variant="outline" className="text-gray-700">
              Swap
            </Button>
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <GasBadge />
          <WalletSummary />
          <Button className={emeraldColors.button}>
            Start New DCA
          </Button>
          <ConnectButton />
        </div>
      </header>

      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/market-analysis" element={<MarketAnalysis />} />
          <Route path="/dca/setup" element={<DcaSetup />} />
          <Route path="/dca/review" element={<DcaReview />} />
          <Route path="/dca/feeds" element={<MyFeeds />} />
          <Route path="/playground" element={<ApiPlayground />} />
          <Route path="/swap" element={<SwapPlayground />} />
          <Route path="*" element={<div className="max-w-3xl mx-auto p-6">Not Found</div>} />
        </Routes>
      </ErrorBoundary>

      <Toaster />
    </Web3Providers>
  );
}
