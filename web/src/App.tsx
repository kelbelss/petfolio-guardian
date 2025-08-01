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
import HowItWorks from '@/pages/how-it-works';
import GasBadge from '@/components/GasBadge';
import WalletSummary from '@/components/WalletSummary';

export default function App() {
  return (
    <Web3Providers>
      <header className="flex justify-between items-center p-4 w-full bg-white border-b border-gray-200">
        <Link to="/" className="flex items-center gap-3 text-2xl font-bold text-emerald-600">
          <img src="/src/assets/faviconpet.png" alt="Petfolio Guardian" className="w-8 h-8" />
          Petfolio Guardian
        </Link>
        <nav className="flex gap-6">
          <Link to="/" className="text-emerald-600 hover:text-emerald-700 text-lg font-medium">
            Dashboard
          </Link>
          <Link to="/market-analysis" className="text-emerald-600 hover:text-emerald-700 text-lg font-medium">
            Market Analysis
          </Link>
          <Link to="/dca/setup" className="text-emerald-600 hover:text-emerald-700 text-lg font-medium">
            DCA Setup
          </Link>
          <Link to="/dca/feeds" className="text-emerald-600 hover:text-emerald-700 text-lg font-medium">
            My Feeds
          </Link>
          <Link to="/how-it-works" className="text-emerald-600 hover:text-emerald-700 text-lg font-medium">
            How It Works
          </Link>
          <Link to="/playground" className="text-emerald-600 hover:text-emerald-700 text-lg font-medium">
            Playground
          </Link>
          <Link to="/swap" className="text-emerald-600 hover:text-emerald-700 text-lg font-medium">
            Swap
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <GasBadge />
          <WalletSummary />
          <Link to="/dca/setup">
            <Button className={emeraldColors.button}>
              Start New DCA
            </Button>
          </Link>
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
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="*" element={<div className="max-w-3xl mx-auto p-6">Not Found</div>} />
        </Routes>
      </ErrorBoundary>

      <Toaster />
    </Web3Providers>
  );
}
