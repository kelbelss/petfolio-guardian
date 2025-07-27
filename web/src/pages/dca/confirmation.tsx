import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';

// Dummy setMood function; replace with your actual pet mood logic
function setMood(mood: string) {
    // TODO: Implement pet mood logic
    // e.g., usePetStore.setState({ mood })
}

export default function Confirmation() {
    const location = useLocation();
    const orderHash = location.state?.orderHash as string | undefined;

    useEffect(() => {
        setMood('happyFed');
    }, []);

    return (
        <div className="max-w-3xl w-full mx-auto px-4 py-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Order Submitted!</h2>
            <div className="mb-4 text-lg">Your DCA order has been broadcast to the network.</div>
            {orderHash && (
                <div className="mb-4">
                    <a
                        href={`https://etherscan.io/tx/${orderHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-500 underline"
                    >
                        View on Etherscan
                    </a>
                </div>
            )}
            <div className="mb-4 text-4xl">🐾</div>
            <Link to="/" className="text-emerald-500 underline">Back to Dashboard</Link>
        </div>
    );
} 