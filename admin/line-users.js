"use strict";

const followingCount =
    document.getElementById("following-count");

const completedCount =
    document.getElementById("completed-count");

const incompleteCount =
    document.getElementById("incomplete-count");

const unfollowedCount =
    document.getElementById("unfollowed-count");

const searchInput =
    document.getElementById("search-input");

const districtFilter =
    document.getElementById("district-filter");

const registrationFilter =
    document.getElementById("registration-filter");

const followingFilter =
    document.getElementById("following-filter");

const refreshButton =
    document.getElementById("refresh-button");

const statusMessage =
    document.getElementById("status-message");

const lineUsersBody =
    document.getElementById("line-users-body");

let lineUsers = [];

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
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat(
        "ja-JP",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        },
    ).format(date);
}

function updateSummary() {

    const following =
        lineUsers.filter(
            user => user.is_following === true,
        ).length;

    const completed =
        lineUsers.filter(
            user =>
                user.registration_completed === true
                && user.is_following === true,
        ).length;

    const incomplete =
        lineUsers.filter(
            user =>
                user.registration_completed !== true
                && user.is_following === true,
        ).length;

    const unfollowed =
        lineUsers.filter(
            user => user.is_following !== true,
        ).length;

    followingCount.textContent = following;
    completedCount.textContent = completed;
    incompleteCount.textContent = incomplete;
    unfollowedCount.textContent = unfollowed;
}

function getFilteredUsers() {

    const keyword =
        searchInput.value.trim().toLowerCase();

    const district =
        districtFilter.value;

    const registration =
        registrationFilter.value;

    const following =
        followingFilter.value;

    return lineUsers.filter(user => {

        const searchText = [
            user.display_name,
            user.registered_name,
            user.district_name,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        if (
            keyword
            && !searchText.includes(keyword)
        ) {
            return false;
        }

        if (
            district
            && user.district_name !== district
        ) {
            return false;
        }

        if (
            registration === "completed"
            && user.registration_completed !== true
        ) {
            return false;
        }

        if (
            registration === "incomplete"
            && user.registration_completed === true
        ) {
            return false;
        }

        if (
            following === "following"
            && user.is_following !== true
        ) {
            return false;
        }

        if (
            following === "unfollowed"
            && user.is_following === true
        ) {
            return false;
        }

        return true;
    });
}

function renderLineUsers() {

    const filteredUsers =
        getFilteredUsers();

    lineUsersBody.innerHTML = "";

    if (filteredUsers.length === 0) {

        lineUsersBody.innerHTML = `
            <tr>
                <td colspan="6" class="admin-empty-cell">
                    条件に一致する登録者はいません。
                </td>
            </tr>
        `;

        statusMessage.textContent =
            "0件を表示しています。";

        return;
    }

    for (const user of filteredUsers) {

        const row =
            document.createElement("tr");

        const pictureHtml =
            user.picture_url
                ? `
                    <img
                        class="line-user-picture"
                        src="${escapeHtml(user.picture_url)}"
                        alt=""
                    >
                `
                : `
                    <span class="line-user-picture-placeholder">
                        LINE
                    </span>
                `;

        const registrationBadge =
            user.registration_completed === true
                ? `<span class="status-badge completed">登録済み</span>`
                : `<span class="status-badge incomplete">未登録</span>`;

        const followingBadge =
            user.is_following === true
                ? `<span class="status-badge following">友だち</span>`
                : `<span class="status-badge unfollowed">解除済み</span>`;

        row.innerHTML = `
            <td>
                <div class="line-user-profile">
                    ${pictureHtml}

                    <div>
                        <strong>
                            ${escapeHtml(user.display_name || "名称なし")}
                        </strong>

                        <small>
                            ${escapeHtml(user.status_message || "")}
                        </small>
                    </div>
                </div>
            </td>

            <td>
                ${escapeHtml(user.registered_name || "-")}
            </td>

            <td>
                ${escapeHtml(user.district_name || "-")}
            </td>

            <td>
                ${registrationBadge}
            </td>

            <td>
                ${followingBadge}
            </td>

            <td>
                ${escapeHtml(formatDate(user.created_at))}
            </td>
        `;

        lineUsersBody.appendChild(row);
    }

    statusMessage.textContent =
        `${filteredUsers.length}件を表示しています。`;
}

async function loadLineUsers() {

    statusMessage.textContent =
        "LINE登録者を読み込んでいます。";

    refreshButton.disabled = true;

    try {

        const { data, error } =
            await supabaseClient
                .from("line_users")
                .select(`
                    id,
                    display_name,
                    picture_url,
                    status_message,
                    is_following,
                    registered_name,
                    district_name,
                    registration_completed,
                    created_at,
                    updated_at
                `)
                .order(
                    "created_at",
                    {
                        ascending: false,
                    },
                );

        if (error) {
            throw error;
        }

        lineUsers =
            Array.isArray(data)
                ? data
                : [];

        updateSummary();
        renderLineUsers();

    } catch (error) {

        console.error(
            "LINE users load error:",
            error,
        );

        statusMessage.textContent =
            "LINE登録者の読み込みに失敗しました。";

        lineUsersBody.innerHTML = `
            <tr>
                <td colspan="6" class="admin-empty-cell">
                    データを取得できませんでした。
                </td>
            </tr>
        `;

    } finally {

        refreshButton.disabled = false;
    }
}

searchInput.addEventListener(
    "input",
    renderLineUsers,
);

districtFilter.addEventListener(
    "change",
    renderLineUsers,
);

registrationFilter.addEventListener(
    "change",
    renderLineUsers,
);

followingFilter.addEventListener(
    "change",
    renderLineUsers,
);

refreshButton.addEventListener(
    "click",
    loadLineUsers,
);

loadLineUsers();