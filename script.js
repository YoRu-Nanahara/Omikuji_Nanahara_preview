function getTodayString() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
const STORAGE_KEY = "omikuji-last-date";
function checkIfDrawnToday() {
  const lastDate = localStorage.getItem(STORAGE_KEY);
  const today = getTodayString();

  if (lastDate === today) {
    // 今天已抽過 → 鎖定按鈕
    drawBtn.style.animation = "none";
    drawBtn.style.filter = "grayscale(100%)";
    drawBtn.style.cursor = "default";
    drawBtn.style.pointerEvents = "none";
    drawn = true;
  }
}


function playBGMWithFadeIn() {
  if (!bgm) return; // 保險，避免錯誤

  bgm.volume = 0;

  const playPromise = bgm.play();

  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // 某些手機需要先點擊畫面
      document.addEventListener("click", () => {
        bgm.play();
      }, { once: true });
    });
  }

  let volume = 0;
  const fadeInterval = setInterval(() => {
    volume += 0.05;
    if (volume >= 1) {
      volume = 1;
      clearInterval(fadeInterval);
    }
    bgm.volume = volume;
  }, 200);
}


/* ===== 畫面等比例縮放 ===== */
function scaleStage() {
  const stage = document.querySelector(".stage");
  const scaleX = window.innerWidth / 1080;
  const scaleY = window.innerHeight / 1920;
  const scale = Math.min(scaleX, scaleY);
  stage.style.transform = `scale(${scale})`;
}
window.addEventListener("resize", scaleStage);
let bgm;
let drawSound;

window.addEventListener("load", () => {
  scaleStage();
  checkIfDrawnToday();

  bgm = document.getElementById("bgm");
  drawSound = document.getElementById("drawSound");

  playBGMWithFadeIn();
});





/* ===== 籤紙資料 ===== */
const omikuji = document.getElementById("omikuji");
const drawBtn = document.getElementById("drawBtn");

const images = [
  "images/omikuji1.png",
  "images/omikuji2.png",
  "images/omikuji3.png",
  "images/omikuji4.png",
  "images/omikuji5.png",
  "images/omikuji6.png",
  "images/omikuji7.png"
];

/* ===== 機率表（加起來 95 沒關係，程式會自動比例化）===== */
const weights = [16, 35, 17, 1, 1, 15, 10];


/* ===== 隨機輪播（不重複上一張）===== */
let currentIndex = 0;
let interval;
let drawn = false;

function getRandomIndexExcept(lastIndex) {
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * images.length);
  } while (newIndex === lastIndex);
  return newIndex;
}

function startShuffle() {
  interval = setInterval(() => {
    currentIndex = getRandomIndexExcept(currentIndex);
    omikuji.src = images[currentIndex];
  }, 120);
}

function stopShuffle() {
  clearInterval(interval);
}


/* ===== 加權亂數抽真正結果 ===== */
function getWeightedResult() {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < weights.length; i++) {
    if (random < weights[i]) {
      return i;
    }
    random -= weights[i];
  }
  return 0;
}


/* ===== 點擊抽籤 ===== */
drawBtn.addEventListener("click", () => {
  if (drawn) return;
  drawn = true;

  stopShuffle();

  // 播放點擊音效
  playDrawSound();

  // 抽出真正結果
  const resultIndex = getWeightedResult();
  omikuji.src = images[resultIndex];
  omikuji.classList.add("glow");

  // 按鈕進入「已使用」狀態
  drawBtn.style.animation = "none";           // 停止呼吸動畫
  drawBtn.style.filter = "grayscale(100%)";  // 變成灰階
  drawBtn.style.cursor = "default";
  drawBtn.style.pointerEvents = "none";

  // 記錄今天已抽
  localStorage.setItem(STORAGE_KEY, getTodayString());
});

/* ===== 點擊音效函式 ===== */
function playDrawSound() {
  if (!drawSound) return;

  // 壓低 BGM
  if (bgm) bgm.volume = 0.3;

  drawSound.pause();
  drawSound.currentTime = 0;
  drawSound.volume = 1;

  const playPromise = drawSound.play();
  if (playPromise !== undefined) {
    playPromise.catch(err => console.log("音效播放失敗:", err));
  }

  // 0.4 秒後恢復 BGM 音量
  setTimeout(() => {
    if (bgm) bgm.volume = 1;
  }, 400);
}

/* ===== 啟動輪播 ===== */
startShuffle();
