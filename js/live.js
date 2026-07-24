/**
 * On-chain reads for Robinhood testnet (HOOD balance, treasury, holders).
 * Requires ethers UMD + chain.js. Optional wallet.js for connected address.
 */
window.IBH = window.IBH || {};

(function () {
  function rpcProvider() {
    if (!window.ethers) throw new Error("ethers.js failed to load");
    var c = window.IBH.chain;
    if (!c || !c.rpcUrl) throw new Error("chain config missing");
    return new window.ethers.JsonRpcProvider(c.rpcUrl, c.chainId);
  }

  function browserProvider() {
    var eth = window.IBH.wallet && window.IBH.wallet.ethereum();
    if (eth && window.ethers) return new window.ethers.BrowserProvider(eth);
    return null;
  }

  async function provider() {
    var bp = browserProvider();
    if (bp) {
      try {
        return bp;
      } catch (e) {}
    }
    return rpcProvider();
  }

  function hoodContract(p) {
    var a = window.IBH.chain.addresses.hood;
    return new window.ethers.Contract(a, window.IBH.abis.hood, p);
  }

  async function getHoodBalance(address) {
    if (!address) return null;
    var p = await provider();
    var bal = await hoodContract(p).balanceOf(address);
    return bal;
  }

  async function getEthBalance(address) {
    if (!address) return null;
    var p = await provider();
    return p.getBalance(address);
  }

  async function getTreasuryEth() {
    var p = await provider();
    var t = window.IBH.chain.addresses.stockTreasury;
    return p.getBalance(t);
  }

  async function getTotalSupply() {
    var p = await provider();
    return hoodContract(p).totalSupply();
  }

  async function getHolderCount() {
    var p = await provider();
    return hoodContract(p).holderCount();
  }

  function formatHood(wei) {
    if (wei == null) return "—";
    var n = Number(window.ethers.formatEther(wei));
    if (!isFinite(n)) return window.ethers.formatEther(wei);
    if (n === 0) return "0";
    if (n < 0.000001) return n.toExponential(2);
    if (n < 1) return n.toLocaleString("en-US", { maximumFractionDigits: 8 });
    return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }

  function formatEth(wei) {
    if (wei == null) return "—";
    var n = Number(window.ethers.formatEther(wei));
    if (!isFinite(n)) return window.ethers.formatEther(wei) + " ETH";
    if (n === 0) return "0 ETH";
    if (n < 0.000001) return n.toExponential(3) + " ETH";
    return n.toLocaleString("en-US", { maximumFractionDigits: 6 }) + " ETH";
  }

  function shortAddr(a) {
    if (!a || a.length < 12) return a || "—";
    return a.slice(0, 6) + "…" + a.slice(-4);
  }

  /**
   * Pull live member fields into mock.demoMember for existing renderers.
   * Stocks / dividend history stay mock until event indexing.
   */
  async function refreshMember(address) {
    var mem = window.IBH.mock && window.IBH.mock.demoMember;
    if (!mem || !address) return null;

    var hoodBal = await getHoodBalance(address);
    var supply = await getTotalSupply();
    var ethBal = await getEthBalance(address);

    mem.address = address;
    mem.memberName = shortAddr(address);
    mem.hoodBalance = formatHood(hoodBal);
    mem.hoodBalanceWei = hoodBal != null ? hoodBal.toString() : null;
    mem.ethBalance = formatEth(ethBal);
    mem.live = true;
    mem.status =
      hoodBal && hoodBal > 0n
        ? "Member in good standing · testnet"
        : "Connected · no $HOOD yet (buy on Swap)";

    if (supply && supply > 0n && hoodBal != null) {
      var shareBps = Number((hoodBal * 1000000n) / supply) / 10000;
      mem.sharePct =
        shareBps > 0
          ? shareBps.toLocaleString("en-US", { maximumFractionDigits: 4 }) + "%"
          : "0%";
    } else {
      mem.sharePct = "—";
    }

    // Keep demo stocks labeled until distribution events are indexed.
    if (!mem._stocksNoteApplied) {
      mem.dividendValue = mem.dividendValue || "—";
      mem._stocksNoteApplied = true;
    }

    return {
      address: address,
      hoodBalance: hoodBal,
      ethBalance: ethBal,
      supply: supply,
    };
  }

  async function refreshProtocol() {
    var m = window.IBH.mock && window.IBH.mock.protocol;
    if (!m) return null;
    try {
      var treasury = await getTreasuryEth();
      m.treasuryEth = Number(window.ethers.formatEther(treasury));
      m.feesEth = m.treasuryEth; // cumulative fees sit in treasury until spent
      try {
        var holders = await getHolderCount();
        m.members = Number(holders);
      } catch (e) {}
      m.live = true;
      return { treasuryEth: treasury, members: m.members };
    } catch (e) {
      console.warn("IBH.live.refreshProtocol", e);
      return null;
    }
  }

  function setTextAll(sel, text) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.textContent = text;
    });
  }

  function paintBalances(snapshot) {
    if (!snapshot) return;
    setTextAll(
      "[data-live-hood]",
      snapshot.hoodBalance != null ? formatHood(snapshot.hoodBalance) : "—"
    );
    setTextAll(
      "[data-live-eth]",
      snapshot.ethBalance != null ? formatEth(snapshot.ethBalance) : "—"
    );
    setTextAll("[data-live-address]", snapshot.address ? shortAddr(snapshot.address) : "—");
  }

  window.IBH.live = {
    getHoodBalance: getHoodBalance,
    getEthBalance: getEthBalance,
    getTreasuryEth: getTreasuryEth,
    getTotalSupply: getTotalSupply,
    getHolderCount: getHolderCount,
    refreshMember: refreshMember,
    refreshProtocol: refreshProtocol,
    formatHood: formatHood,
    formatEth: formatEth,
    paintBalances: paintBalances,
    shortAddr: shortAddr,
  };
})();
