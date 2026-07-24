# Union Books — Testnet (wallet)

**Working testnet UI** for Local 4663 Union Books on **Robinhood Chain Testnet** (chain id **46630**).

**URL:** https://buildtogetherlabs.github.io/union-hall-testnet/

| | |
|--|--|
| Purpose | Share a link so people can connect MetaMask and try swaps |
| Network | Robinhood Chain Testnet · 46630 |
| Swap | ETH → $HOOD via PoolSwapTest |
| Portfolio | Clock in = wallet connect · live $HOOD balance |
| Value | **None** — testnet only |

## How to try

1. Open the URL above (or local server)
2. Install MetaMask; site will prompt to add chain **46630**
3. Get faucet ETH: https://faucet.testnet.chain.robinhood.com/
4. **Swap** → small amount (e.g. `0.0001` ETH — pool is thin)
5. **Portfolio** → Clock in with wallet → see live $HOOD

## Related sites

| Site | URL |
|------|-----|
| Live marketing | https://local4663.com (`buildtogetherlabs/ibh`) |
| Demo (mock, view-only) | https://buildtogetherlabs.github.io/union-hall-preview/ |
| This testnet | https://buildtogetherlabs.github.io/union-hall-testnet/ |

## Contracts

Addresses in `js/chain.js` match `hood-contracts` deployment artifact  
`deployments/robinhood-testnet-46630.json` (2026-07-24 redeploy).

## Local

```bash
python3 -m http.server 8080
# open http://127.0.0.1:8080/swap.html
```
