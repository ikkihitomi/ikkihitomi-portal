"use strict";

(() => {
    const client = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
    );
    const bucket = "historical-photos";
    const signedUrlSeconds = 300;

    const pageMessage = document.getElementById("page-message");
    const searchInput = document.getElementById("search-input");
    const statusFilter = document.getElementById("status-filter");
    const entriesGrid = document.getElementById("entries-grid");
    const emptyPanel = document.getElementById("empty-panel");
    const resultCount = document.getElementById("result-count");
    const detailDialog = document.getElementById("detail-dialog");
    const detailTitle = document.getElementById("detail-title");
    const detailList = document.getElementById("detail-list");
    const originalImage = document.getElementById("original-image");
    const displayImage = document.getElementById("display-image");
    const originalLink = document.getElementById("original-link");
    const displayLink = document.getElementById("display-link");
    const dialogMessage = document.getElementById("dialog-message");
    const saveButton = document.getElementById("save-button");

    const editFields = {
        title: document.getElementById("edit-title"),
        era: document.getElementById("edit-era"),
        year: document.getElementById("edit-year"),
        endYear: document.getElementById("edit-end-year"),
        location: document.getElementById("edit-location"),
        provider: document.getElementById("edit-provider"),
        description: document.getElementById("edit-description"),
        status: document.getElementById("edit-status"),
        order: document.getElementById("edit-order"),
        isPublic: document.getElementById("edit-public"),
        note: document.getElementById("edit-note"),
    };

    let entries = [];
    let currentEntry = null;

    function setPageMessage(text, type = "") {
        pageMessage.textContent = text;
        pageMessage.className = `page-message ${type}`.trim();
    }

    function setDialogMessage(text, type = "") {
        dialogMessage.textContent = text;
        dialogMessage.className = `dialog-message ${type}`.trim();
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatDate(value) {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return new Intl.DateTimeFormat("ja-JP", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(date);
    }

    function formatBytes(value) {
        const bytes = Number(value);
        if (!Number.isFinite(bytes) || bytes <= 0) return "-";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }

    async function requireLogin() {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (!data.session) {
            window.location.href = "./login.html";
            return false;
        }
        return true;
    }

    async function getSignedUrl(path) {
        if (!path) return "";
        const { data, error } = await client.storage
            .from(bucket)
            .createSignedUrl(path, signedUrlSeconds);
        if (error) throw error;
        return data.signedUrl;
    }

    async function loadEntries() {
        setPageMessage("写真を読み込んでいます。");
        const { data, error } = await client.rpc(
            "admin_list_historical_photos",
            { p_status: statusFilter.value || null },
        );
        if (error) throw error;

        entries = await Promise.all((data ?? []).map(async entry => ({
            ...entry,
            display_url: await getSignedUrl(entry.display_storage_path),
        })));
        renderEntries();
        setPageMessage(`${entries.length}件の写真を読み込みました。`, "success");
    }

    function filteredEntries() {
        const keyword = searchInput.value.trim().toLowerCase();
        if (!keyword) return entries;
        return entries.filter(entry => [
            entry.title,
            entry.shooting_era_display,
            entry.location,
            entry.provider_name_public,
        ].filter(Boolean).join(" ").toLowerCase().includes(keyword));
    }

    function renderEntries() {
        const filtered = filteredEntries();
        entriesGrid.innerHTML = "";
        resultCount.textContent = `${filtered.length}件`;
        emptyPanel.hidden = filtered.length !== 0;

        filtered.forEach(entry => {
            const card = document.createElement("article");
            card.className = "entry-card";
            card.innerHTML = `
                <button class="entry-image-button" type="button" data-id="${escapeHtml(entry.id)}">
                    <img src="${escapeHtml(entry.display_url)}" alt="${escapeHtml(entry.title)}" loading="lazy">
                </button>
                <div class="entry-body">
                    <div class="entry-badges">
                        <span class="status-badge status-${escapeHtml(entry.status)}">${escapeHtml(entry.status)}</span>
                        <span class="public-badge">${entry.is_public ? "公開中" : "非公開"}</span>
                    </div>
                    <h3>${escapeHtml(entry.title || "無題")}</h3>
                    <p>${escapeHtml(entry.shooting_era_display || "年代不明")}</p>
                    <p>${escapeHtml(entry.location || "場所不明")}</p>
                    <p>提供：${escapeHtml(entry.provider_name_public || "匿名")}</p>
                    <p class="entry-date">受付：${escapeHtml(formatDate(entry.created_at))}</p>
                    <button class="detail-button" type="button" data-id="${escapeHtml(entry.id)}">詳細を確認</button>
                </div>`;
            entriesGrid.appendChild(card);
        });
    }

    function detailRows(entry) {
        return [
            ["原本容量", formatBytes(entry.file_size)],
            ["原本MIME", entry.mime_type],
            ["掲載用容量", formatBytes(entry.display_file_size)],
            ["掲載用MIME", entry.display_mime_type],
            ["掲載用サイズ", entry.display_width && entry.display_height ? `${entry.display_width} × ${entry.display_height}px` : "-"],
            ["応募者氏名", entry.applicant_name],
            ["メールアドレス", entry.applicant_email],
            ["電話番号", entry.applicant_phone],
            ["説明", entry.description],
            ["権利同意", `${entry.rights_consent ? "同意" : "未同意"} / ${formatDate(entry.rights_consent_at)} / ${entry.rights_consent_version || "-"}`],
            ["プライバシー同意", `${entry.privacy_consent ? "同意" : "未同意"} / ${formatDate(entry.privacy_consent_at)} / ${entry.privacy_consent_version || "-"}`],
            ["承認日時", formatDate(entry.approved_at)],
            ["承認者UUID", entry.approved_by],
        ];
    }

    function renderDetail(entry) {
        detailTitle.textContent = entry.title || "写真詳細";
        detailList.innerHTML = detailRows(entry).map(([label, value]) => `
            <dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "-")}</dd>
        `).join("");

        editFields.title.value = entry.title || "";
        editFields.era.value = entry.shooting_era_display || "";
        editFields.year.value = entry.shooting_year_sort ?? "";
        editFields.endYear.value = entry.shooting_year_end_sort ?? "";
        editFields.location.value = entry.location || "";
        editFields.provider.value = entry.provider_name_public || "";
        editFields.description.value = entry.description || "";
        editFields.status.value = entry.status;
        editFields.order.value = entry.display_order ?? 0;
        editFields.isPublic.checked = Boolean(entry.is_public);
        editFields.isPublic.disabled = entry.status !== "approved";
        editFields.note.value = entry.admin_note || "";

        originalImage.src = entry.original_url;
        displayImage.src = entry.display_url;
        originalLink.href = entry.original_url;
        displayLink.href = entry.display_url;
        originalImage.hidden = !entry.original_url;
        displayImage.hidden = !entry.display_url;
        setDialogMessage("");
    }

    async function openDetail(id) {
        setPageMessage("詳細を読み込んでいます。");
        const { data, error } = await client.rpc(
            "admin_get_historical_photo",
            { p_id: id },
        );
        if (error) throw error;

        currentEntry = {
            ...data,
            original_url: await getSignedUrl(data.storage_path),
            display_url: await getSignedUrl(data.display_storage_path),
        };
        renderDetail(currentEntry);
        detailDialog.showModal();
        setPageMessage("写真を読み込みました。", "success");
    }

    function updatePublicControl() {
        if (editFields.status.value !== "approved") {
            editFields.isPublic.checked = false;
            editFields.isPublic.disabled = true;
        } else {
            editFields.isPublic.disabled = false;
        }
    }

    async function saveEntry() {
        if (!currentEntry) return;
        saveButton.disabled = true;
        setDialogMessage("保存しています。");

        const payload = {
            p_id: currentEntry.id,
            p_title: editFields.title.value.trim(),
            p_shooting_era_display: editFields.era.value.trim(),
            p_shooting_year_sort: editFields.year.value ? Number(editFields.year.value) : null,
            p_shooting_year_end_sort: editFields.endYear.value ? Number(editFields.endYear.value) : null,
            p_location: editFields.location.value.trim(),
            p_description: editFields.description.value.trim(),
            p_provider_name_public: editFields.provider.value.trim(),
            p_status: editFields.status.value,
            p_is_public: editFields.isPublic.checked,
            p_display_order: Number(editFields.order.value),
            p_admin_note: editFields.note.value.trim() || null,
        };

        const { data, error } = await client.rpc(
            "admin_update_historical_photo",
            payload,
        );
        saveButton.disabled = false;
        if (error) throw error;

        currentEntry = {
            ...data,
            original_url: await getSignedUrl(data.storage_path),
            display_url: await getSignedUrl(data.display_storage_path),
        };
        setDialogMessage("変更を保存しました。", "success");
        renderDetail(currentEntry);
        await loadEntries();
    }

    entriesGrid.addEventListener("click", event => {
        const button = event.target.closest("[data-id]");
        if (!button) return;
        openDetail(button.dataset.id).catch(error => {
            console.error(error);
            setPageMessage(error instanceof Error ? error.message : "詳細を読み込めませんでした。", "error");
        });
    });

    searchInput.addEventListener("input", renderEntries);
    statusFilter.addEventListener("change", () => {
        loadEntries().catch(error => setPageMessage(error.message, "error"));
    });
    editFields.status.addEventListener("change", updatePublicControl);
    saveButton.addEventListener("click", () => {
        saveEntry().catch(error => {
            console.error(error);
            saveButton.disabled = false;
            setDialogMessage(error instanceof Error ? error.message : "保存に失敗しました。", "error");
        });
    });
    document.getElementById("reload-button").addEventListener("click", () => {
        loadEntries().catch(error => setPageMessage(error.message, "error"));
    });

    async function initialize() {
        try {
            if (!await requireLogin()) return;
            await loadEntries();
        } catch (error) {
            console.error(error);
            setPageMessage(error instanceof Error ? error.message : "管理画面を読み込めませんでした。", "error");
        }
    }

    initialize();
})();
