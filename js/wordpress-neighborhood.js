// ==========================================
// 一箕地区ポータル
// WordPress 町内会紹介表示
// Version 1.22.2
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    const postsArea =
        document.getElementById("neighborhood-posts");

    if (!postsArea) return;

    const WORDPRESS_BASE_URL =
        "https://ikki-portal.com/blog";

    const API_URL =
        `${WORDPRESS_BASE_URL}/wp-json/wp/v2/neighborhood` +
        "?per_page=4&orderby=date&order=desc";

    const FALLBACK_IMAGE =
        "./images/no-image.jpeg";

    /**
     * HTMLタグを除去
     */
    function stripHtml(html) {
        const element =
            document.createElement("div");

        element.innerHTML = html || "";

        return (
            element.textContent ||
            element.innerText ||
            ""
        );
    }

    /**
     * HTMLへ安全に出力
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
     * 抜粋文を作成
     */
    /**
  * 本文の基本情報表から
  * 地区・集会所・世帯数を取得
  */
    function getBasicInfo(post) {
        const html =
            post?.content?.rendered || "";

        const wrapper =
            document.createElement("div");

        wrapper.innerHTML = html;

        const info = {
            district: "一箕地区",
            meetingPlace: "未登録",
            households: "未登録"
        };

        const rows =
            wrapper.querySelectorAll(
                ".neighborhood-basic-info tr"
            );

        rows.forEach((row) => {
            const cells =
                row.querySelectorAll("th, td");

            if (cells.length < 2) return;

            const label =
                cells[0].textContent.trim();

            const value =
                cells[1].textContent.trim();

            if (label === "地区") {
                info.district = value;
            }

            if (label === "集会所") {
                info.meetingPlace = value;
            }

            if (label === "世帯数") {
                info.households = value;
            }
        });

        return info;
    }

    /**
     * アイキャッチ画像を取得
     */
    /**
  * アイキャッチ画像URLを取得
  */
    function getFeaturedImage(post) {
        return (
            post?.featured_image_url ||
            "./images/no-image.jpeg"
        );
    }

    /**
     * 町内会カードを作成
     */
    function createPostCard(post) {
        const title =
            escapeHtml(
                stripHtml(
                    post?.title?.rendered ||
                    "町内会紹介"
                )
            );

        const link =
            escapeHtml(post?.link || "#");

        const basicInfo =
            getBasicInfo(post);

        const district =
            escapeHtml(basicInfo.district);

        const meetingPlace =
            escapeHtml(basicInfo.meetingPlace);

        const households =
            escapeHtml(basicInfo.households);

        const imageUrl =
            escapeHtml(
                getFeaturedImage(post)
            );

        return `
            <article class="neighborhood-card">

                <a
                    href="${link}"
                    class="neighborhood-card-image-link"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <img
                        src="${imageUrl}"
                        alt="${title}"
                        class="neighborhood-card-image"
                        loading="lazy"
                        onerror="this.onerror=null;
                                 this.src='${FALLBACK_IMAGE}';"
                    >
                </a>

                <div class="neighborhood-card-body">

                    <h3 class="neighborhood-card-title">
                        <a
                            href="${link}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ${title}
                        </a>
                    </h3>

                    <div class="neighborhood-card-info">
                        <p>
                            <span aria-hidden="true">📍</span>
                            <span class="neighborhood-info-label">地区</span>
                            ${district}
                        </p>

                        <p>
                            <span aria-hidden="true">🏠</span>
                            <span class="neighborhood-info-label">集会所</span>
                            ${meetingPlace}
                        </p>

                        <p>
                            <span aria-hidden="true">👥</span>
                            <span class="neighborhood-info-label">世帯数</span>
                            ${households}
                        </p>
                    </div>

                    <a
                        href="${link}"
                        class="neighborhood-card-link"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        詳しく見る
                        <span aria-hidden="true">→</span>
                    </a>

                </div>

            </article>
        `;
    }

    /**
     * 町内会紹介を読み込む
     */
    async function loadNeighborhoodPosts() {
        postsArea.innerHTML = `
            <p class="neighborhood-loading">
                町内会情報を読み込んでいます。
            </p>
        `;

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

            if (
                !Array.isArray(posts) ||
                posts.length === 0
            ) {
                postsArea.innerHTML = `
                    <p class="wordpress-empty">
                        現在、公開中の町内会紹介はありません。
                    </p>
                `;

                return;
            }

            postsArea.innerHTML =
                posts.map(createPostCard).join("");

        } catch (error) {
            console.error(
                "町内会紹介取得エラー:",
                error
            );

            postsArea.innerHTML = `
                <p class="wordpress-error">
                    町内会紹介を読み込めませんでした。
                </p>
            `;
        }
    }

    loadNeighborhoodPosts();
});