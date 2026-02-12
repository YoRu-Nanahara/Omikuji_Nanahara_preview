/* =========================
   Screenshot Support Guard + English Alert
========================= */

// 你想要的英文提示文字（可自行改）
const SCREENSHOT_UNSUPPORTED_MSG =
  "Sorry — your browser/device can’t generate screenshots here.\n\n" +
  "Please try one of the following:\n" +
  "• Use Chrome / Edge / Safari (latest)\n" +
  "• Disable strict tracking protection / ad blockers\n" +
  "• Make sure images are fully loaded\n" +
  "• Try a different device";

// 簡易彈窗（不依賴 modal，不會跟你 UI 打架）
function showScreenshotAlert(message = SCREENSHOT_UNSUPPORTED_MSG) {
  // 如果已存在就先移除（避免疊太多）
  const old = document.getElementById("screenshotAlertOverlay");
  if (old) old.remove();

  const overlay = document.createElement("div");
  overlay.id = "screenshotAlertOverlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.75)";
  overlay.style.zIndex = "30000";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "24px";

  const card = document.createElement("div");
  card.style.width = "min(720px, 92vw)";
  card.style.background = "#fff";
  card.style.borderRadius = "20px";
  card.style.padding = "22px 22px 18px";
  card.style.boxSizing = "border-box";
  card.style.fontFamily = "'Open Sans', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  card.style.color = "#2b2b2b";
  card.style.lineHeight = "1.45";

  const title = document.createElement("div");
  title.textContent = "Screenshot unavailable";
  title.style.fontSize = "20px";
  title.style.fontWeight = "700";
  title.style.marginBottom = "10px";

  const body = document.createElement("pre");
  body.textContent = message;
  body.style.whiteSpace = "pre-wrap";
  body.style.margin = "0 0 14px 0";
  body.style.fontSize = "15px";

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.justifyContent = "flex-end";
  btnRow.style.gap = "10px";

  const okBtn = document.createElement("button");
  okBtn.textContent = "OK";
  okBtn.style.border = "none";
  okBtn.style.borderRadius = "14px";
  okBtn.style.padding = "10px 16px";
  okBtn.style.cursor = "pointer";
  okBtn.style.fontWeight = "700";

  okBtn.addEventListener("click", () => overlay.remove());

  // 點背景也能關
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  btnRow.appendChild(okBtn);
  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(btnRow);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// 基本能力檢查：不是保證成功，但能提前擋掉很舊或奇怪環境
function canAttemptScreenshot() {
  try {
    // html2canvas 是否載入
    if (typeof html2canvas !== "function") return false;

    // Canvas 是否可用
    const c = document.createElement("canvas");
    const ctx = c.getContext && c.getContext("2d");
    if (!ctx) return false;

    // toDataURL 是否存在
    if (typeof c.toDataURL !== "function") return false;

    // Promise 是否存在（你的流程大量用到）
    if (typeof Promise === "undefined") return false;

    return true;
  } catch {
    return false;
  }
}

// 包一層：統一處理「不支援/失敗」提示
async function safeScreenshot(run, contextLabel = "Screenshot") {
  if (!canAttemptScreenshot()) {
    console.warn(`[${contextLabel}] capability check failed`);
    showScreenshotAlert();
    return null;
  }

  try {
    return await run();
  } catch (err) {
    console.error(`[${contextLabel}] failed:`, err);

    // 常見錯誤：canvas 被 tainted（跨域圖片沒 CORS）
    const msg = String(err?.message || err || "");
    if (msg.toLowerCase().includes("tainted") || msg.toLowerCase().includes("security")) {
      showScreenshotAlert(
        "Sorry — the screenshot could not be generated because the canvas was blocked by browser security rules.\n\n" +
        "This usually happens when an image is loaded without proper CORS headers.\n\n" +
        "Please try:\n" +
        "• Use the official site URL (not a file:// path)\n" +
        "• Ensure all images are from the same domain, or enable CORS\n" +
        "• Try Chrome / Edge / Safari (latest)"
      );
    } else {
      showScreenshotAlert();
    }
    return null;
  }
}


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
  // Menu 一開始存在
  menuScreen.classList.remove("hidden");

  // 讓 menu-content 開始浮現
  const menuContent = document.querySelector("#menuScreen .menu-content");
  setTimeout(() => {
    menuContent.classList.add("show");
  }, 50); // 微延遲，保證 CSS transition 被觸發

  // Loading 畫面淡出
  loadingScreen.style.opacity = "0";
  loadingScreen.style.transition = "opacity 1.5s ease";

  // 完全移除 loading 畫面
  setTimeout(() => {
    loadingScreen.style.display = "none";
  }, 1500);
}




const menuScreen = document.getElementById("menuScreen");

// === 封存祝福卡片功能（暫停）===
// blessingCard.addEventListener("click", () => {
//   ...
// });
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

  // 取得 Firebase reference
  const blessingRef = firebase.database().ref("nanaharaBlessings");
  const countRef = firebase.database().ref("nanaharaBlessingsCount");

    // 每次點擊都 push 一筆祝福
  blessingsRef.push({
    timestamp: Date.now(),
    device: navigator.userAgent
  });

  // 同步更新總數
  countRef.transaction(current => (current || 0) + 1, (error, committed, snapshot) => {
    if (error) {
      console.error("更新總數失敗：", error);
    } else if (!committed) {
      console.log("Transaction 未提交");
    } else {
      console.log("祝福總數：", snapshot.val());
    }
  });

  // 卡片動畫
  blessingCard.classList.remove("card-animate");
  blessingWrapper.classList.add("card-hide");

  // 導覽頁淡出
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


const btnOmikuji = document.getElementById("btnOmikuji");
const leftDoor = document.querySelector(".door.left");
const rightDoor = document.querySelector(".door.right");
const omikujiScreen = document.getElementById("omikujiScreen");

function goToScreen(fromScreen, toScreen, holdTime = 600) {
  leftDoor.classList.remove("hide", "closed");
  rightDoor.classList.remove("hide", "closed");

  leftDoor.classList.add("show");
  rightDoor.classList.add("show");

  rightDoor.addEventListener("animationend", onDoorsClosed, { once: true });

  function onDoorsClosed() {
    leftDoor.classList.add("closed");
    rightDoor.classList.add("closed");

    leftDoor.classList.remove("show");
    rightDoor.classList.remove("show");

    fromScreen.classList.add("hidden");
    toScreen.classList.remove("hidden");

    setTimeout(() => {
      requestAnimationFrame(() => {
        leftDoor.classList.remove("closed");
        rightDoor.classList.remove("closed");
        leftDoor.classList.add("hide");
        rightDoor.classList.add("hide");
      });
    }, holdTime);
  }
}




btnOmikuji.addEventListener("click", () => {
  goToScreen(menuScreen, omikujiScreen, 600);
});

// ===== Omikuji / Omamori 右上角 Menu 按鈕 =====
const btnOmikujiMenu = document.getElementById("btnOmikujiMenu");
const btnOmamoriMenu = document.getElementById("btnOmamoriMenu");

// 共用回 Menu 行為（會自動帶門動畫）
function backToMenuFrom(screenEl) {
  if (!screenEl || !menuScreen) return;

  // 如果是御守畫面，回去前保險退出 focus
  if (screenEl === omamoriScreen && typeof exitOmamoriFocusMode === "function") {
    exitOmamoriFocusMode();
  }

  if (typeof goToScreen === "function") {
    goToScreen(screenEl, menuScreen, 600);
  } else {
    // 保底：沒有門動畫就直接切
    screenEl.classList.add("hidden");
    menuScreen.classList.remove("hidden");
  }
}

if (btnOmikujiMenu) {
  btnOmikujiMenu.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    backToMenuFrom(omikujiScreen);
  });
}

if (btnOmamoriMenu) {
  btnOmamoriMenu.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    backToMenuFrom(omamoriScreen);
  });
}



// ===== 1) DOM：畫面與按鈕 =====
const omamoriScreen = document.getElementById("omamoriScreen");

const omamoriKnotImg = document.getElementById("omamoriKnot");
const omamoriTopImg = document.getElementById("omamoriTop");
const omamoriBottomImg = document.getElementById("omamoriBottom");

const btnKnotLeft = document.getElementById("btnKnotLeft");
const btnKnotRight = document.getElementById("btnKnotRight");
const btnTopLeft = document.getElementById("btnTopLeft");
const btnTopRight = document.getElementById("btnTopRight");
const btnBottomLeft = document.getElementById("btnBottomLeft");
const btnBottomRight = document.getElementById("btnBottomRight");

const btnOmamoriFinish = document.getElementById("btnOmamoriFinish");

// Menu 的御守按鈕
const btnOmamori = document.getElementById("btnOmamori");

// Focus UI
const omamoriFocusActions = document.getElementById("omamoriFocusActions");
const btnFocusMenu = document.getElementById("btnFocusMenu");
const btnFocusBackToEdit = document.getElementById("btnFocusBackToEdit");
const btnFocusCapture = document.getElementById("btnFocusCapture");

// 台詞 DOM（你原本 auto talk 會用到）
const omamoriLineLeft = document.getElementById("omamoriLineLeft");
const omamoriLineRight = document.getElementById("omamoriLineRight");


// ===== 2) 素材規格 =====
const OMAMORI_ASSETS = {
  knot: { count: 6, prefix: "images/omamori-knot-", pad: 2, ext: ".png" },
  top: { count: 5, prefix: "images/omamori-top-", pad: 2, ext: ".png" },
  bottom: { count: 5, prefix: "images/omamori-bottom-", pad: 2, ext: ".png" },
};

// ===== 3) 狀態 =====
let omamoriState = { knot: 0, top: 0, bottom: 0 };
const OMAMORI_STORAGE_KEY = "omamori-style-state-v1";

function clampIndex(n, count) {
  if (!Number.isFinite(n)) return 0;
  n = Math.floor(n);
  if (n < 0) return 0;
  if (n >= count) return count - 1;
  return n;
}

function loadOmamoriState() {
  try {
    const raw = localStorage.getItem(OMAMORI_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);

    if (typeof parsed?.knot === "number") omamoriState.knot = clampIndex(parsed.knot, OMAMORI_ASSETS.knot.count);
    if (typeof parsed?.top === "number") omamoriState.top = clampIndex(parsed.top, OMAMORI_ASSETS.top.count);
    if (typeof parsed?.bottom === "number") omamoriState.bottom = clampIndex(parsed.bottom, OMAMORI_ASSETS.bottom.count);
  } catch (e) {
    console.warn("Omamori state parse failed:", e);
  }
}

function saveOmamoriState() {
  try {
    localStorage.setItem(OMAMORI_STORAGE_KEY, JSON.stringify(omamoriState));
  } catch (e) {}
}

function toFilePath(part, index0) {
  const cfg = OMAMORI_ASSETS[part];
  const num = String(index0 + 1).padStart(cfg.pad, "0");
  return `${cfg.prefix}${num}${cfg.ext}`;
}

function applyOmamoriImages() {
  if (omamoriKnotImg) omamoriKnotImg.src = toFilePath("knot", omamoriState.knot);
  if (omamoriTopImg) omamoriTopImg.src = toFilePath("top", omamoriState.top);
  if (omamoriBottomImg) omamoriBottomImg.src = toFilePath("bottom", omamoriState.bottom);
}


// ===== 4) 部件切換 =====
function popOmamoriPart(part) {
  const wrapMap = { top: "wrapOmamoriTop", bottom: "wrapOmamoriBottom", knot: "wrapOmamoriKnot" };
  const id = wrapMap[part];
  if (!id) return;

  const el = document.getElementById(id);
  if (!el) return;

  el.classList.remove("pop");
  void el.offsetWidth;
  el.classList.add("pop");
  el.addEventListener("animationend", () => el.classList.remove("pop"), { once: true });
}
// =========================
// Omamori 圖片預載快取（建議放外層，不塞在 bind 裡）
// =========================
const omamoriImgCache = new Map(); // url -> HTMLImageElement
let omamoriPreloadStarted = false;

function preloadOne(url) {
  if (!url) return Promise.resolve(null);
  if (omamoriImgCache.has(url)) return Promise.resolve(omamoriImgCache.get(url));

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // 同網域無害，之後上 CDN 也安全
    img.onload = async () => {
      try {
        if (img.decode) await img.decode(); // ✅ 把 decode 提前做掉
      } catch {}
      omamoriImgCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function buildAllOmamoriUrls() {
  const urls = [];
  for (let i = 0; i < OMAMORI_ASSETS.knot.count; i++) urls.push(toFilePath("knot", i));
  for (let i = 0; i < OMAMORI_ASSETS.top.count; i++) urls.push(toFilePath("top", i));
  for (let i = 0; i < OMAMORI_ASSETS.bottom.count; i++) urls.push(toFilePath("bottom", i));
  return urls;
}

// 分批預載：避免一次塞爆造成卡頓
async function preloadOmamoriAllPartsBatch(batchSize = 4) {
  const urls = buildAllOmamoriUrls();
  const pending = urls.filter(u => !omamoriImgCache.has(u));

  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    await Promise.all(batch.map(preloadOne));

    // ✅ 讓出主執行緒（手機超重要）
    await new Promise(r => setTimeout(r, 16));
  }
}

function startOmamoriPreloadIdle() {
  if (omamoriPreloadStarted) return;
  omamoriPreloadStarted = true;

  const run = () => preloadOmamoriAllPartsBatch(4);

  // ✅ 盡量別搶動畫：等閒暇時再跑
  if ("requestIdleCallback" in window) {
    requestIdleCallback(run, { timeout: 1500 });
  } else {
    setTimeout(run, 700);
  }
}

let omamoriCycleBusy = false;
async function cycle(part, dir) {
  if (omamoriCycleBusy) return;      // ✅ 防連點
  omamoriCycleBusy = true;

  try {
    const count = OMAMORI_ASSETS[part].count;
    let next = omamoriState[part] + dir;
    if (next < 0) next = count - 1;
    if (next >= count) next = 0;

    const nextUrl = toFilePath(part, next);

    // ✅ 先確保下一張載入+decode完，再切換
    await preloadOne(nextUrl);

    omamoriState[part] = next;

    if (part === "knot" && omamoriKnotImg) omamoriKnotImg.src = nextUrl;
    if (part === "top" && omamoriTopImg) omamoriTopImg.src = nextUrl;
    if (part === "bottom" && omamoriBottomImg) omamoriBottomImg.src = nextUrl;

    saveOmamoriState();
    popOmamoriPart(part);
  } finally {
    omamoriCycleBusy = false;
  }
}




// ===== 5) Focus：顯示/隱藏 =====
function showOmamoriFocusActions() {
  if (omamoriFocusActions) omamoriFocusActions.classList.remove("hidden");
}

function hideOmamoriFocusActions() {
  if (omamoriFocusActions) omamoriFocusActions.classList.add("hidden");
}

// ✅ 全域可呼叫：退出聚焦
function exitOmamoriFocusMode() {
  if (!omamoriScreen) return;

  omamoriScreen.classList.remove("perfect-show", "focus");
  hideOmamoriFocusActions();

  const wrap = document.getElementById("omamoriPreviewWrap");
  if (wrap) wrap.classList.remove("omamori-finish-pop");
}

// ✅ 全域可呼叫：進入聚焦
function enterOmamoriFocusMode() {
  if (!omamoriScreen) return;

  omamoriScreen.classList.add("focus");
  showOmamoriFocusActions();

  // 御守完成瞬間彈跳一次（外層 wrapper）
  const wrap = document.getElementById("omamoriPreviewWrap");
  if (wrap) {
    wrap.classList.remove("omamori-finish-pop");
    void wrap.offsetWidth;
    wrap.classList.add("omamori-finish-pop");
    wrap.addEventListener("animationend", () => wrap.classList.remove("omamori-finish-pop"), { once: true });
  }

  // Perfect 延遲浮現
  omamoriScreen.classList.remove("perfect-show");
  setTimeout(() => omamoriScreen.classList.add("perfect-show"), 160);
}


// ===== 6) 綁定事件（只綁一次） =====
let omamoriBound = false;
function bindOmamoriControls() {
  if (omamoriBound) return;
  omamoriBound = true;

  // 部件切換

  if (btnKnotLeft) btnKnotLeft.addEventListener("click", async () => { await cycle("knot", -1); });
if (btnKnotRight) btnKnotRight.addEventListener("click", async () => { await cycle("knot",  1); });

if (btnTopLeft) btnTopLeft.addEventListener("click", async () => { await cycle("top", -1); });
if (btnTopRight) btnTopRight.addEventListener("click", async () => { await cycle("top",  1); });

if (btnBottomLeft) btnBottomLeft.addEventListener("click", async () => { await cycle("bottom", -1); });
if (btnBottomRight) btnBottomRight.addEventListener("click", async () => { await cycle("bottom",  1); });


  // 完成 -> focus
  if (btnOmamoriFinish) {
    btnOmamoriFinish.addEventListener("click", () => {
      console.log("[Omamori] finish clicked");
      enterOmamoriFocusMode();
    });
  } else {
    console.warn("[Omamori] btnOmamoriFinish not found");
  }


  // Menu -> Omamori（進入御守畫面）
  if (btnOmamori) {
    btnOmamori.addEventListener("click", () => {
      console.log("[Menu] btnOmamori clicked");

      applyOmamoriImages();
      exitOmamoriFocusMode();
setTimeout(() => {
  // 用 idle 更不干擾動畫
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => preloadOmamoriAllPartsBatch(4), { timeout: 1200 });
  } else {
    preloadOmamoriAllPartsBatch(4);
  }
}, 800);

      // ⚠️ goToScreen/menuScreen 必須存在
      if (typeof goToScreen === "function" && menuScreen && omamoriScreen) {
        goToScreen(menuScreen, omamoriScreen, 600);
      } else {
        console.warn("[Menu] goToScreen/menuScreen/omamoriScreen not ready");
      }

      // 台詞：如果你已經有 startOmamoriAutoTalk 就讓它跑
      if (typeof startOmamoriAutoTalk === "function") {
        setTimeout(() => startOmamoriAutoTalk(), 650);
      }
      startOmamoriPreloadIdle();
    });
  } else {
    console.warn("[Menu] btnOmamori not found");
  }

  // Focus buttons
  if (btnFocusMenu) {
    btnFocusMenu.addEventListener("click", () => {
      exitOmamoriFocusMode();
      if (typeof goToScreen === "function" && omamoriScreen && menuScreen) {
        goToScreen(omamoriScreen, menuScreen, 600);
      }
    });
  }

  if (btnFocusBackToEdit) {
    btnFocusBackToEdit.addEventListener("click", () => {
      exitOmamoriFocusMode();
    });
  }

if (btnFocusCapture) {
  btnFocusCapture.addEventListener("click", async () => {
  console.log("[Omamori] capture clicked");
  await captureOmamoriFinal();
});

}

}


// ===== 7) 初始化 =====
window.addEventListener("load", () => {
  loadOmamoriState();
  applyOmamoriImages();
  bindOmamoriControls();
});




/* =========================
   Omamori 隨機台詞系統
========================= */





// 1️⃣ 台詞資料
const OMAMORI_LINES = {
  left: [
    "So many colors... which one should I choose?",
    "This design looks quite nice. What a keen eye.",
    "I remember when I was young, Master would sometimes sew small ornaments like these.",
    "Every stitch carries a thought, this is something worth choosing carefully.",
    "Seeking advice from others at the right moment is also part of learning.",
    "I suppose delicate handiwork isn’t really my strength. sis has always been better at it."
  ],
  right: [
  "There is no need to hurry the result. Even moments of quiet uncertainty may gently nourish a heartfelt wish as it begins to bloom.",
  "Since becoming the head of the family, I have made omamori for everyone each year. For Chifuyu? Of course—a special one just for my dear little sister.",
  "I wonder how everyone at Strega has been lately. If circumstances allow, I would like to make a few for Laura-sama and the others as well.",
  "I had hoped to invite Nao-sama too, but she appears to be quite occupied with guiding new disciples these days.",
  "If you find yourself feeling weary, perhaps a short rest with some tea might help. Sanae prepares it with a delicate fragrance.",
  "The bonds between people seem to intertwine like threads. I sincerely hope that all we hold dear may continue on, gently and for a long time.",
  "Recently, we have been blessed with many visitors to the shrine. Their earnest feelings were carried by the wind and the scent of flowers."
]

};


/* =========================
   Omamori 自動隨機（左右獨立）
   - 左右各自 10~15 秒隨機變化
   - 不連續同一句
   - 變化時：該邊差分切換 + 彈跳
========================= */

// 如果你前面已經宣告過這兩個，就把下面兩行刪掉避免重複
const omamoriCharLeft = document.getElementById("omamoriCharLeft");
const omamoriCharRight = document.getElementById("omamoriCharRight");

// 角色差分（01/02）
const OMAMORI_CHAR_VARIANTS = {
  left: [
    "images/omamori-characters-left-01.png",
    "images/omamori-characters-left-02.png",
  ],
  right: [
    "images/omamori-characters-right-01.png",
    "images/omamori-characters-right-02.png",
  ],
};

// 左右各自記錄上一句 index（避免連續同句）
let lastLineIndex = { left: -1, right: -1 };

// 左右各自記錄上一個差分 index（用 toggle 保證不連續同張）
let lastVariantIndex = { left: 0, right: 0 };

// 左右各自計時器（獨立）
let omamoriTalkTimer = { left: null, right: null };

/* 7~15 秒隨機 */
function getRandomIntervalMs() {
  return 7000 + Math.floor(Math.random() * 8000); // 
}

/* 從 list 中抽一個「不等於 lastIndex」的 index */
function pickIndexNoRepeat(listLength, lastIndex) {
  if (!Number.isFinite(listLength) || listLength <= 0) return 0;
  if (listLength === 1) return 0;

  let idx = Math.floor(Math.random() * listLength);
  if (idx === lastIndex) {
    // 這個寫法能確保不是同一個，同時仍具隨機性
    idx = (idx + 1 + Math.floor(Math.random() * (listLength - 1))) % listLength;
  }
  return idx;
}

/* 切差分：01 <-> 02（保證不連續同張） */
function toggleCharacterVariant(side) {
  const variants = OMAMORI_CHAR_VARIANTS[side];
  if (!variants || variants.length < 2) return 0;

  const next = lastVariantIndex[side] === 0 ? 1 : 0;
  lastVariantIndex[side] = next;
  return next;
}

/* 角色彈跳：你之前寫的 npc-pop 邏輯可以沿用；這裡提供保險版 */
function popCharacter(imgEl) {
  if (!imgEl) return;

  imgEl.classList.remove("npc-pop");
  void imgEl.offsetWidth; // reflow，確保每次都能重新觸發動畫
  imgEl.classList.add("npc-pop");

  imgEl.addEventListener(
    "animationend",
    () => imgEl.classList.remove("npc-pop"),
    { once: true }
  );
}

/* 單邊（left 或 right）做一次變化：換一句 + 換差分 + 彈跳 */
function omamoriChangeOneSide(side) {
  // 1) 如果不在 omamori 畫面，直接停掉該邊計時器（避免背景亂跑）
  if (!omamoriScreen || omamoriScreen.classList.contains("hidden")) {
    stopOmamoriAutoTalk(side);
    return;
  }

  // 2) 換台詞（不連續）
  if (side === "left" && omamoriLineLeft && OMAMORI_LINES?.left?.length) {
    const len = OMAMORI_LINES.left.length;
    const idx = pickIndexNoRepeat(len, lastLineIndex.left);
    lastLineIndex.left = idx;
    typeLine("left", omamoriLineLeft, OMAMORI_LINES.left[idx]);
  }

  if (side === "right" && omamoriLineRight && OMAMORI_LINES?.right?.length) {
    const len = OMAMORI_LINES.right.length;
    const idx = pickIndexNoRepeat(len, lastLineIndex.right);
    lastLineIndex.right = idx;
    typeLine("right", omamoriLineRight, OMAMORI_LINES.right[idx]);
  }

  // 3) 換差分 + 彈跳（只動該邊）
  if (side === "left" && omamoriCharLeft) {
    const v = toggleCharacterVariant("left");
    omamoriCharLeft.src = OMAMORI_CHAR_VARIANTS.left[v];
    popCharacter(omamoriCharLeft);
  }

  if (side === "right" && omamoriCharRight) {
    const v = toggleCharacterVariant("right");
    omamoriCharRight.src = OMAMORI_CHAR_VARIANTS.right[v];
    popCharacter(omamoriCharRight);
  }

  // 4) 排程下一次（只排該邊）
  scheduleNextOmamoriChange(side);
}

/* 排程下一次（單邊） */
function scheduleNextOmamoriChange(side) {
  stopOmamoriAutoTalk(side); // 防止同邊疊 timer
  omamoriTalkTimer[side] = setTimeout(() => omamoriChangeOneSide(side), getRandomIntervalMs());
}

/* 停止（單邊或全部） */
function stopOmamoriAutoTalk(side = "both") {
  if (side === "left" || side === "both") {
    if (omamoriTalkTimer.left) {
      clearTimeout(omamoriTalkTimer.left);
      omamoriTalkTimer.left = null;
    }
  }
  if (side === "right" || side === "both") {
    if (omamoriTalkTimer.right) {
      clearTimeout(omamoriTalkTimer.right);
      omamoriTalkTimer.right = null;
    }
  }
}

/* 開始（左右獨立） */
function startOmamoriAutoTalk() {
  if (omamoriLineLeft && OMAMORI_LINES?.left?.length) {
    const idx = pickIndexNoRepeat(OMAMORI_LINES.left.length, lastLineIndex.left);
    lastLineIndex.left = idx;
    typeLine("left", omamoriLineLeft, OMAMORI_LINES.left[idx]); // ✅ 逐字
  }

  if (omamoriLineRight && OMAMORI_LINES?.right?.length) {
    const idx = pickIndexNoRepeat(OMAMORI_LINES.right.length, lastLineIndex.right);
    lastLineIndex.right = idx;
    typeLine("right", omamoriLineRight, OMAMORI_LINES.right[idx]); // ✅ 逐字
  }

  scheduleNextOmamoriChange("left");
  scheduleNextOmamoriChange("right");
}


/* =========================
   Typewriter（逐字顯示）
========================= */

// 每一邊各自一個控制器（用來中止上一句）
const typewriterState = {
  left:  { timer: null, token: 0, fullText: "" },
  right: { timer: null, token: 0, fullText: "" },
};

// 你可以調這個：越小越快（ms/字）
const TYPE_SPEED_BASE = 20; // 建議 22~35
const TYPE_SPEED_JITTER = 18; // 隨機抖動，讓節奏更像人在說話

// 標點停頓（很像遊戲）
function getPunctuationDelay(ch) {
  if (ch === "…" ) return 140;
  if (ch === "." || ch === "!" || ch === "?") return 220;
  if (ch === "," ) return 120;
  if (ch === "，" ) return 140;
  if (ch === "。" || ch === "！" || ch === "？") return 260;
  if (ch === "、" ) return 140;
  if (ch === "—" ) return 120;
  if (ch === "：" || ch === ":" || ch === ";" || ch === "；") return 160;
  if (ch === "）" || ch === ")" ) return 80;
  return 0;
}

// 中止某一邊正在打的字
function stopTyping(side) {
  const st = typewriterState[side];
  if (!st) return;
  st.token += 1;
  if (st.timer) {
    clearTimeout(st.timer);
    st.timer = null;
  }
}

// 立即顯示完整句（可做成「點一下跳過逐字」）
function revealFullLine(side, el) {
  const st = typewriterState[side];
  if (!st || !el) return;
  stopTyping(side);
  el.textContent = st.fullText || "";
}

// 逐字輸出
function typeLine(side, el, text, opts = {}) {
  if (!el) return;

  const st = typewriterState[side];
  if (!st) return;

  // 先中止同側上一句
  stopTyping(side);

  st.fullText = text;
  const myToken = st.token; // 用 token 防止異步串台

  // 是否先清空
  if (opts.clear !== false) el.textContent = "";



let i = 0;
 const chars = Array.from(text); // 支援 emoji/特殊字元，不會切壞
const step = () => {
  if (typewriterState[side].token !== myToken) return;

  if (i > chars.length) {
    st.timer = null;
    return;
  }

  el.textContent = text.slice(0, i);
  const ch = chars[i - 1];

  const base = opts.speedBase ?? TYPE_SPEED_BASE;
  const jitter = opts.speedJitter ?? TYPE_SPEED_JITTER;

  let delay = base + Math.random() * jitter;
  if (ch) delay += getPunctuationDelay(ch);

  i += 1; // ✅ 這行必須有：推進到下一個字

  st.timer = setTimeout(step, delay);
};


  step();
}


const omamoriCaptureStage = document.getElementById("omamoriCaptureStage");
const capTop = document.getElementById("capTop");
const capBottom = document.getElementById("capBottom");
const capKnot = document.getElementById("capKnot");

function buildOmamoriCaptureComposition() {
  if (!capTop || !capBottom || !capKnot) return false;
  if (!omamoriTopImg || !omamoriBottomImg || !omamoriKnotImg) return false;

  capTop.src = omamoriTopImg.src;
  capBottom.src = omamoriBottomImg.src;
  capKnot.src = omamoriKnotImg.src;

  return true;
}

function waitForImage(img) {
  return new Promise((resolve) => {
    if (!img) return resolve();
    if (img.complete && img.naturalWidth > 0) return resolve();
    img.addEventListener("load", resolve, { once: true });
    img.addEventListener("error", resolve, { once: true }); // error 也不要卡死
  });
}

/* =========================================================
   Omamori Capture (Canvas Composition + OUTLINE Glow)
   - Build omamori into offscreen canvas
   - Apply ONE glow around combined silhouette
   - Output: 976x1814 PNG
========================================================= */

(function initOmamoriCaptureModule() {
  const $ = (id) => document.getElementById(id);

  const omamoriTopImg = $("omamoriTop");
  const omamoriBottomImg = $("omamoriBottom");
  const omamoriKnotImg = $("omamoriKnot");

  const btnFocusCapture = $("btnFocusCapture");

  const resultModal = $("resultModal");
  const resultImage = $("resultImage");

  if (!btnFocusCapture) {
    console.warn("[OmamoriCapture] #btnFocusCapture not found");
    return;
  }
  if (!resultModal || !resultImage) {
    console.warn("[OmamoriCapture] resultModal/resultImage not found");
    return;
  }
  if (!omamoriTopImg || !omamoriBottomImg || !omamoriKnotImg) {
    console.warn("[OmamoriCapture] omamoriTop/Bottom/Knot img not found");
    return;
  }

  // =========================
  // 1) Screenshot unsupported alert (English)
  // =========================

  const SCREENSHOT_UNSUPPORTED_MSG =
    "Sorry — your browser/device can’t generate screenshots here.\n\n" +
    "Please try one of the following:\n" +
    "• Use Chrome / Edge / Safari (latest)\n" +
    "• Disable strict tracking protection / ad blockers\n" +
    "• Make sure images are fully loaded\n" +
    "• Try a different device";

  function showScreenshotAlert(message = SCREENSHOT_UNSUPPORTED_MSG) {
    const old = document.getElementById("screenshotAlertOverlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "screenshotAlertOverlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.75)";
    overlay.style.zIndex = "30000";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "24px";

    const card = document.createElement("div");
    card.style.width = "min(720px, 92vw)";
    card.style.background = "#fff";
    card.style.borderRadius = "20px";
    card.style.padding = "22px 22px 18px";
    card.style.boxSizing = "border-box";
    card.style.fontFamily =
      "'Open Sans', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    card.style.color = "#2b2b2b";
    card.style.lineHeight = "1.45";

    const title = document.createElement("div");
    title.textContent = "Screenshot unavailable";
    title.style.fontSize = "20px";
    title.style.fontWeight = "700";
    title.style.marginBottom = "10px";

    const body = document.createElement("pre");
    body.textContent = message;
    body.style.whiteSpace = "pre-wrap";
    body.style.margin = "0 0 14px 0";
    body.style.fontSize = "15px";

    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.justifyContent = "flex-end";

    const okBtn = document.createElement("button");
    okBtn.textContent = "OK";
    okBtn.style.border = "none";
    okBtn.style.borderRadius = "14px";
    okBtn.style.padding = "10px 16px";
    okBtn.style.cursor = "pointer";
    okBtn.style.fontWeight = "700";

    okBtn.addEventListener("click", () => overlay.remove());

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    btnRow.appendChild(okBtn);
    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function canAttemptCanvasCapture() {
    try {
      const c = document.createElement("canvas");
      const ctx = c.getContext && c.getContext("2d");
      if (!ctx) return false;
      if (typeof c.toDataURL !== "function") return false;
      return true;
    } catch {
      return false;
    }
  }

  function notifyCaptureUnsupported(err) {
    const raw = String(err?.message || err || "");
    const low = raw.toLowerCase();

    if (low.includes("tainted") || low.includes("security")) {
      showScreenshotAlert(
        "Sorry — the screenshot could not be generated because browser security rules blocked the canvas.\n\n" +
          "This usually happens when images are loaded without proper CORS headers.\n\n" +
          "Please try:\n" +
          "• Open the site via https (not file://)\n" +
          "• Ensure all images are from the same domain\n" +
          "• Try Chrome / Edge / Safari (latest)"
      );
      return;
    }

    if (low.includes("memory") || low.includes("out of memory")) {
      showScreenshotAlert(
        "Sorry — your device ran out of memory while generating the screenshot.\n\n" +
          "Please try:\n" +
          "• Close other tabs/apps\n" +
          "• Try again\n" +
          "• Use a newer device/browser"
      );
      return;
    }

    showScreenshotAlert();
  }

  // =========================
  // 2) Your helpers
  // =========================

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image load failed: " + url));
      img.src = url;
    });
  }

  function drawCombinedWithOutlineGlow(ctx, combinedCanvas, x, y, w, h, opts = {}) {
    const {
      layers = [
        { color: "rgba(255,255,255,0.14)", blur: 70, strength: 1 },
        { color: "rgba(255,215,120,0.45)", blur: 44, strength: 3 },
        { color: "rgba(255,230,180,0.70)", blur: 26, strength: 6 },
      ],
      alpha = 1,
    } = opts;

    ctx.save();
    ctx.globalAlpha = alpha;

    for (const L of layers) {
      ctx.save();
      ctx.shadowColor = L.color;
      ctx.shadowBlur = L.blur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      const times = Math.max(1, Math.floor(L.strength));
      for (let i = 0; i < times; i++) {
        ctx.drawImage(combinedCanvas, x, y, w, h);
      }
      ctx.restore();
    }

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.drawImage(combinedCanvas, x, y, w, h);

    ctx.restore();
  }

  let captureBusy = false;

  // =========================
  // 3) Main capture
  // =========================
  async function captureOmamoriFinal() {
    if (captureBusy) return;

    // ✅ 新增：不支援 → 英文提示
    if (!canAttemptCanvasCapture()) {
      notifyCaptureUnsupported(new Error("Canvas not available"));
      return;
    }

    captureBusy = true;

    try {
      const topSrc = omamoriTopImg.src;
      const bottomSrc = omamoriBottomImg.src;
      const knotSrc = omamoriKnotImg.src;

      if (!topSrc || !bottomSrc || !knotSrc) {
        notifyCaptureUnsupported(new Error("Missing image sources"));
        return;
      }

      const BG_SRC = "images/omamori-final.jpg";

      const [bg, top, bottom, knot] = await Promise.all([
        loadImage(BG_SRC),
        loadImage(topSrc),
        loadImage(bottomSrc),
        loadImage(knotSrc),
      ]);

      const OUT_W = 976;
      const OUT_H = 1814;

      // 主輸出 canvas
      const out = document.createElement("canvas");
      out.width = OUT_W;
      out.height = OUT_H;

      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context not available");
      ctx.imageSmoothingEnabled = true;

      ctx.clearRect(0, 0, OUT_W, OUT_H);
      ctx.drawImage(bg, 0, 0, OUT_W, OUT_H);

      // 御守尺寸/位置（可調）
      const omW = 600;
      const omX = Math.round((OUT_W - omW) / 2);
      const omY = 200;

      const TOP_H = 453;
      const BOTTOM_H = 342;
      const KNOT_H = 197;
      const KNOT_Y_OFFSET = 10;
      const omH = TOP_H + BOTTOM_H; // 795

      // 合成 offscreen
      const combined = document.createElement("canvas");
      combined.width = omW;
      combined.height = omH;

      const cctx = combined.getContext("2d");
      if (!cctx) throw new Error("Offscreen canvas context not available");
      cctx.imageSmoothingEnabled = true;

      cctx.clearRect(0, 0, omW, omH);
      cctx.drawImage(bottom, 0, TOP_H, omW, BOTTOM_H);
      cctx.drawImage(top, 0, 0, omW, TOP_H);
      cctx.drawImage(knot, 0, KNOT_Y_OFFSET, omW, KNOT_H);

      // 外輪廓發光 + 本體
      drawCombinedWithOutlineGlow(ctx, combined, omX, omY, omW, omH, {
        layers: [
          { color: "rgb(255, 217, 238)", blur: 78, strength: 1 },
          { color: "rgb(255, 220, 155)", blur: 48, strength: 3 },
        ],
      });

      // 顯示 modal
      resultModal.style.display = "none";
      resultImage.src = out.toDataURL("image/png");
      resultModal.style.display = "flex";

    } catch (err) {
      console.error("[OmamoriCapture] failed:", err);
      notifyCaptureUnsupported(err);
    } finally {
      captureBusy = false;
    }
  }

  // ✅ 綁一次就好：先 remove 再 add，避免你其它地方也綁過造成疊加
  btnFocusCapture.onclick = null;
  btnFocusCapture.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      captureOmamoriFinal();
    },
    { passive: false }
  );

  // debug
  window.captureOmamoriFinal = captureOmamoriFinal;

  console.log("[OmamoriCapture] module ready (with unsupported alert)");
})();












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

const weights = [16, 35, 12, 10, 8, 5, 2];
const STORAGE_KEY = "omikuji-last-date"; // 抽籤時間
const RESULT_KEY = "omikuji-result";      // 抽籤結果

/* ===== 手機縮放 ===== */
const DESIGN_W = 1080;
const DESIGN_H = 1920;

function getViewportSize() {
  // DevTools / 手機瀏覽器有時候 visualViewport 會更準，但也可能回傳怪值，所以做保底
  const vv = window.visualViewport;

  const w = vv?.width ?? window.innerWidth;
  const h = vv?.height ?? window.innerHeight;

  return {
    w: Math.max(1, w),
    h: Math.max(1, h),
  };
}

function scaleGameRoot() {
  const root = document.getElementById("gameRoot");
  if (!root) return;

  const { w, h } = getViewportSize();
  const scale = Math.min(w / DESIGN_W, h / DESIGN_H);

  // ✅ 用 CSS 變數，不要改 transform，避免覆蓋掉 translate(-50%, -50%)
  root.style.setProperty("--scale", scale.toString());
}

// ✅ resize / orientationchange / visualViewport resize 都綁上去
let resizeTimer;
function requestScale() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(scaleGameRoot, 50);
}

window.addEventListener("resize", requestScale);
window.addEventListener("orientationchange", requestScale);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", requestScale);
}

window.addEventListener("load", () => {
  initAudio();
  bindAudioUnlock();

  scaleGameRoot();
  // ⚠️ 這裡不要直接 playBGMWithFadeIn()，讓 unlockAudioOnce 來觸發
  checkIfDrawnToday();
});








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
// ✅ 音訊初始化：抓到 HTML 的 audio 元素
function initAudio() {
  bgm = document.getElementById("bgm");
  drawSound = document.getElementById("drawSound");

  if (!bgm || !drawSound) {
    console.warn("找不到 bgm 或 drawSound audio 元素");
    return;
  }

  // 保險：iOS / 部分瀏覽器需要先 load 一下
  bgm.load();
  drawSound.load();
}

// ✅ 第一次使用者互動時解鎖音訊（解決 Autoplay 被擋）
let audioUnlocked = false;
function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  // 先試著播放一下再立刻暫停，讓瀏覽器允許後續播放
  // （不會真的有聲音，因為 volume=0）
  try {
    bgm.volume = 0;
    const p = bgm.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        bgm.pause();
        bgm.currentTime = 0;
        bgm.volume = 1;

        // ✅ 現在才正式淡入播放
        playBGMWithFadeIn();
      }).catch(() => {
        // 如果還是被擋，就等下一次互動再試
        audioUnlocked = false;
      });
    }
  } catch (e) {
    audioUnlocked = false;
  }
}

// ✅ 綁定多種互動事件，確保桌機/手機都能解鎖
function bindAudioUnlock() {
  const events = ["pointerdown", "touchstart", "mousedown", "keydown"];
  events.forEach(evt => {
    document.addEventListener(evt, unlockAudioOnce, { once: true, passive: true });
  });
}

// ===== 全站按鈕點擊音效：一次套用全部 button =====
function playUISound(opts = {}) {
  if (!drawSound) return;

  const {
    duck = false,
    volume = 0.9,
    duckVolume = 0.35,
    duckMs = 220,
  } = opts;

  const prevBgmVol = bgm ? bgm.volume : 1;

  if (duck && bgm) bgm.volume = duckVolume;

  // 重新播放（避免連點時沒聲音）
  try {
    drawSound.pause();
    drawSound.currentTime = 0;
    drawSound.volume = volume;

    const p = drawSound.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {}

  if (duck && bgm) {
    setTimeout(() => {
      bgm.volume = prevBgmVol;
    }, duckMs);
  }
}
(function bindGlobalButtonSFX() {
  // 這些情況我們不想播 UI click：例如分享/儲存（會觸發系統面板）、關閉 modal 等
  // 你可依自己喜好增減
  const EXCLUDE_IDS = new Set([
    "shareBtn",
    "saveBtn",
    "closeModal",
  ]);

  // 有些按鈕（例如抽籤 drawBtn）你可能想保留它自己那套 playDrawSound()
  // 所以也把它排除，避免「按一下播兩次」
  EXCLUDE_IDS.add("drawBtn");

  // 你新增的「返回 Menu」按鈕如果希望也有音效，就不要加在排除名單
  // 如果你不希望它播（例如會太吵），就把它加進去：
  // EXCLUDE_IDS.add("btnOmikujiMenu");
  // EXCLUDE_IDS.add("btnOmamoriMenu");

  function shouldPlayForTarget(el) {
    if (!el) return false;
    if (el.id && EXCLUDE_IDS.has(el.id)) return false;

    // disabled / pointer-events none 的按鈕不播
    if (el.disabled) return false;

    // 有些時候按鈕被隱藏也不用播
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;

    return true;
  }

  document.addEventListener(
    "pointerdown",
    (e) => {
      // 找到最近的 button
      const btn = e.target.closest("button");
      if (!btn) return;

      if (!shouldPlayForTarget(btn)) return;

      // ✅ 播 UI click（預設不 duck）
      playUISound({ duck: false, volume: 0.9 });

      // 如果你希望「特定按鈕」會 duck，可以用 data 屬性控制：
      // <button ... data-duck="1">
      // 然後：
      // if (btn.dataset.duck === "1") playUISound({ duck: true });
    },
    { passive: true }
  );
})();



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
// ===== 通用按鈕點擊音效（共用 drawSound）=====
// opts.duck: 是否壓低 BGM（預設 false，避免每按一下都壓）
// opts.volume: 點擊音量（預設 0.9，比抽籤小一點比較耐聽）
// opts.duckVolume: BGM 被壓到的音量（預設 0.35）
// opts.duckMs: 壓多久（預設 220ms，UI click 通常更短）


  

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
  afterDrawCapture(); // ⭐ 抽籤完成後自動截圖
});






let sakuraCanvas;
let sakuraCtx;

window.addEventListener("load", () => {
  // ===== 先抓 DOM =====
  sakuraCanvas = document.getElementById("sakura");
  sakuraCtx = sakuraCanvas.getContext("2d");

  // 設定寬高
  sakuraCanvas.width = 1080;
  sakuraCanvas.height = 1920;

  // 初始化櫻花
  initSakuraPetals();
});

/* ===== 櫻花粒子系統 ===== */
let windTime = 0;
const sakuraImages = [
  "images/sakura1.png",
  "images/sakura2.png",
  "images/sakura3.png"
];

const loadedPetals = [];
let petals = [];
const PETAL_COUNT = 25; // 可調

function initSakuraPetals() {
  let sakuraLoadedCount = 0;
  sakuraImages.forEach(src => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      sakuraLoadedCount++;
      if (sakuraLoadedCount === sakuraImages.length) startPetals();
    };
    loadedPetals.push(img);
  });
}

function startPetals() {
  for (let i = 0; i < PETAL_COUNT; i++) {
    petals.push(createPetal(true));
  }
  requestAnimationFrame(updatePetals);
}

function createPetal(randomY = false) {
  const size = 20 + Math.random() * 40;
  return {
    img: loadedPetals[Math.floor(Math.random() * loadedPetals.length)],
    x: Math.random() * sakuraCanvas.width,
    y: randomY ? Math.random() * sakuraCanvas.height : -50,
    size: size,
    speedY: 1.5 + size / 40,
    speedX: -1.2 - Math.random() * 0.8,
    rotation: Math.random() * 360,
    rotationSpeed: -1 + Math.random() * 2,
    baseAlpha: 0.8 + Math.random() * 0.2
  };
}

function updatePetals() {
  windTime += 0.01;
  let windBase = Math.sin(windTime) * 1.2;
  let windGust = Math.sin(windTime * 3) * 0.5;
  let wind = windBase + windGust;

  sakuraCtx.clearRect(0, 0, sakuraCanvas.width, sakuraCanvas.height);

  petals.forEach(p => {
    sakuraCtx.save();
    let fadeStart = sakuraCanvas.height * 0.75;
    let fadeEnd = sakuraCanvas.height * 0.95;
    let alpha = p.baseAlpha;
    if (p.y > fadeStart) {
      alpha = p.baseAlpha * (1 - (p.y - fadeStart) / (fadeEnd - fadeStart));
    }
    sakuraCtx.globalAlpha = Math.max(alpha, 0);

    sakuraCtx.translate(p.x, p.y);
    sakuraCtx.rotate((p.rotation * Math.PI) / 180);
    sakuraCtx.drawImage(p.img, -p.size / 2, -p.size / 2, p.size, p.size);
    sakuraCtx.restore();

    p.y += p.speedY;
    p.x += p.speedX + wind * 0.3;
    p.rotation += p.rotationSpeed;

    if (p.y > sakuraCanvas.height + 60) Object.assign(p, createPetal(false));
    if (p.x > sakuraCanvas.width + 60) p.x = -60;
    if (p.x < -60) p.x = sakuraCanvas.width + 60;
  });

  requestAnimationFrame(updatePetals);
}


/* ===== 先抓 DOM 元素 ===== */
const resultModal = document.getElementById("resultModal");
const resultImage = document.getElementById("resultImage");
const shareBtn = document.getElementById("shareBtn");
const saveBtn = document.getElementById("saveBtn");
const closeModal = document.getElementById("closeModal");

/* 📸 截圖目前舞台 */
async function captureResult() {
  const root = document.getElementById("gameRoot");
  if (!root) return;

  // 用 safeScreenshot 統一處理不支援/失敗提示
  await safeScreenshot(async () => {
    // 保險：截圖前先把 modal 關掉
    
    const modal = document.getElementById("resultModal");
    const modalPrevDisplay = modal ? modal.style.display : "";
    if (modal) modal.style.display = "none";

    const canvas = await html2canvas(root, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      scale: 2,
      scrollX: 0,
      scrollY: 0,

      onclone: (clonedDoc) => {
        const clonedRoot = clonedDoc.getElementById("gameRoot");
        if (!clonedRoot) return;

        clonedRoot.style.transform = "none";
        clonedRoot.style.left = "0";
        clonedRoot.style.top = "0";
        clonedRoot.style.position = "relative";
        clonedRoot.style.margin = "0";
        clonedRoot.style.transformOrigin = "top left";

        const clonedModal = clonedDoc.getElementById("resultModal");
        if (clonedModal) clonedModal.style.display = "none";

        // ✅ 你之前加的：不要截到 Omikuji 右上角返回 Menu
        const clonedOmikujiMenuBtn = clonedDoc.getElementById("btnOmikujiMenu");
        if (clonedOmikujiMenuBtn) clonedOmikujiMenuBtn.style.display = "none";
      }
    });

    resultImage.src = canvas.toDataURL("image/png");
    if (modal) modal.style.display = "flex";
    else resultModal.style.display = "flex";

    return true;
  }, "Omikuji Screenshot");
}




/* 🎴 抽籤後觸發截圖 */
function afterDrawCapture() {
  setTimeout(() => {
    captureResult();
  }, 600); // 等 glow 動畫出現
}

/* 分享按鈕 */
shareBtn.addEventListener("click", async () => {
  if (!resultImage.src) return;

  const response = await fetch(resultImage.src);
  const blob = await response.blob();
  const file = new File([blob], "omikuji.png", { type: "image/png" });

  if (navigator.share) {
    navigator.share({
      title: "My Omikuji Result!",
      text: "I drew a fortune at Nanahara Shrine!",
      files: [file]
    });
  } else {
    alert("此裝置不支援直接分享，請先儲存圖片");
  }
});

/* 儲存按鈕 */
saveBtn.addEventListener("click", () => {
  if (!resultImage.src) return;
  const link = document.createElement("a");
  link.href = resultImage.src;
  link.download = "nanahara-omikuji.png";
  link.click();
});

/* 關閉彈窗 */
closeModal.addEventListener("click", () => {
  resultModal.style.display = "none";
  console.log("[Modal] close resultModal", new Error().stack);

});


function updateDayNightMode() {
  const hour = new Date().getHours();

  if (hour >= 18 || hour < 6) {
    document.body.classList.add("night-mode");
  } else {
    document.body.classList.remove("night-mode");
  }
}

// 進站時先判斷一次
updateDayNightMode();

// 每 5 分鐘檢查一次時間（避免剛好跨 6 點沒刷新）
setInterval(updateDayNightMode, 5 * 60 * 1000);

