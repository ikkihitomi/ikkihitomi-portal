// ==============================
// 記事管理 posts.js
// 一箕CMS Ver1.00
// ==============================

const editingPostId = document.getElementById("editingPostId");
const titleInput = document.getElementById("title");
const categorySelect = document.getElementById("category");
const bodyInput = document.getElementById("body");
const statusSelect = document.getElementById("status");
const saveBtn = document.getElementById("saveBtn");
const message = document.getElementById("message");
const postsList = document.getElementById("postsList");

const eyecatchFile = document.getElementById("eyecatchFile");
const previewImage = document.getElementById("previewImage");

const organizerSelect = document.getElementById("organizer");

const eventReceptionTimeInput = document.getElementById("eventReceptionTime");
const eventFeeInput = document.getElementById("eventFee");
const eventBelongingsInput = document.getElementById("eventBelongings");
const eventLecturerInput = document.getElementById("eventLecturer");
const eventApplyMethodInput = document.getElementById("eventApplyMethod");
const eventContactInput = document.getElementById("eventContact");

// ==============================
// イベント管理
// ==============================

const postTypeSelect = document.getElementById("postType");
const eventFields = document.getElementById("eventFields");

const eventDateInput = document.getElementById("eventDate");
const eventStartTimeInput = document.getElementById("eventStartTime");
const eventEndTimeInput = document.getElementById("eventEndTime");
const eventLocationInput = document.getElementById("eventLocation");
const eventMapUrlInput = document.getElementById("eventMapUrl");
const eventCapacityInput = document.getElementById("eventCapacity");
const eventDeadlineInput = document.getElementById("eventDeadline");
const showOnCalendarInput = document.getElementById("showOnCalendar");

let postsCache = [];
let currentEyecatchUrl = "";

// ==============================
// 記事種類による入力切替
// ==============================

function updatePostTypeUI() {

    if (postTypeSelect.value === "event") {

        eventFields.style.display = "block";

    } else {

        eventFields.style.display = "none";

    }

}

postTypeSelect.addEventListener("change", updatePostTypeUI);

// ==============================
// 画像プレビュー
// ==============================
eyecatchFile.addEventListener("change", () => {
    const file = eyecatchFile.files[0];

    if (!file) return;

    previewImage.src = URL.createObjectURL(file);
    previewImage.style.display = "block";
});

// ==============================
// アイキャッチ画像アップロード
// ==============================
async function uploadEyecatch() {

    console.log("uploadEyecatch 開始");

    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();

    console.log("Supabase session:", session);

    if (sessionError) {
        console.error("セッション取得エラー:", sessionError);
        throw sessionError;
    }

    if (!session) {
        throw new Error("Supabaseにログインしていません。");
    }

    const file = eyecatchFile.files[0];

    if (!file) return currentEyecatchUrl || null;

    const ext = file.name.split(".").pop();
    const fileName = `eyecatch_${Date.now()}.${ext}`;

    const { error } = await supabaseClient.storage
        .from("post-eyecatch")
        .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) {
        console.error(error);
        throw error;
    }

    const { data } = supabaseClient.storage
        .from("post-eyecatch")
        .getPublicUrl(fileName);

    return data.publicUrl;
}

// ==============================
// カテゴリ取得
// ==============================
async function loadCategories() {
    const { data, error } = await supabaseClient
        .from("post_categories")
        .select("id, name")
        .order("sort_order", { ascending: true });

    if (error) {
        message.textContent = "カテゴリを取得できませんでした。";
        console.error(error);
        return;
    }

    categorySelect.innerHTML = "";

    data.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
    });
}

async function loadOrganizers() {
    const { data, error } = await supabaseClient
        .from("organizers")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    if (error) {
        message.textContent = "主催者を取得できませんでした。";
        console.error(error);
        return;
    }

    organizerSelect.innerHTML = "";

    data.forEach((org) => {
        const option = document.createElement("option");
        option.value = org.id;
        option.textContent = org.name;
        organizerSelect.appendChild(option);
    });
}


// ==============================
// 記事一覧取得
// ==============================
async function loadPosts() {
    const { data, error } = await supabaseClient
        .from("posts")
        .select(`
            id,
            title,
            body,
            status,
            category_id,
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
            show_on_calendar,

            published_at,
            created_at,

            post_categories (
                name
            ),
            organizer_id,
            organizers (
                name
            )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        postsList.innerHTML = "記事一覧を取得できませんでした。";
        console.error(error);
        return;
    }

    postsCache = data || [];
    postsList.innerHTML = "";

    if (postsCache.length === 0) {
        postsList.innerHTML = "<p>まだ記事がありません。</p>";
        return;
    }

    postsCache.forEach((post) => {
        const div = document.createElement("div");
        div.className = "post-item";

        const categoryName = post.post_categories?.name || "未分類";
        const organizerName = post.organizers?.name || "未設定";

        const imageHtml = post.eyecatch_url
            ? `<img src="${post.eyecatch_url}" style="max-width:180px; border-radius:10px; margin:10px 0;">`
            : "";

        div.innerHTML = `
      <h3>${post.title}</h3>
      ${imageHtml}
      <div class="post-meta">
        カテゴリ：${categoryName}
        ／ 主催者：${organizerName}
        ／ 状態：${post.status}
        </div>
      <button type="button" onclick="editPost('${post.id}')">編集</button>
      <button type="button" onclick="deletePost('${post.id}')">削除</button>
      <button type="button" onclick="prepareLinePost('${post.id}')">
        LINE配信
      </button>
    `;

        postsList.appendChild(div);
    });
}

// ==============================
// 保存・更新
// ==============================
async function savePost() {
    message.textContent = "";

    const id = editingPostId.value;
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    const categoryId = categorySelect.value;
    const status = statusSelect.value;

    const postType = postTypeSelect.value;
    const eventDate = eventDateInput.value || null;
    const eventStartTime = eventStartTimeInput.value || null;
    const eventEndTime = eventEndTimeInput.value || null;
    const eventLocation = eventLocationInput.value.trim() || null;
    const eventMapUrl = eventMapUrlInput.value.trim() || null;
    const eventCapacity = eventCapacityInput.value
        ? Number(eventCapacityInput.value)
        : null;
    const eventDeadline = eventDeadlineInput.value || null;
    const showOnCalendar = showOnCalendarInput.checked;
    const organizerId = organizerSelect.value || null;

    const eventReceptionTime = eventReceptionTimeInput.value || null;
    const eventFee = eventFeeInput.value.trim() || null;
    const eventBelongings = eventBelongingsInput.value.trim() || null;
    const eventLecturer = eventLecturerInput.value.trim() || null;
    const eventApplyMethod = eventApplyMethodInput.value.trim() || null;
    const eventContact = eventContactInput.value.trim() || null;

    if (!title || !body) {
        message.textContent = "タイトルと本文を入力してください。";
        return;
    }

    let imageUrl = currentEyecatchUrl;

    try {
        imageUrl = await uploadEyecatch();
    } catch (error) {
        message.textContent = "画像をアップロードできませんでした。";
        return;
    }

    const now = new Date().toISOString();

    const postData = {
        title,
        body,
        category_id: categoryId,
        status,
        eyecatch_url: imageUrl,

        post_type: postType,
        event_date: postType === "event" ? eventDate : null,
        event_start_time: postType === "event" ? eventStartTime : null,
        event_end_time: postType === "event" ? eventEndTime : null,
        event_location: postType === "event" ? eventLocation : null,
        event_map_url: postType === "event" ? eventMapUrl : null,
        event_capacity: postType === "event" ? eventCapacity : null,
        event_deadline: postType === "event" ? eventDeadline : null,
        show_on_calendar: postType === "event" ? showOnCalendar : false,

        published_at: status === "published" ? now : null,
        organizer_id: organizerId,

        event_reception_time: postType === "event" ? eventReceptionTime : null,
        event_fee: postType === "event" ? eventFee : null,
        event_belongings: postType === "event" ? eventBelongings : null,
        event_lecturer: postType === "event" ? eventLecturer : null,
        event_apply_method: postType === "event" ? eventApplyMethod : null,
        event_contact: postType === "event" ? eventContact : null,
    };

    let result;

    if (id) {
        result = await supabaseClient
            .from("posts")
            .update(postData)
            .eq("id", id);
    } else {
        result = await supabaseClient
            .from("posts")
            .insert(postData);
    }

    if (result.error) {
        message.textContent = "記事を保存できませんでした。";
        console.error(result.error);
        return;
    }

    message.textContent = id ? "記事を更新しました。" : "記事を保存しました。";

    resetForm();
    await loadPosts();
}

// ==============================
// 編集
// ==============================
function editPost(id) {
    const post = postsCache.find((p) => p.id === id);

    if (!post) {
        message.textContent = "記事が見つかりませんでした。";
        return;
    }

    editingPostId.value = post.id;
    titleInput.value = post.title;
    bodyInput.value = post.body;
    categorySelect.value = post.category_id;
    statusSelect.value = post.status;

    postTypeSelect.value = post.post_type || "news";
    updatePostTypeUI();

    eventDateInput.value = post.event_date || "";
    eventStartTimeInput.value = formatTime(post.event_start_time);
    eventEndTimeInput.value = formatTime(post.event_end_time);
    eventLocationInput.value = post.event_location || "";
    eventMapUrlInput.value = post.event_map_url || "";
    eventCapacityInput.value = post.event_capacity || "";
    eventDeadlineInput.value = post.event_deadline || "";
    showOnCalendarInput.checked = !!post.show_on_calendar;

    currentEyecatchUrl = post.eyecatch_url || "";

    organizerSelect.value = post.organizer_id || "";

    eventReceptionTimeInput.value = formatTime(post.event_reception_time);
    eventFeeInput.value = post.event_fee || "";
    eventBelongingsInput.value = post.event_belongings || "";
    eventLecturerInput.value = post.event_lecturer || "";
    eventApplyMethodInput.value = post.event_apply_method || "";
    eventContactInput.value = post.event_contact || "";

    if (currentEyecatchUrl) {
        previewImage.src = currentEyecatchUrl;
        previewImage.style.display = "block";
    } else {
        previewImage.src = "";
        previewImage.style.display = "none";
    }

    saveBtn.textContent = "記事を更新";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ==============================
// 削除
// ==============================
async function deletePost(id) {
    const ok = confirm("この記事を削除しますか？");

    if (!ok) return;

    const { error } = await supabaseClient
        .from("posts")
        .delete()
        .eq("id", id);

    if (error) {
        message.textContent = "記事を削除できませんでした。";
        console.error(error);
        return;
    }

    message.textContent = "記事を削除しました。";
    await loadPosts();
}

function formatTime(value) {
    if (!value) return "";
    return value.slice(0, 5);
}

// ==============================
// フォームリセット
// ==============================
function resetForm() {
    editingPostId.value = "";
    titleInput.value = "";
    bodyInput.value = "";
    statusSelect.value = "draft";

    eyecatchFile.value = "";
    previewImage.src = "";
    previewImage.style.display = "none";
    currentEyecatchUrl = "";

    postTypeSelect.value = "news";
    updatePostTypeUI();

    eventDateInput.value = "";
    eventStartTimeInput.value = "";
    eventEndTimeInput.value = "";
    eventLocationInput.value = "";
    eventMapUrlInput.value = "";
    eventCapacityInput.value = "";
    eventDeadlineInput.value = "";
    showOnCalendarInput.checked = false;

    eventReceptionTimeInput.value = "";
    eventFeeInput.value = "";
    eventBelongingsInput.value = "";
    eventLecturerInput.value = "";
    eventApplyMethodInput.value = "";
    eventContactInput.value = "";

    saveBtn.textContent = "記事を保存";
}

//======================================
// LINE配信準備
//======================================
async function prepareLinePost(id) {

    const { data, error } = await supabaseClient
        .from("posts")
        .select(`
            id,
            title,
            body,
            status,
            post_type,
            eyecatch_url
        `)
        .eq("id", id)
        .single();

    if (error) {
        alert("記事を取得できません。");
        console.error(error);
        return;
    }

    const detailUrl =
        `${location.origin}/news/detail.html?id=${data.id}`;

    const message =
        `この内容をLINE配信しますか？

----------------------------
タイトル：
${data.title}

公開状態：
${data.status}

詳細URL：
${detailUrl}

配信先：
一箕地区公式LINE
----------------------------

※次の段階で実際のLINE送信処理へ進みます。`;

    if (!confirm(message)) {
        return;
    }

    alert("確認できました。次はLINE送信用 Edge Function を作成します。");
}

saveBtn.addEventListener("click", savePost);

loadCategories();
loadOrganizers();
loadPosts();
updatePostTypeUI();