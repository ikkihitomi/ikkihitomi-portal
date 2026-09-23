"use strict";

(() => {
    const config = window.OLD_PHOTO_CONFIG ?? {};
    const supabaseClient = window.supabase?.createClient(
        config.supabaseUrl,
        config.supabaseAnonKey,
    );
    const form = document.getElementById("historical-photo-form");
    const message = document.getElementById("form-message");
    const submitButton = document.getElementById("submit-button");
    const fileInput = document.getElementById("photo");
    const previewWrap = document.getElementById("preview-wrap");
    const preview = document.getElementById("preview");
    const residentRegistrationGuide = document.getElementById("resident-registration-guide");

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

    function fileExtension(file) {
        const extensions = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        };

        return extensions[file.type] || "jpg";
    }

    function isUuid(value) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
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
        const storagePath = `pending/2026/${crypto.randomUUID()}.${fileExtension(file)}`;

        if (!supabaseClient) {
            throw new Error("Supabase接続設定が未完了です。");
        }

        const { error: uploadError } = await supabaseClient.storage
            .from(config.storageBucket)
            .upload(storagePath, file, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) {
            throw new Error(`写真のアップロードに失敗しました: ${uploadError.message}`);
        }

        const consentAt = new Date().toISOString();
        const nameMode = selectedNameMode();
        const applicantName = fields.applicantName.value.trim();
        const email = fields.email.value.trim().toLowerCase();
        const phone = normalizePhone(fields.phone.value);

        const payload = {
            p_storage_path: storagePath,
            p_original_file_name: file.name,
            p_mime_type: file.type,
            p_file_size: file.size,
            p_applicant_name: applicantName,
            p_applicant_email: email || null,
            p_applicant_phone: phone || null,
            p_title: fields.title.value.trim(),
            p_shooting_era_display: fields.era.value.trim(),
            p_shooting_year_sort: fields.sortYear.value ? Number(fields.sortYear.value) : null,
            p_shooting_year_end_sort: null,
            p_location: fields.location.value.trim(),
            p_description: fields.description.value.trim(),
            p_provider_name_private: applicantName,
            p_provider_name_mode: nameMode,
            p_provider_name_public: nameMode === "anonymous" ? "匿名" : fields.providerName.value.trim(),
            p_contact_preference: email ? "email" : "phone",
            p_rights_consent: fields.rightsConsent.checked,
            p_rights_consent_at: consentAt,
            p_rights_consent_version: "2026-10-01",
            p_privacy_consent: fields.privacyConsent.checked,
            p_privacy_consent_at: consentAt,
            p_privacy_consent_version: "2026-10-01"
        };

        const { data, error: rpcError } = await supabaseClient.rpc(
            config.submitFunctionName,
            payload,
        );

        if (rpcError) {
            throw new Error("写真の送信後に登録処理でエラーが発生しました。管理者へお問い合わせください。");
        }

        if (!isUuid(data)) {
            throw new Error("登録結果を確認できませんでした。管理者へお問い合わせください。");
        }

        return data;
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

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (submitButton.disabled) return;
        residentRegistrationGuide.hidden = true;

        try {
            validateForm();
            if (config.submitApiEnabled) {
                if (!config.supabaseUrl || !config.supabaseAnonKey || !supabaseClient) {
                    throw new Error("Supabase接続設定が未完了です。");
                }
                submitButton.disabled = true;
                submitButton.textContent = "写真を送信しています…";
                showMessage("写真を送信しています。");
                await submitToSupabase();
                submitButton.textContent = "送信済み";
                showMessage("写真の提供を受け付けました。内容を確認後、掲載準備を進めます。", "success");
                residentRegistrationGuide.hidden = false;
                return;
            }
            showMessage("入力内容の確認が完了しました。現在は公開準備中のため、送信は行っていません。", "success");
        } catch (error) {
            showMessage(error instanceof Error ? error.message : "入力内容を確認してください。", "error");
            submitButton.disabled = false;
            submitButton.textContent = "入力内容を確認する";
        }
    });
})();
