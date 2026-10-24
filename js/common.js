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
      "photo2026",
      "photo",
      "old-photo",
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
              <a href="/">
                一箕地区ポータルサイト
              </a>
            </h1>

            <p>
              ～ 人と人、地域と未来をつなぐ。～
            </p>

          </div>

          <button class="menu-toggle" type="button" aria-label="メニューを開く" aria-controls="globalNavigation" aria-expanded="false"><span class="menu-toggle-icon" aria-hidden="true">☰</span><span class="menu-toggle-text">メニュー</span></button>
           <nav class="global-nav" id="globalNavigation" aria-label="メインメニュー">

            <a href="/"
               ${getCurrentAttribute("home")}>
              🏠 ホーム
            </a>

            <a href="/news/"
               ${getCurrentAttribute("news")}>
              📢 お知らせ
            </a>

            <a href="/event/"
               ${getCurrentAttribute("event")}>
              📅 行事予定
            </a>

            <a href="https://ikki-portal.com/blog/neighborhood/">
              🏘️ 町内会紹介
            </a>

            <a href="/facility/"
               ${getCurrentAttribute("facility")}>
              🏢 施設予約
            </a>

            <a href="/disaster/"
               ${getCurrentAttribute("disaster")}>
              🚨 防災情報
            </a>

            <a href="/line/"
               ${getCurrentAttribute("line")}>
              LINE 公式LINE
            </a>

            <a href="https://ikki-portal.com/blog/"
              ${getCurrentAttribute("blog")}>
              ✏️ 地域ブログ
            </a>

            <a href="/photo/"
              ${getCurrentAttribute("photo")}>
              📷 フォトコンテスト
            </a>

            <a href="/old-photo/"
              ${getCurrentAttribute("old-photo")}>
              🕰️ 昔の写真
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

            <a href="/">
              ホーム
            </a>

            <a href="/news/">
              お知らせ
            </a>

            <a href="/event/">
              行事予定
            </a>

            <a href="https://ikki-portal.com/blog/neighborhood/">
              町内会紹介
            </a>

            <a href="/facility/">
              施設予約
            </a>

            <a href="/disaster/">
              防災情報
            </a>

            <a href="/line/">
              公式LINE
            </a>

            <a href="https://ikki-portal.com/blog/">
              地域ブログ
            </a>

            <a href="/photo/">
              フォトコンテスト
            </a>

            <a href="/old-photo/">
              一箕の昔と写真
            </a>

            <a href="/about/">
              一箕地区について
            </a>

            <a href="/sitemap/">
              サイトマップ
            </a>

            <a href="/terms/">
              利用規約
            </a>

            <a href="/privacy/">
              プライバシーポリシー
            </a>

            <a href="/contact/">
              お問い合わせ
            </a>

            <a href="/release/">
              更新履歴
            </a>

          </nav>

          <p class="footer-org">
            運営：一箕地区ひとみつながり部会
          </p>

          <p class="copyright">
            © 2026 一箕地区ポータルサイト
          </p>

        </div>

      </footer>
    `;
  }
  // Ver1.60: PCは横並び、1024px以下は折りたたみメニュー
  const menuButton = document.querySelector(".site-header .menu-toggle");
  const menuNav = document.querySelector(".site-header .global-nav");
  if (menuButton && menuNav) {
    const closeMenu = () => {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "メニューを開く");
      menuButton.querySelector(".menu-toggle-icon").textContent = "☰";
      menuNav.classList.remove("is-open");
    };
    menuButton.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") !== "true";
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
      menuButton.querySelector(".menu-toggle-icon").textContent = open ? "×" : "☰";
      menuNav.classList.toggle("is-open", open);
    });
    menuNav.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".site-header")) closeMenu();
    });
    window.matchMedia("(min-width: 1025px)").addEventListener("change", closeMenu);
  }

});