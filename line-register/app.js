"use strict";

/*
 * LIFFアプリ作成後に書き換えます。
 */
const LIFF_ID = "2010870639-dCVC8ERa";

/*
 * 次の工程で作るSupabase Edge Functionです。
 */
const REGISTER_API_URL =
    "https://aeafysrkqtwgufmhwwdb.supabase.co/functions/v1/line-register";

const loadingMessage =
    document.getElementById("loading-message");

const residentForm =
    document.getElementById("resident-form");

const completeMessage =
    document.getElementById("complete-message");

const displayNameElement =
    document.getElementById("display-name");

const profileImage =
    document.getElementById("profile-image");

const registeredNameInput =
    document.getElementById("registered-name");

const districtNameSelect =
    document.getElementById("district-name");

const submitButton =
    document.getElementById("submit-button");

const formMessage =
    document.getElementById("form-message");

const closeButton =
    document.getElementById("close-button");

async function initializeLiff() {

    try {

        await liff.init({
            liffId: LIFF_ID,
        });

        if (!liff.isLoggedIn()) {

            liff.login({
                redirectUri: window.location.href,
            });

            return;
        }

        const profile =
            await liff.getProfile();

        displayNameElement.textContent =
            profile.displayName || "LINE利用者";

        if (profile.pictureUrl) {

            profileImage.src =
                profile.pictureUrl;

            profileImage.hidden =
                false;
        }

        loadingMessage.hidden =
            true;

        residentForm.hidden =
            false;

    } catch (error) {

        console.error(
            "LIFF initialization error:",
            error,
        );

        loadingMessage.textContent =
            "LINE情報を確認できませんでした。"
            + "LINEアプリからもう一度開いてください。";
    }
}

residentForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        formMessage.textContent = "";
        formMessage.classList.remove("error");

        const registeredName =
            registeredNameInput.value.trim();

        const districtName =
            districtNameSelect.value;

        if (!registeredName || !districtName) {

            formMessage.textContent =
                "氏名と地区名を入力してください。";

            formMessage.classList.add("error");

            return;
        }

        const idToken =
            liff.getIDToken();

        if (!idToken) {

            formMessage.textContent =
                "LINE認証情報を取得できませんでした。";

            formMessage.classList.add("error");

            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "登録しています";

        try {

            const response = await fetch(
                REGISTER_API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        idToken,
                        registeredName,
                        districtName,
                    }),
                },
            );

            const result =
                await response.json();

            if (!response.ok || !result.ok) {

                throw new Error(
                    result.error
                    || "登録に失敗しました。",
                );
            }

            residentForm.hidden =
                true;

            completeMessage.hidden =
                false;

        } catch (error) {

            console.error(
                "Registration error:",
                error,
            );

            formMessage.textContent =
                error instanceof Error
                    ? error.message
                    : "登録に失敗しました。";

            formMessage.classList.add("error");

            submitButton.disabled = false;
            submitButton.textContent = "登録する";
        }
    },
);

closeButton.addEventListener(
    "click",
    () => {

        if (liff.isInClient()) {
            liff.closeWindow();
            return;
        }

        window.location.href =
            "https://ikki-portal.com/";
    },
);

initializeLiff();