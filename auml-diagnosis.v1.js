document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("auml_js_status");
  if (status) status.textContent = "JS 狀態：外部 JS 已載入 ✅";

  const btn = document.getElementById("btn_diagnose");
  if (btn) btn.addEventListener("click", () => alert("外部 JS OK：按鈕事件已綁定"));
});
