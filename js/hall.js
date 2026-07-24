/**
 * Union Books UI — membership office, books, board, ledger, swap gate, portfolio.
 * Union Hall (Telegram) is community, not a product tab.
 * Clock In connects MetaMask on testnet when wallet.js is loaded; otherwise local mock.
 */
(function () {
  var STORAGE_KEY = "ibh_clocked_in";

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function isClockedIn() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function setClockedIn(on) {
    try {
      if (on) localStorage.setItem(STORAGE_KEY, "1");
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function isLaunched() {
    return !!(window.IBH && window.IBH.config && window.IBH.config.launched);
  }

  function formatProtocol() {
    var m = window.IBH && window.IBH.mock;
    if (!m) return;

    var p = m.protocol;
    setText("[data-metric='totalPaid']", formatUsd(p.totalPaidUsd));
    setText("[data-metric='dues']", formatEth(p.duesEth));
    setText("[data-metric='members']", String(p.members));
    setText("[data-metric='nextRun']", p.nextRunCountdown || p.nextRunLabel);
    setText("[data-metric='hoodPrice']", p.hoodPriceUsd === "—" ? "—" : "$" + p.hoodPriceUsd);
    setText("[data-metric='treasury']", formatEth(p.treasuryEth));
    setText("[data-metric='fees']", formatEth(p.feesEth));
    setText("[data-metric='nextDist']", p.nextRunLabel);
  }

  function formatUsd(n) {
    if (n === "—" || n == null) return "—";
    if (typeof n === "number" && n === 0) return "$0.00";
    if (typeof n === "number") {
      return (
        "$" +
        n.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    }
    return String(n);
  }

  function formatEth(n) {
    if (n === "—" || n == null || n === "") return "—";
    if (typeof n === "number") {
      return n.toLocaleString("en-US", { maximumFractionDigits: 4 }) + " ETH";
    }
    if (typeof n === "string" && /eth/i.test(n)) return n;
    return String(n);
  }

  function setText(sel, text) {
    $all(sel).forEach(function (el) {
      el.textContent = text;
    });
  }

  function renderLatestRun() {
    var m = window.IBH && window.IBH.mock;
    var list = $("[data-latest-run]");
    if (!m || !list) return;

    var run = m.latestRun;
    setText("[data-latest-members]", String(run.membersPaid));

    list.innerHTML = "";
    run.assets.forEach(function (a) {
      var li = document.createElement("li");
      li.innerHTML =
        '<span class="ticker">' +
        escapeHtml(a.ticker) +
        '</span><span class="amt">' +
        escapeHtml(a.amount) +
        '</span><span class="usd">' +
        escapeHtml(a.usd) +
        "</span>";
      list.appendChild(li);
    });
  }

  function renderBasket() {
    var m = window.IBH && window.IBH.mock;
    var board = $("[data-dividend-board]");
    if (!m || !board) return;

    board.innerHTML = "";
    m.basket.forEach(function (s) {
      var card = document.createElement("article");
      card.className = "notice";
      card.innerHTML =
        '<div class="notice-ticker">' +
        escapeHtml(s.ticker) +
        '</div><div class="notice-name">' +
        escapeHtml(s.company) +
        '</div><div class="notice-row"><span>Treasury holdings</span><span>' +
        escapeHtml(s.holdings) +
        '</span></div><div class="notice-row"><span>Price</span><span>' +
        escapeHtml(s.price) +
        '</span></div><a class="btn btn-sm" href="' +
        escapeAttr(s.url) +
        '"' +
        (s.url === "#" ? ' aria-disabled="true"' : ' target="_blank" rel="noopener"') +
        ">View asset</a>";
      board.appendChild(card);
    });
  }

  function renderLedgerTables() {
    var m = window.IBH && window.IBH.mock;
    if (!m) return;

    fillLedger("payouts", m.payouts, {
      thirdKey: "members",
      thirdLabel: "Members paid",
    });
    fillLedger("buys", m.treasuryBuys, {
      thirdKey: "members",
      thirdLabel: "Notes",
    });
  }

  function fillLedger(kind, rows, opts) {
    opts = opts || {};
    var thirdKey = opts.thirdKey || "members";
    var thirdLabel = opts.thirdLabel || "Detail";
    var tbody = $("[data-ledger-body='" + kind + "']");
    var cards = $("[data-ledger-cards='" + kind + "']");
    if (!tbody && !cards) return;

    if (tbody) {
      tbody.innerHTML = "";
      rows.forEach(function (r) {
        var tr = document.createElement("tr");
        var txCell = r.tx
          ? '<a class="tx" href="' + escapeAttr(r.tx) + '" target="_blank" rel="noopener">View →</a>'
          : '<span class="muted">—</span>';
        var third = r[thirdKey] != null ? r[thirdKey] : r.value != null ? r.value : "—";
        tr.innerHTML =
          "<td>" +
          escapeHtml(r.date) +
          '</td><td class="assets">' +
          escapeHtml(r.assets) +
          "</td><td>" +
          escapeHtml(String(third)) +
          "</td><td>" +
          txCell +
          "</td>";
        // Whole row is clickable when a tx exists
        if (r.tx) {
          tr.className = "is-link";
          tr.setAttribute("data-tx", r.tx);
          tr.setAttribute("tabindex", "0");
          tr.setAttribute("role", "link");
          tr.setAttribute("aria-label", "Open transaction");
        }
        tbody.appendChild(tr);
      });
    }

    if (cards) {
      cards.innerHTML = "";
      rows.forEach(function (r) {
        var div = document.createElement("div");
        div.className = "ledger-card";
        var third = r[thirdKey] != null ? r[thirdKey] : r.value != null ? r.value : "—";
        var tx = r.tx
          ? '<a class="tx" href="' + escapeAttr(r.tx) + '" target="_blank" rel="noopener">View transaction →</a>'
          : "<span>—</span>";
        div.innerHTML =
          '<div class="date">' +
          escapeHtml(r.date) +
          '</div><div class="assets">' +
          escapeHtml(r.assets) +
          '</div><div class="meta"><span>' +
          escapeHtml(thirdLabel) +
          ": " +
          escapeHtml(String(third)) +
          "</span>" +
          tx +
          "</div>";
        if (r.tx) {
          div.className += " is-link";
          div.setAttribute("data-tx", r.tx);
        }
        cards.appendChild(div);
      });
    }
  }

  function bindRowLinks() {
    document.addEventListener("click", function (e) {
      var row = e.target.closest("[data-tx]");
      if (!row) return;
      if (e.target.closest("a")) return;
      var url = row.getAttribute("data-tx");
      if (url) window.open(url, "_blank", "noopener");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var row = e.target.closest("tr[data-tx]");
      if (!row) return;
      e.preventDefault();
      window.open(row.getAttribute("data-tx"), "_blank", "noopener");
    });
  }

  function renderMembership() {
    var clocked = isClockedIn();
    var blank = $("[data-card-blank]");
    var live = $("[data-card-live]");
    var panelOut = $("[data-member-disconnected]");
    var panelIn = $("[data-member-connected]");

    if (blank) blank.classList.toggle("is-blank", !clocked);
    if (blank) blank.classList.toggle("hidden", clocked);
    if (live) live.classList.toggle("hidden", !clocked);
    if (panelOut) panelOut.classList.toggle("hidden", clocked);
    if (panelIn) panelIn.classList.toggle("hidden", !clocked);

    $all("[data-clocked-only]").forEach(function (el) {
      el.classList.toggle("hidden", !clocked);
    });
    $all("[data-clocked-out-only]").forEach(function (el) {
      el.classList.toggle("hidden", clocked);
    });

    $all("[data-clock-in]").forEach(function (btn) {
      if (btn.hasAttribute("data-nav-clock")) return;
      btn.textContent = clocked ? "Clock out" : "Clock in";
    });

    $all("[data-nav-clock]").forEach(function (btn) {
      btn.textContent = clocked ? "Clocked in" : "Clock in";
    });

    if (!clocked) {
      renderDividendReceipt();
      return;
    }

    var mem = window.IBH.mock.demoMember;
    setText("[data-field='memberName']", mem.memberName);
    setText("[data-field='memberSince']", mem.memberSince);
    setText("[data-field='cardNumber']", mem.cardNumber);
    setText("[data-field='dues']", mem.dues);
    setText("[data-field='status']", mem.status);
    setText("[data-field='share']", mem.sharePct);
    setText("[data-field='dividendValue']", mem.dividendValue);
    setText("[data-field='hoodBalance']", mem.hoodBalance);
    setText("[data-field='hoodValue']", mem.hoodValueUsd || "—");
    setText("[data-field='address']", mem.address);

    var stockList = $("[data-stocks-earned]");
    if (stockList) {
      stockList.innerHTML = "";
      mem.stocksEarned.forEach(function (s) {
        var li = document.createElement("li");
        var line = s.ticker + "  " + s.amount;
        if (s.usd) line += "  (" + s.usd + ")";
        li.textContent = line;
        stockList.appendChild(li);
      });
    }

    renderPortfolioHoldings();
    renderDividendReceipt();
  }

  function renderPortfolioHoldings() {
    var grid = $("[data-portfolio-holdings]");
    var mem = window.IBH && window.IBH.mock && window.IBH.mock.demoMember;
    if (!grid || !mem) return;

    grid.innerHTML = "";
    mem.stocksEarned.forEach(function (s) {
      var card = document.createElement("article");
      card.className = "notice";
      card.innerHTML =
        '<div class="notice-ticker">' +
        escapeHtml(s.ticker) +
        '</div><div class="notice-name">Mag8 position</div>' +
        '<div class="notice-row"><span>Amount</span><span>' +
        escapeHtml(s.amount) +
        '</span></div><div class="notice-row"><span>Est. value</span><span>' +
        escapeHtml(s.usd || "—") +
        "</span></div>";
      grid.appendChild(card);
    });
  }

  function renderPersonalHistory() {
    var m = window.IBH && window.IBH.mock;
    if (!m || !m.demoMember) return;

    fillLedger("member-dist", m.demoMember.distributions || [], {
      thirdKey: "value",
      thirdLabel: "Value",
    });
    fillLedger("member-buys", m.demoMember.purchases || [], {
      thirdKey: "value",
      thirdLabel: "Paid",
    });
  }

  function formatConfigLabels() {
    var cfg = window.IBH && window.IBH.config;
    setText("[data-config='fee']", (cfg && (cfg.feeLabel || cfg.sellFeeLabel)) || "3.5%");
    setText("[data-config='minHood']", (cfg && cfg.minHood) || "any");
    setText("[data-config='interval']", (cfg && cfg.distributionInterval) || "30 minutes");
    setText("[data-config='chain']", (cfg && cfg.chainName) || "Robinhood Chain");
    setText("[data-config='basket']", (cfg && cfg.basketName) || "Mag8");
  }

  /**
   * Form 4663-R · Membership dividend receipt
   * Live position view (not a single-run slip):
   * member meta, Mag8 holdings, yield calculator (position × daily volume).
   * Per-run slips remain under receipt history.
   */
  function parseNum(v) {
    if (typeof v === "number") return v;
    if (v == null) return NaN;
    return parseFloat(String(v).replace(/[$,%\s,]/g, ""));
  }

  function formatMoney(n, digits) {
    if (!isFinite(n)) return "—";
    var d = digits == null ? 2 : digits;
    return (
      "$" +
      n.toLocaleString("en-US", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      })
    );
  }

  function formatPct(n, digits) {
    if (!isFinite(n)) return "—";
    var d = digits == null ? 2 : digits;
    return n.toFixed(d) + "%";
  }

  function formatHoodAmount(n) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function yieldConfig() {
    var cfg = (window.IBH && window.IBH.config) || {};
    var y = cfg.yieldCalc || {};
    var feeBps = cfg.feeBps != null ? cfg.feeBps : 350;
    return {
      feeRate: feeBps / 10000,
      feeLabel: cfg.feeLabel || "3.5%",
      efficiency: y.feeEfficiency != null ? y.feeEfficiency : 0.99,
      eligibleSupply: y.eligibleSupply != null ? y.eligibleSupply : 40000000,
      defaultVolume: y.dailyVolumeUsd != null ? y.dailyVolumeUsd : 25000,
      hoodPrice: parseNum(
        window.IBH && window.IBH.mock && window.IBH.mock.protocol
          ? window.IBH.mock.protocol.hoodPriceUsd
          : NaN
      ),
    };
  }

  /**
   * BANG-style yield estimate:
   * share = position / eligibleSupply
   * dailyDues = volumeUsd * feeRate * efficiency
   * daily = share * dailyDues
   * month = daily * 30 · year = daily * 365 · apy = year / positionUsd
   */
  function computeYield(positionHood, volumeUsd) {
    var y = yieldConfig();
    var pos = Math.max(0, positionHood || 0);
    var vol = Math.max(0, volumeUsd || 0);
    var supply = y.eligibleSupply > 0 ? y.eligibleSupply : 1;
    var share = pos > 0 ? Math.min(1, pos / supply) : 0;
    var dailyDues = vol * y.feeRate * y.efficiency;
    var day = share * dailyDues;
    var month = day * 30;
    var year = day * 365;
    var posUsd = y.hoodPrice > 0 ? pos * y.hoodPrice : 0;
    var apy = posUsd > 0 ? (year / posUsd) * 100 : 0;
    return {
      day: day,
      month: month,
      year: year,
      apy: apy,
      share: share * 100,
      posUsd: posUsd,
      feeLabel: y.feeLabel,
      volume: vol,
      position: pos,
    };
  }

  function setReceiptStamp(el, status) {
    if (!el) return;
    var stamp = String(status || "").toUpperCase();
    el.classList.remove("is-paid", "is-pending", "is-empty", "is-live");
    if (stamp === "LIVE" || stamp === "OPEN") {
      el.textContent = "LIVE";
      el.classList.add("is-paid", "is-live");
    } else if (stamp === "PAID") {
      el.textContent = "PAID";
      el.classList.add("is-paid");
    } else if (stamp === "PENDING") {
      el.textContent = "PENDING";
      el.classList.add("is-pending");
    } else {
      el.textContent = "—";
      el.classList.add("is-empty");
    }
  }

  function fillPositionAssets(assetsEl, stocks) {
    if (!assetsEl) return;
    assetsEl.innerHTML = "";
    if (!stocks || !stocks.length) {
      var tr0 = document.createElement("tr");
      tr0.className = "is-placeholder";
      tr0.innerHTML = '<td class="ticker" colspan="3">No holdings yet</td>';
      assetsEl.appendChild(tr0);
      return;
    }
    stocks.forEach(function (row, i) {
      var n = i + 1;
      var tr = document.createElement("tr");
      tr.setAttribute("data-asset-index", String(n));
      var tdT = document.createElement("td");
      tdT.className = "ticker";
      tdT.setAttribute("data-token", "asset_" + n + "_ticker");
      tdT.textContent = row.ticker || "—";
      var tdA = document.createElement("td");
      tdA.className = "amount";
      tdA.setAttribute("data-token", "asset_" + n + "_amount");
      tdA.textContent = row.amount || "—";
      var tdU = document.createElement("td");
      tdU.className = "amount usd";
      tdU.setAttribute("data-token", "asset_" + n + "_usd");
      tdU.textContent = row.usd || "—";
      tr.appendChild(tdT);
      tr.appendChild(tdA);
      tr.appendChild(tdU);
      assetsEl.appendChild(tr);
    });
  }

  function renderYieldOutputs(root, result) {
    if (!root) return;
    var monthEl = $("[data-yc-month]", root);
    var dayEl = $("[data-yc-day]", root);
    var yearEl = $("[data-yc-year]", root);
    var apyEl = $("[data-yc-apy]", root);
    var shareEl = $("[data-yc-share]", root);
    var noteEl = $("[data-yc-note]", root);
    if (monthEl) monthEl.textContent = formatMoney(result.month);
    if (dayEl) dayEl.textContent = formatMoney(result.day);
    if (yearEl) yearEl.textContent = formatMoney(result.year);
    if (apyEl) apyEl.textContent = formatPct(result.apy, 1);
    if (shareEl) shareEl.textContent = formatPct(result.share, 3);
    if (noteEl) {
      noteEl.textContent =
        "On " +
        formatHoodAmount(result.position) +
        " $HOOD (" +
        formatMoney(result.posUsd) +
        ") · " +
        result.feeLabel +
        " dues on " +
        formatMoney(result.volume, 0) +
        "/day volume. Real payouts move with volume, price, and eligible supply.";
    }
  }

  function bindYieldCalculator(root) {
    if (!root || root.getAttribute("data-yc-bound") === "1") return;
    var posIn = $("[data-yc-position]", root);
    var volIn = $("[data-yc-volume]", root);
    if (!posIn && !volIn) return;
    root.setAttribute("data-yc-bound", "1");

    function run() {
      var pos = parseNum(posIn && posIn.value);
      var vol = parseNum(volIn && volIn.value);
      renderYieldOutputs(root, computeYield(pos, vol));
    }

    if (posIn) {
      posIn.addEventListener("input", run);
      posIn.addEventListener("change", run);
    }
    if (volIn) {
      volIn.addEventListener("input", run);
      volIn.addEventListener("change", run);
    }
    run();
  }

  function seedYieldInputs(root, mem) {
    if (!root) return;
    var y = yieldConfig();
    var posIn = $("[data-yc-position]", root);
    var volIn = $("[data-yc-volume]", root);
    if (posIn && mem) {
      var bal = parseNum(mem.hoodBalance);
      if (isFinite(bal) && bal > 0) posIn.value = String(Math.round(bal));
    }
    if (volIn && (!volIn.value || volIn.value === "25000")) {
      volIn.value = String(y.defaultVolume);
    }
  }

  function renderDividendReceipt() {
    var root = $("[data-dividend-receipt]");
    if (!root) return;

    var clocked = isClockedIn();
    var mem =
      window.IBH && window.IBH.mock && window.IBH.mock.demoMember
        ? window.IBH.mock.demoMember
        : null;

    var stampEl = $("[data-receipt='status_stamp']", root);
    var memberEl = $("[data-receipt='member_name']", root);
    var cardEl = $("[data-receipt='card_number']", root);
    var recordEl = $("[data-receipt='record']", root);
    var assetsEl = $("[data-receipt='assets']", root);
    var emptyEl = $("[data-receipt='empty_msg']", root);

    function setVal(el, text) {
      if (el) el.textContent = text == null || text === "" ? "—" : String(text);
    }

    // Position receipt: fill from live member file, not a single distribution run
    if (!clocked || !mem) {
      root.setAttribute("data-receipt-state", "empty");
      setReceiptStamp(stampEl, "");
      setVal(memberEl, "—");
      setVal(cardEl, "—");
      setVal(recordEl, "—");
      setVal($("[data-receipt='hood_position']", root), "—");
      setVal($("[data-receipt='position_value']", root), "—");
      setVal($("[data-receipt='share']", root), "—");
      setVal($("[data-receipt='stocks_value']", root), "—");
      if (assetsEl) assetsEl.innerHTML = "";
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.classList.remove("hidden");
      }
      seedYieldInputs(root, null);
      bindYieldCalculator(root);
      return;
    }

    root.setAttribute("data-receipt-state", "filled");
    setReceiptStamp(stampEl, "LIVE");
    setVal(memberEl, mem.memberName);
    setVal(cardEl, mem.cardNumber);
    setVal(recordEl, mem.address);
    setVal($("[data-receipt='hood_position']", root), mem.hoodBalance);
    setVal($("[data-receipt='position_value']", root), mem.hoodValueUsd || "—");
    setVal($("[data-receipt='share']", root), mem.sharePct);
    setVal($("[data-receipt='stocks_value']", root), mem.dividendValue);

    if (emptyEl) {
      emptyEl.hidden = true;
      emptyEl.classList.add("hidden");
    }

    fillPositionAssets(assetsEl, mem.stocksEarned || []);
    seedYieldInputs(root, mem);
    bindYieldCalculator(root);
    // Recompute after seed (first bind may have run before seed on cold load)
    var posIn = $("[data-yc-position]", root);
    var volIn = $("[data-yc-volume]", root);
    if (posIn || volIn) {
      renderYieldOutputs(
        root,
        computeYield(parseNum(posIn && posIn.value), parseNum(volIn && volIn.value))
      );
    }
  }

  function renderSwapGate() {
    var closed = $("[data-swap-closed]");
    var open = $("[data-swap-open]");
    if (!closed && !open) return;

    var live = isLaunched();
    if (closed) closed.classList.toggle("hidden", live);
    if (open) open.classList.toggle("hidden", !live);

    var cfg = window.IBH && window.IBH.config;
    var link = $("[data-swap-external]");
    if (link && cfg && cfg.swapUrl) {
      link.href = cfg.swapUrl;
      link.classList.remove("is-disabled");
    }
  }

  function bindSwapForm() {
    var form = $("[data-swap-form]");
    if (!form) return;
    // Live testnet swaps are handled by swap-live.js when router is configured.
    if (window.IBH && window.IBH.config && window.IBH.config.swapRouter) return;
    if (window.IBH && window.IBH.swapLive) return;

    var youPay = $("[data-swap-pay]");
    var youGet = $("[data-swap-get]");
    var rateEl = $("[data-swap-rate]");
    var feeEl = $("[data-swap-fee-note]");

    function quote() {
      var m = window.IBH && window.IBH.mock;
      var price = m && m.protocol ? parseFloat(m.protocol.hoodPriceUsd) : 0;
      var ethIn = parseFloat(youPay && youPay.value ? youPay.value : "0") || 0;
      var ethUsd = 3500;
      var hoodOut = price > 0 ? (ethIn * ethUsd) / price : 0;
      if (youGet) {
        youGet.value = hoodOut > 0 ? hoodOut.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "";
      }
      if (rateEl) {
        rateEl.textContent =
          price > 0
            ? "1 ETH ≈ " +
              (ethUsd / price).toLocaleString("en-US", { maximumFractionDigits: 0 }) +
              " $HOOD (demo quote)"
            : "Quote unavailable";
      }
      if (feeEl) {
        feeEl.textContent =
          "Buys and sells of $HOOD include a " +
          ((window.IBH.config && window.IBH.config.feeLabel) || "3.5%") +
          " fee that funds the treasury.";
      }
    }

    if (youPay) {
      youPay.addEventListener("input", quote);
      youPay.addEventListener("change", quote);
    }
    quote();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!isLaunched()) return;
      var cfg = window.IBH.config || {};
      if (cfg.siteMode === "demo") {
        alert("Demo only — mock numbers. No wallet, no transaction.");
        return;
      }
      if (cfg.swapUrl) {
        window.open(cfg.swapUrl, "_blank", "noopener");
      } else {
        alert("Swap wiring is not live yet.");
      }
    });
  }

  /** Fixed ribbon so people know if this is mock demo vs live testnet. */
  function renderSiteBanner() {
    var cfg = window.IBH && window.IBH.config;
    if (!cfg) return;
    var mode = cfg.siteMode || "source";
    if (mode !== "demo" && mode !== "testnet") return;
    if ($("[data-site-banner]")) return;

    var banner = document.createElement("div");
    banner.className = "site-banner site-banner--" + mode;
    banner.setAttribute("data-site-banner", mode);
    banner.setAttribute("role", "status");

    if (mode === "demo") {
      banner.innerHTML =
        "<strong>Demo preview</strong> · Mock numbers only · View-only (no wallet) · Not local4663.com";
    } else {
      banner.innerHTML =
        "<strong>Testnet</strong> · Robinhood Chain " +
        (cfg.chainId || 46630) +
        ' · Connect MetaMask · Faucet: <a href="https://faucet.testnet.chain.robinhood.com/" target="_blank" rel="noopener">testnet faucet</a> · No real value';
    }

    document.body.insertBefore(banner, document.body.firstChild);
    document.body.classList.add("has-site-banner");
  }

  function renderContracts() {
    var tbody = $("[data-contracts-body]");
    var cfg = window.IBH && window.IBH.config;
    if (!tbody || !cfg || !cfg.contracts) return;

    tbody.innerHTML = "";
    Object.keys(cfg.contracts).forEach(function (name) {
      var c = cfg.contracts[name];
      var tr = document.createElement("tr");
      var addr = c.address || "—";
      var addrCell;
      if (addr !== "—" && cfg.explorerBase) {
        addrCell =
          '<a class="tx" href="' +
          escapeAttr(cfg.explorerBase + "/address/" + addr) +
          '" target="_blank" rel="noopener">' +
          escapeHtml(shorten(addr)) +
          "</a>";
      } else {
        addrCell = '<span class="muted">' + escapeHtml(addr) + "</span>";
      }
      tr.innerHTML =
        "<td><strong>" +
        escapeHtml(name) +
        "</strong></td><td class=\"assets\">" +
        escapeHtml(c.role || "") +
        "</td><td>" +
        addrCell +
        "</td>";
      tbody.appendChild(tr);
    });
  }

  function shorten(addr) {
    if (!addr || addr.length < 12) return addr;
    return addr.slice(0, 6) + "…" + addr.slice(-4);
  }

  function wireBuyLinks() {
    var cfg = window.IBH && window.IBH.config;
    $all("#buy-hood, #buy-hood-hero, [data-buy-hood]").forEach(function (el) {
      if (cfg && cfg.launched && cfg.swapUrl) {
        el.setAttribute("href", cfg.swapUrl);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener");
      } else {
        el.setAttribute("href", "swap.html");
        el.removeAttribute("target");
      }
    });
  }

  function bindClockIn() {
    $all("[data-clock-in], [data-nav-clock]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var wallet = window.IBH && window.IBH.wallet;
        var live = window.IBH && window.IBH.live;

        // Wallet available: clock in = connect + live balance; clock out = clear session.
        if (wallet) {
          if (isClockedIn()) {
            setClockedIn(false);
            renderMembership();
            renderPersonalHistory();
            return;
          }
          btn.disabled = true;
          btn.textContent = "Connecting…";
          wallet
            .connect()
            .then(function (addr) {
              if (!addr) throw new Error("No account returned");
              setClockedIn(true);
              if (live) return live.refreshMember(addr);
            })
            .then(function () {
              renderMembership();
              renderPersonalHistory();
              formatProtocol();
            })
            .catch(function (err) {
              console.warn("clock in", err);
              alert(err && err.message ? err.message : String(err));
            })
            .finally(function () {
              btn.disabled = false;
              renderMembership();
            });
          return;
        }

        // Fallback: local mock toggle (preview without wallet scripts).
        setClockedIn(!isClockedIn());
        renderMembership();
        renderPersonalHistory();
      });
    });
  }

  /** After wallet connect / page load: hydrate live balances if already clocked in. */
  function hydrateLive() {
    var wallet = window.IBH && window.IBH.wallet;
    var live = window.IBH && window.IBH.live;
    if (!wallet || !live) return;

    live.refreshProtocol().then(function () {
      formatProtocol();
    });

    wallet.getAccounts().then(function (addr) {
      if (!addr) return;
      if (!isClockedIn()) setClockedIn(true);
      return live.refreshMember(addr).then(function () {
        renderMembership();
        renderPersonalHistory();
      });
    });

    wallet.onChange(function (state) {
      if (!state || !state.address) return;
      if (!isClockedIn()) return;
      live.refreshMember(state.address).then(function () {
        renderMembership();
      });
    });
  }

  function bindTabs() {
    $all("[data-tab]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var id = tab.getAttribute("data-tab");
        var group = tab.closest("[data-tab-group]") || document;
        $all("[data-tab]", group).forEach(function (t) {
          t.classList.toggle("is-active", t === tab);
        });
        $all("[data-tab-panel]", group).forEach(function (p) {
          p.classList.toggle("is-active", p.getAttribute("data-tab-panel") === id);
        });
      });
    });
  }

  function bindNavToggle() {
    var toggle = $("[data-nav-toggle]");
    var collapse = $("[data-nav-collapse]");
    if (!toggle || !collapse) return;
    toggle.addEventListener("click", function () {
      var open = collapse.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /**
   * Union Hall = Telegram community. Wire footer (and any) [data-union-hall] links
   * from IBH.config.telegramUrl. Hide when unset so we never ship a dead Hall link.
   */
  function wireUnionHallLinks() {
    var url =
      window.IBH && window.IBH.config && window.IBH.config.telegramUrl
        ? String(window.IBH.config.telegramUrl).trim()
        : "";
    $all("[data-union-hall]").forEach(function (el) {
      if (url) {
        el.setAttribute("href", url);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
        el.removeAttribute("hidden");
        el.style.display = "";
      } else {
        el.setAttribute("hidden", "hidden");
        el.setAttribute("aria-hidden", "true");
        el.removeAttribute("href");
      }
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function init() {
    if (window.IBH && typeof window.IBH.applyTestnetConfig === "function") {
      window.IBH.applyTestnetConfig();
    }
    renderSiteBanner();
    formatConfigLabels();
    formatProtocol();
    renderLatestRun();
    renderBasket();
    renderLedgerTables();
    renderPersonalHistory();
    renderMembership();
    renderSwapGate();
    renderContracts();
    wireBuyLinks();
    wireUnionHallLinks();
    bindClockIn();
    bindTabs();
    bindNavToggle();
    bindSwapForm();
    bindRowLinks();
    hydrateLive();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
