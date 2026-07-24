/**
 * MetaMask / EIP-1193 wallet helpers for Robinhood Chain Testnet.
 */
window.IBH = window.IBH || {};

(function () {
  var state = {
    address: null,
    chainId: null,
    connecting: false,
  };

  function ethereum() {
    return typeof window !== "undefined" ? window.ethereum : null;
  }

  function shortAddr(a) {
    if (!a || a.length < 12) return a || "—";
    return a.slice(0, 6) + "…" + a.slice(-4);
  }

  function listeners(fn) {
    if (!window._ibhWalletListeners) window._ibhWalletListeners = [];
    if (fn) window._ibhWalletListeners.push(fn);
    return window._ibhWalletListeners;
  }

  function notify() {
    listeners().forEach(function (fn) {
      try {
        fn(state);
      } catch (e) {}
    });
  }

  async function ensureChain() {
    var eth = ethereum();
    var c = window.IBH.chain;
    if (!eth || !c) throw new Error("No wallet or chain config");
    var id = await eth.request({ method: "eth_chainId" });
    state.chainId = parseInt(id, 16);
    if (state.chainId === c.chainId) return;
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: c.chainIdHex }],
      });
    } catch (err) {
      // 4902 = unknown chain
      if (err && (err.code === 4902 || err.code === -32603 || /unrecognized|unknown/i.test(String(err.message || "")))) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: c.chainIdHex,
              chainName: c.chainName,
              nativeCurrency: c.nativeCurrency,
              rpcUrls: [c.rpcUrl],
              blockExplorerUrls: [c.explorer],
            },
          ],
        });
      } else {
        throw err;
      }
    }
    id = await eth.request({ method: "eth_chainId" });
    state.chainId = parseInt(id, 16);
    if (state.chainId !== c.chainId) {
      throw new Error("Please switch MetaMask to " + c.chainName + " (chain " + c.chainId + ")");
    }
  }

  async function connect() {
    var eth = ethereum();
    if (!eth) {
      throw new Error("MetaMask (or another EIP-1193 wallet) is required");
    }
    if (state.connecting) return state.address;
    state.connecting = true;
    try {
      await ensureChain();
      var accounts = await eth.request({ method: "eth_requestAccounts" });
      state.address = accounts && accounts[0] ? accounts[0] : null;
      notify();
      return state.address;
    } finally {
      state.connecting = false;
    }
  }

  async function getAccounts() {
    var eth = ethereum();
    if (!eth) return null;
    try {
      var accounts = await eth.request({ method: "eth_accounts" });
      state.address = accounts && accounts[0] ? accounts[0] : null;
      var id = await eth.request({ method: "eth_chainId" });
      state.chainId = parseInt(id, 16);
      notify();
      return state.address;
    } catch (e) {
      return null;
    }
  }

  function onChange(fn) {
    listeners(fn);
  }

  function getState() {
    return {
      address: state.address,
      chainId: state.chainId,
      short: shortAddr(state.address),
      connected: !!state.address,
      onTestnet: state.chainId === (window.IBH.chain && window.IBH.chain.chainId),
    };
  }

  function wireProvider() {
    var eth = ethereum();
    if (!eth || eth._ibhWired) return;
    eth._ibhWired = true;
    eth.on &&
      eth.on("accountsChanged", function (accs) {
        state.address = accs && accs[0] ? accs[0] : null;
        notify();
      });
    eth.on &&
      eth.on("chainChanged", function () {
        window.location.reload();
      });
  }

  window.IBH.wallet = {
    connect: connect,
    getAccounts: getAccounts,
    ensureChain: ensureChain,
    onChange: onChange,
    getState: getState,
    shortAddr: shortAddr,
    ethereum: ethereum,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireProvider);
  } else {
    wireProvider();
  }
})();
