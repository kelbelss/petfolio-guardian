import { Routes, Route, Link } from 'react-router-dom';
import { Web3Providers } from '@/lib/wagmi';
import { initializeTokenMeta } from '@/lib/tokenUtils';
import { useEffect } from 'react';
import Dashboard from '@/pages/dashboard/dashboard';
import ConnectButton from '@/components/ConnectButton';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { emeraldColors } from '@/lib/styles';
import DcaSetup from '@/pages/dca/setup';
import DcaReview from '@/pages/dca/review';
import MyFeeds from '@/pages/dca/feeds';

import RegularSwap from '@/pages/regularSwap';
import MarketAnalysis from '@/pages/market-analysis/market-analysis';
import HowItWorks from '@/pages/how-it-works';
import GasBadge from '@/components/GasBadge';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function App() {
  useEffect(() => {
    initializeTokenMeta();
  }, []);

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
          <Link to="/regular-swap" className="text-emerald-600 hover:text-emerald-700 text-lg font-medium">
            Swap
          </Link>
          <Link to="/dca/setup" className="text-emerald-600 hover:text-emerald-700 text-lg font-medium">
            DCA Setup
          </Link>
          <Link to="/market-analysis" className="text-emerald-600 hover:text-emerald-700 text-lg font-medium">
            Market Analysis
          </Link>
          <Link to="/dca/feeds" className="text-emerald-600 hover:text-emerald-700 text-lg font-medium">
            My Feeds
          </Link>
          <Link to="/how-it-works" className="text-emerald-600 hover:text-emerald-700 text-lg font-medium">
            How It Works
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <GasBadge />
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

          <Route path="/regular-swap" element={<RegularSwap />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="*" element={<div className="max-w-3xl mx-auto p-6">Not Found</div>} />
        </Routes>
      </ErrorBoundary>

      <Toaster />
    </Web3Providers>
  );
}
