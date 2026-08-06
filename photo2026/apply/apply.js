"use strict";

const cfg = window.PHOTO2026_CONFIG;

if (!cfg) {
    throw new Error("フォトコン設定ファイルを読み込めませんでした。");
}

let selectedFile = null;
let districtMaster = [];
let neighborhoodMaster = [];

const form = document.getElementById("entry-form");
const messageElement = document.getElementById("message");
const loadingElement = document.getElementById("loading");
const submitButton = document.getElementById("submit-button");
const successCard = document.getElementById("success-card");
const entryNoElement = document.getElementById("entry-no");

const applicantNameInput = document.getElementById("applicant-name");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const districtNameInput = document.getElementById("district-name");
const neighborhoodNameInput = document.getElementById("neighborhood-name");
const masterStatusElement = document.getElementById("master-status");
const titleInput = document.getElementById("title");
const locationInput = document.getElementById("location");
const shootingDateInput = document.getElementById("shooting-date");
const commentInput = document.getElementById("comment");
const photoInput = document.getElementById("photo");
const previewWrap = document.getElementById("preview-wrap");
const previewImage = document.getElementById("preview");
const agreeInput = document.getElementById("agree");
const confirmInput = document.getElementById("confirm-input");

function showMessage(message, type = "info") {
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageElement.hidden = false;
}

function hideMessage() {
    messageElement.textContent = "";
    messageElement.hidden = true;
}

function normalizePhone(value) {
    return String(value || "").replace(/[^0-9+]/g, "");
}


function setMasterStatus(message, type = "info") {
    if (!masterStatusElement) {
        return;
    }

    masterStatusElement.textContent = message;
    masterStatusElement.className = `master-status ${type}`;
}

async function loadPhotoEntryMasters() {
    const response = await fetch(
        `${cfg.SUPABASE_URL}/rest/v1/rpc/get_photo_entry_masters`,
        {
            method: "POST",
            headers: {
                apikey: cfg.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
            },
            body: "{}"
        }
    );

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        console.error("Master loading error:", body);
        throw new Error(
            body.message ||
            body.details ||
            "地区・町内会マスターを取得できませんでした。"
        );
    }

    districtMaster = Array.isArray(body?.districts)
        ? body.districts
        : [];

    neighborhoodMaster = Array.isArray(body?.neighborhoods)
        ? body.neighborhoods
        : [];

    if (!districtMaster.length) {
        throw new Error("地区マスターに有効なデータがありません。");
    }

    if (!neighborhoodMaster.length) {
        throw new Error("町内会マスターに有効なデータがありません。");
    }
}

function renderDistrictOptions() {
    districtNameInput.innerHTML = "";

    const outsideOption = document.createElement("option");
    outsideOption.value = "";
    outsideOption.textContent = "地区外";
    outsideOption.dataset.code = "";
    districtNameInput.appendChild(outsideOption);

    districtMaster.forEach((district) => {
        const option = document.createElement("option");
        option.value = String(district.name || "");
        option.textContent = String(district.name || "");
        option.dataset.code = String(district.code || "");
        districtNameInput.appendChild(option);
    });

    districtNameInput.disabled = false;
}

function renderNeighborhoodOptions() {
    const selectedOption =
        districtNameInput.options[districtNameInput.selectedIndex];

    const districtCode =
        String(selectedOption?.dataset?.code || "");

    neighborhoodNameInput.innerHTML = "";

    if (!districtCode) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "地区外の方は選択不要です";
        neighborhoodNameInput.appendChild(option);
        neighborhoodNameInput.disabled = true;
        return;
    }

    const firstOption = document.createElement("option");
    firstOption.value = "";
    firstOption.textContent = "町内会を選択してください";
    neighborhoodNameInput.appendChild(firstOption);

    const matchingNeighborhoods = neighborhoodMaster.filter((item) => {
        const itemDistrictCode = String(item.district_code || "");
        const itemCode = String(item.code || "");

        return itemDistrictCode === districtCode || itemCode === "0000";
    });

    matchingNeighborhoods.forEach((neighborhood) => {
        const option = document.createElement("option");
        option.value = String(neighborhood.name || "");
        option.textContent = String(neighborhood.name || "");
        option.dataset.code = String(neighborhood.code || "");
        neighborhoodNameInput.appendChild(option);
    });

    neighborhoodNameInput.disabled = false;

    if (!matchingNeighborhoods.length) {
        firstOption.textContent = "該当する町内会がありません";
        neighborhoodNameInput.disabled = true;
    }
}

function handleDistrictChange() {
    renderNeighborhoodOptions();
}

function createStorageFileName(file) {
    const originalExtension = file.name.includes(".")
        ? file.name.split(".").pop().toLowerCase()
        : "jpg";

    const extension = originalExtension.replace(/[^a-z0-9]/g, "") || "jpg";
    return `${crypto.randomUUID()}.${extension}`;
}

function createApplicantDirectory() {
    const source = `${emailInput.value.trim().toLowerCase()}-${Date.now()}`;
    const bytes = new TextEncoder().encode(source);
    let hash = 2166136261;

    for (const byte of bytes) {
        hash ^= byte;
        hash = Math.imul(hash, 16777619);
    }

    return `guest-${(hash >>> 0).toString(16)}`;
}

async function uploadPhoto(file) {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const applicantDirectory = createApplicantDirectory();
    const storagePath = `${year}/${month}/${applicantDirectory}/${createStorageFileName(file)}`;

    const encodedPath = storagePath
        .split("/")
        .map(encodeURIComponent)
        .join("/");

    const response = await fetch(
        `${cfg.SUPABASE_URL}/storage/v1/object/photo2026/${encodedPath}`,
        {
            method: "POST",
            headers: {
                apikey: cfg.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`,
                "Content-Type": file.type || "application/octet-stream",
                "x-upsert": "false"
            },
            body: file
        }
    );

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        console.error("Storage upload error:", body);
        throw new Error(body.message || body.error || "写真のアップロードに失敗しました。");
    }

    return storagePath;
}

async function deleteUploadedPhoto(storagePath) {
    try {
        const response = await fetch(
            `${cfg.SUPABASE_URL}/storage/v1/object/photo2026`,
            {
                method: "DELETE",
                headers: {
                    apikey: cfg.SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ prefixes: [storagePath] })
            }
        );

        if (!response.ok) {
            console.warn("Uploaded photo cleanup failed:", await response.text());
        }
    } catch (error) {
        console.warn("Uploaded photo cleanup failed:", error);
    }
}

async function insertPhotoEntry(storagePath) {
    const payload = {
        p_line_user_id: null,
        p_resident_id: null,
        p_resident_name: applicantNameInput.value.trim(),
        p_email: emailInput.value.trim().toLowerCase(),
        p_phone: normalizePhone(phoneInput.value),
        p_district_name: districtNameInput.value || null,
        p_neighborhood_name: neighborhoodNameInput.value || null,
        p_title: titleInput.value.trim(),
        p_location: locationInput.value.trim(),
        p_shooting_date: shootingDateInput.value,
        p_comment: commentInput.value.trim(),
        p_storage_path: storagePath,
        p_original_file_name: selectedFile.name,
        p_mime_type: selectedFile.type || "application/octet-stream",
        p_file_size: selectedFile.size
    };

    const response = await fetch(
        `${cfg.SUPABASE_URL}/rest/v1/rpc/submit_photo_entry`,
        {
            method: "POST",
            headers: {
                apikey: cfg.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        }
    );

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        console.error("Photo entry RPC error:", body);
        throw new Error(body.message || body.details || body.hint || "応募情報の登録に失敗しました。");
    }

    return Array.isArray(body) ? body[0] : body;
}

function validateForm() {
    if (!applicantNameInput.value.trim()) {
        throw new Error("氏名を入力してください。");
    }

    if (!emailInput.value.trim() || !emailInput.validity.valid) {
        throw new Error("正しいメールアドレスを入力してください。");
    }

    const phone = normalizePhone(phoneInput.value);
    if (phone.length < 10 || phone.length > 15) {
        throw new Error("電話番号を正しく入力してください。");
    }

    if (districtNameInput.value && !neighborhoodNameInput.value) {
        throw new Error("町内会を選択してください。");
    }

    if (!titleInput.value.trim()) {
        throw new Error("作品タイトルを入力してください。");
    }

    if (!locationInput.value.trim()) {
        throw new Error("撮影場所を入力してください。");
    }

    if (!shootingDateInput.value) {
        throw new Error("撮影日を入力してください。");
    }

    if (shootingDateInput.value > new Date().toISOString().slice(0, 10)) {
        throw new Error("撮影日に未来の日付は指定できません。");
    }

    if (!commentInput.value.trim()) {
        throw new Error("作品コメントを入力してください。");
    }

    if (!selectedFile) {
        throw new Error("応募写真を選択してください。");
    }

    if (!agreeInput.checked) {
        throw new Error("応募規約と個人情報の取扱いに同意してください。");
    }

    if (!confirmInput.checked) {
        throw new Error("入力内容を確認したうえで、確認欄にチェックしてください。");
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(selectedFile.type)) {
        throw new Error("JPEG・PNG・WebP形式の写真を選択してください。");
    }

    const maxFileSize = cfg.MAX_FILE_SIZE || 10 * 1024 * 1024;
    if (selectedFile.size > maxFileSize) {
        throw new Error("写真は10MB以下にしてください。");
    }
}

function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    selectedFile = null;

    if (!file) {
        previewImage.removeAttribute("src");
        previewWrap.hidden = true;
        return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
        photoInput.value = "";
        showMessage("JPEG・PNG・WebP形式の写真を選択してください。", "error");
        return;
    }

    const maxFileSize = cfg.MAX_FILE_SIZE || 10 * 1024 * 1024;
    if (file.size > maxFileSize) {
        photoInput.value = "";
        showMessage("写真は10MB以下にしてください。", "error");
        return;
    }

    selectedFile = file;
    hideMessage();

    const reader = new FileReader();
    reader.onload = () => {
        previewImage.src = String(reader.result);
        previewWrap.hidden = false;
    };
    reader.readAsDataURL(file);
}

async function handleSubmit(event) {
    event.preventDefault();
    let storagePath = "";

    try {
        validateForm();

        if (!window.confirm("この内容でフォトコンテストへ応募しますか？")) {
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "写真を送信しています…";
        showMessage("写真をアップロードしています。", "info");

        storagePath = await uploadPhoto(selectedFile);

        submitButton.textContent = "応募情報を登録しています…";
        showMessage("応募情報を登録しています。", "info");

        const entry = await insertPhotoEntry(storagePath);
        entryNoElement.textContent = String(entry?.entry_no || "受付完了");

        hideMessage();
        form.hidden = true;
        successCard.hidden = false;

        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
        console.error("Photo entry error:", error);

        if (storagePath) {
            await deleteUploadedPhoto(storagePath);
        }

        showMessage(
            error instanceof Error ? error.message : "応募処理に失敗しました。",
            "error"
        );

        submitButton.disabled = false;
        submitButton.textContent = "この内容で応募する";
    }
}

async function initialize() {
    successCard.hidden = true;
    form.hidden = false;
    submitButton.disabled = true;

    const today = new Date().toISOString().slice(0, 10);
    shootingDateInput.max = today;

    try {
        setMasterStatus("地区・町内会マスターを読み込んでいます。", "info");

        await loadPhotoEntryMasters();
        renderDistrictOptions();
        renderNeighborhoodOptions();

        setMasterStatus(
            `地区 ${districtMaster.length}件・町内会 ${neighborhoodMaster.length}件を読み込みました。`,
            "success"
        );

        submitButton.disabled = false;
    } catch (error) {
        console.error("Initialize error:", error);

        districtNameInput.disabled = true;
        neighborhoodNameInput.disabled = true;
        submitButton.disabled = true;

        const message = error instanceof Error
            ? error.message
            : "地区・町内会マスターの読み込みに失敗しました。";

        setMasterStatus(message, "error");
        showMessage(
            `${message} 画面を再読み込みしてください。`,
            "error"
        );
    } finally {
        loadingElement.hidden = true;
    }
}

districtNameInput.addEventListener("change", handleDistrictChange);
photoInput.addEventListener("change", handlePhotoChange);
form.addEventListener("submit", handleSubmit);
initialize();
