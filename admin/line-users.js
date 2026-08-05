"use strict";

/* ==========================================
   一箕地区ポータル
   LINE登録者管理

   Ver1.35
   ・登録者一覧表示
   ・検索・絞り込み
   ・配信対象者の選択
   ・4桁マスターコード連携
========================================== */


/* ==========================================
   1. HTML要素
========================================== */

// 集計
const followingCount =
    document.getElementById("following-count");

const completedCount =
    document.getElementById("completed-count");

const incompleteCount =
    document.getElementById("incomplete-count");

const unfollowedCount =
    document.getElementById("unfollowed-count");


// 検索・絞り込み
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


// 表示
const statusMessage =
    document.getElementById("status-message");

const lineUsersBody =
    document.getElementById("line-users-body");


// 配信対象選択
const selectAllCheckbox =
    document.getElementById("select-all-checkbox");

const selectFilteredButton =
    document.getElementById("select-filtered-button");

const clearSelectionButton =
    document.getElementById("clear-selection-button");

const selectedCount =
    document.getElementById("selected-count");

const deliveryButton =
    document.getElementById("delivery-button");


/* 配信ダイアログ */

const deliveryModal =
    document.getElementById("delivery-modal");

const deliveryModalClose =
    document.getElementById("delivery-modal-close");

const deliveryCancelButton =
    document.getElementById("delivery-cancel-button");

const deliveryTargetCount =
    document.getElementById("delivery-target-count");

const deliveryForm =
    document.getElementById("delivery-form");

const deliveryTitleInput =
    document.getElementById("delivery-title");

const deliveryBodyInput =
    document.getElementById("delivery-body");

const deliveryUrlInput =
    document.getElementById("delivery-url");

const deliveryPreviewText =
    document.getElementById("delivery-preview-text");

const deliveryFormMessage =
    document.getElementById("delivery-form-message");

const deliverySubmitButton =
    document.getElementById("delivery-submit-button");


/* 登録者編集ダイアログ */

const userEditModal =
    document.getElementById("user-edit-modal");

const userEditModalClose =
    document.getElementById("user-edit-modal-close");

const userEditCancelButton =
    document.getElementById("user-edit-cancel-button");

const userEditForm =
    document.getElementById("user-edit-form");

const editLineUserIdInput =
    document.getElementById("edit-line-user-id");

const editRegisteredNameInput =
    document.getElementById("edit-registered-name");

const editNeighborhoodNameInput =
    document.getElementById("edit-neighborhood-name");

const editDistrictGroupInput =
    document.getElementById("edit-district-group");

const editOrganizationNameInput =
    document.getElementById("edit-organization-name");

const editEmailInput =
    document.getElementById("edit-email");

const editPhoneInput =
    document.getElementById("edit-phone");

const editAdminNoteInput =
    document.getElementById("edit-admin-note");

const userEditMessage =
    document.getElementById("user-edit-message");

const userEditSubmitButton =
    document.getElementById("user-edit-submit-button");

/* ==========================================
  Ver1.31
  記事からLINE配信内容を引き継ぐ
========================================== */

const pageParameters =
    new URLSearchParams(
        window.location.search,
    );

const sourcePostId =
    pageParameters.get("post");


/* ==========================================
   2. データ保持
========================================== */

let lineUsers = [];

/*
 * 配信対象として選択した
 * LINE User IDを保持します。
 */
const selectedUserIds = new Set();


/* ==========================================
   3. 共通関数
========================================== */

/**
 * HTMLへ表示する文字列を安全に変換します。
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/**
 * 日時を日本語表示へ変換します。
 *
 * @param {string|null|undefined} value
 * @returns {string}
 */
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


/**
 * 配信可能な登録者か判定します。
 *
 * @param {object} user
 * @returns {boolean}
 */
function canDeliverToUser(user) {

    return (
        user.is_following === true
        && user.registration_completed === true
        && Boolean(user.line_user_id)
    );
}


/* ==========================================
   4. 集計表示
========================================== */

function updateSummary() {

    const following =
        lineUsers.filter(
            user =>
                user.is_following === true,
        ).length;

    const completed =
        lineUsers.filter(
            user =>
                user.is_following === true
                && user.registration_completed === true,
        ).length;

    const incomplete =
        lineUsers.filter(
            user =>
                user.is_following === true
                && user.registration_completed !== true,
        ).length;

    const unfollowed =
        lineUsers.filter(
            user =>
                user.is_following !== true,
        ).length;

    followingCount.textContent =
        String(following);

    completedCount.textContent =
        String(completed);

    incompleteCount.textContent =
        String(incomplete);

    unfollowedCount.textContent =
        String(unfollowed);
}


/* ==========================================
   5. 絞り込み
========================================== */

function getFilteredUsers() {

    const keyword =
        searchInput.value
            .trim()
            .toLowerCase();

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
            user.neighborhood_name,
            user.district_group,
            user.organization_name,
            user.email,
            user.phone,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        // キーワード検索
        if (
            keyword
            && !searchText.includes(keyword)
        ) {
            return false;
        }

        // 地区
        if (district === "未設定") {
            if (user.district_group) {
                return false;
            }
        } else if (
            district
            && user.district_group !== district
        ) {
            return false;
        }

        // 住民登録状況
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

        // 友だち状態
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


/* ==========================================
   6. 配信対象選択
========================================== */

function updateSelectedCount() {

    selectedCount.textContent =
        String(selectedUserIds.size);

    deliveryButton.disabled =
        selectedUserIds.size === 0;
}


/**
 * 現在表示中の配信可能者が
 * 全員選択されているか確認します。
 */
function updateSelectAllCheckbox() {

    const deliverableUsers =
        getFilteredUsers()
            .filter(canDeliverToUser);

    if (deliverableUsers.length === 0) {

        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.disabled = true;

        return;
    }

    selectAllCheckbox.disabled = false;

    const selectedInCurrentView =
        deliverableUsers.filter(
            user =>
                selectedUserIds.has(
                    user.line_user_id,
                ),
        ).length;

    selectAllCheckbox.checked =
        selectedInCurrentView
        === deliverableUsers.length;

    selectAllCheckbox.indeterminate =
        selectedInCurrentView > 0
        && selectedInCurrentView
        < deliverableUsers.length;
}


/**
 * 表示中の配信可能者をすべて選択します。
 */
function selectFilteredUsers() {

    const filteredUsers =
        getFilteredUsers();

    for (const user of filteredUsers) {

        if (canDeliverToUser(user)) {

            selectedUserIds.add(
                user.line_user_id,
            );
        }
    }

    renderLineUsers();
}


/**
 * 表示中の登録者だけ選択解除します。
 */
function deselectFilteredUsers() {

    const filteredUsers =
        getFilteredUsers();

    for (const user of filteredUsers) {

        if (user.line_user_id) {

            selectedUserIds.delete(
                user.line_user_id,
            );
        }
    }

    renderLineUsers();
}


/**
 * 全選択を解除します。
 */
function clearSelection() {

    selectedUserIds.clear();

    renderLineUsers();
}


/**
 * 再読み込みで存在しなくなったIDを
 * 選択リストから削除します。
 */
function cleanupSelectedUserIds() {

    const existingIds =
        new Set(
            lineUsers
                .filter(canDeliverToUser)
                .map(
                    user => user.line_user_id,
                ),
        );

    for (const lineUserId of selectedUserIds) {

        if (!existingIds.has(lineUserId)) {

            selectedUserIds.delete(
                lineUserId,
            );
        }
    }
}


/* ==========================================
   7. 一覧表示
========================================== */

function renderLineUsers() {

    const filteredUsers =
        getFilteredUsers();

    lineUsersBody.innerHTML = "";

    if (filteredUsers.length === 0) {

        lineUsersBody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="admin-empty-cell"
                >
                    条件に一致する登録者はいません。
                </td>
            </tr>
        `;

        statusMessage.textContent =
            "0件を表示しています。";

        updateSelectedCount();
        updateSelectAllCheckbox();

        return;
    }

    for (const user of filteredUsers) {

        const row =
            document.createElement("tr");

        const canDeliver =
            canDeliverToUser(user);

        const isChecked =
            canDeliver
            && selectedUserIds.has(
                user.line_user_id,
            );

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
                    <span
                        class="line-user-picture-placeholder"
                        aria-hidden="true"
                    >
                        LINE
                    </span>
                `;

        const registrationBadge =
            user.registration_completed === true
                ? `
                    <span class="status-badge completed">
                        登録済み
                    </span>
                `
                : `
                    <span class="status-badge incomplete">
                        未登録
                    </span>
                `;

        const followingBadge =
            user.is_following === true
                ? `
                    <span class="status-badge following">
                        友だち
                    </span>
                `
                : `
                    <span class="status-badge unfollowed">
                        解除済み
                    </span>
                `;

        row.innerHTML = `
            <td>
                <input
                    type="checkbox"
                    class="line-user-checkbox"
                    data-line-user-id="${escapeHtml(
            user.line_user_id || "",
        )
            }"
                    ${isChecked
                ? "checked"
                : ""
            }
                    ${canDeliver
                ? ""
                : "disabled"
            }
                    aria-label="${escapeHtml(
                user.display_name
                || user.registered_name
                || "LINE利用者",
            )
            }を選択"
                >
            </td>

            <td>
                <div class="line-user-profile">

                    ${pictureHtml}

                    <div>
                        <strong>
                            ${escapeHtml(
                user.display_name || "名称なし",
            )}
                        </strong>

                        <small title="${escapeHtml(user.status_message || "")}">
                            ${escapeHtml(
                user.status_message || "",
            )}
                        </small>
                    </div>
                </div>
            </td>

            <td>
                ${escapeHtml(
                user.registered_name
                || "-",
            )
            }
            </td>

            <td>
                ${escapeHtml(
                user.neighborhood_name
                || user.district_name
                || "-",
            )
            }
            </td>

            <td>
                ${escapeHtml(
                user.district_group
                || "未設定",
            )
            }
            </td>

            <td>
                ${escapeHtml(
                user.organization_name
                || "-",
            )
            }
            </td>

            <td>
                ${registrationBadge}
            </td>

            <td>
                ${followingBadge}
            </td>

            <td>
                ${escapeHtml(
                formatDate(
                    user.created_at,
                ),
            )
            }
            </td>

            <td>
                <button
                    type="button"
                    class="admin-button secondary line-user-edit-button"
                    data-user-id="${escapeHtml(user.id || "")}"
                >
                    編集
                </button>
            </td>
        `;

        const checkbox =
            row.querySelector(
                ".line-user-checkbox",
            );

        if (checkbox) {

            checkbox.addEventListener(
                "change",
                () => {

                    const lineUserId =
                        checkbox.dataset
                            .lineUserId;

                    if (!lineUserId) {
                        return;
                    }

                    if (checkbox.checked) {

                        selectedUserIds.add(
                            lineUserId,
                        );

                    } else {

                        selectedUserIds.delete(
                            lineUserId,
                        );
                    }

                    updateSelectedCount();
                    updateSelectAllCheckbox();
                },
            );
        }

        const editButton =
            row.querySelector(
                ".line-user-edit-button",
            );

        if (editButton) {
            editButton.addEventListener(
                "click",
                () => {
                    openUserEditModal(user.id);
                },
            );
        }

        lineUsersBody.appendChild(row);
    }

    statusMessage.textContent =
        `${filteredUsers.length}件を表示しています。`;

    updateSelectedCount();
    updateSelectAllCheckbox();
}


/* ==========================================
   8. Supabaseから取得
========================================== */

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
                    line_user_id,
                    display_name,
                    picture_url,
                    status_message,
                    is_following,
                    registered_name,
                    district_name,
                    neighborhood_name,
                    neighborhood_code,
                    district_group,
                    district_code,
                    organization_name,
                    organization_code,
                    email,
                    phone,
                    admin_note,
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

        cleanupSelectedUserIds();
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
                <td
                    colspan="10"
                    class="admin-empty-cell"
                >
                    データを取得できませんでした。
                </td>
            </tr>
        `;

        lineUsers = [];
        selectedUserIds.clear();

        updateSummary();
        updateSelectedCount();
        updateSelectAllCheckbox();

    } finally {

        refreshButton.disabled = false;
    }
}

/* ==========================================
   9. 登録者情報の編集
========================================== */

/*
 * Ver1.35
 * マスター連携処理でinputがselectへ置き換わるため、
 * 編集時には常に現在のHTML要素を取得します。
 */
function getUserEditMasterControls() {
    return {
        neighborhood:
            document.getElementById("edit-neighborhood-name"),
        district:
            document.getElementById("edit-district-group"),
        organization:
            document.getElementById("edit-organization-name"),
    };
}

function openUserEditModal(userId) {

    const user =
        lineUsers.find(
            item => String(item.id) === String(userId),
        );

    if (!user) {
        alert("登録者情報を確認できませんでした。");
        return;
    }

    const masterControls =
        getUserEditMasterControls();

    editLineUserIdInput.value =
        user.id || "";

    editRegisteredNameInput.value =
        user.registered_name || "";

    masterControls.neighborhood.value =
        user.neighborhood_name
        || user.district_name
        || "";

    masterControls.district.value =
        user.district_group || "";

    masterControls.organization.value =
        user.organization_name || "";

    /*
     * Ver1.35
     * 既存のマスターコードを編集項目へ保持します。
     * 選択内容を変更しないで保存した場合も、
     * 現在のコードが失われません。
     */
    masterControls.neighborhood.dataset.masterCode =
        user.neighborhood_code || "";

    masterControls.district.dataset.masterCode =
        user.district_code || "";

    masterControls.organization.dataset.masterCode =
        user.organization_code || "";

    editEmailInput.value =
        user.email || "";

    editPhoneInput.value =
        user.phone || "";

    editAdminNoteInput.value =
        user.admin_note || "";

    userEditMessage.textContent = "";
    userEditMessage.className =
        "delivery-form-message";

    userEditModal.hidden = false;

    document.body.classList.add(
        "delivery-modal-open",
    );

    window.setTimeout(
        () => {
            editRegisteredNameInput.focus();
        },
        50,
    );
}


function closeUserEditModal() {

    if (userEditSubmitButton.disabled) {
        return;
    }

    userEditModal.hidden = true;

    if (deliveryModal.hidden) {
        document.body.classList.remove(
            "delivery-modal-open",
        );
    }
}


async function saveUserEdit(event) {

    event.preventDefault();

    const userId =
        editLineUserIdInput.value.trim();

    if (!userId) {
        userEditMessage.textContent =
            "更新する登録者を確認できません。";

        userEditMessage.className =
            "delivery-form-message error";

        return;
    }

    const masterControls =
        getUserEditMasterControls();

    const registeredName =
        editRegisteredNameInput.value.trim();

    const neighborhoodName =
        masterControls.neighborhood.value.trim();

    const districtGroup =
        masterControls.district.value.trim();

    const organizationName =
        masterControls.organization.value.trim();

    const email =
        editEmailInput.value.trim();

    const phone =
        editPhoneInput.value.trim();

    const adminNote =
        editAdminNoteInput.value.trim();

    /*
     * Ver1.35
     * line-users-relation_Ver1.35.jsから、
     * 地区・町内会・所属団体のコードを取得します。
     */
    const masterCodes =
        window.getLineUserMasterCodes
            ? window.getLineUserMasterCodes()
            : {
                neighborhood_code: null,
                district_code: null,
                organization_code: null,
            };

    if (
        email
        && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        userEditMessage.textContent =
            "メールアドレスの形式を確認してください。";

        userEditMessage.className =
            "delivery-form-message error";

        editEmailInput.focus();
        return;
    }

    userEditSubmitButton.disabled = true;
    userEditSubmitButton.textContent =
        "保存しています";

    userEditMessage.textContent =
        "登録者情報を保存しています。";

    userEditMessage.className =
        "delivery-form-message";

    try {

        const { error } =
            await supabaseClient
                .from("line_users")
                .update({
                    registered_name:
                        registeredName || null,
                    neighborhood_name:
                        neighborhoodName || null,
                    district_group:
                        districtGroup || null,
                    organization_name:
                        organizationName || null,

                    /*
                     * Ver1.35
                     * 表示名と併せてマスターコードを保存します。
                     */
                    neighborhood_code:
                        masterCodes.neighborhood_code,
                    district_code:
                        masterCodes.district_code,
                    organization_code:
                        masterCodes.organization_code,

                    email:
                        email || null,
                    phone:
                        phone || null,
                    admin_note:
                        adminNote || null,
                    updated_at:
                        new Date().toISOString(),
                })
                .eq("id", userId);

        if (error) {
            throw error;
        }

        /*
         * Supabaseへの保存完了後は、一覧を再取得せず、
         * 画面上で保持している登録者データを更新します。
         * これにより、保存後の再読込待ちで画面が止まることを防ぎます。
         */
        const targetUser =
            lineUsers.find(
                user =>
                    String(user.id)
                    === String(userId),
            );

        if (targetUser) {
            targetUser.registered_name =
                registeredName || null;

            targetUser.neighborhood_name =
                neighborhoodName || null;

            targetUser.district_group =
                districtGroup || null;

            targetUser.organization_name =
                organizationName || null;

            targetUser.neighborhood_code =
                masterCodes.neighborhood_code;

            targetUser.district_code =
                masterCodes.district_code;

            targetUser.organization_code =
                masterCodes.organization_code;

            targetUser.email =
                email || null;

            targetUser.phone =
                phone || null;

            targetUser.admin_note =
                adminNote || null;

            targetUser.updated_at =
                new Date().toISOString();
        }

        updateSummary();
        renderLineUsers();

        userEditMessage.textContent =
            "登録者情報を保存しました。";

        userEditMessage.className =
            "delivery-form-message success";

        window.setTimeout(
            () => {
                closeUserEditModal();
            },
            600,
        );

    } catch (error) {

        console.error(
            "LINE user update error:",
            error,
        );

        userEditMessage.textContent =
            error instanceof Error
                ? error.message
                : "登録者情報の保存に失敗しました。";

        userEditMessage.className =
            "delivery-form-message error";

    } finally {

        userEditSubmitButton.disabled = false;
        userEditSubmitButton.textContent =
            "保存";
    }
}


/* ==========================================
   10. LINE配信
========================================== */

/**
 * 投稿管理画面から渡された記事を取得し、
 * LINE配信フォームへ自動入力します。
 */
async function loadSourcePost() {

    if (!sourcePostId) {
        return false;
    }

    try {

        const {
            data: post,
            error,
        } =
            await supabaseClient
                .from("posts")
                .select(`
                    id,
                    title,
                    body,
                    status,
                    post_type
                `)
                .eq(
                    "id",
                    sourcePostId,
                )
                .single();

        if (error) {
            throw error;
        }

        if (!post) {

            throw new Error(
                "記事が見つかりませんでした。",
            );
        }

        if (post.status !== "published") {

            throw new Error(
                "公開されていない記事はLINE配信できません。",
            );
        }

        /*
         * 配信フォームへ自動入力
         */
        deliveryTitleInput.value =
            post.title || "";

        deliveryBodyInput.value =
            post.body || "";

        /*
         * 公開記事URL
         */
        deliveryUrlInput.value =
            `${window.location.origin}`
            + `/news/detail.html?id=${encodeURIComponent(post.id)}`;

        updateDeliveryPreview();

        return true;

    } catch (error) {

        console.error(
            "Source post load error:",
            error,
        );

        alert(
            error instanceof Error
                ? error.message
                : "記事情報を取得できませんでした。",
        );

        return false;
    }
}


/**
 * 配信プレビューを作成します。
 */
function updateDeliveryPreview() {

    const title =
        deliveryTitleInput.value.trim();

    const body =
        deliveryBodyInput.value
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 300);

    const detailUrl =
        deliveryUrlInput.value.trim();

    const parts = [
        "📢 一箕地区からのお知らせ",
        "",
        title || "配信タイトル",
    ];

    if (body) {
        parts.push(
            "",
            body,
        );
    }

    if (detailUrl) {
        parts.push(
            "",
            "詳しくはこちら",
            detailUrl,
        );
    }

    parts.push(
        "",
        "一箕地区ポータル【公式】",
    );

    deliveryPreviewText.textContent =
        parts.join("\n");
}


/**
 * 配信ダイアログを開きます。
 */
function openDeliveryModal() {

    if (selectedUserIds.size === 0) {

        alert(
            "配信対象者を選択してください。",
        );

        return;
    }

    deliveryTargetCount.textContent =
        String(selectedUserIds.size);

    deliveryFormMessage.textContent = "";
    deliveryFormMessage.className =
        "delivery-form-message";

    updateDeliveryPreview();

    deliveryModal.hidden = false;

    document.body.classList.add(
        "delivery-modal-open",
    );

    window.setTimeout(
        () => {
            deliveryTitleInput.focus();
        },
        50,
    );
}


/**
 * 配信ダイアログを閉じます。
 */
function closeDeliveryModal() {

    if (deliverySubmitButton.disabled) {
        return;
    }

    deliveryModal.hidden = true;

    document.body.classList.remove(
        "delivery-modal-open",
    );
}


/**
 * 選択者へLINE配信します。
 */
async function sendLineMessage(event) {

    event.preventDefault();

    const title =
        deliveryTitleInput.value.trim();

    const body =
        deliveryBodyInput.value.trim();

    const detailUrl =
        deliveryUrlInput.value.trim();

    if (!title) {

        deliveryFormMessage.textContent =
            "配信タイトルを入力してください。";

        deliveryFormMessage.className =
            "delivery-form-message error";

        deliveryTitleInput.focus();

        return;
    }

    if (
        detailUrl
        && !/^https:\/\/.+/i.test(detailUrl)
    ) {

        deliveryFormMessage.textContent =
            "リンクURLはhttps://から入力してください。";

        deliveryFormMessage.className =
            "delivery-form-message error";

        deliveryUrlInput.focus();

        return;
    }

    const targetCount =
        selectedUserIds.size;

    const confirmed =
        window.confirm(
            `${targetCount}名へLINE配信します。\n\n`
            + "配信後は取り消せません。\n"
            + "本当に送信しますか？",
        );

    if (!confirmed) {
        return;
    }

    deliverySubmitButton.disabled = true;
    deliverySubmitButton.textContent =
        "送信しています";

    deliveryFormMessage.textContent =
        "LINEへ配信しています。";

    deliveryFormMessage.className =
        "delivery-form-message";

    try {

        /*
         * ログインセッション確認
         */
        const {
            data: sessionData,
            error: sessionError,
        } =
            await supabaseClient.auth
                .getSession();

        if (
            sessionError
            || !sessionData.session
        ) {

            throw new Error(
                "管理者ログインを確認できません。"
                + "もう一度ログインしてください。",
            );
        }

        /*
         * Supabase Edge Function呼び出し
         *
         * ログイン中のJWTは
         * functions.invokeが自動送信します。
         */
        const {
            data,
            error,
        } =
            await supabaseClient.functions
                .invoke(
                    "line-send-news",
                    {
                        body: {
                            title,
                            body,
                            detailUrl,
                            userIds:
                                Array.from(
                                    selectedUserIds,
                                ),
                        },
                    },
                );

        if (error) {
            throw error;
        }

        if (!data?.ok) {

            throw new Error(
                data?.error
                || "LINE配信に失敗しました。",
            );
        }

        const deliveredCount =
            data.deliveredCount
            ?? targetCount;

        deliveryFormMessage.textContent =
            `${deliveredCount}名へのLINE配信が完了しました。`;

        deliveryFormMessage.className =
            "delivery-form-message success";

        alert(
            `${deliveredCount}名へのLINE配信が完了しました。`,
        );

        /*
         * 送信成功後に入力と選択を解除
         */
        deliveryForm.reset();

        selectedUserIds.clear();

        renderLineUsers();

        updateDeliveryPreview();

        window.setTimeout(
            () => {
                closeDeliveryModal();
            },
            500,
        );

    } catch (error) {

        console.error(
            "LINE delivery error:",
            error,
        );

        deliveryFormMessage.textContent =
            error instanceof Error
                ? error.message
                : "LINE配信に失敗しました。";

        deliveryFormMessage.className =
            "delivery-form-message error";

    } finally {

        deliverySubmitButton.disabled = false;
        deliverySubmitButton.textContent =
            "選択した方へ送信";
    }
}

/* ==========================================
   11. イベント
========================================== */

// 検索
searchInput.addEventListener(
    "input",
    renderLineUsers,
);

// 地区
districtFilter.addEventListener(
    "change",
    renderLineUsers,
);

// 登録状況
registrationFilter.addEventListener(
    "change",
    renderLineUsers,
);

// 友だち状態
followingFilter.addEventListener(
    "change",
    renderLineUsers,
);

// 再読み込み
refreshButton.addEventListener(
    "click",
    loadLineUsers,
);

// 表示中をすべて選択
selectFilteredButton.addEventListener(
    "click",
    selectFilteredUsers,
);

// 全選択解除
clearSelectionButton.addEventListener(
    "click",
    clearSelection,
);

// 表示中の一括チェック
selectAllCheckbox.addEventListener(
    "change",
    () => {

        if (selectAllCheckbox.checked) {

            selectFilteredUsers();

        } else {

            deselectFilteredUsers();
        }
    },
);

// 配信ボタン
deliveryButton.addEventListener(
    "click",
    openDeliveryModal,
);


deliveryForm.addEventListener(
    "submit",
    sendLineMessage,
);

deliveryModalClose.addEventListener(
    "click",
    closeDeliveryModal,
);

deliveryCancelButton.addEventListener(
    "click",
    closeDeliveryModal,
);

deliveryTitleInput.addEventListener(
    "input",
    updateDeliveryPreview,
);

deliveryBodyInput.addEventListener(
    "input",
    updateDeliveryPreview,
);

deliveryUrlInput.addEventListener(
    "input",
    updateDeliveryPreview,
);

deliveryModal.addEventListener(
    "click",
    event => {

        if (
            event.target.matches(
                "[data-close-delivery-modal]",
            )
        ) {
            closeDeliveryModal();
        }
    },
);

userEditForm.addEventListener(
    "submit",
    saveUserEdit,
);

userEditModalClose.addEventListener(
    "click",
    closeUserEditModal,
);

userEditCancelButton.addEventListener(
    "click",
    closeUserEditModal,
);

userEditModal.addEventListener(
    "click",
    event => {

        if (
            event.target.matches(
                "[data-close-user-edit-modal]",
            )
        ) {
            closeUserEditModal();
        }
    },
);

document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {
            return;
        }

        if (!userEditModal.hidden) {
            closeUserEditModal();
            return;
        }

        if (!deliveryModal.hidden) {
            closeDeliveryModal();
        }
    },
);

/* ==========================================
   12. 初期表示
========================================== */

/* ==========================================
   初期表示
========================================== */

async function initializeLineUsersPage() {

    /*
     * 最初にLINE登録者を読み込みます。
     */
    await loadLineUsers();

    /*
     * 投稿管理画面から記事IDが渡された場合、
     * 記事情報を自動入力します。
     */
    const postLoaded =
        await loadSourcePost();

    /*
     * 記事を取得できた場合は、
     * 配信可能者を自動選択します。
     *
     * ただし、実送信前には
     * 必ず確認ダイアログが表示されます。
     */
    if (postLoaded) {

        selectFilteredUsers();

        openDeliveryModal();
    }
}

initializeLineUsersPage();