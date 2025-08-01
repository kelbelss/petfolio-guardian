import { useTokens, type TokenMeta } from '@/lib/oneInchService';

export default function TokenSelect({
    value,
    onChange,
    placeholder = 'Select token…',
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    const { data } = useTokens();

    if (!data) return <div className="text-sm text-gray-400">Loading tokens…</div>;

    // Flatten the response map into an array
    const tokens = Object.values(data.tokens ?? data) as TokenMeta[];

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-10 border rounded px-3 text-left bg-white"
        >
            <option value="">{placeholder}</option>
            {tokens.map(t => (
                <option key={t.address} value={t.address}>
                    {t.symbol} - {t.name}
                </option>
            ))}
        </select>
    );
} 