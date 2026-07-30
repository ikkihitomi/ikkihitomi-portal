"use strict";
const rows = document.getElementById("rows");
const msg = document.getElementById("message");
const statusFilter = document.getElementById("status-filter");
const keyword = document.getElementById("keyword");

function getClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
        return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }
    if (window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.anonKey) {
        return window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
    }
    throw new Error("admin/supabase-config.js の設定形式を確認してください。");
}
const client = getClient();
let allEntries = [];

function esc(v) { return String(v ?? "").replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s])); }
function statusLabel(v) { return ({ received: "受付", reviewing: "審査中", selected: "入賞", not_selected: "選外", withdrawn: "取消" })[v] || v; }
function showError(text) { msg.textContent = text; msg.style.display = "block"; }
async function load() {
    try {
        msg.style.display = "none";
        const { data: { session } } = await client.auth.getSession();
        if (!session) { location.href = "./login.html"; return; }
        const { data, error } = await client.from("photo_entries").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        allEntries = data || [];
        await render();
    } catch (e) { console.error(e); showError(e.message || "読み込みに失敗しました。"); }
}
async function render() {
    const status = statusFilter.value;
    const q = keyword.value.trim().toLowerCase();
    const list = allEntries.filter(x => (!status || x.status === status) && (!q || [x.entry_no, x.resident_name, x.title, x.location].some(v => String(v || "").toLowerCase().includes(q))));
    const html = [];
    for (const x of list) {
        let image = "";
        const { data } = await client.storage.from("photo2026").createSignedUrl(x.storage_path, 3600);
        if (data?.signedUrl) image = `<a href="${esc(data.signedUrl)}" target="_blank"><img class="thumb" src="${esc(data.signedUrl)}" alt=""></a>`;
        html.push(`<tr>
      <td>${image}</td>
      <td><strong>${esc(x.entry_no)}</strong></td>
      <td>${esc(x.title)}</td>
      <td>${esc(x.resident_name)}</td>
      <td>${esc(x.district_name || "")}<br>${esc(x.neighborhood_name || "")}</td>
      <td>${esc(x.location)}</td>
      <td>${esc(new Date(x.created_at).toLocaleString("ja-JP"))}</td>
      <td><select data-id="${esc(x.id)}" class="status-select">
        ${["received", "reviewing", "selected", "not_selected", "withdrawn"].map(s => `<option value="${s}" ${s === x.status ? "selected" : ""}>${statusLabel(s)}</option>`).join("")}
      </select></td>
    </tr>`);
    }
    rows.innerHTML = html.join("") || `<tr><td colspan="8">該当する応募はありません。</td></tr>`;
    document.querySelectorAll(".status-select").forEach(sel => sel.addEventListener("change", async () => {
        const { error } = await client.from("photo_entries").update({ status: sel.value }).eq("id", sel.dataset.id);
        if (error) { showError(error.message); await load(); }
    }));
}
statusFilter.addEventListener("change", render);
keyword.addEventListener("input", render);
document.getElementById("reload").addEventListener("click", load);
load();
