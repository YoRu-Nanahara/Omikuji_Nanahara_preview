const omikuji = document.getElementById("omikuji");
const drawBtn = document.getElementById("drawBtn");

let bgm, drawSound;
let shuffleInterval;
let drawn = false;

const images = [
  "images/omikuji1.png",
  "images/omikuji2.png",
  "images/omikuji3.png",
  "images/omikuji4.png",
  "images/omikuji5.png",
  "images/omikuji6.png",
  "images/omikuji7.png"
];
let currentIndex = 0; // ⭐ 記住目前顯示的是哪一張籤

const weights = [16, 35, 12, 1, 1, 15, 15];
const STORAGE_KEY = "omikuji-last-date";

/* ===== 手機縮放 ===== */
function scaleStage() {
    const stage = document.querySelector(".stage");

    const scaleX = window.innerWidth / 1080;
    const scaleY = window.innerHeight / 1920;
    const scale = Math.min(scaleX, scaleY);  // 取最小值 → 保證完整顯示

    stage.style.transform = `scale(${scale})`;
}

window.addEventListener("resize", scaleStage);
window.addEventListener("load", scaleStage);


/* ===== 日期工具 ===== */
function getTodayString() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

/* ===== 檢查是否抽過 ===== */
function checkIfDrawnToday() {
  const lastDate = localStorage.getItem(STORAGE_KEY);
  const today = getTodayString();

  if (lastDate === today) {
    drawn = true;
    drawBtn.style.animation = "none";
    drawBtn.style.filter = "grayscale(100%)";
    drawBtn.style.pointerEvents = "none";
  }
}

/* ===== 輪播動畫 ===== */
function startShuffle() {
  shuffleInterval = setInterval(() => {
    let rand;
    do {
      rand = Math.floor(Math.random() * images.length);
    } while (rand === currentIndex); // 不跟現在一樣

    currentIndex = rand;
    omikuji.src = images[rand];
  }, 160);
}


function stopShuffle() {
  clearInterval(shuffleInterval);
}

/* ===== 加權隨機 ===== */
function getWeightedResult() {
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    if (rand < weights[i]) return i;
    rand -= weights[i];
  }
  return 0;
}

/* ===== BGM 淡入 ===== */
function playBGMWithFadeIn() {
  if (!bgm) return;
  bgm.volume = 0;

  bgm.play().catch(() => {
    document.addEventListener("click", () => bgm.play(), { once: true });
  });

  let volume = 0;
  const fade = setInterval(() => {
    volume += 0.05;
    if (volume >= 1) {
      volume = 1;
      clearInterval(fade);
    }
    bgm.volume = volume;
  }, 200);
}

/* ===== 抽籤音效 ===== */
function playDrawSound() {
  if (!drawSound) return;

  if (bgm) bgm.volume = 0.3;

  drawSound.pause();
  drawSound.currentTime = 0;
  drawSound.volume = 1;
  drawSound.play().catch(() => {});

  setTimeout(() => {
    if (bgm) bgm.volume = 1;
  }, 400);
}

/* ===== 點擊抽籤 ===== */
drawBtn.addEventListener("click", () => {
  if (drawn) return;
  drawn = true;

  stopShuffle();
  playDrawSound();

 const resultIndex = getWeightedResult();
currentIndex = resultIndex; // ⭐ 同步目前籤圖
omikuji.src = images[resultIndex];

  omikuji.classList.add("glow");

  drawBtn.style.animation = "none";
  drawBtn.style.filter = "grayscale(100%)";
  drawBtn.style.pointerEvents = "none";

  localStorage.setItem(STORAGE_KEY, getTodayString());
});

/* ===== 初始化 ===== */
window.addEventListener("load", () => {
  bgm = document.getElementById("bgm");
  drawSound = document.getElementById("drawSound");

  scaleStage();
  checkIfDrawnToday();
  playBGMWithFadeIn();
  startShuffle();
});

/* ===== 櫻花粒子系統 ===== */
let windTime = 0;

const sakuraCanvas = document.getElementById("sakura");
const sakuraCtx = sakuraCanvas.getContext("2d");

sakuraCanvas.width = 1080;
sakuraCanvas.height = 1920;

const sakuraImages = [
  "images/sakura1.png",
  "images/sakura2.png",
  "images/sakura3.png"
];

const loadedPetals = [];
let petals = [];
const PETAL_COUNT = 25; // 數量可調

// 載入花瓣圖片
let loadedCount = 0;
sakuraImages.forEach(src => {
  const img = new Image();
  img.src = src;
  img.onload = () => {
    loadedCount++;
    if (loadedCount === sakuraImages.length) initPetals();
  };
  loadedPetals.push(img);
});

function initPetals() {
  for (let i = 0; i < PETAL_COUNT; i++) {
    petals.push(createPetal(true));
  }
  requestAnimationFrame(updatePetals);
}

function createPetal(randomY = false) {
  const size = 20 + Math.random() * 40; // 大小隨機

  return {
    img: loadedPetals[Math.floor(Math.random() * loadedPetals.length)],
    x: Math.random() * sakuraCanvas.width,
    y: randomY ? Math.random() * sakuraCanvas.height : -50,
    size: size,

    // 大花瓣掉比較快，小花瓣飄比較慢
    speedY: 1.5 + size / 40,

    speedX: -1.2 - Math.random() * 0.8, // 固定往左

    rotation: Math.random() * 360,
    rotationSpeed: -1 + Math.random() * 2,
    baseAlpha: 0.8 + Math.random() * 0.2
  };
}


function updatePetals() {
 windTime += 0.01;  

// 風力主節奏（慢）
let windBase = Math.sin(windTime) * 1.2;

// 陣風節奏（比較快的小波動）
let windGust = Math.sin(windTime * 3) * 0.5;

// 最終風力
let wind = windBase + windGust;

  sakuraCtx.clearRect(0, 0, sakuraCanvas.width, sakuraCanvas.height);

  petals.forEach(p => {
    sakuraCtx.save();
  let fadeStart = sakuraCanvas.height * 0.75;  // 75% 高度開始淡出
let fadeEnd = sakuraCanvas.height * 0.95;    // 接近底部幾乎透明

let alpha = p.baseAlpha;

if (p.y > fadeStart) {
  alpha = p.baseAlpha * (1 - (p.y - fadeStart) / (fadeEnd - fadeStart));
}

sakuraCtx.globalAlpha = Math.max(alpha, 0);

    sakuraCtx.translate(p.x, p.y);
    sakuraCtx.rotate(p.rotation * Math.PI / 180);
    sakuraCtx.drawImage(p.img, -p.size / 2, -p.size / 2, p.size, p.size);
    sakuraCtx.restore();

    p.y += p.speedY;
    p.x += p.speedX + wind * 0.3;
    p.rotation += p.rotationSpeed;

    if (p.y > sakuraCanvas.height + 60) {
      Object.assign(p, createPetal(false));
    }
    if (p.x > sakuraCanvas.width + 60) p.x = -60;
    if (p.x < -60) p.x = sakuraCanvas.width + 60;
  });

  requestAnimationFrame(updatePetals);
}
