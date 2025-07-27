export async function fetchQuote(src: string, dst: string, amount: string) {
  const url = `https://api.1inch.dev/swap/v5.2/1/quote?src=${src}&dst=${dst}&amount=${amount}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': import.meta.env.VITE_ONE_INCH_KEY || '',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch quote');
  const data = await res.json();
  return {
    toTokenAmount: data.toTokenAmount,
    estimatedGas: data.estimatedGas,
  };
} 