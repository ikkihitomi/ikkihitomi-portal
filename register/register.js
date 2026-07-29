"use strict";

/* ==========================================
   一箕地区ポータル Ver1.40-2
   LINE住民登録フォーム
========================================== */

(() => {
    const config = window.RESIDENT_REGISTER_CONFIG ?? {};

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

    function showPageError(message) {
        pageMessage.textContent = message;
        pageMessage.className = "page-message error";
    }

    function showFormMessage(message, type = "") {
        formMessage.textContent = message;
        formMessage.className =
            `form-message ${type}`.trim();
    }

    async function invokeFunction(body) {
        const endpoint =
            `${config.supabaseUrl}/functions/v1/${config.functionName}`;

        const idToken =
            liff.isLoggedIn()
                ? liff.getIDToken()
                : null;

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(idToken
                    ? { "X-Line-Id-Token": idToken }
                    : {}),
            },
            body: JSON.stringify(body),
        });

        const result = await response.json()
            .catch(() => ({}));

        if (!response.ok || !result.ok) {
            throw new Error(
                result.error
                || "処理に失敗しました。",
            );
        }

        return result;
    }

    function fillNeighborhoods() {
        neighborhoodSelect.innerHTML = "";

        const firstOption =
            document.createElement("option");

        firstOption.value = "";
        firstOption.textContent =
            "町内会を選択してください";

        neighborhoodSelect.appendChild(firstOption);

        neighborhoods.forEach(row => {
            const option =
                document.createElement("option");

            option.value = row.code;
            option.textContent = row.name;
            option.dataset.districtCode =
                row.district_code ?? "";

            neighborhoodSelect.appendChild(option);
        });
    }

    function fillOrganizations() {
        organizationSelect.innerHTML = "";

        const firstOption =
            document.createElement("option");

        firstOption.value = "";
        firstOption.textContent =
            "所属団体なし・未選択";

        organizationSelect.appendChild(firstOption);

        organizations.forEach(row => {
            const option =
                document.createElement("option");

            option.value = row.code;
            option.textContent = row.name;

            organizationSelect.appendChild(option);
        });
    }

    function syncDistrict() {
        const selected =
            neighborhoodSelect.options[
            neighborhoodSelect.selectedIndex
            ];

        const selectedNeighborhood =
            neighborhoods.find(
                row => row.code === selected?.value,
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

    function syncOrganization() {
        organizationCodeInput.value =
            organizationSelect.value || "";
    }

    async function loadMasters() {
        const result =
            await invokeFunction({
                action: "masters",
            });

        districts = result.districts ?? [];
        neighborhoods = result.neighborhoods ?? [];
        organizations = result.organizations ?? [];

        fillNeighborhoods();
        fillOrganizations();
    }

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
                redirectUri: window.location.href,
            });
            return false;
        }

        const profile = await liff.getProfile();

        lineUserIdInput.value =
            profile.userId ?? "";

        lineDisplayName.textContent =
            profile.displayName ?? "LINE利用者";

        registeredNameInput.value =
            profile.displayName ?? "";

        if (profile.pictureUrl) {
            linePicture.src = profile.pictureUrl;
            linePicture.hidden = false;
        }

        return true;
    }

    async function initialize() {
        try {
            if (
                !config.supabaseUrl
                || config.supabaseUrl.includes("YOUR_PROJECT")
            ) {
                throw new Error(
                    "register-config.jsへSupabase URLを設定してください。",
                );
            }

            const ready =
                await initializeLiff();

            if (!ready) return;

            await loadMasters();

            pageMessage.textContent =
                "登録内容をご入力ください。";

            pageMessage.className =
                "page-message";

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
            && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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
            "登録しています";

        showFormMessage(
            "登録内容を保存しています。",
        );

        try {
            const result =
                await invokeFunction({
                    action: "register",
                    registered_name: registeredName,
                    furigana:
                        furiganaInput.value.trim() || null,
                    neighborhood_code:
                        neighborhoodCodeInput.value,
                    organization_code:
                        organizationCodeInput.value || null,
                    email:
                        email || null,
                    phone:
                        phoneInput.value.trim() || null,
                });

            form.hidden = true;
            completePanel.hidden = false;

            residentCode.textContent =
                result.resident_code ?? "------";

        } catch (error) {
            console.error(
                "Resident register submit error:",
                error,
            );

            showFormMessage(
                error instanceof Error
                    ? error.message
                    : "登録に失敗しました。",
                "error",
            );

        } finally {
            submitButton.disabled = false;
            submitButton.textContent =
                "登録する";
        }
    }

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

    initialize();
})();
