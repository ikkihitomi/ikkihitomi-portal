
const heroPhotos = [
  { src: "images/hero/hero000.jpg", title: "最優秀賞「アトラスの夜に」" },
  { src: "images/hero/hero001.jpg", title: "優秀賞「春うらら、学び舎の特等席」" },
  { src: "images/hero/hero002.jpg", title: "一箕地区賞「会津の黎明」" },
  { src: "images/hero/hero003.jpg", title: "佳作作品 「夕焼け」" },
  { src: "images/hero/hero004.jpg", title: "佳作作品 「幻想的さざえ堂ライトアップ」" },
  { src: "images/hero/hero005.jpg", title: "佳作作品 「一箕の春光」" },
  {
    src: "images/hero/hero006.jpg",
    title: "青春の思い出",
    position: "center 70%"
  },
  { src: "images/hero/hero007.jpg", title: "佳作作品 「色から変化を感じとる」" },
  { src: "images/hero/hero008.jpg", title: "佳作作品 「白糸の滝」" },
  { src: "images/hero/hero009.jpg", title: "佳作作品 「ジブリの世界」" },
  {
    src: "images/hero/hero010.jpg",
    title: "佳作作品「少しだけ春」",
    position: "center top"
  },
  { src: "images/hero/hero011.jpg", title: "佳作作品 「桃色の朝雲」" },
  { src: "images/hero/hero012.jpg", title: "佳作作品 「朝焼けの虹 良いことあるかな」" }
];


const bg1 = document.querySelector(".hero-bg-1");
const bg2 = document.querySelector(".hero-bg-2");
const titleEl = document.getElementById("heroPhotoTitle");
const countEl = document.getElementById("heroPhotoCount");
const dotsEl = document.getElementById("heroDots");
const prevBtn = document.querySelector(".hero-prev");
const nextBtn = document.querySelector(".hero-next");

let currentIndex = 0;
let showingFirst = true;
let slideTimer = null;

function updatePhotoInfo(index) {
  if (titleEl) {
    titleEl.textContent = heroPhotos[index].title;
  }

  if (countEl) {
    countEl.textContent = `${index + 1} / ${heroPhotos.length}`;
  }

  document.querySelectorAll(".hero-dots button").forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });
}



function showHeroImage(index) {
  currentIndex = (index + heroPhotos.length) % heroPhotos.length;
  const nextPhoto = heroPhotos[currentIndex];

  const incomingBg = showingFirst ? bg2 : bg1;
  const outgoingBg = showingFirst ? bg1 : bg2;

  incomingBg.style.backgroundImage = `url("${nextPhoto.src}")`;
  incomingBg.style.backgroundPosition = nextPhoto.position || "center center";

  incomingBg.classList.add("active");
  outgoingBg.classList.remove("active");

  showingFirst = !showingFirst;
  updatePhotoInfo(currentIndex);
}




function nextHeroImage() {
  showHeroImage(currentIndex + 1);
}

function prevHeroImage() {
  showHeroImage(currentIndex - 1);
}

function startSlideShow() {
  slideTimer = setInterval(nextHeroImage, 6000);
}

function resetSlideShow() {
  clearInterval(slideTimer);
  startSlideShow();
}

function createDots() {
  heroPhotos.forEach((photo, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `${index + 1}枚目の写真を表示`);
    button.addEventListener("click", () => {
      showHeroImage(index);
      resetSlideShow();
    });
    dotsEl.appendChild(button);
  });
}

bg1.style.backgroundImage = `url("${heroPhotos[0].src}")`;
bg1.classList.add("active");

createDots();
updatePhotoInfo(0);
startSlideShow();

nextBtn.addEventListener("click", () => {
  nextHeroImage();
  resetSlideShow();
});

prevBtn.addEventListener("click", () => {
  prevHeroImage();
  resetSlideShow();
});