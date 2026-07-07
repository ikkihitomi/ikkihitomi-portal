// ==============================
// 一箕地区ポータル 記事詳細表示
// ==============================

const postDetail = document.getElementById("postDetail");
const prevPost = document.getElementById("prevPost");
const nextPost = document.getElementById("nextPost");

function getPostId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

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

async function loadPostDetail() {
    const id = getPostId();

    if (!id) {
        postDetail.innerHTML = "<p>記事が指定されていません。</p>";
        return;
    }

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
            event_map_url,
            event_capacity,
            event_fee,
            event_belongings,
            event_lecturer,
            event_apply_method,
            event_deadline,
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
        .eq("id", id)
        .eq("status", "published")
        .single();

    if (error) {
        console.error(error);
        postDetail.innerHTML = "<p>記事を取得できませんでした。</p>";
        return;
    }

    const { data: allPosts, error: navError } = await supabaseClient
        .from("posts")
        .select("id,title,published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });

    if (navError) {
        console.error(navError);
    }

    const categoryName = data.post_categories?.name || "";
    const organizerName = data.organizers?.name || "";

    const imageHtml = data.eyecatch_url
        ? `<img class="detail-eyecatch" src="${data.eyecatch_url}" alt="${data.title}">`
        : "";

    const eventHtml =
        data.post_type === "event"
            ? `
            <section class="detail-event-box">
                <h2>イベント情報</h2>

                ${data.event_date ? `<p><strong>開催日：</strong>${formatDate(data.event_date)}</p>` : ""}
                ${data.event_reception_time ? `<p><strong>受付開始：</strong>${formatTime(data.event_reception_time)}</p>` : ""}
                ${data.event_start_time ? `<p><strong>時間：</strong>${formatTime(data.event_start_time)}${data.event_end_time ? "〜" + formatTime(data.event_end_time) : ""}</p>` : ""}
                ${data.event_location ? `<p><strong>場所：</strong>${data.event_location}</p>` : ""}
                ${data.event_fee ? `<p><strong>参加費：</strong>${data.event_fee}</p>` : ""}
                ${data.event_capacity ? `<p><strong>定員：</strong>${data.event_capacity}名</p>` : ""}
                ${data.event_belongings ? `<p><strong>持ち物：</strong>${data.event_belongings.replace(/\n/g, "<br>")}</p>` : ""}
                ${data.event_lecturer ? `<p><strong>講師：</strong>${data.event_lecturer}</p>` : ""}
                ${data.event_apply_method ? `<p><strong>申込方法：</strong>${data.event_apply_method.replace(/\n/g, "<br>")}</p>` : ""}
                ${data.event_deadline ? `<p><strong>申込締切：</strong>${formatDate(data.event_deadline)}</p>` : ""}
                ${data.event_contact ? `<p><strong>お問い合わせ：</strong>${data.event_contact.replace(/\n/g, "<br>")}</p>` : ""}
                ${data.event_map_url ? `<p><a href="${data.event_map_url}" target="_blank" rel="noopener">Google Mapで見る</a></p>` : ""}
            </section>
            `
            : "";

    postDetail.innerHTML = `
        ${imageHtml}

        <p class="detail-meta">
            ${categoryName ? categoryName : ""}
            ${organizerName ? "｜" + organizerName : ""}
        </p>

        <h1>${data.title}</h1>

        ${eventHtml}

        ${data.body
            ? `<div class="detail-body">${data.body.replace(/\n/g, "<br>")}</div>`
            : ""
        }
    `;

    setupPostNavigation(data.id, allPosts || []);
}

function setupPostNavigation(currentId, allPosts) {
    const index = allPosts.findIndex((post) => post.id === currentId);

    if (index === -1) return;

    const prev = allPosts[index + 1];
    const next = allPosts[index - 1];

    if (prevPost) {
        if (prev) {
            prevPost.href = `detail.html?id=${prev.id}`;
            prevPost.textContent = `← ${prev.title}`;
        } else {
            prevPost.style.visibility = "hidden";
        }
    }

    if (nextPost) {
        if (next) {
            nextPost.href = `detail.html?id=${next.id}`;
            nextPost.textContent = `${next.title} →`;
        } else {
            nextPost.style.visibility = "hidden";
        }
    }
}

loadPostDetail();