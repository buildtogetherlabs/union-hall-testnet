/**
 * Pledge tribute — copy official wallet to clipboard.
 * Set TRIBUTE_WALLET before launch.
 */
(function () {
  var TRIBUTE_WALLET = "YOUR_WALLET_ADDRESS_HERE";

  var btn = document.getElementById("pledge-btn");
  if (!btn) return;

  function copy() {
    var text = TRIBUTE_WALLET;
    if (!text || text.indexOf("YOUR_WALLET") === 0) {
      btn.textContent = "SET TRIBUTE WALLET";
      return;
    }

    function done() {
      btn.textContent = "COPIED";
      btn.classList.add("is-copied");
      setTimeout(function () {
        btn.textContent = "PLEDGE TRIBUTE";
        btn.classList.remove("is-copied");
      }, 2000);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else {
      fallback();
    }

    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        done();
      } catch (e) {
        btn.textContent = "COPY FAILED";
      }
      document.body.removeChild(ta);
    }
  }

  btn.addEventListener("click", copy);
})();
