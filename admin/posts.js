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

let postsCache = [];
let currentEyecatchUrl = "";

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
      eyecatch_url,
      published_at,
      created_at,
      post_categories (
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

        const imageHtml = post.eyecatch_url
            ? `<img src="${post.eyecatch_url}" style="max-width:180px; border-radius:10px; margin:10px 0;">`
            : "";

        div.innerHTML = `
      <h3>${post.title}</h3>
      ${imageHtml}
      <div class="post-meta">
        カテゴリ：${categoryName} ／ 状態：${post.status}
      </div>
      <button type="button" onclick="editPost('${post.id}')">編集</button>
      <button type="button" onclick="deletePost('${post.id}')">削除</button>
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
        published_at: status === "published" ? now : null
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

    currentEyecatchUrl = post.eyecatch_url || "";

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

    saveBtn.textContent = "記事を保存";
}

saveBtn.addEventListener("click", savePost);

loadCategories();
loadPosts();