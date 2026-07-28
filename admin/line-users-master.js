"use strict";

/* LINE登録者管理 Ver1.34 マスター連携
   編集モーダルを開くたびに最新マスターを再取得します。 */

(() => {
    let districts = [];
    let neighborhoods = [];
    let organizations = [];
    let loading = false;

    const byId = id => document.getElementById(id);

    async function fetchRows(table, columns) {
        const { data, error } = await supabaseClient
            .from(table)
            .select(columns)
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });
        if (error) throw error;
        return data ?? [];
    }

    async function loadMasters() {
        if (loading) return;
        loading = true;
        try {
            [districts, neighborhoods, organizations] = await Promise.all([
                fetchRows("district_master", "code,name,sort_order,is_active"),
                fetchRows("neighborhood_master", "code,name,district_code,sort_order,is_active"),
                fetchRows("organization_master", "code,name,sort_order,is_active"),
            ]);
        } finally {
            loading = false;
        }
    }

    function toSelect(element) {
        if (!element) return null;
        if (element.tagName === "SELECT") return element;
        const select = document.createElement("select");
        [...element.attributes].forEach(attr => {
            if (!["type", "value"].includes(attr.name)) {
                select.setAttribute(attr.name, attr.value);
            }
        });
        select.className = element.className;
        element.replaceWith(select);
        return select;
    }

    function addOption(select, value, text, selected = false) {
        const option = document.createElement("option");
        option.value = value ?? "";
        option.textContent = text;
        option.selected = selected;
        select.appendChild(option);
    }

    function keepExisting(select, value) {
        if (!value) return;
        if (![...select.options].some(option => option.value === value)) {
            addOption(select, value, `${value}（既存データ）`, true);
        } else {
            select.value = value;
        }
    }

    function fillControls() {
        const oldNeighborhood = byId("edit-neighborhood-name")?.value ?? "";
        const oldDistrict = byId("edit-district-group")?.value ?? "";
        const oldOrganization = byId("edit-organization-name")?.value ?? "";

        const n = toSelect(byId("edit-neighborhood-name"));
        const d = toSelect(byId("edit-district-group"));
        const o = toSelect(byId("edit-organization-name"));

        if (n) {
            n.innerHTML = "";
            addOption(n, "", neighborhoods.length ? "町内会を選択してください" : "町内会マスターは未登録です");
            neighborhoods.forEach(row => addOption(n, row.name, row.name));
            keepExisting(n, oldNeighborhood);
        }

        if (d) {
            d.innerHTML = "";
            addOption(d, "", "町内会を選択すると自動設定されます");
            districts.forEach(row => addOption(d, row.name, row.name));
            keepExisting(d, oldDistrict);
        }

        if (o) {
            o.innerHTML = "";
            addOption(o, "", organizations.length ? "所属団体を選択してください" : "所属団体マスターは未登録です");
            organizations.forEach(row => addOption(o, row.name, row.name));
            keepExisting(o, oldOrganization);
        }

        if (n && n.dataset.masterChangeInstalled !== "true") {
            n.addEventListener("change", () => {
                const neighborhood = neighborhoods.find(row => row.name === n.value);
                const district = districts.find(row => row.code === neighborhood?.district_code);
                if (d) d.value = district?.name ?? "";
            });
            n.dataset.masterChangeInstalled = "true";
        }
    }

    async function refreshForModal() {
        try {
            await loadMasters();
            fillControls();
        } catch (error) {
            console.error("Ver1.34 master linkage error:", error);
        }
    }

    function observeModal() {
        const modal = byId("user-edit-modal");
        if (!modal) return;
        const observer = new MutationObserver(() => {
            if (!modal.hidden) {
                setTimeout(refreshForModal, 0);
            }
        });
        observer.observe(modal, { attributes: true, attributeFilter: ["hidden"] });
    }

    async function init() {
        await refreshForModal();
        observeModal();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
