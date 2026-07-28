"use strict";

/*
 * Ver1.35 マスターコード補助
 * master-management.js の後に読み込んでください。
 *
 * 機能
 * - 全角数字を半角へ変換
 * - 4桁ゼロ埋め
 * - 数字以外を除去
 * - 次の未使用コードを自動提案
 */

(() => {
    const MASTER_TABLES = {
        district: "district_master",
        neighborhood: "neighborhood_master",
        organization: "organization_master",
    };

    function normalizeDigits(value) {
        return String(value ?? "")
            .replace(/[０-９]/g, ch =>
                String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
            )
            .replace(/\D/g, "")
            .slice(0, 4)
            .padStart(4, "0");
    }

    async function suggestNextCode() {
        const activeTab = document.querySelector(".tab-button.is-active");
        const masterKey = activeTab?.dataset.master;
        const table = MASTER_TABLES[masterKey];
        const codeInput = document.getElementById("edit-code");

        if (!table || !codeInput || codeInput.value.trim()) return;

        const { data, error } = await supabaseClient
            .from(table)
            .select("code")
            .order("code", { ascending: false })
            .limit(200);

        if (error) {
            console.error("Ver1.35 code suggestion error:", error);
            return;
        }

        const used = new Set((data ?? []).map(row => row.code));
        let next = 1;
        while (used.has(String(next).padStart(4, "0"))) next += 1;
        codeInput.value = String(next).padStart(4, "0");
    }

    function installCodeInput() {
        const codeInput = document.getElementById("edit-code");
        if (!codeInput || codeInput.dataset.v135Installed === "true") return;

        codeInput.inputMode = "numeric";
        codeInput.pattern = "[0-9]{4}";
        codeInput.maxLength = 4;
        codeInput.placeholder = "0001";

        codeInput.addEventListener("blur", () => {
            if (!codeInput.value.trim()) return;
            codeInput.value = normalizeDigits(codeInput.value);
        });

        codeInput.dataset.v135Installed = "true";
    }

    function observeModal() {
        const modal = document.getElementById("edit-modal");
        if (!modal) return;

        const observer = new MutationObserver(() => {
            if (!modal.hidden) {
                installCodeInput();
                setTimeout(suggestNextCode, 0);
            }
        });

        observer.observe(modal, {
            attributes: true,
            attributeFilter: ["hidden"],
        });
    }

    function init() {
        installCodeInput();
        observeModal();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
