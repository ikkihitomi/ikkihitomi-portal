"use strict";

/* ==========================================
   一箕地区ポータル
   マスター管理 Ver1.33
========================================== */

(() => {
    const CONFIG = {
        district: {
            table: "district_master",
            label: "地区",
            csvName: "district_master.csv",
            columns: ["code", "name", "sort_order", "is_active"],
        },
        neighborhood: {
            table: "neighborhood_master",
            label: "町内会",
            csvName: "neighborhood_master.csv",
            columns: [
                "code",
                "name",
                "district_code",
                "sort_order",
                "is_active",
            ],
        },
        organization: {
            table: "organization_master",
            label: "所属団体",
            csvName: "organization_master.csv",
            columns: ["code", "name", "sort_order", "is_active"],
        },
    };

    let activeMaster = "district";
    let rows = [];
    let districtRows = [];

    const elements = {};

    function cacheElements() {
        elements.tabs = [...document.querySelectorAll(".tab-button")];
        elements.addButton = document.getElementById("add-button");
        elements.csvFileInput = document.getElementById("csv-file-input");
        elements.csvExportButton =
            document.getElementById("csv-export-button");
        elements.search = document.getElementById("master-search");
        elements.activeFilter =
            document.getElementById("active-filter");
        elements.message = document.getElementById("page-message");
        elements.tableHead =
            document.getElementById("master-table-head");
        elements.tableBody =
            document.getElementById("master-table-body");

        elements.modal = document.getElementById("edit-modal");
        elements.modalTitle = document.getElementById("modal-title");
        elements.form = document.getElementById("master-form");
        elements.editId = document.getElementById("edit-id");
        elements.editCode = document.getElementById("edit-code");
        elements.editName = document.getElementById("edit-name");
        elements.districtField =
            document.getElementById("district-code-field");
        elements.editDistrictCode =
            document.getElementById("edit-district-code");
        elements.editSortOrder =
            document.getElementById("edit-sort-order");
        elements.editIsActive =
            document.getElementById("edit-is-active");
        elements.formMessage =
            document.getElementById("form-message");
        elements.saveButton = document.getElementById("save-button");

        elements.districtCount =
            document.getElementById("district-count");
        elements.neighborhoodCount =
            document.getElementById("neighborhood-count");
        elements.organizationCount =
            document.getElementById("organization-count");
    }

    function setMessage(text = "", isError = false) {
        elements.message.textContent = text;
        elements.message.classList.toggle("is-error", isError);
    }

    function setFormMessage(text = "", isError = false) {
        elements.formMessage.textContent = text;
        elements.formMessage.classList.toggle("is-error", isError);
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function currentConfig() {
        return CONFIG[activeMaster];
    }

    async function fetchRows(masterKey) {
        const config = CONFIG[masterKey];

        const { data, error } = await supabaseClient
            .from(config.table)
            .select("*")
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });

        if (error) {
            throw error;
        }

        return Array.isArray(data) ? data : [];
    }

    async function loadCounts() {
        const keys = Object.keys(CONFIG);
        const results = await Promise.all(
            keys.map(async key => {
                const { count, error } = await supabaseClient
                    .from(CONFIG[key].table)
                    .select("id", {
                        count: "exact",
                        head: true,
                    });

                if (error) {
                    throw error;
                }

                return [key, count ?? 0];
            }),
        );

        const counts = Object.fromEntries(results);
        elements.districtCount.textContent = counts.district;
        elements.neighborhoodCount.textContent =
            counts.neighborhood;
        elements.organizationCount.textContent =
            counts.organization;
    }

    async function loadDistrictRows() {
        districtRows = await fetchRows("district");
        populateDistrictOptions();
    }

    async function loadActiveMaster() {
        setMessage("データを読み込んでいます。");

        try {
            rows = await fetchRows(activeMaster);

            if (activeMaster !== "district" && districtRows.length === 0) {
                await loadDistrictRows();
            }

            renderTable();
            await loadCounts();
            setMessage("");
        } catch (error) {
            console.error(error);
            setMessage(
                `マスターの読込に失敗しました：${error.message}`,
                true,
            );
        }
    }

    function filteredRows() {
        const keyword = elements.search.value.trim().toLowerCase();
        const activeFilter = elements.activeFilter.value;

        return rows.filter(row => {
            const matchesKeyword =
                !keyword
                || String(row.code ?? "").toLowerCase().includes(keyword)
                || String(row.name ?? "").toLowerCase().includes(keyword);

            const matchesActive =
                activeFilter === "all"
                || String(Boolean(row.is_active)) === activeFilter;

            return matchesKeyword && matchesActive;
        });
    }

    function districtName(code) {
        return districtRows.find(row => row.code === code)?.name ?? "";
    }

    function renderTableHead() {
        const districtColumn =
            activeMaster === "neighborhood"
                ? "<th>所属地区</th>"
                : "";

        elements.tableHead.innerHTML = `
            <tr>
                <th>コード</th>
                <th>名称</th>
                ${districtColumn}
                <th>表示順</th>
                <th>状態</th>
                <th>操作</th>
            </tr>
        `;
    }

    function renderTable() {
        renderTableHead();

        const currentRows = filteredRows();

        if (currentRows.length === 0) {
            const colspan = activeMaster === "neighborhood" ? 6 : 5;
            elements.tableBody.innerHTML = `
                <tr>
                    <td class="empty-cell" colspan="${colspan}">
                        登録データがありません。
                    </td>
                </tr>
            `;
            return;
        }

        elements.tableBody.innerHTML = currentRows
            .map(row => {
                const districtCell =
                    activeMaster === "neighborhood"
                        ? `<td>${escapeHtml(
                            districtName(row.district_code)
                            || row.district_code
                            || "未設定",
                        )}</td>`
                        : "";

                return `
                    <tr>
                        <td>${escapeHtml(row.code)}</td>
                        <td>${escapeHtml(row.name)}</td>
                        ${districtCell}
                        <td>${Number(row.sort_order ?? 0)}</td>
                        <td>
                            <span class="status-badge ${row.is_active
                        ? "is-active"
                        : "is-inactive"
                    }">
                                ${row.is_active ? "使用中" : "停止中"}
                            </span>
                        </td>
                        <td>
                            <div class="row-actions">
                                <button
                                    class="small-button"
                                    type="button"
                                    data-action="edit"
                                    data-id="${row.id}">
                                    編集
                                </button>
                                <button
                                    class="small-button danger"
                                    type="button"
                                    data-action="delete"
                                    data-id="${row.id}">
                                    削除
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            })
            .join("");
    }

    function populateDistrictOptions(selectedCode = "") {
        if (!elements.editDistrictCode) {
            return;
        }

        elements.editDistrictCode.innerHTML =
            '<option value="">所属地区を選択してください</option>';

        for (const district of districtRows.filter(row => row.is_active)) {
            const option = document.createElement("option");
            option.value = district.code;
            option.textContent = district.name;
            option.selected = district.code === selectedCode;
            elements.editDistrictCode.appendChild(option);
        }
    }

    function openModal(row = null) {
        const config = currentConfig();

        elements.form.reset();
        elements.editId.value = row?.id ?? "";
        elements.editCode.value = row?.code ?? "";
        elements.editName.value = row?.name ?? "";
        elements.editSortOrder.value =
            Number(row?.sort_order ?? 0);
        elements.editIsActive.checked =
            row?.is_active ?? true;

        elements.districtField.hidden =
            activeMaster !== "neighborhood";

        if (activeMaster === "neighborhood") {
            populateDistrictOptions(row?.district_code ?? "");
        }

        elements.modalTitle.textContent = row
            ? `${config.label}を編集`
            : `${config.label}を追加`;

        setFormMessage("");
        elements.modal.hidden = false;
        elements.editCode.focus();
    }

    function closeModal() {
        elements.modal.hidden = true;
        setFormMessage("");
    }

    async function saveForm(event) {
        event.preventDefault();

        const config = currentConfig();
        const id = elements.editId.value;
        const code = elements.editCode.value.trim();
        const name = elements.editName.value.trim();

        if (!code || !name) {
            setFormMessage("コードと名称を入力してください。", true);
            return;
        }

        const payload = {
            code,
            name,
            sort_order:
                Number(elements.editSortOrder.value) || 0,
            is_active: elements.editIsActive.checked,
        };

        if (activeMaster === "neighborhood") {
            payload.district_code =
                elements.editDistrictCode.value || null;
        }

        elements.saveButton.disabled = true;
        setFormMessage("保存しています。");

        try {
            let query = supabaseClient.from(config.table);

            if (id) {
                query = query.update(payload).eq("id", id);
            } else {
                query = query.insert(payload);
            }

            const { error } = await query;

            if (error) {
                throw error;
            }

            closeModal();
            await loadDistrictRows();
            await loadActiveMaster();
            setMessage(`${config.label}を保存しました。`);
        } catch (error) {
            console.error(error);
            setFormMessage(
                `保存に失敗しました：${error.message}`,
                true,
            );
        } finally {
            elements.saveButton.disabled = false;
        }
    }

    async function deleteRow(id) {
        const config = currentConfig();
        const row = rows.find(item => String(item.id) === String(id));

        if (!row) {
            return;
        }

        const confirmed = window.confirm(
            `${config.label}「${row.name}」を削除しますか？\n`
            + "停止中に切り替える運用もおすすめです。",
        );

        if (!confirmed) {
            return;
        }

        try {
            const { error } = await supabaseClient
                .from(config.table)
                .delete()
                .eq("id", row.id);

            if (error) {
                throw error;
            }

            await loadDistrictRows();
            await loadActiveMaster();
            setMessage(`${config.label}を削除しました。`);
        } catch (error) {
            console.error(error);
            setMessage(
                `削除に失敗しました：${error.message}`,
                true,
            );
        }
    }

    function parseCsvLine(line) {
        const values = [];
        let value = "";
        let quoted = false;

        for (let i = 0; i < line.length; i += 1) {
            const char = line[i];
            const next = line[i + 1];

            if (char === '"' && quoted && next === '"') {
                value += '"';
                i += 1;
            } else if (char === '"') {
                quoted = !quoted;
            } else if (char === "," && !quoted) {
                values.push(value);
                value = "";
            } else {
                value += char;
            }
        }

        values.push(value);
        return values.map(item => item.trim());
    }

    function csvToObjects(text) {
        const lines = text
            .replace(/^\uFEFF/, "")
            .split(/\r?\n/)
            .filter(line => line.trim() !== "");

        if (lines.length < 2) {
            return [];
        }

        const headers = parseCsvLine(lines[0]);

        return lines.slice(1).map(line => {
            const values = parseCsvLine(line);
            return Object.fromEntries(
                headers.map((header, index) => [
                    header,
                    values[index] ?? "",
                ]),
            );
        });
    }

    function normalizeCsvRows(csvRows) {
        const config = currentConfig();

        return csvRows.map((row, index) => {
            const code = String(row.code ?? "").trim();
            const name = String(row.name ?? "").trim();

            if (!code || !name) {
                throw new Error(
                    `${index + 2}行目：codeとnameは必須です。`,
                );
            }

            const normalized = {
                code,
                name,
                sort_order: Number(row.sort_order) || 0,
                is_active:
                    String(row.is_active).toLowerCase() !== "false",
            };

            if (activeMaster === "neighborhood") {
                normalized.district_code =
                    String(row.district_code ?? "").trim() || null;
            }

            return normalized;
        });
    }

    async function importCsv(file) {
        if (!file) {
            return;
        }

        const config = currentConfig();
        setMessage(`${config.label}CSVを読み込んでいます。`);

        try {
            const text = await file.text();
            const csvRows = csvToObjects(text);
            const payload = normalizeCsvRows(csvRows);

            if (payload.length === 0) {
                throw new Error("登録するデータがありません。");
            }

            const { error } = await supabaseClient
                .from(config.table)
                .upsert(payload, {
                    onConflict: "code",
                });

            if (error) {
                throw error;
            }

            elements.csvFileInput.value = "";
            await loadDistrictRows();
            await loadActiveMaster();
            setMessage(
                `${config.label}を${payload.length}件取り込みました。`,
            );
        } catch (error) {
            console.error(error);
            setMessage(
                `CSV取込に失敗しました：${error.message}`,
                true,
            );
        }
    }

    function csvEscape(value) {
        const stringValue = String(value ?? "");

        if (
            stringValue.includes(",")
            || stringValue.includes('"')
            || stringValue.includes("\n")
        ) {
            return `"${stringValue.replaceAll('"', '""')}"`;
        }

        return stringValue;
    }

    function exportCsv() {
        const config = currentConfig();
        const headers = config.columns;

        const lines = [
            headers.join(","),
            ...rows.map(row =>
                headers
                    .map(header => csvEscape(row[header]))
                    .join(","),
            ),
        ];

        const blob = new Blob(
            ["\uFEFF" + lines.join("\r\n")],
            { type: "text/csv;charset=utf-8" },
        );

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = config.csvName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);

        setMessage(`${config.label}CSVを出力しました。`);
    }

    async function switchMaster(masterKey) {
        activeMaster = masterKey;

        for (const tab of elements.tabs) {
            tab.classList.toggle(
                "is-active",
                tab.dataset.master === masterKey,
            );
        }

        elements.search.value = "";
        elements.activeFilter.value = "all";
        await loadActiveMaster();
    }

    function installEvents() {
        for (const tab of elements.tabs) {
            tab.addEventListener("click", () => {
                switchMaster(tab.dataset.master);
            });
        }

        elements.addButton.addEventListener("click", () => openModal());
        elements.form.addEventListener("submit", saveForm);

        elements.search.addEventListener("input", renderTable);
        elements.activeFilter.addEventListener("change", renderTable);

        elements.csvFileInput.addEventListener("change", event => {
            importCsv(event.target.files?.[0]);
        });

        elements.csvExportButton.addEventListener(
            "click",
            exportCsv,
        );

        elements.tableBody.addEventListener("click", event => {
            const button = event.target.closest("button[data-action]");

            if (!button) {
                return;
            }

            const row = rows.find(
                item => String(item.id) === button.dataset.id,
            );

            if (button.dataset.action === "edit") {
                openModal(row);
            } else if (button.dataset.action === "delete") {
                deleteRow(button.dataset.id);
            }
        });

        document.querySelectorAll("[data-close-modal]")
            .forEach(element => {
                element.addEventListener("click", closeModal);
            });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !elements.modal.hidden) {
                closeModal();
            }
        });
    }

    async function initialize() {
        cacheElements();

        if (
            typeof supabaseClient === "undefined"
            || !supabaseClient
        ) {
            setMessage(
                "Supabase設定を読み込めませんでした。"
                + " supabase-config.js のパスを確認してください。",
                true,
            );
            return;
        }

        installEvents();

        try {
            await loadDistrictRows();
            await loadActiveMaster();
        } catch (error) {
            console.error(error);
            setMessage(
                `初期化に失敗しました：${error.message}`,
                true,
            );
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            { once: true },
        );
    } else {
        initialize();
    }
})();
