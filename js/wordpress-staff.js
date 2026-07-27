// ==========================================
// 一箕地区ポータル
// WordPress 運営スタッフ・事務局紹介表示
// Version 1.24.1
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    const postsArea =
        document.getElementById("staff-posts");

    if (!postsArea) return;

    const WORDPRESS_BASE_URL =
        "https://ikki-portal.com/blog";

    const API_URL =
        `${WORDPRESS_BASE_URL}/wp-json/wp/v2/staff` +
        "?per_page=4&orderby=date&order=desc";

    const FALLBACK_IMAGE =
        "./images/no-image.jpeg";

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

    function escapeHtml(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    /**
     * 基本情報表から
     * 役割・担当分野・活動地域を取得
     */
    function getBasicInfo(post) {

        const html =
            post?.content?.rendered || "";

        const wrapper =
            document.createElement("div");

        wrapper.innerHTML = html;

        const info = {
            role: "未登録",
            field: "未登録",
            area: "一箕地区"
        };

        const rows =
            wrapper.querySelectorAll(
                ".staff-basic-info tr"
            );

        rows.forEach((row) => {

            const cells =
                row.querySelectorAll("th, td");

            if (cells.length < 2) return;

            const label =
                cells[0].textContent.trim();

            const value =
                cells[1].textContent.trim();

            if (label === "役割") {
                info.role = value;
            }

            if (label === "担当分野") {
                info.field = value;
            }

            if (label === "活動地域") {
                info.area = value;
            }
        });

        return info;
    }

    function getFeaturedImage(post) {

        return (
            post?.featured_image_url ||
            FALLBACK_IMAGE
        );
    }

    function createPostCard(post) {

        const title =
            escapeHtml(
                stripHtml(
                    post?.title?.rendered ||
                    "運営スタッフ・事務局紹介"
                )
            );

        const link =
            escapeHtml(post?.link || "#");

        const basicInfo =
            getBasicInfo(post);

        const role =
            escapeHtml(basicInfo.role);

        const field =
            escapeHtml(basicInfo.field);

        const area =
            escapeHtml(basicInfo.area);

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
                            <span aria-hidden="true">👤</span>
                            <span class="neighborhood-info-label">
                                役割
                            </span>
                            ${role}
                        </p>

                        <p>
                            <span aria-hidden="true">💻</span>
                            <span class="neighborhood-info-label">
                                担当分野
                            </span>
                            ${field}
                        </p>

                        <p>
                            <span aria-hidden="true">📍</span>
                            <span class="neighborhood-info-label">
                                活動地域
                            </span>
                            ${area}
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

    async function loadStaffPosts() {

        postsArea.innerHTML = `
            <p class="neighborhood-loading">
                運営スタッフ情報を読み込んでいます。
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
                        現在、公開中の運営スタッフ紹介はありません。
                    </p>
                `;

                return;
            }

            postsArea.innerHTML =
                posts.map(createPostCard).join("");

        } catch (error) {

            console.error(
                "運営スタッフ紹介取得エラー:",
                error
            );

            postsArea.innerHTML = `
                <p class="wordpress-error">
                    運営スタッフ紹介を読み込めませんでした。
                </p>
            `;
        }
    }

    loadStaffPosts();
});