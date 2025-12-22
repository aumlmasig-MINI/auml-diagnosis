(() => {
  const VERSION = "2025-12-23.v1";

  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const $ = (sel, root = document) => root.querySelector(sel);

  const escapeHtml = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  function buildLink(url, text) {
    const safeUrl = url && url !== "#" ? url : null;
    if (!safeUrl) return `<span style="opacity:.7">（尚未設定連結）</span>`;
    return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener" style="font-weight:900;text-decoration:underline">${escapeHtml(text)}</a>`;
  }

  function getVal(root, name) {
    const el = $(`[name="${name}"]`, root);
    return el ? el.value : "";
  }

  function setStatus(root, msg) {
    const st = $(`[data-role="status"]`, root);
    if (st) st.textContent = msg;
  }

  function setResult(root, html) {
    const out = $(`[data-role="result"]`, root);
    if (out) out.innerHTML = html;
  }

  function updateCtas(root) {
    const d = root.dataset;
    const aDownload = $(`[data-role="download"]`, root);
    const aContact = $(`[data-role="contact"]`, root);
    if (aDownload && d.urlDownload) aDownload.href = d.urlDownload;
    if (aContact && d.urlContact) aContact.href = d.urlContact;
  }

  function recommend(root) {
    const d = root.dataset;

    const pc = getVal(root, "pc_model");
    const want = getVal(root, "want");
    const pain = getVal(root, "pain");
    const slot = getVal(root, "slot");
    const os = getVal(root, "os");
    const grade = getVal(root, "grade");

    const needX4 = (slot === "x4" || slot === "x8" || slot === "x16");

    const buckets = [];
    const notes = [];

    // Pain-based hints
    if (pain === "not_detected") {
      notes.push("若是「多 M.2 擴充卡」類，請確認 BIOS 是否支援 PCIe 拆分（Bifurcation）；或換到 x16/x8 插槽測試。");
    }
    if (pain === "unstable") {
      notes.push("不穩定/斷線：優先檢查插槽供電、驅動版本與散熱；建議選『專業版』或加強散熱。");
    }
    if (pain === "temp") {
      notes.push("溫度高：建議選『專業版（散熱/穩定優先）』或加裝導熱/散熱片。");
    }

    // Want-based recommendation
    if (want === "m2") {
      if (needX4) {
        buckets.push({
          title: "首選：NVMe M.2 擴充/轉接卡",
          why: "你的插槽條件可支援 PCIe x4 以上，能發揮 NVMe M.2 效能。",
          link: buildLink(d.urlM2, "前往 M.2 擴充卡分類")
        });
      } else if (slot === "m2free") {
        buckets.push({
          title: "你可能不需要擴充卡",
          why: "如果主機板還有空的 M.2 插槽，通常直接裝 M.2 SSD 即可。",
          link: buildLink(d.urlAll, "查看所有擴充卡分類（如仍想擴充）")
        });
      } else {
        buckets.push({
          title: "重要提醒：NVMe M.2 通常需要 PCIe x4 以上",
          why: "你目前選的是 x1 或不確定，x1 很可能無法完整支援 NVMe 擴充卡效能/相容性。",
          link: buildLink(d.urlM2, "先看看 M.2 擴充卡（並確認你有 x4/x8/x16）")
        });
      }
    } else if (want === "u2") {
      if (needX4) {
        buckets.push({
          title: "首選：U.2 企業級/資料中心轉接卡",
          why: "U.2 多為 PCIe x4 介面，搭配 x4/x8/x16 插槽最合適。",
          link: buildLink(d.urlU2, "前往 U.2 分類")
        });
      } else {
        buckets.push({
          title: "U.2 需要 PCIe x4 以上",
          why: "若只剩 x1，建議改用其他擴充類型或先確認是否還有 x4/x8/x16。",
          link: buildLink(d.urlU2, "前往 U.2 分類（請先確認插槽）")
        });
      }
    } else if (want === "sata") {
      buckets.push({
        title: "首選：SATA 3.0 擴充卡",
        why: "SATA 擴充卡多可在 x1 插槽運作（依款式/Port 數而定）。",
        link: buildLink(d.urlSata, "前往 SATA 擴充卡分類")
      });
    } else if (want === "usb") {
      buckets.push({
        title: "首選：USB 擴充卡（USB-A / USB-C）",
        why: "最常見解法：補足 USB 埠、提升到 10Gbps 等級。",
        link: buildLink(d.urlUsb, "前往 USB 擴充卡分類")
      });
    } else if (want === "net") {
      buckets.push({
        title: "首選：RJ-45 網路卡（2.5G/10G）",
        why: "用 PCIe 網卡升級內網傳輸速度，對 NAS/工作站很有感。",
        link: buildLink(d.urlNet, "前往 RJ-45 網路卡分類")
      });
    } else {
      buckets.push({
        title: "先從『桌機擴充卡總分類』開始",
        why: "你目前選擇『不確定』，我先帶你到總分類，你也可以把問題交給客服做精準配對。",
        link: buildLink(d.urlAll, "前往 桌機擴充卡總分類")
      });
    }

    // Grade hint
    const gradeText =
      grade === "pro" ? "專業版（長時間穩定/散熱優先）" :
      grade === "value" ? "超值版（夠用就好）" :
      "未指定（我以通用穩定為主）";

    const summary =
      `<h4>診斷結論</h4>
       <ul class="aumlList">
         <li><b>你要擴充：</b>${escapeHtml(want)}</li>
         <li><b>主要痛點：</b>${escapeHtml(pain)}</li>
         <li><b>插槽：</b>${escapeHtml(slot)}</li>
         <li><b>系統：</b>${escapeHtml(os)}</li>
         <li><b>偏好：</b>${escapeHtml(gradeText)}</li>
         ${pc ? `<li><b>機型備註：</b>${escapeHtml(pc)}</li>` : ""}
       </ul>`;

    const recHtml = buckets.map(b => `
      <div style="margin-top:12px;padding:12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:#fff">
        <div style="font-size:16px;font-weight:900;margin-bottom:6px">${escapeHtml(b.title)}</div>
        <div style="opacity:.85;line-height:1.55;margin-bottom:8px">${escapeHtml(b.why)}</div>
        <div>${b.link}</div>
      </div>
    `).join("");

    const notesHtml = notes.length
      ? `<div style="margin-top:12px">
           <div style="font-weight:900;margin-bottom:6px">補充提醒</div>
           <ul class="aumlList">${notes.map(n => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
         </div>`
      : "";

    const copyText =
      `AUMLMASIG 擴充卡診斷（${VERSION}）\n` +
      `想擴充：${want}\n痛點：${pain}\n插槽：${slot}\nOS：${os}\n偏好：${gradeText}\n` +
      (pc ? `機型：${pc}\n` : "") +
      `建議：${buckets.map(b => b.title).join(" / ")}\n`;

    root.__aumlDiagCopyText = copyText;

    setResult(root, summary + recHtml + notesHtml);
  }

  function copyResult(root) {
    const text = root.__aumlDiagCopyText || "";
    if (!text) return;

    const done = () => setStatus(root, `外部 JS OK：已複製診斷結果（${VERSION}）`);

    // Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
        // Fallback
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch {}
        document.body.removeChild(ta);
        done();
      });
      return;
    }

    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch {}
    document.body.removeChild(ta);
    done();
  }

  function initOne(root) {
    if (!root || root.dataset.aumlInited === "1") return;
    root.dataset.aumlInited = "1";

    updateCtas(root);
    setStatus(root, `外部 JS OK：已載入 ${VERSION}`);

    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const act = btn.getAttribute("data-action");
      if (!act) return;

      // Prevent anchors/# or form submit side effects
      e.preventDefault();

      if (act === "run") {
        setStatus(root, `外部 JS OK：開始診斷…（${VERSION}）`);
        recommend(root);
        setStatus(root, `外部 JS OK：診斷完成（${VERSION}）`);
      } else if (act === "reset") {
        // Let form reset happen, then clear result
        setTimeout(() => {
          setResult(root, `<h4>結果會顯示在這裡</h4><ul class="aumlList"><li>按下「立即診斷」後，會給你：建議類別、為什麼、以及下一步連結。</li></ul>`);
          setStatus(root, `外部 JS OK：已清除（${VERSION}）`);
        }, 0);
      } else if (act === "copy") {
        copyResult(root);
      }
    });
  }

  function scan() {
    $all('[data-auml-diagnosis="1"]').forEach(initOne);
  }

  // DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }

  // For SHOPLINE / dynamic section loads
  const mo = new MutationObserver(() => scan());
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
