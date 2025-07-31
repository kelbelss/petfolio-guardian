import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { Web3Providers } from '@/lib/wagmi';
import ConnectButton from '@/components/ConnectButton';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import { CacheDebug } from '@/components/ui/cache-debug';
import FeedWizard from './pages/dca/setup';
import ReviewFeed from './pages/dca/review';
import Confirmation from './pages/dca/confirmation';
import MyFeeds from './pages/dca/feeds';
import Dashboard from './pages/dashboard';
import MarketAnalysis from './pages/market-analysis';
import HowItWorks from './pages/how-it-works';
import ApiTestPage from './pages/api-test';
import FeedNowPage from './pages/feed-now';




export default function App() {
  return (
    <Web3Providers>
      <div className="min-h-screen flex flex-col bg-green-50 text-gray-800">
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-green-200 shadow-sm">
          <Link to="/" className="text-xl font-bold text-green-600">
            🐾 Petfolio Guardian
          </Link>
          <div className="flex items-center gap-4">
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
            <Link to="/dca/feeds">
              <Button variant="outline" className="text-gray-700">
                My Feeds
              </Button>
            </Link>
            <Link to="/how-it-works">
              <Button variant="outline" className="text-gray-700">
                How It Works
              </Button>
            </Link>
            <Link to="/api-test">
              <Button variant="outline" className="text-gray-700">
                API Test
              </Button>
            </Link>

            <Link to="/setup/feed">
              <Button className="bg-emerald-400 hover:bg-emerald-500 text-white shadow-sm hover:shadow-md transition-all">
                Start New DCA
              </Button>
            </Link>
            <ConnectButton />
          </div>
        </header>

        <main className="flex-1 w-full">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/market-analysis" element={<MarketAnalysis />} />



              <Route path="/setup/feed" element={<FeedWizard />} />
              <Route path="/setup/feed/review" element={<ReviewFeed />} />
              <Route path="/setup/feed/confirmation" element={<Confirmation />} />
              <Route path="/dca/feeds" element={<MyFeeds />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/api-test" element={<ApiTestPage />} />
              <Route path="/feed-now" element={<FeedNowPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
      <Toaster />
      <CacheDebug />
    </Web3Providers>
  );
}
