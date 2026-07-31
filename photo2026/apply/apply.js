"use strict";

const cfg = window.PHOTO2026_CONFIG;

if (!cfg) {
    throw new Error("フォトコン設定ファイルを読み込めませんでした。");
}
// =========================================================
// 一箕地区フォトコンテスト2026 応募フォーム
// =========================================================

let resident = null;
let selectedFile = null;

// ---------------------------------------------------------
// DOM
// ---------------------------------------------------------

const form = document.getElementById("entry-form");
const messageElement = document.getElementById("message");
const loadingElement = document.getElementById("loading");

const residentNameElement =
    document.getElementById("resident-name");

const districtNameElement =
    document.getElementById("district-name");

const neighborhoodNameElement =
    document.getElementById("neighborhood-name");

const titleInput = document.getElementById("title");
const locationInput = document.getElementById("location");
const shootingDateInput =
    document.getElementById("shooting-date");
const commentInput = document.getElementById("comment");

const photoInput = document.getElementById("photo");
const previewWrap =
    document.getElementById("preview-wrap");
const previewImage =
    document.getElementById("preview");

const agreeInput = document.getElementById("agree");
const submitButton =
    document.getElementById("submit-button");

const successCard =
    document.getElementById("success-card");
const entryNoElement =
    document.getElementById("entry-no");

// 初期状態
if (successCard) {
    successCard.hidden = true;
}

if (previewWrap) {
    previewWrap.hidden = true;
}


// =========================================================
// メッセージ
// =========================================================

function showMessage(message, type = "info") {
    if (!messageElement) {
        alert(message);
        return;
    }

    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageElement.hidden = false;
}

function hideMessage() {
    if (messageElement) {
        messageElement.textContent = "";
        messageElement.hidden = true;
    }
}


// =========================================================
// resident-mypage呼び出し
// =========================================================

async function callResidentMyPage(idToken) {
    const response = await fetch(
        `${cfg.SUPABASE_URL}/functions/v1/resident-mypage`,
        {
            method: "POST",

            headers: {
                apikey: cfg.SUPABASE_ANON_KEY,
                Authorization:
                    `Bearer ${cfg.SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
                "X-Line-Id-Token": idToken
            },

            body: JSON.stringify({
                action: "bootstrap"
            })
        }
    );

    const body =
        await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            body.error ||
            "住民情報を取得できませんでした。"
        );

        error.code = body.code || "";
        throw error;
    }

    return body;
}


// =========================================================
// マスター名称検索
// =========================================================

function findMasterName(
    list,
    code,
    codeKeys,
    nameKeys
) {
    if (!Array.isArray(list) || !code) {
        return "";
    }

    const item = list.find((record) =>
        codeKeys.some(
            (key) =>
                String(record?.[key] ?? "") ===
                String(code)
        )
    );

    if (!item) {
        return "";
    }

    for (const key of nameKeys) {
        if (item[key]) {
            return String(item[key]);
        }
    }

    return "";
}


// =========================================================
// 住民情報整形
// =========================================================

function normalizeResident(data) {
    const source =
        data?.resident ||
        data?.profile ||
        data?.data ||
        data ||
        {};

    const decodedToken =
        liff.getDecodedIDToken?.() || {};

    const districtCode =
        source.district_code || "";

    const neighborhoodCode =
        source.neighborhood_code || "";

    const districtName =
        source.district_name ||
        source.district?.name ||
        findMasterName(
            data?.districts,
            districtCode,
            ["district_code", "code", "id"],
            ["district_name", "name"]
        ) ||
        districtCode ||
        "";

    const neighborhoodName =
        source.neighborhood_name ||
        source.neighborhood?.name ||
        findMasterName(
            data?.neighborhoods,
            neighborhoodCode,
            [
                "neighborhood_code",
                "code",
                "id"
            ],
            [
                "neighborhood_name",
                "name"
            ]
        ) ||
        neighborhoodCode ||
        "";

    return {
        resident_code:
            source.resident_code || "",

        line_user_id:
            source.line_user_id ||
            decodedToken.sub ||
            "",

        name:
            source.registered_name ||
            source.resident_name ||
            source.name ||
            source.full_name ||
            source.display_name ||
            "",

        district_name:
            districtName,

        neighborhood_name:
            neighborhoodName
    };
}


// =========================================================
// 住民情報表示
// =========================================================

function displayResident() {
    residentNameElement.textContent =
        resident.name || "―";

    districtNameElement.textContent =
        resident.district_name || "未設定";

    neighborhoodNameElement.textContent =
        resident.neighborhood_name || "未設定";
}


// =========================================================
// ファイル名作成
// =========================================================

function createStorageFileName(file) {
    const originalExtension =
        file.name.includes(".")
            ? file.name.split(".").pop().toLowerCase()
            : "jpg";

    const extension =
        originalExtension.replace(
            /[^a-z0-9]/g,
            ""
        ) || "jpg";

    return `${crypto.randomUUID()}.${extension}`;
}


// =========================================================
// Storageアップロード
// =========================================================

async function uploadPhoto(file) {
    const now = new Date();

    const year =
        String(now.getFullYear());

    const month =
        String(now.getMonth() + 1)
            .padStart(2, "0");

    const lineDirectory =
        resident.line_user_id.replace(
            /[^a-zA-Z0-9_-]/g,
            ""
        );

    const storagePath =
        `${year}/${month}/${lineDirectory}/` +
        createStorageFileName(file);

    const encodedPath =
        storagePath
            .split("/")
            .map(encodeURIComponent)
            .join("/");

    const response = await fetch(
        `${cfg.SUPABASE_URL}` +
        `/storage/v1/object/photo2026/${encodedPath}`,
        {
            method: "POST",

            headers: {
                apikey: cfg.SUPABASE_ANON_KEY,
                Authorization:
                    `Bearer ${cfg.SUPABASE_ANON_KEY}`,
                "Content-Type":
                    file.type ||
                    "application/octet-stream",
                "x-upsert": "false"
            },

            body: file
        }
    );

    const body =
        await response.json().catch(() => ({}));

    if (!response.ok) {
        console.error(
            "Storage upload error:",
            body
        );

        throw new Error(
            body.message ||
            body.error ||
            "写真のアップロードに失敗しました。"
        );
    }

    return storagePath;
}


// =========================================================
// アップロード画像削除
// 応募情報登録に失敗した場合の後始末
// =========================================================

async function deleteUploadedPhoto(storagePath) {
    try {
        await fetch(
            `${cfg.SUPABASE_URL}` +
            `/storage/v1/object/photo2026`,
            {
                method: "DELETE",

                headers: {
                    apikey:
                        cfg.SUPABASE_ANON_KEY,
                    Authorization:
                        `Bearer ${cfg.SUPABASE_ANON_KEY}`,
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    prefixes: [storagePath]
                })
            }
        );
    } catch (error) {
        console.warn(
            "Uploaded photo cleanup failed:",
            error
        );
    }
}


// =========================================================
// photo_entries登録
// =========================================================

// =========================================================
// photo_entries登録
// 受付番号の取得・応募数制限はSupabase側で処理
// =========================================================

async function insertPhotoEntry(storagePath) {
    const payload = {
        p_line_user_id:
            resident.line_user_id,

        p_resident_name:
            resident.name,

        p_district_name:
            resident.district_name || "",

        p_neighborhood_name:
            resident.neighborhood_name || "",

        p_title:
            titleInput.value.trim(),

        p_location:
            locationInput.value.trim(),

        p_shooting_date:
            shootingDateInput.value,

        p_comment:
            commentInput.value.trim(),

        p_storage_path:
            storagePath,

        p_original_file_name:
            selectedFile.name,

        p_mime_type:
            selectedFile.type ||
            "application/octet-stream",

        p_file_size:
            selectedFile.size
    };

    const response = await fetch(
        `${cfg.SUPABASE_URL}` +
        `/rest/v1/rpc/submit_photo_entry`,
        {
            method: "POST",

            headers: {
                apikey:
                    cfg.SUPABASE_ANON_KEY,

                Authorization:
                    `Bearer ${cfg.SUPABASE_ANON_KEY}`,

                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify(payload)
        }
    );

    const body =
        await response.json().catch(() => ({}));

    if (!response.ok) {
        console.error(
            "Photo entry RPC error:",
            body
        );

        throw new Error(
            body.message ||
            body.details ||
            "応募情報の登録に失敗しました。"
        );
    }

    return Array.isArray(body)
        ? body[0]
        : body;
}


// =========================================================
// 入力確認
// =========================================================

function validateForm() {
    if (!resident?.line_user_id) {
        throw new Error(
            "LINEユーザー情報を確認できません。"
        );
    }

    if (!resident?.name) {
        throw new Error(
            "住民マイページへの登録が必要です。"
        );
    }

    if (!titleInput.value.trim()) {
        throw new Error(
            "作品タイトルを入力してください。"
        );
    }

    if (!locationInput.value.trim()) {
        throw new Error(
            "撮影場所を入力してください。"
        );
    }

    if (!shootingDateInput.value) {
        throw new Error(
            "撮影日を入力してください。"
        );
    }

    if (!commentInput.value.trim()) {
        throw new Error(
            "作品コメントを入力してください。"
        );
    }

    if (!selectedFile) {
        throw new Error(
            "応募写真を選択してください。"
        );
    }

    if (!agreeInput.checked) {
        throw new Error(
            "応募規約と個人情報の取扱いに同意してください。"
        );
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
        throw new Error(
            "JPEG・PNG・WebP形式の写真を選択してください。"
        );
    }

    const maxFileSize =
        10 * 1024 * 1024;

    if (selectedFile.size > maxFileSize) {
        throw new Error(
            "写真は10MB以下にしてください。"
        );
    }
}


// =========================================================
// 写真プレビュー
// =========================================================

function handlePhotoChange(event) {
    const file =
        event.target.files?.[0];

    selectedFile = null;

    if (!file) {
        previewImage.removeAttribute("src");
        previewWrap.hidden = true;
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        photoInput.value = "";

        showMessage(
            "JPEG・PNG・WebP形式の写真を選択してください。",
            "error"
        );

        return;
    }

    const maxFileSize =
        10 * 1024 * 1024;

    if (file.size > maxFileSize) {
        photoInput.value = "";

        showMessage(
            "写真は10MB以下にしてください。",
            "error"
        );

        return;
    }

    selectedFile = file;
    hideMessage();

    const reader = new FileReader();

    reader.onload = () => {
        previewImage.src =
            String(reader.result);

        previewWrap.hidden = false;
    };

    reader.readAsDataURL(file);
}


// =========================================================
// 応募送信
// =========================================================

async function handleSubmit(event) {
    event.preventDefault();

    let storagePath = "";

    try {
        validateForm();

        const confirmed = window.confirm(
            "この内容でフォトコンテストへ応募しますか？"
        );

        if (!confirmed) {
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent =
            "写真を送信しています…";

        showMessage(
            "写真をアップロードしています。",
            "info"
        );

        storagePath =
            await uploadPhoto(selectedFile);

        submitButton.textContent =
            "応募情報を登録しています…";

        showMessage(
            "応募情報を登録しています。",
            "info"
        );

        const entry =
            await insertPhotoEntry(storagePath);

        const entryNumber =
            entry?.entry_no ||
            "受付完了";

        if (entryNoElement) {
            entryNoElement.textContent =
                String(entryNumber);
        }



        hideMessage();

        // フォーム内の入力部分を非表示にする
        Array.from(form.children).forEach((element) => {
            if (element !== successCard) {
                element.hidden = true;
            }
        });

        // 登録完了メッセージを表示
        successCard.hidden = false;
        successCard.style.display = "block";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (error) {
        console.error(
            "Photo entry error:",
            error
        );

        if (storagePath) {
            await deleteUploadedPhoto(
                storagePath
            );
        }

        showMessage(
            error instanceof Error
                ? error.message
                : "応募処理に失敗しました。",
            "error"
        );

        submitButton.disabled = false;
        submitButton.textContent =
            "この内容で応募する";
    }
}


// =========================================================
// 初期化
// =========================================================

async function initialize() {
    try {
        loadingElement.hidden = false;
        form.hidden = true;
        successCard.hidden = true;

        await liff.init({
            liffId: cfg.LIFF_ID
        });

        if (!liff.isLoggedIn()) {
            liff.login({
                redirectUri:
                    window.location.href
            });

            return;
        }

        const idToken =
            liff.getIDToken();

        if (!idToken) {
            throw new Error(
                "LINEログイン情報を確認できませんでした。"
            );
        }

        const data =
            await callResidentMyPage(idToken);

        resident =
            normalizeResident(data);

        if (!resident.name) {
            throw new Error(
                "住民マイページへの登録が必要です。"
            );
        }

        if (!resident.line_user_id) {
            throw new Error(
                "LINEユーザー情報を取得できませんでした。"
            );
        }

        displayResident();

        loadingElement.hidden = true;
        hideMessage();
        form.hidden = false;

    } catch (error) {
        console.error(
            "Initialize error:",
            error
        );

        loadingElement.hidden = true;
        form.hidden = true;

        showMessage(
            error instanceof Error
                ? error.message
                : "応募画面を表示できませんでした。",
            "error"
        );
    }
}


// =========================================================
// イベント
// =========================================================

photoInput.addEventListener(
    "change",
    handlePhotoChange
);

form.addEventListener(
    "submit",
    handleSubmit
);

initialize();