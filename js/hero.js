const heroPhotos = [
  { src: "images/hero/hero000.jpg", title: "一箕地区の風景" },
  { src: "images/hero/hero001.jpg", title: "地域に残る歴史" },
  { src: "images/hero/hero002.jpg", title: "夏を感じる一箕" },
  { src: "images/hero/hero003.jpg", title: "春を感じる一箕" },
  { src: "images/hero/hero004.jpg", title: "ふるさとの景色" },
  { src: "images/hero/hero005.jpg", title: "緑あふれる一箕地区" },
  { src: "images/hero/hero006.jpg", title: "人と地域のつながり" },
  { src: "images/hero/hero007.jpg", title: "四季を感じる一箕" },
  { src: "images/hero/hero008.jpg", title: "未来へ残したい風景" }
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

function updatePhotoInfo(index){
  if(titleEl){
    titleEl.textContent = heroPhotos[index].title;
  }

  if(countEl){
    countEl.textContent = `${index + 1} / ${heroPhotos.length}`;
  }

  document.querySelectorAll(".hero-dots button").forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });
}

function showHeroImage(index){
  currentIndex = (index + heroPhotos.length) % heroPhotos.length;
  const nextPhoto = heroPhotos[currentIndex];

  if(showingFirst){
    bg2.style.backgroundImage = `url("${nextPhoto.src}")`;
    bg2.classList.add("active");
    bg1.classList.remove("active");
  }else{
    bg1.style.backgroundImage = `url("${nextPhoto.src}")`;
    bg1.classList.add("active");
    bg2.classList.remove("active");
  }

  showingFirst = !showingFirst;
  updatePhotoInfo(currentIndex);
}

function nextHeroImage(){
  showHeroImage(currentIndex + 1);
}

function prevHeroImage(){
  showHeroImage(currentIndex - 1);
}

function startSlideShow(){
  slideTimer = setInterval(nextHeroImage, 6000);
}

function resetSlideShow(){
  clearInterval(slideTimer);
  startSlideShow();
}

function createDots(){
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