"use strict";

(() => {
    const config =
        window.PHOTO_GALLERY_CONFIG ?? {};

    const galleryGrid =
        document.getElementById(
            "gallery-grid",
        );

    const galleryEmpty =
        document.getElementById(
            "gallery-empty",
        );

    const galleryMessage =
        document.getElementById(
            "gallery-message",
        );

    const publicCount =
        document.getElementById(
            "public-count",
        );

    const searchInput =
        document.getElementById(
            "gallery-search",
        );

    const sortSelect =
        document.getElementById(
            "gallery-sort",
        );

    const photoDialog =
        document.getElementById(
            "photo-dialog",
        );

    const dialogImage =
        document.getElementById(
            "dialog-image",
        );

    const dialogEntryNo =
        document.getElementById(
            "dialog-entry-no",
        );

    const dialogTitle =
        document.getElementById(
            "dialog-title",
        );

    const dialogDetails =
        document.getElementById(
            "dialog-details",
        );

    const dialogComment =
        document.getElementById(
            "dialog-comment",
        );

    let entries = [];

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime(),
            )
        ) {
            return String(value);
        }

        return new Intl.DateTimeFormat(
            "ja-JP",
            {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            },
        ).format(date);
    }

    function setMessage(
        message,
        type = "",
    ) {
        galleryMessage.textContent =
            message;

        galleryMessage.className =
            `gallery-message ${type}`.trim();
    }

    async function loadEntries() {
        setMessage(
            "公開作品を読み込んでいます。",
        );

        const endpoint =
            `${config.supabaseUrl}/functions/v1/${config.functionName}`;

        const response =
            await fetch(
                endpoint,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        contest_year:
                            Number(
                                config.contestYear
                                || 2026,
                            ),
                    }),
                },
            );

        const result =
            await response
                .json()
                .catch(() => ({}));

        if (
            !response.ok
            || !result.ok
        ) {
            throw new Error(
                result.error
                || "公開作品を取得できませんでした。",
            );
        }

        entries =
            result.entries ?? [];

        publicCount.textContent =
            entries.length;

        renderEntries();

        setMessage(
            `${entries.length}作品を公開しています。`,
        );
    }

    function filteredEntries() {
        const keyword =
            searchInput.value
                .trim()
                .toLowerCase();

        const mode =
            sortSelect.value;

        let result =
            entries.filter(
                entry => {
                    if (!keyword) {
                        return true;
                    }

                    return [
                        entry.entry_no,
                        entry.title,
                        entry.location,
                        entry.district_name,
                        entry.neighborhood_name,
                        entry.comment,
                        entry.award_name,
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase()
                        .includes(keyword);
                },
            );

        result =
            [...result].sort(
                (a, b) => {
                    if (
                        mode
                        === "shooting"
                    ) {
                        return String(
                            b.shooting_date
                            ?? "",
                        ).localeCompare(
                            String(
                                a.shooting_date
                                ?? "",
                            ),
                        );
                    }

                    if (
                        mode
                        === "title"
                    ) {
                        return String(
                            a.title
                            ?? "",
                        ).localeCompare(
                            String(
                                b.title
                                ?? "",
                            ),
                            "ja",
                        );
                    }

                    return String(
                        b.created_at
                        ?? "",
                    ).localeCompare(
                        String(
                            a.created_at
                            ?? "",
                        ),
                    );
                },
            );

        return result;
    }

    function renderEntries() {
        const result =
            filteredEntries();

        galleryGrid.innerHTML = "";

        galleryEmpty.hidden =
            result.length !== 0;

        result.forEach(
            entry => {
                const card =
                    document.createElement(
                        "article",
                    );

                card.className =
                    "photo-card";

                card.innerHTML = `
                    <button
                        class="photo-button"
                        type="button"
                        data-id="${escapeHtml(entry.id)}"
                    >
                        <img
                            src="${escapeHtml(entry.image_url)}"
                            alt="${escapeHtml(entry.title)}"
                            loading="lazy"
                        >
                    </button>

                    <div class="photo-body">
                        <p class="entry-no">
                            ${escapeHtml(entry.entry_no)}
                        </p>

                        <h2>
                            ${escapeHtml(entry.title)}
                        </h2>

                        <div class="photo-meta">
                            <span>
                                撮影場所：
                                ${escapeHtml(entry.location)}
                            </span>

                            <span>
                                撮影日：
                                ${escapeHtml(formatDate(entry.shooting_date))}
                            </span>

                            <span>
                                地域：
                                ${escapeHtml(
                    entry.neighborhood_name
                    || entry.district_name
                    || "一箕地区"
                )}
                            </span>
                        </div>

                        ${entry.status
                        === "winner"
                        && entry.award_name
                        ? `
                                    <span class="award-badge">
                                        ${escapeHtml(entry.award_name)}
                                    </span>
                                `
                        : ""
                    }
                    </div>
                `;

                galleryGrid.appendChild(
                    card,
                );
            },
        );
    }

    function openDialog(entryId) {
        const entry =
            entries.find(
                row =>
                    row.id === entryId,
            );

        if (!entry) {
            return;
        }

        dialogImage.src =
            entry.image_url;

        dialogImage.alt =
            entry.title;

        dialogEntryNo.textContent =
            entry.entry_no;

        dialogTitle.textContent =
            entry.title;

        dialogDetails.innerHTML = `
            <dt>撮影場所</dt>
            <dd>
                ${escapeHtml(entry.location)}
            </dd>

            <dt>撮影日</dt>
            <dd>
                ${escapeHtml(formatDate(entry.shooting_date))}
            </dd>

            <dt>地域</dt>
            <dd>
                ${escapeHtml(
            entry.neighborhood_name
            || entry.district_name
            || "一箕地区"
        )}
            </dd>

            ${entry.status
                === "winner"
                && entry.award_name
                ? `
                        <dt>受賞</dt>
                        <dd>
                            ${escapeHtml(entry.award_name)}
                        </dd>
                    `
                : ""
            }
        `;

        dialogComment.textContent =
            entry.comment ?? "";

        photoDialog.showModal();
    }

    galleryGrid.addEventListener(
        "click",
        event => {
            const button =
                event.target.closest(
                    "[data-id]",
                );

            if (!button) {
                return;
            }

            openDialog(
                button.dataset.id,
            );
        },
    );

    searchInput.addEventListener(
        "input",
        renderEntries,
    );

    sortSelect.addEventListener(
        "change",
        renderEntries,
    );

    async function initialize() {
        try {
            if (
                !config.supabaseUrl
                || !config.functionName
            ) {
                throw new Error(
                    "photo-gallery-config.jsの設定を確認してください。",
                );
            }

            document.getElementById(
                "application-link",
            ).href =
                config.applicationUrl
                || "/photo2026/apply/";

            await loadEntries();

        } catch (error) {
            console.error(error);

            setMessage(
                error instanceof Error
                    ? error.message
                    : "応募作品を読み込めませんでした。",
                "error",
            );
        }
    }

    initialize();
})();
