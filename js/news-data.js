  const newsItems = [
  {
    date: "2026.07.01",
    category: "news",
    categoryName: "お知らせ",
    title: "一箕地区ポータルサイト Ver0.30 を公開しました",
    url: "#"
  },
  {
    date: "2026.06.28",
    category: "community",
    categoryName: "町内会",
    title: "町内会長会議の資料を掲載しました",
    url: "#"
  },
  {
    date: "2026.06.25",
    category: "event",
    categoryName: "行事",
    title: "一箕地区文化創造祭の開催について",
    url: "#"
  },
  {
    date: "2026.06.20",
    category: "disaster",
    categoryName: "防災",
    title: "熊の出没に備えた防災情報を確認しましょう",
    url: "#"
  }
];

const newsBox = document.getElementById("newsBox");

if (newsBox) {
  newsBox.innerHTML = "";

  newsItems.forEach(item => {
    const article = document.createElement("article");
    article.className = "news-row";

    article.innerHTML = `
      <span class="news-date">${item.date}</span>
      <span class="news-label">${item.category}</span>
      <h3>${item.title}</h3>
      <span class="arrow">›</span>
    `;

    article.addEventListener("click", () => {
      if (item.url && item.url !== "#") {
        location.href = item.url;
      }
    });

    newsBox.appendChild(article);
  });
}