"use strict";

/* ==========================================
   一箕地区ポータル Ver1.40-3
   LINE住民登録・登録情報更新フォーム
========================================== */

(() => {
    const config =
        window.RESIDENT_REGISTER_CONFIG ?? {};

    const pageMessage =
        document.getElementById("page-message");

    const form =
        document.getElementById("resident-form");

    const formMessage =
        document.getElementById("form-message");

    const submitButton =
        document.getElementById("submit-button");

    const lineUserIdInput =
        document.getElementById("line-user-id");

    const lineDisplayName =
        document.getElementById("line-display-name");

    const linePicture =
        document.getElementById("line-picture");

    const registeredNameInput =
        document.getElementById("registered-name");

    const furiganaInput =
        document.getElementById("furigana");

    const neighborhoodSelect =
        document.getElementById("neighborhood-name");

    const neighborhoodCodeInput =
        document.getElementById("neighborhood-code");

    const districtNameInput =
        document.getElementById("district-name");

    const districtCodeInput =
        document.getElementById("district-code");

    const organizationSelect =
        document.getElementById("organization-name");

    const organizationCodeInput =
        document.getElementById("organization-code");

    const emailInput =
        document.getElementById("email");

    const phoneInput =
        document.getElementById("phone");

    const privacyAgreement =
        document.getElementById("privacy-agreement");

    const completePanel =
        document.getElementById("complete-panel");

    const residentCode =
        document.getElementById("resident-code");

    const closeLiffButton =
        document.getElementById("close-liff-button");

    let districts = [];
    let neighborhoods = [];
    let organizations = [];

    let isEditMode = false;
    let currentResident = null;


    /* ==========================================
       メッセージ表示
    ========================================== */

    function showPageError(message) {
        pageMessage.textContent = message;
        pageMessage.className =
            "page-message error";
    }

    function showFormMessage(
        message,
        type = "",
    ) {
        formMessage.textContent = message;
        formMessage.className =
            `form-message ${type}`.trim();
    }


    /* ==========================================
       Edge Function呼び出し
    ========================================== */

    async function invokeFunction(body) {
        const endpoint =
            `${config.supabaseUrl}/functions/v1/${config.functionName}`;

        const idToken =
            liff.isLoggedIn()
                ? liff.getIDToken()
                : null;

        const response = await fetch(
            endpoint,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    ...(idToken
                        ? {
                            "X-Line-Id-Token":
                                idToken,
                        }
                        : {}),
                },

                body: JSON.stringify(body),
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
                || "処理に失敗しました。",
            );
        }

        return result;
    }


    /* ==========================================
       町内会マスター表示
    ========================================== */

    function fillNeighborhoods() {
        neighborhoodSelect.innerHTML = "";

        const firstOption =
            document.createElement("option");

        firstOption.value = "";

        firstOption.textContent =
            "町内会を選択してください";

        neighborhoodSelect.appendChild(
            firstOption,
        );

        neighborhoods.forEach(row => {
            const option =
                document.createElement("option");

            option.value =
                row.code;

            option.textContent =
                row.name;

            option.dataset.districtCode =
                row.district_code ?? "";

            neighborhoodSelect.appendChild(
                option,
            );
        });
    }


    /* ==========================================
       所属団体マスター表示
    ========================================== */

    function fillOrganizations() {
        organizationSelect.innerHTML = "";

        const firstOption =
            document.createElement("option");

        firstOption.value = "";

        firstOption.textContent =
            "所属団体なし・未選択";

        organizationSelect.appendChild(
            firstOption,
        );

        organizations.forEach(row => {
            const option =
                document.createElement("option");

            option.value =
                row.code;

            option.textContent =
                row.name;

            organizationSelect.appendChild(
                option,
            );
        });
    }


    /* ==========================================
       町内会から地区を自動設定
    ========================================== */

    function syncDistrict() {
        const selectedNeighborhood =
            neighborhoods.find(
                row =>
                    row.code
                    === neighborhoodSelect.value,
            );

        const district =
            districts.find(
                row =>
                    row.code
                    === selectedNeighborhood?.district_code,
            );

        neighborhoodCodeInput.value =
            selectedNeighborhood?.code ?? "";

        districtCodeInput.value =
            district?.code ?? "";

        districtNameInput.value =
            district?.name ?? "";
    }


    /* ==========================================
       所属団体コード設定
    ========================================== */

    function syncOrganization() {
        organizationCodeInput.value =
            organizationSelect.value || "";
    }


    /* ==========================================
       マスター取得
    ========================================== */

    async function loadMasters() {
        const result =
            await invokeFunction({
                action: "masters",
            });

        districts =
            result.districts ?? [];

        neighborhoods =
            result.neighborhoods ?? [];

        organizations =
            result.organizations ?? [];

        fillNeighborhoods();
        fillOrganizations();
    }


    /* ==========================================
       登録済み住民情報取得
    ========================================== */

    async function loadExistingResident() {
        const result =
            await invokeFunction({
                action: "getResident",
            });

        if (
            !result.registered
            || !result.resident
        ) {
            isEditMode = false;
            currentResident = null;

            pageMessage.textContent =
                "登録内容をご入力ください。";

            pageMessage.className =
                "page-message";

            submitButton.textContent =
                "登録する";

            return;
        }

        isEditMode = true;
        currentResident =
            result.resident;

        registeredNameInput.value =
            currentResident.registered_name
            ?? "";

        furiganaInput.value =
            currentResident.furigana
            ?? "";

        neighborhoodSelect.value =
            currentResident.neighborhood_code
            ?? "";

        organizationSelect.value =
            currentResident.organization_code
            ?? "";

        emailInput.value =
            currentResident.email
            ?? "";

        phoneInput.value =
            currentResident.phone
            ?? "";

        syncDistrict();
        syncOrganization();

        pageMessage.textContent =
            "登録済みの住民情報です。"
            + "内容を変更した場合は、"
            + "「登録内容を更新する」を押してください。";

        pageMessage.className =
            "page-message";

        submitButton.textContent =
            "登録内容を更新する";
    }


    /* ==========================================
       LIFF初期化
    ========================================== */

    async function initializeLiff() {
        if (
            !config.liffId
            || config.liffId.includes("ここに")
        ) {
            throw new Error(
                "register-config.jsへLIFF IDを設定してください。",
            );
        }

        await liff.init({
            liffId: config.liffId,
        });

        if (!liff.isLoggedIn()) {
            liff.login({
                redirectUri:
                    window.location.href,
            });

            return false;
        }

        const profile =
            await liff.getProfile();

        lineUserIdInput.value =
            profile.userId ?? "";

        lineDisplayName.textContent =
            profile.displayName
            ?? "LINE利用者";

        /*
         * 未登録の場合の初期値として
         * LINE表示名を氏名欄へ設定します。
         * 登録済みの場合は、後で住民情報に置き換わります。
         */
        registeredNameInput.value =
            profile.displayName ?? "";

        if (profile.pictureUrl) {
            linePicture.src =
                profile.pictureUrl;

            linePicture.hidden = false;
        }

        return true;
    }


    /* ==========================================
       初期表示
    ========================================== */

    async function initialize() {
        try {
            if (
                !config.supabaseUrl
                || config.supabaseUrl.includes(
                    "YOUR_PROJECT",
                )
            ) {
                throw new Error(
                    "register-config.jsへSupabase URLを設定してください。",
                );
            }

            const ready =
                await initializeLiff();

            if (!ready) return;

            /*
             * 先に選択肢を作成し、
             * その後に登録済みの値を設定します。
             */
            await loadMasters();

            await loadExistingResident();

            form.hidden = false;

        } catch (error) {
            console.error(
                "Resident register init error:",
                error,
            );

            showPageError(
                error instanceof Error
                    ? error.message
                    : "初期表示に失敗しました。",
            );
        }
    }


    /* ==========================================
       新規登録・更新
    ========================================== */

    async function submitRegistration(event) {
        event.preventDefault();

        const registeredName =
            registeredNameInput.value.trim();

        const email =
            emailInput.value.trim();

        if (!registeredName) {
            showFormMessage(
                "お名前を入力してください。",
                "error",
            );

            registeredNameInput.focus();
            return;
        }

        if (!neighborhoodCodeInput.value) {
            showFormMessage(
                "町内会を選択してください。",
                "error",
            );

            neighborhoodSelect.focus();
            return;
        }

        if (!privacyAgreement.checked) {
            showFormMessage(
                "個人情報の利用について同意してください。",
                "error",
            );

            privacyAgreement.focus();
            return;
        }

        if (
            email
            && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                email,
            )
        ) {
            showFormMessage(
                "メールアドレスの形式を確認してください。",
                "error",
            );

            emailInput.focus();
            return;
        }

        submitButton.disabled = true;

        submitButton.textContent =
            isEditMode
                ? "更新しています"
                : "登録しています";

        showFormMessage(
            isEditMode
                ? "登録内容を更新しています。"
                : "登録内容を保存しています。",
        );

        try {
            /*
             * resident-register側が
             * 同一LINE User IDを確認し、
             * 新規登録または更新を自動判定します。
             */
            const result =
                await invokeFunction({
                    action: "register",

                    registered_name:
                        registeredName,

                    furigana:
                        furiganaInput.value.trim()
                        || null,

                    neighborhood_code:
                        neighborhoodCodeInput.value,

                    organization_code:
                        organizationCodeInput.value
                        || null,

                    email:
                        email || null,

                    phone:
                        phoneInput.value.trim()
                        || null,
                });

            isEditMode =
                Boolean(result.updated);

            form.hidden = true;

            completePanel.hidden = false;

            residentCode.textContent =
                result.resident_code
                ?? "------";

        } catch (error) {
            console.error(
                "Resident register submit error:",
                error,
            );

            showFormMessage(
                error instanceof Error
                    ? error.message
                    : (
                        isEditMode
                            ? "更新に失敗しました。"
                            : "登録に失敗しました。"
                    ),
                "error",
            );

        } finally {
            submitButton.disabled = false;

            submitButton.textContent =
                isEditMode
                    ? "登録内容を更新する"
                    : "登録する";
        }
    }


    /* ==========================================
       イベント設定
    ========================================== */

    neighborhoodSelect.addEventListener(
        "change",
        syncDistrict,
    );

    organizationSelect.addEventListener(
        "change",
        syncOrganization,
    );

    form.addEventListener(
        "submit",
        submitRegistration,
    );

    closeLiffButton.addEventListener(
        "click",
        () => {
            if (liff.isInClient()) {
                liff.closeWindow();
            } else {
                window.close();
            }
        },
    );


    /* ==========================================
       開始
    ========================================== */

    initialize();
})();