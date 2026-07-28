"use strict";

/*
 * 一箕地区ポータル Ver1.35
 * LINE登録者編集画面 マスターコード連携
 *
 * 前提ID
 * edit-neighborhood-name
 * edit-district-group
 * edit-organization-name
 *
 * line-users.js と line-users-master.js の後に読み込みます。
 */

(() => {
    let masters = {
        districts: [],
        neighborhoods: [],
        organizations: [],
    };

    const byId = id => document.getElementById(id);

    async function loadMasters() {
        const [districtResult, neighborhoodResult, organizationResult] =
            await Promise.all([
                supabaseClient
                    .from("district_master")
                    .select("code,name,sort_order,is_active")
                    .eq("is_active", true)
                    .order("sort_order")
                    .order("name"),
                supabaseClient
                    .from("neighborhood_master")
                    .select("code,name,district_code,sort_order,is_active")
                    .eq("is_active", true)
                    .order("sort_order")
                    .order("name"),
                supabaseClient
                    .from("organization_master")
                    .select("code,name,sort_order,is_active")
                    .eq("is_active", true)
                    .order("sort_order")
                    .order("name"),
            ]);

        const error =
            districtResult.error ||
            neighborhoodResult.error ||
            organizationResult.error;

        if (error) throw error;

        masters = {
            districts: districtResult.data ?? [],
            neighborhoods: neighborhoodResult.data ?? [],
            organizations: organizationResult.data ?? [],
        };
    }

    function setDatasetCode(select, code) {
        if (select) select.dataset.masterCode = code ?? "";
    }

    function installEvents() {
        const neighborhoodSelect = byId("edit-neighborhood-name");
        const districtSelect = byId("edit-district-group");
        const organizationSelect = byId("edit-organization-name");

        if (neighborhoodSelect &&
            neighborhoodSelect.dataset.v135Installed !== "true") {
            neighborhoodSelect.addEventListener("change", () => {
                const neighborhood = masters.neighborhoods.find(
                    row => row.name === neighborhoodSelect.value
                );
                const district = masters.districts.find(
                    row => row.code === neighborhood?.district_code
                );

                setDatasetCode(
                    neighborhoodSelect,
                    neighborhood?.code ?? ""
                );

                if (districtSelect) {
                    districtSelect.value = district?.name ?? "";
                    setDatasetCode(
                        districtSelect,
                        district?.code ?? ""
                    );
                }
            });

            neighborhoodSelect.dataset.v135Installed = "true";
        }

        if (organizationSelect &&
            organizationSelect.dataset.v135Installed !== "true") {
            organizationSelect.addEventListener("change", () => {
                const organization = masters.organizations.find(
                    row => row.name === organizationSelect.value
                );
                setDatasetCode(
                    organizationSelect,
                    organization?.code ?? ""
                );
            });

            organizationSelect.dataset.v135Installed = "true";
        }
    }

    /*
     * line-users.js の保存payload作成時に利用できます。
     *
     * 例:
     * const masterCodes = window.getLineUserMasterCodes();
     * payload = { ...payload, ...masterCodes };
     */
    window.getLineUserMasterCodes = function () {
        return {
            neighborhood_code:
                byId("edit-neighborhood-name")?.dataset.masterCode || null,
            district_code:
                byId("edit-district-group")?.dataset.masterCode || null,
            organization_code:
                byId("edit-organization-name")?.dataset.masterCode || null,
        };
    };

    async function refresh() {
        try {
            await loadMasters();
            installEvents();
        } catch (error) {
            console.error("Ver1.35 master relation error:", error);
        }
    }

    function observeModal() {
        const modal = byId("user-edit-modal");
        if (!modal) return;

        const observer = new MutationObserver(() => {
            if (!modal.hidden) {
                setTimeout(refresh, 0);
            }
        });

        observer.observe(modal, {
            attributes: true,
            attributeFilter: ["hidden"],
        });
    }

    async function init() {
        await refresh();
        observeModal();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
