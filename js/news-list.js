// =======================================
// 一箕地区ポータルサイト
// お知らせ一覧
// Ver1.30
// =======================================

const newsList = document.getElementById("newsList");
const keywordFilter = document.getElementById("keywordFilter");
const typeFilter = document.getElementById("typeFilter");
const categoryFilter = document.getElementById("categoryFilter");

let allPosts = [];

loadPosts();

async function loadPosts() {

    newsList.innerHTML = "<p>読み込み中...</p>";

    const { data, error } = await supabaseClient
        .from("posts")
        .select(`
            *,
            post_categories(name),
            organizers(name)
        `)
        .eq("status", "published")
        .order("published_at", { ascending: false });

    if (error) {

        newsList.innerHTML = "<p>記事を取得できませんでした。</p>";
        console.error(error);
        return;

    }

    allPosts = data;

    createCategoryList();

    renderPosts(allPosts);

}

function createCategoryList() {

    const names = [...new Set(
        allPosts
            .map(x => x.post_categories?.name)
            .filter(Boolean)
    )];

    categoryFilter.innerHTML =
        '<option value="">すべて</option>';

    names.forEach(name => {

        categoryFilter.innerHTML +=
            `<option value="${name}">${name}</option>`;

    });

}

function renderPosts(posts) {

    if (posts.length === 0) {

        newsList.innerHTML = "<p>記事はありません。</p>";
        return;

    }

    newsList.innerHTML = "";

    posts.forEach(post => {

        const category =
            post.post_categories?.name || "";

        const organizer =
            post.organizers?.name || "";

        const image = post.eyecatch_url
            ? `<img class="public-post-image"
                   src="${post.eyecatch_url}"
                   alt="${post.title}">`
            : "";

        const eventInfo =
            post.post_type === "event"
                ? `
<div class="event-summary">

<p><strong>開催日：</strong>${post.event_date || ""}</p>

<p><strong>時間：</strong>
${post.event_start_time || ""}
${post.event_end_time ? "～" + post.event_end_time : ""}
</p>

<p><strong>場所：</strong>${post.event_location || ""}</p>

</div>
`
                : "";

        newsList.innerHTML += `

<article class="public-post-card">

${image}

<div class="public-post-body">

<div class="post-meta">

<span class="category">${category}</span>

${organizer ? `<span>｜${organizer}</span>` : ""}

</div>

<h3>${post.title}</h3>

${eventInfo}

<p class="public-post-date">

${formatDate(post.published_at)}

</p>

<p>

<p class="detail-link">
  <a href="detail.html?id=${post.id}">
    詳しく見る →
  </a>
</p>

</p>

</div>

</article>

`;

    });

}

function formatDate(date) {

    if (!date) return "";

    return new Date(date).toLocaleDateString("ja-JP");

}

function applyFilter() {

    const keyword =
        keywordFilter.value.toLowerCase();

    const type =
        typeFilter.value;

    const category =
        categoryFilter.value;

    const filtered = allPosts.filter(post => {

        const hitKeyword =

            post.title.toLowerCase().includes(keyword)

            ||

            (post.body || "").toLowerCase().includes(keyword);

        const hitType =
            !type ||
            post.post_type === type;

        const hitCategory =
            !category ||
            post.post_categories?.name === category;

        return hitKeyword && hitType && hitCategory;

    });

    renderPosts(filtered);

}

keywordFilter.addEventListener("input", applyFilter);

typeFilter.addEventListener("change", applyFilter);

categoryFilter.addEventListener("change", applyFilter);