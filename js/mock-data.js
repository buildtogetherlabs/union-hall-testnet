/**
 * Demo / placeholder data for Local 4663 Union Books.
 * Looks “live” in UI previews; replace with on-chain reads before launch.
 *
 * Naming:
 *   Union Books  — the product (this app; nav tab: Books)
 *   Union Hall   — the community (Telegram)
 *
 * IBH.config.launched — flip to true after token + pool go live to unlock Swap.
 */
window.IBH = window.IBH || {};

/**
 * Product rules (locked for now — see docs.html#fees):
 * 1. Who pays: buys and sells (3.5% distribution fee in ETH).
 * 2. Path: trade fee → treasury → stock buy → distributor → member wallets.
 * 3. Eligible: any positive $HOOD balance (no minimum holdings).
 * 4. Cadence: distributionInterval (~30 minutes). Keep next-run clock on Books.
 * Payout: Mag8 stock tokens (GOOGL/AMZN/AAPL/META/MSFT/NFLX/NVDA/TSLA) — not more $HOOD.
 * Tagline: Hold $HOOD. Collect union dividends in stocks — not more $HOOD.
 */
window.IBH.config = {
  /**
   * siteMode:
   *   "demo"    — mock numbers only (public preview, view-only)
   *   "testnet" — MetaMask + Robinhood testnet (shareable test site)
   *   "source"  — private working copy (same as testnet wiring by default)
   */
  siteMode: "testnet",
  /**
   * When true, Swap desk is open. Testnet is live after 2026-07-24 redeploy;
   * chain.js applyTestnetConfig() also forces launched=true.
   */
  launched: true,
  network: "testnet",
  /** Optional external aggregator; unused when swapRouter is set. */
  swapUrl: "",
  /** Permanent PoolSwapTest on testnet (also set by chain.js applyTestnetConfig). Empty in demo mode. */
  swapRouter: "0x374E47C3ca1b06f4C58b1aB5d67Bf74903f17884",
  /**
   * WalletConnect (Reown) Cloud project id — free at https://cloud.walletconnect.com
   * Required for the WalletConnect option in the multi-wallet picker.
   */
  walletConnectProjectId: "",
  /**
   * Community: Union Hall lives on Telegram (not a product tab).
   * Set to full https://t.me/... URL when ready; footer “Union Hall” uses this.
   */
  telegramUrl: "",
  chainId: 46630,
  chainName: "Robinhood Chain Testnet",
  explorerBase: "https://explorer.testnet.chain.robinhood.com",
  rpcUrl: "https://rpc.testnet.chain.robinhood.com",
  /**
   * No minimum holdings — any positive HOOD balance is dividend-eligible.
   * Display label for UI; owner may raise a floor later on-chain if needed.
   */
  minHood: "any",
  /** Distribution fee on $HOOD buys and sells (basis points / display label). */
  feeBps: 350,
  feeLabel: "3.5%",
  /** Books cadence for next dividend run (keep this schedule). */
  distributionInterval: "30 minutes",
  /** Dividend basket label (owner can update on-chain; UI mock tracks product intent). */
  basketName: "Mag8",
  /**
   * Yield calculator defaults (BANG-style: position × share of fee stream on volume).
   * dailyVolumeUsd — assumed $HOOD buy+sell volume / day
   * feeEfficiency — fraction of dues that reach stock buys after path costs (BANG uses ~0.99)
   * eligibleSupply — HOOD balances eligible for dividends (demo float; not full 1B mint)
   */
  yieldCalc: {
    dailyVolumeUsd: 25000,
    feeEfficiency: 0.99,
    eligibleSupply: 40000000,
  },
  contracts: {
    ReflectionToken: {
      address: "0xa73533aD0002DAb67b5E22afcC07760f12b097d4",
      role: "HOOD ERC-20 · holder list · any positive balance",
    },
    IndexFeeHook: {
      address: "0xDdd77A1E43769C12B9386e3080E7230e1E4FC0cC",
      role: "Uniswap V4 hook · 3.5% buy+sell fee → treasury",
    },
    StockTreasury: {
      address: "0x2d7cE291087b1d5DFc2B424Bf89C0f434D85ccEc",
      role: "Accumulates trade-fee dues · buys stock tokens",
    },
    StockDistributor: {
      address: "0xE7bC80790c4a6f2d2EBA056E5A98cEA5F8C911d8",
      role: "Pro-rata stock airdrops on the distribution interval",
    },
    LpLock: {
      address: "0xF0af4d2876F1Fd8B2E240c855aF97e8a69Eb7313",
      role: "Full-range LP seed · fees collectable, LP locked",
    },
    PoolManager: {
      address: "0x8366a39CC670B4001A1121B8F6A443A643e40951",
      role: "Uniswap V4 PoolManager (chain)",
    },
    SwapRouter: {
      address: "0x374E47C3ca1b06f4C58b1aB5d67Bf74903f17884",
      role: "PoolSwapTest · UI ETH↔HOOD swaps (testnet)",
    },
    WETH: {
      address: "0x7943e237c7F95DA44E0301572D358911207852Fa",
      role: "Wrapped ETH (testnet)",
    },
    USDG: {
      address: "0xa927aeC97CD1dD0A0d742fa4A4c50cCE2DA48961",
      role: "Mock USDG (testnet)",
    },
  },
};

// Apply live testnet addresses when chain.js is present (loaded after this file on swap page).
if (typeof window.IBH.applyTestnetConfig === "function") {
  window.IBH.applyTestnetConfig();
}

window.IBH.mock = {
  protocol: {
    totalPaidUsd: 128450.75,
    duesEth: 42.18,
    members: 1863,
    nextRunLabel: "18:00 UTC",
    nextRunCountdown: "00:24:12",
    hoodPriceUsd: "0.0012",
    treasuryEth: 3.42,
    feesEth: 42.18,
  },

  latestRun: {
    membersPaid: 1863,
    assets: [
      { ticker: "GOOGL", amount: "+42.10", usd: "$7,620" },
      { ticker: "AMZN", amount: "+38.50", usd: "$7,120" },
      { ticker: "AAPL", amount: "+48.20", usd: "$9,640" },
      { ticker: "META", amount: "+14.80", usd: "$7,840" },
      { ticker: "MSFT", amount: "+18.60", usd: "$7,990" },
      { ticker: "NFLX", amount: "+9.40", usd: "$6,110" },
      { ticker: "NVDA", amount: "+52.30", usd: "$6,800" },
      { ticker: "TSLA", amount: "+28.70", usd: "$7,180" },
    ],
  },

  /** Mag8 dividend basket — Alphabet, Amazon, Apple, Meta, Microsoft, Netflix, Nvidia, Tesla. */
  basket: [
    { ticker: "GOOGL", company: "Alphabet", holdings: "1,240", price: "$181.00", url: "#" },
    { ticker: "AMZN", company: "Amazon", holdings: "980", price: "$185.00", url: "#" },
    { ticker: "AAPL", company: "Apple", holdings: "1,520", price: "$200.00", url: "#" },
    { ticker: "META", company: "Meta", holdings: "420", price: "$530.00", url: "#" },
    { ticker: "MSFT", company: "Microsoft", holdings: "560", price: "$430.00", url: "#" },
    { ticker: "NFLX", company: "Netflix", holdings: "210", price: "$650.00", url: "#" },
    { ticker: "NVDA", company: "Nvidia", holdings: "1,680", price: "$130.00", url: "#" },
    { ticker: "TSLA", company: "Tesla", holdings: "890", price: "$250.00", url: "#" },
  ],

  /** Hall-wide dividend runs (Index: distributions). Each row links to tx. */
  payouts: [
    {
      date: "21 Jul 2026 · 17:30 UTC",
      assets: "GOOGL 42.10 · AMZN 38.50 · AAPL 48.20 · META 14.80 · MSFT 18.60 · NFLX 9.40 · NVDA 52.30 · TSLA 28.70",
      members: "1,863",
      tx: "https://robinhoodchain.blockscout.com/",
    },
    {
      date: "21 Jul 2026 · 17:00 UTC",
      assets: "GOOGL 22.00 · AMZN 20.10 · AAPL 25.40 · META 7.80 · MSFT 9.70 · NFLX 5.00 · NVDA 27.60 · TSLA 15.10",
      members: "1,858",
      tx: "https://robinhoodchain.blockscout.com/",
    },
    {
      date: "21 Jul 2026 · 16:30 UTC",
      assets: "GOOGL 8.40 · AMZN 7.60 · AAPL 9.60 · META 2.95 · MSFT 3.70 · NFLX 1.88 · NVDA 10.40 · TSLA 5.70",
      members: "1,851",
      tx: "https://robinhoodchain.blockscout.com/",
    },
    {
      date: "21 Jul 2026 · 16:00 UTC",
      assets: "GOOGL 14.20 · AMZN 12.90 · AAPL 16.30 · META 5.00 · MSFT 6.25 · NFLX 3.15 · NVDA 17.60 · TSLA 9.65",
      members: "1,842",
      tx: "https://robinhoodchain.blockscout.com/",
    },
  ],

  /** Treasury stock purchases funded by dues. */
  treasuryBuys: [
    {
      date: "21 Jul 2026 · 17:20 UTC",
      assets: "Purchased Mag8 (GOOGL / AMZN / AAPL / META / MSFT / NFLX / NVDA / TSLA) with dues (equal split)",
      members: "Treasury",
      tx: "https://robinhoodchain.blockscout.com/",
    },
    {
      date: "21 Jul 2026 · 16:50 UTC",
      assets: "Purchased Mag8 (GOOGL / AMZN / AAPL / META / MSFT / NFLX / NVDA / TSLA) with dues (equal split)",
      members: "Treasury",
      tx: "https://robinhoodchain.blockscout.com/",
    },
    {
      date: "21 Jul 2026 · 16:20 UTC",
      assets: "Purchased Mag8 (GOOGL / AMZN / AAPL / META / MSFT / NFLX / NVDA / TSLA) with dues (equal split)",
      members: "Treasury",
      tx: "https://robinhoodchain.blockscout.com/",
    },
  ],

  demoMember: {
    address: "0x4663…a1b2",
    memberName: "Brother / Sister",
    memberSince: "21 Jul 2026",
    cardNumber: "4663-01863",
    dues: "Paid via 3.5% buy/sell fee",
    status: "Member in Good Standing",
    /** Scaled from 48k → 500k HOOD demo for higher dollar previews. */
    sharePct: "1.25%",
    /** Lifetime stocks-earned value (sum of stocksEarned[].usd). */
    dividendValue: "$6,274.18",
    hoodBalance: "500,000",
    hoodValueUsd: "$600.00",
    stocksEarned: [
      { ticker: "GOOGL", amount: "4.38", usd: "$792.78" },
      { ticker: "AMZN", amount: "3.96", usd: "$732.60" },
      { ticker: "AAPL", amount: "5.00", usd: "$1,000.00" },
      { ticker: "META", amount: "1.56", usd: "$826.80" },
      { ticker: "MSFT", amount: "1.98", usd: "$851.40" },
      { ticker: "NFLX", amount: "0.94", usd: "$611.00" },
      { ticker: "NVDA", amount: "5.42", usd: "$704.60" },
      { ticker: "TSLA", amount: "3.02", usd: "$755.00" },
    ],
    /**
     * Personal dividend receipts (Form 4663-R + distributions history).
     * Prefer `lines: [{ticker, amount}]` for the receipt table; `assets` string
     * remains for ledger rows and as a parse fallback.
     * status: "PAID" | "PENDING"
     */
    distributions: [
      {
        date: "21 Jul 2026 · 17:30 UTC",
        assets: "GOOGL 0.188 · AMZN 0.167 · AAPL 0.219 · META 0.063 · MSFT 0.083 · NFLX 0.042 · NVDA 0.229 · TSLA 0.125",
        lines: [
          { ticker: "GOOGL", amount: "0.188" },
          { ticker: "AMZN", amount: "0.167" },
          { ticker: "AAPL", amount: "0.219" },
          { ticker: "META", amount: "0.063" },
          { ticker: "MSFT", amount: "0.083" },
          { ticker: "NFLX", amount: "0.042" },
          { ticker: "NVDA", amount: "0.229" },
          { ticker: "TSLA", amount: "0.125" },
        ],
        value: "$20.00",
        status: "PAID",
        tx: "https://robinhoodchain.blockscout.com/",
        txLabel: "View transaction →",
      },
      {
        date: "21 Jul 2026 · 17:00 UTC",
        assets: "GOOGL 0.094 · AMZN 0.083 · AAPL 0.115 · META 0.031 · MSFT 0.042 · NFLX 0.021 · NVDA 0.125 · TSLA 0.063",
        lines: [
          { ticker: "GOOGL", amount: "0.094" },
          { ticker: "AMZN", amount: "0.083" },
          { ticker: "AAPL", amount: "0.115" },
          { ticker: "META", amount: "0.031" },
          { ticker: "MSFT", amount: "0.042" },
          { ticker: "NFLX", amount: "0.021" },
          { ticker: "NVDA", amount: "0.125" },
          { ticker: "TSLA", amount: "0.063" },
        ],
        value: "$10.52",
        status: "PAID",
        tx: "https://robinhoodchain.blockscout.com/",
      },
      {
        date: "21 Jul 2026 · 16:30 UTC",
        assets: "GOOGL 0.042 · AMZN 0.031 · AAPL 0.042 · META 0.010 · MSFT 0.021 · NFLX 0.010 · NVDA 0.042 · TSLA 0.021",
        lines: [
          { ticker: "GOOGL", amount: "0.042" },
          { ticker: "AMZN", amount: "0.031" },
          { ticker: "AAPL", amount: "0.042" },
          { ticker: "META", amount: "0.010" },
          { ticker: "MSFT", amount: "0.021" },
          { ticker: "NFLX", amount: "0.010" },
          { ticker: "NVDA", amount: "0.042" },
          { ticker: "TSLA", amount: "0.021" },
        ],
        value: "$4.38",
        status: "PAID",
        tx: "https://robinhoodchain.blockscout.com/",
      },
    ],
    /** Personal $HOOD purchase / swap history. */
    purchases: [
      {
        date: "21 Jul 2026 · 14:12 UTC",
        assets: "Bought 260,000 $HOOD for 0.325 ETH",
        value: "0.325 ETH",
        tx: "https://robinhoodchain.blockscout.com/",
      },
      {
        date: "21 Jul 2026 · 11:05 UTC",
        assets: "Bought 240,000 $HOOD for 0.300 ETH",
        value: "0.300 ETH",
        tx: "https://robinhoodchain.blockscout.com/",
      },
    ],
  },
};
