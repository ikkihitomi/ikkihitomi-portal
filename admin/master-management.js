"use strict";

(() => {
    const CONFIG = {
        district: {
            table: "district_master",
            label: "地区",
            csvName: "district_master.csv",
            templateName: "district_master_template.csv",
            columns: ["code", "name", "sort_order", "is_active"],
        },
        neighborhood: {
            table: "neighborhood_master",
            label: "町内会",
            csvName: "neighborhood_master.csv",
            templateName: "neighborhood_master_template.csv",
            columns: ["code", "name", "district_code", "sort_order", "is_active"],
        },
        organization: {
            table: "organization_master",
            label: "所属団体",
            csvName: "organization_master.csv",
            templateName: "organization_master_template.csv",
            columns: ["code", "name", "sort_order", "is_active"],
        },
    };

    let activeMaster = "district";
    let rows = [];
    let districtRows = [];
    const el = {};

    function cache() {
        el.tabs = [...document.querySelectorAll(".tab-button")];
        el.addButton = document.getElementById("add-button");
        el.csvFileInput = document.getElementById("csv-file-input");
        el.csvTemplateButton = document.getElementById("csv-template-button");
        el.csvExportButton = document.getElementById("csv-export-button");
        el.search = document.getElementById("master-search");
        el.activeFilter = document.getElementById("active-filter");
        el.message = document.getElementById("page-message");
        el.tableHead = document.getElementById("master-table-head");
        el.tableBody = document.getElementById("master-table-body");
        el.modal = document.getElementById("edit-modal");
        el.modalTitle = document.getElementById("modal-title");
        el.form = document.getElementById("master-form");
        el.editId = document.getElementById("edit-id");
        el.editCode = document.getElementById("edit-code");
        el.editName = document.getElementById("edit-name");
        el.districtField = document.getElementById("district-code-field");
        el.editDistrictCode = document.getElementById("edit-district-code");
        el.editSortOrder = document.getElementById("edit-sort-order");
        el.editIsActive = document.getElementById("edit-is-active");
        el.formMessage = document.getElementById("form-message");
        el.saveButton = document.getElementById("save-button");
        el.districtCount = document.getElementById("district-count");
        el.neighborhoodCount = document.getElementById("neighborhood-count");
        el.organizationCount = document.getElementById("organization-count");
    }

    const config = () => CONFIG[activeMaster];

    function setMessage(text = "", isError = false) {
        el.message.textContent = text;
        el.message.classList.toggle("is-error", isError);
    }

    function setFormMessage(text = "", isError = false) {
        el.formMessage.textContent = text;
        el.formMessage.classList.toggle("is-error", isError);
    }

    function esc(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    async function fetchRows(key) {
        const { data, error } = await supabaseClient
            .from(CONFIG[key].table)
            .select("*")
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });

        if (error) throw error;
        return Array.isArray(data) ? data : [];
    }

    async function loadCounts() {
        const entries = await Promise.all(
            Object.keys(CONFIG).map(async key => {
                const { count, error } = await supabaseClient
                    .from(CONFIG[key].table)
                    .select("id", { count: "exact", head: true });
                if (error) throw error;
                return [key, count ?? 0];
            }),
        );
        const counts = Object.fromEntries(entries);
        el.districtCount.textContent = counts.district;
        el.neighborhoodCount.textContent = counts.neighborhood;
        el.organizationCount.textContent = counts.organization;
    }

    async function loadDistricts() {
        districtRows = await fetchRows("district");
        populateDistrictOptions();
    }

    async function load() {
        setMessage("データを読み込んでいます。");
        try {
            rows = await fetchRows(activeMaster);
            if (activeMaster !== "district" && districtRows.length === 0) {
                await loadDistricts();
            }
            render();
            await loadCounts();
            setMessage("");
        } catch (error) {
            console.error(error);
            setMessage(`読込に失敗しました：${error.message}`, true);
        }
    }

    function filtered() {
        const keyword = el.search.value.trim().toLowerCase();
        const filter = el.activeFilter.value;
        return rows.filter(row => {
            const keywordOk = !keyword
                || String(row.code ?? "").toLowerCase().includes(keyword)
                || String(row.name ?? "").toLowerCase().includes(keyword);
            const activeOk = filter === "all"
                || String(Boolean(row.is_active)) === filter;
            return keywordOk && activeOk;
        });
    }

    const districtName = code =>
        districtRows.find(row => row.code === code)?.name ?? "";

    function render() {
        const hasDistrict = activeMaster === "neighborhood";
        el.tableHead.innerHTML = `<tr>
            <th>コード</th><th>名称</th>
            ${hasDistrict ? "<th>所属地区</th>" : ""}
            <th>表示順</th><th>状態</th><th>操作</th>
        </tr>`;

        const visible = filtered();
        if (!visible.length) {
            el.tableBody.innerHTML = `<tr><td class="empty-cell" colspan="${hasDistrict ? 6 : 5}">登録データがありません。</td></tr>`;
            return;
        }

        el.tableBody.innerHTML = visible.map(row => `
            <tr>
                <td>${esc(row.code)}</td>
                <td>${esc(row.name)}</td>
                ${hasDistrict ? `<td>${esc(districtName(row.district_code) || row.district_code || "未設定")}</td>` : ""}
                <td>${Number(row.sort_order ?? 0)}</td>
                <td><span class="status-badge ${row.is_active ? "is-active" : "is-inactive"}">${row.is_active ? "使用中" : "停止中"}</span></td>
                <td><div class="row-actions">
                    <button class="small-button" type="button" data-action="edit" data-id="${row.id}">編集</button>
                    <button class="small-button warning" type="button" data-action="toggle" data-id="${row.id}">${row.is_active ? "停止" : "再開"}</button>
                    <button class="small-button danger" type="button" data-action="delete" data-id="${row.id}">削除</button>
                </div></td>
            </tr>
        `).join("");
    }

    function populateDistrictOptions(selected = "") {
        if (!el.editDistrictCode) return;
        el.editDistrictCode.innerHTML = '<option value="">所属地区を選択してください</option>';
        for (const row of districtRows.filter(item => item.is_active || item.code === selected)) {
            const option = document.createElement("option");
            option.value = row.code;
            option.textContent = row.name + (row.is_active ? "" : "（停止中）");
            option.selected = row.code === selected;
            el.editDistrictCode.appendChild(option);
        }
    }

    function openModal(row = null) {
        el.form.reset();
        el.editId.value = row?.id ?? "";
        el.editCode.value = row?.code ?? "";
        el.editName.value = row?.name ?? "";
        el.editSortOrder.value = Number(row?.sort_order ?? 0);
        el.editIsActive.checked = row?.is_active ?? true;
        el.districtField.hidden = activeMaster !== "neighborhood";
        if (activeMaster === "neighborhood") populateDistrictOptions(row?.district_code ?? "");
        el.modalTitle.textContent = row ? `${config().label}を編集` : `${config().label}を追加`;
        setFormMessage("");
        el.modal.hidden = false;
        el.editCode.focus();
    }

    function closeModal() {
        el.modal.hidden = true;
        setFormMessage("");
    }

    async function save(event) {
        event.preventDefault();
        const id = el.editId.value;
        const payload = {
            code: el.editCode.value.trim(),
            name: el.editName.value.trim(),
            sort_order: Number(el.editSortOrder.value) || 0,
            is_active: el.editIsActive.checked,
        };

        if (!payload.code || !payload.name) {
            setFormMessage("コードと名称を入力してください。", true);
            return;
        }

        if (activeMaster === "neighborhood") {
            payload.district_code = el.editDistrictCode.value || null;
        }

        el.saveButton.disabled = true;
        setFormMessage("保存しています。");

        try {
            let query = supabaseClient.from(config().table);
            query = id ? query.update(payload).eq("id", id) : query.insert(payload);
            const { error } = await query;
            if (error) throw error;

            closeModal();
            await loadDistricts();
            await load();
            setMessage(`${config().label}を保存しました。`);
        } catch (error) {
            console.error(error);
            setFormMessage(`保存に失敗しました：${error.message}`, true);
        } finally {
            el.saveButton.disabled = false;
        }
    }

    async function toggleActive(row) {
        const next = !row.is_active;
        const action = next ? "再開" : "停止";
        if (!confirm(`${config().label}「${row.name}」を${action}しますか？`)) return;

        const { error } = await supabaseClient
            .from(config().table)
            .update({ is_active: next })
            .eq("id", row.id);

        if (error) {
            setMessage(`${action}に失敗しました：${error.message}`, true);
            return;
        }

        await loadDistricts();
        await load();
        setMessage(`${config().label}を${action}しました。`);
    }

    async function usageCount(row) {
        if (activeMaster === "district") {
            const { count, error } = await supabaseClient
                .from("neighborhood_master")
                .select("id", { count: "exact", head: true })
                .eq("district_code", row.code);
            if (error) throw error;
            return count ?? 0;
        }

        const column = activeMaster === "neighborhood"
            ? "neighborhood_name"
            : "organization_name";

        const { count, error } = await supabaseClient
            .from("line_users")
            .select("id", { count: "exact", head: true })
            .eq(column, row.name);

        if (error) throw error;
        return count ?? 0;
    }

    async function remove(row) {
        try {
            const count = await usageCount(row);
            if (count > 0) {
                setMessage(
                    `${config().label}「${row.name}」は${count}件で使用中のため削除できません。「停止」を使用してください。`,
                    true,
                );
                return;
            }

            if (!confirm(`${config().label}「${row.name}」を完全削除しますか？\n通常は「停止」をおすすめします。`)) return;

            const { error } = await supabaseClient
                .from(config().table)
                .delete()
                .eq("id", row.id);
            if (error) throw error;

            await loadDistricts();
            await load();
            setMessage(`${config().label}を削除しました。`);
        } catch (error) {
            console.error(error);
            setMessage(`削除確認に失敗しました：${error.message}`, true);
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
                value += '"'; i += 1;
            } else if (char === '"') {
                quoted = !quoted;
            } else if (char === "," && !quoted) {
                values.push(value); value = "";
            } else {
                value += char;
            }
        }
        values.push(value);
        return values.map(v => v.trim());
    }

    function csvObjects(text) {
        const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
        if (!lines.length) return [];
        const headers = parseCsvLine(lines[0]);
        return lines.slice(1).map(line => {
            const values = parseCsvLine(line);
            return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
        });
    }

    function validateCsv(rawRows) {
        const required = activeMaster === "neighborhood"
            ? ["code", "name", "district_code", "sort_order", "is_active"]
            : ["code", "name", "sort_order", "is_active"];

        if (!rawRows.length) throw new Error("登録データがありません。");

        const headers = Object.keys(rawRows[0]);
        const missing = required.filter(name => !headers.includes(name));
        if (missing.length) throw new Error(`必須列がありません：${missing.join(", ")}`);

        const seen = new Set();
        return rawRows.map((row, index) => {
            const line = index + 2;
            const code = String(row.code ?? "").trim();
            const name = String(row.name ?? "").trim();
            if (!code || !name) throw new Error(`${line}行目：codeとnameは必須です。`);
            if (seen.has(code)) throw new Error(`${line}行目：code「${code}」がCSV内で重複しています。`);
            seen.add(code);

            const normalized = {
                code,
                name,
                sort_order: Number(row.sort_order) || 0,
                is_active: String(row.is_active).trim().toLowerCase() !== "false",
            };

            if (activeMaster === "neighborhood") {
                const districtCode = String(row.district_code ?? "").trim();
                if (districtCode && !districtRows.some(d => d.code === districtCode)) {
                    throw new Error(`${line}行目：地区コード「${districtCode}」が地区マスターにありません。`);
                }
                normalized.district_code = districtCode || null;
            }
            return normalized;
        });
    }

    async function importCsv(file) {
        if (!file) return;
        try {
            const payload = validateCsv(csvObjects(await file.text()));
            if (!confirm(`${config().label}を${payload.length}件取り込みます。\n同じコードは更新されます。よろしいですか？`)) {
                el.csvFileInput.value = "";
                return;
            }

            setMessage("CSVを取り込んでいます。");
            const { error } = await supabaseClient
                .from(config().table)
                .upsert(payload, { onConflict: "code" });
            if (error) throw error;

            el.csvFileInput.value = "";
            await loadDistricts();
            await load();
            setMessage(`${config().label}を${payload.length}件取り込みました。`);
        } catch (error) {
            console.error(error);
            el.csvFileInput.value = "";
            setMessage(`CSV取込に失敗しました：${error.message}`, true);
        }
    }

    function csvEscape(value) {
        const text = String(value ?? "");
        return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    }

    function downloadCsv(filename, columns, sourceRows) {
        const lines = [
            columns.join(","),
            ...sourceRows.map(row => columns.map(col => csvEscape(row[col])).join(",")),
        ];
        const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    }

    function exportCsv() {
        downloadCsv(config().csvName, config().columns, rows);
        setMessage(`${config().label}CSVを出力しました。`);
    }

    function exportTemplate() {
        const sample = activeMaster === "neighborhood"
            ? [{ code: "", name: "", district_code: "", sort_order: "", is_active: "true" }]
            : [{ code: "", name: "", sort_order: "", is_active: "true" }];
        downloadCsv(config().templateName, config().columns, sample);
        setMessage(`${config().label}CSVテンプレートを出力しました。`);
    }

    async function switchMaster(key) {
        activeMaster = key;
        el.tabs.forEach(tab => tab.classList.toggle("is-active", tab.dataset.master === key));
        el.search.value = "";
        el.activeFilter.value = "all";
        await load();
    }

    function installEvents() {
        el.tabs.forEach(tab => tab.addEventListener("click", () => switchMaster(tab.dataset.master)));
        el.addButton.addEventListener("click", () => openModal());
        el.form.addEventListener("submit", save);
        el.search.addEventListener("input", render);
        el.activeFilter.addEventListener("change", render);
        el.csvFileInput.addEventListener("change", event => importCsv(event.target.files?.[0]));
        el.csvTemplateButton.addEventListener("click", exportTemplate);
        el.csvExportButton.addEventListener("click", exportCsv);

        el.tableBody.addEventListener("click", event => {
            const button = event.target.closest("button[data-action]");
            if (!button) return;
            const row = rows.find(item => String(item.id) === button.dataset.id);
            if (!row) return;
            if (button.dataset.action === "edit") openModal(row);
            if (button.dataset.action === "toggle") toggleActive(row);
            if (button.dataset.action === "delete") remove(row);
        });

        document.querySelectorAll("[data-close-modal]").forEach(node => node.addEventListener("click", closeModal));
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !el.modal.hidden) closeModal();
        });
    }

    async function init() {
        cache();
        if (typeof supabaseClient === "undefined" || !supabaseClient) {
            setMessage("Supabase設定を読み込めませんでした。supabase-config.jsを確認してください。", true);
            return;
        }
        installEvents();
        await loadDistricts();
        await load();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
