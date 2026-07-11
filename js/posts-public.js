// ==============================
// 一箕地区ポータル 公開記事表示
// Ver1.00
// ==============================

const TOP_PAGE_POSTS = 3;
const publicPostsList = document.getElementById("publicPostsList");

/**
 * 日付を日本語表記へ変換
 */
function formatDate(dateString) {
    if (!dateString) return "";

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
 * 時刻を HH:mm 形式へ整形
 */
function formatTime(value) {
    if (!value) return "";
    return String(value).slice(0, 5);
}

/**
 * HTMLへ出力する文字を安全に変換
 */
function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/**
 * カテゴリー別CSSクラス
 */
function getCategoryClass(categoryName) {
    switch (categoryName) {
        case "お知らせ":
            return "category-news";

        case "行事案内":
            return "category-event";

        case "活動報告":
            return "category-report";

        default:
            return "category-news";
    }
}

/**
 * 画像表示部分
 */
function createImageHtml(post) {
    const title = escapeHtml(post.title);

    if (post.eyecatch_url) {
        return `
            <div class="public-post-image-wrap">
                <img
                    class="public-post-image"
                    src="${escapeHtml(post.eyecatch_url)}"
                    alt="${title}"
                    loading="lazy"
                >
            </div>
        `;
    }

    const noImageLabel =
        post.post_type === "event"
            ? "行事案内"
            : post.post_type === "report"
                ? "活動報告"
                : "お知らせ";

    return `
        <div class="public-post-no-image" aria-hidden="true">
            <span class="public-post-no-image-icon">
                ${post.post_type === "event" ? "📅" : post.post_type === "report" ? "📷" : "📢"}
            </span>

            <span class="public-post-no-image-text">
                ${noImageLabel}
            </span>
        </div>
    `;
}

/**
 * 行事情報
 */
function createEventHtml(post) {
    if (post.post_type !== "event") {
        return "";
    }

    const dateHtml = post.event_date
        ? `<p><strong>開催日：</strong>${escapeHtml(formatDate(post.event_date))}</p>`
        : "";

    const startTime = formatTime(post.event_start_time);
    const endTime = formatTime(post.event_end_time);

    const timeHtml = startTime
        ? `
            <p>
                <strong>時間：</strong>
                ${escapeHtml(startTime)}
                ${endTime ? `〜${escapeHtml(endTime)}` : ""}
            </p>
        `
        : "";

    const locationHtml = post.event_location
        ? `<p><strong>場所：</strong>${escapeHtml(post.event_location)}</p>`
        : "";

    const feeHtml = post.event_fee
        ? `<p><strong>参加費：</strong>${escapeHtml(post.event_fee)}</p>`
        : "";

    if (!dateHtml && !timeHtml && !locationHtml && !feeHtml) {
        return "";
    }

    return `
        <div class="public-event-info">
            ${dateHtml}
            ${timeHtml}
            ${locationHtml}
            ${feeHtml}
        </div>
    `;
}

/**
 * 公開記事取得
 */
async function loadPublicPosts() {
    if (!publicPostsList) return;

    try {
        const { data, error } = await supabaseClient
            .from("posts")
            .select(`
                id,
                title,
                body,
                status,
                post_type,
                eyecatch_url,
                event_date,
                event_reception_time,
                event_start_time,
                event_end_time,
                event_location,
                event_fee,
                event_belongings,
                event_lecturer,
                event_apply_method,
                event_contact,
                published_at,
                post_categories (
                    name
                ),
                organizer_id,
                organizers (
                    name
                )
            `)
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(TOP_PAGE_POSTS);

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            publicPostsList.innerHTML = `
                <p class="public-post-message">
                    現在、公開中の記事はありません。
                </p>
            `;
            return;
        }

        publicPostsList.innerHTML = "";

        data.forEach((post) => {
            const categoryName =
                post.post_categories?.name || "お知らせ";

            const categoryClass =
                getCategoryClass(categoryName);

            const organizerName =
                post.organizers?.name || "";

            const article =
                document.createElement("article");

            article.className = "public-post-card";

            if (!post.eyecatch_url) {
                article.classList.add("public-post-card-no-image");
            }

            article.innerHTML = `
                ${createImageHtml(post)}

                <div class="public-post-body">

                    <div class="public-post-meta">

                        <span class="post-category ${categoryClass}">
                            ${escapeHtml(categoryName)}
                        </span>

                        ${organizerName
                    ? `
                                    <span class="post-organizer">
                                        ｜ ${escapeHtml(organizerName)}
                                    </span>
                                `
                    : ""
                }

                    </div>

                    <h3>
                        ${escapeHtml(post.title)}
                    </h3>

                    ${createEventHtml(post)}

                    <p class="detail-link public-post-detail-link">
                        <a href="news/detail.html?id=${encodeURIComponent(post.id)}">
                            詳しく見る →
                        </a>
                    </p>

                </div>
            `;

            publicPostsList.appendChild(article);
        });

    } catch (error) {
        console.error("公開記事取得エラー:", error);

        publicPostsList.innerHTML = `
            <p class="public-post-message">
                記事を取得できませんでした。
                時間をおいて再度お試しください。
            </p>
        `;
    }
}

loadPublicPosts();