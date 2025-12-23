/* AUMLMASIG Diagnosis v1 - SHOPLINE safe (event delegation) */
(function () {
  "use strict";

  function closest(el, sel) {
    return el && el.closest ? el.closest(sel) : null;
  }

  function getRoot(fromEl) {
    return closest(fromEl, "[data-auml-diagnosis]");
  }

  function q(root, sel) {
    return root.querySelector(sel);
  }

  function qa(root, sel) {
    return Array.prototype.slice.call(root.querySelectorAll(sel));
  }

  function valRadio(root, name) {
    var el = root.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "unknown";
  }

  function valsCheckbox(root, name) {
    return qa(root, 'input[name="' + name + '"]:checked').map(function (x) {
      return x.value;
    });
  }

  function textMapGoal(goal) {
    var m = {
      nvme_basic: "增加 NVMe M.2 SSD（速度/插槽擴充）",
      nvme_raid: "多顆 NVMe / 想做 RAID / 高速工作流",
      u2: "使用 U.2 NVMe SSD（工作站/資料中心）",
      sata: "增加 SATA 硬碟（NAS/監控/大容量）",
      usb: "增加 USB 埠（10Gbps/20Gbps）",
      nic: "增加網路埠（2.5G/10G/多 Port）",
      other: "其他"
    };
    return m[goal] || "未選擇";
  }

  function chooseProductUrl(root, goal) {
    var ds = root.dataset || {};
    var map = {
      nvme_basic: ds.productNvmeBasicUrl,
      nvme_raid: ds.productNvmeRaidUrl,
      u2: ds.productU2Url,
      sata: ds.productSataUrl,
      usb: ds.productUsbUrl,
      nic: ds.productNicUrl
    };
    return map[goal] || "";
  }

  function recommendPlan(longrun) {
    // 長時間跑 → 通常建議專業版（穩定/散熱/驗收）
    if (longrun === "yes") return "專業版（長跑穩定/散熱/驗收）";
    if (longrun === "no") return "超值版（先把需求做起來）";
    return "不確定 → 先用超值版起步；若長跑/高負載再升級專業版";
  }

  function buildCopyText(data) {
    var lines = [];
    lines.push("【AUMLMASIG 擴充卡一鍵診斷單】");
    lines.push("1) 裝在哪一台：" + (data.device || "未填"));
    lines.push("2) 目的：" + textMapGoal(data.goal));
    lines.push("3) 痛點：" + (data.pains.length ? data.pains.join("、") : "未選擇"));
    lines.push("PCIe 插槽：" + data.pcie);
    lines.push("長時間跑：" + data.longrun);
    lines.push("作業系統：" + data.os);
    lines.push("");
    lines.push("【建議方案】" + data.plan);
    if (data.note) lines.push("【相容性提醒】" + data.note);
    if (data.productUrl) lines.push("【推薦商品】" + data.productUrl);
    return lines.join("\n");
  }

  function setStatus(root, msg, isWarn) {
    var el = q(root, "[data-auml-status]");
    if (!el) return;
    el.textContent = msg;
    el.style.color = isWarn ? "#b00" : "#0b6";
  }

  function setResultHtml(root, html) {
    var box = q(root, "[data-auml-result]");
    if (!box) return;
    // 保留 copy textarea 區塊，所以只更新前半段：在 result 內插入一個容器
    var holder = q(root, "[data-auml-result-holder]");
    if (!holder) {
      holder = document.createElement("div");
      holder.setAttribute("data-auml-result-holder", "1");
      holder.style.marginTop = "10px";
      box.insertBefore(holder, box.firstChild.nextSibling);
    }
    holder.innerHTML = html;
  }

  function handleDiagnose(btn) {
    var root = getRoot(btn);
    if (!root) return;

    var device = (q(root, 'input[name="auml_device"]') || {}).value || "";
    var goal = valRadio(root, "auml_goal");
    var pains = valsCheckbox(root, "auml_pain");
    var pcie = valRadio(root, "auml_pcie");
    var longrun = valRadio(root, "auml_longrun");
    var os = valRadio(root, "auml_os");

    // 基本防呆：沒 PCIe 插槽時，先導向客服（避免買錯）
    var note = "";
    if (pcie === "none") {
      note = "你選到「沒有 PCIe 插槽/筆電/迷你主機」：多數 PCIe 擴充卡無法安裝。建議改走外接方案或直接聯絡客服判斷機型可擴充性。";
    }
    if (goal === "unknown") {
      note = note ? note : "你尚未選擇「目的」，建議至少選一項，推薦會更準。";
    }

    var plan = recommendPlan(longrun);
    var productUrl = chooseProductUrl(root, goal);

    var data = {
      device: device,
      goal: goal,
      pains: pains,
      pcie: pcie,
      longrun: longrun,
      os: os,
      plan: plan,
      note: note,
      productUrl: productUrl
    };

    setStatus(root, "已收到，正在產生建議…（若沒反應，請重新整理再試）", false);

    var html = "";
    html += "<div><b>建議方案：</b>" + plan + "</div>";
    html += "<div style='margin-top:6px'><b>你的目的：</b>" + textMapGoal(goal) + "</div>";
    if (note) html += "<div style='margin-top:6px;color:#b00'><b>相容性提醒：</b>" + note + "</div>";
    if (productUrl) {
      html += "<div style='margin-top:10px'><a class='btn primary' href='" + productUrl + "' target='_blank' rel='noopener'>查看推薦商品</a></div>";
    } else {
      html += "<div style='margin-top:10px;color:#555'>（尚未設定推薦商品連結：請到 HTML 的 data-product-xxx-url 填入對應商品頁）</div>";
    }

    setResultHtml(root, html);

    var copy = buildCopyText(data);
    var copyBox = q(root, "[data-auml-copybox]");
    if (copyBox) copyBox.value = copy;

    setStatus(root, "外部 JS OK：已完成診斷（可複製診斷單）", false);
  }

  function handleReset(btn) {
    var root = getRoot(btn);
    if (!root) return;

    var device = q(root, 'input[name="auml_device"]');
    if (device) device.value = "";

    qa(root, 'input[name="auml_goal"]').forEach(function (el) { el.checked = false; });
    qa(root, 'input[name="auml_pain"]').forEach(function (el) { el.checked = false; });

    // 回到預設值
    var pcie = q(root, 'input[name="auml_pcie"][value="unknown"]');
    if (pcie) pcie.checked = true;
    var lr = q(root, 'input[name="auml_longrun"][value="unknown"]');
    if (lr) lr.checked = true;
    var os = q(root, 'input[name="auml_os"][value="unknown"]');
    if (os) os.checked = true;

    var copyBox = q(root, "[data-auml-copybox]");
    if (copyBox) copyBox.value = "";

    setResultHtml(root, "<div style='color:#555'>已清除，請重新選擇後再按「立即診斷」。</div>");
    setStatus(root, "已清除重填", false);
  }

  function handleCopy(btn) {
    var root = getRoot(btn);
    if (!root) return;

    var copyBox = q(root, "[data-auml-copybox]");
    if (!copyBox) return;

    copyBox.focus();
    copyBox.select();

    try {
      var ok = document.execCommand("copy");
      setStatus(root, ok ? "已複製到剪貼簿 ✅" : "複製失敗：請手動全選複製", !ok);
    } catch (e) {
      setStatus(root, "複製失敗：請手動全選複製", true);
    }
  }

  // ✅ 事件委派：不怕 SHOPLINE 重繪/換 DOM
  document.addEventListener("click", function (ev) {
    var t = ev.target;

    var btnDiagnose = closest(t, '[data-auml-action="diagnose"]');
    if (btnDiagnose) {
      ev.preventDefault();
      handleDiagnose(btnDiagnose);
      return;
    }

    var btnReset = closest(t, '[data-auml-action="reset"]');
    if (btnReset) {
      ev.preventDefault();
      handleReset(btnReset);
      return;
    }

    var btnCopy = closest(t, '[data-auml-action="copy"]');
    if (btnCopy) {
      ev.preventDefault();
      handleCopy(btnCopy);
      return;
    }
  }, true);

  // 初始狀態：找到頁面上的診斷器就顯示 OK
  function boot() {
    var roots = document.querySelectorAll("[data-auml-diagnosis]");
    for (var i = 0; i < roots.length; i++) {
      setStatus(roots[i], "外部 JS OK：等待你按「立即診斷」", false);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
