"use strict";

(() => {
    const config = window.PHOTO_ENTRIES_ADMIN_CONFIG ?? {};

    const client = window.supabase.createClient(
        config.supabaseUrl,
        config.supabaseAnonKey,
    );

    const pageMessage = document.getElementById("page-message");
    const entriesGrid = document.getElementById("entries-grid");
    const emptyPanel = document.getElementById("empty-panel");
    const resultCount = document.getElementById("result-count");

    const searchInput = document.getElementById("search-input");
    const statusFilter = document.getElementById("status-filter");
    const publicFilter = document.getElementById("public-filter");
    const yearFilter = document.getElementById("year-filter");

    const detailDialog = document.getElementById("detail-dialog");
    const detailTitle = document.getElementById("detail-title");
    const detailImage = document.getElementById("detail-image");
    const detailList = document.getElementById("detail-list");
    const detailAdminNote = document.getElementById("detail-admin-note");
    const detailAwardName = document.getElementById("detail-award-name");
    const dialogMessage = document.getElementById("dialog-message");

    let entries = [];
    let currentEntry = null;
    let currentUser = null;

    const statusLabels = {
        received: "応募受付",
        reviewing: "確認中",
        approved: "公開承認",
        rejected: "非承認",
        hidden: "公開停止",
        winner: "入賞",
    };

    function setPageMessage(message, type = "") {
        pageMessage.textContent = message;
        pageMessage.className = `page-message ${type}`.trim();
    }

    function setDialogMessage(message, type = "") {
        dialogMessage.textContent = message;
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

    function formatDate(value, withTime = false) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return new Intl.DateTimeFormat(
            "ja-JP",
            withTime
                ? {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                }
                : {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                },
        ).format(date);
    }

    function formatBytes(value) {
        const bytes = Number(value ?? 0);

        if (!Number.isFinite(bytes) || bytes <= 0) {
            return "—";
        }

        const units = ["B", "KB", "MB", "GB"];
        const index = Math.min(
            Math.floor(Math.log(bytes) / Math.log(1024)),
            units.length - 1,
        );

        return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
    }

    async function getImageUrl(storagePath) {
        if (!storagePath) return "";

        if (/^https?:\/\//i.test(storagePath)) {
            return storagePath;
        }

        if (config.bucketIsPublic) {
            const { data } = client.storage
                .from(config.photoBucket)
                .getPublicUrl(storagePath);

            return data.publicUrl;
        }

        const { data, error } = await client.storage
            .from(config.photoBucket)
            .createSignedUrl(storagePath, 60 * 30);

        if (error) {
            console.error("Signed URL error:", error);
            return "";
        }

        return data.signedUrl;
    }

    async function requireLogin() {
        const {
            data: { session },
            error,
        } = await client.auth.getSession();

        if (error) {
            throw error;
        }

        if (!session) {
            window.location.href = config.loginUrl || "./login.html";
            return false;
        }

        currentUser = session.user;
        return true;
    }

    async function loadEntries() {
        setPageMessage("応募作品を読み込んでいます。");

        const year = Number(yearFilter.value || 2026);

        const { data, error } = await client
            .from("photo_entries")
            .select(`
                id,
                contest_year,
                entry_no,
                line_user_id,
                resident_name,
                district_name,
                neighborhood_name,
                title,
                location,
                shooting_date,
                comment,
                storage_path,
                original_file_name,
                mime_type,
                file_size,
                status,
                is_public,
                award_name,
                admin_note,
                approved_at,
                approved_by,
                created_at,
                updated_at
            `)
            .eq("contest_year", year)
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        entries = await Promise.all(
            (data ?? []).map(async entry => ({
                ...entry,
                image_url: await getImageUrl(entry.storage_path),
            })),
        );

        renderStats();
        renderEntries();
        setPageMessage(`${entries.length}件の応募作品を読み込みました。`, "success");
    }

    function renderStats() {
        document.getElementById("stat-total").textContent =
            entries.length;

        document.getElementById("stat-received").textContent =
            entries.filter(row => row.status === "received").length;

        document.getElementById("stat-public").textContent =
            entries.filter(row => row.is_public).length;

        document.getElementById("stat-rejected").textContent =
            entries.filter(row => row.status === "rejected").length;
    }

    function getFilteredEntries() {
        const keyword = searchInput.value.trim().toLowerCase();
        const status = statusFilter.value;
        const publicValue = publicFilter.value;

        return entries.filter(entry => {
            if (status && entry.status !== status) {
                return false;
            }

            if (
                publicValue !== ""
                && String(Boolean(entry.is_public)) !== publicValue
            ) {
                return false;
            }

            if (!keyword) return true;

            const haystack = [
                entry.entry_no,
                entry.title,
                entry.resident_name,
                entry.district_name,
                entry.neighborhood_name,
                entry.location,
                entry.comment,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return haystack.includes(keyword);
        });
    }

    function renderEntries() {
        const filtered = getFilteredEntries();

        resultCount.textContent = `${filtered.length}件`;
        entriesGrid.innerHTML = "";
        emptyPanel.hidden = filtered.length !== 0;

        filtered.forEach(entry => {
            const card = document.createElement("article");
            card.className = "entry-card";

            const statusClass =
                `status-${escapeHtml(entry.status)}`;

            card.innerHTML = `
                <button
                    type="button"
                    class="entry-image-button"
                    data-action="view"
                    data-id="${escapeHtml(entry.id)}"
                >
                    <img
                        class="entry-image"
                        src="${escapeHtml(entry.image_url)}"
                        alt="${escapeHtml(entry.title)}"
                        loading="lazy"
                    >
                </button>

                <div class="entry-body">
                    <div class="entry-meta">
                        <span class="entry-no">
                            ${escapeHtml(entry.entry_no)}
                        </span>

                        <span class="status-badge ${statusClass}">
                            ${escapeHtml(statusLabels[entry.status] ?? entry.status)}
                        </span>

                        <span class="status-badge">
                            ${entry.is_public ? "公開中" : "非公開"}
                        </span>
                    </div>

                    <h3>${escapeHtml(entry.title)}</h3>

                    <p>
                        ${escapeHtml(entry.neighborhood_name || entry.district_name || "地区未設定")}
                    </p>

                    <p>
                        撮影場所：${escapeHtml(entry.location)}
                    </p>

                    <p>
                        応募日：${escapeHtml(formatDate(entry.created_at, true))}
                    </p>

                    <div class="card-actions">
                        <button
                            type="button"
                            class="view-button"
                            data-action="view"
                            data-id="${escapeHtml(entry.id)}"
                        >
                            詳細確認
                        </button>

                        ${!entry.is_public
                    ? `
                                <button
                                    type="button"
                                    class="quick-approve-button"
                                    data-action="approve"
                                    data-id="${escapeHtml(entry.id)}"
                                >
                                    公開承認
                                </button>
                                `
                    : ""
                }
                    </div>
                </div>
            `;

            entriesGrid.appendChild(card);
        });
    }

    function detailRows(entry) {
        return [
            ["応募番号", entry.entry_no],
            ["応募者氏名", entry.resident_name],
            ["地区", entry.district_name],
            ["町内会", entry.neighborhood_name],
            ["作品名", entry.title],
            ["撮影場所", entry.location],
            ["撮影日", formatDate(entry.shooting_date)],
            ["作品コメント", entry.comment],
            ["状態", statusLabels[entry.status] ?? entry.status],
            ["公開状態", entry.is_public ? "公開中" : "非公開"],
            ["応募日時", formatDate(entry.created_at, true)],
            ["元ファイル名", entry.original_file_name],
            ["MIME", entry.mime_type],
            ["ファイルサイズ", formatBytes(entry.file_size)],
        ];
    }

    function openDetail(entryId) {
        const entry = entries.find(row => row.id === entryId);

        if (!entry) return;

        currentEntry = entry;
        detailTitle.textContent =
            `${entry.entry_no}｜${entry.title}`;

        detailImage.src = entry.image_url;
        detailImage.alt = entry.title;

        detailList.innerHTML = detailRows(entry)
            .map(([label, value]) => `
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(value || "—")}</dd>
            `)
            .join("");

        detailAdminNote.value = entry.admin_note ?? "";
        detailAwardName.value = entry.award_name ?? "";

        setDialogMessage("");
        detailDialog.showModal();
    }

    async function updateEntry(patch, successMessage) {
        if (!currentEntry) return;

        setDialogMessage("保存しています。");

        const payload = {
            ...patch,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await client
            .from("photo_entries")
            .update(payload)
            .eq("id", currentEntry.id)
            .select("*")
            .single();

        if (error) {
            throw error;
        }

        const index = entries.findIndex(row => row.id === currentEntry.id);

        entries[index] = {
            ...entries[index],
            ...data,
            image_url: entries[index].image_url,
        };

        currentEntry = entries[index];

        renderStats();
        renderEntries();
        openDetail(currentEntry.id);
        setDialogMessage(successMessage, "success");
    }

    async function approveEntry(entryId = currentEntry?.id) {
        if (!entryId) return;

        currentEntry = entries.find(row => row.id === entryId);

        await updateEntry(
            {
                status: "approved",
                is_public: true,
                approved_at: new Date().toISOString(),
                approved_by: currentUser?.id ?? null,
            },
            "公開を承認しました。",
        );
    }

    async function deleteEntry() {
        if (!currentEntry) return;

        const firstConfirm = window.confirm(
            `応募番号 ${currentEntry.entry_no} を完全に削除しますか？\n`
            + "画像と応募データの両方が削除されます。",
        );

        if (!firstConfirm) return;

        const typed = window.prompt(
            "誤操作防止のため「削除」と入力してください。",
        );

        if (typed !== "削除") {
            setDialogMessage("削除を中止しました。");
            return;
        }

        setDialogMessage("画像と応募データを削除しています。");

        if (
            currentEntry.storage_path
            && !/^https?:\/\//i.test(currentEntry.storage_path)
        ) {
            const { error: storageError } = await client.storage
                .from(config.photoBucket)
                .remove([currentEntry.storage_path]);

            if (storageError) {
                throw new Error(
                    `画像を削除できませんでした: ${storageError.message}`,
                );
            }
        }

        const { error } = await client
            .from("photo_entries")
            .delete()
            .eq("id", currentEntry.id);

        if (error) {
            throw error;
        }

        entries = entries.filter(row => row.id !== currentEntry.id);
        currentEntry = null;

        detailDialog.close();
        renderStats();
        renderEntries();
        setPageMessage("応募作品を完全に削除しました。", "success");
    }

    async function runAction(action) {
        try {
            if (action === "save-note") {
                await updateEntry(
                    {
                        admin_note: detailAdminNote.value.trim() || null,
                        award_name: detailAwardName.value.trim() || null,
                    },
                    "管理者メモを保存しました。",
                );
            }

            if (action === "reviewing") {
                await updateEntry(
                    {
                        status: "reviewing",
                        is_public: false,
                    },
                    "確認中へ変更しました。",
                );
            }

            if (action === "approve") {
                await approveEntry();
            }

            if (action === "winner") {
                const awardName =
                    detailAwardName.value.trim();

                if (!awardName) {
                    setDialogMessage(
                        "入賞にする場合は賞名を入力してください。",
                        "error",
                    );
                    detailAwardName.focus();
                    return;
                }

                await updateEntry(
                    {
                        status: "winner",
                        is_public: true,
                        award_name: awardName,
                        admin_note:
                            detailAdminNote.value.trim() || null,
                        approved_at: new Date().toISOString(),
                        approved_by: currentUser?.id ?? null,
                    },
                    "入賞作品として公開しました。",
                );
            }

            if (action === "hide") {
                await updateEntry(
                    {
                        status: "hidden",
                        is_public: false,
                    },
                    "作品を公開停止にしました。",
                );
            }

            if (action === "reject") {
                await updateEntry(
                    {
                        status: "rejected",
                        is_public: false,
                        approved_at: null,
                        approved_by: null,
                    },
                    "作品を非承認にしました。",
                );
            }

            if (action === "delete") {
                await deleteEntry();
            }
        } catch (error) {
            console.error(error);
            setDialogMessage(
                error instanceof Error
                    ? error.message
                    : "処理に失敗しました。",
                "error",
            );
        }
    }

    entriesGrid.addEventListener("click", async event => {
        const button = event.target.closest("[data-action]");

        if (!button) return;

        const entryId = button.dataset.id;
        const action = button.dataset.action;

        if (action === "view") {
            openDetail(entryId);
        }

        if (action === "approve") {
            try {
                await approveEntry(entryId);
            } catch (error) {
                setPageMessage(
                    error instanceof Error
                        ? error.message
                        : "公開承認に失敗しました。",
                    "error",
                );
            }
        }
    });

    [
        searchInput,
        statusFilter,
        publicFilter,
    ].forEach(element => {
        element.addEventListener("input", renderEntries);
        element.addEventListener("change", renderEntries);
    });

    yearFilter.addEventListener("change", () => {
        loadEntries().catch(error => {
            setPageMessage(error.message, "error");
        });
    });

    document.getElementById("reload-button")
        .addEventListener("click", () => {
            loadEntries().catch(error => {
                setPageMessage(error.message, "error");
            });
        });

    document.getElementById("save-note-button")
        .addEventListener("click", () => runAction("save-note"));

    document.getElementById("review-button")
        .addEventListener("click", () => runAction("reviewing"));

    document.getElementById("approve-button")
        .addEventListener("click", () => runAction("approve"));

    document.getElementById("winner-button")
        .addEventListener("click", () => runAction("winner"));

    document.getElementById("hide-button")
        .addEventListener("click", () => runAction("hide"));

    document.getElementById("reject-button")
        .addEventListener("click", () => runAction("reject"));

    document.getElementById("delete-button")
        .addEventListener("click", () => runAction("delete"));

    async function initialize() {
        try {
            if (
                !config.supabaseAnonKey
                || config.supabaseAnonKey.includes("YOUR_")
            ) {
                throw new Error(
                    "photo-entries-config.jsへSupabase anon keyを設定してください。",
                );
            }

            if (
                !config.photoBucket
                || config.photoBucket.includes("YOUR_")
            ) {
                throw new Error(
                    "photo-entries-config.jsへStorageバケット名を設定してください。",
                );
            }

            const loggedIn = await requireLogin();

            if (!loggedIn) return;

            document.getElementById("gallery-link").href =
                config.galleryUrl || "../photo2026/gallery/";

            await loadEntries();
        } catch (error) {
            console.error(error);
            setPageMessage(
                error instanceof Error
                    ? error.message
                    : "初期表示に失敗しました。",
                "error",
            );
        }
    }

    initialize();
})();
