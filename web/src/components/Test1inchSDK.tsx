// src/components/Test1inchSDK.tsx - Test component for 1inch SDK integration
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTest1inchSDK } from '@/lib/hooks/useLimitOrderV2';
import { useToast } from '@/components/ui/use-toast';

export default function Test1inchSDK() {
    const { toast } = useToast();
    const testSDK = useTest1inchSDK();

    const handleTest = async () => {
        try {
            const result = await testSDK.mutateAsync();
            if (result) {
                toast({
                    title: "✅ 1inch SDK Test Successful",
                    description: "The 1inch SDK integration is working correctly!",
                });
            } else {
                toast({
                    title: "❌ 1inch SDK Test Failed",
                    description: "There was an issue with the SDK integration.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('1inch SDK test error:', error);
            toast({
                title: "❌ 1inch SDK Test Error",
                description: error instanceof Error ? error.message : "Unknown error occurred",
                variant: "destructive",
            });
        }
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>🧪 Test 1inch SDK Integration</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                    This will test if the 1inch Limit Order SDK is properly integrated and can create orders.
                </p>
                <Button
                    onClick={handleTest}
                    disabled={testSDK.isPending}
                    className="w-full"
                >
                    {testSDK.isPending ? "Testing..." : "Test 1inch SDK"}
                </Button>
                {testSDK.isPending && (
                    <p className="text-sm text-blue-600 mt-2">
                        Testing SDK integration...
                    </p>
                )}
            </CardContent>
        </Card>
    );
} 