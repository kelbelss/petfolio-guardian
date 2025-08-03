export const shortHash = (hash: string) => `${hash.slice(0, 6)}…${hash.slice(-4)}`;

export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

export const getBaseScanUrl = (address: string) => `https://basescan.org/address/${address}`; 