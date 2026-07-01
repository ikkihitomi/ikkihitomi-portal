// ===============================
// 一箕地区ポータルサイト
// common.js
// 共通ヘッダー・フッター
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const headerArea = document.getElementById("commonHeader");
  const footerArea = document.getElementById("commonFooter");

  if (headerArea) {
    headerArea.innerHTML = `
      <header class="site-header">
        <div class="header-inner">
          <div class="site-title">
            <span>会津若松市</span>
            <h1>一箕地区ポータルサイト</h1>
            <p>～ 人と人、地域と未来をつなぐ。～</p>
          </div>

          <nav class="global-nav">
            <a href="../index.html">ホーム</a>
            <a href="../news/">お知らせ</a>
            <a href="../event/">行事予定</a>
            <a href="../community/">町内会</a>
            <a href="../facility/">施設予約</a>
            <a href="../disaster/">防災情報</a>
            <a href="../line/">公式LINE</a>
          </nav>
        </div>
      </header>
    `;
  }

  if (footerArea) {
  footerArea.innerHTML = `
    <footer class="site-footer">
      <div class="footer-inner">

        <div class="footer-brand">
          <h2>一箕地区ポータルサイト</h2>
          <p>人と人、地域と未来をつなぐ。</p>
        </div>

        <nav class="footer-nav">
          <a href="../index.html">ホーム</a>
          <a href="../news/">お知らせ</a>
          <a href="../event/">行事予定</a>
          <a href="../community/">町内会紹介</a>
          <a href="../facility/">施設予約</a>
          <a href="../disaster/">防災情報</a>
          <a href="../line/">公式LINE</a>
          <a href="../photo/">フォトコンテスト</a>
        </nav>

        <p class="footer-copy">© 2026 一箕地区ポータルサイト</p>

      </div>
    </footer>
  `;
}
});