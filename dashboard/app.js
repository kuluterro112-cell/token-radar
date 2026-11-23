(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var LABEL = "Spekulatif, tidak ada bukti airdrop";
  var ROWS = [];
  var F = { q: "", cat: "", chain: "", tvl: 0, conf: "", wl: false, sort: "rank" };

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function usd(n) {
    if (n == null || isNaN(n)) return "-";
    var a = Math.abs(n);
    if (a >= 1e9) return "$" + (n / 1e9).toFixed(2).replace(".", ",") + " M";
    if (a >= 1e6) return "$" + (n / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace(".", ",") + " jt";
    if (a >= 1e3) return "$" + (n / 1e3).toFixed(0) + " rb";
    return "$" + Math.round(n);
  }
  function pct(n) {
    if (n == null || isNaN(n)) return '<span class="muted">n/a</span>';
    return '<span class="' + (n >= 0 ? "pos" : "neg") + '">' + (n >= 0 ? "+" : "") + n.toFixed(1).replace(".", ",") + "%</span>";
  }
  function x2(n) { return Number(n).toFixed(2).replace(".", ","); }

  function demoRows() {
    var d = [["Steakhouse Financial", "Risk Curators", 2750], ["Gauntlet", "Risk Curators", 1580],
      ["Veda", "Onchain Capital Allocator", 1560], ["USDD", "CDP", 1060], ["Nonce Capital", "Tidak diketahui", 514],
      ["Upshift", "Tidak diketahui", 499], ["Bittensor dTAO", "Tidak diketahui", 376], ["OnRe", "Tidak diketahui", 309],
      ["RockawayX", "Tidak diketahui", 293], ["Symbiotic", "Tidak diketahui", 254]];
    return d.map(function (x, i) {
      var t = x[2] * 1e6, m = t * 0.5;
      return { rank: i + 1, slug: x[0].toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: x[0], category: x[1],
        tvl_usd: t, tier: "watchlist", implied: { low: m * 0.5, mid: m, high: m * 2 }, confidence: "rendah",
        confidence_reasons: ["Data contoh, bukan hasil model"] };
    });
  }

  function norm(r, i) {
    r.rank = r.rank || i + 1;
    r.chains = Array.isArray(r.chains) ? r.chains : [];
    r.category = r.category || "Lainnya";
    r.tvl_usd = Number(r.tvl_usd) || 0;
    r.change_7d = r.change_7d == null ? null : Number(r.change_7d);
    var im = r.implied || {};
    r.implied = { low: im.low || 0, mid: im.mid || r.implied_usd || 0, high: im.high || 0 };
    r.confidence = r.confidence || "rendah";
    r.confidence_reasons = r.confidence_reasons || [];
    r.tier = r.tier || "watchlist";
    if (!r.farm_plan) {
      r.farm_plan = { label: LABEL, steps: ["Pelajari produk " + r.name + " dan pakai fitur intinya dengan nominal kecil.",
        "Catat tanggal dan jumlah setiap aktivitas.",
        "Pakai dana yang siap hilang. Tidak ada bukti airdrop untuk protokol ini."] };
    }
    return r;
  }

  function readData() {
    var d = window.__BOARD__;
    if (!d) {
      var el = $("#board-data");
      if (el) { try { d = JSON.parse(el.textContent || "null"); } catch (e) { d = null; } }
    }
    if (d && !Array.isArray(d) && d.rows) d = d.rows;
    if (Array.isArray(d) && d.length) { $("#demo").hidden = true; return d; }
    $("#demo").hidden = false;
    return demoRows();
  }

  function applyPresets() {
    // Shareable filtered views, e.g. ?cat=Risk%20Curators&tvl=100000000
    var p = new URLSearchParams(location.search);
    function set(id, v) { var el = $(id); if (el && v != null && v !== "") el.value = v; }
    if (p.get("q")) { F.q = p.get("q").toLowerCase(); set("#f-q", p.get("q")); }
    if (p.get("cat")) { F.cat = p.get("cat"); set("#f-cat", p.get("cat")); }
    if (p.get("chain")) { F.chain = p.get("chain"); set("#f-chain", p.get("chain")); }
    if (p.get("tvl")) { F.tvl = Number(p.get("tvl")) || 0; set("#f-tvl", p.get("tvl")); }
    if (p.get("conf")) { F.conf = p.get("conf"); set("#f-conf", p.get("conf")); }
    if (p.get("sort")) { F.sort = p.get("sort"); set("#f-sort", p.get("sort")); }
    if (p.get("wl") === "1") { F.wl = true; var w = $("#f-wl"); if (w) w.checked = true; }
  }

  function setRows(arr) {
    ROWS = arr.map(norm);
    ROWS.sort(function (a, b) { return a.rank - b.rank; });
    fillFilters();
    applyPresets();
    route();
  }

  function fillFilters() {
    var cats = {}, chains = {};
    ROWS.forEach(function (r) { cats[r.category] = 1; r.chains.forEach(function (c) { chains[c] = 1; }); });
    function opts(sel, obj) {
      var keys = Object.keys(obj).sort();
      $(sel).innerHTML = '<option value="">Semua</option>' + keys.map(function (k) {
        return '<option value="' + esc(k) + '">' + esc(k) + "</option>";
      }).join("");
    }
    opts("#f-cat", cats); opts("#f-chain", chains);
    F.cat = ""; F.chain = "";
  }

  function filtered() {
    var out = ROWS.filter(function (r) {
      if (F.cat && r.category !== F.cat) return false;
      if (F.chain && r.chains.indexOf(F.chain) < 0) return false;
      if (r.tvl_usd < F.tvl) return false;
      if (F.conf && r.confidence !== F.conf) return false;
      if (F.wl && r.tier !== "watchlist") return false;
      if (F.q) {
        var h = (r.name + " " + r.category + " " + r.chains.join(" ")).toLowerCase();
        if (h.indexOf(F.q) < 0) return false;
      }
      return true;
    });
    if (F.sort === "tvl") out.sort(function (a, b) { return b.tvl_usd - a.tvl_usd; });
    else if (F.sort === "chg") out.sort(function (a, b) {
      return (b.change_7d == null ? -1e9 : b.change_7d) - (a.change_7d == null ? -1e9 : a.change_7d);
    });
    return out;
  }

  function rangeBar(r, max) {
    var lo = r.implied.low, mid = r.implied.mid, hi = r.implied.high;
    var p = function (v) { return Math.max(0, Math.min(100, (v / max) * 100)); };
    return '<div class="range"><div class="rtxt">' + usd(lo) + " – " + usd(hi) + '</div><div class="rbar"><i style="left:' +
      p(lo).toFixed(1) + "%;width:" + Math.max(1, p(hi) - p(lo)).toFixed(1) + '%"></i><u style="left:' + p(mid).toFixed(1) + '%"></u></div></div>';
  }

  function renderList() {
    var rows = filtered();
    var max = 1;
    rows.forEach(function (r) { if (r.implied.high > max) max = r.implied.high; });
    max *= 1.05;
    var body = rows.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '"><td>' + r.rank + '</td><td><a class="name" href="#/' + encodeURIComponent(r.slug) + '">' +
        esc(r.name) + "</a>" + (r.tier === "watchlist" ? "" : '<span class="tag">di bawah floor</span>') +
        '<span class="cat">' + esc(r.category) + "</span></td><td>" + esc(r.chains.slice(0, 3).join(", ")) +
        (r.chains.length > 3 ? " +" + (r.chains.length - 3) : "") + '</td><td class="r">' + usd(r.tvl_usd) + '</td><td class="r">' +
        pct(r.change_7d) + '</td><td class="r"><b>' + usd(r.implied.mid) + "</b></td><td>" + rangeBar(r, max) +
        '</td><td><span class="badge b-' + esc(r.confidence) + '">' + esc(r.confidence) + "</span></td></tr>";
    }).join("");
    $("#tbl tbody").innerHTML = body;
    $("#empty").hidden = rows.length > 0;
    var tv = 0, im = 0, wl = 0;
    rows.forEach(function (r) { tv += r.tvl_usd; im += r.implied.mid; if (r.tier === "watchlist") wl++; });
    $("#stats").innerHTML =
      '<div class="stat"><b>' + rows.length + "</b><span>protokol ditampilkan (dari " + ROWS.length + ")</span></div>" +
      '<div class="stat"><b>' + wl + "</b><span>anggota watchlist</span></div>" +
      '<div class="stat"><b>' + usd(tv) + "</b><span>total TVL</span></div>" +
      '<div class="stat"><b>' + usd(im) + "</b><span>total implied value (tengah)</span></div>";
  }

  function stepsTable(r) {
    var b = r.breakdown;
    if (!b || !b.factors) return '<p class="muted">Breakdown tidak tersedia pada data contoh.</p>';
    var run = b.tvl_usd;
    var out = ["<tr><td>TVL</td><td class=\"r\">" + usd(run) + "</td><td class=\"muted\">Dari snapshot DefiLlama</td><td class=\"r\">" + usd(run) + "</td></tr>"];
    run *= b.category_ratio;
    out.push('<tr><td>× Rasio kategori</td><td class="r">' + x2(b.category_ratio) + '</td><td class="muted">Median mcap/TVL, ' +
      esc(b.category_samples) + " protokol bertoken di " + esc(r.category) + '</td><td class="r">' + usd(run) + "</td></tr>");
    [["growth", "× Growth 7 hari"], ["chains", "× Jumlah chain"], ["age", "× Umur"], ["confidence", "× Keyakinan"]].forEach(function (k) {
      var f = b.factors[k[0]];
      if (!f) return;
      run *= f.value;
      out.push("<tr><td>" + k[1] + '</td><td class="r">' + x2(f.value) + '</td><td class="muted">' + esc(f.input) + ": " + esc(f.note) +
        '</td><td class="r">' + usd(run) + "</td></tr>");
    });
    return '<table class="bd"><thead><tr><th>Langkah</th><th class="r">Nilai</th><th>Dasar</th><th class="r">Kumulatif</th></tr></thead><tbody>' +
      out.join("") + '</tbody><tfoot><tr><td colspan="3">Implied value (tengah)</td><td class="r">' + usd(r.implied.mid) + "</td></tr></tfoot></table>";
  }

  function renderDetail(r) {
    var max = r.implied.high * 1.1 || 1;
    var p = function (v) { return Math.max(0, Math.min(100, (v / max) * 100)); };
    var rm = r.breakdown && r.breakdown.range_mult;
    var html = '<a class="back" href="#/">← Kembali ke papan</a>' +
      '<div class="card"><h2>#' + r.rank + " " + esc(r.name) + ' <span class="badge b-' + esc(r.confidence) + '">keyakinan ' + esc(r.confidence) + "</span>" +
      (r.tier === "watchlist" ? "" : '<span class="tag">di bawah floor</span>') + "</h2>" +
      '<div class="muted">' + esc(r.category) + " · " + esc(r.chains.join(", ") || "chain n/a") + "</div>" +
      '<div class="kv"><div>TVL<b>' + usd(r.tvl_usd) + "</b></div><div>Growth 7 hari<b>" + pct(r.change_7d) + "</b></div><div>Listing<b>" +
      esc(r.listed_at || "n/a") + "</b></div></div></div>" +
      '<div class="grid2"><div class="card"><h3>Implied value</h3><div class="big">' + usd(r.implied.mid) + '</div>' +
      '<div class="rtxt">Rentang: ' + usd(r.implied.low) + " (rendah) – " + usd(r.implied.high) + " (tinggi)</div>" +
      '<div class="rbar" style="height:12px;margin-top:10px"><i style="left:' + p(r.implied.low).toFixed(1) + "%;width:" +
      Math.max(1, p(r.implied.high) - p(r.implied.low)).toFixed(1) + '%"></i><u style="left:' + p(r.implied.mid).toFixed(1) + '%;height:20px;top:-4px"></u></div>' +
      (rm ? '<p class="muted" style="font-size:13px">Pengali rentang ×' + x2(rm.low) + " dan ×" + x2(rm.high) + " dari nilai tengah.</p>" : "") +
      "<h3>Alasan keyakinan</h3><ul class=\"plain\">" + r.confidence_reasons.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div>" +
      '<div class="card"><h3>Farm plan</h3><div class="warnbox">' + esc((r.farm_plan && r.farm_plan.label) || LABEL) + '</div><ol class="steps">' +
      r.farm_plan.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol></div></div>" +
      '<div class="card"><h3>Breakdown implied value</h3><div class="tbl-wrap" style="border:0">' + stepsTable(r) + "</div></div>";
    $("#detail-view").innerHTML = html;
  }

  function route() {
    var h = decodeURIComponent(location.hash || "");
    var slug = h.indexOf("#/") === 0 ? h.slice(2) : "";
    var r = null;
    if (slug) ROWS.forEach(function (x) { if (x.slug === slug) r = x; });
    if (r) {
      $("#list-view").hidden = true; $("#detail-view").hidden = false;
      renderDetail(r); window.scrollTo(0, 0);
    } else {
      $("#detail-view").hidden = true; $("#list-view").hidden = false;
      renderList();
    }
  }

  function bind() {
    $("#f-q").addEventListener("input", function (e) { F.q = e.target.value.trim().toLowerCase(); renderList(); });
    $("#f-cat").addEventListener("change", function (e) { F.cat = e.target.value; renderList(); });
    $("#f-chain").addEventListener("change", function (e) { F.chain = e.target.value; renderList(); });
    $("#f-tvl").addEventListener("change", function (e) { F.tvl = Number(e.target.value) || 0; renderList(); });
    $("#f-conf").addEventListener("change", function (e) { F.conf = e.target.value; renderList(); });
    $("#f-sort").addEventListener("change", function (e) { F.sort = e.target.value; renderList(); });
    $("#f-wl").addEventListener("change", function (e) { F.wl = e.target.checked; renderList(); });
    $("#f-reset").addEventListener("click", function () {
      F = { q: "", cat: "", chain: "", tvl: 0, conf: "", wl: false, sort: "rank" };
      $("#f-q").value = ""; $("#f-cat").value = ""; $("#f-chain").value = ""; $("#f-tvl").value = "0";
      $("#f-conf").value = ""; $("#f-sort").value = "rank"; $("#f-wl").checked = false;
      renderList();
    });
    $("#tbl tbody").addEventListener("click", function (e) {
      var tr = e.target.closest ? e.target.closest("tr") : null;
      if (tr && tr.getAttribute("data-slug")) location.hash = "#/" + encodeURIComponent(tr.getAttribute("data-slug"));
    });
    $("#f-file").addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var d = JSON.parse(fr.result);
          if (d && !Array.isArray(d) && d.rows) d = d.rows;
          if (Array.isArray(d) && d.length) { $("#demo").hidden = true; setRows(d); }
        } catch (err) { alert("File JSON tidak valid."); }
      };
      fr.readAsText(f);
    });
    window.addEventListener("hashchange", route);
  }

  bind();
  setRows(readData());
})();
