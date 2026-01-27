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

const weights = [16, 35, 12, 1, 1, 15, 15];
const STORAGE_KEY = "omikuji-last-date";

/* ===== 手機縮放 ===== */
function scaleStage() {
  const stage = document.querySelector(".stage");
  const scale = Math.min(
    window.innerWidth / 1080,
    window.innerHeight / 1920
  );
  stage.style.transform = `scale(${scale})`;
}
window.addEventListener("resize", scaleStage);

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
    } while (omikuji.src.includes(images[rand]));
    omikuji.src = images[rand];
  }, 120);
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

