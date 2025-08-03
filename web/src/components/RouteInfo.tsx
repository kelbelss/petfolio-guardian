import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type QuoteResponse, useTokenPrice } from '@/lib/oneInchService';
import { fromWei, NATIVE_TOKEN, decodeUsd } from '@/lib/tokenUtils';

interface RouteInfoProps {
    quote?: QuoteResponse;
    showRouteDetails?: boolean;
    fromToken?: { symbol: string; decimals: number };
    toToken?: { symbol: string; decimals: number };
    fromAmount?: string;
}

export default function RouteInfo({ quote, showRouteDetails = true, fromToken, toToken, fromAmount }: RouteInfoProps) {
    // Get live ETH price for gas USD calculation
    const { data: ethPriceObj } = useTokenPrice(NATIVE_TOKEN);
    const ethPriceUsd = decodeUsd(ethPriceObj, NATIVE_TOKEN);

    if (!quote) {
        return (
            <Card className="bg-white border-emerald-200">
                <CardContent className="p-4">
                    <div className="text-center text-gray-500 text-sm">
                        Enter an amount to see swap details
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Calculate gas estimate in USD
    // The API returns gas cost in wei, convert to gwei then to USD
    const gasEstimateUSD = quote.gas && ethPriceUsd > 0
        ? (quote.gas / 1e9 * ethPriceUsd).toFixed(4) // Convert wei to gwei, then to USD
        : null;

    // Calculate rate if we have the necessary data
    const rate = fromToken && toToken && quote.dstAmount && fromAmount
        ? (Number(fromWei(quote.dstAmount, toToken.decimals)) / Number(fromAmount)).toFixed(6)
        : null;

    return (
        <Card className="bg-white border-emerald-200">
            <CardContent className="p-4 space-y-3">
                {/* Protocol Pill */}
                {quote.protocols?.[0] && (
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                            {quote.protocols[0].name} {quote.protocols[0].part}%
                        </Badge>
                    </div>
                )}

                {/* Rate */}
                {rate && fromToken && toToken && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Rate:</span>
                        <span className="font-mono">1 {fromToken.symbol} = {rate} {toToken.symbol}</span>
                    </div>
                )}

                {/* Gas Estimate */}
                {gasEstimateUSD && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Gas:</span>
                        <span>~${gasEstimateUSD}</span>
                    </div>
                )}

                {/* Route Details */}
                {showRouteDetails && quote.protocols && quote.protocols.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Route:</div>
                        <div className="flex flex-wrap gap-1">
                            {quote.protocols.map((protocol, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                    {protocol.name} ({protocol.part}%)
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 