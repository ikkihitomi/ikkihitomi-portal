const fallbackNews = [
  {
    date: "2026.07.01",
    category: "news",
    categoryName: "お知らせ",
    title: "一箕地区ポータルサイト Ver0.50 の準備を開始しました",
    url: "#"
  },
  {
    date: "2026.06.30",
    category: "photo",
    categoryName: "フォト",
    title: "フォトコンテスト2025作品をトップページに掲載しています",
    url: "#"
  },
  {
    date: "2026.06.28",
    category: "community",
    categoryName: "町内会",
    title: "町内会情報の掲載準備を進めています",
    url: "#"
  }
];

const newsBox = document.getElementById("newsBox");

function renderNews(items){
  if(!newsBox) return;

  newsBox.innerHTML = "";

  items.forEach(item => {
    const article = document.createElement("article");
    article.className = "news-row";

    article.innerHTML = `
      <span class="news-date">${item.date}</span>
      <span class="news-label ${item.category}">${item.categoryName}</span>
      <h3>${item.title}</h3>
      <span class="arrow">›</span>
    `;

    article.addEventListener("click", () => {
      if(item.url && item.url !== "#"){
        location.href = item.url;
      }
    });

    newsBox.appendChild(article);
  });
}

renderNews(fallbackNews);