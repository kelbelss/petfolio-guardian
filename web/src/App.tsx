import { Routes, Route, Link, NavLink } from 'react-router-dom';
import { Web3Providers } from '@/lib/wagmi';
import Dashboard from '@/pages/dashboard';
import FeedNow from '@/pages/feed-now';
import ConnectButton from '@/components/ConnectButton';
import { Toaster } from '@/components/ui/toaster';
import DcaSetup from '@/pages/dca/setup';
import DcaReview from '@/pages/dca/review';
import MyFeeds from '@/pages/dca/feeds';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ApiPlayground from '@/pages/api-playground';
import SwapPlayground from '@/pages/swap-playground';
import GasBadge from '@/components/GasBadge';
import WalletSummary from '@/components/WalletSummary';

export default function App() {
  return (
    <Web3Providers>
      <header className="flex justify-between items-center p-4 max-w-5xl mx-auto bg-gradient-to-r from-green-50 to-blue-50 border-b border-green-200">
        <Link to="/" className="text-lg font-semibold text-emerald-600">🦛 Petfolio Guardian</Link>
        <nav className="flex gap-4 text-sm">
          <NavLink to="/" className={({ isActive }) => isActive ? 'text-emerald-600 font-semibold' : 'text-gray-600 hover:text-emerald-600'}>Dashboard</NavLink>
          <NavLink to="/feed" className={({ isActive }) => isActive ? 'text-emerald-600 font-semibold' : 'text-gray-600 hover:text-emerald-600'}>Feed Now</NavLink>
          <NavLink to="/dca/setup" className={({ isActive }) => isActive ? 'text-emerald-600 font-semibold' : 'text-gray-600 hover:text-emerald-600'}>DCA Setup</NavLink>
          <NavLink to="/dca/feeds" className={({ isActive }) => isActive ? 'text-emerald-600 font-semibold' : 'text-gray-600 hover:text-emerald-600'}>My Feeds</NavLink>
          <NavLink to="/playground" className={({ isActive }) => isActive ? 'text-emerald-600 font-semibold' : 'text-gray-600 hover:text-emerald-600'}>Playground</NavLink>
          <NavLink to="/swap" className={({ isActive }) => isActive ? 'text-emerald-600 font-semibold' : 'text-gray-600 hover:text-emerald-600'}>Swap</NavLink>
        </nav>
        <div className="flex items-center gap-4">
          <GasBadge />
          <WalletSummary />
          <ConnectButton />
        </div>
      </header>

      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/feed" element={<FeedNow />} />
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
