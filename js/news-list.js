// ==============================
// 一箕地区ポータル お知らせ一覧
// ==============================

const newsList = document.getElementById("newsList");
const categoryFilter = document.getElementById("categoryFilter");
const typeFilter = document.getElementById("typeFilter");
const keywordFilter = document.getElementById("keywordFilter");

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

async function loadCategories() {
    const { data, error } = await supabaseClient
        .from("post_categories")
        .select("id, name")
        .order("sort_order", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    data.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.name;
        categoryFilter.appendChild(option);
    });
}

async function loadNewsList() {
    newsList.innerHTML = "<p>読み込み中...</p>";

    let query = supabaseClient
        .from("posts")
        .select(`
            id,
            title,
            body,
            status,
            post_type,
            category_id,
            eyecatch_url,
            event_date,
            event_start_time,
            event_end_time,
            event_location,
            published_at,
            post_categories (
                name
            ),
            organizers (
                name
            )
        `)
        .eq("status", "published")
        .order("published_at", { ascending: false });

    if (categoryFilter.value) {
        query = query.eq("category_id", categoryFilter.value);
    }

    if (typeFilter.value) {
        query = query.eq("post_type", typeFilter.value);
    }

    const keyword = keywordFilter.value.trim();

    if (keyword) {
        query = query.or(`title.ilike.%${keyword}%,body.ilike.%${keyword}%`);
    }


    const { data, error } = await query;

    if (error) {
        console.error(error);
        newsList.innerHTML = "<p>記事一覧を取得できませんでした。</p>";
        return;
    }

    if (!data || data.length === 0) {
        newsList.innerHTML = "<p>該当する記事はありません。</p>";
        return;
    }

    newsList.innerHTML = "";

    data.forEach((post) => {
        const categoryName = post.post_categories?.name || "";
        const organizerName = post.organizers?.name || "";

        const imageHtml =
            post.post_type === "report" && post.eyecatch_url
                ? `<img class="news-list-image" src="${post.eyecatch_url}" alt="${post.title}">`
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
                </div>
                `
                : "";

        const article = document.createElement("article");
        article.className = "news-list-item";

        article.innerHTML = `
            ${imageHtml}

            <div class="news-list-body">
                <p class="public-post-meta">
                    ${categoryName}
                    ${organizerName ? "｜" + organizerName : ""}
                </p>

                <h2>${post.title}</h2>

                ${eventHtml}

                <p class="detail-link">
                    <a href="./detail.html?id=${post.id}">詳しく見る →</a>
                </p>
            </div>
        `;

        newsList.appendChild(article);
    });
}

categoryFilter.addEventListener("change", loadNewsList);
typeFilter.addEventListener("change", loadNewsList);
keywordFilter.addEventListener("input", loadNewsList);

loadCategories();
loadNewsList();