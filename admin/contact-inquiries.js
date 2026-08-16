"use strict";

/* ==========================================
   一箕地区ポータル
   お問い合わせ管理
========================================== */

let contactInquiries = [];


/* ==========================================
   DOM
========================================== */

const contactTableBody =
    document.getElementById(
        "contact-table-body",
    );

const contactTableWrap =
    document.getElementById(
        "contact-table-wrap",
    );

const contactLoading =
    document.getElementById(
        "contact-loading",
    );

const contactMessage =
    document.getElementById(
        "contact-message",
    );

const contactSummary =
    document.getElementById(
        "contact-summary",
    );

const contactSearch =
    document.getElementById(
        "contact-search",
    );

const contactRefresh =
    document.getElementById(
        "contact-refresh",
    );

const contactModal =
    document.getElementById(
        "contact-modal",
    );

const contactModalClose =
    document.getElementById(
        "contact-modal-close",
    );


/* ==========================================
   共通
========================================== */

function escapeHtml(value) {

    if (
        value === null
        || value === undefined
    ) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/*
 * 昨日のcontact_inquiriesの
 * 実カラム名が多少異なる場合にも
 * 対応できるようにしています。
 */
function getValue(
    item,
    candidateNames,
) {

    for (
        const name of candidateNames
    ) {

        if (
            item[name] !== undefined
            && item[name] !== null
        ) {
            return item[name];
        }
    }

    return "";
}


/* ==========================================
   各項目取得
========================================== */

function getReceptionNo(item) {

    return getValue(
        item,
        [
            "reception_no",
            "reception_number",
            "contact_no",
            "inquiry_no",
            "receipt_no",
            "entry_no",
        ],
    );
}


function getName(item) {

    return getValue(
        item,
        [
            "name",
            "contact_name",
            "applicant_name",
            "sender_name",
            "full_name",
        ],
    );
}


function getEmail(item) {

    return getValue(
        item,
        [
            "email",
            "email_address",
            "mail",
        ],
    );
}


function getPhone(item) {

    return getValue(
        item,
        [
            "phone",
            "phone_number",
            "tel",
            "telephone",
        ],
    );
}


function getInquiryType(item) {

    return getValue(
        item,
        [
            "inquiry_type",
            "contact_type",
            "category",
            "type",
        ],
    );
}


function getSubject(item) {

    return getValue(
        item,
        [
            "subject",
            "title",
        ],
    );
}


function getMessageBody(item) {

    return getValue(
        item,
        [
            "message",
            "body",
            "content",
            "inquiry",
            "inquiry_message",
        ],
    );
}


function getCreatedAt(item) {

    return getValue(
        item,
        [
            "created_at",
            "submitted_at",
            "received_at",
        ],
    );
}


/* ==========================================
   日時
========================================== */

function formatDateTime(value) {

    if (!value) {
        return "―";
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

    return date.toLocaleString(
        "ja-JP",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        },
    );
}


/* ==========================================
   Supabaseから取得
========================================== */

async function loadContactInquiries() {

    contactLoading.hidden = false;
    contactTableWrap.hidden = true;

    contactMessage.hidden = true;
    contactMessage.textContent = "";

    contactSummary.textContent =
        "読み込み中...";

    try {

        /*
         * カラム名を限定せず、
         * contact_inquiriesを取得します。
         */
        const {
            data,
            error,
        } =
            await supabaseClient
                .from(
                    "contact_inquiries",
                )
                .select("*");

        if (error) {
            throw error;
        }

        contactInquiries =
            Array.isArray(data)
                ? data
                : [];


        /*
         * 新しい問い合わせを上へ表示
         */
        contactInquiries.sort(
            (a, b) => {

                const dateA =
                    new Date(
                        getCreatedAt(a)
                        || 0,
                    ).getTime();

                const dateB =
                    new Date(
                        getCreatedAt(b)
                        || 0,
                    ).getTime();

                return dateB - dateA;
            },
        );


        renderContactInquiries();

    } catch (error) {

        console.error(
            "お問い合わせ取得エラー:",
            error,
        );

        contactMessage.textContent =
            error instanceof Error
                ? `お問い合わせを取得できませんでした。 ${error.message}`
                : "お問い合わせを取得できませんでした。";

        contactMessage.className =
            "contact-message error";

        contactMessage.hidden = false;

        contactSummary.textContent =
            "お問い合わせを取得できませんでした。";

    } finally {

        contactLoading.hidden = true;
    }
}


/* ==========================================
   検索
========================================== */

function getFilteredContacts() {

    const keyword =
        contactSearch.value
            .trim()
            .toLowerCase();

    if (!keyword) {
        return contactInquiries;
    }

    return contactInquiries.filter(
        item => {

            const searchableText = [
                getReceptionNo(item),
                getName(item),
                getEmail(item),
                getPhone(item),
                getInquiryType(item),
                getSubject(item),
                getMessageBody(item),
            ]
                .join(" ")
                .toLowerCase();

            return searchableText.includes(
                keyword,
            );
        },
    );
}


/* ==========================================
   一覧表示
========================================== */

function renderContactInquiries() {

    const items =
        getFilteredContacts();

    contactTableBody.innerHTML = "";

    contactSummary.textContent =
        `お問い合わせ件数：${items.length}件`;


    if (
        contactInquiries.length === 0
    ) {

        contactMessage.textContent =
            "現在、お問い合わせ履歴はありません。";

        contactMessage.className =
            "contact-message";

        contactMessage.hidden = false;
        contactTableWrap.hidden = true;

        return;
    }


    if (
        items.length === 0
    ) {

        contactMessage.textContent =
            "検索条件に一致するお問い合わせはありません。";

        contactMessage.className =
            "contact-message";

        contactMessage.hidden = false;
        contactTableWrap.hidden = true;

        return;
    }


    contactMessage.hidden = true;


    items.forEach(
        item => {

            const row =
                document.createElement("tr");

            const receptionNo =
                getReceptionNo(item);

            const name =
                getName(item);

            const type =
                getInquiryType(item);

            const subject =
                getSubject(item);

            const email =
                getEmail(item);

            const createdAt =
                getCreatedAt(item);


            row.innerHTML = `
                <td>
                    ${escapeHtml(
                formatDateTime(
                    createdAt,
                ),
            )}
                </td>

                <td>
                    ${escapeHtml(
                receptionNo || "―",
            )}
                </td>

                <td>
                    ${escapeHtml(
                name || "―",
            )}
                </td>

                <td>
                    ${escapeHtml(
                type || "―",
            )}
                </td>

                <td>
                    ${escapeHtml(
                subject || "―",
            )}
                </td>

                <td>
                    ${escapeHtml(
                email || "―",
            )}
                </td>

                <td>
                    <button
                        type="button"
                        class="contact-detail-button">
                        詳細
                    </button>
                </td>
            `;


            const detailButton =
                row.querySelector(
                    ".contact-detail-button",
                );

            detailButton.addEventListener(
                "click",
                () => {
                    openContactDetail(
                        item,
                    );
                },
            );


            contactTableBody.appendChild(
                row,
            );
        },
    );


    contactTableWrap.hidden = false;
}


/* ==========================================
   詳細表示
========================================== */

function setDetailText(
    elementId,
    value,
) {

    const element =
        document.getElementById(
            elementId,
        );

    if (!element) {
        return;
    }

    element.textContent =
        value || "―";
}


function openContactDetail(item) {

    setDetailText(
        "detail-created-at",
        formatDateTime(
            getCreatedAt(item),
        ),
    );

    setDetailText(
        "detail-reception-no",
        getReceptionNo(item),
    );

    setDetailText(
        "detail-name",
        getName(item),
    );

    setDetailText(
        "detail-email",
        getEmail(item),
    );

    setDetailText(
        "detail-phone",
        getPhone(item),
    );

    setDetailText(
        "detail-type",
        getInquiryType(item),
    );

    setDetailText(
        "detail-subject",
        getSubject(item),
    );

    setDetailText(
        "detail-message",
        getMessageBody(item),
    );


    contactModal.hidden = false;

    document.body.style.overflow =
        "hidden";
}


function closeContactDetail() {

    contactModal.hidden = true;

    document.body.style.overflow =
        "";
}


/* ==========================================
   イベント
========================================== */

contactSearch.addEventListener(
    "input",
    renderContactInquiries,
);


contactRefresh.addEventListener(
    "click",
    loadContactInquiries,
);


contactModalClose.addEventListener(
    "click",
    closeContactDetail,
);


contactModal.addEventListener(
    "click",
    event => {

        if (
            event.target.matches(
                "[data-close-contact-modal]",
            )
        ) {
            closeContactDetail();
        }
    },
);


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
            && !contactModal.hidden
        ) {
            closeContactDetail();
        }
    },
);


/* ==========================================
   初期表示
========================================== */

loadContactInquiries();