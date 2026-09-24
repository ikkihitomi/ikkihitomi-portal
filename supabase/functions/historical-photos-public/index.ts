import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SortMode = "new" | "oldest" | "newest";

type RequestCursor = {
    sort: SortMode;
    query: string;
    display_order: number;
    shooting_year_sort: number | null;
    created_at: string;
    id: string;
};

type PublicEntry = {
    id: string;
    title: string | null;
    shooting_era_display: string;
    shooting_year_sort: number | null;
    shooting_year_end_sort: number | null;
    location: string;
    description: string;
    provider_name_public: string;
    display_order: number;
    created_at: string;
    display_width: number;
    display_height: number;
    display_storage_path: string;
};

const ALLOWED_SORTS = new Set<SortMode>(["new", "oldest", "newest"]);
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 24;
const MAX_BODY_BYTES = 16 * 1024;
const MAX_QUERY_LENGTH = 100;
const SIGNED_URL_SECONDS = 3600;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "OPTIONS, POST",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
};

function jsonResponse(body: unknown, status = 200) {
    const headers = new Headers(corsHeaders);
    return new Response(JSON.stringify(body), { status, headers });
}

function errorResponse(status: number, message: string) {
    return jsonResponse({ ok: false, error: message }, status);
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
    return typeof value === "string"
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeSort(value: unknown): SortMode {
    return typeof value === "string" && ALLOWED_SORTS.has(value as SortMode)
        ? value as SortMode
        : "new";
}

function parseLimit(value: unknown): number {
    if (value === undefined || value === null || value === "") return DEFAULT_LIMIT;
    if (typeof value !== "number" || !Number.isInteger(value)) {
        throw new Error("invalid limit");
    }
    if (value < 1 || value > MAX_LIMIT) throw new Error("invalid limit");
    return value;
}

function parseQuery(value: unknown): string {
    if (value === undefined || value === null) return "";
    if (typeof value !== "string") throw new Error("invalid query");
    const query = value.trim();
    if (Array.from(query).length > MAX_QUERY_LENGTH || /[\u0000-\u001f\u007f]/.test(query)) {
        throw new Error("invalid query");
    }
    return query;
}

function parseCursor(value: unknown, sort: SortMode, query: string): RequestCursor | null {
    if (value === undefined || value === null) return null;
    if (!isObject(value)) throw new Error("invalid cursor");
    if (value.sort !== sort || value.query !== query) throw new Error("invalid cursor");
    if (typeof value.display_order !== "number"
        || !Number.isSafeInteger(value.display_order)
        || value.display_order < 0) {
        throw new Error("invalid cursor");
    }
    if (value.shooting_year_sort !== null
        && (typeof value.shooting_year_sort !== "number"
            || !Number.isSafeInteger(value.shooting_year_sort)
            || value.shooting_year_sort < 1800
            || value.shooting_year_sort > 2100)) {
        throw new Error("invalid cursor");
    }
    if (typeof value.created_at !== "string"
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value.created_at)
        || Number.isNaN(Date.parse(value.created_at))) {
        throw new Error("invalid cursor");
    }
    if (!isUuid(value.id)) throw new Error("invalid cursor");

    return {
        sort,
        query,
        display_order: value.display_order,
        shooting_year_sort: value.shooting_year_sort,
        created_at: value.created_at,
        id: value.id,
    };
}

function escapeSearchValue(value: string): string {
    return value
        .replaceAll("\\", "\\\\")
        .replaceAll("%", "\\%")
        .replaceAll("_", "\\_")
        .replaceAll("*", "\\*")
        .replaceAll(",", "\\,")
        .replaceAll("(", "\\(")
        .replaceAll(")", "\\)")
        .replaceAll('"', '\\"');
}

function applySearch(queryBuilder: any, query: string) {
    if (!query) return queryBuilder;
    const pattern = `*${escapeSearchValue(query)}*`;
    return queryBuilder.or([
        `title.ilike.${pattern}`,
        `shooting_era_display.ilike.${pattern}`,
        `location.ilike.${pattern}`,
        `description.ilike.${pattern}`,
        `provider_name_public.ilike.${pattern}`,
    ].join(","));
}

function applyCursor(queryBuilder: any, cursor: RequestCursor, sort: SortMode) {
    if (sort === "new") {
        return queryBuilder.or([
            `display_order.gt.${cursor.display_order}`,
            `and(display_order.eq.${cursor.display_order},created_at.lt.${cursor.created_at})`,
            `and(display_order.eq.${cursor.display_order},created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
        ].join(","));
    }

    const year = cursor.shooting_year_sort;
    const primary = year === null
        ? null
        : `shooting_year_sort.${sort === "oldest" ? "gt" : "lt"}.${year}`;
    const sameYear = year === null
        ? "shooting_year_sort.is.null"
        : `shooting_year_sort.eq.${year}`;

    return queryBuilder.or([
        primary,
        `and(${sameYear},created_at.lt.${cursor.created_at})`,
        `and(${sameYear},created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    ].filter(Boolean).join(","));
}

function applyOrdering(queryBuilder: any, sort: SortMode) {
    if (sort === "new") {
        return queryBuilder
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: false })
            .order("id", { ascending: false });
    }

    return queryBuilder
        .order("shooting_year_sort", { ascending: sort === "oldest", nullsFirst: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
}

function toNextCursor(entry: PublicEntry, sort: SortMode, query: string): RequestCursor {
    return {
        sort,
        query,
        display_order: entry.display_order,
        shooting_year_sort: entry.shooting_year_sort,
        created_at: entry.created_at,
        id: entry.id,
    };
}

async function handlePost(request: Request) {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) return errorResponse(413, "リクエストが大きすぎます。");

    let body: unknown;
    try {
        const text = await request.text();
        if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
            return errorResponse(413, "リクエストが大きすぎます。");
        }
        body = text ? JSON.parse(text) : {};
    } catch (error) {
        console.error("historical-photos-public request parse error:", error);
        return errorResponse(400, "リクエストを処理できませんでした。");
    }

    if (!isObject(body)) return errorResponse(400, "リクエスト形式が正しくありません。");

    let limit: number;
    let queryText: string;
    let sort: SortMode;
    let cursor: RequestCursor | null;
    try {
        limit = parseLimit(body.limit);
        queryText = parseQuery(body.query);
        sort = normalizeSort(body.sort);
        cursor = parseCursor(body.cursor, sort, queryText);
    } catch {
        return errorResponse(400, "検索条件が正しくありません。");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    let secretKey = "";
    const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (secretKeysJson) {
        try {
            const secretKeys = JSON.parse(secretKeysJson);
            if (isObject(secretKeys)
                && typeof secretKeys.default === "string"
                && secretKeys.default.trim()) {
                secretKey = secretKeys.default.trim();
            }
        } catch (error) {
            console.error("historical-photos-public secret key configuration is invalid");
        }
    }
    if (!secretKey) secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !secretKey) {
        console.error("historical-photos-public Supabase secret configuration is missing");
        return errorResponse(500, "公開作品を取得できませんでした。");
    }

    const supabase = createClient(supabaseUrl, secretKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
        let queryBuilder = supabase
            .from("historical_photos")
            .select(`
                id,
                title,
                shooting_era_display,
                shooting_year_sort,
                shooting_year_end_sort,
                location,
                description,
                provider_name_public,
                display_order,
                created_at,
                display_width,
                display_height,
                display_storage_path
            `)
            .eq("status", "approved")
            .eq("is_public", true)
            .not("display_storage_path", "is", null)
            .eq("display_mime_type", "image/jpeg")
            .gt("display_file_size", 0)
            .gt("display_width", 0)
            .gt("display_height", 0)
            .lte("display_width", 1600)
            .lte("display_height", 1600);

        queryBuilder = applySearch(queryBuilder, queryText);
        if (cursor) queryBuilder = applyCursor(queryBuilder, cursor, sort);
        queryBuilder = applyOrdering(queryBuilder, sort).limit(limit + 1);

        const { data, error } = await queryBuilder;
        if (error) throw error;

        const candidates = (data ?? []) as PublicEntry[];
        const hasMore = candidates.length > limit;
        const page = candidates.slice(0, limit);
        const entries: Record<string, unknown>[] = [];

        for (const entry of page) {
            try {
                const { data: signedUrl, error: signedUrlError } = await supabase.storage
                    .from("historical-photos")
                    .createSignedUrl(entry.display_storage_path, SIGNED_URL_SECONDS);
                if (signedUrlError || !signedUrl?.signedUrl) {
                    console.error("historical-photos-public signed URL error:", signedUrlError);
                    continue;
                }

                entries.push({
                    id: entry.id,
                    title: entry.title,
                    shooting_era_display: entry.shooting_era_display,
                    shooting_year_sort: entry.shooting_year_sort,
                    shooting_year_end_sort: entry.shooting_year_end_sort,
                    location: entry.location,
                    description: entry.description,
                    provider_name_public: entry.provider_name_public,
                    display_order: entry.display_order,
                    created_at: entry.created_at,
                    display_width: entry.display_width,
                    display_height: entry.display_height,
                    image_url: signedUrl.signedUrl,
                });
            } catch (error) {
                console.error("historical-photos-public signed URL exception:", error);
            }
        }

        return jsonResponse({
            ok: true,
            entries,
            next_cursor: hasMore && page.length > 0
                ? toNextCursor(page[page.length - 1], sort, queryText)
                : null,
            has_more: hasMore,
        });
    } catch (error) {
        console.error("historical-photos-public database error:", error);
        return errorResponse(500, "公開作品を取得できませんでした。");
    }
}

Deno.serve(async request => {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ ok: false, error: "Method Not Allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Allow": "OPTIONS, POST", "Cache-Control": "no-store" },
        });
    }
    return handlePost(request);
});
