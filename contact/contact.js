// ========================================
// 一箕地区ポータル
// お問い合わせフォーム
// Ver1.00
// ========================================

"use strict";


// ========================================
// 設定
// ========================================

const CONTACT_FUNCTION_URL =
    "https://aeafysrkqtwgufmhwwdb.supabase.co/functions/v1/contact-submit";


// ========================================
// DOM取得
// ========================================

const contactForm =
    document.getElementById("contact-form");

const formMessage =
    document.getElementById("form-message");

const submitButton =
    document.getElementById("submit-button");

const completeArea =
    document.getElementById("complete-area");

const inquiryNumber =
    document.getElementById("inquiry-number");

const messageField =
    document.getElementById("message");

const messageCount =
    document.getElementById("message-count");


// ========================================
// エラー表示
// ========================================

function setFieldError(
    fieldName,
    message
) {
    const field =
        document.getElementById(fieldName);

    const error =
        document.getElementById(
            `${fieldName}-error`
        );

    if (field) {
        field.classList.add("is-error");
    }

    if (error) {
        error.textContent = message;
    }
}


function clearFieldError(
    fieldName
) {
    const field =
        document.getElementById(fieldName);

    const error =
        document.getElementById(
            `${fieldName}-error`
        );

    if (field) {
        field.classList.remove("is-error");
    }

    if (error) {
        error.textContent = "";
    }
}


function clearAllErrors() {
    const fieldNames = [
        "name",
        "email",
        "phone",
        "category",
        "subject",
        "message",
        "agreement"
    ];

    fieldNames.forEach(
        clearFieldError
    );

    if (formMessage) {
        formMessage.textContent = "";

        formMessage.classList.remove(
            "is-error",
            "is-success"
        );
    }
}


// ========================================
// メール形式確認
// ========================================

function isValidEmail(email) {
    const pattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return pattern.test(email);
}


// ========================================
// 入力値取得
// ========================================

function getFormValues() {
    return {
        name:
            document
                .getElementById("name")
                .value
                .trim(),

        email:
            document
                .getElementById("email")
                .value
                .trim(),

        phone:
            document
                .getElementById("phone")
                .value
                .trim(),

        category:
            document
                .getElementById("category")
                .value,

        subject:
            document
                .getElementById("subject")
                .value
                .trim(),

        message:
            document
                .getElementById("message")
                .value
                .trim(),

        agreement:
            document
                .getElementById("agreement")
                .checked,

        website:
            document
                .getElementById("website")
                .value
                .trim(),
    };
}


// ========================================
// 入力チェック
// ========================================

function validateForm(values) {
    let isValid = true;

    if (!values.name) {
        setFieldError(
            "name",
            "お名前を入力してください。"
        );

        isValid = false;
    }


    if (!values.email) {
        setFieldError(
            "email",
            "メールアドレスを入力してください。"
        );

        isValid = false;

    } else if (
        !isValidEmail(values.email)
    ) {
        setFieldError(
            "email",
            "メールアドレスの形式を確認してください。"
        );

        isValid = false;
    }


    if (!values.category) {
        setFieldError(
            "category",
            "お問い合わせ種別を選択してください。"
        );

        isValid = false;
    }


    if (!values.subject) {
        setFieldError(
            "subject",
            "件名を入力してください。"
        );

        isValid = false;
    }


    if (!values.message) {
        setFieldError(
            "message",
            "お問い合わせ内容を入力してください。"
        );

        isValid = false;
    }


    if (!values.agreement) {
        setFieldError(
            "agreement",
            "個人情報の取扱いへの同意が必要です。"
        );

        isValid = false;
    }


    return isValid;
}


// ========================================
// 文字数表示
// ========================================

function updateMessageCount() {
    if (
        !messageField ||
        !messageCount
    ) {
        return;
    }

    const length =
        messageField.value.length;

    messageCount.textContent =
        `${length} / 5000`;
}


// ========================================
// 送信中表示
// ========================================

function setSendingState(
    isSending
) {
    if (!submitButton) {
        return;
    }

    submitButton.disabled =
        isSending;

    submitButton.textContent =
        isSending
            ? "送信しています..."
            : "お問い合わせを送信する";
}


// ========================================
// Edge Functionへ送信
// ========================================

async function submitContact(
    values
) {
    const response =
        await fetch(
            CONTACT_FUNCTION_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        name:
                            values.name,

                        email:
                            values.email,

                        phone:
                            values.phone,

                        category:
                            values.category,

                        subject:
                            values.subject,

                        message:
                            values.message,

                        website:
                            values.website
                    })
            }
        );


    let result;

    try {
        result =
            await response.json();

    } catch (error) {
        throw new Error(
            "サーバーから正しい応答を受信できませんでした。"
        );
    }


    if (
        !response.ok ||
        !result.success
    ) {
        throw new Error(
            result.message ||
            "お問い合わせの送信に失敗しました。"
        );
    }


    return result;
}


// ========================================
// 送信完了表示
// ========================================

function showComplete(
    result
) {
    if (contactForm) {
        contactForm.hidden = true;
    }


    if (formMessage) {
        formMessage.style.display =
            "none";
    }


    if (inquiryNumber) {
        inquiryNumber.textContent =
            result.inquiryNo || "";
    }


    if (completeArea) {
        completeArea.hidden = false;
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ========================================
// フォーム送信
// ========================================

async function handleSubmit(event) {
    event.preventDefault();

    clearAllErrors();


    const values =
        getFormValues();


    const isValid =
        validateForm(values);


    if (!isValid) {
        if (formMessage) {
            formMessage.textContent =
                "入力内容を確認してください。";

            formMessage.classList.add(
                "is-error"
            );
        }

        const firstError =
            document.querySelector(
                ".is-error"
            );

        if (firstError) {
            firstError.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }

        return;
    }


    setSendingState(true);


    try {
        const result =
            await submitContact(
                values
            );


        showComplete(result);


    } catch (error) {
        console.error(
            "お問い合わせ送信エラー:",
            error
        );


        if (formMessage) {
            formMessage.textContent =
                error instanceof Error
                    ? error.message
                    : "お問い合わせの送信に失敗しました。";

            formMessage.classList.add(
                "is-error"
            );
        }


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


    } finally {
        setSendingState(false);
    }
}


// ========================================
// 入力時にエラー解除
// ========================================

function registerInputEvents() {
    const fields = [
        "name",
        "email",
        "phone",
        "category",
        "subject",
        "message"
    ];


    fields.forEach(
        (fieldName) => {
            const field =
                document.getElementById(
                    fieldName
                );

            if (!field) {
                return;
            }


            field.addEventListener(
                "input",
                () => {
                    clearFieldError(
                        fieldName
                    );
                }
            );


            field.addEventListener(
                "change",
                () => {
                    clearFieldError(
                        fieldName
                    );
                }
            );
        }
    );


    const agreement =
        document.getElementById(
            "agreement"
        );


    if (agreement) {
        agreement.addEventListener(
            "change",
            () => {
                clearFieldError(
                    "agreement"
                );
            }
        );
    }
}


// ========================================
// 初期化
// ========================================

function initialize() {
    if (!contactForm) {
        console.error(
            "contact-form が見つかりません。"
        );

        return;
    }


    contactForm.addEventListener(
        "submit",
        handleSubmit
    );


    if (messageField) {
        messageField.addEventListener(
            "input",
            updateMessageCount
        );

        updateMessageCount();
    }


    registerInputEvents();
}


// ========================================
// 開始
// ========================================

initialize();