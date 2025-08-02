Making one Review component reusable for all three DCA modes
Mode	Extra fields you need	Display changes	Backend params
Self-swap (current)	none	keep rows “Recipient: Self” + “Deposit to Aave: No”	recipient = 0, depositToAave = false
Friend	draft.recipient	Row shows short address (0x1234…def8)	recipient = draft.recipient, depositToAave = false
Yield	draft.depositToAave = true, draft.aavePool	Row “Deposit to Aave: Yes (aUSDC)” and maybe “Pool: 0x…4402”	depositToAave = true, aavePool = draft.aavePool

Step-by-step refactor
Extend the draft store

ts
Copy
Edit
type Draft = {
  …existing
  mode: 'self' | 'friend' | 'yield';
  recipient?: `0x${string}`;
  depositToAave?: boolean;
  aavePool?: `0x${string}`;
}
Lift review rows into a small data array

ts
Copy
Edit
const summaryRows = [
  { label: 'Source Token', value: srcSymbol },
  { label: 'Destination Token', value: dstSymbol },
  { label: 'Recipient', value:
      draft.mode === 'friend' ? shortHash(draft.recipient!) : 'Self' },
  { label: 'Deposit to Aave',
      value: draft.mode === 'yield' ? 'Yes' : 'No' },
  // …more rows
];
Then map over them:

tsx
Copy
Edit
<dl className="grid grid-cols-[auto,1fr] gap-y-2 gap-x-4 text-sm">
  {summaryRows.map(r => <Row key={r.label} label={r.label}>{r.value}</Row>)}
</dl>
Parametrise the confirm handler

ts
Copy
Edit
await createOrder({
  …,
  twapParams: {
    …,
    recipient: draft.mode === 'friend' ? draft.recipient : undefined,
    depositToAave: draft.mode === 'yield',
    aavePool: draft.mode === 'yield' ? draft.aavePool : undefined
  }
});
Route reuse

Keep one route path (/dca/review) but ensure the wizard pages 1 & 2 write the proper mode & extras into feedStore. The Review component won’t need to know which page the user came from.

Conditionally render

If draft.mode === 'yield' but !draft.aavePool, redirect back to setup.