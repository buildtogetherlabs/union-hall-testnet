/**
 * Live ETH → $HOOD swap via PoolSwapTest on Robinhood testnet.
 * Requires: ethers UMD, chain.js, wallet.js, mock-data.js (config).
 */
window.IBH = window.IBH || {};

(function () {
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function getProvider() {
    var eth = window.IBH.wallet && window.IBH.wallet.ethereum();
    if (!eth) throw new Error("Wallet not found");
    if (!window.ethers) throw new Error("ethers.js failed to load");
    return new window.ethers.BrowserProvider(eth);
  }

  function poolKey() {
    var c = window.IBH.chain;
    var a = c.addresses;
    return {
      currency0: a.poolManager ? c.pool.currency0 : "0x0000000000000000000000000000000000000000",
      currency1: a.hood,
      fee: c.pool.fee,
      tickSpacing: c.pool.tickSpacing,
      hooks: a.feeHook,
    };
  }

  /** Rough quote at ~1:1 pool after 3.5% distribution fee (+ ~0.3% pool fee estimate). */
  function estimateHoodOut(ethIn) {
    if (!ethIn || ethIn <= 0) return 0;
    var afterDist = ethIn * (1 - 0.035);
    var afterPool = afterDist * (1 - 0.003);
    return afterPool; // 1:1 sqrt price seed
  }

  async function buyHood(ethAmountStr) {
    var wallet = window.IBH.wallet;
    if (!wallet) throw new Error("Wallet module missing");
    await wallet.ensureChain();
    var addr = await wallet.connect();
    if (!addr) throw new Error("Connect a wallet first");

    var ethIn = window.ethers.parseEther(String(ethAmountStr));
    if (ethIn <= 0n) throw new Error("Enter an ETH amount greater than 0");

    var provider = getProvider();
    var signer = await provider.getSigner();
    var bal = await provider.getBalance(addr);
    if (bal < ethIn) throw new Error("Insufficient ETH balance (need gas + swap amount)");

    var routerAddr = window.IBH.chain.addresses.swapRouter;
    var router = new window.ethers.Contract(routerAddr, window.IBH.abis.poolSwapTest, signer);
    var key = poolKey();
    var params = {
      zeroForOne: true,
      amountSpecified: -ethIn, // exact ETH in
      sqrtPriceLimitX96: BigInt(window.IBH.chain.minSqrtPriceX96Plus1),
    };
    var testSettings = { takeClaims: false, settleUsingBurn: false };

    var hood = new window.ethers.Contract(
      window.IBH.chain.addresses.hood,
      window.IBH.abis.erc20,
      provider
    );
    var before = await hood.balanceOf(addr);

    var tx = await router.swap(key, params, testSettings, "0x", { value: ethIn });
    var receipt = await tx.wait();
    var after = await hood.balanceOf(addr);
    var received = after - before;

    return {
      hash: receipt.hash,
      ethIn: ethAmountStr,
      hoodReceived: window.ethers.formatEther(received),
      explorer: window.IBH.chain.explorer + "/tx/" + receipt.hash,
    };
  }

  function setStatus(el, msg, kind) {
    if (!el) return;
    el.textContent = msg || "";
    el.classList.remove("is-error", "is-ok", "is-pending");
    if (kind) el.classList.add(kind);
  }

  function bindSwapUi() {
    var form = $("[data-swap-form]");
    if (!form || form.getAttribute("data-live-bound") === "1") return;
    form.setAttribute("data-live-bound", "1");

    var youPay = $("[data-swap-pay]");
    var youGet = $("[data-swap-get]");
    var rateEl = $("[data-swap-rate]");
    var feeEl = $("[data-swap-fee-note]");
    var statusEl = $("[data-swap-status]");
    var connectBtn = $("[data-wallet-connect]");
    var walletLabel = $("[data-wallet-label]");

    function refreshWalletUi() {
      var s = window.IBH.wallet.getState();
      if (walletLabel) {
        walletLabel.textContent = s.connected
          ? s.short + (s.onTestnet ? "" : " · wrong network")
          : "Not connected";
      }
      if (connectBtn) {
        connectBtn.textContent = s.connected ? "Connected" : "Connect wallet";
      }
      if (s.connected && s.address && window.IBH.live) {
        window.IBH.live
          .refreshMember(s.address)
          .then(function (snap) {
            window.IBH.live.paintBalances(snap);
            var ethEl = $("[data-live-eth-note]");
            var hoodEl = $("[data-live-hood-note]");
            if (ethEl && snap && snap.ethBalance != null) {
              ethEl.textContent = "Wallet ETH: " + window.IBH.live.formatEth(snap.ethBalance);
            }
            if (hoodEl && snap && snap.hoodBalance != null) {
              hoodEl.textContent = "Wallet $HOOD: " + window.IBH.live.formatHood(snap.hoodBalance);
            }
          })
          .catch(function () {});
      }
    }

    function quote() {
      var ethIn = parseFloat(youPay && youPay.value ? youPay.value : "0") || 0;
      var hoodOut = estimateHoodOut(ethIn);
      if (youGet) {
        youGet.value =
          hoodOut > 0
            ? hoodOut.toLocaleString("en-US", { maximumFractionDigits: 6 })
            : "";
      }
      if (rateEl) {
        rateEl.textContent =
          ethIn > 0
            ? "Est. ~" +
              (hoodOut / ethIn).toLocaleString("en-US", { maximumFractionDigits: 4 }) +
              " $HOOD per ETH (1:1 pool · after ~3.5% dues + pool fee). Actual fill from the pool."
            : "Enter ETH amount for an estimate";
      }
      if (feeEl) {
        feeEl.textContent =
          "Buys and sells of $HOOD include a " +
          ((window.IBH.config && window.IBH.config.feeLabel) || "3.5%") +
          " distribution fee to the treasury (plus Uniswap pool fees).";
      }
    }

    if (youPay) {
      youPay.addEventListener("input", quote);
      youPay.addEventListener("change", quote);
    }
    quote();

    if (connectBtn) {
      connectBtn.addEventListener("click", function (e) {
        e.preventDefault();
        setStatus(statusEl, "Connecting…", "is-pending");
        window.IBH.wallet
          .connect()
          .then(function () {
            setStatus(statusEl, "Wallet connected on " + window.IBH.chain.chainName, "is-ok");
            refreshWalletUi();
          })
          .catch(function (err) {
            setStatus(statusEl, err.message || String(err), "is-error");
          });
      });
    }

    window.IBH.wallet.onChange(refreshWalletUi);
    window.IBH.wallet.getAccounts().then(refreshWalletUi);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var amt = youPay && youPay.value;
      if (!amt || parseFloat(amt) <= 0) {
        setStatus(statusEl, "Enter an ETH amount", "is-error");
        return;
      }
      var submit = form.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      setStatus(statusEl, "Confirm in MetaMask…", "is-pending");

      buyHood(amt)
        .then(function (res) {
          setStatus(
            statusEl,
            "Swapped " +
              res.ethIn +
              " ETH → ~" +
              res.hoodReceived +
              " $HOOD. " +
              "Tx: " +
              res.hash.slice(0, 10) +
              "…",
            "is-ok"
          );
          if (rateEl) {
            rateEl.innerHTML =
              'Received <strong>' +
              res.hoodReceived +
              '</strong> $HOOD · <a href="' +
              res.explorer +
              '" target="_blank" rel="noopener">View on explorer →</a>';
          }
          quote();
          refreshWalletUi();
          try {
            localStorage.setItem("ibh_clocked_in", "1");
          } catch (e) {}
        })
        .catch(function (err) {
          var msg = err && err.shortMessage ? err.shortMessage : err.message || String(err);
          if (/user rejected|denied/i.test(msg)) msg = "Transaction rejected in wallet";
          setStatus(statusEl, msg, "is-error");
        })
        .finally(function () {
          if (submit) submit.disabled = false;
        });
    });
  }

  window.IBH.swapLive = {
    bind: bindSwapUi,
    buyHood: buyHood,
    estimateHoodOut: estimateHoodOut,
  };

  function boot() {
    if (window.IBH.applyTestnetConfig) window.IBH.applyTestnetConfig();
    bindSwapUi();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
