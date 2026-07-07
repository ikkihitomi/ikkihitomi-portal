// ==============================
// 一箕地区ポータル 公開記事表示
// ==============================

const publicPostsList = document.getElementById("publicPostsList");

function formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);

    return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function formatTime(value) {
    if (!value) return "";
    return value.slice(0, 5);
}

async function loadPublicPosts() {
    if (!publicPostsList) return;

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
        .limit(6);

    if (error) {
        console.error(error);
        publicPostsList.innerHTML = "<p>記事を取得できませんでした。</p>";
        return;
    }

    if (!data || data.length === 0) {
        publicPostsList.innerHTML = "<p>現在、公開中の記事はありません。</p>";
        return;
    }

    publicPostsList.innerHTML = "";

    data.forEach((post) => {
        const categoryName = post.post_categories?.name || "";
        const organizerName = post.organizers?.name || "";

        const imageHtml = post.eyecatch_url
            ? `<img class="public-post-image" src="${post.eyecatch_url}" alt="${post.title}">`
            : "";

        const eventHtml =
            post.post_type === "event"
                ? `
                <div class="public-event-info">
                    ${post.event_date ? `<p>開催日：${formatDate(post.event_date)}</p>` : ""}
                    ${post.event_start_time
                    ? `<p>時間：${formatTime(post.event_start_time)}${post.event_end_time ? "〜" + formatTime(post.event_end_time) : ""}</p>`
                    : ""
                }
                    ${post.event_location ? `<p>場所：${post.event_location}</p>` : ""}
                    ${post.event_fee ? `<p>参加費：${post.event_fee}</p>` : ""}
                </div>
                `
                : "";

        const article = document.createElement("article");
        article.className = "public-post-card";

        article.innerHTML = `
            ${post.post_type === "report" && post.eyecatch_url
                ? `<img class="public-post-image" src="${post.eyecatch_url}" alt="${post.title}">`
                : ""
            }

            <div class="public-post-body">
                <p class="public-post-meta">
                    ${categoryName ? categoryName : ""}
                    ${organizerName ? "｜" + organizerName : ""}
                </p>
                <h3>${post.title}</h3>
                ${eventHtml}
            </div>
        `;
        publicPostsList.appendChild(article);
    });
}

loadPublicPosts();