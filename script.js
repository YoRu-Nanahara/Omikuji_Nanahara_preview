const blessingsRef = database.ref("nanaharaBlessings");

/* ===== Loading 預載系統 ===== */
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");

// 要預載的所有素材（包含你的 loading 圖自己）
const assets = [
  "images/loading-bg.jpg",
  "images/loading-sakura.png",
  "images/bg.jpg",
  "images/shrine.png",
  "images/characters.png",
  "images/draw-btn.png",
  "images/omikuji1.png",
  "images/omikuji2.png",
  "images/omikuji3.png",
  "images/omikuji4.png",
  "images/omikuji5.png",
  "images/omikuji6.png",
  "images/omikuji7.png",
  "images/sakura1.png",
  "images/sakura2.png",
  "images/sakura3.png",
  "audio/bgm.mp3",
  "audio/draw.mp3"
];

let preloadLoadedCount = 0;

assets.forEach(src => {
  const ext = src.split(".").pop().toLowerCase();

  if (ext === "mp3") {
    const audio = new Audio();
    audio.src = src;
    audio.addEventListener("canplaythrough", updateLoadingProgress, { once: true });
  } else {
    const img = new Image();
    img.src = src;
    img.onload = updateLoadingProgress;
    img.onerror = updateLoadingProgress; // ★ 避免卡死
  }
});


/* ===== Loading 預載系統 ===== */
function updateLoadingProgress() {
  preloadLoadedCount++;
  const percent = Math.floor((preloadLoadedCount / assets.length) * 100);
  loadingText.textContent = `Loading... ${percent}%`;

  if (preloadLoadedCount === assets.length) {
    setTimeout(() => {
      hideLoadingScreen();
    }, 1000);
  }
}

/* ===== 隱藏 Loading 並顯示導覽頁 ===== */
function hideLoadingScreen() {
  // Loading 淡出
  loadingScreen.style.opacity = "0";
  loadingScreen.style.transition = "opacity 1.5s ease";

  setTimeout(() => {
    loadingScreen.style.display = "none";

    // 顯示導覽頁背景
    const introScreen = document.getElementById("introScreen");
    introScreen.style.opacity = "1";

    // 逐行文字浮現
    showIntroTextLines();
  }, 1500); // 對應 Loading fade 時間
}

const blessingWrapper = document.getElementById("blessingWrapper");
const blessingCard = document.getElementById("blessingCard");
const introScreen = document.getElementById("introScreen");

/* ===== 顯示卡片 ===== */
function showBlessingCard() {
  // 顯示 wrapper
  blessingWrapper.style.opacity = "1";
  blessingWrapper.style.pointerEvents = "auto";
  blessingWrapper.style.transition = "opacity 1s ease";

  // 啟動浮動 + 光暈動畫
  blessingCard.classList.add("card-animate");
}

/* ===== 點擊卡片飛走 ===== */
blessingCard.addEventListener("click", () => {
  blessingCard.style.pointerEvents = "none";

  // 只有第一次祝福才加
  if (!localStorage.getItem("nanaharaBlessed")) {
    const blessingRef = firebase.database().ref("nanaharaBlessings");

    blessingRef.transaction(current => {
      return (current || 0) + 1;
    }, (error, committed, snapshot) => {
      if (error) {
        console.error("Firebase transaction 失敗：", error);
      } else if (!committed) {
        console.log("Transaction 未提交");
      } else {
        console.log("祝福成功！目前總數：", snapshot.val());
        localStorage.setItem("nanaharaBlessed", "yes");
      }
    });
  }

  blessingCard.classList.remove("card-animate");
  blessingWrapper.classList.add("card-hide");

  introScreen.style.transition = "opacity 1.2s ease";
  introScreen.style.opacity = "0";

  setTimeout(() => {
    introScreen.style.display = "none";
    blessingWrapper.style.display = "none";
  }, 1200);
});



/* ===== 文字動畫完成後才顯示卡片 ===== */
function showIntroTextLines() {
  const lines = document.querySelectorAll("#introText div");
  const lineDelay = 1.5;
  const animDuration = 4;

  lines.forEach((line, index) => {
    line.style.animation = "none";
    void line.offsetWidth;
    line.style.animation = `fadeUpLine ${animDuration}s forwards ${index * lineDelay}s`;
  });

  const totalTime = (lines.length - 1) * lineDelay + animDuration;

  setTimeout(() => {
    showBlessingCard();
  }, totalTime * 1000);
}







const omikuji = document.getElementById("omikuji");
const drawBtn = document.getElementById("drawBtn");

let bgm, drawSound;
let shuffleInterval;
let drawn = false;
let currentIndex = 0; // ⭐ 記住目前顯示的是哪一張籤

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
const STORAGE_KEY = "omikuji-last-date"; // 抽籤時間
const RESULT_KEY = "omikuji-result";      // 抽籤結果

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
window.addEventListener("load", scaleStage);

/* ===== 計算今天早上 6 點時間戳 ===== */
function getToday6AMString() {
  const now = new Date();
  let day = now.getDate();
  let month = now.getMonth();
  let year = now.getFullYear();

  // 0:00~5:59 → 前一天
  if (now.getHours() < 6) {
    const yesterday = new Date(year, month, day - 1);
    day = yesterday.getDate();
    month = yesterday.getMonth();
    year = yesterday.getFullYear();
  }

  return `${year}-${month + 1}-${day}`; // 字串比較安全
}


/* ===== 檢查是否抽過並控制輪播 ===== */
function checkIfDrawnToday() {
  const lastDrawDay = localStorage.getItem(STORAGE_KEY);
  const today6AMString = getToday6AMString();

  if (lastDrawDay === today6AMString) {
    // 已抽過，顯示結果
    drawn = true;
    const savedResult = localStorage.getItem(RESULT_KEY);
    if (savedResult !== null) {
      omikuji.src = images[Number(savedResult)];
      omikuji.classList.add("glow");
    }
    drawBtn.style.animation = "none";
    drawBtn.style.filter = "grayscale(100%)";
    drawBtn.style.pointerEvents = "none";
    stopShuffle();
  } else {
    drawn = false;
    drawBtn.style.pointerEvents = "auto";
    drawBtn.style.filter = "none";
    drawBtn.style.animation = "pulse 1.6s ease-in-out infinite";
    startShuffle();
  }
}


/* ===== 輪播動畫 ===== */
function startShuffle() {
  if (shuffleInterval) clearInterval(shuffleInterval);

  shuffleInterval = setInterval(() => {
    let rand;
    do {
      rand = Math.floor(Math.random() * images.length);
    } while (rand === currentIndex);
    currentIndex = rand;
    omikuji.src = images[rand];
  }, 120);
}

function stopShuffle() {
  if (shuffleInterval) {
    clearInterval(shuffleInterval);
    shuffleInterval = null;
  }
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
  currentIndex = resultIndex;
  omikuji.src = images[resultIndex];
  omikuji.classList.add("glow");

  // 改存字串而非 timestamp
  localStorage.setItem(STORAGE_KEY, getToday6AMString());
  localStorage.setItem(RESULT_KEY, resultIndex);

  drawBtn.style.animation = "none";
  drawBtn.style.filter = "grayscale(100%)";
  drawBtn.style.pointerEvents = "none";
});


/* ===== 初始化 ===== */
window.addEventListener("load", () => {
  bgm = document.getElementById("bgm");
  drawSound = document.getElementById("drawSound");

  scaleStage();
  playBGMWithFadeIn();
  checkIfDrawnToday();
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
let sakuraloadedCount = 0;
sakuraImages.forEach(src => {
  const img = new Image();
  img.src = src;
  img.onload = () => {
    sakuraloadedCount++;
    if (sakuraloadedCount === sakuraImages.length) initPetals();
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
