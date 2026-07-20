/**
 * 一箕地区ポータル
 * WordPress「町内会紹介」記事表示
 */

"use strict";

const NEIGHBORHOOD_CONFIG = {
    wordpressBaseUrl: "https://ikki-portal.com/blog/wp-json/wp/v2",
    categoryName: "町内会紹介",
    numberOfPosts: 4,
    containerId: "neighborhood-posts",
    fallbackImage: "/images/no-image-neighborhood.jpg"
};

/**
 * HTMLとして解釈される文字を無害化する
 */
function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/**
 * WordPress本文のHTMLタグを除去する
 */
function stripHtml(html = "") {
    const temporaryElement = document.createElement("div");
    temporaryElement.innerHTML = html;

    return temporaryElement.textContent
        ? temporaryElement.textContent.trim()
        : "";
}

/**
 * 日付を日本語表記へ変換する
 */
function formatJapaneseDate(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric"
    }).format(date);
}

/**
 * アイキャッチ画像URLを取得する
 */
function getFeaturedImage(post) {
    const media = post?._embedded?.["wp:featuredmedia"]?.[0];

    return (
        media?.media_details?.sizes?.large?.source_url ||
        media?.media_details?.sizes?.medium_large?.source_url ||
        media?.source_url ||
        NEIGHBORHOOD_CONFIG.fallbackImage
    );
}

/**
 * 画像の代替テキストを取得する
 */
function getFeaturedImageAlt(post) {
    const media = post?._embedded?.["wp:featuredmedia"]?.[0];

    return (
        media?.alt_text ||
        stripHtml(post?.title?.rendered || "") ||
        "町内会紹介"
    );
}

/**
 * カテゴリーIDを取得する
 */
async function fetchNeighborhoodCategoryId() {
    const endpoint =
        `${NEIGHBORHOOD_CONFIG.wordpressBaseUrl}/categories` +
        `?search=${encodeURIComponent(NEIGHBORHOOD_CONFIG.categoryName)}` +
        `&per_page=100`;

    const response = await fetch(endpoint);

    if (!response.ok) {
        throw new Error(`カテゴリー取得エラー: ${response.status}`);
    }

    const categories = await response.json();

    const category = categories.find(
        (item) => item.name === NEIGHBORHOOD_CONFIG.categoryName
    );

    if (!category) {
        throw new Error(
            `カテゴリー「${NEIGHBORHOOD_CONFIG.categoryName}」が見つかりません。`
        );
    }

    return category.id;
}

/**
 * 町内会紹介記事を取得する
 */
async function fetchNeighborhoodPosts(categoryId) {
    const endpoint =
        `${NEIGHBORHOOD_CONFIG.wordpressBaseUrl}/posts` +
        `?categories=${categoryId}` +
        `&per_page=${NEIGHBORHOOD_CONFIG.numberOfPosts}` +
        `&orderby=date` +
        `&order=desc` +
        `&_embed=1`;

    const response = await fetch(endpoint);

    if (!response.ok) {
        throw new Error(`記事取得エラー: ${response.status}`);
    }

    return response.json();
}

/**
 * 町内会カードを作成する
 */
function createNeighborhoodCard(post) {
    const title = stripHtml(post?.title?.rendered || "町内会紹介");
    const excerpt =
        stripHtml(post?.excerpt?.rendered || "") ||
        "一箕地区の町内会と地域の魅力をご紹介します。";

    const postUrl = post?.link || "#";
    const imageUrl = getFeaturedImage(post);
    const imageAlt = getFeaturedImageAlt(post);
    const publishedDate = formatJapaneseDate(post?.date);

    return `
    <article class="neighborhood-card">
      <a
        href="${escapeHtml(postUrl)}"
        class="neighborhood-card-link"
      >
        <div class="neighborhood-card-image">
          <img
            src="${escapeHtml(imageUrl)}"
            alt="${escapeHtml(imageAlt)}"
            loading="lazy"
            decoding="async"
            onerror="this.onerror=null; this.src='${escapeHtml(
        NEIGHBORHOOD_CONFIG.fallbackImage
    )}';"
          >
        </div>

        <div class="neighborhood-card-body">
          <span class="neighborhood-card-category">
            町内会紹介
          </span>

          <h3 class="neighborhood-card-title">
            ${escapeHtml(title)}
          </h3>

          <p class="neighborhood-card-text">
            ${escapeHtml(excerpt)}
          </p>

          <div class="neighborhood-card-footer">
            <time
              class="neighborhood-card-date"
              datetime="${escapeHtml(post?.date || "")}"
            >
              ${escapeHtml(publishedDate)}
            </time>

            <span class="neighborhood-card-read">
              詳しく見る →
            </span>
          </div>
        </div>
      </a>
    </article>
  `;
}

/**
 * 記事を画面へ表示する
 */
function renderNeighborhoodPosts(posts) {
    const container = document.getElementById(
        NEIGHBORHOOD_CONFIG.containerId
    );

    if (!container) {
        return;
    }

    if (!Array.isArray(posts) || posts.length === 0) {
        container.innerHTML = `
      <p class="neighborhood-empty">
        現在、公開中の町内会紹介はありません。
      </p>
    `;
        return;
    }

    container.innerHTML = posts
        .map(createNeighborhoodCard)
        .join("");
}

/**
 * エラーを画面へ表示する
 */
function renderNeighborhoodError(error) {
    console.error("町内会紹介の取得に失敗しました。", error);

    const container = document.getElementById(
        NEIGHBORHOOD_CONFIG.containerId
    );

    if (!container) {
        return;
    }

    container.innerHTML = `
    <p class="neighborhood-error">
      町内会情報を読み込めませんでした。
      時間をおいて再度ご覧ください。
    </p>
  `;
}

/**
 * 初期処理
 */
async function initializeNeighborhoodPosts() {
    try {
        const categoryId = await fetchNeighborhoodCategoryId();
        const posts = await fetchNeighborhoodPosts(categoryId);

        renderNeighborhoodPosts(posts);
    } catch (error) {
        renderNeighborhoodError(error);
    }
}

document.addEventListener(
    "DOMContentLoaded",
    initializeNeighborhoodPosts
);