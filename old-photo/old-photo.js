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
    let entries = [];

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
        const keyword = search.value.trim().toLowerCase();
        const result = entries.filter(entry => !keyword || [
            entry.title,
            entry.shooting_era_display,
            entry.location,
            entry.description,
            getPublicName(entry)
        ].filter(Boolean).join(" ").toLowerCase().includes(keyword));

        return result.sort((left, right) => {
            if (sort.value === "oldest") {
                return (left.shooting_year_sort ?? Number.MAX_SAFE_INTEGER) - (right.shooting_year_sort ?? Number.MAX_SAFE_INTEGER);
            }
            if (sort.value === "newest") {
                return (right.shooting_year_sort ?? -1) - (left.shooting_year_sort ?? -1);
            }
            return String(right.created_at ?? "").localeCompare(String(left.created_at ?? ""));
        });
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

    async function loadEntries() {
        if (!config.publicApiEnabled) {
            setMessage("公開作品の準備をしています。");
            empty.hidden = false;
            return;
        }

        const endpoint = `${config.supabaseUrl}/functions/v1/${config.publicFunctionName}`;
        const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" } });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.error || "公開作品を取得できませんでした。");
        entries = Array.isArray(result.entries) ? result.entries : [];
        renderEntries();
        setMessage(`${entries.length}件の写真を公開しています。`);
    }

    grid.addEventListener("click", event => {
        const button = event.target.closest("[data-id]");
        if (button) openDetails(button.dataset.id);
    });
    search.addEventListener("input", renderEntries);
    sort.addEventListener("change", renderEntries);

    loadEntries().catch(error => {
        console.error(error);
        setMessage(error instanceof Error ? error.message : "公開作品を取得できませんでした。", "error");
        empty.hidden = false;
    });
})();
