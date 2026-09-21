"use strict";

(() => {
    const config = window.OLD_PHOTO_CONFIG ?? {};
    const form = document.getElementById("historical-photo-form");
    const message = document.getElementById("form-message");
    const fileInput = document.getElementById("photo");
    const previewWrap = document.getElementById("preview-wrap");
    const preview = document.getElementById("preview");

    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll("#commonHeader a[href^='../'], #commonFooter a[href^='../']")
            .forEach(link => {
                link.setAttribute("href", `../${link.getAttribute("href")}`);
            });
    });

    const fields = {
        applicantName: document.getElementById("applicant-name"),
        email: document.getElementById("applicant-email"),
        phone: document.getElementById("applicant-phone"),
        title: document.getElementById("title"),
        era: document.getElementById("era"),
        sortYear: document.getElementById("sort-year"),
        location: document.getElementById("location"),
        description: document.getElementById("description"),
        providerName: document.getElementById("provider-name"),
        rightsConsent: document.getElementById("rights-consent"),
        privacyConsent: document.getElementById("privacy-consent")
    };

    function showMessage(text, type = "") {
        message.textContent = text;
        message.className = `form-message ${type}`.trim();
    }

    function normalizePhone(value) {
        return String(value || "").replace(/[^0-9+]/g, "");
    }

    function selectedNameMode() {
        return document.querySelector('input[name="name-mode"]:checked')?.value || "";
    }

    function validateForm() {
        if (!fields.applicantName.value.trim()) throw new Error("応募者氏名を入力してください。");
        const phone = normalizePhone(fields.phone.value);
        const email = fields.email.value.trim();
        if (!email && !phone) throw new Error("メールアドレスまたは電話番号のいずれかを入力してください。");
        if (email && !fields.email.validity.valid) throw new Error("正しいメールアドレスを入力してください。");
        if (phone && (phone.length < 10 || phone.length > 15)) throw new Error("電話番号を正しく入力してください。");
        if (!fields.title.value.trim()) throw new Error("写真タイトルを入力してください。");
        if (!fields.era.value.trim()) throw new Error("撮影年代を入力してください。");
        if (fields.sortYear.value && (!Number.isInteger(Number(fields.sortYear.value)) || Number(fields.sortYear.value) < 1800 || Number(fields.sortYear.value) > 2026)) throw new Error("並べ替え用西暦は1800から2026の整数で入力してください。");
        if (!fields.location.value.trim()) throw new Error("撮影場所を入力してください。");
        if (!fields.description.value.trim()) throw new Error("写真の説明を入力してください。");
        const nameMode = selectedNameMode();
        if (!nameMode) throw new Error("掲載名の方式を選択してください。");
        if (nameMode !== "anonymous" && !fields.providerName.value.trim()) throw new Error("公開時の提供者名を入力してください。");
        if (!fileInput.files?.[0]) throw new Error("写真ファイルを選択してください。");
        if (!config.allowedTypes.includes(fileInput.files[0].type)) throw new Error("JPEG・PNG・WebP形式の写真を選択してください。");
        if (fileInput.files[0].size > (config.maxFileSize || 10 * 1024 * 1024)) throw new Error("写真は10MB以下にしてください。");
        if (!fields.rightsConsent.checked) throw new Error("写真の権利とWeb掲載への同意が必要です。");
        if (!fields.privacyConsent.checked) throw new Error("個人情報取扱いへの同意が必要です。");
    }

    async function submitToSupabase() {
        const file = fileInput.files[0];
        const storagePath = `${new Date().getFullYear()}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
        const headers = {
            apikey: config.supabaseAnonKey,
            Authorization: `Bearer ${config.supabaseAnonKey}`
        };
        const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
        const uploadResponse = await fetch(
            `${config.supabaseUrl}/storage/v1/object/${config.storageBucket}/${encodedPath}`,
            { method: "POST", headers: { ...headers, "Content-Type": file.type }, body: file }
        );

        if (!uploadResponse.ok) {
            throw new Error("写真のアップロードに失敗しました。");
        }

        const payload = {
            applicant_name: fields.applicantName.value.trim(),
            applicant_email: fields.email.value.trim().toLowerCase(),
            applicant_phone: normalizePhone(fields.phone.value),
            title: fields.title.value.trim(),
            shooting_era_display: fields.era.value.trim(),
            shooting_year_sort: fields.sortYear.value ? Number(fields.sortYear.value) : null,
            location: fields.location.value.trim(),
            description: fields.description.value.trim(),
            provider_name_public: selectedNameMode() === "anonymous" ? "匿名" : fields.providerName.value.trim(),
            provider_name_mode: selectedNameMode(),
            storage_path: storagePath,
            rights_consent: fields.rightsConsent.checked,
            privacy_consent: fields.privacyConsent.checked,
            rights_consent_at: new Date().toISOString(),
            privacy_consent_at: new Date().toISOString(),
            rights_consent_version: "2026-10-01",
            privacy_consent_version: "2026-10-01"
        };
        const submitResponse = await fetch(
            `${config.supabaseUrl}/functions/v1/${config.submitFunctionName}`,
            {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }
        );

        if (!submitResponse.ok) {
            throw new Error("応募内容の登録に失敗しました。");
        }
    }

    fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (!file) { preview.removeAttribute("src"); previewWrap.hidden = true; return; }
        if (!config.allowedTypes.includes(file.type) || file.size > (config.maxFileSize || 10 * 1024 * 1024)) {
            fileInput.value = "";
            preview.removeAttribute("src");
            previewWrap.hidden = true;
            showMessage("JPEG・PNG・WebP形式、10MB以下の写真を選択してください。", "error");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => { preview.src = String(reader.result); previewWrap.hidden = false; };
        reader.readAsDataURL(file);
        showMessage("");
    });

    form.addEventListener("submit", event => {
        event.preventDefault();
        try {
            validateForm();
            if (config.submitApiEnabled) {
                if (!config.supabaseUrl || !config.supabaseAnonKey) {
                    throw new Error("Supabase接続設定が未完了です。");
                }
                showMessage("写真を送信しています。");
                submitToSupabase().then(() => {
                    showMessage("写真の提供を受け付けました。内容を確認後、掲載準備を進めます。", "success");
                }).catch(error => {
                    showMessage(error instanceof Error ? error.message : "送信に失敗しました。", "error");
                });
                return;
            }
            showMessage("入力内容の確認が完了しました。現在は公開準備中のため、送信は行っていません。", "success");
        } catch (error) {
            showMessage(error instanceof Error ? error.message : "入力内容を確認してください。", "error");
        }
    });
})();
