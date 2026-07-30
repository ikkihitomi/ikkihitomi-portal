// =========================================================
// 一箕地区ポータル Ver1.50
// mypage.js
// 住民マイページ
//
// 作成日：2026-07-30
//
// 主な機能
// ・LIFF初期化
// ・LINE ID Token取得
// ・resident-mypage Edge Function呼び出し
// ・住民情報の表示
// ・町内会・所属団体プルダウン生成
// ・登録内容の更新
// ・完了・エラーメッセージ表示
// =========================================================


// =========================================================
// 設定値
// =========================================================

const MY_PAGE_CONFIG = window.MY_PAGE_CONFIG || {};

const LIFF_ID =
    MY_PAGE_CONFIG.LIFF_ID
    || window.LIFF_ID
    || "";

const SUPABASE_URL =
    MY_PAGE_CONFIG.SUPABASE_URL
    || window.SUPABASE_URL
    || "";

const EDGE_FUNCTION_NAME =
    MY_PAGE_CONFIG.EDGE_FUNCTION_NAME
    || "resident-mypage";

const EDGE_FUNCTION_URL =
    MY_PAGE_CONFIG.EDGE_FUNCTION_URL
    || (
        SUPABASE_URL
            ? `${SUPABASE_URL}/functions/v1/${EDGE_FUNCTION_NAME}`
            : ""
    );


// =========================================================
// DOM取得
// =========================================================

const dom = {
    page:
        document.getElementById("mypage"),

    loading:
        document.getElementById("loading")
        || document.getElementById("loading-area"),

    content:
        document.getElementById("mypage-content")
        || document.getElementById("content-area"),

    message:
        document.getElementById("message")
        || document.getElementById("message-area"),

    error:
        document.getElementById("error-message")
        || document.getElementById("error-area"),

    form:
        document.getElementById("mypage-form")
        || document.getElementById("resident-form"),

    residentCode:
        document.getElementById("resident-code"),

    displayName:
        document.getElementById("line-display-name"),

    linePicture:
        document.getElementById("line-picture")
        || document.getElementById("profile-image"),

    registeredName:
        document.getElementById("registered-name"),

    furigana:
        document.getElementById("furigana"),

    districtCode:
        document.getElementById("district-code"),

    districtName:
        document.getElementById("district-name"),

    neighborhoodCode:
        document.getElementById("neighborhood-code"),

    organizationCode:
        document.getElementById("organization-code"),

    email:
        document.getElementById("email"),

    phone:
        document.getElementById("phone"),

    registrationStatus:
        document.getElementById("registration-status"),

    createdAt:
        document.getElementById("created-at"),

    updatedAt:
        document.getElementById("updated-at"),

    profileUpdatedAt:
        document.getElementById("profile-updated-at"),

    updateButton:
        document.getElementById("update-button")
        || document.getElementById("save-button"),

    retryButton:
        document.getElementById("retry-button"),

    registerLink:
        document.getElementById("register-link"),
};


// =========================================================
// アプリケーション状態
// =========================================================

const state = {
    initialized: false,
    submitting: false,

    idToken: "",
    lineProfile: null,

    resident: null,

    districts: [],
    neighborhoods: [],
    organizations: [],
};


// =========================================================
// 初期起動
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    initializeMyPage,
);


// =========================================================
// マイページ初期化
// =========================================================

async function initializeMyPage() {
    if (state.initialized) {
        return;
    }

    state.initialized = true;

    registerEvents();
    clearMessages();
    showLoading(true);
    showContent(false);

    try {
        validateConfiguration();

        await initializeLiff();
        await loadLineProfile();
        await bootstrapMyPage();

        showContent(true);

    } catch (error) {
        handleFatalError(error);

    } finally {
        showLoading(false);
    }
}


// =========================================================
// 設定確認
// =========================================================

function validateConfiguration() {
    if (!LIFF_ID) {
        throw new Error(
            "LIFF_IDが設定されていません。"
            + "mypage-config.jsを確認してください。",
        );
    }

    if (!EDGE_FUNCTION_URL) {
        throw new Error(
            "resident-mypageのURLを作成できません。"
            + "SUPABASE_URLを確認してください。",
        );
    }

    if (typeof liff === "undefined") {
        throw new Error(
            "LIFF SDKを読み込めませんでした。",
        );
    }
}


// =========================================================
// LIFF初期化
// =========================================================

async function initializeLiff() {
    await liff.init({
        liffId: LIFF_ID,
    });

    if (!liff.isLoggedIn()) {
        liff.login({
            redirectUri: window.location.href,
        });

        return;
    }

    const idToken = liff.getIDToken();

    if (!idToken) {
        throw new Error(
            "LINEログイン情報を取得できませんでした。"
            + "LINEから開き直してください。",
        );
    }

    state.idToken = idToken;
}


// =========================================================
// LINEプロフィール取得
// =========================================================

async function loadLineProfile() {
    try {
        const profile = await liff.getProfile();

        state.lineProfile = profile;

        if (
            dom.displayName
            && profile.displayName
        ) {
            dom.displayName.textContent =
                profile.displayName;
        }

        if (
            dom.linePicture
            && profile.pictureUrl
        ) {
            dom.linePicture.src =
                profile.pictureUrl;

            dom.linePicture.alt =
                `${profile.displayName || "LINE"}のプロフィール画像`;

            dom.linePicture.hidden = false;
        }

    } catch (error) {
        console.warn(
            "LINEプロフィールの取得に失敗しました。",
            error,
        );
    }
}


// =========================================================
// マイページ初期データ取得
// =========================================================

async function bootstrapMyPage() {
    const response = await callResidentMyPage({
        action: "bootstrap",
    });

    state.resident =
        response.resident || null;

    state.districts =
        Array.isArray(response.districts)
            ? response.districts
            : [];

    state.neighborhoods =
        Array.isArray(response.neighborhoods)
            ? response.neighborhoods
            : [];

    state.organizations =
        Array.isArray(response.organizations)
            ? response.organizations
            : [];

    if (!state.resident) {
        throw new Error(
            "住民情報を取得できませんでした。",
        );
    }

    renderMasterOptions();
    renderResident();
}


// =========================================================
// resident-mypage Edge Function呼び出し
// =========================================================

async function callResidentMyPage(payload) {
    const response = await fetch(
        EDGE_FUNCTION_URL,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json",

                "X-Line-Id-Token":
                    state.idToken,
            },

            body:
                JSON.stringify(payload),
        },
    );

    let result;

    try {
        result = await response.json();

    } catch {
        throw new Error(
            "サーバーから正しい応答がありませんでした。",
        );
    }

    if (!response.ok || !result.ok) {
        const error = new Error(
            result.error
            || "住民マイページ処理に失敗しました。",
        );

        error.code =
            result.code
            || `HTTP_${response.status}`;

        throw error;
    }

    return result;
}


// =========================================================
// マスター選択肢表示
// =========================================================

function renderMasterOptions() {
    renderNeighborhoodOptions();
    renderOrganizationOptions();
}


// =========================================================
// 町内会プルダウン
// =========================================================

function renderNeighborhoodOptions() {
    if (!dom.neighborhoodCode) {
        return;
    }

    const currentValue =
        state.resident?.neighborhood_code
        || "";

    dom.neighborhoodCode.innerHTML = "";

    appendOption(
        dom.neighborhoodCode,
        "",
        "町内会を選択してください",
    );

    state.neighborhoods.forEach(
        (neighborhood) => {
            appendOption(
                dom.neighborhoodCode,
                neighborhood.code,
                neighborhood.name,
            );
        },
    );

    dom.neighborhoodCode.value =
        currentValue;
}


// =========================================================
// 所属団体プルダウン
// =========================================================

function renderOrganizationOptions() {
    if (!dom.organizationCode) {
        return;
    }

    const currentValue =
        state.resident?.organization_code
        || "";

    dom.organizationCode.innerHTML = "";

    appendOption(
        dom.organizationCode,
        "",
        "所属団体なし",
    );

    state.organizations.forEach(
        (organization) => {
            appendOption(
                dom.organizationCode,
                organization.code,
                organization.name,
            );
        },
    );

    dom.organizationCode.value =
        currentValue;
}


// =========================================================
// option生成
// =========================================================

function appendOption(
    selectElement,
    value,
    label,
) {
    const option =
        document.createElement("option");

    option.value =
        value ?? "";

    option.textContent =
        label ?? "";

    selectElement.appendChild(option);
}


// =========================================================
// 住民情報表示
// =========================================================

function renderResident() {
    const resident = state.resident;

    if (!resident) {
        return;
    }

    setText(
        dom.residentCode,
        resident.resident_code || "－",
    );

    setValue(
        dom.registeredName,
        resident.registered_name || "",
    );

    setValue(
        dom.furigana,
        resident.furigana || "",
    );

    setValue(
        dom.email,
        resident.email || "",
    );

    setValue(
        dom.phone,
        resident.phone || "",
    );

    if (dom.neighborhoodCode) {
        dom.neighborhoodCode.value =
            resident.neighborhood_code || "";
    }

    if (dom.organizationCode) {
        dom.organizationCode.value =
            resident.organization_code || "";
    }

    renderDistrict(
        resident.district_code,
    );

    setText(
        dom.registrationStatus,
        getStatusLabel(
            resident.registration_status,
        ),
    );

    setText(
        dom.createdAt,
        formatDateTime(
            resident.created_at,
        ),
    );

    setText(
        dom.updatedAt,
        formatDateTime(
            resident.updated_at,
        ),
    );

    setText(
        dom.profileUpdatedAt,
        formatDateTime(
            resident.profile_updated_at,
        ),
    );
}


// =========================================================
// 7地区表示
// =========================================================

function renderDistrict(districtCode) {
    const district =
        state.districts.find(
            (item) =>
                String(item.code)
                === String(districtCode),
        );

    setValue(
        dom.districtCode,
        districtCode || "",
    );

    setValue(
        dom.districtName,
        district?.name || "",
    );
}

// =========================================================
// 町内会変更時の7地区自動表示
// =========================================================

function handleNeighborhoodChange() {
    if (!dom.neighborhoodCode) {
        return;
    }

    const selectedCode =
        dom.neighborhoodCode.value;

    const neighborhood =
        state.neighborhoods.find(
            (item) =>
                String(item.code)
                === String(selectedCode),
        );

    renderDistrict(
        neighborhood?.district_code
        || "",
    );
}


// =========================================================
// 更新処理
// =========================================================

async function handleSubmit(event) {
    event.preventDefault();

    if (state.submitting) {
        return;
    }

    clearMessages();

    const payload =
        collectFormValues();

    const validationMessage =
        validateForm(payload);

    if (validationMessage) {
        showError(validationMessage);

        focusFirstInvalidField(payload);

        return;
    }

    state.submitting = true;
    setSubmitButtonState(true);

    try {
        const response =
            await callResidentMyPage({
                action: "update",

                registered_name:
                    payload.registeredName,

                furigana:
                    payload.furigana,

                neighborhood_code:
                    payload.neighborhoodCode,

                organization_code:
                    payload.organizationCode,

                email:
                    payload.email,

                phone:
                    payload.phone,
            });

        state.resident =
            response.resident
            || state.resident;

        state.districts =
            Array.isArray(response.districts)
                ? response.districts
                : state.districts;

        state.neighborhoods =
            Array.isArray(response.neighborhoods)
                ? response.neighborhoods
                : state.neighborhoods;

        state.organizations =
            Array.isArray(response.organizations)
                ? response.organizations
                : state.organizations;

        renderMasterOptions();
        renderResident();

        showMessage(
            "登録内容を更新しました。",
        );

        scrollToMessage();

    } catch (error) {
        console.error(
            "住民情報更新エラー:",
            error,
        );

        showError(
            getErrorMessage(error),
        );

        scrollToMessage();

    } finally {
        state.submitting = false;
        setSubmitButtonState(false);
    }
}


// =========================================================
// フォーム値取得
// =========================================================

function collectFormValues() {
    return {
        registeredName:
            getInputValue(
                dom.registeredName,
            ),

        furigana:
            getInputValue(
                dom.furigana,
            ),

        neighborhoodCode:
            getInputValue(
                dom.neighborhoodCode,
            ),

        organizationCode:
            getInputValue(
                dom.organizationCode,
            ) || null,

        email:
            getInputValue(
                dom.email,
            ) || null,

        phone:
            getInputValue(
                dom.phone,
            ) || null,
    };
}


// =========================================================
// 入力チェック
// =========================================================

function validateForm(payload) {
    if (!payload.registeredName) {
        return "お名前を入力してください。";
    }

    if (
        payload.registeredName.length
        > 100
    ) {
        return "お名前は100文字以内で入力してください。";
    }

    if (
        payload.furigana
        && payload.furigana.length > 100
    ) {
        return "ふりがなは100文字以内で入力してください。";
    }

    if (!payload.neighborhoodCode) {
        return "町内会を選択してください。";
    }

    if (
        payload.email
        && !isValidEmail(payload.email)
    ) {
        return "メールアドレスの形式を確認してください。";
    }

    if (
        payload.phone
        && !isValidPhone(payload.phone)
    ) {
        return "電話番号は数字・ハイフン・かっこ・プラス記号で入力してください。";
    }

    return "";
}


// =========================================================
// 最初の未入力・不正項目へ移動
// =========================================================

function focusFirstInvalidField(payload) {
    if (!payload.registeredName) {
        dom.registeredName?.focus();
        return;
    }

    if (!payload.neighborhoodCode) {
        dom.neighborhoodCode?.focus();
        return;
    }

    if (
        payload.email
        && !isValidEmail(payload.email)
    ) {
        dom.email?.focus();
        return;
    }

    if (
        payload.phone
        && !isValidPhone(payload.phone)
    ) {
        dom.phone?.focus();
    }
}


// =========================================================
// メールアドレス確認
// =========================================================

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);
}


// =========================================================
// 電話番号確認
// =========================================================

function isValidPhone(phone) {
    return /^[0-9+\-()（）\s]{6,25}$/
        .test(phone);
}


// =========================================================
// 更新ボタン表示
// =========================================================

function setSubmitButtonState(isSubmitting) {
    if (!dom.updateButton) {
        return;
    }

    dom.updateButton.disabled =
        isSubmitting;

    dom.updateButton.textContent =
        isSubmitting
            ? "更新しています..."
            : "登録内容を更新";
}


// =========================================================
// ローディング表示
// =========================================================

function showLoading(visible) {
    if (dom.loading) {
        dom.loading.hidden =
            !visible;
    }

    if (dom.page) {
        dom.page.setAttribute(
            "aria-busy",
            visible ? "true" : "false",
        );
    }
}


// =========================================================
// コンテンツ表示
// =========================================================

function showContent(visible) {
    if (dom.content) {
        dom.content.hidden =
            !visible;
    }
}


// =========================================================
// 完了メッセージ
// =========================================================

function showMessage(message) {
    if (!dom.message) {
        return;
    }

    dom.message.textContent =
        message;

    dom.message.hidden = false;

    dom.message.setAttribute(
        "role",
        "status",
    );
}


// =========================================================
// エラーメッセージ
// =========================================================

function showError(message) {
    if (!dom.error) {
        alert(message);
        return;
    }

    dom.error.textContent =
        message;

    dom.error.hidden = false;

    dom.error.setAttribute(
        "role",
        "alert",
    );
}


// =========================================================
// メッセージ消去
// =========================================================

function clearMessages() {
    if (dom.message) {
        dom.message.textContent = "";
        dom.message.hidden = true;
    }

    if (dom.error) {
        dom.error.textContent = "";
        dom.error.hidden = true;
    }
}


// =========================================================
// メッセージ位置へ移動
// =========================================================

function scrollToMessage() {
    const target =
        dom.error && !dom.error.hidden
            ? dom.error
            : dom.message;

    target?.scrollIntoView({
        behavior: "smooth",
        block: "center",
    });
}


// =========================================================
// 致命的エラー処理
// =========================================================

function handleFatalError(error) {
    console.error(
        "住民マイページ初期化エラー:",
        error,
    );

    const message =
        getErrorMessage(error);

    showError(message);

    if (
        error?.code === "NOT_REGISTERED"
        && dom.registerLink
    ) {
        dom.registerLink.hidden = false;
    }
}


// =========================================================
// エラー文言取得
// =========================================================

function getErrorMessage(error) {
    if (
        error instanceof Error
        && error.message
    ) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    return "処理中にエラーが発生しました。";
}


// =========================================================
// 再読み込み
// =========================================================

function handleRetry() {
    window.location.reload();
}


// =========================================================
// イベント登録
// =========================================================

function registerEvents() {
    dom.form?.addEventListener(
        "submit",
        handleSubmit,
    );

    dom.neighborhoodCode
        ?.addEventListener(
            "change",
            handleNeighborhoodChange,
        );

    dom.retryButton
        ?.addEventListener(
            "click",
            handleRetry,
        );
}


// =========================================================
// 共通：入力値取得
// =========================================================

function getInputValue(element) {
    if (!element) {
        return "";
    }

    return String(
        element.value ?? "",
    ).trim();
}


// =========================================================
// 共通：入力値設定
// =========================================================

function setValue(element, value) {
    if (!element) {
        return;
    }

    element.value =
        value ?? "";
}


// =========================================================
// 共通：文字列表示
// =========================================================

function setText(element, value) {
    if (!element) {
        return;
    }

    element.textContent =
        value ?? "";
}


// =========================================================
// 登録状態表示
// =========================================================

function getStatusLabel(status) {
    switch (status) {
        case "active":
            return "登録中";

        case "suspended":
            return "利用停止中";

        case "withdrawn":
            return "登録解除";

        default:
            return status || "－";
    }
}


// =========================================================
// 日時表示
// =========================================================

function formatDateTime(value) {
    if (!value) {
        return "－";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "－";
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
