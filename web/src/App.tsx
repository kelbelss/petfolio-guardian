import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { Web3Providers } from '@/lib/wallet';
import ConnectButton from '@/components/ConnectButton';
import { Button } from '@/components/ui/button';
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
      <div className="min-h-screen flex flex-col bg-green-50 text-gray-800">
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-green-200 shadow-sm">
          <Link to="/" className="text-xl font-bold text-green-600">
            🐾 Petfolio Guardian
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/setup/feed">
              <Button className="bg-emerald-400 hover:bg-emerald-500 text-white shadow-sm hover:shadow-md transition-all">
                Start New DCA
              </Button>
            </Link>
            <ConnectButton />
          </div>
        </header>

        <main className="flex-1 w-full">
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
