/* AUMLMASIG Diagnosis v1.3 - SHOPLINE safe (dropdown UI + event delegation) */
(function () {
  "use strict";

  function closest(el, sel) { return el && el.closest ? el.closest(sel) : null; }
  function getRoot(fromEl) { return closest(fromEl, "[data-auml-diagnosis]") || closest(fromEl, ".auml-diagnosis"); }
  function q(root, sel) { return root.querySelector(sel); }
  function qa(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // 讀取：優先 select，其次 radio，最後 fallback
  function readValue(root, name, fallback) {
    var sel = q(root, 'select[name="' + name + '"]');
    if (sel) return sel.value || fallback;

    var r = q(root, 'input[name="' + name + '"]:checked');
    if (r) return r.value;

    return fallback;
  }

  // 讀取：多選 select 或 checkbox 群
  function readMulti(root, name) {
    var sel = q(root, 'select[name="' + name + '"][multiple]');
    if (sel) {
      return Array.prototype.slice.call(sel.selectedOptions || []).map(function (o) { return o.value; });
    }
    return qa(root, 'input[name="' + name + '"]:checked').map(function (x) { return x.value; });
  }

  function getData(root, kebab, camel) {
    var v = root.getAttribute && root.getAttribute(kebab);
    if (v) return v;
    var ds = root.dataset || {};
    return ds[camel] || "";
  }

  function textMapGoal(goal) {
    var m = {
      nvme_basic: "增加 NVMe M.2 SSD（速度/插槽擴充）",
      nvme_raid:  "多顆 NVMe / 想做 RAID / 高速工作流",
      u2:         "使用 U.2 NVMe SSD（工作站/資料中心）",
      sata:       "增加 SATA 硬碟（NAS/監控/大容量）",
      usb:        "增加 USB 埠（10Gbps/20Gbps）",
      nic:        "增加網路埠（2.5G/10G/多 Port）",
      other:      "其他"
    };
    return m[goal] || "未選擇";
  }

  function chooseProductUrl(root, goal) {
    var map = {
      nvme_basic: getData(root, "data-product-nvme-basic-url", "productNvmeBasicUrl"),
      nvme_raid:  getData(root, "data-product-nvme-raid-url",  "productNvmeRaidUrl"),
      u2:         getData(root, "data-product-u2-url",         "productU2Url"),
      sata:       getData(root, "data-product-sata-url",       "productSataUrl"),
      usb:        getData(root, "data-product-usb-url",        "productUsbUrl"),
      nic:        getData(root, "data-product-nic-url",        "productNicUrl")
    };
    var url = map[goal] || "";
    return (/^https?:\/\//i.test(url)) ? url : "";
  }

  function recommendPlan(longrun, deviceType) {
    // 長跑 or 工作站/伺服器/NAS → 推專業版
    if (longrun === "yes") return "專業版（穩定長跑/散熱/驗收）";
    if (deviceType === "workstation" || deviceType === "nas") return "專業版（長跑環境建議）";
    if (longrun === "no") return "超值版（先把需求做起來）";
    return "不確定 → 先用超值版起步；若長跑/高負載再升級專業版";
  }

  function setStatus(root, msg, isWarn) {
    var el = q(root, "[data-auml-status]") || q(root, ".status");
    if (!el) return;
    el.textContent = msg;
    el.style.color = isWarn ? "#b00" : "#0b6";
    el.style.fontWeight = "800";
  }

  function setResultHtml(root, html) {
    var holder = q(root, "[data-auml-result-holder]");
    if (!holder) {
      var box = q(root, "[data-auml-result]") || q(root, ".result");
      if (!box) return;
      holder = document.createElement("div");
      holder.setAttribute("data-auml-result-holder", "1");
      holder.style.marginTop = "10px";
      box.insertBefore(holder, box.firstChild);
    }
    holder.innerHTML = html;
  }

  function setProductLink(root, url) {
    var a = q(root, "[data-auml-product-link]");
    if (!a) return;
    if (url) a.href = url;
  }

  function buildCopyText(d) {
    var lines = [];
    lines.push("〖AUMLMASIG 擴充卡一鍵診斷單〗");
    lines.push("裝在哪一台：" + (d.device || "未填"));
    lines.push("機器類型：" + (d.deviceType || "unknown"));
    lines.push("目的：" + textMapGoal(d.goal));
    lines.push("痛點：" + (d.pains.length ? d.pains.join("、") : "未選擇"));
    lines.push("PCIe 插槽：" + d.pcie);
    lines.push("M.2 類型：" + d.m2);
    lines.push("長時間跑：" + d.longrun);
    lines.push("作業系統：" + d.os);
    if (d.note) lines.push("補充：" + d.note);
    lines.push("");
    lines.push("〖建議方案〗" + d.plan);
    if (d.warn) lines.push("〖相容性提醒〗" + d.warn);
    if (d.productUrl) lines.push("〖推薦商品〗" + d.productUrl);
    return lines.join("\n");
  }

  function handleDiagnose(btn) {
    var root = getRoot(btn);
    if (!root) return;

    var device     = (q(root, 'input[name="auml_device"]') || {}).value || "";
    var deviceType = readValue(root, "auml_device_type", "unknown");
    var goal       = readValue(root, "auml_goal", "unknown");
    var pains      = readMulti(root, "auml_pain");
    var pcie       = readValue(root, "auml_pcie", "unknown");
    var m2         = readValue(root, "auml_m2_type", "unknown");
    var longrun    = readValue(root, "auml_longrun", "unknown");
    var os         = readValue(root, "auml_os", "unknown");
    var note       = (q(root, 'textarea[name="auml_note"]') || {}).value || "";

    var warn = "";
    if (pcie === "none" || deviceType === "laptop") {
      warn = "你目前選到「無 PCIe / 筆電」：多數 PCIe 擴充卡無法安裝。建議改走外接方案或聯絡客服確認機型可擴充性。";
    } else if (goal === "nvme_raid" && (pcie === "x1")) {
      warn = "你選 NVMe RAID，但插槽只有 x1：可能頻寬不足，建議至少 x4 / x16 插槽。";
    } else if (goal === "nvme_basic" && m2 === "sata") {
      warn = "你選『增加 NVMe』但 M.2 類型可能是 SATA：請先確認是 NVMe 還是 SATA（不確定也可聯絡客服）。";
    } else if (goal === "unknown") {
      warn = "你尚未選擇「目的」，建議先選一項，推薦會更準。";
    }

    var plan = recommendPlan(longrun, deviceType);
    var productUrl = chooseProductUrl(root, goal);

    setStatus(root, "已收到，正在產生建議…", false);

    var html = "";
    html += '<div><b>建議方案：</b> ' + escapeHtml(plan) + "</div>";
    html += '<div style="margin-top:8px"><b>你的目的：</b> ' + escapeHtml(textMapGoal(goal)) + "</div>";
    if (warn) html += '<div style="margin-top:8px;color:#b00"><b>相容性提醒：</b> ' + escapeHtml(warn) + "</div>";
    if (productUrl) html += '<div style="margin-top:10px;color:#111"><b>推薦卡種連結：</b> 已更新「查看推薦商品」按鈕</div>';
    else html += '<div style="margin-top:10px;color:#777">（尚未設定推薦商品連結：請在 HTML 的 data-product-xxx-url 填入對應商品頁）</div>';

    setResultHtml(root, html);
    setProductLink(root, productUrl);

    var copyBox = q(root, "[data-auml-copybox]");
    if (copyBox) {
      copyBox.value = buildCopyText({
        device: device,
        deviceType: deviceType,
        goal: goal,
        pains: pains,
        pcie: pcie,
        m2: m2,
        longrun: longrun,
        os: os,
        note: note,
        plan: plan,
        warn: warn,
        productUrl: productUrl
      });
    }

    setStatus(root, "外部 JS OK：已完成診斷（可複製診斷單）", false);
  }

  function handleReset(btn) {
    var root = getRoot(btn);
    if (!root) return;

    var dev = q(root, 'input[name="auml_device"]'); if (dev) dev.value = "";
    var note = q(root, 'textarea[name="auml_note"]'); if (note) note.value = "";

    // reset selects
    qa(root, "select").forEach(function (s) {
      if (s.multiple) {
        Array.prototype.slice.call(s.options).forEach(function (o) { o.selected = false; });
      } else {
        // 找第一個 selected option；沒有就回到第一個
        var hasSelected = false;
        for (var i = 0; i < s.options.length; i++) if (s.options[i].defaultSelected) { s.selectedIndex = i; hasSelected = true; break; }
        if (!hasSelected) s.selectedIndex = 0;
      }
    });

    // 清掉 textarea/結果
    var copyBox = q(root, "[data-auml-copybox]"); if (copyBox) copyBox.value = "";
    setResultHtml(root, '<div style="color:#555">已清除，請重新選擇後再按「立即診斷」。</div>');
    setStatus(root, "已清除重填", false);
  }

  function handleCopy(btn) {
    var root = getRoot(btn);
    if (!root) return;

    var copyBox = q(root, "[data-auml-copybox]");
    if (!copyBox) return;

    var text = copyBox.value || "";
    if (!text) { setStatus(root, "目前沒有可複製內容", true); return; }

    // 先用新 API，不行再 fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        setStatus(root, "已複製到剪貼簿 ✅", false);
      }).catch(function () {
        copyBox.focus(); copyBox.select();
        try {
          var ok = document.execCommand("copy");
          setStatus(root, ok ? "已複製到剪貼簿 ✅" : "複製失敗：請手動全選複製", !ok);
        } catch (e) {
          setStatus(root, "複製失敗：請手動全選複製", true);
        }
      });
      return;
    }

    copyBox.focus(); copyBox.select();
    try {
      var ok2 = document.execCommand("copy");
      setStatus(root, ok2 ? "已複製到剪貼簿 ✅" : "複製失敗：請手動全選複製", !ok2);
    } catch (e2) {
      setStatus(root, "複製失敗：請手動全選複製", true);
    }
  }

  // 事件委派：不怕 SHOPLINE 重繪 DOM
  document.addEventListener("click", function (ev) {
    var t = ev.target;

    var d = closest(t, '[data-auml-action="diagnose"]');
    if (d) { ev.preventDefault(); handleDiagnose(d); return; }

    var r = closest(t, '[data-auml-action="reset"]');
    if (r) { ev.preventDefault(); handleReset(r); return; }

    var c = closest(t, '[data-auml-action="copy"]');
    if (c) { ev.preventDefault(); handleCopy(c); return; }
  }, true);

  function boot() {
    var roots = document.querySelectorAll("[data-auml-diagnosis], .auml-diagnosis");
    for (var i = 0; i < roots.length; i++) setStatus(roots[i], "外部 JS OK：等待你按「立即診斷」", false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
