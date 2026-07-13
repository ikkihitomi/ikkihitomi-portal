// ==========================================
// 一箕地区ポータル
// 地域ブログ一覧・カテゴリー絞り込み
// Version 1.10
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    const postsArea =
        document.getElementById("communityBlogPosts");

    const filterButtons =
        document.querySelectorAll(
            ".community-blog-filter-button"
        );

    const resultArea =
        document.getElementById("communityBlogResult");

    if (!postsArea) return;

    const API_URL =
        "https://ikki-portal.com/blog/wp-json/wp/v2/posts" +
        "?per_page=100&_embed=1&orderby=date&order=desc";

    let allPosts = [];

    /**
     * HTMLタグを除去
     */
    function stripHtml(html) {
        const element = document.createElement("div");
        element.innerHTML = html || "";

        return element.textContent ||
            element.innerText ||
            "";
    }

    /**
     * HTML出力用エスケープ
     */
    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    /**
     * 日付表示
     */
    function formatDate(dateString) {
        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return date.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }

    /**
     * 抜粋を作成
     */
    function createExcerpt(html, maxLength = 100) {
        const text = stripHtml(html)
            .replace(/\s+/g, " ")
            .trim();

        if (text.length <= maxLength) {
            return text;
        }

        return `${text.slice(0, maxLength)}…`;
    }

    /**
     * 記事に設定されたカテゴリー一覧
     */
    function getCategories(post) {
        const terms =
            post._embedded?.["wp:term"];

        if (!Array.isArray(terms)) {
            return [];
        }

        return terms
            .flat()
            .filter((term) =>
                term?.taxonomy === "category"
            )
            .map((term) => term.name)
            .filter(Boolean);
    }

    /**
     * 記事一覧を表示
     */
    function renderPosts(posts, selectedCategory = "all") {
        postsArea.innerHTML = "";

        if (!Array.isArray(posts) || posts.length === 0) {
            postsArea.innerHTML = `
        <p class="community-blog-message">
          このカテゴリーの記事はまだありません。
        </p>
      `;

            if (resultArea) {
                resultArea.textContent =
                    "該当する記事はありません。";
            }

            return;
        }

        if (resultArea) {
            resultArea.textContent =
                selectedCategory === "all"
                    ? `${posts.length}件の記事を表示しています。`
                    : `「${selectedCategory}」の記事を${posts.length}件表示しています。`;
        }

        posts.forEach((post) => {
            const title =
                stripHtml(
                    post.title?.rendered || "無題"
                );

            const excerpt =
                createExcerpt(
                    post.excerpt?.rendered || ""
                );

            const postUrl =
                post.link ||
                "https://ikki-portal.com/blog/";

            const media =
                post._embedded?.["wp:featuredmedia"]?.[0];

            const imageUrl =
                media?.source_url || "";

            const imageAlt =
                media?.alt_text || title;

            const categories =
                getCategories(post);

            const categoryHtml =
                categories
                    .map((category) => `
            <span class="community-blog-category">
              ${escapeHtml(category)}
            </span>
          `)
                    .join("");

            const article =
                document.createElement("article");

            article.className =
                "community-blog-card";

            article.innerHTML = `
        ${imageUrl
                    ? `
              <a href="${escapeHtml(postUrl)}"
                 class="community-blog-image-link">

                <img
                  src="${escapeHtml(imageUrl)}"
                  alt="${escapeHtml(imageAlt)}"
                  class="community-blog-image"
                  loading="lazy"
                >

              </a>
            `
                    : `
              <div class="community-blog-no-image"
                   aria-hidden="true">
                ✏️
              </div>
            `
                }

        <div class="community-blog-card-body">

          <div class="community-blog-meta">

            ${categoryHtml}

            <time datetime="${escapeHtml(post.date)}">
              ${escapeHtml(formatDate(post.date))}
            </time>

          </div>

          <h3>
            <a href="${escapeHtml(postUrl)}">
              ${escapeHtml(title)}
            </a>
          </h3>

          ${excerpt
                    ? `
                <p class="community-blog-excerpt">
                  ${escapeHtml(excerpt)}
                </p>
              `
                    : ""
                }

          <p class="community-blog-read">
            <a href="${escapeHtml(postUrl)}">
              記事を読む →
            </a>
          </p>

        </div>
      `;

            postsArea.appendChild(article);
        });
    }

    /**
     * カテゴリーで絞り込み
     */
    function filterPosts(categoryName) {
        if (categoryName === "all") {
            renderPosts(allPosts, "all");
            return;
        }

        const filteredPosts =
            allPosts.filter((post) =>
                getCategories(post).includes(categoryName)
            );

        renderPosts(
            filteredPosts,
            categoryName
        );
    }

    /**
     * ボタンの選択状態
     */
    function updateActiveButton(activeButton) {
        filterButtons.forEach((button) => {
            const isActive =
                button === activeButton;

            button.classList.toggle(
                "is-active",
                isActive
            );

            button.setAttribute(
                "aria-pressed",
                String(isActive)
            );
        });
    }

    /**
     * WordPress記事取得
     */
    async function loadPosts() {
        try {
            const response =
                await fetch(API_URL, {
                    headers: {
                        Accept: "application/json"
                    }
                });

            if (!response.ok) {
                throw new Error(
                    `WordPress API error: ${response.status}`
                );
            }

            const posts =
                await response.json();

            allPosts =
                Array.isArray(posts)
                    ? posts
                    : [];

            renderPosts(allPosts);

        } catch (error) {
            console.error(
                "地域ブログ取得エラー:",
                error
            );

            postsArea.innerHTML = `
        <p class="community-blog-message">
          地域ブログの記事を取得できませんでした。
        </p>
      `;

            if (resultArea) {
                resultArea.textContent = "";
            }
        }
    }

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const category =
                button.dataset.category || "all";

            updateActiveButton(button);
            filterPosts(category);
        });
    });

    loadPosts();
});