"use strict";

/* ==========================================
   一箕地区ポータル Ver1.40
   LINE登録者管理 マスター完全連携

   ・地区フィルターをdistrict_masterから生成
   ・町内会をneighborhood_masterから生成
   ・町内会選択時に地区を自動設定
   ・所属団体をorganization_masterから生成
   ・名称と4桁コードを同時保存
========================================== */

(() => {
    const MASTER_TABLES = {
        districts: "district_master",
        neighborhoods: "neighborhood_master",
        organizations: "organization_master",
    };

    const state = {
        districts: [],
        neighborhoods: [],
        organizations: [],
        loaded: false,
    };

    function getElement(id) {
        return document.getElementById(id);
    }

    /*
     * HTML側では町内会・所属団体が input の場合があります。
     * マスター連携では option を扱うため、必要に応じて select へ置き換えます。
     *
     * line-users.js 側は編集時に現在の要素を取り直す実装なので、
     * ここで安全に置き換えできます。
     */
    function ensureSelectElement(id) {
        const current =
            getElement(id);

        if (!current) {
            return null;
        }

        if (
            current.tagName
            && current.tagName.toLowerCase() === "select"
        ) {
            return current;
        }

        const select =
            document.createElement("select");

        /*
         * id / class / aria 等を引き継ぎます。
         * input 固有の type / value は除外します。
         */
        for (const attribute of current.attributes) {
            if (
                attribute.name === "type"
                || attribute.name === "value"
            ) {
                continue;
            }

            select.setAttribute(
                attribute.name,
                attribute.value,
            );
        }

        const currentValue =
            current.value || "";

        select.dataset.initialValue =
            currentValue;

        current.replaceWith(select);

        return select;
    }


    function ensureMasterSelects() {
        ensureSelectElement(
            "edit-neighborhood-name",
        );

        ensureSelectElement(
            "edit-district-group",
        );

        ensureSelectElement(
            "edit-organization-name",
        );
    }

    function addOption(
        select,
        value,
        label,
        dataset = {},
    ) {
        const option = document.createElement("option");
        option.value = value ?? "";
        option.textContent = label ?? "";

        Object.entries(dataset).forEach(
            ([key, dataValue]) => {
                option.dataset[key] =
                    String(dataValue ?? "");
            },
        );

        select.appendChild(option);
        return option;
    }

    function sortMasters(rows) {
        return [...rows].sort((a, b) => {
            const orderA = Number(a.sort_order ?? 0);
            const orderB = Number(b.sort_order ?? 0);

            if (orderA !== orderB) {
                return orderA - orderB;
            }

            return String(a.name ?? "")
                .localeCompare(
                    String(b.name ?? ""),
                    "ja",
                );
        });
    }

    async function fetchMaster(
        table,
        columns,
    ) {
        const { data, error } =
            await supabaseClient
                .from(table)
                .select(columns)
                .eq("is_active", true)
                .order("sort_order", {
                    ascending: true,
                })
                .order("name", {
                    ascending: true,
                });

        if (error) {
            throw error;
        }

        return Array.isArray(data)
            ? data
            : [];
    }

    async function loadMasters() {
        const [
            districts,
            neighborhoods,
            organizations,
        ] = await Promise.all([
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

        state.districts =
            sortMasters(districts);

        state.neighborhoods =
            sortMasters(neighborhoods);

        state.organizations =
            sortMasters(organizations);

        state.loaded = true;
    }

    function preserveExistingValue(
        select,
        currentValue,
    ) {
        if (!currentValue) {
            return;
        }

        const exists =
            [...select.options].some(
                option =>
                    option.value === currentValue,
            );

        if (!exists) {
            addOption(
                select,
                currentValue,
                `${currentValue}（既存データ）`,
                {
                    legacy: "true",
                },
            );
        }

        select.value = currentValue;
    }

    function populateDistrictFilter() {
        const select =
            getElement("district-filter");

        if (!select) {
            return;
        }

        const currentValue =
            select.value
            || select.dataset.initialValue
            || "";

        delete select.dataset.initialValue;

        select.innerHTML = "";

        addOption(
            select,
            "",
            "すべて",
        );

        addOption(
            select,
            "未設定",
            "未設定",
        );

        state.districts.forEach(
            district => {
                addOption(
                    select,
                    district.name,
                    district.name,
                    {
                        code:
                            district.code,
                    },
                );
            },
        );

        preserveExistingValue(
            select,
            currentValue,
        );

        select.disabled = false;
    }

    function populateNeighborhoodSelect(
        currentValue = "",
    ) {
        const select =
            ensureSelectElement(
                "edit-neighborhood-name",
            );

        if (!select) {
            return;
        }

        currentValue =
            currentValue
            || select.dataset.initialValue
            || "";

        delete select.dataset.initialValue;

        select.innerHTML = "";

        addOption(
            select,
            "",
            state.neighborhoods.length > 0
                ? "町内会を選択してください"
                : "町内会マスターは未登録です",
        );

        state.neighborhoods.forEach(
            neighborhood => {
                addOption(
                    select,
                    neighborhood.name,
                    neighborhood.name,
                    {
                        code:
                            neighborhood.code,
                        districtCode:
                            neighborhood.district_code,
                    },
                );
            },
        );

        preserveExistingValue(
            select,
            currentValue,
        );

        select.disabled =
            state.neighborhoods.length === 0;
    }

    function populateDistrictSelect(
        currentValue = "",
    ) {
        const select =
            ensureSelectElement(
                "edit-district-group",
            );

        if (!select) {
            return;
        }

        currentValue =
            currentValue
            || select.dataset.initialValue
            || "";

        delete select.dataset.initialValue;

        select.innerHTML = "";

        addOption(
            select,
            "",
            "町内会を選択すると自動設定されます",
        );

        state.districts.forEach(
            district => {
                addOption(
                    select,
                    district.name,
                    district.name,
                    {
                        code:
                            district.code,
                    },
                );
            },
        );

        preserveExistingValue(
            select,
            currentValue,
        );

        select.disabled = false;
        select.dataset.readOnly = "true";
    }

    function populateOrganizationSelect(
        currentValue = "",
    ) {
        const select =
            ensureSelectElement(
                "edit-organization-name",
            );

        if (!select) {
            return;
        }

        currentValue =
            currentValue
            || select.dataset.initialValue
            || "";

        delete select.dataset.initialValue;

        select.innerHTML = "";

        addOption(
            select,
            "",
            state.organizations.length > 0
                ? "所属団体を選択してください"
                : "所属団体マスターは未登録です",
        );

        state.organizations.forEach(
            organization => {
                addOption(
                    select,
                    organization.name,
                    organization.name,
                    {
                        code:
                            organization.code,
                    },
                );
            },
        );

        preserveExistingValue(
            select,
            currentValue,
        );

        select.disabled =
            state.organizations.length === 0;
    }

    function findDistrictByCode(
        districtCode,
    ) {
        return state.districts.find(
            district =>
                String(district.code)
                === String(districtCode),
        );
    }

    function updateDistrictFromNeighborhood() {
        const neighborhoodSelect =
            getElement(
                "edit-neighborhood-name",
            );

        const districtSelect =
            getElement(
                "edit-district-group",
            );

        if (
            !neighborhoodSelect
            || !districtSelect
        ) {
            return;
        }

        const selectedOption =
            neighborhoodSelect.options[
            neighborhoodSelect.selectedIndex
            ];

        const districtCode =
            selectedOption?.dataset
                ?.districtCode || "";

        const district =
            findDistrictByCode(
                districtCode,
            );

        districtSelect.value =
            district?.name || "";

        districtSelect.dataset.masterCode =
            district?.code || "";
    }

    function updateMasterCodeDatasets() {
        const neighborhoodSelect =
            getElement(
                "edit-neighborhood-name",
            );

        const districtSelect =
            getElement(
                "edit-district-group",
            );

        const organizationSelect =
            getElement(
                "edit-organization-name",
            );

        if (neighborhoodSelect) {
            const option =
                neighborhoodSelect.options[
                neighborhoodSelect.selectedIndex
                ];

            neighborhoodSelect.dataset.masterCode =
                option?.dataset?.code || "";
        }

        if (districtSelect) {
            const option =
                districtSelect.options[
                districtSelect.selectedIndex
                ];

            districtSelect.dataset.masterCode =
                option?.dataset?.code
                || districtSelect.dataset.masterCode
                || "";
        }

        if (organizationSelect) {
            const option =
                organizationSelect.options[
                organizationSelect.selectedIndex
                ];

            organizationSelect.dataset.masterCode =
                option?.dataset?.code || "";
        }
    }

    function refreshEditControls() {
        const neighborhoodSelect =
            getElement(
                "edit-neighborhood-name",
            );

        const districtSelect =
            getElement(
                "edit-district-group",
            );

        const organizationSelect =
            getElement(
                "edit-organization-name",
            );

        const currentNeighborhood =
            neighborhoodSelect?.value || "";

        const currentDistrict =
            districtSelect?.value || "";

        const currentOrganization =
            organizationSelect?.value || "";

        populateNeighborhoodSelect(
            currentNeighborhood,
        );

        populateDistrictSelect(
            currentDistrict,
        );

        populateOrganizationSelect(
            currentOrganization,
        );

        updateMasterCodeDatasets();
    }

    function installHandlers() {
        const neighborhoodSelect =
            getElement(
                "edit-neighborhood-name",
            );

        const organizationSelect =
            getElement(
                "edit-organization-name",
            );

        if (
            neighborhoodSelect
            && neighborhoodSelect.dataset
                .masterHandlerInstalled
            !== "true"
        ) {
            neighborhoodSelect.addEventListener(
                "change",
                () => {
                    updateDistrictFromNeighborhood();
                    updateMasterCodeDatasets();
                },
            );

            neighborhoodSelect.dataset
                .masterHandlerInstalled =
                "true";
        }

        if (
            organizationSelect
            && organizationSelect.dataset
                .masterHandlerInstalled
            !== "true"
        ) {
            organizationSelect.addEventListener(
                "change",
                updateMasterCodeDatasets,
            );

            organizationSelect.dataset
                .masterHandlerInstalled =
                "true";
        }
    }

    function observeEditModal() {
        const modal =
            getElement("user-edit-modal");

        if (!modal) {
            return;
        }

        const observer =
            new MutationObserver(() => {
                if (modal.hidden) {
                    return;
                }

                window.setTimeout(
                    () => {
                        refreshEditControls();
                        installHandlers();

                        const neighborhoodSelect =
                            getElement(
                                "edit-neighborhood-name",
                            );

                        const districtSelect =
                            getElement(
                                "edit-district-group",
                            );

                        if (
                            neighborhoodSelect?.value
                            && !districtSelect?.value
                        ) {
                            updateDistrictFromNeighborhood();
                        }

                        updateMasterCodeDatasets();
                    },
                    0,
                );
            });

        observer.observe(
            modal,
            {
                attributes: true,
                attributeFilter: [
                    "hidden",
                ],
            },
        );
    }

    window.getLineUserMasterCodes =
        function getLineUserMasterCodes() {
            updateMasterCodeDatasets();

            return {
                neighborhood_code:
                    getElement(
                        "edit-neighborhood-name",
                    )?.dataset
                        ?.masterCode
                    || null,

                district_code:
                    getElement(
                        "edit-district-group",
                    )?.dataset
                        ?.masterCode
                    || null,

                organization_code:
                    getElement(
                        "edit-organization-name",
                    )?.dataset
                        ?.masterCode
                    || null,
            };
        };

    async function initializeMasterAddon() {
        try {
            ensureMasterSelects();

            await loadMasters();

            populateDistrictFilter();
            refreshEditControls();
            installHandlers();
            observeEditModal();

            console.info(
                "Ver1.40 master addon loaded:",
                {
                    districts:
                        state.districts.length,
                    neighborhoods:
                        state.neighborhoods.length,
                    organizations:
                        state.organizations.length,
                },
            );
        } catch (error) {
            console.error(
                "Ver1.40 master load error:",
                error,
            );

            const districtFilter =
                getElement(
                    "district-filter",
                );

            if (districtFilter) {
                districtFilter.innerHTML = "";
                addOption(
                    districtFilter,
                    "",
                    "地区マスターを取得できません",
                );
                districtFilter.disabled = true;
            }
        }
    }

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initializeMasterAddon,
            {
                once: true,
            },
        );
    } else {
        initializeMasterAddon();
    }
})();
