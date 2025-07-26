import { Routes, Route, Navigate } from 'react-router-dom';
import { Web3Providers } from '@/lib/wallet';
import ConnectButton from '@/components/ConnectButton';

// stub pages for now
const Dashboard = () => <p className="text-2xl">Dashboard coming soon…</p>;
const Setup = () => <p className="text-2xl">Guardian setup wizard…</p>;
const Activity = () => <p className="text-2xl">Recent actions…</p>;

export default function App() {
  return (
    <Web3Providers>
      <div className="min-h-screen flex flex-col bg-gray-950 text-gray-200">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h1 className="text-xl font-bold text-emerald-400">
            🐾 Petfolio Guardian
          </h1>
          <ConnectButton />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center gap-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Web3Providers>
  );
}
