/**
 * Multi-wallet connect for Robinhood Chain Testnet.
 * Discovers injected providers (EIP-6963 + known globals) and offers a picker:
 * MetaMask, OKX, Rabby, Phantom (EVM), WalletConnect.
 */
window.IBH = window.IBH || {};

(function () {
  var state = {
    address: null,
    chainId: null,
    connecting: false,
    provider: null,
    walletId: null,
    walletName: null,
  };

  var eip6963 = []; // { info, provider }
  var STORAGE_KEY = "ibh_wallet_id";

  var CATALOG = [
    {
      id: "metamask",
      name: "MetaMask",
      rdns: ["io.metamask", "io.metamask.flask"],
      flags: ["isMetaMask"],
      excludeFlags: ["isRabby", "isOkxWallet", "isOKExWallet", "isPhantom"],
      install: "https://metamask.io/download/",
      icon: "🦊",
    },
    {
      id: "okx",
      name: "OKX Wallet",
      rdns: ["com.okex.wallet", "com.okx.wallet"],
      flags: ["isOkxWallet", "isOKExWallet"],
      install: "https://www.okx.com/web3",
      icon: "⬛",
    },
    {
      id: "rabby",
      name: "Rabby",
      rdns: ["io.rabby"],
      flags: ["isRabby"],
      install: "https://rabby.io/",
      icon: "🐰",
    },
    {
      id: "phantom",
      name: "Phantom",
      rdns: ["app.phantom"],
      flags: ["isPhantom"],
      install: "https://phantom.app/download",
      icon: "👻",
    },
    {
      id: "walletconnect",
      name: "WalletConnect",
      install: null,
      icon: "🔗",
      always: true,
    },
  ];

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
        fn(getState());
      } catch (e) {}
    });
  }

  function ethereum() {
    return state.provider || null;
  }

  function collectInjectedProviders() {
    var list = [];
    var seen = [];

    function add(provider, hint) {
      if (!provider || typeof provider.request !== "function") return;
      if (seen.indexOf(provider) !== -1) return;
      seen.push(provider);
      list.push({ provider: provider, hint: hint || "" });
    }

    // EIP-6963 announcements
    eip6963.forEach(function (d) {
      add(d.provider, (d.info && (d.info.rdns || d.info.name)) || "eip6963");
    });

    // Known globals (OKX / Phantom often inject separately)
    if (window.okxwallet) add(window.okxwallet, "okx");
    if (window.okxwallet && window.okxwallet.ethereum) add(window.okxwallet.ethereum, "okx-eth");
    if (window.phantom && window.phantom.ethereum) add(window.phantom.ethereum, "phantom");
    if (window.rabby) add(window.rabby, "rabby");

    var eth = window.ethereum;
    if (eth) {
      if (Array.isArray(eth.providers)) {
        eth.providers.forEach(function (p, i) {
          add(p, "providers[" + i + "]");
        });
      } else {
        add(eth, "window.ethereum");
      }
    }

    return list;
  }

  function providerMatchesCatalog(provider, entry) {
    if (!provider || !entry) return false;
    if (entry.id === "walletconnect") return false;

    // EIP-6963 rdns match preferred
    for (var i = 0; i < eip6963.length; i++) {
      var d = eip6963[i];
      if (d.provider !== provider) continue;
      var rdns = (d.info && d.info.rdns) || "";
      if (entry.rdns && entry.rdns.indexOf(rdns) !== -1) return true;
      var name = ((d.info && d.info.name) || "").toLowerCase();
      if (name && name.indexOf(entry.name.toLowerCase().split(" ")[0]) !== -1) return true;
    }

    if (entry.excludeFlags) {
      for (var x = 0; x < entry.excludeFlags.length; x++) {
        if (provider[entry.excludeFlags[x]]) return false;
      }
    }
    if (entry.flags) {
      for (var f = 0; f < entry.flags.length; f++) {
        if (provider[entry.flags[f]]) return true;
      }
    }

    // Heuristic name match on provider info fields some wallets set
    var label = String(provider._metamask ? "metamask" : "");
    if (entry.id === "metamask" && provider.isMetaMask && !provider.isRabby && !provider.isOkxWallet) {
      return true;
    }
    return false;
  }

  function resolveInstalled(entry) {
    if (entry.id === "walletconnect") {
      return { installed: true, provider: null };
    }
    var injected = collectInjectedProviders();
    for (var i = 0; i < injected.length; i++) {
      if (providerMatchesCatalog(injected[i].provider, entry)) {
        return { installed: true, provider: injected[i].provider };
      }
    }
    // Extra globals
    if (entry.id === "okx" && window.okxwallet) {
      return { installed: true, provider: window.okxwallet.ethereum || window.okxwallet };
    }
    if (entry.id === "phantom" && window.phantom && window.phantom.ethereum) {
      return { installed: true, provider: window.phantom.ethereum };
    }
    if (entry.id === "rabby") {
      for (var j = 0; j < injected.length; j++) {
        if (injected[j].provider && injected[j].provider.isRabby) {
          return { installed: true, provider: injected[j].provider };
        }
      }
    }
    return { installed: false, provider: null };
  }

  function listWallets() {
    return CATALOG.map(function (entry) {
      var res = resolveInstalled(entry);
      return {
        id: entry.id,
        name: entry.name,
        icon: entry.icon,
        install: entry.install,
        installed: !!res.installed,
        provider: res.provider,
      };
    });
  }

  function wireProviderEvents(provider) {
    if (!provider || provider._ibhWired) return;
    provider._ibhWired = true;
    if (provider.on) {
      provider.on("accountsChanged", function (accs) {
        state.address = accs && accs[0] ? accs[0] : null;
        if (!state.address) {
          state.provider = null;
          state.walletId = null;
          state.walletName = null;
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch (e) {}
        }
        notify();
      });
      provider.on("chainChanged", function () {
        window.location.reload();
      });
      provider.on("disconnect", function () {
        state.address = null;
        state.provider = null;
        state.walletId = null;
        state.walletName = null;
        notify();
      });
    }
  }

  async function ensureChain(provider) {
    var eth = provider || ethereum();
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
      if (
        err &&
        (err.code === 4902 ||
          err.code === -32603 ||
          /unrecognized|unknown|not added/i.test(String(err.message || "")))
      ) {
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
      throw new Error(
        "Please switch to " + c.chainName + " (chain " + c.chainId + ") in your wallet"
      );
    }
  }

  async function connectWalletConnect() {
    var c = window.IBH.chain || {};
    var projectId =
      (window.IBH.config && window.IBH.config.walletConnectProjectId) ||
      c.walletConnectProjectId ||
      "";
    if (!projectId) {
      throw new Error(
        "WalletConnect needs a project ID. Set IBH.config.walletConnectProjectId (free at cloud.walletconnect.com)."
      );
    }

    var mod = await import(
      "https://esm.sh/@walletconnect/ethereum-provider@2.17.2"
    );
    var EthereumProvider = mod.EthereumProvider || mod.default;
    if (!EthereumProvider || !EthereumProvider.init) {
      throw new Error("WalletConnect provider failed to load");
    }

    var wc = await EthereumProvider.init({
      projectId: projectId,
      showQrModal: true,
      chains: [c.chainId || 46630],
      optionalChains: [1, 4663],
      rpcMap: (function () {
        var map = {};
        map[c.chainId || 46630] = c.rpcUrl;
        return map;
      })(),
      metadata: {
        name: "Local 4663 · Union Books",
        description: "International Brotherhood of Hoodsters — testnet exchange desk",
        url: typeof location !== "undefined" ? location.origin : "https://local4663.com",
        icons: [
          typeof location !== "undefined"
            ? location.origin + "/assets/HoodstersLogoWhite.png"
            : "https://local4663.com/HoodstersLogoWhite.png",
        ],
      },
    });

    await wc.enable();
    return wc;
  }

  async function connectWith(walletId) {
    var entry = null;
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].id === walletId) {
        entry = CATALOG[i];
        break;
      }
    }
    if (!entry) throw new Error("Unknown wallet");

    if (state.connecting) return state.address;
    state.connecting = true;

    try {
      var provider = null;
      if (entry.id === "walletconnect") {
        provider = await connectWalletConnect();
      } else {
        var res = resolveInstalled(entry);
        if (!res.installed || !res.provider) {
          if (entry.install) {
            window.open(entry.install, "_blank", "noopener");
            throw new Error(entry.name + " is not installed — opened download page");
          }
          throw new Error(entry.name + " is not available in this browser");
        }
        provider = res.provider;
      }

      state.provider = provider;
      state.walletId = entry.id;
      state.walletName = entry.name;
      try {
        localStorage.setItem(STORAGE_KEY, entry.id);
      } catch (e) {}

      wireProviderEvents(provider);
      await ensureChain(provider);

      var accounts = await provider.request({ method: "eth_requestAccounts" });
      state.address = accounts && accounts[0] ? accounts[0] : null;
      try {
        var id = await provider.request({ method: "eth_chainId" });
        state.chainId = parseInt(id, 16);
      } catch (e) {}
      notify();
      return state.address;
    } finally {
      state.connecting = false;
    }
  }

  function closePicker() {
    var el = document.querySelector("[data-wallet-modal]");
    if (el) el.remove();
    document.body.classList.remove("wallet-modal-open");
  }

  function openPicker() {
    return new Promise(function (resolve, reject) {
      closePicker();

      var wallets = listWallets();
      var overlay = document.createElement("div");
      overlay.className = "wallet-modal-overlay";
      overlay.setAttribute("data-wallet-modal", "1");
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", "Choose wallet");

      var panel = document.createElement("div");
      panel.className = "wallet-modal";
      panel.innerHTML =
        '<div class="panel-banner">Form 4663-W · Connect wallet</div>' +
        '<div class="wallet-modal-body">' +
        "<h3>Choose a wallet</h3>" +
        '<p class="muted">Select which wallet to use on Robinhood Chain Testnet.</p>' +
        '<div class="wallet-list" data-wallet-list></div>' +
        '<button type="button" class="btn btn-secondary wallet-modal-cancel" data-wallet-cancel>Cancel</button>' +
        "</div>";

      overlay.appendChild(panel);
      document.body.appendChild(overlay);
      document.body.classList.add("wallet-modal-open");

      var settled = false;
      function cleanup() {
        document.removeEventListener("keydown", onKey);
      }
      function onCancel() {
        if (settled) return;
        settled = true;
        cleanup();
        closePicker();
        reject(new Error("Wallet connection cancelled"));
      }
      function onKey(e) {
        if (e.key === "Escape") onCancel();
      }

      var wcId =
        (window.IBH.config && window.IBH.config.walletConnectProjectId) ||
        (window.IBH.chain && window.IBH.chain.walletConnectProjectId) ||
        "";

      var list = panel.querySelector("[data-wallet-list]");
      wallets.forEach(function (w) {
        var statusText;
        if (w.id === "walletconnect") {
          statusText = wcId
            ? "QR / mobile wallets"
            : "Add free project ID (cloud.walletconnect.com)";
        } else if (w.installed) {
          statusText = "Detected";
        } else {
          statusText = "Not installed — click to get it";
        }

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "wallet-option" + (w.installed ? "" : " is-missing");
        btn.setAttribute("data-wallet-id", w.id);
        btn.innerHTML =
          '<span class="wallet-option-icon" aria-hidden="true">' +
          w.icon +
          "</span>" +
          '<span class="wallet-option-text">' +
          '<span class="wallet-option-name">' +
          w.name +
          "</span>" +
          '<span class="wallet-option-status">' +
          statusText +
          "</span>" +
          "</span>" +
          '<span class="wallet-option-chevron" aria-hidden="true">→</span>';

        btn.addEventListener("click", function () {
          if (settled) return;
          settled = true;
          cleanup();
          closePicker();
          connectWith(w.id).then(resolve).catch(reject);
        });
        list.appendChild(btn);
      });

      panel.querySelector("[data-wallet-cancel]").addEventListener("click", onCancel);
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) onCancel();
      });
      document.addEventListener("keydown", onKey);
    });
  }

  /**
   * Connect — always shows picker unless a provider is already active and forcePicker is false.
   */
  async function connect(opts) {
    opts = opts || {};
    if (opts.forcePicker || !state.provider || !state.address) {
      return openPicker();
    }
    // Re-auth with current provider
    if (state.connecting) return state.address;
    state.connecting = true;
    try {
      await ensureChain(state.provider);
      var accounts = await state.provider.request({ method: "eth_requestAccounts" });
      state.address = accounts && accounts[0] ? accounts[0] : null;
      notify();
      return state.address;
    } finally {
      state.connecting = false;
    }
  }

  async function getAccounts() {
    var eth = ethereum();
    if (!eth) {
      // Try silent restore from last wallet id if still injected
      try {
        var last = localStorage.getItem(STORAGE_KEY);
        if (last && last !== "walletconnect") {
          var res = resolveInstalled(
            CATALOG.filter(function (c) {
              return c.id === last;
            })[0] || {}
          );
          if (res.provider) {
            state.provider = res.provider;
            state.walletId = last;
            wireProviderEvents(res.provider);
            eth = res.provider;
          }
        }
      } catch (e) {}
    }
    if (!eth) return null;
    try {
      var accounts = await eth.request({ method: "eth_accounts" });
      state.address = accounts && accounts[0] ? accounts[0] : null;
      if (state.address) {
        try {
          var id = await eth.request({ method: "eth_chainId" });
          state.chainId = parseInt(id, 16);
        } catch (e) {}
      }
      notify();
      return state.address;
    } catch (e) {
      return null;
    }
  }

  function disconnect() {
    if (state.provider && state.provider.disconnect) {
      try {
        state.provider.disconnect();
      } catch (e) {}
    }
    state.address = null;
    state.provider = null;
    state.walletId = null;
    state.walletName = null;
    state.chainId = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    notify();
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
      walletId: state.walletId,
      walletName: state.walletName,
    };
  }

  function bootEip6963() {
    window.addEventListener("eip6963:announceProvider", function (event) {
      var detail = event.detail;
      if (!detail || !detail.provider) return;
      // de-dupe by uuid
      var uuid = detail.info && detail.info.uuid;
      if (uuid) {
        eip6963 = eip6963.filter(function (d) {
          return !(d.info && d.info.uuid === uuid);
        });
      }
      eip6963.push(detail);
    });
    try {
      window.dispatchEvent(new Event("eip6963:requestProvider"));
    } catch (e) {}
  }

  window.IBH.wallet = {
    connect: connect,
    connectWith: connectWith,
    openPicker: openPicker,
    disconnect: disconnect,
    getAccounts: getAccounts,
    ensureChain: function () {
      return ensureChain(state.provider);
    },
    onChange: onChange,
    getState: getState,
    shortAddr: shortAddr,
    ethereum: ethereum,
    listWallets: listWallets,
  };

  bootEip6963();
  // Second request after other extensions inject
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(function () {
        try {
          window.dispatchEvent(new Event("eip6963:requestProvider"));
        } catch (e) {}
        getAccounts();
      }, 100);
    });
  } else {
    setTimeout(function () {
      try {
        window.dispatchEvent(new Event("eip6963:requestProvider"));
      } catch (e) {}
      getAccounts();
    }, 100);
  }
})();
