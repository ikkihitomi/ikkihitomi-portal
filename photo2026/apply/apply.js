"use strict";

const cfg = window.PHOTO2026_CONFIG;
const el = {
    form: document.getElementById("entry-form"),
    loading: document.getElementById("loading"),
    message: document.getElementById("message"),
    residentName: document.getElementById("resident-name"),
    districtName: document.getElementById("district-name"),
    neighborhoodName: document.getElementById("neighborhood-name"),
    photo: document.getElementById("photo"),
    previewWrap: document.getElementById("preview-wrap"),
    preview: document.getElementById("preview"),
    submit: document.getElementById("submit-button"),
    success: document.getElementById("success-card"),
    entryNo: document.getElementById("entry-no")
};

let accessToken = "";
let resident = null;

function showMessage(text, type = "info") {
    el.message.textContent = text;
    el.message.className = `message ${type}`;
}
function clearMessage() {
    el.message.textContent = "";
    el.message.className = "message";
}
function normalizeResident(data) {
    const source = data?.resident || data?.profile || data?.data || data || {};
    return {
        name: source.name || source.full_name || source.display_name || "",
        district_name: source.district_name || source.district?.name || "",
        neighborhood_name: source.neighborhood_name || source.neighborhood?.name || ""
    };
}
async function callResidentMyPage(token) {
    const res = await fetch(`${cfg.SUPABASE_URL}/functions/v1/resident-mypage`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            apikey: cfg.SUPABASE_ANON_KEY
        }
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || body.message || "住民情報を取得できませんでした。");
    return body;
}
async function initialize() {
    try {
        if (!cfg || cfg.SUPABASE_URL.includes("YOUR_PROJECT")) {
            throw new Error("photo2026/config.js のSupabase設定が未入力です。");
        }
        el.loading.style.display = "block";
        await liff.init({ liffId: cfg.LIFF_ID });

        if (!liff.isLoggedIn()) {
            liff.login({ redirectUri: window.location.href });
            return;
        }

        accessToken = liff.getAccessToken();
        if (!accessToken) throw new Error("LINE認証情報を取得できませんでした。");

        const data = await callResidentMyPage(accessToken);
        resident = normalizeResident(data);

        if (!resident.name) {
            showMessage("住民マイページへの登録が必要です。登録後、もう一度応募ページを開いてください。", "error");
            return;
        }

        el.residentName.textContent = resident.name || "―";
        el.districtName.textContent = resident.district_name || "未登録";
        el.neighborhoodName.textContent = resident.neighborhood_name || "未登録";
        el.form.hidden = false;
    } catch (error) {
        console.error(error);
        showMessage(error.message || "初期化に失敗しました。", "error");
    } finally {
        el.loading.style.display = "none";
    }
}
el.photo.addEventListener("change", () => {
    const file = el.photo.files?.[0];
    el.previewWrap.style.display = "none";
    if (!file) return;
    if (file.size > cfg.MAX_FILE_SIZE) {
        el.photo.value = "";
        showMessage("写真は10MB以内にしてください。", "error");
        return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
        el.photo.value = "";
        showMessage("JPEG・PNG・WebP形式の写真を選択してください。", "error");
        return;
    }
    clearMessage();
    el.preview.src = URL.createObjectURL(file);
    el.previewWrap.style.display = "block";
});
el.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    if (!el.form.reportValidity()) return;
    const file = el.photo.files?.[0];
    if (!file) return showMessage("写真を選択してください。", "error");
    if (file.size > cfg.MAX_FILE_SIZE) return showMessage("写真は10MB以内にしてください。", "error");

    const formData = new FormData();
    formData.append("title", document.getElementById("title").value.trim());
    formData.append("location", document.getElementById("location").value.trim());
    formData.append("shooting_date", document.getElementById("shooting-date").value);
    formData.append("comment", document.getElementById("comment").value.trim());
    formData.append("photo", file, file.name);

    try {
        el.submit.disabled = true;
        el.submit.textContent = "応募を送信しています…";

        const res = await fetch(`${cfg.SUPABASE_URL}/functions/v1/${cfg.SUBMIT_FUNCTION}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: cfg.SUPABASE_ANON_KEY
            },
            body: formData
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || body.message || "応募を登録できませんでした。");

        el.form.hidden = true;
        el.entryNo.textContent = body.entry_no || "受付済み";
        el.success.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
        console.error(error);
        showMessage(error.message || "送信中にエラーが発生しました。", "error");
    } finally {
        el.submit.disabled = false;
        el.submit.textContent = "この内容で応募する";
    }
});

initialize();
