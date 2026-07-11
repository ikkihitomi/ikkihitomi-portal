// ==========================================
// 一箕地区ポータルサイト
// common.js
// 共通ヘッダー・フッター
// Version 1.00
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  const headerArea = document.getElementById("commonHeader");
  const footerArea = document.getElementById("commonFooter");

  /**
   * 現在開いているページを判定
   *
   * 例：
   * /news/         → news
   * /news/detail.html → news
   * /line/         → line
   */
  function getCurrentSection() {
    const path = window.location.pathname
      .replace(/\/+/g, "/")
      .toLowerCase();

    const sections = [
      "news",
      "event",
      "community",
      "facility",
      "disaster",
      "line",
      "blog",
      "photo",
      "about",
      "sitemap",
      "terms",
      "privacy",
      "contact",
      "release"
    ];

    const currentSection = sections.find((section) =>
      path.includes(`/${section}/`)
    );

    return currentSection || "home";
  }

  /**
   * 現在のページに aria-current を付ける
   */
  function getCurrentAttribute(sectionName) {
    return getCurrentSection() === sectionName
      ? ' aria-current="page"'
      : "";
  }

  /**
   * 共通ヘッダー
   */
  if (headerArea) {
    headerArea.innerHTML = `
      <header class="site-header">

        <div class="header-inner">

          <div class="site-title">

            <span>
              会津若松市 一箕地区
            </span>

            <h1>
              <a href="../index.html">
                一箕地区ポータルサイト
              </a>
            </h1>

            <p>
              ～ 人と人、地域と未来をつなぐ。～
            </p>

          </div>

          <nav class="global-nav"
               aria-label="メインメニュー">

            <a href="../index.html"
               ${getCurrentAttribute("home")}>
              🏠 ホーム
            </a>

            <a href="../news/"
               ${getCurrentAttribute("news")}>
              📢 お知らせ
            </a>

            <a href="../event/"
               ${getCurrentAttribute("event")}>
              📅 行事予定
            </a>

            <a href="../community/"
               ${getCurrentAttribute("community")}>
              🏘️ 町内会
            </a>

            <a href="../facility/"
               ${getCurrentAttribute("facility")}>
              🏢 施設予約
            </a>

            <a href="../disaster/"
               ${getCurrentAttribute("disaster")}>
              🚨 防災情報
            </a>

            <a href="../line/"
               ${getCurrentAttribute("line")}>
              LINE 公式LINE
            </a>

            <a href="../blog/"
               ${getCurrentAttribute("blog")}>
              ✏️ 地域ブログ
            </a>

            <a href="../photo/"
               ${getCurrentAttribute("photo")}>
              📷 フォトコンテスト
            </a>

          </nav>

        </div>

      </header>
    `;
  }

  /**
   * 共通フッター
   */
  if (footerArea) {
    footerArea.innerHTML = `
      <footer class="site-footer">

        <div class="footer-inner">

          <div class="footer-brand">

            <h2>
              一箕地区ポータルサイト
            </h2>

            <p>
              ～ 人と人、地域と未来をつなぐ。～
            </p>

          </div>

          <nav class="footer-nav"
               aria-label="フッターメニュー">

            <a href="../index.html">
              ホーム
            </a>

            <a href="../news/">
              お知らせ
            </a>

            <a href="../event/">
              行事予定
            </a>

            <a href="../community/">
              町内会紹介
            </a>

            <a href="../facility/">
              施設予約
            </a>

            <a href="../disaster/">
              防災情報
            </a>

            <a href="../line/">
              公式LINE
            </a>

            <a href="../blog/">
              地域ブログ
            </a>

            <a href="../photo/">
              フォトコンテスト
            </a>

            <a href="../about/">
              一箕地区について
            </a>

            <a href="../sitemap/">
              サイトマップ
            </a>

            <a href="../terms/">
              利用規約
            </a>

            <a href="../privacy/">
              プライバシーポリシー
            </a>

            <a href="../contact/">
              お問い合わせ
            </a>

            <a href="../release/">
              更新履歴
            </a>

          </nav>

          <p class="footer-org">
            運営：一箕地区コミュニティ部会
          </p>

          <p class="copyright">
            © 2026 一箕地区ポータルサイト
          </p>

        </div>

      </footer>
    `;
  }
});