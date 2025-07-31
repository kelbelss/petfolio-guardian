// src/pages/api-test.tsx
// Individual API test blocks for all 8 1inch APIs

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    fetchTokenList,
    fetchQuote,
    fetchAllBalances,
    fetchTokenPrice,
    fetchTokenMetadata
} from '@/lib/oneInchTokenApi';
import { fetchGasPrice } from '@/lib/gasPriceApi';
import { fetchTransactionHistory } from '@/lib/oneInchHistoryApi';
import { getSwapTransaction } from '@/lib/swapService';

interface ApiTestResult {
    status: 'idle' | 'loading' | 'success' | 'error';
    data?: Record<string, unknown>;
    error?: string;
    timestamp?: Date;
}

export default function ApiTestPage() {
    const { address } = useAccount();
    const [testResults, setTestResults] = useState<Record<string, ApiTestResult>>({
        tokenList: { status: 'idle' },
        tokenPrice: { status: 'idle' },
        quote: { status: 'idle' },
        swapTransaction: { status: 'idle' },
        gasPrice: { status: 'idle' },
        tokenMetadata: { status: 'idle' },
        balance: { status: 'idle' },
        history: { status: 'idle' },
        fusion: { status: 'idle' }
    });

    const updateTestResult = (apiName: string, result: Partial<ApiTestResult>) => {
        setTestResults(prev => ({
            ...prev,
            [apiName]: {
                ...prev[apiName],
                ...result,
                timestamp: new Date()
            }
        }));
    };

    // Test 1: Token List API
    const testTokenList = async () => {
        updateTestResult('tokenList', { status: 'loading' });
        try {
            const tokens = await fetchTokenList(8453);
            updateTestResult('tokenList', {
                status: 'success',
                data: {
                    count: tokens.length,
                    sample: tokens.slice(0, 3).map(t => ({ symbol: t.symbol, address: t.address }))
                }
            });
        } catch (error) {
            updateTestResult('tokenList', {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Test 2: Token Price API
    const testTokenPrice = async () => {
        updateTestResult('tokenPrice', { status: 'loading' });
        try {
            const price = await fetchTokenPrice(8453, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'); // USDC on Base
            updateTestResult('tokenPrice', {
                status: 'success',
                data: {
                    token: 'USDC',
                    price: price.price,
                    timestamp: new Date(price.timestamp).toLocaleString()
                }
            });
        } catch (error) {
            updateTestResult('tokenPrice', {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Test 3: Quote API
    const testQuote = async () => {
        updateTestResult('quote', { status: 'loading' });
        try {
            const quote = await fetchQuote(
                '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
                '0x4200000000000000000000000000000000000006', // WETH on Base
                '1000000', // 1 USDC in wei
                8453
            );
            updateTestResult('quote', {
                status: 'success',
                data: {
                    fromToken: quote.fromToken?.symbol || 'Unknown',
                    toToken: quote.toToken?.symbol || 'Unknown',
                    fromAmount: quote.fromTokenAmount,
                    toAmount: quote.toTokenAmount,
                    estimatedGas: quote.estimatedGas
                }
            });
        } catch (error) {
            updateTestResult('quote', {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Test 4: Swap Transaction API
    const testSwapTransaction = async () => {
        updateTestResult('swapTransaction', { status: 'loading' });
        try {
            // Try different approaches to fix the 400 error
            const testCases = [
                {
                    name: 'Standard Swap',
                    params: {
                        fromToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
                        toToken: '0x4200000000000000000000000000000000000006', // WETH on Base
                        amount: '1000000', // 1 USDC in wei
                        fromAddress: address || '0x0000000000000000000000000000000000000000',
                        slippage: 1,
                        chainId: 8453
                    }
                },
                {
                    name: 'WETH to USDC Swap',
                    params: {
                        fromToken: '0x4200000000000000000000000000000000000006', // WETH on Base
                        toToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
                        amount: '1000000000000000000', // 1 WETH in wei
                        fromAddress: address || '0x0000000000000000000000000000000000000000',
                        slippage: 1,
                        chainId: 8453
                    }
                },
                {
                    name: 'Smaller Amount',
                    params: {
                        fromToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
                        toToken: '0x4200000000000000000000000000000000000006', // WETH on Base
                        amount: '100000', // 0.1 USDC in wei
                        fromAddress: address || '0x0000000000000000000000000000000000000000',
                        slippage: 1,
                        chainId: 8453
                    }
                },
                {
                    name: 'DAI to WETH Swap',
                    params: {
                        fromToken: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // DAI on Base
                        toToken: '0x4200000000000000000000000000000000000006', // WETH on Base
                        amount: '1000000000000000000', // 1 DAI in wei
                        fromAddress: address || '0x0000000000000000000000000000000000000000',
                        slippage: 1,
                        chainId: 8453
                    }
                },
                {
                    name: 'Use getSwapCalldata',
                    params: {
                        fromToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
                        toToken: '0x4200000000000000000000000000000000000006', // WETH on Base
                        amount: '1000000', // 1 USDC in wei
                        fromAddress: address || '0x0000000000000000000000000000000000000000',
                        slippage: 1,
                        chainId: 8453
                    }
                }
            ];

            let successCase = null;
            const errorMessages = [];

            for (const testCase of testCases) {
                try {
                    console.log(`Testing Swap: ${testCase.name}`, testCase.params);

                    let swapTx;

                    if (testCase.name === 'Use getSwapCalldata') {
                        // Try using the existing getSwapCalldata function
                        const { getSwapCalldata } = await import('@/lib/oneInchProxy');
                        swapTx = await getSwapCalldata(
                            testCase.params.chainId,
                            testCase.params.fromToken,
                            testCase.params.toToken,
                            testCase.params.amount,
                            testCase.params.fromAddress,
                            testCase.params.slippage
                        );
                    } else {
                        // getSwapTransaction now automatically gets a quote first
                        swapTx = await getSwapTransaction(
                            testCase.params.fromToken,
                            testCase.params.toToken,
                            testCase.params.amount,
                            testCase.params.fromAddress,
                            testCase.params.slippage,
                            testCase.params.chainId
                        );
                    }

                    successCase = { name: testCase.name, data: swapTx };
                    console.log(`✅ ${testCase.name} succeeded:`, swapTx);
                    break;
                } catch (error) {
                    const errorMsg = `${testCase.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    errorMessages.push(errorMsg);
                    console.log(`❌ ${errorMsg}`);
                }
            }

            if (successCase) {
                updateTestResult('swapTransaction', {
                    status: 'success',
                    data: {
                        message: `Swap working: ${successCase.name}`,
                        to: successCase.data.tx.to,
                        data: successCase.data.tx.data.substring(0, 66) + '...',
                        value: successCase.data.tx.value,
                        gas: 'gas' in successCase.data.tx ? successCase.data.tx.gas : 'N/A'
                    }
                });
            } else {
                updateTestResult('swapTransaction', {
                    status: 'error',
                    error: `All swap attempts failed:\n${errorMessages.join('\n')}`
                });
            }
        } catch (error) {
            console.error('Swap Transaction API Error:', error);
            updateTestResult('swapTransaction', {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Test 5: Gas Price API
    const testGasPrice = async () => {
        updateTestResult('gasPrice', { status: 'loading' });
        try {
            const gasPrice = await fetchGasPrice(8453);
            updateTestResult('gasPrice', {
                status: 'success',
                data: {
                    fast: gasPrice.fast,
                    standard: gasPrice.standard,
                    slow: gasPrice.slow,
                    unit: 'Gwei'
                }
            });
        } catch (error) {
            updateTestResult('gasPrice', {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Test 6: Token Metadata API
    const testTokenMetadata = async () => {
        updateTestResult('tokenMetadata', { status: 'loading' });
        try {
            const metadata = await fetchTokenMetadata(8453);
            updateTestResult('tokenMetadata', {
                status: 'success',
                data: {
                    count: metadata.length,
                    sample: metadata.slice(0, 3).map(t => ({ name: t.name, symbol: t.symbol, address: t.address }))
                }
            });
        } catch (error) {
            updateTestResult('tokenMetadata', {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Test 7: Balance API
    const testBalance = async () => {
        if (!address) {
            updateTestResult('balance', {
                status: 'error',
                error: 'Wallet not connected'
            });
            return;
        }

        updateTestResult('balance', { status: 'loading' });
        try {
            const balances = await fetchAllBalances(address, 8453);
            updateTestResult('balance', {
                status: 'success',
                data: {
                    address: address,
                    tokenCount: Object.keys(balances).length,
                    sample: Object.entries(balances).slice(0, 3).map(([addr, data]) => ({
                        address: addr,
                        symbol: data.symbol,
                        balance: data.balance
                    }))
                }
            });
        } catch (error) {
            updateTestResult('balance', {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Test 8: History API
    const testHistory = async () => {
        if (!address) {
            updateTestResult('history', {
                status: 'error',
                error: 'Wallet not connected'
            });
            return;
        }

        updateTestResult('history', { status: 'loading' });
        try {
            const history = await fetchTransactionHistory(8453, address, 1, 10);
            updateTestResult('history', {
                status: 'success',
                data: {
                    address: address,
                    transactionCount: history.transactions.length,
                    total: history.total,
                    sample: history.transactions.slice(0, 3).map(tx => ({
                        id: tx.id,
                        type: tx.type,
                        status: tx.status
                    }))
                }
            });
        } catch (error) {
            updateTestResult('history', {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Test 9: Fusion API
    const testFusion = async () => {
        updateTestResult('fusion', { status: 'loading' });
        try {
            // Test multiple Fusion API endpoint variations
            const fusionEndpoints = [
                // Official v1.2 endpoints (currently returning 500)
                {
                    name: 'Fusion Quote v1.2',
                    url: 'https://1inch-vercel-proxy-ecru.vercel.app/v1.2/8453/quote?src=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&dst=0x4200000000000000000000000000000000000006&amount=1000000&from=0x0000000000000000000000000000000000000000&includeIntent=true'
                },
                {
                    name: 'Fusion Swap v1.2',
                    url: 'https://1inch-vercel-proxy-ecru.vercel.app/v1.2/8453/swap?src=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&dst=0x4200000000000000000000000000000000000006&amount=1000000&from=0x0000000000000000000000000000000000000000&includeIntent=true&slippage=1'
                },
                {
                    name: 'Fusion Tokens v1.2',
                    url: 'https://1inch-vercel-proxy-ecru.vercel.app/v1.2/8453/tokens'
                },
                // Alternative Fusion endpoints to test
                {
                    name: 'Fusion Quote v1.0',
                    url: 'https://1inch-vercel-proxy-ecru.vercel.app/fusion/v1.0/8453/quote?src=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&dst=0x4200000000000000000000000000000000000006&amount=1000000&from=0x0000000000000000000000000000000000000000&intent=true'
                },
                {
                    name: 'Fusion Intent',
                    url: 'https://1inch-vercel-proxy-ecru.vercel.app/fusion/8453/intent?src=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&dst=0x4200000000000000000000000000000000000006&amount=1000000&from=0x0000000000000000000000000000000000000000'
                },
                // Test if regular swap works with intent parameter
                {
                    name: 'Regular Swap with Intent',
                    url: 'https://1inch-vercel-proxy-ecru.vercel.app/swap/v6.0/8453/swap?src=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&dst=0x4200000000000000000000000000000000000006&amount=1000000&from=0x0000000000000000000000000000000000000000&slippage=1&intent=true'
                }
            ];

            const workingEndpoints = [];
            const errorMessages = [];

            for (const endpoint of fusionEndpoints) {
                try {
                    console.log(`Testing Fusion endpoint: ${endpoint.name}`);
                    const response = await fetch(endpoint.url);

                    if (response.ok) {
                        const data = await response.json();
                        workingEndpoints.push({ name: endpoint.name, data });
                        console.log(`✅ ${endpoint.name} working:`, data);
                    } else {
                        const errorMsg = `${endpoint.name}: ${response.status} ${response.statusText}`;
                        errorMessages.push(errorMsg);
                        console.log(`❌ ${errorMsg}`);
                    }
                } catch (error) {
                    const errorMsg = `${endpoint.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    errorMessages.push(errorMsg);
                    console.log(`❌ ${errorMsg}`);
                }
            }

            if (workingEndpoints.length > 0) {
                updateTestResult('fusion', {
                    status: 'success',
                    data: {
                        message: `Fusion API working: ${workingEndpoints.length}/${fusionEndpoints.length} endpoints`,
                        workingEndpoints: workingEndpoints.map(ep => ep.name),
                        sampleResponse: workingEndpoints[0].data
                    }
                });
            } else {
                updateTestResult('fusion', {
                    status: 'error',
                    error: `All Fusion endpoints failed:\n${errorMessages.join('\n')}`
                });
            }
        } catch (error) {
            updateTestResult('fusion', {
                status: 'error',
                error: error instanceof Error ? error.message : 'Fusion API test failed'
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'bg-green-100 text-green-800';
            case 'error': return 'bg-red-100 text-red-800';
            case 'loading': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'loading': return '⏳';
            default: return '🔍';
        }
    };

    const ApiTestBlock = ({
        title,
        description,
        testFunction,
        result,
        requiresWallet = false
    }: {
        title: string;
        description: string;
        testFunction: () => Promise<void>;
        result: ApiTestResult;
        requiresWallet?: boolean;
    }) => (
        <Card className="border-2 hover:border-blue-300 transition-colors">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span>{getStatusIcon(result.status)}</span>
                        <span>{title}</span>
                    </div>
                    <Badge className={getStatusColor(result.status)}>
                        {result.status}
                    </Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">{description}</p>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Button
                        onClick={testFunction}
                        disabled={result.status === 'loading' || (requiresWallet && !address)}
                        className="w-full"
                    >
                        {result.status === 'loading' ? 'Testing...' : `Test ${title}`}
                    </Button>

                    {requiresWallet && !address && (
                        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                            ⚠️ Requires wallet connection
                        </div>
                    )}

                    {result.status === 'success' && result.data && (
                        <div className="bg-green-50 p-3 rounded text-sm">
                            <div className="font-medium text-green-800 mb-2">✅ Success!</div>
                            <pre className="whitespace-pre-wrap text-green-700 text-xs">
                                {JSON.stringify(result.data, null, 2)}
                            </pre>
                        </div>
                    )}

                    {result.status === 'error' && result.error && (
                        <div className="bg-red-50 p-3 rounded text-sm">
                            <div className="font-medium text-red-800 mb-2">❌ Error:</div>
                            <div className="text-red-700 text-xs">{result.error}</div>
                        </div>
                    )}

                    {result.timestamp && (
                        <div className="text-xs text-gray-500">
                            Last tested: {result.timestamp.toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">1inch API Test Suite</h1>
                <p className="text-gray-600">
                    Test each 1inch API individually to see which ones work and which don't
                </p>
                {!address && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-amber-800 text-sm">
                            🔗 Connect your wallet to test Balance and History APIs
                        </p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Core APIs */}
                <ApiTestBlock
                    title="Token List API"
                    description="Fetches all available tokens on the network"
                    testFunction={testTokenList}
                    result={testResults.tokenList}
                />

                <ApiTestBlock
                    title="Token Price API"
                    description="Gets real-time price for a specific token"
                    testFunction={testTokenPrice}
                    result={testResults.tokenPrice}
                />

                <ApiTestBlock
                    title="Quote API"
                    description="Gets swap quote for token exchange"
                    testFunction={testQuote}
                    result={testResults.quote}
                />

                <ApiTestBlock
                    title="Swap Transaction API"
                    description="Gets executable transaction data for swaps"
                    testFunction={testSwapTransaction}
                    result={testResults.swapTransaction}
                />

                <ApiTestBlock
                    title="Gas Price API"
                    description="Gets current gas prices on the network"
                    testFunction={testGasPrice}
                    result={testResults.gasPrice}
                />

                <ApiTestBlock
                    title="Token Metadata API"
                    description="Gets detailed information about tokens"
                    testFunction={testTokenMetadata}
                    result={testResults.tokenMetadata}
                />

                <ApiTestBlock
                    title="Balance API"
                    description="Gets wallet token balances"
                    testFunction={testBalance}
                    result={testResults.balance}
                    requiresWallet={true}
                />

                <ApiTestBlock
                    title="History API"
                    description="Gets transaction history for wallet"
                    testFunction={testHistory}
                    result={testResults.history}
                    requiresWallet={true}
                />

                <ApiTestBlock
                    title="Fusion API"
                    description="Intent-based MEV-protected swaps"
                    testFunction={testFusion}
                    result={testResults.fusion}
                />
            </div>

            {/* Summary */}
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Test Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div className="bg-green-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                {Object.values(testResults).filter(r => r.status === 'success').length}
                            </div>
                            <div className="text-sm text-green-700">Working</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">
                                {Object.values(testResults).filter(r => r.status === 'error').length}
                            </div>
                            <div className="text-sm text-red-700">Failed</div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-600">
                                {Object.values(testResults).filter(r => r.status === 'loading').length}
                            </div>
                            <div className="text-sm text-yellow-700">Testing</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-gray-600">
                                {Object.values(testResults).filter(r => r.status === 'idle').length}
                            </div>
                            <div className="text-sm text-gray-700">Not Tested</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 