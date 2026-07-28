"use strict";

/* ==========================================
   一箕地区ポータル
   LINE登録者管理 Ver1.35 マスター連携

   ・編集モーダルを開くたびに最新マスターを取得
   ・町内会選択で7地区を自動設定
   ・名称と4桁コードを同時に保持
========================================== */

(() => {
    let districts = [];
    let neighborhoods = [];
    let organizations = [];
    let loading = false;

    const byId = id => document.getElementById(id);

    /*
     * Ver1.35 再修正
     * Supabaseから取得したコードが数値・文字列のどちらでも、
     * 0001形式として比較できるように統一します。
     */
    function normalizeCode(value) {
        const digits = String(value ?? "")
            .trim()
            .replace(/[０-９]/g, character =>
                String.fromCharCode(
                    character.charCodeAt(0) - 0xFEE0,
                ),
            )
            .replace(/\D/g, "");

        return digits
            ? digits.padStart(4, "0").slice(-4)
            : "";
    }

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
            const [
                districtRows,
                neighborhoodRows,
                organizationRows,
            ] = await Promise.all([
                fetchRows(
                    "district_master",
                    "code,name,sort_order,is_active",
                ),
                fetchRows(
                    "neighborhood_master",
                    "code,name,district_code,sort_order,is_active",
                ),
                fetchRows(
                    "organization_master",
                    "code,name,sort_order,is_active",
                ),
            ]);

            districts = districtRows.map(row => ({
                ...row,
                code: normalizeCode(row.code),
            }));

            neighborhoods = neighborhoodRows.map(row => ({
                ...row,
                code: normalizeCode(row.code),
                district_code:
                    normalizeCode(row.district_code),
            }));

            organizations = organizationRows.map(row => ({
                ...row,
                code: normalizeCode(row.code),
            }));
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
        select.value = element.value || "";
        select.dataset.masterCode =
            element.dataset.masterCode || "";

        element.replaceWith(select);

        return select;
    }

    function addOption(
        select,
        value,
        text,
        code = "",
        selected = false,
    ) {
        const option = document.createElement("option");

        option.value = value ?? "";
        option.textContent = text;
        option.dataset.code = code ?? "";
        option.selected = selected;

        select.appendChild(option);
    }

    function keepExisting(select, value, code = "") {
        if (!value) {
            select.value = "";
            select.dataset.masterCode = "";
            return;
        }

        const option =
            [...select.options].find(
                item => item.value === value,
            );

        if (!option) {
            addOption(
                select,
                value,
                `${value}（既存データ）`,
                code,
                true,
            );
        } else {
            select.value = value;
        }

        const selectedOption =
            select.options[select.selectedIndex];

        select.dataset.masterCode =
            selectedOption?.dataset.code
            || code
            || "";
    }

    function setSelectedCode(select) {
        if (!select) return;

        const selectedOption =
            select.options[select.selectedIndex];

        select.dataset.masterCode =
            selectedOption?.dataset.code || "";
    }

    function fillControls() {
        const currentNeighborhood =
            byId("edit-neighborhood-name");

        const currentDistrict =
            byId("edit-district-group");

        const currentOrganization =
            byId("edit-organization-name");

        const oldNeighborhood =
            currentNeighborhood?.value ?? "";

        const oldDistrict =
            currentDistrict?.value ?? "";

        const oldOrganization =
            currentOrganization?.value ?? "";

        const oldNeighborhoodCode =
            currentNeighborhood?.dataset.masterCode ?? "";

        const oldDistrictCode =
            currentDistrict?.dataset.masterCode ?? "";

        const oldOrganizationCode =
            currentOrganization?.dataset.masterCode ?? "";

        const n = toSelect(currentNeighborhood);
        const d = toSelect(currentDistrict);
        const o = toSelect(currentOrganization);

        if (n) {
            n.innerHTML = "";

            addOption(
                n,
                "",
                neighborhoods.length
                    ? "町内会を選択してください"
                    : "町内会マスターは未登録です",
            );

            neighborhoods.forEach(row => {
                addOption(
                    n,
                    row.name,
                    row.name,
                    row.code,
                );
            });

            keepExisting(
                n,
                oldNeighborhood,
                oldNeighborhoodCode,
            );
        }

        if (d) {
            d.innerHTML = "";

            addOption(
                d,
                "",
                "町内会を選択すると自動設定されます",
            );

            districts.forEach(row => {
                addOption(
                    d,
                    row.name,
                    row.name,
                    row.code,
                );
            });

            keepExisting(
                d,
                oldDistrict,
                oldDistrictCode,
            );

            d.disabled = true;
        }

        if (o) {
            o.innerHTML = "";

            addOption(
                o,
                "",
                organizations.length
                    ? "所属団体を選択してください"
                    : "所属団体マスターは未登録です",
            );

            organizations.forEach(row => {
                addOption(
                    o,
                    row.name,
                    row.name,
                    row.code,
                );
            });

            keepExisting(
                o,
                oldOrganization,
                oldOrganizationCode,
            );
        }

        function syncDistrictFromNeighborhood() {
            if (!n || !d) return;

            const neighborhood =
                neighborhoods.find(
                    row =>
                        String(row.name ?? "").trim()
                        === String(n.value ?? "").trim(),
                );

            const district =
                districts.find(
                    row =>
                        normalizeCode(row.code)
                        === normalizeCode(
                            neighborhood?.district_code,
                        ),
                );

            setSelectedCode(n);

            d.value = district?.name ?? "";
            d.dataset.masterCode =
                normalizeCode(district?.code);

            if (neighborhood && !district) {
                console.warn(
                    "7地区を照合できません。",
                    {
                        neighborhood:
                            neighborhood.name,
                        neighborhoodDistrictCode:
                            neighborhood.district_code,
                        districtCodes:
                            districts.map(row => row.code),
                    },
                );
            }
        }

        if (
            n
            && n.dataset.masterChangeInstalled !== "true"
        ) {
            n.addEventListener(
                "change",
                syncDistrictFromNeighborhood,
            );

            n.dataset.masterChangeInstalled = "true";
        }

        if (
            o
            && o.dataset.masterChangeInstalled !== "true"
        ) {
            o.addEventListener("change", () => {
                setSelectedCode(o);
            });

            o.dataset.masterChangeInstalled = "true";
        }

        /*
         * Ver1.35 修正
         * 編集画面を開いた直後にも、選択済み町内会から
         * 7地区を自動表示します。
         */
        if (n?.value) {
            syncDistrictFromNeighborhood();
        }
    }

    window.getLineUserMasterCodes = function () {
        return {
            neighborhood_code:
                byId("edit-neighborhood-name")
                    ?.dataset.masterCode || null,

            district_code:
                byId("edit-district-group")
                    ?.dataset.masterCode || null,

            organization_code:
                byId("edit-organization-name")
                    ?.dataset.masterCode || null,
        };
    };

    async function refreshForModal() {
        try {
            await loadMasters();
            fillControls();
        } catch (error) {
            console.error(
                "Ver1.35 master linkage error:",
                error,
            );
        }
    }

    function observeModal() {
        const modal = byId("user-edit-modal");

        if (!modal) return;

        const observer =
            new MutationObserver(() => {
                if (!modal.hidden) {
                    setTimeout(refreshForModal, 0);
                }
            });

        observer.observe(
            modal,
            {
                attributes: true,
                attributeFilter: ["hidden"],
            },
        );
    }

    async function init() {
        await refreshForModal();
        observeModal();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true },
        );
    } else {
        init();
    }
})();
