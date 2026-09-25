// Supabase Edge Function: photo-gallery-public
// 一箕地区ポータル Ver1.50
//
// 管理者承認済み作品だけを公開ページへ返します。
// Storageバケット photo2026 の期限付きURLを発行します。

import { createClient } from
    "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":
        "GET, POST, OPTIONS",
};

const REVIEW_DEADLINE =
    Date.parse("2026-09-30T15:00:00Z");

function jsonResponse(
    body: Record<string, unknown>,
    status = 200,
    cacheControl = "public, max-age=60",
): Response {
    return new Response(
        JSON.stringify(body),
        {
            status,
            headers: {
                ...corsHeaders,
                "Content-Type":
                    "application/json; charset=utf-8",
                "Cache-Control": cacheControl,
            },
        },
    );
}

Deno.serve(async (
    request: Request,
): Promise<Response> => {
    if (request.method === "OPTIONS") {
        return new Response(
            "ok",
            {
                headers: corsHeaders,
            },
        );
    }

    if (
        request.method !== "GET"
        && request.method !== "POST"
    ) {
        return jsonResponse(
            {
                ok: false,
                error:
                    "GETまたはPOSTでアクセスしてください。",
            },
            405,
        );
    }

    try {
        const supabaseUrl =
            Deno.env.get("SUPABASE_URL");

        const serviceRoleKey =
            Deno.env.get(
                "SUPABASE_SERVICE_ROLE_KEY",
            );

        if (
            !supabaseUrl
            || !serviceRoleKey
        ) {
            throw new Error(
                "Edge Functionの環境変数が不足しています。",
            );
        }

        const supabase =
            createClient(
                supabaseUrl,
                serviceRoleKey,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                    },
                },
            );

        let contestYear = 2026;

        if (request.method === "POST") {
            const payload =
                await request.json()
                    .catch(() => ({}));

            const requestedYear =
                Number(payload.contest_year);

            if (
                Number.isInteger(requestedYear)
                && requestedYear >= 2026
            ) {
                contestYear = requestedYear;
            }
        } else {
            const url =
                new URL(request.url);

            const requestedYear =
                Number(
                    url.searchParams.get(
                        "contest_year",
                    ),
                );

            if (
                Number.isInteger(requestedYear)
                && requestedYear >= 2026
            ) {
                contestYear = requestedYear;
            }
        }

        if (
            contestYear === 2026
            && Date.now() >= REVIEW_DEADLINE
        ) {
            return jsonResponse(
                {
                    ok: true,
                    contest_year: 2026,
                    reviewing: true,
                    count: 0,
                    entries: [],
                },
                200,
                "no-store",
            );
        }

        const {
            data,
            error,
        } = await supabase
            .from("photo_entries")
            .select(`
                id,
                contest_year,
                entry_no,
                district_name,
                neighborhood_name,
                title,
                location,
                shooting_date,
                comment,
                storage_path,
                status,
                is_public,
                award_name,
                created_at
            `)
            .eq(
                "contest_year",
                contestYear,
            )
            .eq(
                "is_public",
                true,
            )
            .in(
                "status",
                [
                    "approved",
                    "winner",
                ],
            )
            .order(
                "created_at",
                {
                    ascending: false,
                },
            );

        if (error) {
            throw error;
        }

        const entries =
            await Promise.all(
                (data ?? []).map(
                    async entry => {
                        let imageUrl = "";

                        if (
                            entry.storage_path
                            && /^https?:\/\//i.test(
                                entry.storage_path,
                            )
                        ) {
                            imageUrl =
                                entry.storage_path;
                        } else if (
                            entry.storage_path
                        ) {
                            const {
                                data: signedData,
                                error: signedError,
                            } = await supabase.storage
                                .from("photo2026")
                                .createSignedUrl(
                                    entry.storage_path,
                                    60 * 60,
                                );

                            if (signedError) {
                                console.error(
                                    "Signed URL error:",
                                    entry.id,
                                    signedError,
                                );
                            } else {
                                imageUrl =
                                    signedData.signedUrl;
                            }
                        }

                        return {
                            id:
                                entry.id,
                            contest_year:
                                entry.contest_year,
                            entry_no:
                                entry.entry_no,
                            district_name:
                                entry.district_name,
                            neighborhood_name:
                                entry.neighborhood_name,
                            title:
                                entry.title,
                            location:
                                entry.location,
                            shooting_date:
                                entry.shooting_date,
                            comment:
                                entry.comment,
                            status:
                                entry.status,
                            award_name:
                                entry.award_name,
                            created_at:
                                entry.created_at,
                            image_url:
                                imageUrl,
                        };
                    },
                ),
            );

        return jsonResponse({
            ok: true,
            contest_year:
                contestYear,
            reviewing: false,
            count:
                entries.length,
            entries,
        });

    } catch (error) {
        console.error(
            "photo-gallery-public error:",
            error,
        );

        return jsonResponse(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "公開作品を取得できませんでした。",
            },
            500,
        );
    }
});
