// src/components/TestInput.tsx - Simple test to isolate input issue
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function TestInput() {
    const [value, setValue] = useState('');

    return (
        <div className="p-8 bg-white rounded-lg shadow-lg max-w-md mx-auto mt-8">
            <h2 className="text-xl font-bold mb-4">Test Input</h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">Simple Input (should work):</label>
                    <Input
                        type="text"
                        value={value}
                        onChange={(e) => {
                            console.log('Simple input changed:', e.target.value);
                            setValue(e.target.value);
                        }}
                        placeholder="Type here..."
                        className="w-full"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Number Input (test):</label>
                    <Input
                        type="text"
                        value={value}
                        onChange={(e) => {
                            console.log('Number input changed:', e.target.value);
                            const val = e.target.value;
                            if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                setValue(val);
                            }
                        }}
                        placeholder="0.00"
                        className="w-full"
                    />
                </div>

                <div className="text-sm text-gray-600">
                    <p>Current value: "{value}"</p>
                    <p>Try typing "0" and see what happens</p>
                </div>
            </div>
        </div>
    );
} 