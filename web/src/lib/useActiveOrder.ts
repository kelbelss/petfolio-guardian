import { useState } from 'react';

export function useActiveOrder() {
  const [orderHash] = useState<string | null>(
    sessionStorage.getItem('orderHash')
  );
  return orderHash;
} 