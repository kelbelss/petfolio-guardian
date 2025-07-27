import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { Web3Providers } from '@/lib/wallet';
import ConnectButton from '@/components/ConnectButton';
import FeedWizard from './pages/dca/setup';
import ReviewFeed from './pages/dca/review';
import Confirmation from './pages/dca/confirmation';
import Dashboard from './pages/dashboard';

// stub pages for now
const Setup = () => (
  <div className="max-w-3xl w-full mx-auto px-4 py-6">
    <p className="text-2xl">Guardian setup wizard…</p>
  </div>
);
const ActivityContainer = () => (
  <div className="max-w-3xl w-full mx-auto px-4 py-6">
    <p className="text-2xl">Recent actions…</p>
  </div>
);

export default function App() {
  return (
    <Web3Providers>
      <div className="min-h-screen flex flex-col bg-gray-950 text-gray-200">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <Link to="/" className="text-xl font-bold text-emerald-400">
            🐾 Petfolio Guardian
          </Link>
          <ConnectButton />
        </header>

        <main className="flex-1 w-full gap-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/setup/feed" element={<FeedWizard />} />
            <Route path="/setup/feed/review" element={<ReviewFeed />} />
            <Route path="/setup/feed/confirmation" element={<Confirmation />} />
            <Route path="/activity" element={<ActivityContainer />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Web3Providers>
  );
}
