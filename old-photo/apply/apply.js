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
    let displayVariant = null;
    let previewObjectUrl = null;

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

    function clearPreview() {
        if (previewObjectUrl) {
            URL.revokeObjectURL(previewObjectUrl);
            previewObjectUrl = null;
        }
        preview.removeAttribute("src");
        previewWrap.hidden = true;
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

    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            const objectUrl = URL.createObjectURL(file);

            image.onload = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(image);
            };
            image.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("画像を読み込めませんでした。"));
            };
            image.src = objectUrl;
        });
    }

    function canvasToBlob(canvas, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob) {
                    resolve(blob);
                    return;
                }
                reject(new Error("掲載用画像を作成できませんでした。"));
            }, "image/jpeg", quality);
        });
    }

    async function createDisplayVariant(file) {
        const image = await loadImage(file);
        const maxDimension = Math.max(image.naturalWidth, image.naturalHeight);
        let scale = Math.min(1, 1600 / maxDimension);
        let quality = 0.82;
        let result = null;

        for (let attempt = 0; attempt < 18; attempt += 1) {
            const width = Math.max(1, Math.round(image.naturalWidth * scale));
            const height = Math.max(1, Math.round(image.naturalHeight * scale));
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext("2d");
            if (!context) throw new Error("掲載用画像を作成できませんでした。");

            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, width, height);
            context.drawImage(image, 0, 0, width, height);

            const blob = await canvasToBlob(canvas, quality);
            result = { blob, width, height, quality };

            if (blob.size <= 800 * 1024) break;

            if (quality > 0.72) {
                quality = Math.max(0.72, quality - 0.03);
            } else {
                scale *= 0.9;
                quality = 0.82;
            }
        }

        if (!result) throw new Error("掲載用画像を作成できませんでした。");

        return {
            file: new File([result.blob], "display.jpg", {
                type: "image/jpeg",
                lastModified: Date.now(),
            }),
            width: result.width,
            height: result.height,
        };
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

    async function submitToSupabase(setProgress) {
        const file = fileInput.files[0];
        const postUuid = crypto.randomUUID();
        const originalStoragePath = `pending/2026/${postUuid}/original.${fileExtension(file)}`;
        const displayStoragePath = `pending/2026/${postUuid}/display.jpg`;
        let generatedDisplayVariant = displayVariant;

        if (!supabaseClient) {
            throw new Error("Supabase接続設定が未完了です。");
        }

        if (!generatedDisplayVariant || generatedDisplayVariant.sourceFile !== file) {
            setProgress("掲載用画像を作成しています");
            generatedDisplayVariant = await createDisplayVariant(file);
            generatedDisplayVariant.sourceFile = file;
            displayVariant = generatedDisplayVariant;
        }

        setProgress("原本を送信しています");
        const { error: originalUploadError } = await supabaseClient.storage
            .from(config.storageBucket)
            .upload(originalStoragePath, file, {
                contentType: file.type,
                upsert: false,
            });

        if (originalUploadError) {
            throw new Error(`原本のアップロードに失敗しました: ${originalUploadError.message}`);
        }

        setProgress("掲載用画像を送信しています");
        const { error: displayUploadError } = await supabaseClient.storage
            .from(config.storageBucket)
            .upload(displayStoragePath, generatedDisplayVariant.file, {
                contentType: "image/jpeg",
                upsert: false,
            });

        if (displayUploadError) {
            console.error("Historical photo upload orphaned file paths:", {
                originalStoragePath,
                displayStoragePath,
                error: displayUploadError,
            });
            const error = new Error("掲載用画像の送信に失敗しました。管理者へお問い合わせください。");
            error.noRetry = true;
            throw error;
        }

        const consentAt = new Date().toISOString();
        const nameMode = selectedNameMode();
        const applicantName = fields.applicantName.value.trim();
        const email = fields.email.value.trim().toLowerCase();
        const phone = normalizePhone(fields.phone.value);

        const payload = {
            p_storage_path: originalStoragePath,
            p_display_storage_path: displayStoragePath,
            p_display_mime_type: "image/jpeg",
            p_display_file_size: generatedDisplayVariant.file.size,
            p_display_width: generatedDisplayVariant.width,
            p_display_height: generatedDisplayVariant.height,
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

        setProgress("応募情報を登録しています");
        const { data, error: rpcError } = await supabaseClient.rpc(
            config.submitFunctionName,
            payload,
        );

        if (rpcError) {
            console.error("Historical photo registration orphaned file paths:", {
                originalStoragePath,
                displayStoragePath,
                error: rpcError,
            });
            const error = new Error("写真の登録に失敗しました。再送信を繰り返さず、管理者へお問い合わせください。");
            error.noRetry = true;
            throw error;
        }

        if (!isUuid(data)) {
            throw new Error("登録結果を確認できませんでした。管理者へお問い合わせください。");
        }

        return data;
    }

    fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        clearPreview();
        if (!file) return;
        if (!config.allowedTypes.includes(file.type) || file.size > (config.maxFileSize || 10 * 1024 * 1024)) {
            fileInput.value = "";
            showMessage("JPEG・PNG・WebP形式、10MB以下の写真を選択してください。", "error");
            return;
        }
        displayVariant = null;
        showMessage("掲載用画像を作成しています。");
        createDisplayVariant(file)
            .then(variant => {
                if (fileInput.files?.[0] !== file) return;
                variant.sourceFile = file;
                displayVariant = variant;
                previewObjectUrl = URL.createObjectURL(variant.file);
                preview.src = previewObjectUrl;
                previewWrap.hidden = false;
                showMessage("");
            })
            .catch(error => {
                if (fileInput.files?.[0] !== file) return;
                fileInput.value = "";
                clearPreview();
                showMessage(error instanceof Error ? error.message : "掲載用画像を作成できませんでした。", "error");
            });
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
                showMessage("掲載用画像を作成しています。");
                await submitToSupabase(showMessage);
                submitButton.textContent = "送信済み";
                showMessage("写真の提供を受け付けました。内容を確認後、掲載準備を進めます。", "success");
                residentRegistrationGuide.hidden = false;
                return;
            }
            showMessage("入力内容の確認が完了しました。現在は公開準備中のため、送信は行っていません。", "success");
        } catch (error) {
            showMessage(error instanceof Error ? error.message : "入力内容を確認してください。", "error");
            const noRetry = error instanceof Error && error.noRetry === true;
            submitButton.disabled = noRetry;
            submitButton.textContent = noRetry ? "管理者へお問い合わせください" : "入力内容を確認する";
        }
    });
})();
