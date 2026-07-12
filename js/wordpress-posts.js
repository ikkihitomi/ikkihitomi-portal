// ==========================================
// 一箕地区ポータル
// WordPress 最新記事表示
// Version 1.00
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    const postsArea = document.getElementById("wordpressPosts");

    if (!postsArea) return;

    const API_URL =
        "https://ikki-portal.com/blog/wp-json/wp/v2/posts" +
        "?per_page=3&_embed=1&orderby=date&order=desc";

    /**
     * HTMLタグを除去してプレーンテキストへ変換
     */
    function stripHtml(html) {
        const element = document.createElement("div");
        element.innerHTML = html || "";
        return element.textContent || element.innerText || "";
    }

    /**
     * HTMLへ表示する文字列を安全に変換
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
     * 日付を日本語表記へ変換
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
     * 抜粋文を短く整える
     */
    function createExcerpt(html, maxLength = 90) {
        const text = stripHtml(html)
            .replace(/\s+/g, " ")
            .trim();

        if (text.length <= maxLength) {
            return text;
        }

        return `${text.slice(0, maxLength)}…`;
    }

    /**
     * WordPress最新記事を取得
     */
    async function loadWordPressPosts() {
        try {
            const response = await fetch(API_URL, {
                headers: {
                    Accept: "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(
                    `WordPress API error: ${response.status}`
                );
            }

            const posts = await response.json();

            if (!Array.isArray(posts) || posts.length === 0) {
                postsArea.innerHTML = `
          <p class="wordpress-message">
            現在、公開中のブログ記事はありません。
          </p>
        `;
                return;
            }

            postsArea.innerHTML = "";

            posts.forEach((post) => {
                const title = stripHtml(
                    post.title?.rendered || "無題"
                );

                const excerpt = createExcerpt(
                    post.excerpt?.rendered || ""
                );

                const postUrl =
                    post.link || "https://ikki-portal.com/blog/";

                const media =
                    post._embedded?.["wp:featuredmedia"]?.[0];

                const imageUrl =
                    media?.source_url || "";

                const imageAlt =
                    media?.alt_text || title;

                const article =
                    document.createElement("article");

                article.className = "wordpress-card";

                article.innerHTML = `
          ${imageUrl
                        ? `
                <a href="${escapeHtml(postUrl)}"
                   class="wordpress-image-link">

                  <img
                    src="${escapeHtml(imageUrl)}"
                    alt="${escapeHtml(imageAlt)}"
                    class="wordpress-image"
                    loading="lazy"
                  >

                </a>
              `
                        : `
                <div class="wordpress-no-image"
                     aria-hidden="true">
                  ✏️
                </div>
              `
                    }

          <div class="wordpress-body">

            <p class="wordpress-date">
              ${escapeHtml(formatDate(post.date))}
            </p>

            <h3>
              <a href="${escapeHtml(postUrl)}">
                ${escapeHtml(title)}
              </a>
            </h3>

            ${excerpt
                        ? `
                  <p class="wordpress-excerpt">
                    ${escapeHtml(excerpt)}
                  </p>
                `
                        : ""
                    }

            <p class="wordpress-link">
              <a href="${escapeHtml(postUrl)}">
                記事を読む →
              </a>
            </p>

          </div>
        `;

                postsArea.appendChild(article);
            });

        } catch (error) {
            console.error(
                "WordPress記事取得エラー:",
                error
            );

            postsArea.innerHTML = `
        <p class="wordpress-message">
          地域ブログの記事を取得できませんでした。
        </p>
      `;
        }
    }

    loadWordPressPosts();
});