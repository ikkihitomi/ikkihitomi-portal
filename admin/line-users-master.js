"use strict";

/* ==========================================
   一箕地区ポータル
   LINE登録者管理 Ver1.33

   マスター連携アドオン
   ・町内会マスターをプルダウン表示
   ・町内会選択時に7地区を自動設定
   ・所属団体マスターをプルダウン表示
   ・マスター未登録時も既存値を保持
========================================== */

(() => {
    const MASTER_TABLES = {
        districts: "district_master",
        neighborhoods: "neighborhood_master",
        organizations: "organization_master",
    };

    let districtMasters = [];
    let neighborhoodMasters = [];
    let organizationMasters = [];
    let mastersLoaded = false;

    function getElement(id) {
        return document.getElementById(id);
    }

    function createSelectFromInput(input, options = {}) {
        if (!input) {
            return null;
        }

        if (input.tagName === "SELECT") {
            return input;
        }

        const select = document.createElement("select");

        for (const attribute of input.attributes) {
            if (attribute.name === "type" || attribute.name === "value") {
                continue;
            }
            select.setAttribute(attribute.name, attribute.value);
        }

        select.className = input.className;
        select.required = input.required;
        select.disabled = input.disabled;

        if (options.readOnly === true) {
            select.setAttribute("aria-readonly", "true");
            select.dataset.readOnly = "true";
        }

        input.replaceWith(select);
        return select;
    }

    function addOption(select, value, label, selected = false) {
        const option = document.createElement("option");
        option.value = value ?? "";
        option.textContent = label ?? "";
        option.selected = selected;
        select.appendChild(option);
    }

    function sortMasters(rows) {
        return [...rows].sort((a, b) => {
            const orderA = Number(a.sort_order ?? 0);
            const orderB = Number(b.sort_order ?? 0);

            if (orderA !== orderB) {
                return orderA - orderB;
            }

            return String(a.name ?? "").localeCompare(
                String(b.name ?? ""),
                "ja",
            );
        });
    }

    async function fetchMaster(table, columns) {
        const { data, error } = await supabaseClient
            .from(table)
            .select(columns)
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });

        if (error) {
            throw error;
        }

        return Array.isArray(data) ? data : [];
    }

    async function loadMasters() {
        const [districts, neighborhoods, organizations] =
            await Promise.all([
                fetchMaster(
                    MASTER_TABLES.districts,
                    "code,name,sort_order,is_active",
                ),
                fetchMaster(
                    MASTER_TABLES.neighborhoods,
                    "code,name,district_code,sort_order,is_active",
                ),
                fetchMaster(
                    MASTER_TABLES.organizations,
                    "code,name,sort_order,is_active",
                ),
            ]);

        districtMasters = sortMasters(districts);
        neighborhoodMasters = sortMasters(neighborhoods);
        organizationMasters = sortMasters(organizations);
        mastersLoaded = true;
    }

    function preserveExistingValue(select, currentValue) {
        if (!currentValue) {
            return;
        }

        const exists = [...select.options].some(
            option => option.value === currentValue,
        );

        if (!exists) {
            addOption(
                select,
                currentValue,
                `${currentValue}（既存データ）`,
                true,
            );
        } else {
            select.value = currentValue;
        }
    }

    function populateDistrictSelect(currentValue = "") {
        const input = getElement("edit-district-group");
        const select = createSelectFromInput(input, { readOnly: true });

        if (!select) {
            return null;
        }

        select.innerHTML = "";
        addOption(select, "", "町内会を選択すると自動設定されます");

        for (const district of districtMasters) {
            addOption(select, district.name, district.name);
        }

        preserveExistingValue(select, currentValue);
        return select;
    }

    function populateNeighborhoodSelect(currentValue = "") {
        const input = getElement("edit-neighborhood-name");
        const select = createSelectFromInput(input);

        if (!select) {
            return null;
        }

        select.innerHTML = "";
        addOption(
            select,
            "",
            neighborhoodMasters.length > 0
                ? "町内会を選択してください"
                : "町内会マスターは未登録です",
        );

        for (const neighborhood of neighborhoodMasters) {
            addOption(
                select,
                neighborhood.name,
                neighborhood.name,
            );
        }

        preserveExistingValue(select, currentValue);
        return select;
    }

    function populateOrganizationSelect(currentValue = "") {
        const input = getElement("edit-organization-name");
        const select = createSelectFromInput(input);

        if (!select) {
            return null;
        }

        select.innerHTML = "";
        addOption(
            select,
            "",
            organizationMasters.length > 0
                ? "所属団体を選択してください"
                : "所属団体マスターは未登録です",
        );

        for (const organization of organizationMasters) {
            addOption(
                select,
                organization.name,
                organization.name,
            );
        }

        preserveExistingValue(select, currentValue);
        return select;
    }

    function findDistrictNameByNeighborhood(neighborhoodName) {
        const neighborhood = neighborhoodMasters.find(
            item => item.name === neighborhoodName,
        );

        if (!neighborhood?.district_code) {
            return "";
        }

        const district = districtMasters.find(
            item => item.code === neighborhood.district_code,
        );

        return district?.name ?? "";
    }

    function updateDistrictFromNeighborhood() {
        const neighborhoodSelect =
            getElement("edit-neighborhood-name");
        const districtSelect =
            getElement("edit-district-group");

        if (!neighborhoodSelect || !districtSelect) {
            return;
        }

        const districtName =
            findDistrictNameByNeighborhood(neighborhoodSelect.value);

        districtSelect.value = districtName;

        if (
            districtName
            && districtSelect.value !== districtName
        ) {
            addOption(
                districtSelect,
                districtName,
                districtName,
                true,
            );
        }

        districtSelect.dispatchEvent(
            new Event("change", { bubbles: true }),
        );
    }

    function installChangeHandlers() {
        const neighborhoodSelect =
            getElement("edit-neighborhood-name");

        if (
            !neighborhoodSelect
            || neighborhoodSelect.dataset.masterHandlerInstalled === "true"
        ) {
            return;
        }

        neighborhoodSelect.addEventListener(
            "change",
            updateDistrictFromNeighborhood,
        );

        neighborhoodSelect.dataset.masterHandlerInstalled = "true";
    }

    function refreshEditControls() {
        const currentNeighborhood =
            getElement("edit-neighborhood-name")?.value ?? "";
        const currentDistrict =
            getElement("edit-district-group")?.value ?? "";
        const currentOrganization =
            getElement("edit-organization-name")?.value ?? "";

        populateNeighborhoodSelect(currentNeighborhood);
        populateDistrictSelect(currentDistrict);
        populateOrganizationSelect(currentOrganization);
        installChangeHandlers();
    }

    function observeEditModal() {
        const modal = getElement("user-edit-modal");

        if (!modal) {
            return;
        }

        const observer = new MutationObserver(() => {
            if (modal.hidden) {
                return;
            }

            refreshEditControls();

            const neighborhoodValue =
                getElement("edit-neighborhood-name")?.value ?? "";
            const districtValue =
                getElement("edit-district-group")?.value ?? "";

            if (neighborhoodValue && !districtValue) {
                updateDistrictFromNeighborhood();
            }
        });

        observer.observe(modal, {
            attributes: true,
            attributeFilter: ["hidden"],
        });
    }

    async function initializeMasterAddon() {
        try {
            await loadMasters();
            refreshEditControls();
            observeEditModal();

            console.info(
                "Ver1.33 master addon loaded:",
                {
                    districts: districtMasters.length,
                    neighborhoods: neighborhoodMasters.length,
                    organizations: organizationMasters.length,
                },
            );
        } catch (error) {
            console.error(
                "Ver1.33 master load error:",
                error,
            );

            /*
             * マスター読込に失敗しても、
             * Ver1.32の自由入力機能はそのまま利用できます。
             */
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeMasterAddon,
            { once: true },
        );
    } else {
        initializeMasterAddon();
    }
})();
