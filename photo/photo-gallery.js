"use strict";
// 日本時間 2026年11月1日 00:00 に2026年の案内を切り替えます。
(() => {
  const releaseAt = Date.parse("2026-11-01T00:00:00+09:00");
  const pending = document.getElementById("contest-2026-pending");
  const released = document.getElementById("contest-2026-released");
  if (!pending || !released) return;

  function updateReleaseStatus() {
    const isReleased = Date.now() >= releaseAt;
    pending.hidden = isReleased;
    released.hidden = !isReleased;
  }

  updateReleaseStatus();
  // ページを開いたまま公開日時を迎えた場合も切り替えます。
  const remaining = releaseAt - Date.now();
  if (remaining > 0) window.setTimeout(updateReleaseStatus, remaining + 100);
  document.addEventListener("visibilitychange", updateReleaseStatus);
})();
