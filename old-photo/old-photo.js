"use strict";

(() => {
    const config = window.OLD_PHOTO_CONFIG ?? {};
    const grid = document.getElementById("archive-grid");
    const empty = document.getElementById("archive-empty");
    const message = document.getElementById("archive-message");
    const search = document.getElementById("archive-search");
    const sort = document.getElementById("archive-sort");
    const dialog = document.getElementById("archive-dialog");
    const dialogImage = document.getElementById("dialog-image");
    const dialogTitle = document.getElementById("dialog-title");
    const dialogDetails = document.getElementById("dialog-details");
    const dialogDescription = document.getElementById("dialog-description");
    const loadMoreButton = document.getElementById("archive-load-more");
    let entries = [];
    let nextCursor = null;
    let hasMore = false;
    let isLoading = false;
    let pendingReset = false;
    let searchTimer = null;

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function setMessage(text, type = "") {
        message.textContent = text;
        message.className = `archive-message ${type}`.trim();
    }

    function getPublicName(entry) {
        return entry.provider_name_public || entry.provider_name || "匿名";
    }

    function filteredEntries() {
        return entries;
    }

    function renderEntries() {
        const result = filteredEntries();
        grid.innerHTML = "";
        empty.hidden = result.length !== 0;

        result.forEach(entry => {
            const card = document.createElement("article");
            card.className = "archive-card";
            card.innerHTML = `
                <button class="archive-image-button" type="button" data-id="${escapeHtml(entry.id)}">
                    <img src="${escapeHtml(entry.image_url)}" alt="${escapeHtml(entry.title)}" loading="lazy">
                </button>
                <div class="archive-card-body">
                    <p class="archive-era">${escapeHtml(entry.shooting_era_display || "年代不明")}</p>
                    <h3>${escapeHtml(entry.title)}</h3>
                    <p class="archive-meta">
                        <span>撮影場所：${escapeHtml(entry.location)}</span>
                        <span>提供：${escapeHtml(getPublicName(entry))}</span>
                    </p>
                </div>`;
            grid.appendChild(card);
        });
    }

    function openDetails(id) {
        const entry = entries.find(item => String(item.id) === String(id));
        if (!entry) return;
        dialogImage.src = entry.image_url;
        dialogImage.alt = entry.title || "一箕の昔と写真";
        dialogTitle.textContent = entry.title || "無題の写真";
        dialogDetails.innerHTML = `
            <dt>撮影年代</dt><dd>${escapeHtml(entry.shooting_era_display || "年代不明")}</dd>
            <dt>撮影場所</dt><dd>${escapeHtml(entry.location || "—")}</dd>
            <dt>提供者</dt><dd>${escapeHtml(getPublicName(entry))}</dd>`;
        dialogDescription.textContent = entry.description || "";
        dialog.showModal();
    }

    function setLoadMoreState() {
        loadMoreButton.hidden = !hasMore;
        loadMoreButton.disabled = isLoading;
        loadMoreButton.textContent = isLoading ? "読み込んでいます…" : "さらに読み込む";
    }

    async function loadEntries(reset = true) {
        if (isLoading) {
            if (reset) pendingReset = true;
            return;
        }

        const previousEntries = entries;
        const previousCursor = nextCursor;
        const previousHasMore = hasMore;
        isLoading = true;
        setLoadMoreState();
        if (!config.publicApiEnabled) {
            setMessage("公開作品の準備をしています。");
            empty.hidden = false;
            isLoading = false;
            setLoadMoreState();
            return;
        }

        try {
            const endpoint = `${config.supabaseUrl}/functions/v1/${config.publicFunctionName}`;
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "omit",
                body: JSON.stringify({
                    limit: Math.min(Math.max(Number(config.publicPageSize) || 24, 1), 24),
                    query: search.value.trim(),
                    sort: sort.value,
                    cursor: reset ? null : nextCursor,
                }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.ok) {
                throw new Error(result.error || "公開作品を取得できませんでした。");
            }

            const receivedEntries = Array.isArray(result.entries) ? result.entries : [];
            if (reset) {
                entries = receivedEntries;
            } else {
                const existingIds = new Set(entries.map(entry => String(entry.id)));
                const newEntries = receivedEntries.filter(entry => {
                    const id = String(entry.id);
                    if (existingIds.has(id)) return false;
                    existingIds.add(id);
                    return true;
                });
                entries = entries.concat(newEntries);
            }
            nextCursor = result.next_cursor ?? null;
            hasMore = result.has_more === true && Boolean(nextCursor);
            renderEntries();
            setMessage(`${entries.length}件の写真を公開しています。`);
        } catch (error) {
            entries = previousEntries;
            nextCursor = previousCursor;
            hasMore = previousHasMore;
            renderEntries();
            throw error;
        } finally {
            isLoading = false;
            setLoadMoreState();
            if (pendingReset) {
                pendingReset = false;
                loadEntries(true).catch(error => {
                    console.error(error);
                    setMessage(error instanceof Error ? error.message : "公開作品を取得できませんでした。", "error");
                });
            }
        }
    }

    grid.addEventListener("click", event => {
        const button = event.target.closest("[data-id]");
        if (button) openDetails(button.dataset.id);
    });
    search.addEventListener("input", () => {
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(() => {
            loadEntries(true).catch(error => {
                console.error(error);
                setMessage(error instanceof Error ? error.message : "公開作品を取得できませんでした。", "error");
            });
        }, 300);
    });
    sort.addEventListener("change", () => {
        loadEntries(true).catch(error => {
            console.error(error);
            setMessage(error instanceof Error ? error.message : "公開作品を取得できませんでした。", "error");
        });
    });
    loadMoreButton.addEventListener("click", () => {
        loadEntries(false).catch(error => {
            console.error(error);
            setMessage(error instanceof Error ? error.message : "公開作品を取得できませんでした。", "error");
        });
    });

    loadEntries(true).catch(error => {
        console.error(error);
        setMessage(error instanceof Error ? error.message : "公開作品を取得できませんでした。", "error");
        empty.hidden = false;
    });
})();
