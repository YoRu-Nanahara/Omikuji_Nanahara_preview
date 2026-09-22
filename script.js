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
    "images/maple1.png",
  "images/maple2.png",
  "images/maple3.png",
  
  "images/menu-bg-day-autumn.jpg",
"images/menu-bg-night-autumn.jpg",

];

let preloadLoadedCount = 0;

/*
  首屏 preload 診斷資料。
  只記錄時間，不改變原本載入流程。
*/
const preloadDebugResults = [];

const preloadBatchStart =
  performance.now();

assets.forEach((src) => {
  const img = new Image();

  const startTime =
    performance.now();

  let done = false;
  let timeoutId = null;

  const finish = (status) => {
    if (done) return;

    done = true;

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    const elapsed =
      Math.round(
        performance.now() -
          startTime
      );

    preloadDebugResults.push({
      src,
      status,
      ms: elapsed,
    });

    /*
      每張圖片完成時立即印出。

      loaded  = 正常載入
      error   = 圖片載入失敗
      timeout = 超過 8 秒保險時間
    */
    console.log(
      `[Preload] ${status} ${elapsed}ms ${src}`
    );

    /*
      超過 1.5 秒另外標示，
      手機測試時比較容易找。
    */
    if (elapsed >= 1500) {
      console.warn(
        `[Preload][SLOW] ${elapsed}ms ${src}`
      );
    }

    updateLoadingProgress();
  };

  img.onload = () => {
    finish("loaded");
  };

  img.onerror = () => {
    finish("error");
  };

  timeoutId = setTimeout(() => {
    finish("timeout");
  }, 8000);

  img.src = src;
});


/* ===== Loading 預載系統 ===== */
function updateLoadingProgress() {
  preloadLoadedCount++;

  const percent =
    Math.floor(
      (
        preloadLoadedCount /
        assets.length
      ) * 100
    );

  loadingText.textContent =
    `Loading... ${percent}%`;

  if (
    preloadLoadedCount ===
    assets.length
  ) {
    const totalElapsed =
      Math.round(
        performance.now() -
          preloadBatchStart
      );

    /*
      最慢的排最上面。
    */
    const sortedResults = [
      ...preloadDebugResults,
    ].sort(
      (a, b) => b.ms - a.ms
    );

    console.log(
      `[Preload] ALL DONE ${totalElapsed}ms`
    );

    console.table(
      sortedResults
    );

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

 setTimeout(() => {
  loadingScreen.style.display = "none";
}, 1500);

/*
  Menu 穩定後再開始 Garden 低優先預載。

  只下載場景圖，
  不 decode，
  不下載角色 spritesheet。
*/
// startGardenBackgroundPreloadIdle(3200);
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
const btnMission = document.getElementById("btnMission");
const btnGarden = document.getElementById("btnGarden");

const leftDoor = document.querySelector(".door.left");
const rightDoor = document.querySelector(".door.right");

const omikujiScreen = document.getElementById("omikujiScreen");
const gardenScreen = document.getElementById("gardenScreen");
const windGameScreen = document.getElementById("windGameScreen");
const windGameBg = document.getElementById("windGameBg");
const btnWindGameMenu = document.getElementById("btnWindGameMenu");
const windPauseOverlay = document.getElementById("windPauseOverlay");


let shrineScreenTransitionBusy = false;

function lockShrineTransitionInput() {
  shrineScreenTransitionBusy = true;

  const doors = document.getElementById("transitionDoors");
  if (doors) {
    doors.classList.add("is-blocking");
  }
}

function unlockShrineTransitionInput() {
  shrineScreenTransitionBusy = false;

  const doors = document.getElementById("transitionDoors");
  if (doors) {
    doors.classList.remove("is-blocking");
  }
}


function goToScreen(
  fromScreen,
  toScreen,
  holdTime = 600,
  onClosedReady = null,
  onScreenShown = null
) {
  if (!fromScreen || !toScreen || !leftDoor || !rightDoor) return;

  // 轉場中不接受新的畫面切換
  if (shrineScreenTransitionBusy) return;

  lockShrineTransitionInput();

  leftDoor.classList.remove("hide", "closed", "show");
  rightDoor.classList.remove("hide", "closed", "show");

  // 重新觸發門動畫
  void leftDoor.offsetWidth;

  leftDoor.classList.add("show");
  rightDoor.classList.add("show");

  rightDoor.addEventListener("animationend", onDoorsClosed, { once: true });

  async function onDoorsClosed() {
    leftDoor.classList.add("closed");
    rightDoor.classList.add("closed");

    leftDoor.classList.remove("show");
    rightDoor.classList.remove("show");

    if (typeof onClosedReady === "function") {
      await onClosedReady();
    }

    fromScreen.classList.add("hidden");
toScreen.classList.remove("hidden");

/*
  Garden 顯示狀態。
  只有目前畫面真的是 Garden 時才存在。
*/
document.body.classList.toggle(
  "garden-active",
  toScreen === gardenScreen
);

    requestAnimationFrame(() => {
  if (
    typeof onScreenShown === "function"
  ) {
    onScreenShown();
  }

  /*
    只有真的回到 Menu，
    才重新允許 Garden 背景 preload。

    如果已經全部載完，
    函式自己會直接 return。
  */
  if (toScreen === menuScreen) {
    startGardenBackgroundPreloadIdle(
      1800
    );
  }
});

    setTimeout(() => {
      requestAnimationFrame(() => {
        leftDoor.classList.remove("closed");
        rightDoor.classList.remove("closed");

        leftDoor.classList.add("hide");
        rightDoor.classList.add("hide");

        // 等開門動畫跑完後才解鎖操作
        rightDoor.addEventListener(
          "animationend",
          () => {
            unlockShrineTransitionInput();
          },
          { once: true }
        );
      });
    }, holdTime);
  }
}
const WIND_GAME_BG = {
  day: "images/wind-bg-day.jpg",
  night: "images/wind-bg-night.jpg"
};

function getWindGameModeByTime() {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6 ? "night" : "day";
}

function prepareWindGameBackground() {
  if (!windGameBg) return;

  const mode = getWindGameModeByTime();
  const nextSrc = WIND_GAME_BG[mode];

  if (windGameBg.getAttribute("src") !== nextSrc) {
    windGameBg.src = nextSrc;
  }
}

/* =========================
   Wind Game Player Setup
========================= */

const windPlayer = document.getElementById("windPlayer");
const windCrane = document.getElementById("windCrane");
const windChinatsu = document.getElementById("windChinatsu");
const windChifuyu = document.getElementById("windChifuyu");
const windSlash = document.getElementById("windSlash");

function resetWindPlayerVisual() {
  windPlayerY = 0;
  windPlayerVY = 0;
  windLastTime = 0;

  if (windAnimFrame) {
    cancelAnimationFrame(windAnimFrame);
    windAnimFrame = null;

    clearWindDebugHitboxes();
  }

  applyWindPlayerPosition();

  if (windChinatsu) {
    windChinatsu.src = "images/wind-chinatsu-down.png";
  }

  if (windChifuyu) {
    windChifuyu.src = "images/wind-chifuyu-idle.png";
  }

  if (windSlash) {
    windSlash.classList.add("hidden");
    windSlash.classList.remove("slash-active");
  }
}


// ===== Volume Settings =====
const SHRINE_BGM_VOLUME = 0.3;
const UI_CLICK_VOLUME = 0.15;
const DRAW_SOUND_VOLUME = 0.2;
const WIND_GAME_BGM_VOLUME = 0.62;
const WIND_SLASH_VOLUME = 1.0;

/* =========================
   Wind Game Audio
========================= */

const shrineBgm = document.getElementById("bgm");
const windGameBgm = document.getElementById("windGameBgm");
const windSlashSound = document.getElementById("windSlashSound");

let windGameAudioMode = false;
let windGameBgmStartedThisRound = false;

if (windGameBgm) {
  windGameBgm.loop = true;
}

function playAudioSafe(audio) {
  if (!audio) return;

  const playPromise = audio.play();

  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch((err) => {
      console.warn("[Audio] play blocked or failed:", err);
    });
  }
}

function pauseAudio(audio) {
  if (!audio) return;
  audio.pause();
}

function stopAudio(audio) {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

function enterWindGameAudioMode() {
  windGameAudioMode = true;
  windGameBgmStartedThisRound = false;

  // 進入小遊戲時，先停掉神社 BGM
  stopAudio(shrineBgm);

  // 小遊戲 BGM 也先保持停止，等倒數到 2 再播
  stopAudio(windGameBgm);

  // 保險：防止原本神社 BGM 淡入流程稍後復活
  setTimeout(() => {
    if (windGameAudioMode) stopAudio(shrineBgm);
  }, 100);

  setTimeout(() => {
    if (windGameAudioMode) stopAudio(shrineBgm);
  }, 500);
}

function playWindGameBgmFromStart() {
  if (!windGameAudioMode) return;
  if (!windGameBgm) return;

  // 這一局已經播放過，就不要重新從頭播
  if (windGameBgmStartedThisRound) return;

  windGameBgmStartedThisRound = true;

  windGameBgm.pause();
  windGameBgm.currentTime = 0;
  windGameBgm.volume = WIND_GAME_BGM_VOLUME;
  windGameBgm.loop = true;

  playAudioSafe(windGameBgm);
}

function stopWindGameBgm() {
  stopAudio(windGameBgm);
  windGameBgmStartedThisRound = false;
}

function switchToShrineBgm() {
  windGameAudioMode = false;

  stopWindGameBgm();

  if (shrineBgm) {
    shrineBgm.volume = SHRINE_BGM_VOLUME;
    playAudioSafe(shrineBgm);
  }
}

function playWindSlashSound() {
  initWindSlashSoundPool();

  if (!windSlashSoundPool.length) return;

  const audio = windSlashSoundPool[windSlashSoundPoolIndex];
  windSlashSoundPoolIndex =
    (windSlashSoundPoolIndex + 1) % windSlashSoundPool.length;

  try {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = WIND_SLASH_VOLUME;

    const p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {});
    }
  } catch {}
}


let windGameSavedNightMode = false;


let sakuraOriginalParent = null;
let sakuraOriginalNextSibling = null;

function moveSakuraIntoWindGame() {
  const canvas = document.getElementById("sakura");
  if (!canvas || !windGameScreen) return;

  if (!sakuraOriginalParent) {
    sakuraOriginalParent = canvas.parentNode;
    sakuraOriginalNextSibling = canvas.nextSibling;
  }

  if (canvas.parentNode !== windGameScreen) {
    windGameScreen.appendChild(canvas);
  }
}

function restoreSakuraFromWindGame() {
  const canvas = document.getElementById("sakura");
  if (!canvas || !sakuraOriginalParent) return;

  if (canvas.parentNode === sakuraOriginalParent) return;

  try {
    sakuraOriginalParent.insertBefore(canvas, sakuraOriginalNextSibling);
  } catch {
    sakuraOriginalParent.appendChild(canvas);
  }
}


function enterWindGamePerformanceMode() {

  // 記住進小遊戲前是不是夜晚模式
  windGameSavedNightMode = document.body.classList.contains("night-mode");

  // 小遊戲期間暫時移除夜晚模式，避免夜間圖層 / 濾鏡 / 轉場影響效能
  document.body.classList.remove("night-mode");

  // 加一個小遊戲專用 class，方便 CSS 關掉不必要效果
  document.body.classList.add("wind-game-active");

  moveSakuraIntoWindGame();

  if (typeof setSakuraWindMode === "function") {
  setSakuraWindMode("windGame");
}

}

function exitWindGamePerformanceMode() {
  document.body.classList.remove("wind-game-active");

  restoreSakuraFromWindGame();

  if (typeof setSakuraWindMode === "function") {
  setSakuraWindMode("normal");
}

  // 回主選單後，重新依照當下時間判斷日夜
  if (typeof updateDayNightMode === "function") {
    updateDayNightMode();
  } else {
    if (windGameSavedNightMode) {
      document.body.classList.add("night-mode");
    } else {
      document.body.classList.remove("night-mode");
    }
  }

  if (typeof resumeSakuraPetals === "function") {
    resumeSakuraPetals();
  }
}


/* =========================
   Garden Preload
========================= */


const gardenCompressedModeCached = {
  idle: false,
  walk: false,
  talk: false,
};

const gardenCompressedModePromises =
  new Map();


async function fetchGardenImageToHttpCache(
  src,
  timeoutMs = 12000
) {
  const controller =
    new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(
      src,
      {
        cache: "force-cache",
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    /*
      讀完整個 PNG。

      注意：
      這裡得到的仍然是 PNG 壓縮資料，
      不是數千 × 數千的 RGBA 解碼圖片。

      不建立 Image，
      不呼叫 decode()，
      不建立 GPU texture。
    */
    await response.blob();

    return true;

  } catch (err) {
    console.warn(
      "[Garden] compressed cache failed:",
      src,
      err
    );

    return false;

  } finally {
    clearTimeout(timer);
  }
}

async function precacheGardenCharacterModeCompressed(
  mode
) {
  const safeMode =
    mode === "talk"
      ? "talk"
      : mode === "walk"
        ? "walk"
        : "idle";

  /*
    這個模式已經完整放進 HTTP cache，
    就不要再下載一次。
  */
  if (
    gardenCompressedModeCached[
      safeMode
    ]
  ) {
    return;
  }

  /*
    如果同一個模式正在下載，
    直接等原本那個 Promise，
    不要再開第二組請求。
  */
  if (
    gardenCompressedModePromises.has(
      safeMode
    )
  ) {
    await gardenCompressedModePromises.get(
      safeMode
    );

    return;
  }

  /*
    只允許使用目前裝置選中的素材。

    iPad → 只會得到 -ipad 小圖
    其他 → 只會得到原尺寸大圖
  */
  const list =
    GARDEN_ACTIVE_CHARACTER_ASSETS_BY_MODE[
      safeMode
    ];

  if (!list) return;

  const promise = (async () => {
    /*
      一次只下載一個角色，
      避免兩張 spritesheet 同時搶資源。
    */
    for (const src of list) {
      await fetchGardenImageToHttpCache(
        src
      );

      await new Promise((resolve) => {
        setTimeout(resolve, 250);
      });
    }

    gardenCompressedModeCached[
      safeMode
    ] = true;
  })();

  gardenCompressedModePromises.set(
    safeMode,
    promise
  );

  try {
    await promise;
  } finally {
    gardenCompressedModePromises.delete(
      safeMode
    );
  }
}


function queueGardenCompressedModeCache(
  mode,
  delay = 0
) {
  if (!GARDEN_IPAD_SAFE_MODE) {
    return;
  }

  setTimeout(() => {
    if (
      !gardenScreen ||
      gardenScreen.classList.contains(
        "hidden"
      )
    ) {
      return;
    }

    precacheGardenCharacterModeCompressed(
      mode
    );
  }, delay);
}

/*
  Garden 角色統一使用 50% spritesheet。

  雖然檔名目前還保留 -ipad，
  但現在所有桌機 / 手機 / 平板都會使用這一套。
*/
const CHIFUYU_IDLE_SHEET_SRC =
  "images/garden/chifuyu/chifuyu-idle-sheet-ipad.png?v=1";

const CHIFUYU_WALK_SHEET_SRC =
  "images/garden/chifuyu/chifuyu-walk-sheet-ipad.png?v=1";

const CHIFUYU_TALK_SHEET_SRC =
  "images/garden/chifuyu/chifuyu-talk-sheet-ipad.png?v=1";

const CHINATSU_IDLE_SHEET_SRC =
  "images/garden/chinatsu/chinatsu-idle-sheet-ipad.png?v=1";

const CHINATSU_WALK_SHEET_SRC =
  "images/garden/chinatsu/chinatsu-walk-sheet-ipad.png?v=1";

const CHINATSU_TALK_SHEET_SRC =
  "images/garden/chinatsu/chinatsu-talk-sheet-ipad.png?v=1";




  
/*
  50% spritesheet 的 CSS logical size。

  實際 PNG 已縮小成 50%，
  但 background-size 放大回原本座標系，
  所以既有 frame position 不必修改。
*/
const GARDEN_WALK_IDLE_LOGICAL_SHEET_SIZE = 3924;
const GARDEN_TALK_LOGICAL_SHEET_SIZE = 5232;


/*
  舊 iPad 變數暫時保留成 alias，
  避免前面已寫好的 iPad preload 邏輯還有引用時報錯。

  實際上它們現在和全裝置主素材完全相同。
*/
const CHIFUYU_IDLE_SHEET_IPAD_SRC =
  CHIFUYU_IDLE_SHEET_SRC;

const CHIFUYU_WALK_SHEET_IPAD_SRC =
  CHIFUYU_WALK_SHEET_SRC;

const CHIFUYU_TALK_SHEET_IPAD_SRC =
  CHIFUYU_TALK_SHEET_SRC;

const CHINATSU_IDLE_SHEET_IPAD_SRC =
  CHINATSU_IDLE_SHEET_SRC;

const CHINATSU_WALK_SHEET_IPAD_SRC =
  CHINATSU_WALK_SHEET_SRC;

const CHINATSU_TALK_SHEET_IPAD_SRC =
  CHINATSU_TALK_SHEET_SRC;



function getGardenAnimationAsset(
  character,
  mode
) {
  const safeMode =
    mode === "talk"
      ? "talk"
      : mode === "walk"
        ? "walk"
        : "idle";

  const list =
    GARDEN_ACTIVE_CHARACTER_ASSETS_BY_MODE[
      safeMode
    ];

  const characterIndex =
    character === "chifuyu"
      ? 0
      : 1;

  return {
    src: list[characterIndex],

    logicalSize:
      safeMode === "talk"
        ? GARDEN_TALK_LOGICAL_SHEET_SIZE
        : GARDEN_WALK_IDLE_LOGICAL_SHEET_SIZE,
  };
}


let gardenAssetsLoaded = false;
let gardenAssetsPromise = null;

const GARDEN_SCENE_LAYER_ASSETS = [
  {
    selector: ".garden-bg",
    day: "images/garden/courtyard/courtyard-bg-day.jpg",
    night: "images/garden/courtyard/courtyard-bg-night.jpg",
  },

  {
    selector: ".garden-obj-karesansui-front",
    day: "images/garden/courtyard/courtyard-obj-karesansui-front.png",
    night: "images/garden/courtyard/courtyard-obj-karesansui-front-night.png",
  },

  {
    selector: ".garden-fg-building-front-edge",
    day: "images/garden/courtyard/courtyard-fg-building-front-edge.png",
    night: "images/garden/courtyard/courtyard-fg-building-front-edge-night.png",
  },

  {
    selector: ".garden-fg-lantern-left",
    day: "images/garden/courtyard/courtyard-fg-lantern-left.png",
    night: "images/garden/courtyard/courtyard-fg-lantern-left-night.png",
  },

  {
    selector: ".garden-fg-building-corner",
    day: "images/garden/courtyard/courtyard-fg-building-corner.png",
    night: "images/garden/courtyard/courtyard-fg-building-corner-night.png",
  },

  {
    selector: ".garden-fg-sakura-top",
    day: "images/garden/courtyard/courtyard-fg-sakura-top.png",
    night: "images/garden/courtyard/courtyard-fg-sakura-top-night.png",
  },

  {
  selector: ".garden-sakura-top-shadow-a",
  day: "images/garden/courtyard/courtyard-fg-sakura-shadow-01.png",
  night: "images/garden/courtyard/courtyard-fg-sakura-shadow-01-night.png",
},

{
  selector: ".garden-sakura-top-shadow-b",
  day: "images/garden/courtyard/courtyard-fg-sakura-shadow-02.png",
  night: "images/garden/courtyard/courtyard-fg-sakura-shadow-02-night.png",
},

  {
    selector: ".garden-fg-building-occluder",
    day: "images/garden/courtyard/courtyard-fg-building-occluder.png",
    night: "images/garden/courtyard/courtyard-fg-building-occluder-night.png",
  },

  {
    selector: ".garden-fg-far-area",
    day: "images/garden/courtyard/courtyard-fg-far-area.png",
    night: "images/garden/courtyard/courtyard-fg-far-area-night.png",
  },
];

/* =========================
   Moon Bridge Scene Assets
========================= */

const MOON_BRIDGE_SCENE_LAYER_ASSETS = [
  {
    selector:
      ".moon-bridge-sky",

    /*
      白天版尚未完成前，
      先暫時沿用夜間天空。
    */
    day:
      "images/garden/moon-bridge/moon-bridge-sky-night.jpg",

    night:
      "images/garden/moon-bridge/moon-bridge-sky-night.jpg",
  },


  {
    selector:
      ".moon-bridge-moon",

    /*
      月亮只在夜晚存在。
    */
    day:
      null,

    night:
      "images/garden/moon-bridge/moon-bridge-moon-night.png",
  },


  {
    selector:
      ".moon-bridge-lake",

    /*
      白天版尚未完成前，
      先暫時沿用夜間湖面。
    */
    day:
      "images/garden/moon-bridge/moon-bridge-lake-night.png",

    night:
      "images/garden/moon-bridge/moon-bridge-lake-night.png",
  },


{
  selector:
    ".moon-bridge-cloud-01",

  day:
    "images/garden/moon-bridge/moon-bridge-cloud-01-night.png",

  night:
    "images/garden/moon-bridge/moon-bridge-cloud-01-night.png",
},

{
  selector:
    ".moon-bridge-cloud-02",

  day:
    "images/garden/moon-bridge/moon-bridge-cloud-02-night.png",

  night:
    "images/garden/moon-bridge/moon-bridge-cloud-02-night.png",
},

{
  selector:
    ".moon-bridge-cloud-03",

  day:
    "images/garden/moon-bridge/moon-bridge-cloud-03-night.png",

  night:
    "images/garden/moon-bridge/moon-bridge-cloud-03-night.png",
},




  {
    selector:
      ".moon-bridge-lake-glow-01",

    day:
      "images/garden/moon-bridge/moon-bridge-lake-glow-01-night.png",

    night:
      "images/garden/moon-bridge/moon-bridge-lake-glow-01-night.png",
  },


  {
    selector:
      ".moon-bridge-lake-glow-02",

    day:
      "images/garden/moon-bridge/moon-bridge-lake-glow-02-night.png",

    night:
      "images/garden/moon-bridge/moon-bridge-lake-glow-02-night.png",
  },


  {
    selector:
      ".moon-bridge-lake-glow-03",

    day:
      "images/garden/moon-bridge/moon-bridge-lake-glow-03-night.png",

    night:
      "images/garden/moon-bridge/moon-bridge-lake-glow-03-night.png",
  },


{
  selector:
    ".moon-bridge-lake-glow-lower-01",

  day:
    "images/garden/moon-bridge/moon-bridge-lake-glow-01-night.png",

  night:
    "images/garden/moon-bridge/moon-bridge-lake-glow-01-night.png",
},

{
  selector:
    ".moon-bridge-lake-glow-lower-02",

  day:
    "images/garden/moon-bridge/moon-bridge-lake-glow-02-night.png",

  night:
    "images/garden/moon-bridge/moon-bridge-lake-glow-02-night.png",
},

{
  selector:
    ".moon-bridge-lake-glow-lower-03",

  day:
    "images/garden/moon-bridge/moon-bridge-lake-glow-03-night.png",

  night:
    "images/garden/moon-bridge/moon-bridge-lake-glow-03-night.png",
},



  {
    selector:
      ".moon-bridge-main",

    day:
      "images/garden/moon-bridge/moon-bridge-main-night.png",

    night:
      "images/garden/moon-bridge/moon-bridge-main-night.png",
  },


  {
    selector:
      ".moon-bridge-railing-front",

    day:
      "images/garden/moon-bridge/moon-bridge-railing-front-night.png",

    night:
      "images/garden/moon-bridge/moon-bridge-railing-front-night.png",
  },


  {
    selector:
      ".moon-bridge-fg-shidarezakura",

    day:
      "images/garden/moon-bridge/moon-bridge-fg-shidarezakura-night.png",

    night:
      "images/garden/moon-bridge/moon-bridge-fg-shidarezakura-night.png",
  },
];


/* =========================
   Moon Bridge Moon Test Clock
========================= */

/*
  null：
  使用玩家真實時間。

  測試時：
  儲存一天中的分鐘數。
*/
let moonBridgeMoonTestMinutes =
  null;


function getMoonBridgeMoonTimeMinutes() {
  if (
    moonBridgeMoonTestMinutes !==
    null
  ) {
    return moonBridgeMoonTestMinutes;
  }


  const now =
    new Date();


  return (
    now.getHours() * 60 +
    now.getMinutes()
  );
}


window.setMoonBridgeMoonTestTime =
  function (timeText) {
    const match =
      String(timeText).match(
        /^(\d{1,2}):(\d{2})$/
      );


    if (!match) {
      console.warn(
        "[Moon Bridge] Please use HH:MM, for example 21:30"
      );

      return;
    }


    const hour =
      Number(match[1]);

    const minute =
      Number(match[2]);


    if (
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      console.warn(
        "[Moon Bridge] Invalid time:",
        timeText
      );

      return;
    }


    moonBridgeMoonTestMinutes =
      hour * 60 + minute;


    console.log(
      `[Moon Bridge] Moon test time → ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    );


    if (
      typeof updateMoonBridgeMoonPosition ===
      "function"
    ) {
      updateMoonBridgeMoonPosition();
    }
  };


window.clearMoonBridgeMoonTestTime =
  function () {
    moonBridgeMoonTestMinutes =
      null;


    console.log(
      "[Moon Bridge] Moon test time OFF → real time"
    );


    if (
      typeof updateMoonBridgeMoonPosition ===
      "function"
    ) {
      updateMoonBridgeMoonPosition();
    }
  };


/* =========================
   Moon Bridge Moon Position
========================= */

const MOON_BRIDGE_MOON_NIGHT_SRC =
  "images/garden/moon-bridge/moon-bridge-moon-night.png";

/*
  350 × 350 月亮的移動範圍。

  18:00：
  左側、較低。

  00:00：
  中央、最高。

  06:00：
  右側、較低。
*/
const MOON_BRIDGE_MOON_START_X =
  670;

const MOON_BRIDGE_MOON_END_X =
  60;

const MOON_BRIDGE_MOON_LOW_Y =
  650;

const MOON_BRIDGE_MOON_HIGH_Y =
  120;





/* =========================
   Moon Bridge Upper Lake Glow
========================= */

function updateMoonBridgeUpperLakeGlow() {
  const minutes =
    getMoonBridgeMoonTimeMinutes();


  /*
    上方湖光顯示時間：

    22:00 ～ 01:59
  */
  const shouldShow =
    gardenViewSceneId ===
      "moonBridge" &&
    (
      minutes >= 22 * 60 ||
      minutes < 2 * 60
    );


  const glowEls =
    gardenScreen?.querySelectorAll(
      [
        ".moon-bridge-lake-glow-01",
        ".moon-bridge-lake-glow-02",
        ".moon-bridge-lake-glow-03",
      ].join(",")
    );


  if (!glowEls) {
    return;
  }


  for (const el of glowEls) {
    if (shouldShow) {

      /*
        只有這個時段，
        才真正掛上動畫。
      */
      el.classList.add(
        "is-active"
      );

      el.style.display =
        "block";

    } else {

      /*
        非湖光時段：

        - 移除動畫 class
        - 完全不渲染
      */
      el.classList.remove(
        "is-active"
      );

      el.style.display =
        "none";
    }
  }
}






/*
  根據目前時間計算月亮位置。

  不放進每幀 loop。
*/
function updateMoonBridgeMoonPosition() {
  const moonEl =
    gardenScreen?.querySelector(
      ".moon-bridge-moon"
    );

  if (!moonEl) {
    return;
  }


  /*
    玩家目前沒有觀看賞月橋，
    月亮直接隱藏即可。
  */
  if (
    gardenViewSceneId !==
    "moonBridge"
  ) {
    moonEl.style.display =
      "none";

updateMoonBridgeUpperLakeGlow();

    return;
  }


  const minutes =
    getMoonBridgeMoonTimeMinutes();


  /*
    夜晚定義：
    18:00 ～ 05:59
  */
  const isNight =
    minutes >= 18 * 60 ||
    minutes < 6 * 60;


  if (!isNight) {
    moonEl.style.display =
      "none";
updateMoonBridgeUpperLakeGlow();


    return;
  }


  /*
    轉成：

    18:00 → 0 分鐘
    00:00 → 360 分鐘
    06:00 → 720 分鐘
  */
  let elapsedNightMinutes;

  if (
    minutes >=
    18 * 60
  ) {
    elapsedNightMinutes =
      minutes - 18 * 60;
  } else {
    elapsedNightMinutes =
      minutes +
      24 * 60 -
      18 * 60;
  }


  /*
    progress：

    18:00 → 0
    00:00 → 0.5
    06:00 → 1
  */
  const progress =
    elapsedNightMinutes /
    (12 * 60);


  /*
    X：
    左 → 右
    線性移動。
  */
  const x =
    MOON_BRIDGE_MOON_START_X +
    (
      MOON_BRIDGE_MOON_END_X -
      MOON_BRIDGE_MOON_START_X
    ) *
      progress;


  /*
    Y：
    用 sin() 做拋物線感的弧線。

    progress 0：
    sin(0) = 0
    → 最低

    progress 0.5：
    sin(π/2) = 1
    → 最高

    progress 1：
    sin(π) = 0
    → 最低
  */
  const arc =
    Math.sin(
      Math.PI *
      progress
    );


  const y =
    MOON_BRIDGE_MOON_LOW_Y -
    (
      MOON_BRIDGE_MOON_LOW_Y -
      MOON_BRIDGE_MOON_HIGH_Y
    ) *
      arc;


  /*
    測試模式在真實白天也能直接看月亮。

    因為 Scene Mode 的 day
    原本會把月亮 src 留空，
    所以這裡保險補上夜間素材。
  */
  if (
    moonEl.getAttribute(
      "src"
    ) !==
    MOON_BRIDGE_MOON_NIGHT_SRC
  ) {
    moonEl.src =
      MOON_BRIDGE_MOON_NIGHT_SRC;
  }


  moonEl.style.left =
    `${x.toFixed(1)}px`;

  moonEl.style.top =
    `${y.toFixed(1)}px`;

  moonEl.style.display =
    "block";



/*
  月亮位置更新時，
  一併更新上方湖光顯示狀態。
*/
updateMoonBridgeUpperLakeGlow();




  console.log(
    "[Moon Bridge Moon]",
    {
      minutes,
      progress:
        Number(
          progress.toFixed(3)
        ),
      x:
        Math.round(x),
      y:
        Math.round(y),
    }
  );
}




/*
  月亮不需要每幀更新。

  一分鐘檢查一次就足夠，
  效能負擔可以忽略。
*/
setInterval(() => {
  if (
    document.hidden
  ) {
    return;
  }

  if (
    !gardenScreen ||
    gardenScreen.classList.contains(
      "hidden"
    )
  ) {
    return;
  }

  if (
    gardenViewSceneId !==
    "moonBridge"
  ) {
    return;
  }

  updateMoonBridgeMoonPosition();

}, 60 * 1000);





const GARDEN_SCENE_ASSETS_BY_MODE = {
  day:
    GARDEN_SCENE_LAYER_ASSETS.map(
      (item) => item.day
    ),

  night:
    GARDEN_SCENE_LAYER_ASSETS.map(
      (item) => item.night
    ),
};


/*
  暫時保留舊名稱作為 day alias，
  避免其他尚未整理到的舊引用報錯。
*/
const GARDEN_SCENE_ASSETS =
  GARDEN_SCENE_ASSETS_BY_MODE.day;


function getGardenSceneModeByTime() {
  return document.body.classList.contains(
    "night-mode"
  )
    ? "night"
    : "day";
}


function applyGardenSceneMode(
  mode = getGardenSceneModeByTime()
) {
  const safeMode =
    mode === "night"
      ? "night"
      : "day";


  const scene =
    getCurrentGardenScene();

  if (!scene) {
    return;
  }


  const sceneLayers =
    scene.sceneLayers || [];


  /*
  =========================
  先隱藏所有已登記的場景圖層
  =========================

  不再依賴：
  - 一定有 .garden-layer
  - 一定位於 #gardenScene 裡

  只要這個元素有登記在某個
  sceneLayers 素材表裡，
  切場景時就一定會被清掉。
*/
const allRegisteredSceneLayers = [
  ...GARDEN_SCENE_LAYER_ASSETS,
  ...MOON_BRIDGE_SCENE_LAYER_ASSETS,
];

for (
  const item of
  allRegisteredSceneLayers
) {
  const elements =
    gardenScreen?.querySelectorAll(
      item.selector
    );

  if (!elements) {
    continue;
  }

  for (
    const el of
    elements
  ) {
    el.style.display =
      "none";
  }
}


  /*
    =========================
    顯示目前場景需要的圖層
    =========================
  */
  for (
    const item of
    sceneLayers
  ) {
    const el =
      gardenScreen?.querySelector(
        item.selector
      );

    if (!el) {
      continue;
    }


    const nextSrc =
      item[safeMode];

    /*
      這個場景在目前模式
      沒有這張素材，就保持隱藏。
    */
    if (!nextSrc) {
      continue;
    }


    if (
      el.getAttribute("src") !==
      nextSrc
    ) {
      el.src = nextSrc;
    }


    el.style.display =
      "block";
  }
}

const GARDEN_CHARACTER_ASSETS = [
  CHIFUYU_IDLE_SHEET_SRC,
  CHIFUYU_WALK_SHEET_SRC,
  CHIFUYU_TALK_SHEET_SRC,

  CHINATSU_IDLE_SHEET_SRC,
  CHINATSU_WALK_SHEET_SRC,
  CHINATSU_TALK_SHEET_SRC,
];

const GARDEN_IMAGE_ASSETS = [
  ...GARDEN_SCENE_ASSETS,
  ...GARDEN_CHARACTER_ASSETS,
];

const GARDEN_CHARACTER_ASSETS_BY_MODE = {
  idle: [
    CHIFUYU_IDLE_SHEET_SRC,
    CHINATSU_IDLE_SHEET_SRC,
  ],

  walk: [
    CHIFUYU_WALK_SHEET_SRC,
    CHINATSU_WALK_SHEET_SRC,
  ],

  talk: [
    CHIFUYU_TALK_SHEET_SRC,
    CHINATSU_TALK_SHEET_SRC,
  ],
};


const GARDEN_IPAD_CHARACTER_ASSETS_BY_MODE = {
  idle: [
    CHIFUYU_IDLE_SHEET_IPAD_SRC,
    CHINATSU_IDLE_SHEET_IPAD_SRC,
  ],

  walk: [
    CHIFUYU_WALK_SHEET_IPAD_SRC,
    CHINATSU_WALK_SHEET_IPAD_SRC,
  ],

  talk: [
    CHIFUYU_TALK_SHEET_IPAD_SRC,
    CHINATSU_TALK_SHEET_IPAD_SRC,
  ],
};


/*
  iPadOS Safe Mode

  新版 iPadOS 有時會把自己報成 MacIntel，
  所以除了 iPad UA，也檢查：
  MacIntel + 多點觸控。
*/
const GARDEN_IPAD_SAFE_MODE = (() => {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const touchPoints =
    navigator.maxTouchPoints || 0;

  const screenWidth =
    window.screen?.width || 0;

  const screenHeight =
    window.screen?.height || 0;

  const shortSide =
    Math.min(
      screenWidth,
      screenHeight
    );

  /*
    1. 傳統 iPad UA
       → 直接判定為 iPad

    2. 新版 iPadOS 可能偽裝成 Mac
       → 必須同時符合：
         MacIntel
         多點觸控
         螢幕短邊至少 600 CSS px

    這樣手機即使回報成 MacIntel，
    也不會被誤判成 iPad。
  */
  return (
    /iPad/i.test(ua) ||
    (
      platform === "MacIntel" &&
      touchPoints > 1 &&
      shortSide >= 600
    )
  );
})();


/*
  Garden 角色素材只允許二選一。

  iPad：
  永遠只使用縮小版。

  其他裝置：
  永遠只使用原尺寸版。

  建立另一套 URL 常數本身不會下載圖片；
  只有 ACTIVE 清單裡的 URL
  才能進入 preload / warmup / 顯示流程。
*/
const GARDEN_ACTIVE_CHARACTER_ASSETS_BY_MODE =
  GARDEN_IPAD_CHARACTER_ASSETS_BY_MODE;


const GARDEN_ACTIVE_CHARACTER_ASSETS = [
  ...GARDEN_ACTIVE_CHARACTER_ASSETS_BY_MODE.idle,
  ...GARDEN_ACTIVE_CHARACTER_ASSETS_BY_MODE.walk,
  ...GARDEN_ACTIVE_CHARACTER_ASSETS_BY_MODE.talk,
];




const gardenSceneAssetsLoaded =
  new Set();

const gardenSceneModePromises =
  new Map();


function getGardenSceneAssetKey(
  sceneId,
  mode
) {
  const safeMode =
    mode === "night"
      ? "night"
      : "day";

  return `${sceneId}:${safeMode}`;
}


function isGardenSceneModeLoaded(
  sceneId,
  mode
) {
  return gardenSceneAssetsLoaded.has(
    getGardenSceneAssetKey(
      sceneId,
      mode
    )
  );
}

const gardenCharacterModeLoaded = {
  idle: false,
  walk: false,
  talk: false,
};

const gardenCharacterModePromises =
  new Map();

let gardenPendingInitialMode = null;

function preloadGardenImage(
  src,
  options = {}
) {
  const {
    decode = true,
    loadTimeoutMs = 10000,
    decodeTimeoutMs = 1800,
  } = options;

  return new Promise((resolve) => {
    const img = new Image();

    let finished = false;
    let loadTimer = null;

    const finish = (ok, reason = "") => {
      if (finished) return;

      finished = true;

      if (loadTimer) {
        clearTimeout(loadTimer);
        loadTimer = null;
      }

      resolve({
        src,
        ok,
        reason,
      });
    };

    img.onload = async () => {
      /*
        大型角色 spritesheet 可以選擇：
        只確認下載完成，不強制 decode 原始大圖。
      */
      if (!decode || !img.decode) {
        finish(true, "loaded");
        return;
      }

      /*
        Safari / WebKit 保險：
        decode() 最多只等一小段時間。

        就算 decode 沒正常 resolve，
        也不能讓整個拉門永久卡住。
      */
      try {
        await Promise.race([
          img.decode().catch(() => {}),
          new Promise((resolveDecode) => {
            setTimeout(
              resolveDecode,
              decodeTimeoutMs
            );
          }),
        ]);
      } catch {}

      finish(true, "loaded-decoded");
    };

    img.onerror = () => {
      console.warn(
        "[Garden] preload image failed:",
        src
      );

      finish(false, "error");
    };

    /*
      網路 / Safari 圖片事件保險。
      即使某張圖片永遠沒有送出 load/error，
      Garden 也不會被它永久鎖住。
    */
    if (
  Number.isFinite(loadTimeoutMs) &&
  loadTimeoutMs > 0
) {
  loadTimer = setTimeout(() => {
    console.warn(
      "[Garden] preload image timeout:",
      src
    );

    finish(false, "timeout");
  }, loadTimeoutMs);
}

    img.src = src;
  });
}


/*
  Menu 背景預載專用。

  只下載，不主動 decode。
  所以不會在玩家待在 Menu 時突然對 CPU / GPU
  施加大型 spritesheet 的解碼負擔。
*/
function preloadGardenImageDownloadOnly(src) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        src,
        ok: true,
      });
    };

    img.onerror = () => {
      resolve({
        src,
        ok: false,
      });
    };

    img.src = src;
  });
}


function waitGardenPreloadFrame() {
  return new Promise((resolve) => {
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      resolve();
    };

    requestAnimationFrame(finish);

    /*
      Safari 保險：
      就算 rAF 因特殊狀況沒有回來，
      preload 流程仍然會繼續。
    */
    setTimeout(finish, 120);
  });
}


/*
  正式進 Garden 時使用。

  不再一次 Promise.all 全部大型圖片，
  而是分批 decode。

  場景圖：一次最多 2 張
  角色 sheet：一次 1 張
*/
async function preloadGardenAssetsInBatches(
  list,
  batchSize = 1,
  options = {}
) {
  for (
    let i = 0;
    i < list.length;
    i += batchSize
  ) {
    const batch =
      list.slice(i, i + batchSize);

    await Promise.all(
      batch.map((src) =>
        preloadGardenImage(
          src,
          options
        )
      )
    );

    await waitGardenPreloadFrame();
  }
}

async function ensureGardenSceneModeReady(
  mode,
  sceneOverride = null
) {
  const scene =
    sceneOverride ||
    getCurrentGardenScene();

  if (!scene) {
    return;
  }


  const safeMode =
    mode === "night"
      ? "night"
      : "day";


  const sceneId =
    scene.id;


  const sceneKey =
    getGardenSceneAssetKey(
      sceneId,
      safeMode
    );


  /*
    這張場景的這個日夜版本
    已經完整準備過。
  */
  if (
    gardenSceneAssetsLoaded.has(
      sceneKey
    )
  ) {
    return;
  }


  /*
    同一張場景 + 同一個日夜版本
    如果正在載入，
    就共用同一個 Promise。
  */
  if (
    gardenSceneModePromises.has(
      sceneKey
    )
  ) {
    await gardenSceneModePromises.get(
      sceneKey
    );

    return;
  }


  const sceneAssets =
    getGardenSceneAssetsByMode(
      scene,
      safeMode
    );


  /*
    沒有場景圖片也視為完成，
    避免空場景一直重試。
  */
  if (
    sceneAssets.length === 0
  ) {
    gardenSceneAssetsLoaded.add(
      sceneKey
    );

    return;
  }


  const promise =
    preloadGardenAssetsInBatches(
      sceneAssets,

      /*
        iPad 一張一張，
        其他裝置兩張一批。
      */
      GARDEN_IPAD_SAFE_MODE
        ? 1
        : 2,

      {
        /*
          保留你現在原本的策略：
          iPad 不強制 decode。
        */
        decode:
          !GARDEN_IPAD_SAFE_MODE,

        loadTimeoutMs: 10000,
        decodeTimeoutMs: 1800,
      }
    );


  gardenSceneModePromises.set(
    sceneKey,
    promise
  );


  try {
    await promise;

    gardenSceneAssetsLoaded.add(
      sceneKey
    );
  } finally {
    gardenSceneModePromises.delete(
      sceneKey
    );
  }
}

async function preloadGardenCharacterModeDownloadOnly(
  mode
) {
  const safeMode =
    mode === "talk"
      ? "talk"
      : mode === "walk"
        ? "walk"
        : "idle";

  if (
    gardenCharacterModeLoaded[safeMode]
  ) {
    return;
  }

  if (
    gardenCharacterModePromises.has(
      safeMode
    )
  ) {
    await gardenCharacterModePromises.get(
      safeMode
    );

    return;
  }

 const list =
  GARDEN_ACTIVE_CHARACTER_ASSETS_BY_MODE[
    safeMode
  ];

  if (!list) return;

  const promise = (async () => {
    /*
      一次只處理一個角色。

      注意：
      這裡使用我們上一輪改好的
      decode:false。

      所以只是確保檔案進 cache，
      不強制 Safari 解整張 spritesheet。
    */
    for (const src of list) {
      await preloadGardenImage(
        src,
        {
          decode: false,
          loadTimeoutMs: 12000,
        }
      );

      await waitGardenPreloadFrame();
    }

    gardenCharacterModeLoaded[
      safeMode
    ] = true;
  })();

  gardenCharacterModePromises.set(
    safeMode,
    promise
  );

  try {
    await promise;
  } finally {
    gardenCharacterModePromises.delete(
      safeMode
    );
  }
}


function queueGardenCharacterModeDownload(
  mode,
  delay = 0
) {
  if (!GARDEN_IPAD_SAFE_MODE) {
    return;
  }

  setTimeout(() => {
    /*
      已經離開 Garden 就不要繼續。
    */
    if (
      !gardenScreen ||
      gardenScreen.classList.contains(
        "hidden"
      )
    ) {
      return;
    }

    preloadGardenCharacterModeDownloadOnly(
      mode
    ).catch((err) => {
      console.warn(
        "[Garden] deferred character preload failed:",
        mode,
        err
      );
    });
  }, delay);
}




async function preloadGardenAssets(
  initialMode = null
) {
  /*
    =========================
    只準備首次畫面必要素材
    =========================

    chat
    → Talk 兩張

    wander
    → Idle 兩張

    不再在拉門關閉期間
    一口氣處理六張角色 spritesheet。
  */

  const firstMode =
    initialMode === "chat"
      ? "talk"
      : "idle";


  /*
    場景素材只需要準備一次。
  */
  /*
  只準備目前時間需要的
  day / night 場景。
*/
const gardenSceneMode =
  getGardenSceneModeByTime();

await ensureGardenSceneModeReady(
  gardenSceneMode
);

/*
  圖片都準備完成之後，
  才真正換 Garden DOM 的 src。

  此時拉門仍然關著，
  玩家不會看到切圖過程。
*/
applyGardenSceneMode(
  gardenSceneMode
);


  /*
    只把這次真的會立刻使用的
    兩張角色圖放進 HTTP cache。

    ACTIVE 已經負責：

    iPad → 小圖
    其他 → 大圖

    所以兩套素材不會混用。
  */


  /*
    接著只 warmup 這次立刻需要的
    千冬 + 千夏兩張 sheet。
  */
  await requestGardenAnimationWarmup(
    "chifuyu",
    firstMode,
    CHIFUYU_ANIMS[firstMode] ||
      CHIFUYU_ANIMS.idle
  );

  await requestGardenAnimationWarmup(
    "chinatsu",
    firstMode,
    CHINATSU_ANIMS[firstMode] ||
      CHINATSU_ANIMS.idle
  );


  gardenCharacterModeLoaded[
    firstMode
  ] = true;

  /*
    這裡的 loaded 意思改成：
    「已經足夠安全地打開 Garden」。

    不代表六張角色動畫全部載完。
  */
  gardenAssetsLoaded = true;
}


/* =========================
   Garden Low-Priority Menu Preload

   Menu 閒置時：
   - 只下載庭院場景
   - 一次一張
   - 不 decode
   - 不碰角色 spritesheet

   Wind Game / 轉場開始時立即停止
========================= */

const gardenBackgroundPreloadIndex =
  new Map();


function getGardenBackgroundPreloadIndex(
  sceneKey
) {
  return (
    gardenBackgroundPreloadIndex.get(
      sceneKey
    ) || 0
  );
}


function setGardenBackgroundPreloadIndex(
  sceneKey,
  index
) {
  gardenBackgroundPreloadIndex.set(
    sceneKey,
    index
  );
}
let gardenBackgroundPreloadTimer = null;
let gardenBackgroundPreloadToken = 0;
let gardenBackgroundPreloadRunning = false;


function isGardenBackgroundPreloadAllowed() {
  if (document.hidden) return false;

  if (
    !menuScreen ||
    menuScreen.classList.contains("hidden")
  ) {
    return false;
  }

  if (shrineScreenTransitionBusy) {
    return false;
  }

  if (
    windGameScreen &&
    !windGameScreen.classList.contains("hidden")
  ) {
    return false;
  }

  if (
    document.body.classList.contains(
      "wind-game-active"
    )
  ) {
    return false;
  }

  return true;
}


function pauseGardenBackgroundPreload() {
  gardenBackgroundPreloadToken += 1;

  gardenBackgroundPreloadRunning = false;

  if (gardenBackgroundPreloadTimer) {
    clearTimeout(
      gardenBackgroundPreloadTimer
    );

    gardenBackgroundPreloadTimer = null;
  }
}


async function runGardenBackgroundPreloadQueue(
  token,
  sceneKey,
  sceneAssets
) {
  if (
    gardenBackgroundPreloadRunning
  ) {
    return;
  }


  /*
    已經完整準備過，
    不需要 Menu preload。
  */
  if (
    gardenSceneAssetsLoaded.has(
      sceneKey
    )
  ) {
    return;
  }


  if (
    !sceneAssets ||
    sceneAssets.length === 0
  ) {
    return;
  }


  gardenBackgroundPreloadRunning =
    true;


  try {
    let index =
      getGardenBackgroundPreloadIndex(
        sceneKey
      );


    while (
      index <
      sceneAssets.length
    ) {
      /*
        使用者進入其他功能時，
        舊工作立即失效。
      */
      if (
        token !==
        gardenBackgroundPreloadToken
      ) {
        return;
      }


      if (
        !isGardenBackgroundPreloadAllowed()
      ) {
        return;
      }


      const src =
        sceneAssets[index];


      /*
        Menu 階段仍然只下載，
        不 decode。
      */
      await preloadGardenImageDownloadOnly(
        src
      );


      if (
        token !==
        gardenBackgroundPreloadToken
      ) {
        return;
      }


      index += 1;


      setGardenBackgroundPreloadIndex(
        sceneKey,
        index
      );


      /*
        每張之間休息一下，
        保留原本策略。
      */
      await new Promise(
        (resolve) => {
          setTimeout(
            resolve,
            180
          );
        }
      );
    }
  } finally {
    gardenBackgroundPreloadRunning =
      false;
  }
}


function startGardenBackgroundPreloadIdle(
  delay = 3200
) {
  /*
    iPadOS 維持原策略：
    Menu 不做背景 preload。
  */
  if (
    GARDEN_IPAD_SAFE_MODE
  ) {
    return;
  }


  const scene =
    getCurrentGardenScene();

  if (!scene) {
    return;
  }


  const sceneMode =
    getGardenSceneModeByTime();


  const sceneKey =
    getGardenSceneAssetKey(
      scene.id,
      sceneMode
    );


  const sceneAssets =
    getGardenSceneAssetsByMode(
      scene,
      sceneMode
    );


  /*
    這張場景 + 這個模式
    已經正式準備完成。
  */
  if (
    gardenSceneAssetsLoaded.has(
      sceneKey
    )
  ) {
    return;
  }


  if (
    sceneAssets.length === 0
  ) {
    return;
  }


  const currentIndex =
    getGardenBackgroundPreloadIndex(
      sceneKey
    );


  /*
    Menu download-only
    已經把全部圖片下載進 cache。
  */
  if (
    currentIndex >=
    sceneAssets.length
  ) {
    return;
  }


  /*
    讓舊排程失效。
  */
  pauseGardenBackgroundPreload();


  const token =
    gardenBackgroundPreloadToken;


  /*
    Menu 顯示後稍等，
    維持原本低優先策略。
  */
  gardenBackgroundPreloadTimer =
    setTimeout(() => {
      gardenBackgroundPreloadTimer =
        null;


      if (
        !isGardenBackgroundPreloadAllowed()
      ) {
        return;
      }


      const run = () => {
        runGardenBackgroundPreloadQueue(
          token,
          sceneKey,
          sceneAssets
        );
      };


      if (
        "requestIdleCallback" in window
      ) {
        requestIdleCallback(
          run,
          {
            timeout: 1200,
          }
        );
      } else {
        run();
      }
    }, delay);
}


/* =========================
   Wind Game Preload
========================= */

let windGameAssetsLoaded = false;
let windGameAssetsPromise = null;
let windGameDomWarmedUp = false;

const WIND_GAME_IMAGE_ASSETS = [
  "images/wind-bg-day.jpg",
  "images/wind-bg-night.jpg",

  "images/wind-crane.png",
  "images/wind-chinatsu-up.png",
  "images/wind-chinatsu-down.png",
  "images/wind-chifuyu-idle.png",
  "images/wind-chifuyu-slash.png?v=2",
  "images/wind-slash.png",

  "images/wind-sakura-pink.png",
  "images/wind-sakura-gold.png",

  "images/wind-obstacle-top.png",
  "images/wind-obstacle-bottom.png",
  "images/wind-ghost.png",
  "images/wind-ghost-rush.png",
  "images/wind-ghost-phase.png",

  "images/wind-btn-attack.png",
  "images/wind-btn-fly.png",
];


function preloadWindImage(src) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = async () => {
      if (img.decode) {
        try {
          await img.decode();
        } catch {}
      }

      resolve();
    };

    img.onerror = () => {
      console.warn("[WindGame] preload image failed:", src);
      resolve();
    };

    img.src = src;
  });
}

function preloadWindAudio(audio) {
  return new Promise((resolve) => {
    if (!audio) {
      resolve();
      return;
    }

    if (audio.readyState >= 3) {
      resolve();
      return;
    }

    const done = () => {
      audio.removeEventListener("canplaythrough", done);
      audio.removeEventListener("loadeddata", done);
      audio.removeEventListener("error", done);
      resolve();
    };

    audio.addEventListener("canplaythrough", done, { once: true });
    audio.addEventListener("loadeddata", done, { once: true });
    audio.addEventListener("error", done, { once: true });

    audio.load();

    // 避免某些瀏覽器不觸發 canplaythrough，導致拉門一直關著
    setTimeout(done, 2500);
  });
}

async function preloadWindGameAssets() {
  if (windGameAssetsLoaded) return;

  if (windGameAssetsPromise) {
    await windGameAssetsPromise;
    return;
  }



  windGameAssetsPromise = Promise.all([
    ...WIND_GAME_IMAGE_ASSETS.map(preloadWindImage),
    preloadWindAudio(windGameBgm),
    preloadWindAudio(windSlashSound),
  ]);

  await windGameAssetsPromise;

  windGameAssetsLoaded = true;


}


function warmupWindGameDom() {
  if (windGameDomWarmedUp) return;
  windGameDomWarmedUp = true;

  if (typeof initWindSlashSoundPool === "function") {
  initWindSlashSoundPool();
}

  if (typeof initWindSakuraTrail === "function") {
    initWindSakuraTrail();
  }

  if (typeof initWindGoldRoute === "function") {
    initWindGoldRoute();
  }

  if (typeof ensureWindBonusSakuraCount === "function") {
    ensureWindBonusSakuraCount(WIND_BONUS_SAKURA_POOL_SIZE);
  }

  if (typeof ensureWindBonusGoldCount === "function") {
    ensureWindBonusGoldCount(WIND_BONUS_GOLD_POOL_SIZE);
  }

  if (typeof updateWindSakuraTrail === "function") {
    updateWindSakuraTrail();
  }

  if (typeof updateWindGoldRoute === "function") {
    updateWindGoldRoute();
  }

  if (typeof updateWindSakuraBonus === "function") {
    updateWindSakuraBonus();
  }

  if (typeof updateWindBonusGold === "function") {
    updateWindBonusGold();
  }

  if (typeof updateWindGhost === "function") {
    updateWindGhost();
  }
}


function startWindGamePreloadIdle() {
  if (windGameAssetsLoaded && windGameDomWarmedUp) return;

  const run = async () => {
    await preloadWindGameAssets();

    requestAnimationFrame(() => {
      warmupWindGameDom();
    });
  };

  if ("requestIdleCallback" in window) {
    requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 1500);
  }
}




/* =========================
   Wind Game Controls
========================= */

const btnWindAttack = document.getElementById("btnWindAttack");
const btnWindFly = document.getElementById("btnWindFly");

if (windGameScreen) {
  windGameScreen.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  windGameScreen.addEventListener("dragstart", (e) => {
    e.preventDefault();
  });

  windGameScreen.addEventListener("selectstart", (e) => {
    e.preventDefault();
  });
}

document.querySelectorAll("#windGameScreen img").forEach((img) => {
  img.draggable = false;

  img.addEventListener("dragstart", (e) => {
    e.preventDefault();
  });
});

let windFlyPressed = false;

// 記住目前是哪一根手指 / 哪個 pointer 正在按住飛行鍵
let windFlyPointerId = null;

function setWindFlyPressed(pressed) {
  windFlyPressed = pressed;

  if (windGameState !== "playing" && windGameState !== "countdown") return;

  if (windChinatsu) {
    windChinatsu.src = pressed
      ? "images/wind-chinatsu-up.png"
      : "images/wind-chinatsu-down.png";
  }
}

if (btnWindFly) {
  btnWindFly.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();

    windFlyPointerId = e.pointerId;

    if (btnWindFly.setPointerCapture && e.pointerId !== undefined) {
      try {
        btnWindFly.setPointerCapture(e.pointerId);
      } catch {}
    }

    setWindButtonPressed(btnWindFly, true);
    setWindFlyPressed(true);
  });

  function releaseWindFly(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();

      // 只釋放「原本按住飛行鍵的那根手指」
      // 其他手指，例如攻擊鍵 pointerup，不可以中斷飛行
      if (
        windFlyPointerId !== null &&
        e.pointerId !== undefined &&
        e.pointerId !== windFlyPointerId
      ) {
        return;
      }
    }

    windFlyPointerId = null;

    setWindButtonPressed(btnWindFly, false);
    setWindFlyPressed(false);
  }

  btnWindFly.addEventListener("pointerup", releaseWindFly);
  btnWindFly.addEventListener("pointercancel", releaseWindFly);
  btnWindFly.addEventListener("lostpointercapture", releaseWindFly);

  // 長按時只阻止選單，不要釋放風術
  btnWindFly.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
}

const WIND_SLASH_SOUND_POOL_SIZE = 4;
let windSlashSoundPool = [];
let windSlashSoundPoolIndex = 0;

function initWindSlashSoundPool() {
  if (!windSlashSound) return;
  if (windSlashSoundPool.length > 0) return;

  windSlashSoundPool = [windSlashSound];

  for (let i = 1; i < WIND_SLASH_SOUND_POOL_SIZE; i++) {
    const clone = windSlashSound.cloneNode(true);
    clone.preload = "auto";
    clone.load();
    windSlashSoundPool.push(clone);
  }
}

const WIND_KEY_FLY = new Set(["ArrowUp"]);
const WIND_KEY_ATTACK = new Set(["KeyZ"]);

let windKeyboardFlyPressed = false;


function isWindGameKeyboardActive() {
  return (
    windGameScreen &&
    !windGameScreen.classList.contains("hidden") &&
    (windGameState === "countdown" || windGameState === "playing")
  );
}

function shouldIgnoreWindKeyboardInput(e) {
  const target = e.target;

  if (!target) return false;

  const tagName = target.tagName;

  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  );
}

document.addEventListener("keydown", (e) => {
  if (!isWindGameKeyboardActive()) return;
  if (shouldIgnoreWindKeyboardInput(e)) return;

  // 方向鍵上：長按飛行
  if (WIND_KEY_FLY.has(e.code)) {
    e.preventDefault();

    if (!windKeyboardFlyPressed) {
      windKeyboardFlyPressed = true;

      setWindButtonPressed(btnWindFly, true);
      setWindFlyPressed(true);
    }

    return;
  }

  // Z：攻擊
  if (WIND_KEY_ATTACK.has(e.code)) {
    e.preventDefault();

    // 避免長按 Z 時連續觸發攻擊
    if (e.repeat) return;

    handleWindAttackInput(e);
  }
});

document.addEventListener("keyup", (e) => {
  if (!WIND_KEY_FLY.has(e.code)) return;

  // 不在小遊戲中、而且鍵盤飛行也沒有被按住時，不要攔截方向鍵
  if (!windKeyboardFlyPressed && !isWindGameKeyboardActive()) return;

  e.preventDefault();

  windKeyboardFlyPressed = false;

  setWindButtonPressed(btnWindFly, false);
  setWindFlyPressed(false);
});



const windControls = document.getElementById("windControls");

if (windControls) {
  windControls.addEventListener("pointerdown", (e) => {
    const attackButton = e.target.closest("#btnWindAttack");

    if (!attackButton) return;

    
    handleWindAttackInput(e);
  });

  windControls.addEventListener("touchstart", (e) => {
    const attackButton = e.target.closest("#btnWindAttack");

    if (!attackButton) return;

   
    handleWindAttackInput(e);
  }, { passive: false });
}

function startWindAttack() {
  windAttackActive = true;




  playWindSlashSound();

  if (windAttackTimer) {
    clearTimeout(windAttackTimer);
    windAttackTimer = null;
  }

  if (windChifuyu) {
  windChifuyu.src = "images/wind-chifuyu-slash.png?v=2";
}

  if (windSlash) {
    windSlash.classList.remove(
      "hidden",
      "slash-active",
      "slash-active-a",
      "slash-active-b"
    );

    windSlashAnimToggle = !windSlashAnimToggle;

    requestAnimationFrame(() => {
      if (!windSlash) return;
      if (!windAttackActive) return;

      windSlash.classList.add(
        windSlashAnimToggle ? "slash-active-a" : "slash-active-b"
      );
    });
  }

  windAttackTimer = setTimeout(() => {
    endWindAttack();
  }, 280);
}

function endWindAttack() {
  windAttackActive = false;
  windAttackQueued = false;

  if (windAttackTimer) {
    clearTimeout(windAttackTimer);
    windAttackTimer = null;
  }

  if (windChifuyu) {
    windChifuyu.src = "images/wind-chifuyu-idle.png";
  }

  if (windSlash) {
    windSlash.classList.remove(
      "slash-active",
      "slash-active-a",
      "slash-active-b"
    );
    windSlash.classList.add("hidden");
  }
}



let windAttackActive = false;
let windAttackTimer = null;
// 怪物重生改用 dt cooldown，不再使用 setTimeout timer
let windSlashAnimToggle = false;
let windAttackQueued = false;

let windAttackButtonFeedbackTimer = null;

const WIND_GHOST_DEFEAT_SCORE = 10;

function setWindButtonPressed(button, pressed) {
  if (!button) return;

  const img = button.querySelector("img");

  if (pressed) {
    button.classList.add("is-pressed");

    // 直接改圖片本體，避免某些瀏覽器對 button transform 反應不明顯
    if (img) {
      img.style.transform = "scale(0.82)";
      img.style.filter = "brightness(0.82)";
      img.style.opacity = "0.88";
    }
  } else {
    button.classList.remove("is-pressed");

    if (img) {
      img.style.transform = "";
      img.style.filter = "";
      img.style.opacity = "";
    }
  }
}

function showWindAttackButtonFeedback() {
  if (!btnWindAttack) return;

  setWindButtonPressed(btnWindAttack, true);

  if (windAttackButtonFeedbackTimer) {
    clearTimeout(windAttackButtonFeedbackTimer);
    windAttackButtonFeedbackTimer = null;
  }

  // 攻擊是點按型，所以至少保留一小段按下效果
  windAttackButtonFeedbackTimer = setTimeout(() => {
    setWindButtonPressed(btnWindAttack, false);
    windAttackButtonFeedbackTimer = null;
  }, 160);
}

function handleWindAttackInput(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  showWindAttackButtonFeedback();

if (windGameState === "countdown") {
  // 倒數中只顯示按鈕反饋，不預約攻擊
  return;
}

  // 遊戲中才真的攻擊
  if (windGameState !== "playing") return;
  if (windAttackActive) return;

  startWindAttack();
}

function releaseAllWindButtons(options = {}) {
  const forceAttack = options.forceAttack === true;
  const forceFly = options.forceFly === true;

  // 飛行鍵只有在明確 forceFly 時才釋放
  // 這樣攻擊鍵 pointerup 不會中斷正在按住的飛行
  if (forceFly) {
  windKeyboardFlyPressed = false;
  windFlyPointerId = null;

  setWindButtonPressed(btnWindFly, false);
  setWindFlyPressed(false);
}

  // 攻擊鍵是點按型，平常不要被 pointerup 立刻清掉
  // 讓 showWindAttackButtonFeedback() 的 timer 自己處理
  if (forceAttack) {
    if (windAttackButtonFeedbackTimer) {
      clearTimeout(windAttackButtonFeedbackTimer);
      windAttackButtonFeedbackTimer = null;
    }

    setWindButtonPressed(btnWindAttack, false);
  }
}



window.addEventListener("pointerup", (e) => {
  // 只有放開「飛行鍵那根手指」時，才停止飛行
  if (
    windFlyPointerId !== null &&
    e.pointerId !== undefined &&
    e.pointerId === windFlyPointerId
  ) {
    releaseAllWindButtons({
      forceFly: true,
      forceAttack: false,
    });
  }
});

window.addEventListener("blur", () => {
  // 離開視窗時才強制清掉所有按鈕
  releaseAllWindButtons({
    forceFly: true,
    forceAttack: true,
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // 切到背景時才強制清掉所有按鈕
    releaseAllWindButtons({
      forceFly: true,
      forceAttack: true,
    });
  }
});
/* =========================
   Wind Game Physics
========================= */

let windPlayerY = 0;
let windPlayerVY = 0;
let windLastTime = 0;
let windAnimFrame = null;

// 遊戲經過時間，用來控制難度成長
let windElapsedTime = 0;

/*
  難度等級：
  - 時間越久越難
  - 分數越高也會稍微推進難度
  - 最高限制在 7，避免後期失控
*/
function getWindDifficultyLevel() {
  const timeLevel = Math.floor(windElapsedTime / 18);
  const scoreLevel = Math.floor(windScore / 35);

  return Math.min(7, timeLevel + scoreLevel);
}

/*
  主捲動速度：
  開局：620
  後期最高：約970
*/
function getWindScrollSpeed() {
  const level = getWindDifficultyLevel();

  return 620 + level * 50;
}

/*
  怪物速度：
  跟著難度上升，但保留隨機感
*/
function getWindDifficultyGhostSpeed() {
  const level = getWindDifficultyLevel();

  const min = WIND_GHOST_SPEED_MIN + level * 30;
  const max = WIND_GHOST_SPEED_MAX + level * 38;

  return min + Math.random() * (max - min);
}

// 倒數時的原地漂浮效果，只影響視覺，不影響碰撞
let windPlayerFloatY = 0;
let windPlayerFloatFrame = null;
let windPlayerFloatStartTime = 0;

const WIND_PLAYER_FLOAT_AMPLITUDE = 18; // 漂浮高度，數字越大上下幅度越明顯
const WIND_PLAYER_FLOAT_SPEED = 0.004;  // 漂浮速度，數字越大越快

// 角色飛行傾斜角度
let windPlayerTilt = 0;

const WIND_PLAYER_TILT_MAX = 8;        // 最大傾斜角度
const WIND_PLAYER_TILT_FACTOR = 0.012; // 速度轉角度的比例
const WIND_PLAYER_TILT_SMOOTH = 0.16;  // 越大越靈敏，越小越柔和

const WIND_GRAVITY = 1800;       // 下墜力量，數字越大掉越快
const WIND_FLY_FORCE = 2600;     // 按住飛行時的上升力量
const WIND_MAX_UP_SPEED = -850;  // 最大上升速度
const WIND_MAX_DOWN_SPEED = 950; // 最大下墜速度

const WIND_TOP_LIMIT = -520;     // 往上最多偏移多少，先限制不死亡
const WIND_BOTTOM_LIMIT = 720;   // 往下偏移多少後 Game Over
const WIND_PLAYER_BASE_X = 50;
const WIND_PLAYER_BASE_Y = 800;
const WIND_PLAYER_W = 440;
const WIND_PLAYER_H = 289;

function applyWindPlayerPosition() {
  if (!windPlayer) return;

  const visualY = windPlayerY + windPlayerFloatY;
  windPlayer.style.transform = `translateY(${visualY}px)`;
}

function startWindPlayerCountdownFloat() {
  stopWindPlayerCountdownFloat(false);

  windPlayerFloatStartTime = performance.now();

  function floatLoop(now) {
    if (windGameState !== "countdown") {
      stopWindPlayerCountdownFloat(true);
      return;
    }

    const t = now - windPlayerFloatStartTime;

    // 用 sin 做柔和上下漂浮
    windPlayerFloatY =
      Math.sin(t * WIND_PLAYER_FLOAT_SPEED) * WIND_PLAYER_FLOAT_AMPLITUDE;

    applyWindPlayerPosition();

    windPlayerFloatFrame = requestAnimationFrame(floatLoop);
  }

  windPlayerFloatFrame = requestAnimationFrame(floatLoop);
}

function stopWindPlayerCountdownFloat(resetPosition = true) {
  if (windPlayerFloatFrame) {
    cancelAnimationFrame(windPlayerFloatFrame);
    windPlayerFloatFrame = null;
  }

  if (resetPosition) {
    windPlayerFloatY = 0;
    applyWindPlayerPosition();
  }
}

function clampWindTilt(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function applyWindPlayerTilt() {
  const targetTilt = clampWindTilt(
    windPlayerVY * WIND_PLAYER_TILT_FACTOR,
    -WIND_PLAYER_TILT_MAX,
    WIND_PLAYER_TILT_MAX
  );

  // 平滑靠近目標角度，避免上下切換時太抖
  windPlayerTilt += (targetTilt - windPlayerTilt) * WIND_PLAYER_TILT_SMOOTH;

  const transform = `rotate(${windPlayerTilt}deg)`;

  // 只旋轉角色本體，不旋轉 slash
  if (windCrane) windCrane.style.transform = transform;
  if (windChinatsu) windChinatsu.style.transform = transform;
  if (windChifuyu) windChifuyu.style.transform = transform;
}

function resetWindPlayerTilt() {
  windPlayerTilt = 0;

  if (windCrane) windCrane.style.transform = "";
  if (windChinatsu) windChinatsu.style.transform = "";
  if (windChifuyu) windChifuyu.style.transform = "";
}

function startWindGameLoop() {
  if (windAnimFrame) {
    cancelAnimationFrame(windAnimFrame);
    windAnimFrame = null;
  }

  windLastTime = performance.now();

  function loop(now) {
    if (windGameState !== "playing") {
      windAnimFrame = null;
      return;
    }

    let dt = (now - windLastTime) / 1000;
windLastTime = now;

// 避免切到背景或超大卡頓時瞬移，但不要卡得太死
dt = Math.min(dt, 0.08);

windElapsedTime += dt;

updateWindPlayerPhysics(dt);
  applyWindPlayerTilt();
updateWindObstacle(dt);
updateWindSakuraTrail();
updateWindGoldRoute();
updateWindBonus(dt);
updateWindBonusGold();

updateWindGhostIntroSpawn();
updateWindGhostMovement(dt);
updateWindGhostRespawn(dt);

updateWindRushGhost(dt);
updateWindPhaseGhost(dt);

applyWindPlayerPosition();

updateWindCollectiblesCollision();
updateWindObstacleCollision();

updateWindSlashGhostCollision();
updateWindSlashRushGhostCollision();
updateWindSlashPhaseGhostCollision();

updateWindGhostCollision();
updateWindRushGhostCollision();
updateWindPhaseGhostCollision();

updateWindDebugHitboxes();

windAnimFrame = requestAnimationFrame(loop);
  }

  windAnimFrame = requestAnimationFrame(loop);
}



function updateWindPlayerPhysics(dt) {
  if (windFlyPressed) {
    windPlayerVY -= WIND_FLY_FORCE * dt;

    if (windChinatsu) {
      windChinatsu.src = "images/wind-chinatsu-up.png";
    }
  } else {
    windPlayerVY += WIND_GRAVITY * dt;

    if (windChinatsu) {
      windChinatsu.src = "images/wind-chinatsu-down.png";
    }
  }

  if (windPlayerVY < WIND_MAX_UP_SPEED) {
    windPlayerVY = WIND_MAX_UP_SPEED;
  }

  if (windPlayerVY > WIND_MAX_DOWN_SPEED) {
    windPlayerVY = WIND_MAX_DOWN_SPEED;
  }

  windPlayerY += windPlayerVY * dt;

  // 上方先不死亡，只限制高度
  if (windPlayerY < WIND_TOP_LIMIT) {
    windPlayerY = WIND_TOP_LIMIT;
    windPlayerVY = 0;
  }

  // 下方摔落
  if (windPlayerY > WIND_BOTTOM_LIMIT) {
    windPlayerY = WIND_BOTTOM_LIMIT;
    applyWindPlayerPosition();
    windGameOver("crash");
  }
}





function windGameOver(reason = "crash") {
  if (windGameState === "gameover") return;

  windGameOverReason = reason;

  setWindGameState("gameover");
  

  stopWindGameBgm();

  if (windAnimFrame) {
    cancelAnimationFrame(windAnimFrame);
    windAnimFrame = null;
  }

  if (windAttackButtonFeedbackTimer) {
    clearTimeout(windAttackButtonFeedbackTimer);
    windAttackButtonFeedbackTimer = null;
  }

  setWindButtonPressed(btnWindAttack, false);

  windKeyboardFlyPressed = false;
windFlyPressed = false;
windAttackActive = false;
windAttackQueued = false;

  // 停止怪物等待重生狀態
  windGhostWaitingRespawn = false;
  windGhostRespawnCooldown = 0;
  windGhostActive = false;

  if (windAttackTimer) {
    clearTimeout(windAttackTimer);
    windAttackTimer = null;
  }

  if (windSlash) {
    windSlash.classList.remove(
      "slash-active",
      "slash-active-a",
      "slash-active-b"
    );
    windSlash.classList.add("hidden");
  }

  if (windGhost) {
    windGhost.classList.add("hidden");
    windGhost.classList.remove("ghost-defeated");
    setWindElementPosition(windGhost, WIND_GHOST_START_X, 960);
  }

  resetWindRushGhostSystem();
  resetWindPhaseGhostSystem();

  if (windChinatsu) {
    windChinatsu.src = "images/wind-chinatsu-down.png";
  }

  clearWindCountdown();
  hideWindPauseOverlay();
  hideWindPauseButton();

  // Mission Complete 畫面中，櫻花停止並變暗
  pauseSakuraForWindGame();

  showWindResultPanel();
}






/* =========================
   Wind Game State + Countdown
========================= */

const windCountdown = document.getElementById("windCountdown");

let windGameState = "idle";
// idle      尚未開始
// countdown 倒數中
// playing   遊戲中
// gameover  結束

let windCountdownTimer = null;

let windRetryStartTimer = null;

function clearWindRetryStartTimer() {
  if (windRetryStartTimer) {
    clearTimeout(windRetryStartTimer);
    windRetryStartTimer = null;
  }
}

function scheduleWindRetryStart() {
  clearWindRetryStartTimer();

  windRetryStartTimer = setTimeout(() => {
    windRetryStartTimer = null;
    startWindCountdown();
  }, 300);
}

function setWindGameState(nextState) {
  windGameState = nextState;

  updateWindPauseButtonIcon();
}

const WIND_PAUSE_ICON = "images/ui-btn-pause.png";
const WIND_RESUME_ICON = "images/ui-btn-resume.png";


function updateWindPauseButtonIcon() {
  if (!btnWindGameMenu) return;

  const img = btnWindGameMenu.querySelector("img");
  if (!img) return;

  if (windGameState === "paused") {
    img.src = WIND_RESUME_ICON;
    img.alt = "Resume";
    btnWindGameMenu.setAttribute("aria-label", "Resume");
  } else {
    img.src = WIND_PAUSE_ICON;
    img.alt = "Pause";
    btnWindGameMenu.setAttribute("aria-label", "Pause");
  }
}

function showWindPauseButton() {
  if (!btnWindGameMenu) return;

  btnWindGameMenu.classList.remove("hidden");
}

function hideWindPauseButton() {
  if (!btnWindGameMenu) return;

  btnWindGameMenu.classList.add("hidden");
}

function showWindPauseOverlay() {
  if (!windPauseOverlay) return;

  windPauseOverlay.classList.remove("hidden");
}

function hideWindPauseOverlay() {
  if (!windPauseOverlay) return;

  windPauseOverlay.classList.add("hidden");
}


function pauseWindGame() {
  if (windGameState !== "playing") return;

  setWindGameState("paused");
  showWindPauseOverlay();
  pauseSakuraForWindGame();

  if (windAnimFrame) {
    cancelAnimationFrame(windAnimFrame);
    windAnimFrame = null;
  }

  // 暫停 BGM，不歸零，Resume 時接著播
  pauseAudio(windGameBgm);

  // 放開所有操作鍵，避免恢復時仍保持上升
  releaseAllWindButtons({ forceAttack: true });

  // 如果剛好正在攻擊，先收掉劍氣與攻擊差分
  if (windAttackActive || windAttackTimer) {
    endWindAttack();
  }
}

function resumeWindGame() {
  if (windGameState !== "paused") return;

  hideWindPauseOverlay();
  hideWindResultPanel();
  resumeSakuraForWindGame();

  setWindGameState("playing");

  // 接著播放小遊戲 BGM，不從頭播放
  if (windGameAudioMode && windGameBgm) {
  windGameBgm.volume = WIND_GAME_BGM_VOLUME;
  playAudioSafe(windGameBgm);
}

  // 避免暫停時間被算進 dt，導致 Resume 瞬移
  windLastTime = performance.now();

  startWindGameLoop();
}

function toggleWindGamePause(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (windGameState === "playing") {
    pauseWindGame();
    return;
  }

  if (windGameState === "paused") {
    resumeWindGame();
  }
}

function clearWindCountdown() {
  if (windCountdownTimer) {
    clearTimeout(windCountdownTimer);
    windCountdownTimer = null;
  }

  if (windCountdown) {
    windCountdown.classList.add("hidden");
    windCountdown.classList.remove("countdown-pop");
    windCountdown.textContent = "";
  }
}

function showWindCountdownText(text) {
  if (!windCountdown) return;

  windCountdown.textContent = text;

  windCountdown.classList.remove("countdown-pop");
  windCountdown.classList.remove("hidden");

  // 重新觸發動畫
  void windCountdown.offsetWidth;

  windCountdown.classList.add("countdown-pop");
}

function startWindCountdown() {
  clearWindCountdown();
  setWindGameState("countdown");

  startWindPlayerCountdownFloat();

  const steps = ["3", "2", "1", "Start"];
  let index = 0;

  function nextStep() {
    if (index >= steps.length) {
      clearWindCountdown();
      startWindPlaying();
      return;
    }

    const currentStep = steps[index];

    showWindCountdownText(currentStep);

    if (currentStep === "2") {
      playWindGameBgmFromStart();
    }

    index += 1;

    windCountdownTimer = setTimeout(nextStep, 1000);
  }

  nextStep();
}

function startWindPlaying() {
  setWindGameState("playing");

  stopWindPlayerCountdownFloat(true);

  playWindGameBgmFromStart();

  stopWindPlayerCountdownFloat(true);

windPlayerY = 0;
windPlayerVY = 0;
windLastTime = performance.now();
windPlayerFloatY = 0;
windElapsedTime = 0;
applyWindPlayerPosition();

  startWindGameLoop();
}



function getRandomWindObstaclePattern() {
  const currentPattern = windCurrentObstaclePattern;

  const candidates = WIND_OBSTACLE_PATTERNS.filter((pattern) => {
    return pattern !== currentPattern;
  });

  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index];
}


function getRandomWindBonusFormation() {
  const currentFormation = windCurrentBonusFormation;

  const candidates = WIND_BONUS_FORMATION_ORDER.filter((formation) => {
    return formation !== currentFormation;
  });

  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index];
}



/* =========================
   Wind Game Obstacles
========================= */

const windObstacleGroup = document.getElementById("windObstacleGroup");
const windObstacleTop = document.getElementById("windObstacleTop");
const windObstacleBottom = document.getElementById("windObstacleBottom");

let windObstacleX = 1180;
let windObstaclePatternIndex = 0;

const WIND_OBSTACLE_START_X = 2600;
const WIND_OBSTACLE_RESET_X = 2600;
const WIND_OBSTACLE_END_X = -320;

/*
  速度之後一定會調。
  先用 360，讓障礙物不會太快。
*/
const WIND_OBSTACLE_SPEED = 700;

/*
  三種障礙 pattern：
  middle：中開口，上下都有障礙
  upper：上開口，只有下方障礙
  lower：下開口，只有上方障礙
*/
let windCurrentObstaclePattern = "middle";
const WIND_OBSTACLE_PATTERNS = ["middle", "upper", "lower"];

const WIND_MIDDLE_GAP_TOP = 900;
const WIND_MIDDLE_GAP_HEIGHT = 50;

const WIND_UPPER_OBSTACLE_TOP = 750;
const WIND_LOWER_OBSTACLE_BOTTOM = 1200;

function applyWindObstaclePattern(pattern) {
  if (!windObstacleTop || !windObstacleBottom) return;

  // 記住目前是哪一種障礙物組合，給粉櫻花路線使用
  windCurrentObstaclePattern = pattern;

  const obstacleH = 1200;

  // 中開口：上下都有障礙物
  const middleGapTop = WIND_MIDDLE_GAP_TOP;
  const middleGapHeight = WIND_MIDDLE_GAP_HEIGHT;
  const middleGapBottom = middleGapTop + middleGapHeight;

  // 上開口：只有下方障礙物
  const upperObstacleTop = WIND_UPPER_OBSTACLE_TOP;

  // 下開口：只有上方障礙物
  const lowerObstacleBottom = WIND_LOWER_OBSTACLE_BOTTOM;

  if (pattern === "middle") {
    windObstacleTop.style.display = "block";
    windObstacleBottom.style.display = "block";

    windObstacleTop.style.top = `${middleGapTop - obstacleH}px`;
    windObstacleBottom.style.top = `${middleGapBottom}px`;
  }

  if (pattern === "upper") {
    windObstacleTop.style.display = "none";
    windObstacleBottom.style.display = "block";

    windObstacleBottom.style.top = `${upperObstacleTop}px`;
  }

  if (pattern === "lower") {
    windObstacleTop.style.display = "block";
    windObstacleBottom.style.display = "none";

    windObstacleTop.style.top = `${lowerObstacleBottom - obstacleH}px`;
  }
}

function resetWindObstacle() {
  windObstacleX = WIND_OBSTACLE_START_X;
  windObstaclePatternIndex = 0;

  windBonusX = WIND_BONUS_START_X;
  windBonusFormationIndex = 0;

  applyWindObstaclePattern(WIND_OBSTACLE_PATTERNS[windObstaclePatternIndex]);
  applyWindObstaclePosition();

  applyWindBonusFormation(WIND_BONUS_FORMATION_ORDER[windBonusFormationIndex]);

  resetWindRouteCollection();
  resetWindBonusCollection();

  // 初始化時只更新一次位置，避免空畫面
  updateWindSakuraTrail();
  updateWindGoldRoute();
  updateWindSakuraBonus();
  updateWindBonusGold();
}



function applyWindObstaclePosition() {
  if (!windObstacleGroup) return;
  windObstacleGroup.style.transform = `translateX(${windObstacleX}px)`;
}

function updateWindObstacle(dt) {
  if (!windObstacleGroup) return;

 windObstacleX -= getWindScrollSpeed() * dt;

  if (windObstacleX < WIND_OBSTACLE_END_X) {
    windObstacleX = WIND_OBSTACLE_RESET_X;

    const nextPattern = getRandomWindObstaclePattern();
    const nextFormation = getRandomWindBonusFormation();

    applyWindObstaclePattern(nextPattern);
    applyWindBonusFormation(nextFormation);

    windBonusX = WIND_BONUS_START_X;

    resetWindRouteCollection();
    resetWindBonusCollection();

    // 不在這裡 update 櫻花 / bonus / gold
    // 讓主 loop 後面的 updateWindSakuraTrail / updateWindBonus 統一處理
  }

  applyWindObstaclePosition();
}

/* =========================
   Wind Game Sakura Trail
========================= */

const windSakuraTrail = document.getElementById("windSakuraTrail");

const WIND_ROUTE_SAKURA_COUNT = 8;
const WIND_ROUTE_SAKURA_SRC = "images/wind-sakura-pink.png";

/*
  這些是相對於障礙物左側的 X 位置。
  負數代表在障礙物前方，讓玩家先看到引導線。
*/
const WIND_ROUTE_LOCAL_XS = [-240, -140, -40, 60, 160, 260, 360, 460];

let windRouteSakuraEls = [];

function initWindSakuraTrail() {
  if (!windSakuraTrail) return;

  if (windRouteSakuraEls.length > 0) return;

  for (let i = 0; i < WIND_ROUTE_SAKURA_COUNT; i++) {
    const img = document.createElement("img");
    img.src = WIND_ROUTE_SAKURA_SRC;
    img.className = "wind-route-sakura";
    img.alt = "";

    windSakuraTrail.appendChild(img);
    windRouteSakuraEls.push(img);
  }
}

function windRouteEase(t) {
  return t * t * (3 - 2 * t);
}

function getWindSakuraTargetY(pattern) {
  if (pattern === "middle") {
    return WIND_MIDDLE_GAP_TOP + WIND_MIDDLE_GAP_HEIGHT / 2;
  }

  if (pattern === "upper") {
    // 下方障礙物從 750 開始，所以引導玩家往上方空間
    return WIND_UPPER_OBSTACLE_TOP - 230;
  }

  if (pattern === "lower") {
    // 上方障礙物到 1200，所以引導玩家往下方空間
    return WIND_LOWER_OBSTACLE_BOTTOM + 230;
  }

  return 960;
}

function getWindSakuraY(pattern, index) {
  const t = WIND_ROUTE_SAKURA_COUNT <= 1
    ? 1
    : index / (WIND_ROUTE_SAKURA_COUNT - 1);

  const eased = windRouteEase(t);

  /*
    起點先抓接近畫面中央的高度。
    後面逐漸往該 pattern 的通過區域靠近。
  */
  const startY = 940;
  const targetY = getWindSakuraTargetY(pattern);

  return startY + (targetY - startY) * eased;
}

function updateWindSakuraTrail() {
  if (!windSakuraTrail) return;

  initWindSakuraTrail();

  const pattern = windCurrentObstaclePattern || "middle";

  for (let i = 0; i < windRouteSakuraEls.length; i++) {
    const el = windRouteSakuraEls[i];
    if (!el) continue;

    // 已經被吃掉的櫻花，維持隱藏
    if (windRouteSakuraCollected[i] === true) {
      el.style.display = "none";
      continue;
    }

    const localX = WIND_ROUTE_LOCAL_XS[i] ?? 0;
    const x = windObstacleX + localX;
    const y = getWindSakuraY(pattern, i);

    // 沒被吃掉的櫻花，重設顯示
   el.style.display = "block";
setWindElementPosition(el, x, y);
  }
}

/* =========================
   Wind Game Bonus Sakura Formations
========================= */

const windSakuraBonus = document.getElementById("windSakuraBonus");

const WIND_BONUS_SAKURA_SRC = "images/wind-sakura-pink.png";

let windBonusSakuraEls = [];
let windCurrentBonusFormation = "rectangle";
let windBonusFormationIndex = 0;

const WIND_BONUS_PHASE_OFFSET = 1000;

let windBonusX = WIND_OBSTACLE_START_X - WIND_BONUS_PHASE_OFFSET;

const WIND_BONUS_START_X = WIND_OBSTACLE_START_X - WIND_BONUS_PHASE_OFFSET;
const WIND_BONUS_END_X = WIND_OBSTACLE_END_X;
const WIND_BONUS_SPEED = WIND_OBSTACLE_SPEED;


const WIND_BONUS_FORMATIONS = {
  rectangle: [
    // 上排
    { x: 0, y: 700 },
    { x: 120, y: 700 },
    { x: 240, y: 700 },
    { x: 360, y: 700 },

    // 下排
    { x: 0, y: 1040 },
    { x: 120, y: 1040 },
    { x: 240, y: 1040 },
    { x: 360, y: 1040 },
  ],

  diamond: [
    // 較大的菱形輪廓，中心留給金櫻花
    { x: 180, y: 560 },

    { x: 60, y: 680 },
    { x: 300, y: 680 },

    { x: -60, y: 800 },
    { x: 420, y: 800 },

    { x: -60, y: 940 },
    { x: 420, y: 940 },

    { x: 60, y: 1060 },
    { x: 300, y: 1060 },

    { x: 180, y: 1180 },
  ],

  verticalLine: [
    // 名稱先沿用 verticalLine，避免其他程式碼要跟著改
    // 實際圖形改成金字塔：頂端留給金櫻花，不放粉櫻花

    // 第二層
    { x: 120, y: 800 },
    { x: 240, y: 800 },

    // 第三層
    { x: 60, y: 920 },
    { x: 180, y: 920 },
    { x: 300, y: 920 },

    // 第四層
    { x: 0, y: 1040 },
    { x: 120, y: 1040 },
    { x: 240, y: 1040 },
    { x: 360, y: 1040 },
  ],
};

const WIND_BONUS_FORMATION_ORDER = [
  "rectangle",
  "diamond",
  "verticalLine",
];

const WIND_BONUS_SAKURA_POOL_SIZE = Math.max(
  ...Object.values(WIND_BONUS_FORMATIONS).map((points) => points.length)
);

function ensureWindBonusSakuraCount(count) {
  if (!windSakuraBonus) return;

  while (windBonusSakuraEls.length < count) {
    const img = document.createElement("img");
    img.src = WIND_BONUS_SAKURA_SRC;
    img.className = "wind-bonus-sakura";
    img.alt = "";

    windSakuraBonus.appendChild(img);
    windBonusSakuraEls.push(img);
  }

  for (let i = 0; i < windBonusSakuraEls.length; i++) {
    windBonusSakuraEls[i].style.display = i < count ? "block" : "none";
  }
}


function applyWindBonusFormation(name) {
  windCurrentBonusFormation = name;

  // 一次確保 bonus 櫻花池已經建到最大數量
  // 之後切 formation 時就不會臨時 createElement
  ensureWindBonusSakuraCount(WIND_BONUS_SAKURA_POOL_SIZE);
}
function updateWindSakuraBonus() {
  if (!windSakuraBonus) return;

  const points = WIND_BONUS_FORMATIONS[windCurrentBonusFormation] || [];

  for (let i = 0; i < windBonusSakuraEls.length; i++) {
    const el = windBonusSakuraEls[i];
    const point = points[i];

    if (!el) continue;

    if (!point) {
      if (el.style.display !== "none") el.style.display = "none";
      continue;
    }

    if (windBonusSakuraCollected[i] === true) {
      if (el.style.display !== "none") el.style.display = "none";
      continue;
    }

    const x = windBonusX + point.x;
    const y = point.y;

    if (el.style.display !== "block") el.style.display = "block";
    setWindElementPosition(el, x, y);
  }
}

function updateWindBonus(dt) {
  windBonusX -= getWindScrollSpeed() * dt;

  updateWindSakuraBonus();
}


const WIND_OBSTACLE_MID_X =
  (WIND_OBSTACLE_START_X + WIND_OBSTACLE_END_X) / 2;



/* =========================
   Wind Game Gold Route Sakura
========================= */

const windGoldRoute = document.getElementById("windGoldRoute");

const WIND_GOLD_ROUTE_SRC = "images/wind-sakura-gold.png";

let windGoldRouteEl = null;

/*
  金櫻花比粉櫻花更靠近障礙物。
*/
const WIND_GOLD_ROUTE_LOCAL_X = 120;

/*
  中開口金櫻花的位置：
  放在開口上半部，靠近上方障礙物，但不要貼到障礙物。
*/
const WIND_GOLD_MIDDLE_Y_OFFSET = 160;


function initWindGoldRoute() {
  if (!windGoldRoute) return;
  if (windGoldRouteEl) return;

  const img = document.createElement("img");
  img.src = WIND_GOLD_ROUTE_SRC;
  img.className = "wind-route-gold";
  img.alt = "";

  windGoldRoute.appendChild(img);
  windGoldRouteEl = img;
}

function updateWindGoldRoute() {
  if (!windGoldRoute) return;

  initWindGoldRoute();

  if (!windGoldRouteEl) return;

  /*
    只在中開口出現。
    上開口、下開口直接隱藏。
  */
  if (windCurrentObstaclePattern !== "middle") {
    windGoldRouteEl.style.display = "none";
    return;
  }

if (windGoldRouteCollected) {
  windGoldRouteEl.style.display = "none";
  return;
}

  /*
    如果你有加 WIND_ROUTE_X_OFFSET，金櫻花也跟著吃同一個偏移。
    沒有的話就自動當 0。
  */
  const routeOffset =
    typeof WIND_ROUTE_X_OFFSET !== "undefined"
      ? WIND_ROUTE_X_OFFSET
      : 0;

  const x = windObstacleX + WIND_GOLD_ROUTE_LOCAL_X + routeOffset;

  /*
    目前中開口是 900～950。
    中心是 925。
    金櫻花放在上半部，也就是 y = 914 左右。
  */
  const middleCenterY =
    WIND_MIDDLE_GAP_TOP + WIND_MIDDLE_GAP_HEIGHT / 2;

  const y = middleCenterY - WIND_GOLD_MIDDLE_Y_OFFSET;

  windGoldRouteEl.style.display = "block";
setWindElementPosition(windGoldRouteEl, x, y);
}


/* =========================
   Wind Game Bonus Gold Sakura
========================= */

const windBonusGold = document.getElementById("windBonusGold");

const WIND_BONUS_GOLD_SRC = "images/wind-sakura-gold.png";

let windBonusGoldEls = [];

const WIND_BONUS_GOLD_POINTS = {
  rectangle: [
    // 兩排粉櫻花正中央
    { x: 180, y: 870 },
  ],

  diamond: [
    // 菱形正中央
    { x: 180, y: 870 },
  ],

  verticalLine: [
    // 金字塔頂端
    { x: 180, y: 680 },
  ],
};

const WIND_BONUS_GOLD_POOL_SIZE = Math.max(
  ...Object.values(WIND_BONUS_GOLD_POINTS).map((points) => points.length)
);

function ensureWindBonusGoldCount(count) {
  if (!windBonusGold) return;

  while (windBonusGoldEls.length < count) {
    const img = document.createElement("img");
    img.src = WIND_BONUS_GOLD_SRC;
    img.className = "wind-bonus-gold";
    img.alt = "";

    windBonusGold.appendChild(img);
    windBonusGoldEls.push(img);
  }

  for (let i = 0; i < windBonusGoldEls.length; i++) {
    windBonusGoldEls[i].style.display = i < count ? "block" : "none";
  }
}


function updateWindBonusGold() {
  if (!windBonusGold) return;

  const points = WIND_BONUS_GOLD_POINTS[windCurrentBonusFormation] || [];

  for (let i = 0; i < windBonusGoldEls.length; i++) {
    const el = windBonusGoldEls[i];
    const point = points[i];

    if (!el) continue;

    if (!point) {
      if (el.style.display !== "none") el.style.display = "none";
      continue;
    }

    if (windBonusGoldCollected[i] === true) {
      if (el.style.display !== "none") el.style.display = "none";
      continue;
    }

    const x = windBonusX + point.x;
    const y = point.y;

    if (el.style.display !== "block") el.style.display = "block";
    setWindElementPosition(el, x, y);
  }
}


/* =========================
   Wind Game Ghost
========================= */


function getRandomWindGhostSpeed() {
  return getWindDifficultyGhostSpeed();
}

const windGhost = document.getElementById("windGhost");

let windGhostX = 1600;
let windGhostY = 960;
let windGhostBaseY = 960;
let windGhostActive = false;

// 怪物漂浮用
let windGhostFloatTime = 0;
let windGhostFloatPhase = 0;

const WIND_GHOST_FLOAT_AMPLITUDE = 34; // 上下漂浮幅度
const WIND_GHOST_FLOAT_SPEED = 5.2;    // 漂浮速度
const WIND_GHOST_FLOAT_DRIFT = 12;     // 額外細微擺動

// 怪物幾秒後正式加入戰場
const WIND_GHOST_INTRO_DELAY = 30;

// 第一隻怪物是否已經出現過
let windGhostIntroSpawned = false;

// 怪物重生冷卻，單位：秒
let windGhostRespawnCooldown = 0;

// 是否正在等待重生
let windGhostWaitingRespawn = false;

// 怪物被打倒 / 離場後的重生間隔
const WIND_GHOST_RESPAWN_MIN = 2.4;
const WIND_GHOST_RESPAWN_MAX = 4.2;

// 怪物與障礙物抵達玩家附近的時間差，太近就延後怪物出生
const WIND_GHOST_OBSTACLE_SAFE_TIME_GAP = 0.18;

const WIND_GHOST_START_X = 1500;
const WIND_GHOST_END_X = -180;
const WIND_GHOST_SPEED_MIN = 520;
const WIND_GHOST_SPEED_MAX = 820;

const WIND_GHOST_W = 300;
const WIND_GHOST_H = 300;

let windGhostSpeed = 620;

const WIND_GHOST_Y_LIST = [
  560,
  720,
  880,
  1040,
  1200,
  1360,
];



function getWindGhostRespawnDelay() {
  return (
    WIND_GHOST_RESPAWN_MIN +
    Math.random() * (WIND_GHOST_RESPAWN_MAX - WIND_GHOST_RESPAWN_MIN)
  );
}

function prepareWindGhostIntro() {
  windGhostIntroSpawned = false;
  windGhostWaitingRespawn = false;
  windGhostRespawnCooldown = 0;
  windGhostActive = false;

  windGhostX = WIND_GHOST_START_X;
windGhostBaseY = 960;
windGhostY = windGhostBaseY;
windGhostFloatTime = 0;
windGhostFloatPhase = 0;

  if (windGhost) {
    windGhost.classList.add("hidden");
    windGhost.classList.remove("ghost-defeated");

    // 保險：出生前先放到右側畫面外，避免左上角短暫露出
    setWindElementPosition(windGhost, windGhostX, windGhostY);
  }
}

function startWindGhostRespawnCooldown(delay = getWindGhostRespawnDelay()) {
  windGhostActive = false;
  windGhostWaitingRespawn = true;
  windGhostRespawnCooldown = delay;

  if (windGhost) {
    windGhost.classList.add("hidden");
    windGhost.classList.remove("ghost-defeated");

    // 保險：等待重生時放到畫面外
   windGhostBaseY = 960;
windGhostY = windGhostBaseY;
windGhostFloatTime = 0;

setWindElementPosition(windGhost, WIND_GHOST_START_X, windGhostY);
  }
}

function isWindGhostSpawnTimingSafe() {
  /*
    這版比較寬鬆：
    - 怪物可以靠近障礙物
    - 只避免怪物和障礙物「幾乎同時」抵達玩家附近
    - 這樣攻擊鍵會變重要，但不會變成完全無解
  */

  const playerDangerX = WIND_PLAYER_BASE_X + WIND_PLAYER_W * 0.65;

  const obstacleCenterX = windObstacleX + 130;
  const scrollSpeed =
    typeof getWindScrollSpeed === "function"
      ? getWindScrollSpeed()
      : WIND_OBSTACLE_SPEED;

  const ghostSpeedEstimate =
    windGhostSpeed || ((WIND_GHOST_SPEED_MIN + WIND_GHOST_SPEED_MAX) / 2);

  const ghostTimeToPlayer =
    (WIND_GHOST_START_X - playerDangerX) / ghostSpeedEstimate;

  const obstacleTimeToPlayer =
    (obstacleCenterX - playerDangerX) / scrollSpeed;

  /*
    如果障礙物已經離玩家很遠、或已經通過玩家，
    就不用限制怪物生成。
  */
  if (obstacleTimeToPlayer <= 0) {
    return true;
  }

  /*
    只禁止「幾乎同時抵達」。
    0.38 秒以內才視為太危險。
  */
  const timeGap = Math.abs(obstacleTimeToPlayer - ghostTimeToPlayer);

  if (timeGap < WIND_GHOST_OBSTACLE_SAFE_TIME_GAP) {
    return false;
  }

  return true;
}


function updateWindGhostFloating(dt) {
  if (!windGhostActive) return;

  windGhostFloatTime += dt;

  const mainFloat =
    Math.sin(windGhostFloatTime * WIND_GHOST_FLOAT_SPEED + windGhostFloatPhase) *
    WIND_GHOST_FLOAT_AMPLITUDE;

  const smallDrift =
    Math.sin(windGhostFloatTime * WIND_GHOST_FLOAT_SPEED * 1.9 + windGhostFloatPhase) *
    WIND_GHOST_FLOAT_DRIFT;

  windGhostY = windGhostBaseY + mainFloat + smallDrift;
}


function resetWindGhost() {
  windGhostX = WIND_GHOST_START_X;
  windGhostActive = true;
  windGhostWaitingRespawn = false;
  windGhostRespawnCooldown = 0;

  const index = Math.floor(Math.random() * WIND_GHOST_Y_LIST.length);
windGhostBaseY = WIND_GHOST_Y_LIST[index];
windGhostY = windGhostBaseY;

windGhostFloatTime = 0;
windGhostFloatPhase = Math.random() * Math.PI * 2;

windGhostSpeed = getRandomWindGhostSpeed();

updateWindGhost();
}

function updateWindGhost() {
  if (!windGhost) return;

  if (!windGhostActive) {
    windGhost.classList.add("hidden");
    windGhost.classList.remove("ghost-defeated");

    // 不活動時永遠停在右側外面
    setWindElementPosition(windGhost, WIND_GHOST_START_X, 960);
    return;
  }

  setWindElementPosition(windGhost, windGhostX, windGhostY);

const ghostTilt =
  Math.sin(windGhostFloatTime * 4.2 + windGhostFloatPhase) * 4;

windGhost.style.transform += ` rotate(${ghostTilt}deg)`;

windGhost.classList.remove("hidden");
windGhost.classList.remove("ghost-defeated");
}

function updateWindGhostIntroSpawn() {
  if (windGameState !== "playing") return;
  if (windGhostIntroSpawned) return;

  if (windElapsedTime < WIND_GHOST_INTRO_DELAY) return;

  // 時機不安全就先等，不要硬生怪
  if (!isWindGhostSpawnTimingSafe()) return;

  windGhostIntroSpawned = true;
  resetWindGhost();
}

function updateWindGhostRespawn(dt) {
  if (windGameState !== "playing") return;
  if (!windGhostIntroSpawned) return;
  if (windGhostActive) return;
  if (!windGhostWaitingRespawn) return;

  windGhostRespawnCooldown -= dt;

  if (windGhostRespawnCooldown > 0) return;

  // 時機不安全就繼續等，不會立刻出生
  if (!isWindGhostSpawnTimingSafe()) return;

  windGhostWaitingRespawn = false;
  windGhostRespawnCooldown = 0;

  resetWindGhost();
}



function updateWindGhostMovement(dt) {
  if (!windGhostActive) return;

  windGhostX -= windGhostSpeed * dt;

  // 怪物一邊衝刺，一邊上下漂浮
  updateWindGhostFloating(dt);

  if (windGhostX < WIND_GHOST_END_X) {
    startWindGhostRespawnCooldown();
    return;
  }

  updateWindGhost();
}

function defeatWindGhost() {
  if (!windGhostActive) return;

  windGhostActive = false;

  // 只進入等待重生，不要立刻 hidden
  queueWindGhostRespawnAfterDefeat();

  playWindGhostDefeatEffect(windGhost, {
    duration: 190,
    resetX: WIND_GHOST_START_X,
    resetY: 960,
  });

  addWindScore(WIND_GHOST_DEFEAT_SCORE);
}


/* =========================
   Wind Game Rush Ghost
========================= */

const windGhostRush = document.getElementById("windGhostRush");

let windRushGhostX = 1700;
let windRushGhostY = 960;
let windRushGhostActive = false;
let windRushGhostIntroStarted = false;
let windRushGhostState = "idle";
// idle / waiting / warning / charging

let windRushGhostCooldown = 0;
let windRushGhostWarningTime = 0;

const WIND_RUSH_GHOST_INTRO_DELAY = 60;

const WIND_RUSH_GHOST_START_X = 1450;
const WIND_RUSH_GHOST_END_X = -240;

const WIND_RUSH_GHOST_W = 330;
const WIND_RUSH_GHOST_H = 330;

const WIND_RUSH_GHOST_SPEED = 1450;

// 出現前警告時間，給玩家反應
const WIND_RUSH_GHOST_WARNING_DURATION = 0.55;

// 每次突擊後多久再出現
const WIND_RUSH_GHOST_COOLDOWN_MIN = 7.5;
const WIND_RUSH_GHOST_COOLDOWN_MAX = 11.5;

// 鎖定玩家高度時的上下界，避免怪物出現在太極端的位置
const WIND_RUSH_GHOST_MIN_Y = 260;
const WIND_RUSH_GHOST_MAX_Y = 1660;


function clampWindRushGhostY(y) {
  return Math.max(
    WIND_RUSH_GHOST_MIN_Y,
    Math.min(WIND_RUSH_GHOST_MAX_Y, y)
  );
}

function getWindRushGhostCooldown() {
  return (
    WIND_RUSH_GHOST_COOLDOWN_MIN +
    Math.random() *
      (WIND_RUSH_GHOST_COOLDOWN_MAX - WIND_RUSH_GHOST_COOLDOWN_MIN)
  );
}

function getWindPlayerCenterY() {
  return WIND_PLAYER_BASE_Y + windPlayerY + WIND_PLAYER_H / 2;
}

function hideWindRushGhost() {
  windRushGhostActive = false;
  windRushGhostState = "idle";

  if (!windGhostRush) return;

  windGhostRush.classList.add("hidden");
  windGhostRush.classList.remove("rush-warning", "ghost-defeated");

  setWindElementPosition(windGhostRush, WIND_RUSH_GHOST_START_X, 960);
}

function resetWindRushGhostSystem() {
  windRushGhostX = WIND_RUSH_GHOST_START_X;
  windRushGhostY = 960;

  windRushGhostActive = false;
  windRushGhostIntroStarted = false;
  windRushGhostState = "idle";

  windRushGhostCooldown = 0;
  windRushGhostWarningTime = 0;

  hideWindRushGhost();
}


function startWindRushGhostWarning() {
  if (!windGhostRush) return;

  windRushGhostActive = true;
  windRushGhostState = "warning";

  windRushGhostX = WIND_RUSH_GHOST_START_X;

  // 鎖定玩家當下位置
  windRushGhostY = clampWindRushGhostY(getWindPlayerCenterY());

  windRushGhostWarningTime = WIND_RUSH_GHOST_WARNING_DURATION;

  setWindElementPosition(windGhostRush, windRushGhostX, windRushGhostY);

  windGhostRush.classList.remove("hidden", "ghost-defeated");
  windGhostRush.classList.add("rush-warning");
}

function startWindRushGhostCharge() {
  if (!windGhostRush) return;

  windRushGhostState = "charging";

  windGhostRush.classList.remove("rush-warning");
  windGhostRush.classList.remove("hidden");

  setWindElementPosition(windGhostRush, windRushGhostX, windRushGhostY);
}

function startWindRushGhostCooldown() {
  windRushGhostActive = false;
  windRushGhostState = "waiting";
  windRushGhostCooldown = getWindRushGhostCooldown();

  if (windGhostRush) {
    windGhostRush.classList.add("hidden");
    windGhostRush.classList.remove("rush-warning", "ghost-defeated");
    setWindElementPosition(windGhostRush, WIND_RUSH_GHOST_START_X, 960);
  }
}

function updateWindRushGhost(dt) {
  if (windGameState !== "playing") return;

  // 60 秒後才啟動突擊怪物系統
  if (!windRushGhostIntroStarted) {
    if (windElapsedTime < WIND_RUSH_GHOST_INTRO_DELAY) return;

    windRushGhostIntroStarted = true;
    startWindRushGhostWarning();
    return;
  }

  if (windRushGhostState === "waiting") {
    windRushGhostCooldown -= dt;

    if (windRushGhostCooldown <= 0) {
      startWindRushGhostWarning();
    }

    return;
  }

  if (windRushGhostState === "warning") {
    windRushGhostWarningTime -= dt;

    // 警告期間持續貼著玩家當下位置，讓牠看起來正在鎖定
    windRushGhostY = clampWindRushGhostY(getWindPlayerCenterY());
    setWindElementPosition(windGhostRush, windRushGhostX, windRushGhostY);

    if (windRushGhostWarningTime <= 0) {
      startWindRushGhostCharge();
    }

    return;
  }

  if (windRushGhostState === "charging") {
    windRushGhostX -= WIND_RUSH_GHOST_SPEED * dt;

    if (windRushGhostX < WIND_RUSH_GHOST_END_X) {
      startWindRushGhostCooldown();
      return;
    }

    setWindElementPosition(windGhostRush, windRushGhostX, windRushGhostY);
  }
}


/* =========================
   Wind Game Phase Ghost
========================= */

const windGhostPhase = document.getElementById("windGhostPhase");

let windPhaseGhostX = 1700;
let windPhaseGhostY = 960;
let windPhaseGhostBaseY = 960;
let windPhaseGhostActive = false;
let windPhaseGhostIntroStarted = false;
let windPhaseGhostState = "idle";
// idle / waiting / moving

let windPhaseGhostCooldown = 0;
let windPhaseGhostSpeed = 760;

let windPhaseGhostFloatTime = 0;
let windPhaseGhostFloatPhase = 0;

const WIND_PHASE_GHOST_INTRO_DELAY = 100;

const WIND_PHASE_GHOST_START_X = 1500;
const WIND_PHASE_GHOST_END_X = -240;

const WIND_PHASE_GHOST_W = 320;
const WIND_PHASE_GHOST_H = 320;

// 相位怪物比普通怪物稍微快一點，但不要像突擊怪那麼快
const WIND_PHASE_GHOST_SPEED_MIN = 420;
const WIND_PHASE_GHOST_SPEED_MAX = 620;

// 每次離場 / 被擊破後多久再出現
const WIND_PHASE_GHOST_COOLDOWN_MIN = 10.5;
const WIND_PHASE_GHOST_COOLDOWN_MAX = 15.5;

// 輕微漂浮，讓牠不像普通怪物那麼穩定
const WIND_PHASE_GHOST_FLOAT_AMPLITUDE = 26;
const WIND_PHASE_GHOST_FLOAT_SPEED = 4.4;
const WIND_PHASE_GHOST_FLOAT_DRIFT = 8;

function getWindPhaseGhostSpeed() {
  const level =
    typeof getWindDifficultyLevel === "function"
      ? getWindDifficultyLevel()
      : 0;

  const min = WIND_PHASE_GHOST_SPEED_MIN + level * 18;
  const max = WIND_PHASE_GHOST_SPEED_MAX + level * 24;

  const speed = min + Math.random() * (max - min);

  // 相位怪最高也不要太快，避免「透明 + 高速」變得不公平
  return Math.min(760, speed);
}

function getWindPhaseGhostCooldown() {
  return (
    WIND_PHASE_GHOST_COOLDOWN_MIN +
    Math.random() *
      (WIND_PHASE_GHOST_COOLDOWN_MAX - WIND_PHASE_GHOST_COOLDOWN_MIN)
  );
}

function hideWindPhaseGhost() {
  windPhaseGhostActive = false;
  windPhaseGhostState = "idle";

  if (!windGhostPhase) return;

  windGhostPhase.classList.add("hidden");
  windGhostPhase.classList.remove("phase-active", "ghost-defeated");

  setWindElementPosition(windGhostPhase, WIND_PHASE_GHOST_START_X, 960);
}

function resetWindPhaseGhostSystem() {
  windPhaseGhostX = WIND_PHASE_GHOST_START_X;
  windPhaseGhostBaseY = 960;
  windPhaseGhostY = windPhaseGhostBaseY;

  windPhaseGhostActive = false;
  windPhaseGhostIntroStarted = false;
  windPhaseGhostState = "idle";

  windPhaseGhostCooldown = 0;
  windPhaseGhostSpeed = 760;

  windPhaseGhostFloatTime = 0;
  windPhaseGhostFloatPhase = 0;

  hideWindPhaseGhost();
}

function startWindPhaseGhostCooldown(delay = getWindPhaseGhostCooldown()) {
  windPhaseGhostActive = false;
  windPhaseGhostState = "waiting";
  windPhaseGhostCooldown = delay;

  if (windGhostPhase) {
    windGhostPhase.classList.add("hidden");
    windGhostPhase.classList.remove("phase-active", "ghost-defeated");
    setWindElementPosition(windGhostPhase, WIND_PHASE_GHOST_START_X, 960);
  }
}

function canSpawnWindPhaseGhost() {
  // 突擊怪物正在出現時，先不要生成相位怪物
  // 避免 100 秒後畫面變成雙特殊怪壓迫
  if (windRushGhostActive) return false;
  if (windRushGhostState === "warning") return false;
  if (windRushGhostState === "charging") return false;

  // 也沿用普通怪物的安全時機判定，避免和障礙物精準同步壓到玩家
  if (typeof isWindGhostSpawnTimingSafe === "function") {
    return isWindGhostSpawnTimingSafe();
  }

  return true;
}

function resetWindPhaseGhost() {
  windPhaseGhostX = WIND_PHASE_GHOST_START_X;
  windPhaseGhostActive = true;
  windPhaseGhostState = "moving";
  windPhaseGhostCooldown = 0;

  const index = Math.floor(Math.random() * WIND_GHOST_Y_LIST.length);
  windPhaseGhostBaseY = WIND_GHOST_Y_LIST[index];
  windPhaseGhostY = windPhaseGhostBaseY;

  windPhaseGhostFloatTime = 0;
  windPhaseGhostFloatPhase = Math.random() * Math.PI * 2;

  windPhaseGhostSpeed = getWindPhaseGhostSpeed();

  renderWindPhaseGhost();
}

function updateWindPhaseGhostFloating(dt) {
  if (!windPhaseGhostActive) return;

  windPhaseGhostFloatTime += dt;

  const mainFloat =
    Math.sin(
      windPhaseGhostFloatTime * WIND_PHASE_GHOST_FLOAT_SPEED +
        windPhaseGhostFloatPhase
    ) * WIND_PHASE_GHOST_FLOAT_AMPLITUDE;

  const smallDrift =
    Math.sin(
      windPhaseGhostFloatTime * WIND_PHASE_GHOST_FLOAT_SPEED * 1.8 +
        windPhaseGhostFloatPhase
    ) * WIND_PHASE_GHOST_FLOAT_DRIFT;

  windPhaseGhostY = windPhaseGhostBaseY + mainFloat + smallDrift;
}

function renderWindPhaseGhost() {
  if (!windGhostPhase) return;

  if (!windPhaseGhostActive) {
    windGhostPhase.classList.add("hidden");
    windGhostPhase.classList.remove("phase-active", "ghost-defeated");
    setWindElementPosition(windGhostPhase, WIND_PHASE_GHOST_START_X, 960);
    return;
  }

  setWindElementPosition(windGhostPhase, windPhaseGhostX, windPhaseGhostY);

  const phaseTilt =
    Math.sin(windPhaseGhostFloatTime * 3.6 + windPhaseGhostFloatPhase) * 3;

  windGhostPhase.style.transform += ` rotate(${phaseTilt}deg)`;

  windGhostPhase.classList.remove("hidden", "ghost-defeated");
  windGhostPhase.classList.add("phase-active");
}

function updateWindPhaseGhost(dt) {
  if (windGameState !== "playing") return;

  // 100 秒後才啟動相位怪物系統
  if (!windPhaseGhostIntroStarted) {
    if (windElapsedTime < WIND_PHASE_GHOST_INTRO_DELAY) return;
    if (!canSpawnWindPhaseGhost()) return;

    windPhaseGhostIntroStarted = true;
    resetWindPhaseGhost();
    return;
  }

  if (windPhaseGhostState === "waiting") {
    windPhaseGhostCooldown -= dt;

    if (windPhaseGhostCooldown <= 0) {
      if (!canSpawnWindPhaseGhost()) return;
      resetWindPhaseGhost();
    }

    return;
  }

  if (windPhaseGhostState !== "moving") return;
  if (!windPhaseGhostActive) return;

  windPhaseGhostX -= windPhaseGhostSpeed * dt;

  updateWindPhaseGhostFloating(dt);

  if (windPhaseGhostX < WIND_PHASE_GHOST_END_X) {
    startWindPhaseGhostCooldown();
    return;
  }

  renderWindPhaseGhost();
}



/* =========================
   Wind Game Collectibles
========================= */

function setWindElementPosition(el, x, y) {
  if (!el) return;

  el.dataset.windX = String(x);
  el.dataset.windY = String(y);

  el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
}


function queueWindGhostRespawnAfterDefeat() {
  windGhostWaitingRespawn = true;
  windGhostRespawnCooldown = getWindGhostRespawnDelay();
}

function queueWindRushGhostRespawnAfterDefeat() {
  windRushGhostState = "waiting";
  windRushGhostCooldown = getWindRushGhostCooldown();
}

function queueWindPhaseGhostRespawnAfterDefeat() {
  windPhaseGhostState = "waiting";
  windPhaseGhostCooldown = getWindPhaseGhostCooldown();
}


const windDefeatEffectFrames = new Map();

function cancelWindGhostDefeatEffect(el) {
  if (!el) return;

  const frameId = windDefeatEffectFrames.get(el);

  if (frameId) {
    cancelAnimationFrame(frameId);
    windDefeatEffectFrames.delete(el);
  }

  el.style.opacity = "";
  el.style.filter = "";
  el.style.transition = "";
}

function cancelAllWindGhostDefeatEffects() {
  cancelWindGhostDefeatEffect(windGhost);
  cancelWindGhostDefeatEffect(windGhostRush);
  cancelWindGhostDefeatEffect(windGhostPhase);
}


function playWindGhostDefeatEffect(el, options = {}) {
  if (!el) return;

  // 防止同一隻怪物上一段擊殺動畫還沒結束又被重置 / 重新使用
  cancelWindGhostDefeatEffect(el);

  const {
    duration = 300,
    resetX = 1500,
    resetY = 960,
    keepCurrentOpacity = false,
    onComplete = null,

    // 左右震懾感
    shakeX = 38,
    shakeY = 2,
    shakeRotate = 3,
    shakeCount = 2.5,

   // 被擊退感：X 正數 = 往右，Y 負數 = 往上
knockbackX = 120,
knockbackY = -75,
  } = options;

  const baseX = Number(el.dataset.windX || resetX);
  const baseY = Number(el.dataset.windY || resetY);

  const startOpacity = keepCurrentOpacity
    ? Number(window.getComputedStyle(el).opacity || 1)
    : 1;

  const safeStartOpacity = Number.isFinite(startOpacity)
    ? startOpacity
    : 1;

  const startTime = performance.now();

  el.classList.remove(
    "ghost-defeated",
    "rush-warning",
    "phase-active"
  );

  el.classList.remove("hidden");

  el.style.transition = "";
  el.style.opacity = String(safeStartOpacity);
  el.style.filter = "brightness(1.08)";

  function smoothStep(t) {
    return t * t * (3 - 2 * t);
  }

  function frame(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);

    /*
      擊退滑動感：
      - 前 10% 先讓怪物承受斬擊震動
      - 之後才開始被往右推出
      - smoothStep 讓位移慢慢起步、慢慢停下
    */
    const knockbackT = Math.max(0, Math.min(1, (t - 0.1) / 0.9));
    const knockbackEase = smoothStep(knockbackT);

    const knockbackOffsetX = knockbackX * knockbackEase;
    const knockbackOffsetY = knockbackY * knockbackEase;

    /*
      震懾晃動：
      - 一開始最明顯
      - 隨著被擊退逐漸收斂
    */
    const shakeFade = 1 - smoothStep(t);
    const wave = Math.sin(t * Math.PI * 2 * shakeCount);

    const twitchX = wave * shakeX * shakeFade;
    const twitchY =
      Math.sin(t * Math.PI * 2 * shakeCount * 1.7) *
      shakeY *
      shakeFade;

    const twitchRotate = wave * shakeRotate * shakeFade;

    /*
  透明淡出：
  - 被砍中的瞬間就開始變透明
  - 和右上方擊退同時發生
*/
const fadeT = Math.min(1, t * 1.45);
const opacity = safeStartOpacity * (1 - fadeT);

    el.style.opacity = String(opacity);

    // 不要變白，只保留一點被擊中的亮度
    el.style.filter =
      `brightness(${1.05 + Math.sin(t * Math.PI) * 0.12})`;

    el.style.transform =
      `translate3d(${baseX + knockbackOffsetX + twitchX}px, ${baseY + knockbackOffsetY + twitchY}px, 0) ` +
      `translate(-50%, -50%) ` +
      `rotate(${twitchRotate}deg)`;

   if (t < 1) {
  const frameId = requestAnimationFrame(frame);
  windDefeatEffectFrames.set(el, frameId);
  return;
}

    el.classList.add("hidden");

    el.style.opacity = "";
    el.style.filter = "";
    el.style.transition = "";

    windDefeatEffectFrames.delete(el);

    setWindElementPosition(el, resetX, resetY);
    

    if (typeof onComplete === "function") {
      onComplete();
    }
  }

  const firstFrameId = requestAnimationFrame(frame);
windDefeatEffectFrames.set(el, firstFrameId);
}

function getWindLogicalElementRect(el, width, height) {
  if (!el) return null;

  const x = Number(el.dataset.windX);
  const y = Number(el.dataset.windY);

  if (Number.isNaN(x) || Number.isNaN(y)) return null;

  return {
    x: x - width / 2,
    y: y - height / 2,
    w: width,
    h: height,
  };
}

let windRouteSakuraCollected = [];
let windGoldRouteCollected = false;

let windBonusSakuraCollected = [];
let windBonusGoldCollected = [];

function resetWindRouteCollection() {
  windRouteSakuraCollected = new Array(WIND_ROUTE_SAKURA_COUNT).fill(false);
  windGoldRouteCollected = false;
}

function resetWindBonusCollection() {
  const bonusPoints =
    WIND_BONUS_FORMATIONS[windCurrentBonusFormation] || [];

  const bonusGoldPoints =
    typeof WIND_BONUS_GOLD_POINTS !== "undefined"
      ? (WIND_BONUS_GOLD_POINTS[windCurrentBonusFormation] || [])
      : [];

  windBonusSakuraCollected = new Array(bonusPoints.length).fill(false);
  windBonusGoldCollected = new Array(bonusGoldPoints.length).fill(false);
}


function isWindRectOverlap(a, b) {
  if (!a || !b) return false;

  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function isWindXNearPlayer(x, playerRect, margin = 240) {
  if (!playerRect) return false;

  const itemX = Number(x);

  // 如果拿不到數字，保守一點，不跳過碰撞判定
  if (Number.isNaN(itemX)) return true;

  return (
    itemX > playerRect.x - margin &&
    itemX < playerRect.x + playerRect.w + margin
  );
}

function getWindPlayerHitboxRect() {
  return insetWindRect(
    {
      x: WIND_PLAYER_BASE_X,
      y: WIND_PLAYER_BASE_Y + windPlayerY,
      w: WIND_PLAYER_W,
      h: WIND_PLAYER_H,
    },
    WIND_HITBOX_INSET.player
  );
}

function getWindSakuraHitboxRect(el) {
  return insetWindRect(
    getWindLogicalElementRect(el, 58, 58),
    WIND_HITBOX_INSET.sakura
  );
}

function getWindGoldHitboxRect(el) {
  const size = el && el.classList.contains("wind-bonus-gold")
    ? 86
    : 78;

  return insetWindRect(
    getWindLogicalElementRect(el, size, size),
    WIND_HITBOX_INSET.gold
  );
}

function getWindSlashHitboxRect() {
  if (!windAttackActive) return null;
  if (!windSlash || windSlash.classList.contains("hidden")) return null;

  return insetWindRect(
    getWindElementGameRect(windSlash),
    WIND_HITBOX_INSET.slash
  );
}

function getWindGhostHitboxRect() {
  if (!windGhostActive) return null;
  if (!windGhost || windGhost.classList.contains("hidden")) return null;

  return insetWindRect(
    {
      x: windGhostX - WIND_GHOST_W / 2,
      y: windGhostY - WIND_GHOST_H / 2,
      w: WIND_GHOST_W,
      h: WIND_GHOST_H,
    },
    WIND_HITBOX_INSET.ghost
  );
}

function getWindRushGhostHitboxRect() {
  if (!windRushGhostActive) return null;
  if (!windGhostRush || windGhostRush.classList.contains("hidden")) return null;

  return insetWindRect(
    {
      x: windRushGhostX - WIND_RUSH_GHOST_W / 2,
      y: windRushGhostY - WIND_RUSH_GHOST_H / 2,
      w: WIND_RUSH_GHOST_W,
      h: WIND_RUSH_GHOST_H,
    },
    WIND_HITBOX_INSET.rushGhost
  );
}


function getWindPhaseGhostHitboxRect() {
  if (!windPhaseGhostActive) return null;
  if (!windGhostPhase || windGhostPhase.classList.contains("hidden")) return null;

  return insetWindRect(
    {
      x: windPhaseGhostX - WIND_PHASE_GHOST_W / 2,
      y: windPhaseGhostY - WIND_PHASE_GHOST_H / 2,
      w: WIND_PHASE_GHOST_W,
      h: WIND_PHASE_GHOST_H,
    },
    WIND_HITBOX_INSET.phaseGhost
  );
}


function getWindObstacleHitboxRects() {
  const rects = [];

  if (windObstacleTop && windObstacleTop.style.display !== "none") {
    const topRect = insetWindRect(
      getWindElementGameRect(windObstacleTop),
      WIND_HITBOX_INSET.obstacleTop
    );

    if (topRect) {
      rects.push(topRect);
    }
  }

  if (windObstacleBottom && windObstacleBottom.style.display !== "none") {
    const bottomRect = insetWindRect(
      getWindElementGameRect(windObstacleBottom),
      WIND_HITBOX_INSET.obstacleBottom
    );

    if (bottomRect) {
      rects.push(bottomRect);
    }
  }

  return rects;
}





function updateWindCollectiblesCollision() {
  if (windGameState !== "playing") return;

  const playerRect = getWindPlayerHitboxRect();
  if (!playerRect) return;

  // 路線粉櫻花：+1
  for (let i = 0; i < windRouteSakuraEls.length; i++) {
    const el = windRouteSakuraEls[i];
    if (!el) continue;

    if (windRouteSakuraCollected[i]) {
      el.style.display = "none";
      continue;
    }

    if (el.style.display === "none") continue;

    // 先用 X 座標粗略判斷，太遠就不要讀 getBoundingClientRect()
   const sakuraX = Number(el.dataset.windX || "-9999");
    if (!isWindXNearPlayer(sakuraX, playerRect, 240)) continue;

    const sakuraRect = getWindSakuraHitboxRect(el);

    if (isWindRectOverlap(playerRect, sakuraRect)) {
      windRouteSakuraCollected[i] = true;
      el.style.display = "none";
      addWindScore(1);
    }
  }

  // 中開口金櫻花：+10
  if (windGoldRouteEl) {
    if (windGoldRouteCollected) {
      windGoldRouteEl.style.display = "none";
    } else if (windGoldRouteEl.style.display !== "none") {
    const goldX = Number(windGoldRouteEl.dataset.windX || "-9999");

      if (isWindXNearPlayer(goldX, playerRect, 280)) {
        const goldRect = getWindGoldHitboxRect(windGoldRouteEl);

        if (isWindRectOverlap(playerRect, goldRect)) {
          windGoldRouteCollected = true;
          windGoldRouteEl.style.display = "none";
          addWindScore(10);
        }
      }
    }
  }

  // bonus 粉櫻花：+1
  for (let i = 0; i < windBonusSakuraEls.length; i++) {
    const el = windBonusSakuraEls[i];
    if (!el) continue;

    if (windBonusSakuraCollected[i]) {
      el.style.display = "none";
      continue;
    }

    if (el.style.display === "none") continue;

    // 先用 X 座標粗略判斷，太遠就跳過
    const sakuraX = Number(el.dataset.windX || "-9999");
    if (!isWindXNearPlayer(sakuraX, playerRect, 240)) continue;

    const sakuraRect = getWindSakuraHitboxRect(el);

    if (isWindRectOverlap(playerRect, sakuraRect)) {
      windBonusSakuraCollected[i] = true;
      el.style.display = "none";
      addWindScore(1);
    }
  }

  // bonus 金櫻花：+10
  if (typeof windBonusGoldEls !== "undefined") {
    for (let i = 0; i < windBonusGoldEls.length; i++) {
      const el = windBonusGoldEls[i];
      if (!el) continue;

      if (windBonusGoldCollected[i]) {
        el.style.display = "none";
        continue;
      }

      if (el.style.display === "none") continue;

      // 金櫻花比較大，所以 margin 稍微放寬
      const goldX = Number(el.dataset.windX || "-9999");
      if (!isWindXNearPlayer(goldX, playerRect, 280)) continue;

      const goldRect = getWindGoldHitboxRect(el);

      if (isWindRectOverlap(playerRect, goldRect)) {
        windBonusGoldCollected[i] = true;
        el.style.display = "none";
        addWindScore(10);
      }
    }
  }
}

function updateWindObstacleCollision() {
  if (windGameState !== "playing") return;

  const playerRect = getWindPlayerHitboxRect();
  if (!playerRect) return;

  if (windObstacleX > playerRect.x + playerRect.w + 160) return;
  if (windObstacleX + 260 < playerRect.x - 160) return;

  const obstacleRects = getWindObstacleHitboxRects();

  for (const obstacleRect of obstacleRects) {
    if (isWindRectOverlap(playerRect, obstacleRect)) {
      windGameOver("crash");
      return;
    }
  }
}

function updateWindSlashGhostCollision() {
  if (windGameState !== "playing") return;
  if (!windAttackActive) return;
  if (!windGhostActive) return;

  // 怪物離玩家太遠時，不檢查斬擊
  const playerRect = getWindPlayerHitboxRect();
  if (!playerRect) return;

  if (windGhostX > playerRect.x + playerRect.w + 520) return;
  if (windGhostX < playerRect.x - 220) return;

  const slashRect = getWindSlashHitboxRect();
  const ghostRect = getWindGhostHitboxRect();

  if (!slashRect || !ghostRect) return;

  if (isWindRectOverlap(slashRect, ghostRect)) {
    defeatWindGhost();
  }
}


function defeatWindRushGhost() {
  if (!windRushGhostActive) return;

  windRushGhostActive = false;

  // 只進入等待重生，不要立刻 hidden
  queueWindRushGhostRespawnAfterDefeat();

  playWindGhostDefeatEffect(windGhostRush, {
    duration: 180,
    resetX: WIND_RUSH_GHOST_START_X,
    resetY: 960,
  });

  addWindScore(WIND_GHOST_DEFEAT_SCORE);
}

function updateWindSlashRushGhostCollision() {
  if (windGameState !== "playing") return;
  if (!windAttackActive) return;
  if (!windRushGhostActive) return;
  if (windRushGhostState !== "warning" && windRushGhostState !== "charging") return;

  const playerRect = getWindPlayerHitboxRect();
  if (!playerRect) return;

  // 突擊怪物離玩家還太遠時先不算，節省效能
  if (windRushGhostX > playerRect.x + playerRect.w + 640) return;
  if (windRushGhostX < playerRect.x - 260) return;

  const slashRect = getWindSlashHitboxRect();
  const rushRect = getWindRushGhostHitboxRect();

  if (!slashRect || !rushRect) return;

  if (isWindRectOverlap(slashRect, rushRect)) {
    defeatWindRushGhost();
  }
}


function defeatWindPhaseGhost() {
  if (!windPhaseGhostActive) return;

  windPhaseGhostActive = false;

  // 只進入等待重生，不要立刻 hidden
  queueWindPhaseGhostRespawnAfterDefeat();

  playWindGhostDefeatEffect(windGhostPhase, {
    duration: 190,
    resetX: WIND_PHASE_GHOST_START_X,
    resetY: 960,

    // 相位怪維持被砍中當下透明度
    keepCurrentOpacity: true,
  });

  addWindScore(WIND_GHOST_DEFEAT_SCORE);
}

function updateWindSlashPhaseGhostCollision() {
  if (windGameState !== "playing") return;
  if (!windAttackActive) return;
  if (!windPhaseGhostActive) return;

  const playerRect = getWindPlayerHitboxRect();
  if (!playerRect) return;

  // 離玩家太遠時先不算
  if (windPhaseGhostX > playerRect.x + playerRect.w + 560) return;
  if (windPhaseGhostX < playerRect.x - 260) return;

  const slashRect = getWindSlashHitboxRect();
  const phaseRect = getWindPhaseGhostHitboxRect();

  if (!slashRect || !phaseRect) return;

  if (isWindRectOverlap(slashRect, phaseRect)) {
    defeatWindPhaseGhost();
  }
}

function updateWindGhostCollision() {
  if (windGameState !== "playing") return;
  if (!windGhostActive) return;
  if (!windGhost || windGhost.classList.contains("hidden")) return;

  const playerRect = getWindPlayerHitboxRect();
  if (!playerRect) return;

  // 太遠時先跳過，連 hitbox 都不用算
  if (windGhostX > playerRect.x + playerRect.w + 220) return;
  if (windGhostX + WIND_GHOST_W / 2 < playerRect.x - 220) return;

  const ghostRect = getWindGhostHitboxRect();
  if (!ghostRect) return;

  if (isWindRectOverlap(playerRect, ghostRect)) {
    windGameOver("ghost");
  }
}


function updateWindRushGhostCollision() {
  if (windGameState !== "playing") return;
  if (!windRushGhostActive) return;
  if (windRushGhostState !== "charging") return;
  if (!windGhostRush || windGhostRush.classList.contains("hidden")) return;

  const playerRect = getWindPlayerHitboxRect();
  if (!playerRect) return;

  if (windRushGhostX > playerRect.x + playerRect.w + 260) return;
  if (windRushGhostX + WIND_RUSH_GHOST_W / 2 < playerRect.x - 260) return;

  const rushRect = getWindRushGhostHitboxRect();
  if (!rushRect) return;

  if (isWindRectOverlap(playerRect, rushRect)) {
   windGameOver("ghost");
  }
}



function updateWindPhaseGhostCollision() {
  if (windGameState !== "playing") return;
  if (!windPhaseGhostActive) return;
  if (!windGhostPhase || windGhostPhase.classList.contains("hidden")) return;

  const playerRect = getWindPlayerHitboxRect();
  if (!playerRect) return;

  if (windPhaseGhostX > playerRect.x + playerRect.w + 240) return;
  if (windPhaseGhostX + WIND_PHASE_GHOST_W / 2 < playerRect.x - 240) return;

  const phaseRect = getWindPhaseGhostHitboxRect();
  if (!phaseRect) return;

  if (isWindRectOverlap(playerRect, phaseRect)) {
    windGameOver("ghost");
  }
}


/* =========================
   Wind Game Debug Hitboxes
========================= */

const WIND_DEBUG_HITBOX = false;
const WIND_DEBUG_GHOST_HITBOX = false;
const WIND_DEBUG_SLASH_HITBOX = false;

const windHitboxLayer = document.getElementById("windHitboxLayer");

let windDebugHitboxEls = [];



function clearWindDebugHitboxes() {
  if (!windHitboxLayer) return;

  for (const el of windDebugHitboxEls) {
    el.remove();
  }

  windDebugHitboxEls = [];
}

function drawWindDebugHitbox(rect, type) {
  if (
    !WIND_DEBUG_HITBOX &&
    !WIND_DEBUG_GHOST_HITBOX &&
    !WIND_DEBUG_SLASH_HITBOX
  ) return;

  if (!windHitboxLayer) return;
  if (!rect) return;

  const box = document.createElement("div");
  box.className = `wind-hitbox wind-hitbox-${type}`;

  box.style.left = `${rect.x}px`;
  box.style.top = `${rect.y}px`;
  box.style.width = `${rect.w}px`;
  box.style.height = `${rect.h}px`;

  windHitboxLayer.appendChild(box);
  windDebugHitboxEls.push(box);
}


function getWindElementGameRect(el) {
  if (!el || !gameRoot) return null;

  const rootRect = gameRoot.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();

  const scaleX = 1080 / rootRect.width;
  const scaleY = 1920 / rootRect.height;

  return {
    x: (elRect.left - rootRect.left) * scaleX,
    y: (elRect.top - rootRect.top) * scaleY,
    w: elRect.width * scaleX,
    h: elRect.height * scaleY,
  };
}

function insetWindRect(rect, inset) {
  if (!rect) return null;

  const left = inset.left || 0;
  const right = inset.right || 0;
  const top = inset.top || 0;
  const bottom = inset.bottom || 0;

  return {
    x: rect.x + left,
    y: rect.y + top,
    w: Math.max(0, rect.w - left - right),
    h: Math.max(0, rect.h - top - bottom),
  };
}


const WIND_HITBOX_INSET = {
  player: {
    left: 150,
    right: 160,
    top: 70,
    bottom: 50,
  },

  obstacleTop: {
    left: 5,
    right: 5,
    top: 0,
    bottom: 300,
  },

  obstacleBottom: {
    left: 5,
    right: 5,
    top: 300,
    bottom: 0,
  },

  sakura: {
    left: 12,
    right: 12,
    top: 12,
    bottom: 12,
  },

  gold: {
    left: 14,
    right: 14,
    top: 14,
    bottom: 14,
  },

ghost: {
  left: 50,
  right: 75,
  top: 60,
  bottom: 60,
},

rushGhost: {
  left: 58,
  right: 78,
  top: 62,
  bottom: 62,
},

phaseGhost: {
  left: 62,
  right: 82,
  top: 66,
  bottom: 66,
},

slash: {
  left: 120,
  right: 120,
  top: 40,
  bottom: 5,
},

};


function updateWindDebugHitboxes() {
  if (
    !WIND_DEBUG_HITBOX &&
    !WIND_DEBUG_GHOST_HITBOX &&
    !WIND_DEBUG_SLASH_HITBOX
  ) return;

  clearWindDebugHitboxes();

  // 劍氣 hitbox
  if (WIND_DEBUG_SLASH_HITBOX) {
    const slashRect = getWindSlashHitboxRect();
    drawWindDebugHitbox(slashRect, "obstacle");
  }

  // 怪物 hitbox
  if (
    WIND_DEBUG_GHOST_HITBOX &&
    windGhostActive &&
    windGhost &&
    !windGhost.classList.contains("hidden")
  ) {
    const ghostRect = getWindGhostHitboxRect();
    drawWindDebugHitbox(ghostRect, "obstacle");
  }

  // 如果需要全 debug，再畫其他碰撞箱
  if (!WIND_DEBUG_HITBOX) return;

  // 玩家 hitbox
  const playerRect = insetWindRect(
    getWindElementGameRect(windPlayer),
    WIND_HITBOX_INSET.player
  );
  drawWindDebugHitbox(playerRect, "player");

  // 障礙物 hitbox
  if (windObstacleTop && windObstacleTop.style.display !== "none") {
    const topRect = insetWindRect(
      getWindElementGameRect(windObstacleTop),
      WIND_HITBOX_INSET.obstacleTop
    );
    drawWindDebugHitbox(topRect, "obstacle");
  }

  if (windObstacleBottom && windObstacleBottom.style.display !== "none") {
    const bottomRect = insetWindRect(
      getWindElementGameRect(windObstacleBottom),
      WIND_HITBOX_INSET.obstacleBottom
    );
    drawWindDebugHitbox(bottomRect, "obstacle");
  }

  // 路線粉櫻花 hitbox
  for (const el of windRouteSakuraEls) {
    if (!el || el.style.display === "none") continue;

    const rect = insetWindRect(
      getWindElementGameRect(el),
      WIND_HITBOX_INSET.sakura
    );
    drawWindDebugHitbox(rect, "sakura");
  }

  // 中開口金櫻花 hitbox
  if (windGoldRouteEl && windGoldRouteEl.style.display !== "none") {
    const rect = insetWindRect(
      getWindElementGameRect(windGoldRouteEl),
      WIND_HITBOX_INSET.gold
    );
    drawWindDebugHitbox(rect, "gold");
  }

  // bonus 粉櫻花 hitbox
  for (const el of windBonusSakuraEls) {
    if (!el || el.style.display === "none") continue;

    const rect = insetWindRect(
      getWindElementGameRect(el),
      WIND_HITBOX_INSET.sakura
    );
    drawWindDebugHitbox(rect, "sakura");
  }

  // bonus 金櫻花 hitbox
  if (typeof windBonusGoldEls !== "undefined") {
    for (const el of windBonusGoldEls) {
      if (!el || el.style.display === "none") continue;

      const rect = insetWindRect(
        getWindElementGameRect(el),
        WIND_HITBOX_INSET.gold
      );
      drawWindDebugHitbox(rect, "gold");
    }
  }
}


/* =========================
   Wind Game Score
========================= */

const windScoreEl = document.getElementById("windScore");

const windResultPanel = document.getElementById("windResultPanel");
const windResultScore = document.getElementById("windResultScore");
const windResultBest = document.getElementById("windResultBest");

const windResultImage = document.getElementById("windResultImage");

const WIND_RESULT_IMAGE = {
  crash: "images/wind-result-ghost.png",
  ghost: "images/wind-result-crash.png",
};

let windGameOverReason = "crash";

const btnWindRetry = document.getElementById("btnWindRetry");
const btnWindResultMenu = document.getElementById("btnWindResultMenu");



if (btnWindRetry) {
  btnWindRetry.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    resetWindGameSession();
    scheduleWindRetryStart();
  });
}

if (btnWindResultMenu) {
  btnWindResultMenu.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    backToMenuFromWindGame();
  });
}

let windScore = 0;

function resetWindScore() {
  windScore = 0;
  updateWindScoreDisplay();
}

function addWindScore(amount) {
  windScore += amount;
  updateWindScoreDisplay();
}

function updateWindScoreDisplay() {
  if (!windScoreEl) return;
  windScoreEl.textContent = windScore;
}

function showWindResultPanel() {
  if (!windResultPanel) return;

  if (windResultImage) {
    windResultImage.src =
      windGameOverReason === "ghost"
        ? WIND_RESULT_IMAGE.ghost
        : WIND_RESULT_IMAGE.crash;
  }

  const bestScore = saveWindBestScore(windScore);

  if (windResultScore) {
    windResultScore.textContent = windScore;
  }

  if (windResultBest) {
    windResultBest.textContent = bestScore;
  }

  windResultPanel.classList.remove("hidden");
}

function hideWindResultPanel() {
  if (!windResultPanel) return;

  windResultPanel.classList.add("hidden");
}

const WIND_BEST_SCORE_KEY = "nanahara-wind-best-score-v1";

function getWindBestScore() {
  const raw = localStorage.getItem(WIND_BEST_SCORE_KEY);
  const value = Number(raw);

  return Number.isFinite(value) ? value : 0;
}

function saveWindBestScore(score) {
  const best = getWindBestScore();

  if (score > best) {
    localStorage.setItem(WIND_BEST_SCORE_KEY, String(score));
    return score;
  }

  return best;
}



function resetWindGameSession() {

  clearWindRetryStartTimer();
  clearWindCountdown();
  cancelAllWindGhostDefeatEffects();
  stopWindPlayerCountdownFloat(true);

  // 停止遊戲 loop
 if (windAnimFrame) {
  cancelAnimationFrame(windAnimFrame);
  windAnimFrame = null;

}

  if (windAttackButtonFeedbackTimer) {
  clearTimeout(windAttackButtonFeedbackTimer);
  windAttackButtonFeedbackTimer = null;
}

setWindButtonPressed(btnWindAttack, false);

clearWindDebugHitboxes();
hideWindResultPanel();
hideWindPauseOverlay();
showWindPauseButton();
resumeSakuraForWindGame();

  // 重置狀態
  setWindGameState("idle");

  windGameOverReason = "crash";

  // 重置操作狀態
  windKeyboardFlyPressed = false;
windFlyPressed = false;

  windAttackActive = false;

  windAttackQueued = false;

 if (windAttackTimer) {
  clearTimeout(windAttackTimer);
  windAttackTimer = null;
}

windGhostWaitingRespawn = false;
windGhostRespawnCooldown = 0;
windGhostActive = false;

  // 重置玩家物理
  windPlayerY = 0;
windPlayerVY = 0;
windLastTime = 0;
windElapsedTime = 0;
applyWindPlayerPosition();
  resetWindPlayerTilt();

  // 重置角色差分
  if (windChinatsu) {
    windChinatsu.src = "images/wind-chinatsu-down.png";
  }

  if (windChifuyu) {
    windChifuyu.src = "images/wind-chifuyu-idle.png";
  }

  if (windSlash) {
windSlash.classList.remove(
  "slash-active",
  "slash-active-a",
  "slash-active-b"
);
windSlash.classList.add("hidden");
  }

  // 重置分數
  resetWindScore();

  // 重置障礙物、櫻花、bonus、收集狀態
  resetWindObstacle();


  prepareWindGhostIntro();

  resetWindRushGhostSystem();
  resetWindPhaseGhostSystem();

  // 清除 debug hitbox
  clearWindDebugHitboxes();
}










btnOmikuji.addEventListener("click", () => {
  goToScreen(menuScreen, omikujiScreen, 600);
});

if (btnGarden) {
  btnGarden.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (shrineScreenTransitionBusy) return;

/*
  正式進 Garden，
  停止 Menu 的低優先背景預載排程。
*/
pauseGardenBackgroundPreload();


const gardenInitialMode =
  planGardenInitialMode();
// 點進庭院時，立刻切換音訊
    // 這樣手機比較不會因為 autoplay 限制擋掉新 BGM
    enterGardenAudioMode();

    if (typeof goToScreen === "function" && menuScreen && gardenScreen) {
      goToScreen(
        menuScreen,
        gardenScreen,
        600,

        async () => {
  pauseSakuraForGarden();

  let timeoutId = null;

  try {
    await Promise.race([
      preloadGardenAssets(
  gardenInitialMode
),

      new Promise((resolve) => {
        timeoutId = setTimeout(() => {
          console.warn(
            "[Garden] preload safety timeout — opening Garden anyway."
          );

          resolve();
        }, 15000);
      }),
    ]);
  } catch (err) {
    /*
      即使 Safari 某個 preload / warmup 發生例外，
      也不能讓拉門永久鎖住。
    */
    console.error(
      "[Garden] preload failed:",
      err
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
},

        () => {
  let actualInitialMode = "wander";

  if (
    typeof initGardenScreen ===
    "function"
  ) {
    actualInitialMode =
      initGardenScreen() ||
      "wander";
  }

updateGardenSceneNav();

  startGardenUiAutoHide();


  if (GARDEN_IPAD_SAFE_MODE) {

  /*
    iPadOS：
    Garden 已經真正顯示後，
    再慢慢把「其他模式的壓縮 PNG」
    放進 HTTP cache。

    注意：
    這裡不建立 Image，
    不 decode，
    不 warmup。
  */
if (actualInitialMode === "chat") {

  /*
    聊天期間先把 Idle 壓縮檔放進 cache。
  */
  queueGardenCompressedModeCache(
    "idle",
    600
  );

  /*
    初次進場就是聊天時，
    趁 Talk 還在播放，
    先把之後一定會使用的 Walk
    做完整 cache + warmup。

    這樣聊天結束後開始散步時，
    不會出現「有位移但仍停在 Idle」。
  */
  setTimeout(async () => {
    if (
      !gardenScreen ||
      gardenScreen.classList.contains(
        "hidden"
      )
    ) {
      return;
    }

    await precacheGardenCharacterModeCompressed(
      "walk"
    );

    if (
      !gardenScreen ||
      gardenScreen.classList.contains(
        "hidden"
      )
    ) {
      return;
    }

    await requestGardenAnimationWarmup(
      "chifuyu",
      "walk",
      CHIFUYU_ANIMS.walk
    );

    if (
      !gardenScreen ||
      gardenScreen.classList.contains(
        "hidden"
      )
    ) {
      return;
    }

    await requestGardenAnimationWarmup(
      "chinatsu",
      "walk",
      CHINATSU_ANIMS.walk
    );
  }, 800);

} else {
  }

  return;
}


  /*
    非 iPad 維持原本 warmup。
  */
  if (
    typeof startGardenDeferredAnimationWarmup ===
    "function"
  ) {
    startGardenDeferredAnimationWarmup();
  }
}
      );
    } else {
  menuScreen.classList.add(
    "hidden"
  );

  gardenScreen.classList.remove(
    "hidden"
  );

  if (
    typeof initGardenScreen ===
    "function"
  ) {
    initGardenScreen();
  }

  startGardenUiAutoHide();
}
  });
}



if (btnMission) {
  btnMission.addEventListener("click", () => {
    /*
      Wind Game 永遠比 Garden 背景預載優先。
    */
    pauseGardenBackgroundPreload();

    prepareWindGameBackground();
    resetWindGameSession();

    enterWindGameAudioMode();

    if (typeof goToScreen === "function" && menuScreen && windGameScreen) {
      goToScreen(menuScreen, windGameScreen, 600, async () => {
        // 拉門已經完全闔上後，才進入小遊戲效能模式
        // 這樣主畫面的夜晚版不會在玩家眼前突然變白天
        enterWindGamePerformanceMode();

        await preloadWindGameAssets();

        warmupWindGameDom();

        setTimeout(() => {
          startWindCountdown();
        }, 850);
      });
    } else {
      console.warn("[Mission] goToScreen/menuScreen/windGameScreen not ready");
    }
  });
}

// ===== Omikuji / Omamori 右上角 Menu 按鈕 =====
const btnOmikujiMenu = document.getElementById("btnOmikujiMenu");
const btnOmamoriMenu = document.getElementById("btnOmamoriMenu");
const btnGardenMenu = document.getElementById("btnGardenMenu");

const btnGardenSceneLeft =
  document.getElementById(
    "btnGardenSceneLeft"
  );

const btnGardenSceneRight =
  document.getElementById(
    "btnGardenSceneRight"
  );

  /* =========================
   Garden Scene Navigation
========================= */

let gardenSceneSwitchBusy = false;


function updateGardenSceneNav() {
  const scene =
    getCurrentGardenScene();

  const nav =
    scene?.nav || {};


  if (btnGardenSceneLeft) {
    const target =
      nav.left || null;

    btnGardenSceneLeft.disabled =
      !target;

    btnGardenSceneLeft.dataset.sceneTarget =
      target || "";
  }


  if (btnGardenSceneRight) {
    const target =
      nav.right || null;

    btnGardenSceneRight.disabled =
      !target;

    btnGardenSceneRight.dataset.sceneTarget =
      target || "";
  }
}

async function handleGardenSceneNav(
  button
) {
  if (!button) return;

  if (gardenSceneSwitchBusy) {
    return;
  }


  const targetSceneId =
    button.dataset.sceneTarget;

  if (!targetSceneId) {
    return;
  }


  gardenSceneSwitchBusy = true;


  /*
    preload / 切換期間，
    兩顆箭頭暫時都不能再按，
    避免快速連點造成兩次場景切換。
  */
  if (btnGardenSceneLeft) {
    btnGardenSceneLeft.disabled =
      true;
  }

  if (btnGardenSceneRight) {
    btnGardenSceneRight.disabled =
      true;
  }


  try {
    const switched =
  await switchGardenScene(
    targetSceneId,
    {
      /*
        玩家切場景永遠只是在換鏡頭。

        不論角色是否 travel，
        都不能重新生成角色。
      */
      resetCharacters: false,
    }
  );


    if (switched) {


 /*
    玩家切完場景後，
    馬上重新判斷角色是否應該可見。
  */
  updateGardenCharacterVisibility();





      /*
        場景成功切換後，
        重新決定左右方向。
      */
      updateGardenSceneNav();


      /*
        使用者剛操作過 UI，
        重新開始 3 秒隱藏計時。
      */
      showGardenUi({
        restartTimer: true,
      });
    }

  } catch (err) {
    console.error(
      "[Garden] scene nav failed:",
      err
    );

  } finally {
    gardenSceneSwitchBusy =
      false;

    /*
      switchGardenScene() 如果因聊天等原因
      回傳 false，也要恢復正確按鈕狀態。
    */
    updateGardenSceneNav();
  }
}

if (btnGardenSceneLeft) {
  btnGardenSceneLeft.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      handleGardenSceneNav(
        btnGardenSceneLeft
      );
    }
  );
}


if (btnGardenSceneRight) {
  btnGardenSceneRight.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      handleGardenSceneNav(
        btnGardenSceneRight
      );
    }
  );
}




/* =========================
   Garden Auto-hide UI
========================= */

const GARDEN_UI_IDLE_HIDE_MS =
  3000;

let gardenUiHideTimer = null;
let gardenSuppressNextClick = false;
let gardenSuppressClickTimer = null;


function isGardenUiActive() {
  return (
    gardenScreen &&
    !gardenScreen.classList.contains(
      "hidden"
    )
  );
}


function clearGardenUiHideTimer() {
  if (!gardenUiHideTimer) {
    return;
  }

  clearTimeout(
    gardenUiHideTimer
  );

  gardenUiHideTimer = null;
}


function hideGardenUi() {
  gardenUiHideTimer = null;

  if (!isGardenUiActive()) {
    return;
  }

  document.body.classList.add(
    "garden-ui-hidden"
  );
}


function scheduleGardenUiHide() {
  clearGardenUiHideTimer();

  if (!isGardenUiActive()) {
    return;
  }

  gardenUiHideTimer =
    setTimeout(
      hideGardenUi,
      GARDEN_UI_IDLE_HIDE_MS
    );
}


function showGardenUi(
  options = {}
) {
  const {
    restartTimer = true,
  } = options;

  document.body.classList.remove(
    "garden-ui-hidden"
  );

  if (restartTimer) {
    scheduleGardenUiHide();
  }
}


function startGardenUiAutoHide() {
  /*
    每次進入 Garden，
    UI 都先完整顯示。
  */
  showGardenUi({
    restartTimer: true,
  });
}


function stopGardenUiAutoHide() {
  clearGardenUiHideTimer();

  gardenSuppressNextClick = false;

  if (gardenSuppressClickTimer) {
    clearTimeout(
      gardenSuppressClickTimer
    );

    gardenSuppressClickTimer = null;
  }

  document.body.classList.remove(
    "garden-ui-hidden"
  );
}


/*
  Garden UI 隱藏時：

  第一次 pointerdown
  → 只喚醒 UI
  → 阻止其他 pointerdown 行為
  → 標記下一個 click 也要吃掉

  後續 click
  → 完全攔截
*/
document.addEventListener(
  "pointerdown",
  (e) => {
    if (!isGardenUiActive()) {
      return;
    }

    const uiWasHidden =
      document.body.classList.contains(
        "garden-ui-hidden"
      );

    /*
      UI 已經隱藏：
      這一下只能喚醒 UI。
    */
    if (uiWasHidden) {
      gardenSuppressNextClick = true;

      if (gardenSuppressClickTimer) {
        clearTimeout(
          gardenSuppressClickTimer
        );
      }

      /*
        如果瀏覽器最後沒有產生 click，
        800ms 後自動解除旗標。
      */
      gardenSuppressClickTimer =
        setTimeout(() => {
          gardenSuppressNextClick = false;
          gardenSuppressClickTimer = null;
        }, 800);

      showGardenUi({
        restartTimer: true,
      });

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      return;
    }

    /*
      UI 原本就在顯示中：
      任意操作重新計算 3 秒。
    */
    scheduleGardenUiHide();
  },
  true
);


document.addEventListener(
  "click",
  (e) => {
    if (!isGardenUiActive()) {
      return;
    }

    if (!gardenSuppressNextClick) {
      return;
    }

    gardenSuppressNextClick = false;

    if (gardenSuppressClickTimer) {
      clearTimeout(
        gardenSuppressClickTimer
      );

      gardenSuppressClickTimer =
        null;
    }

    /*
      把剛才喚醒 UI 的那一次 click
      完整吃掉。
    */
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  },
  true
);


// 共用回 Menu 行為（會自動帶門動畫）
function backToMenuFrom(screenEl) {
  if (!screenEl || !menuScreen) return;

  if (screenEl === omamoriScreen && typeof exitOmamoriFocusMode === "function") {
    exitOmamoriFocusMode();
  }

if (screenEl === gardenScreen) {

  stopGardenUiAutoHide();

  stopMoonBridgeClouds();

  if (
    typeof stopChifuyuWalkMoveTest ===
    "function"
  ) {
    stopChifuyuWalkMoveTest();
  }

  if (typeof goToScreen === "function") {
    goToScreen(
      screenEl,
      menuScreen,
      600,
      null,
      () => {
        if (typeof resumeSakuraFromGarden === "function") {
          resumeSakuraFromGarden();
        }

        // 回到主選單後，停止庭院 BGM，恢復主介面 BGM
        exitGardenAudioMode();
      }
    );
  } else {
    screenEl.classList.add("hidden");
    menuScreen.classList.remove("hidden");

    if (typeof resumeSakuraFromGarden === "function") {
      resumeSakuraFromGarden();
    }

    exitGardenAudioMode();
  }

  return;
}

  if (typeof goToScreen === "function") {
    goToScreen(screenEl, menuScreen, 600);
  } else {
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

if (btnGardenMenu) {
  btnGardenMenu.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    backToMenuFrom(gardenScreen);
  });
}

function backToMenuFromWindGame() {
  resetWindGameSession();
  switchToShrineBgm();

  if (typeof goToScreen === "function" && windGameScreen && menuScreen) {
    goToScreen(windGameScreen, menuScreen, 600, async () => {
      // 拉門關上後才恢復主畫面日夜模式
      exitWindGamePerformanceMode();
    });
  } else {
    windGameScreen.classList.add("hidden");
    menuScreen.classList.remove("hidden");
    exitWindGamePerformanceMode();
  }
}

if (btnWindGameMenu) {
  btnWindGameMenu.addEventListener("click", toggleWindGamePause);
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


const OMAMORI_CHAR_ASSETS = {
  left:  { count: 6, prefix: "images/omamori-characters-left-",  pad: 2, ext: ".png" },
  right: { count: 6, prefix: "images/omamori-characters-right-", pad: 2, ext: ".png" },
};

function charPath(side, index0){
  const cfg = OMAMORI_CHAR_ASSETS[side];
  const num = String(index0 + 1).padStart(cfg.pad, "0");
  return `${cfg.prefix}${num}${cfg.ext}`;
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

// ===== 角色差分圖片預載快取 =====
const omamoriCharCache = new Map(); // url -> HTMLImageElement

function preloadCharOne(url){
  if (!url) return Promise.resolve(null);
  if (omamoriCharCache.has(url)) return Promise.resolve(omamoriCharCache.get(url));

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try { if (img.decode) await img.decode(); } catch {}
      omamoriCharCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// 可選：進 omamori 畫面後用 idle 預載全部差分（你本來就有 startOmamoriPreloadIdle，可把這個包進去）
async function preloadAllOmamoriCharVariantsBatch(batchSize = 2){
  if (typeof OMAMORI_CHAR_VARIANTS === "undefined") return; // ✅ 防呆
  const urls = [
    ...(OMAMORI_CHAR_VARIANTS.left || []),
    ...(OMAMORI_CHAR_VARIANTS.right || []),
  ];
  const pending = urls.filter(u => u && !omamoriCharCache.has(u));

  for (let i = 0; i < pending.length; i += batchSize){
    const batch = pending.slice(i, i + batchSize);
    await Promise.all(batch.map(preloadCharOne));
    await new Promise(r => setTimeout(r, 16));
  }
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
    requestIdleCallback(() => {
      preloadOmamoriAllPartsBatch(4);
      preloadAllOmamoriCharVariantsBatch(2); // ✅ 新增：角色差分也預載
    }, { timeout: 1200 });
  } else {
    preloadOmamoriAllPartsBatch(4);
    preloadAllOmamoriCharVariantsBatch(2);   // ✅ 新增：角色差分也預載
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

let omamoriCharLeft = null;
let omamoriCharRight = null;

function ensureOmamoriCharEls(){
  if (!omamoriCharLeft) omamoriCharLeft = document.getElementById("omamoriCharLeft");
  if (!omamoriCharRight) omamoriCharRight = document.getElementById("omamoriCharRight");
}


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

function popCharacterByImg(imgEl) {
  if (!imgEl) return;

  imgEl.classList.remove("npc-pop");
  void imgEl.offsetWidth;
  imgEl.classList.add("npc-pop");

  imgEl.addEventListener(
    "animationend",
    () => imgEl.classList.remove("npc-pop"),
    { once: true }
  );
}


async function setCharacterVariantSafe(side, variantIndex){
  ensureOmamoriCharEls();

  const imgEl = (side === "left") ? omamoriCharLeft : omamoriCharRight;
  const variants = OMAMORI_CHAR_VARIANTS[side];

  if (!imgEl || !variants || !variants.length) return;

  const url = variants[variantIndex];
  if (!url) return;

  // 1) 先預載 + decode（避免第一次切換延遲）
  await preloadCharOne(url);

  // 2) 再換圖
  if (imgEl.src !== url) imgEl.src = url;

  // 3) 雙保險：等 DOM img decode
  try { if (imgEl.decode) await imgEl.decode(); } catch {}

  // 4) 最後才做 pop（確保不是「先跳再換」）
  popCharacterByImg(imgEl);
}



// ✅ 單邊（left / right）一次變化：換台詞 + 換差分 + 彈跳
async function omamoriChangeOneSide(side) {
  // 不在 omamori 畫面就停掉（避免背景亂跑）
  if (!omamoriScreen || omamoriScreen.classList.contains("hidden")) {
    stopOmamoriAutoTalk(side);
    return;
  }

  ensureOmamoriCharEls();

  // 1) 換台詞（不連續）
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

  // 2) 換差分：先確保圖載好，再換，再 pop
  if (side === "left") {
    const v = toggleCharacterVariant("left");
    await setCharacterVariantSafe("left", v);
  }

  if (side === "right") {
    const v = toggleCharacterVariant("right");
    await setCharacterVariantSafe("right", v);
  }

  // 3) 排程下一次
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
const BASE_W = 600;           // 你原本的設計寬
const BASE_TOP_H = 453;
const BASE_BOTTOM_H = 342;
const BASE_KNOT_H = 197;
const BASE_KNOT_Y_OFFSET = 10;

const scale = 1.05;            // ✅ 只調這個：0.95、1.05、1.12...

const omW = Math.round(BASE_W * scale);
const TOP_H = Math.round(BASE_TOP_H * scale);
const BOTTOM_H = Math.round(BASE_BOTTOM_H * scale);
const KNOT_H = Math.round(BASE_KNOT_H * scale);
const KNOT_Y_OFFSET = Math.round(BASE_KNOT_Y_OFFSET * scale);

const omH = TOP_H + BOTTOM_H;

const omX = Math.round((OUT_W - omW) / 2);
const omY = 165;              // ✅ 位置照樣可以再調


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
    { color: "rgb(255, 220, 155)", blur: 30, strength: 3 },
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
  const loadNow =
    performance.now();

  console.log(
    `[Boot] window.load ${Math.round(loadNow)}ms`
  );

  initAudio();
  bindAudioUnlock();

  scaleGameRoot();

  console.log(
    `[Boot] scaleGameRoot after window.load ${Math.round(performance.now())}ms`
  );

  checkIfDrawnToday();

  /*
    列出這次頁面真正下載過的所有資源，
    最慢的排在最上面。
  */
  const resources =
    performance
      .getEntriesByType("resource")
      .map((entry) => ({
        name: entry.name
          .replace(location.origin, ""),
        type: entry.initiatorType,
        start: Math.round(
          entry.startTime
        ),
        duration: Math.round(
          entry.duration
        ),
        size:
          entry.transferSize || 0,
      }))
      .sort(
        (a, b) =>
          b.duration - a.duration
      );

  console.log(
    "[Boot] slowest resources"
  );

  console.table(
    resources.slice(0, 30)
  );
});

document.addEventListener(
  "DOMContentLoaded",
  () => {
    console.log(
      `[Boot] DOMContentLoaded ${Math.round(performance.now())}ms`
    );
  },
  { once: true }
);







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
      bgm.volume = SHRINE_BGM_VOLUME;

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
  volume = UI_CLICK_VOLUME,
  duckVolume = 0.25,
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

  // Wind Game：不要使用通用按鈕音效
  "btnWindFly",
  "btnWindAttack",
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
     playUISound({ duck: false, volume: UI_CLICK_VOLUME });

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

  // 如果正在小遊戲音訊模式，不准神社 BGM 自動復活
  if (
  (typeof windGameAudioMode !== "undefined" && windGameAudioMode) ||
  (typeof gardenAudioMode !== "undefined" && gardenAudioMode)
) {
  bgm.pause();
  bgm.currentTime = 0;
  return;
}

  bgm.volume = 0;

  bgm.play().catch(() => {
    document.addEventListener("click", () => {
      if (typeof windGameAudioMode !== "undefined" && windGameAudioMode) return;
      bgm.play();
    }, { once: true });
  });

  let volume = 0;
  const fade = setInterval(() => {
   if (
  (typeof windGameAudioMode !== "undefined" && windGameAudioMode) ||
  (typeof gardenAudioMode !== "undefined" && gardenAudioMode)
) {
  clearInterval(fade);
  bgm.pause();
  bgm.currentTime = 0;
  return;
}

    volume += 0.04;

    if (volume >= SHRINE_BGM_VOLUME) {
      volume = SHRINE_BGM_VOLUME;
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
  drawSound.volume = DRAW_SOUND_VOLUME;
  drawSound.play().catch(() => {});

  setTimeout(() => {
  if (bgm) bgm.volume = SHRINE_BGM_VOLUME;
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

// normal：主介面原本飄落
// windGame：小遊戲強風吹拂
let sakuraWindMode = "normal";

// 小遊戲暫停時凍結櫻花 canvas
let sakuraPausedByWindGame = false;

let sakuraPausedByGarden = false;

function clearSakuraCanvas() {
  const canvas = document.getElementById("sakura");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function pauseSakuraForGarden() {
  document.body.classList.add(
    "garden-active"
  );

  const canvas =
    document.getElementById("sakura");

  /*
    Garden 全裝置恢復櫻花粒子。

    garden-active 仍然會讓庭院
    固定使用 spring 櫻花素材。
  */
  sakuraPausedByGarden = false;

  if (canvas) {
    canvas.style.display = "";
  }

  if (
    typeof resetPetals === "function"
  ) {
    resetPetals();
  }
}

function resumeSakuraFromGarden() {
  const canvas = document.getElementById("sakura");
  if (canvas) {
    canvas.style.display = "";
  }

  sakuraPausedByGarden = false;
  document.body.classList.remove("garden-active");

  if (typeof resetPetals === "function") {
    resetPetals();
  }
}

let sakuraWindPower = 1;
let sakuraWindTargetPower = 1;

const SAKURA_WIND_NORMAL = 1;
const SAKURA_WIND_GAME = 3.2;

const SHRINE_PETAL_IMAGES = {
  spring: [
    "images/sakura1.png",
    "images/sakura2.png",
    "images/sakura3.png",
  ],

  autumn: [
    "images/maple1.png",
    "images/maple2.png",
    "images/maple3.png",
  ],
};



function getShrinePetalSeason() {
  const month = new Date().getMonth() + 1;

  // 9～11 月顯示楓葉
  if (month >= 9 && month <= 11) {
    return "autumn";
  }

  return "spring";
}

function updateShrineSeasonMode() {
  const season = getShrinePetalSeason();

  document.body.classList.toggle("autumn-mode", season === "autumn");
}

const loadedPetalsBySeason = {
  spring: [],
  autumn: [],
};

let petals = [];
const PETAL_COUNT = 16; // 可調

function isGardenScreenActive() {
  return gardenScreen && !gardenScreen.classList.contains("hidden");
}

function getActivePetalSeason() {
  // 庭院固定使用櫻花
  // 注意：進庭院時 pauseSakuraForGarden() 會先加 garden-active，
  // 這時 gardenScreen 可能還沒解除 hidden，所以不要用 hidden 判斷。
  if (document.body.classList.contains("garden-active")) {
    return "spring";
  }

  // 其他畫面維持原本季節系統
  return getShrinePetalSeason();
}

function getLoadedPetalsForCurrentScene() {
  const season = getActivePetalSeason();
  const list = loadedPetalsBySeason[season];

  if (list && list.length > 0) {
    return list;
  }

  // 保險 fallback
  return loadedPetalsBySeason.spring.length > 0
    ? loadedPetalsBySeason.spring
    : loadedPetalsBySeason.autumn;
}

function initSakuraPetals() {
  const seasons = Object.keys(SHRINE_PETAL_IMAGES);
  let totalImages = 0;
  let loadedCount = 0;

  seasons.forEach((season) => {
    totalImages += SHRINE_PETAL_IMAGES[season].length;
  });

  seasons.forEach((season) => {
    SHRINE_PETAL_IMAGES[season].forEach((src) => {
      const img = new Image();
      img.src = src;

      img.onload = () => {
        loadedCount++;

        if (loadedCount === totalImages) {
          startPetals();
        }
      };

      img.onerror = () => {
        loadedCount++;
        console.warn("[Petal] failed to load:", src);

        if (loadedCount === totalImages) {
          startPetals();
        }
      };

      loadedPetalsBySeason[season].push(img);
    });
  });
}

function startPetals() {
  petals = [];

  for (let i = 0; i < PETAL_COUNT; i++) {
    petals.push(createPetal(true));
  }

  requestAnimationFrame(updatePetals);
}

function createPetal(randomY = false) {
  const season = getActivePetalSeason();
  const loadedPetals = getLoadedPetalsForCurrentScene();

  const size =
    season === "autumn"
      ? 44 + Math.random() * 54
      : 20 + Math.random() * 40;

  return {
    img: loadedPetals[Math.floor(Math.random() * loadedPetals.length)],
    x: Math.random() * sakuraCanvas.width,
    y: randomY ? Math.random() * sakuraCanvas.height : -50,
    size: size,
    speedY: 1.5 + size / 40,
    speedX: -1.2 - Math.random() * 0.8,
    rotation: Math.random() * 360,
    rotationSpeed: -1 + Math.random() * 2,
    baseAlpha: 0.8 + Math.random() * 0.2,
  };
}

function resetPetals() {
  petals = [];

  for (let i = 0; i < PETAL_COUNT; i++) {
    petals.push(createPetal(true));
  }
}

function setSakuraWindMode(mode) {
  if (mode === "windGame") {
    sakuraWindMode = "windGame";
    sakuraWindTargetPower = SAKURA_WIND_GAME;
  } else {
    sakuraWindMode = "normal";
    sakuraWindTargetPower = SAKURA_WIND_NORMAL;
  }
}

function pauseSakuraForWindGame() {
  sakuraPausedByWindGame = true;
  document.body.classList.add("wind-game-paused");
}

function resumeSakuraForWindGame() {
  sakuraPausedByWindGame = false;
  document.body.classList.remove("wind-game-paused");
}

function updatePetals() {
  if (sakuraPausedByWindGame || sakuraPausedByGarden) {
  requestAnimationFrame(updatePetals);
  return;
}

  const isWindGame = sakuraWindMode === "windGame";

  // 風力平滑變化，避免進出小遊戲時突然跳變
  sakuraWindPower += (sakuraWindTargetPower - sakuraWindPower) * 0.035;

  let wind = 0;

  if (isWindGame) {
    // 小遊戲：穩定往左吹，偶爾更強
    windTime += 0.012;

    const steadyWind = sakuraWindPower * 1.8;
    const gustWave = Math.max(0, Math.sin(windTime * 1.6));
    const gustWind = gustWave * sakuraWindPower * 0.8;

    wind = steadyWind + gustWind;
  } else {
    // 主介面：保留原本的自然快慢節奏
    windTime += 0.01;

    const windBase = Math.sin(windTime) * 1.2;
    const windGust = Math.sin(windTime * 3) * 0.5;

    wind = windBase + windGust;
  }

  sakuraCtx.clearRect(0, 0, sakuraCanvas.width, sakuraCanvas.height);

  petals.forEach(p => {
    sakuraCtx.save();

    const fadeStart = sakuraCanvas.height * 0.75;
    const fadeEnd = sakuraCanvas.height * 0.95;

    let alpha = p.baseAlpha;

    if (p.y > fadeStart) {
      alpha = p.baseAlpha * (1 - (p.y - fadeStart) / (fadeEnd - fadeStart));
    }

    sakuraCtx.globalAlpha = Math.max(alpha, 0);

    sakuraCtx.translate(p.x, p.y);
    sakuraCtx.rotate((p.rotation * Math.PI) / 180);
    sakuraCtx.drawImage(p.img, -p.size / 2, -p.size / 2, p.size, p.size);
    sakuraCtx.restore();

    if (isWindGame) {
      // 小遊戲：強風往左吹
      const fallBoost = 1 + (sakuraWindPower - 1) * 0.12;
      const sideWindBoost = 1 + (sakuraWindPower - 1) * 0.65;
      const rotateBoost = 1 + (sakuraWindPower - 1) * 0.35;

      p.y += p.speedY * fallBoost;
      p.x += p.speedX * sideWindBoost - wind;
      p.rotation += p.rotationSpeed * rotateBoost;
    } else {
      // 主介面：原本的飄落感
      p.y += p.speedY;
      p.x += p.speedX + wind * 0.3;
      p.rotation += p.rotationSpeed;
    }

    if (p.y > sakuraCanvas.height + 60) {
      Object.assign(p, createPetal(false));
    }

    if (p.x > sakuraCanvas.width + 60) {
      p.x = -60;
    }

    if (p.x < -60) {
      p.x = sakuraCanvas.width + 60;
    }
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
  const hour =
    new Date().getHours();

  if (
    hour >= 18 ||
    hour < 6
  ) {
    document.body.classList.add(
      "night-mode"
    );
  } else {
    document.body.classList.remove(
      "night-mode"
    );
  }

  updateShrineSeasonMode();

  /*
    如果玩家此刻就在 Garden，
    才處理 Garden 日夜切換。

    Garden 沒開時完全不載另一套素材。
  */
  if (
    gardenScreen &&
    !gardenScreen.classList.contains(
      "hidden"
    )
  ) {
    const mode =
      getGardenSceneModeByTime();

    ensureGardenSceneModeReady(
      mode
    )
      .then(() => {
        /*
          等載完時再次確認：
          玩家仍在 Garden，
          而且時間模式沒有又變掉。
        */
        if (
          !gardenScreen ||
          gardenScreen.classList.contains(
            "hidden"
          )
        ) {
          return;
        }

        if (
          getGardenSceneModeByTime() !==
          mode
        ) {
          return;
        }

        applyGardenSceneMode(
          mode
        );
      })
      .catch((err) => {
        console.warn(
          "[Garden] day/night scene switch failed:",
          err
        );
      });
  }
}

// 進站時先判斷一次
updateDayNightMode();

// 每 5 分鐘檢查一次時間（避免剛好跨 6 點沒刷新）
setInterval(updateDayNightMode, 5 * 60 * 1000);



/* =========================
   Garden Character Layers
========================= */

const gardenCharFarLayer = document.getElementById("gardenCharFarLayer");
const gardenCharNormalLayer = document.getElementById("gardenCharNormalLayer");
const gardenCharFrontLayer = document.getElementById("gardenCharFrontLayer");
const gardenCharCornerFrontLayer = document.getElementById("gardenCharCornerFrontLayer");

let chifuyuCurrentDepthLayer = "normal";

function moveChifuyuToDepthLayer(layerName) {
  if (!chifuyuWalkTestWrap) return;
  if (chifuyuCurrentDepthLayer === layerName) return;

  let targetLayer = gardenCharNormalLayer;

  if (layerName === "far") {
    targetLayer = gardenCharFarLayer;
  }

  if (layerName === "front") {
    targetLayer = gardenCharFrontLayer;
  }

  if (layerName === "cornerFront") {
    targetLayer = gardenCharCornerFrontLayer;
  }

  if (!targetLayer) return;

  targetLayer.appendChild(chifuyuWalkTestWrap);
  chifuyuCurrentDepthLayer = layerName;
}

/* =========================
   Garden Walk Areas
   暫定版：用多邊形限制可移動區域
========================= */

function pointInPolygon(x, y, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/* =========================
   Garden Walk Areas
   Debug Version
========================= */

const GARDEN_WALK_DEBUG = false;

const GARDEN_WALK_AREAS = {
  ground: [
    {
      name: "ground-main",
      points: [
      
        { x: 910, y: 600 },
        { x: 961, y: 640 },
        { x: 1054, y: 650 },
        { x: 998, y: 802 },
        { x: 699, y: 740 },
        { x: 451, y: 974 },
        { x: 490, y: 988 },
        { x: 850, y: 960 },
        { x: 800, y: 1100 },
        { x: 150, y: 1150 },
        { x: 150, y: 1309 },
        { x: 160, y: 1419 },
        { x: 210, y: 1507 },
        { x: 578, y: 1690 },
        { x: 1023, y: 1687 },
        { x: 992, y: 1851 },
        { x: 375, y: 1848 },
        { x: 34, y: 1552 },
        { x: 28, y: 765 },
        { x: 262, y: 757 },
        { x: 147, y: 900 },
        { x: 271, y: 921 },
        { x: 448, y: 672 },
        { x: 485, y: 650 },
      
      ],
    },
  ],

  far: [
  {
    name: "far-path",

    points: [
      { x: 344, y: 532 },

      /*
        原本右上遠景道路
      */
      { x: 908, y: 501 },

      /*
        =========================
        Courtyard → Moon Bridge Exit
        =========================

        直接把道路延伸到 1080 外面。

        角色真的走到 x 1300+，
        才會自然從畫面右側消失，
        而不是碰到畫面邊界就瞬移。
      */
      { x: 1420, y: 500 },
      { x: 1420, y: 580 },

      /*
        接回原本遠景道路下緣
      */
      { x: 685, y: 585 },
      { x: 428, y: 585 },
      { x: 271, y: 678 },
      { x: 256, y: 760 },
      { x: 28, y: 771 },
    ],
  },
],
};

function getGardenMoveZoneAtInScene(
  sceneId,
  x,
  y
) {
  const scene =
    getGardenSceneById(
      sceneId
    );

  if (!scene) {
    return "blocked";
  }


  const walkAreas =
    scene.walkAreas;

  const farAreas =
    walkAreas?.far || [];

  const groundAreas =
    walkAreas?.ground || [];


  for (
    const area of
    farAreas
  ) {
    if (
      pointInPolygon(
        x,
        y,
        area.points
      )
    ) {
      return "far";
    }
  }


  for (
    const area of
    groundAreas
  ) {
    if (
      pointInPolygon(
        x,
        y,
        area.points
      )
    ) {
      return "ground";
    }
  }


  return "blocked";
}


/*
  舊版 wrapper。

  UI 點擊、Debug 等尚未重構的功能，
  仍然以玩家目前正在看的場景判斷。
*/
function getGardenMoveZoneAt(
  x,
  y
) {
  return getGardenMoveZoneAtInScene(
    gardenViewSceneId,
    x,
    y
  );
}



// =========================
// Garden BGM
// =========================

const GARDEN_BGM_SRC =
  "audio/Chasing%20Tommorrow%20Music%20Box.wav";

const gardenBgm = new Audio(GARDEN_BGM_SRC);
gardenBgm.loop = true;
gardenBgm.preload = "auto";
gardenBgm.volume = 0;

const GARDEN_BGM_VOLUME = 0.55;
const GARDEN_BGM_FADE_MS = 900;

let gardenAudioMode = false;
let gardenBgmFadeTimer = null;
let gardenBgmStarted = false;

function getShrineBgmAudio() {
  return shrineBgm || bgm || document.getElementById("bgm");
}

function clampAudioVolume(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(1, n));
}



function fadeGardenBgmTo(targetVolume, duration = GARDEN_BGM_FADE_MS, onDone = null) {
  if (!gardenBgm) return;

  if (gardenBgmFadeTimer) {
    cancelAnimationFrame(gardenBgmFadeTimer);
    gardenBgmFadeTimer = null;
  }

  targetVolume = clampAudioVolume(targetVolume);

  const startVolume = clampAudioVolume(gardenBgm.volume);
  const startTime = performance.now();

  function step(now) {
    const t = Math.min(1, Math.max(0, (now - startTime) / duration));

    const nextVolume =
      startVolume + (targetVolume - startVolume) * t;

    gardenBgm.volume = clampAudioVolume(nextVolume);

    if (t < 1) {
      gardenBgmFadeTimer = requestAnimationFrame(step);
      return;
    }

    gardenBgm.volume = clampAudioVolume(targetVolume);
    gardenBgmFadeTimer = null;

    if (typeof onDone === "function") {
      onDone();
    }
  }

  gardenBgmFadeTimer = requestAnimationFrame(step);
}

function enterGardenAudioMode() {
  gardenAudioMode = true;

  const mainBgm = getShrineBgmAudio();

  // 停掉主介面 BGM
  if (typeof stopAudio === "function") {
    stopAudio(mainBgm);
  } else if (mainBgm) {
    mainBgm.pause();
    mainBgm.currentTime = 0;
  }

  // 從頭播放庭院 BGM
  gardenBgm.pause();
  gardenBgm.currentTime = 0;
  gardenBgm.volume = 0;
  gardenBgm.loop = true;

  gardenBgmStarted = true;

  if (typeof playAudioSafe === "function") {
    playAudioSafe(gardenBgm);
  } else {
    gardenBgm.play().catch((err) => {
      console.warn("[Garden BGM] play failed:", err);
    });
  }

  fadeGardenBgmTo(GARDEN_BGM_VOLUME, GARDEN_BGM_FADE_MS);

  // 保險：避免主介面淡入流程稍後又把 BGM 撈回來
  setTimeout(() => {
    if (!gardenAudioMode) return;

    const bgmEl = getShrineBgmAudio();
    if (bgmEl) {
      bgmEl.pause();
      bgmEl.currentTime = 0;
    }
  }, 300);
}

function exitGardenAudioMode() {
  gardenAudioMode = false;

  if (gardenBgmStarted) {
    fadeGardenBgmTo(0, GARDEN_BGM_FADE_MS, () => {
      gardenBgm.pause();
      gardenBgm.currentTime = 0;
      gardenBgmStarted = false;
    });
  }

  const mainBgm = getShrineBgmAudio();

  if (mainBgm) {
    mainBgm.volume = SHRINE_BGM_VOLUME;

    if (typeof playAudioSafe === "function") {
      playAudioSafe(mainBgm);
    } else {
      mainBgm.play().catch(() => {});
    }
  }
}




const gardenIpadDecodedImages =
  new Map();


async function preloadGardenIpadAnimationImage(
  src
) {
  if (
    gardenIpadDecodedImages.has(src)
  ) {
    return;
  }

  await new Promise((resolve) => {
    const img = new Image();

    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;

      gardenIpadDecodedImages.set(
        src,
        img
      );

      resolve();
    };

    img.onload = async () => {
      /*
        現在是 50% 小圖，
        可以安全地真正 decode。

        Safari 萬一 decode 卡住，
        最多只等 2 秒。
      */
      if (img.decode) {
        try {
          await Promise.race([
            img.decode().catch(() => {}),
            new Promise((r) =>
              setTimeout(r, 2000)
            ),
          ]);
        } catch {}
      }

      finish();
    };

    img.onerror = () => {
      console.warn(
        "[Garden iPad] animation load failed:",
        src
      );

      resolve();
    };

    img.src = src;
  });
}


async function preloadAllGardenIpadAnimations() {
  if (!GARDEN_IPAD_SAFE_MODE) return;

  const order = [
    CHIFUYU_IDLE_SHEET_IPAD_SRC,
    CHINATSU_IDLE_SHEET_IPAD_SRC,

    CHIFUYU_WALK_SHEET_IPAD_SRC,
    CHINATSU_WALK_SHEET_IPAD_SRC,

    CHIFUYU_TALK_SHEET_IPAD_SRC,
    CHINATSU_TALK_SHEET_IPAD_SRC,
  ];

  /*
    絕對不要 Promise.all 六張。

    一張完成後再下一張，
    避免 iPad 瞬間記憶體尖峰。
  */
  for (const src of order) {
    await preloadGardenIpadAnimationImage(
      src
    );

    await waitGardenPreloadFrame();
  }
}





/* =========================
   Garden Path Finding
   角色不能穿越 blocked 區域
========================= */

function isGardenWalkablePointInScene(
  sceneId,
  x,
  y
) {
  return (
    getGardenMoveZoneAtInScene(
      sceneId,
      x,
      y
    ) !== "blocked"
  );
}


function isGardenWalkablePoint(
  x,
  y
) {
  return isGardenWalkablePointInScene(
    gardenViewSceneId,
    x,
    y
  );
}



function isGardenSegmentWalkableInScene(
  sceneId,
  a,
  b
) {
  const dx =
    b.x - a.x;

  const dy =
    b.y - a.y;

  const dist =
    Math.sqrt(
      dx * dx +
      dy * dy
    );


  const stepSize = 10;

  const steps =
    Math.max(
      1,
      Math.ceil(
        dist / stepSize
      )
    );


  for (
    let i = 0;
    i <= steps;
    i++
  ) {
    const t =
      i / steps;

    const x =
      a.x + dx * t;

    const y =
      a.y + dy * t;


    if (
      !isGardenWalkablePointInScene(
        sceneId,
        x,
        y
      )
    ) {
      return false;
    }
  }


  return true;
}


function isGardenSegmentWalkable(
  a,
  b
) {
  return isGardenSegmentWalkableInScene(
    gardenViewSceneId,
    a,
    b
  );
}

/*
  中繼點：
  這些點必須放在 ground / far 可走範圍內。
  之後角色如果不能直線走，就會透過這些點繞行。
*/
const GARDEN_PATH_NODES = [
  /*
    far 遠景區
  */

  { name: "far-right", x: 850, y: 520 },

  /*
    =========================
    Courtyard → Moon Bridge
    出口路徑
    =========================
  */

  /* 還看得見角色 */
  {
    name: "moon-bridge-exit-approach",
    x: 1030,
    y: 530,
  },

  /* 已經接近畫面外 */
  {
    name: "moon-bridge-exit-inner",
    x: 1170,
    y: 535,
  },

  /* 幾乎完全離開畫面 */
  {
    name: "moon-bridge-exit-out",
    x: 1320,
    y: 540,
  },


  { name: "far-mid-right", x: 760, y: 535 },
  { name: "far-mid", x: 610, y: 550 },
  { name: "far-left", x: 430, y: 570 },
  { name: "far-down-left", x: 285, y: 665 },
  { name: "far-gate", x: 165, y: 735 },

{ name: "upper-mid-low", x: 300, y: 950 },
{ name: "upper-mid", x: 420, y: 850 },
{ name: "upper-right", x: 610, y: 705 },

{ name: "upper-lower-bridge", x: 500, y: 1100 },

{ name: "corridor-right", x: 900, y: 640 },
{ name: "right-upper", x: 1000, y: 700 },

  /*
    far / ground 銜接
  */
  { name: "ground-gate", x: 105, y: 805 },
  { name: "left-upper", x: 100, y: 900 },

  /*
    左側狹窄主路
    新版範圍在 y=1100~1300 左右時，安全區大約在 x=40~140，
    所以這段不要放太右。
  */
  { name: "left-main-a", x: 100, y: 1000 },
  { name: "left-main-b", x: 95, y: 1120 },
  { name: "left-main-c", x: 95, y: 1260 },
  { name: "left-neck", x: 105, y: 1400 },
  { name: "neck-low", x: 140, y: 1490 },
  { name: "front-entrance", x: 270, y: 1545 },

  /*
    上庭院 / 右上建築前方
  */
  { name: "upper-mid-low", x: 300, y: 950 },
  { name: "upper-mid", x: 420, y: 850 },
  { name: "upper-right", x: 610, y: 705 },
  { name: "corridor-right", x: 900, y: 640 },
  { name: "right-upper", x: 1000, y: 700 },

  /*
    前景區
  */
  { name: "front-left", x: 300, y: 1580 },
  { name: "front-center-left", x: 430, y: 1640 },
  { name: "front-center", x: 600, y: 1725 },
  { name: "front-right", x: 850, y: 1725 },

  /*
    底部區
  */
  { name: "bottom-left", x: 380, y: 1810 },
  { name: "bottom-center", x: 600, y: 1810 },
  { name: "bottom-right", x: 930, y: 1810 },
];




/* =========================
   Courtyard → Moon Bridge
   Exit Targets
========================= */

const COURTYARD_MOON_BRIDGE_EXIT_TARGETS = {
  chifuyu: {
    x: 1360,
    y: 525,
  },

  chinatsu: {
    x: 1360,
    y: 560,
  },
};


/* =========================
   Courtyard → Moon Bridge
   Travel Test
========================= */

const GARDEN_CHARACTER_TRAVEL_TRANSIT_MS =
  1500;


/*
  賞月橋左側入口。

  spawn 故意放在畫面外，
  enter 則位於正式橋面內。

  不需要把 spawn 放進 walkArea，
  因為這段是「入口動畫專用 path」，
  不是自由散步區。
*/
const MOON_BRIDGE_LEFT_ENTRANCE = {
  chifuyu: {
    spawn: {
      x: -240,
      y: 1260,
    },

    enter: {
      x: 260,
      y: 1260,
    },
  },

  chinatsu: {
    spawn: {
      x: -320,
      y: 1360,
    },

    enter: {
      x: 250,
      y: 1360,
    },
  },
};


/* =========================
   Moon Bridge → Courtyard
   Exit / Entrance Test
========================= */

/*
  賞月橋左側出口。

  approach：
  還在正式橋面可走區裡。

  out：
  畫面左側外面。
*/
const MOON_BRIDGE_COURTYARD_EXIT = {
  chifuyu: {
    approach: {
      x: 170,
      y: 1240,
    },

    out: {
      x: -300,
      y: 1240,
    },
  },

  chinatsu: {
    approach: {
      x: 170,
      y: 1360,
    },

    out: {
      x: -320,
      y: 1360,
    },
  },
};


/*
  回到庭院時，
  從之前建立的右上方遠景出口反向走進來。
*/
const COURTYARD_MOON_BRIDGE_ENTRANCE = {
  chifuyu: {
    spawn: {
      x: 1360,
      y: 525,
    },

    enter: {
      x: 850,
      y: 520,
    },
  },

  chinatsu: {
    spawn: {
      x: 1360,
      y: 560,
    },

    enter: {
      x: 820,
      y: 555,
    },
  },
};





/* =========================
   Garden Exit Test Visibility
========================= */



function getGardenCharacterActivity(
  character
) {
  return (
    gardenCharacterWorldState[
      character
    ]?.activity || null
  );
}


function setGardenCharacterActivity(
  character,
  activity,
  activityData = null
) {
  const worldState =
    gardenCharacterWorldState[
      character
    ];

  if (!worldState) {
    return false;
  }

  worldState.activity =
    activity;

  worldState.activityData =
    activityData;

  return true;
}


function setGardenPairActivity(
  activity,
  activityData = null
) {
  setGardenCharacterActivity(
    "chifuyu",
    activity,
    activityData
  );

  setGardenCharacterActivity(
    "chinatsu",
    activity,
    activityData
  );
}





function updateGardenCharacterVisibility() {
  /*
    Player View 只決定「看不看得到」。

    Character World State
    才決定角色真正在哪裡。
  */

  if (
    chifuyuWalkTestWrap
  ) {
    chifuyuWalkTestWrap.style.visibility =
      gardenCharacterWorldState
        .chifuyu.sceneId ===
      gardenViewSceneId
        ? "visible"
        : "hidden";
  }


  if (
    chinatsuWalkTestWrap
  ) {
    chinatsuWalkTestWrap.style.visibility =
      gardenCharacterWorldState
        .chinatsu.sceneId ===
      gardenViewSceneId
        ? "visible"
        : "hidden";
  }
}


/* =========================
   Moon Bridge Entrance Test
========================= */







const GARDEN_AUTO_TARGET_POINTS = [
  // 遠景
  { name: "auto-far-right", x: 850, y: 520, zone: "far" },
  { name: "auto-far-mid", x: 610, y: 550, zone: "far" },
  { name: "auto-far-left", x: 430, y: 570, zone: "far" },
  { name: "auto-far-gate", x: 165, y: 735, zone: "far" },

  // 上庭院
{ name: "auto-upper-right", x: 900, y: 640, zone: "ground" },
{ name: "auto-upper-mid", x: 610, y: 705, zone: "ground" },
{ name: "auto-upper-left", x: 420, y: 850, zone: "ground" },

// 新增：右側下段庭院
{ name: "auto-upper-lower-right", x: 790, y: 985, zone: "ground" },
{ name: "auto-upper-lower-mid", x: 730, y: 1060, zone: "ground" },

// 枯山水後方往主路銜接
{
  name: "auto-upper-lower-center",
  x: 620,
  y: 1080,
  zone: "ground",
},

  // 左側主路
  { name: "auto-left-upper", x: 100, y: 900, zone: "ground" },
  { name: "auto-left-main-a", x: 100, y: 1000, zone: "ground" },
  { name: "auto-left-main-b", x: 95, y: 1120, zone: "ground" },
  { name: "auto-left-main-c", x: 95, y: 1260, zone: "ground" },
  { name: "auto-left-neck", x: 105, y: 1400, zone: "ground" },

  // 前景入口
  { name: "auto-front-entrance", x: 270, y: 1545, zone: "ground" },
  { name: "auto-front-left", x: 300, y: 1580, zone: "ground" },
  { name: "auto-front-center-left", x: 430, y: 1640, zone: "ground" },
  { name: "auto-front-center", x: 600, y: 1725, zone: "ground" },
  { name: "auto-front-right", x: 850, y: 1725, zone: "ground" },

  // 底部
  { name: "auto-bottom-left", x: 380, y: 1810, zone: "ground" },
  { name: "auto-bottom-center", x: 600, y: 1810, zone: "ground" },
  { name: "auto-bottom-right", x: 930, y: 1810, zone: "ground" },
];


const GARDEN_INITIAL_FAR_CHANCE = 0.12;
const GARDEN_INITIAL_MIN_DISTANCE = 180;
const GARDEN_INITIAL_JITTER_X = 45;
const GARDEN_INITIAL_JITTER_Y = 28;

function pickRandomGardenInitialPoint(
  options = {}
) {
  const {
    allowFar = true,
    avoidPoint = null,
    minDistance = 0,
  } = options;


  const scene =
    getCurrentGardenScene();


  const autoTargets =
    scene?.autoTargets || [];


  const defaultSpawn =
    scene?.defaultSpawn || {
      x: 600,
      y: 1725,
    };


  const useFar =
    allowFar &&
    Math.random() <
      GARDEN_INITIAL_FAR_CHANCE;


  let pool =
    autoTargets.filter((p) => {
      if (useFar) {
        return p.zone === "far";
      }

      return p.zone === "ground";
    });


  pool = pool.filter(
    (p) =>
      isGardenWalkablePoint(
        p.x,
        p.y
      )
  );


  /*
    指定 zone 沒有可用點時，
    從整張場景的 autoTargets 找。
  */
  if (pool.length === 0) {
    pool =
      autoTargets.filter(
        (p) =>
          isGardenWalkablePoint(
            p.x,
            p.y
          )
      );
  }


  /*
    場景甚至沒有有效 auto target 時，
    才使用該場景自己的預設出生點。
  */
  if (pool.length === 0) {
    return {
      x: defaultSpawn.x,
      y: defaultSpawn.y,
    };
  }


  for (
    let i = 0;
    i < 30;
    i++
  ) {
    const base =
      pool[
        Math.floor(
          Math.random() *
          pool.length
        )
      ];


    const x =
      base.x +
      randomBetween(
        -GARDEN_INITIAL_JITTER_X,
        GARDEN_INITIAL_JITTER_X
      );


    const y =
      base.y +
      randomBetween(
        -GARDEN_INITIAL_JITTER_Y,
        GARDEN_INITIAL_JITTER_Y
      );


    if (
      !isGardenWalkablePoint(
        x,
        y
      )
    ) {
      continue;
    }


    if (
      avoidPoint &&
      minDistance > 0
    ) {
      const dx =
        x - avoidPoint.x;

      const dy =
        y - avoidPoint.y;

      const dist =
        Math.sqrt(
          dx * dx +
          dy * dy
        );


      if (
        dist <
        minDistance
      ) {
        continue;
      }
    }


    return {
      x,
      y,
    };
  }


  /*
    jitter 嘗試都失敗時，
    至少回到一個確定有效的 auto target。
  */
  const fallback =
    pool[
      Math.floor(
        Math.random() *
        pool.length
      )
    ];


  return {
    x: fallback.x,
    y: fallback.y,
  };
}

function randomizeGardenCharacterStartPositions() {
  const chifuyuPoint = pickRandomGardenInitialPoint({
    allowFar: true,
  });

  const chinatsuPoint = pickRandomGardenInitialPoint({
    allowFar: true,
    avoidPoint: chifuyuPoint,
    minDistance: GARDEN_INITIAL_MIN_DISTANCE,
  });

  chifuyuWalkTestState.x = chifuyuPoint.x;
  chifuyuWalkTestState.y = chifuyuPoint.y;
  chifuyuWalkTestState.path = [];
  chifuyuWalkTestState.isMoving = false;
  chifuyuWalkTestState.frameIndex = 0;
  chifuyuWalkTestState.frameTimer = 0;

  chinatsuWalkTestState.x = chinatsuPoint.x;
  chinatsuWalkTestState.y = chinatsuPoint.y;
  chinatsuWalkTestState.path = [];
  chinatsuWalkTestState.isMoving = false;
  chinatsuWalkTestState.frameIndex = 0;
  chinatsuWalkTestState.frameTimer = 0;
}



function findGardenPath(
  start,
  target,
  sceneId = gardenViewSceneId
) {
  /*
    起點與終點，
    都必須屬於指定場景的可走區。
  */
  if (
    !isGardenWalkablePointInScene(
      sceneId,
      start.x,
      start.y
    )
  ) {
    return null;
  }


  if (
    !isGardenWalkablePointInScene(
      sceneId,
      target.x,
      target.y
    )
  ) {
    return null;
  }


  /*
    直線可以走，
    就不需要建立 path graph。
  */
  if (
    isGardenSegmentWalkableInScene(
      sceneId,
      start,
      target
    )
  ) {
    return [
      {
        x: target.x,
        y: target.y,
      },
    ];
  }


  const scene =
    getGardenSceneById(
      sceneId
    );


  if (!scene) {
    return null;
  }


  const pathNodes =
    scene.pathNodes || [];


  /*
    注意：
    中繼節點也必須使用
    character 所在的 sceneId 判定，
    不能使用玩家正在看的場景。
  */
  const nodes = [
    {
      name: "start",
      x: start.x,
      y: start.y,
    },

    ...pathNodes.filter(
      (p) =>
        isGardenWalkablePointInScene(
          sceneId,
          p.x,
          p.y
        )
    ),

    {
      name: "target",
      x: target.x,
      y: target.y,
    },
  ];


  const startIndex = 0;
  const targetIndex =
    nodes.length - 1;


  const graph =
    nodes.map(() => []);


  /*
    建立安全連線。

    每一條 edge 也必須用
    指定 sceneId 的 walkArea。
  */
  for (
    let i = 0;
    i < nodes.length;
    i++
  ) {
    for (
      let j = i + 1;
      j < nodes.length;
      j++
    ) {
      const a = nodes[i];
      const b = nodes[j];


      const dx =
        b.x - a.x;

      const dy =
        b.y - a.y;

      const cost =
        Math.sqrt(
          dx * dx +
          dy * dy
        );


      const MAX_NODE_LINK_DISTANCE =
        360;


      if (
        cost >
        MAX_NODE_LINK_DISTANCE
      ) {
        continue;
      }


      if (
        !isGardenSegmentWalkableInScene(
          sceneId,
          a,
          b
        )
      ) {
        continue;
      }


      graph[i].push({
        to: j,
        cost,
      });

      graph[j].push({
        to: i,
        cost,
      });
    }
  }


  /*
    Dijkstra
  */
  const dist =
    new Array(
      nodes.length
    ).fill(Infinity);

  const prev =
    new Array(
      nodes.length
    ).fill(-1);

  const visited =
    new Array(
      nodes.length
    ).fill(false);


  dist[startIndex] = 0;


  for (
    let loop = 0;
    loop < nodes.length;
    loop++
  ) {
    let current = -1;
    let best = Infinity;


    for (
      let i = 0;
      i < nodes.length;
      i++
    ) {
      if (
        !visited[i] &&
        dist[i] < best
      ) {
        best = dist[i];
        current = i;
      }
    }


    if (
      current === -1
    ) {
      break;
    }


    if (
      current === targetIndex
    ) {
      break;
    }


    visited[current] =
      true;


    for (
      const edge of
      graph[current]
    ) {
      const nextDist =
        dist[current] +
        edge.cost;


      if (
        nextDist <
        dist[edge.to]
      ) {
        dist[edge.to] =
          nextDist;

        prev[edge.to] =
          current;
      }
    }
  }


  if (
    prev[targetIndex] === -1
  ) {
    return null;
  }


  const path = [];

  let cur =
    targetIndex;


  while (
    cur !== startIndex &&
    cur !== -1
  ) {
    path.push({
      x: nodes[cur].x,
      y: nodes[cur].y,
    });

    cur =
      prev[cur];
  }


  path.reverse();

  return path;
}


function getGardenPathDistance(start, path) {
  if (!start || !path || path.length === 0) return 0;

  let total = 0;
  let prev = start;

  for (const p of path) {
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;

    total += Math.sqrt(dx * dx + dy * dy);
    prev = p;
  }

  return total;
}


function drawGardenWalkDebug() {
  const canvas = document.getElementById("gardenWalkDebugCanvas");
  if (!canvas) return;

  if (!GARDEN_WALK_DEBUG) {
    canvas.style.display = "none";
    return;
  }

  canvas.style.display = "block";

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, 1080, 1920);

  function drawPolygon(area, fillStyle, strokeStyle) {
    const points = area.points;
    if (!points || points.length < 3) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.closePath();

    ctx.fillStyle = fillStyle;
    ctx.fill();

    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 4;
    ctx.stroke();

    // 控制點
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = strokeStyle;
      ctx.fill();
    }

    // 區域名稱
    const label = points[0];
    ctx.font = "28px sans-serif";
    ctx.fillStyle = strokeStyle;
    ctx.fillText(area.name, label.x + 12, label.y - 12);
  }

  const scene =
  getCurrentGardenScene();

const walkAreas =
  scene?.walkAreas || {
    ground: [],
    far: [],
  };


for (
  const area of
  (walkAreas.ground || [])
) {
  drawPolygon(
    area,
    "rgba(0, 255, 0, 0.22)",
    "rgba(0, 255, 0, 0.9)"
  );
}


for (
  const area of
  (walkAreas.far || [])
) {
  drawPolygon(
    area,
    "rgba(255, 230, 0, 0.28)",
    "rgba(255, 230, 0, 0.95)"
  );
}
}



function drawGardenPathDebug(path) {
  if (!GARDEN_WALK_DEBUG) return;
  if (!path || path.length === 0) return;

  const canvas = document.getElementById("gardenWalkDebugCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  drawGardenWalkDebug();

  ctx.save();

  ctx.strokeStyle = "rgba(80, 200, 255, 0.95)";
  ctx.lineWidth = 6;
  ctx.setLineDash([18, 12]);

  ctx.beginPath();
  ctx.moveTo(chifuyuWalkTestState.x, chifuyuWalkTestState.y);

  for (const p of path) {
    ctx.lineTo(p.x, p.y);
  }

  ctx.stroke();

  ctx.setLineDash([]);

  for (const p of path) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(80, 200, 255, 1)";
    ctx.fill();
  }

  ctx.restore();
}


function isGardenDepthRuleMatched(
  x,
  y,
  zone,
  rule
) {
  if (!rule) {
    return false;
  }


  /*
    指定 zone 時，
    必須和角色目前所在區域相同。
  */
  if (
    rule.zone &&
    zone !== rule.zone
  ) {
    return false;
  }


  /*
    X 範圍
  */
  if (
    Number.isFinite(rule.xMin) &&
    x < rule.xMin
  ) {
    return false;
  }


  if (
    Number.isFinite(rule.xMax) &&
    x > rule.xMax
  ) {
    return false;
  }


  /*
    Y 範圍
  */
  if (
    Number.isFinite(rule.yMin) &&
    y < rule.yMin
  ) {
    return false;
  }


  if (
    Number.isFinite(
      rule.yMinExclusive
    ) &&
    y <= rule.yMinExclusive
  ) {
    return false;
  }


  if (
    Number.isFinite(rule.yMax) &&
    y > rule.yMax
  ) {
    return false;
  }


  return true;
}


function getGardenDepthLayerByPositionInScene(
  sceneId,
  x,
  y
) {
  if (!sceneId) {
    return "normal";
  }


  const zone =
    getGardenMoveZoneAtInScene(
      sceneId,
      x,
      y
    );


  /*
    遠景是共用基本規則。
  */
  if (zone === "far") {
    return "far";
  }


  const scene =
    getGardenSceneById(
      sceneId
    );


  const depthRules =
    scene?.depthRules || [];


  for (
    const rule of
    depthRules
  ) {
    if (
      !isGardenDepthRuleMatched(
        x,
        y,
        zone,
        rule
      )
    ) {
      continue;
    }


    return (
      rule.layer ||
      "normal"
    );
  }


  return "normal";
}


/*
  舊名稱暫時保留給
  還沒整理到的 View / Debug 程式。
*/
function getChifuyuDepthLayerByPosition(
  x,
  y
) {
  return getGardenDepthLayerByPositionInScene(
    gardenViewSceneId,
    x,
    y
  );
}

/* =========================
   Chifuyu Walk Move Test
========================= */

const chifuyuWalkTestWrap = document.getElementById("chifuyuWalkTestWrap");
const chifuyuWalkTest = document.getElementById("chifuyuWalkTest");



const CHIFUYU_WALK_SHEET_CLASS = "chifuyu-walk-sheet";
const CHIFUYU_IDLE_SHEET_CLASS = "chifuyu-idle-sheet";
const CHIFUYU_TALK_SHEET_CLASS = "chifuyu-talk-sheet";


function buildSpriteFramePositions(frameCount, columns, cellW = 654, cellH = 654, offsetX = 2, offsetY = 2) {
  const positions = [];

  for (let i = 0; i < frameCount; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);

    positions.push(`-${offsetX + col * cellW}px -${offsetY + row * cellH}px`);
  }

  return positions;
}


const GARDEN_TALK_RAW_FRAME_POSITIONS = [
  "-2px -2px",
  "-656px -2px",
  "-1310px -2px",
  "-1964px -2px",
  "-2618px -2px",
  "-3272px -2px",
  "-3926px -2px",

  "-2px -656px",
  "-656px -656px",
  "-1310px -656px",
  "-1964px -656px",
  "-2618px -656px",
  "-3272px -656px",
  "-3926px -656px",

  "-2px -1310px",
  "-656px -1310px",
  "-1310px -1310px",
  "-1964px -1310px",
  "-2618px -1310px",
  "-3272px -1310px",
  "-3926px -1310px",

  "-2px -1964px",
  "-656px -1964px",
  "-1310px -1964px",
  "-1964px -1964px",
  "-2618px -1964px",
  "-3272px -1964px",
  "-3926px -1964px",

  "-2px -2618px",
  "-656px -2618px",
  "-1310px -2618px",
  "-1964px -2618px",
  "-2618px -2618px",
  "-3272px -2618px",
  "-3926px -2618px",

  "-2px -3272px",
  "-656px -3272px",
  "-1310px -3272px",
  "-1964px -3272px",
  "-2618px -3272px",
  "-3272px -3272px",
  "-3926px -3272px",

  "-2px -3926px",
  "-656px -3926px",
  "-1310px -3926px",
  "-1964px -3926px",
  "-2618px -3926px",
  "-3272px -3926px",
  "-3926px -3926px",

  "-4580px -2px",
  "-4580px -656px",
  "-4580px -1310px",
  "-4580px -1964px",
  "-4580px -2618px",
  "-4580px -3272px",
  "-4580px -3926px",

  "-2px -4580px",
  "-656px -4580px",
  "-1310px -4580px",
  "-1964px -4580px",
];

// talk 動畫正常順播。
// 先略過最後 1 幀，避免 TexturePacker 尾端空白格造成循環閃爍。
const CHIFUYU_TALK_FRAME_POSITIONS =
  GARDEN_TALK_RAW_FRAME_POSITIONS.slice(0, 59);

const CHINATSU_TALK_FRAME_POSITIONS =
  GARDEN_TALK_RAW_FRAME_POSITIONS.slice(0, 59);


const CHIFUYU_FRAME_POSITIONS = [
  "-2px -2px",
  "-656px -2px",
  "-1310px -2px",
  "-1964px -2px",
  "-2618px -2px",

  "-2px -656px",
  "-656px -656px",
  "-1310px -656px",
  "-1964px -656px",
  "-2618px -656px",

  "-2px -1310px",
  "-656px -1310px",
  "-1310px -1310px",
  "-1964px -1310px",
  "-2618px -1310px",

  "-2px -1964px",
  "-656px -1964px",
  "-1310px -1964px",
  "-1964px -1964px",
  "-2618px -1964px",

  "-2px -2618px",
  "-656px -2618px",
  "-1310px -2618px",
  "-1964px -2618px",
  "-2618px -2618px",

  "-3272px -2px",
  "-3272px -656px",
  "-3272px -1310px",
  "-3272px -1964px",
  "-3272px -2618px",

  "-2px -3272px",
  "-656px -3272px",
];

const CHIFUYU_IDLE_FRAME_POSITIONS = CHIFUYU_FRAME_POSITIONS.slice(0, 31);

// 暫時關閉 Garden 手機效能模式
// 手機與桌機使用相同的角色動畫速度
/*
  手機仍維持不限速測試。

  只有 iPadOS 使用較保守的 spritesheet 換格速度，
  降低 WebKit / GPU 每秒更新大型 texture 的壓力。
*/
const GARDEN_MOBILE_PERF_MODE =
  GARDEN_IPAD_SAFE_MODE;





const CHIFUYU_WALK_FRAME_MS = GARDEN_MOBILE_PERF_MODE ? 58 : 42;
const CHIFUYU_IDLE_FRAME_MS = GARDEN_MOBILE_PERF_MODE ? 110 : 80;


const CHINATSU_WALK_FRAME_MS = GARDEN_MOBILE_PERF_MODE ? 64 : 48;
const CHINATSU_IDLE_FRAME_MS = GARDEN_MOBILE_PERF_MODE ? 120 : 90;
const GARDEN_TALK_FRAME_MS =
  GARDEN_MOBILE_PERF_MODE
    ? 72
    : 52;

const CHIFUYU_TALK_FRAME_MS =
  GARDEN_TALK_FRAME_MS;

const CHINATSU_TALK_FRAME_MS =
  GARDEN_TALK_FRAME_MS;


const CHIFUYU_ANIMS = {
  walk: {
    sheetClass: CHIFUYU_WALK_SHEET_CLASS,
    frameMs: CHIFUYU_WALK_FRAME_MS,
    positions: CHIFUYU_FRAME_POSITIONS,
  },

  idle: {
    sheetClass: CHIFUYU_IDLE_SHEET_CLASS,
    frameMs: CHIFUYU_IDLE_FRAME_MS,
    positions: CHIFUYU_IDLE_FRAME_POSITIONS,
  },

talk: {
  sheetClass: CHIFUYU_TALK_SHEET_CLASS,
  frameMs: CHIFUYU_TALK_FRAME_MS,
  positions: CHIFUYU_TALK_FRAME_POSITIONS,
},
};

/* =========================
   Chifuyu Three-Layer Sprite Test

   Idle / Walk / Talk 各自擁有固定 DOM layer。
   background-image 設定一次後永遠不再更換。

   模式切換只改 opacity。
========================= */

const chifuyuSpriteLayers = {
  idle: null,
  walk: null,
  talk: null,
};

let chifuyuSpriteLayersReady = false;


function ensureChifuyuSpriteLayers() {
  if (chifuyuSpriteLayersReady) {
    return true;
  }

  if (!chifuyuWalkTest) {
    return false;
  }

  /*
    原本 #chifuyuWalkTest 自己就是 sprite。
    現在把它改成純容器。

    wrapper 完全不碰，
    所以位置 / 翻面 / 景深仍維持原樣。
  */
  chifuyuWalkTest.classList.remove(
    CHIFUYU_WALK_SHEET_CLASS,
    CHIFUYU_IDLE_SHEET_CLASS,
    CHIFUYU_TALK_SHEET_CLASS
  );

  chifuyuWalkTest.style.backgroundImage =
    "none";

  chifuyuWalkTest.style.backgroundPosition =
    "";

  chifuyuWalkTest.style.backgroundSize =
    "";

  chifuyuWalkTest.style.backgroundRepeat =
    "";

  chifuyuWalkTest.style.width =
    "650px";

  chifuyuWalkTest.style.height =
    "650px";

  /*
    上一輪 Idle-only 測試留下的標記
    對三層模式已經沒有用途。
  */
  delete chifuyuWalkTest.dataset
    .gardenFrozenVisual;


  for (const mode of [
    "idle",
    "walk",
    "talk",
  ]) {
    const anim =
      CHIFUYU_ANIMS[mode];

    const asset =
      getGardenAnimationAsset(
        "chifuyu",
        mode
      );

    const layer =
      document.createElement("div");

    layer.dataset.gardenSpriteMode =
      mode;

    /*
      每一層從出生開始就綁定自己的圖片。
      後面再也不修改 background-image。
    */
    layer.style.position =
      "absolute";

    layer.style.left =
      "0";

    layer.style.top =
      "0";

    layer.style.width =
      "650px";

    layer.style.height =
      "650px";

    layer.style.pointerEvents =
      "none";

    layer.style.backgroundImage =
      `url("${asset.src}")`;

    layer.style.backgroundSize =
      `${asset.logicalSize}px ` +
      `${asset.logicalSize}px`;

    layer.style.backgroundRepeat =
      "no-repeat";

    layer.style.backgroundPosition =
      anim.positions[0];

    /*
      不用 display:none，
      三層始終存在。
    */
    layer.style.opacity =
      "0";

    layer.style.transition =
      "none";

    /*
      沿用原本相對於角色本體的定位。
    */
    layer.style.transform =
      "none";

    layer.style.transformOrigin =
      "center bottom";

    chifuyuWalkTest.appendChild(
      layer
    );

    chifuyuSpriteLayers[mode] =
      layer;
  }

  chifuyuSpriteLayersReady = true;

  return true;
}


function getChifuyuSpriteLayer(mode) {
  if (!ensureChifuyuSpriteLayers()) {
    return null;
  }

  return (
    chifuyuSpriteLayers[mode] ||
    chifuyuSpriteLayers.idle
  );
}


function showChifuyuSpriteLayer(mode) {
  if (!ensureChifuyuSpriteLayers()) {
    return;
  }

  for (const layerMode of [
    "idle",
    "walk",
    "talk",
  ]) {
    const layer =
      chifuyuSpriteLayers[
        layerMode
      ];

    if (!layer) continue;

    layer.style.opacity =
      layerMode === mode
        ? "1"
        : "0";
  }
}

const gardenAnimationWarmupState = {
  chifuyuIdle: false,
  chifuyuWalk: false,
  chifuyuTalk: false,

  chinatsuIdle: false,
  chinatsuWalk: false,
  chinatsuTalk: false,
};

/*
  warmup 元素暫時保留。

  第一次真正使用某張 spritesheet 後，
  再延後兩幀移除，避免首次切換時閃爍。
*/
const gardenAnimationWarmupHolders =
  new Map();


function releaseGardenAnimationWarmup(key) {
  const holder =
    gardenAnimationWarmupHolders.get(key);

  if (!holder) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const current =
        gardenAnimationWarmupHolders.get(key);

      if (current !== holder) return;

      /*
        只移除畫面外的 warmup DOM。

        IMPORTANT：
        不再把 warmupState 改回 false。

        一張 spritesheet 成功 warmup 過一次後，
        這個 session 就視為已準備過。

        後續動畫切換由 buffered cover
        負責遮住 Safari / WebKit 換 background
        時可能產生的空白幀。

        因此不需要每一次 Idle / Walk / Talk
        都重新 new Image + decode。
      */
      holder.remove();

      gardenAnimationWarmupHolders.delete(
        key
      );
    });
  });
}


function getGardenAnimationWarmupKey(
  character,
  mode
) {
  if (character === "chifuyu") {
    if (mode === "walk") return "chifuyuWalk";
    if (mode === "talk") return "chifuyuTalk";

    return "chifuyuIdle";
  }

  if (character === "chinatsu") {
    if (mode === "walk") return "chinatsuWalk";
    if (mode === "talk") return "chinatsuTalk";

    return "chinatsuIdle";
  }

  return "";
}

let gardenCriticalAnimationWarmupPromise =
  null;

let gardenDeferredAnimationWarmupRunning =
  false;


function createGardenWarmupFrame(
  sheetClass,
  src
) {
  const el =
    document.createElement("div");

  el.className = sheetClass;

  el.style.width = "650px";
  el.style.height = "650px";

  el.style.backgroundImage =
    `url("${src}")`;

  el.style.backgroundRepeat =
    "no-repeat";

  el.style.backgroundPosition =
    "-2px -2px";

  return el;
}


function preloadGardenAnimationImageStrict(
  src
) {
  return new Promise((resolve) => {
    const img = new Image();

    let finished = false;

    /*
      這裡只做「載太久」警告，
      不再因為 8 / 10 秒到了
      就把尚未下載完成的圖片判成失敗。

      拉門本身已經另有 15 秒 safety timeout，
      所以這裡不需要再把真正的圖片下載中斷。
    */
    const slowTimer = setTimeout(() => {
      console.warn(
        "[Garden] animation image still loading:",
        src
      );
    }, 12000);

    const finish = (ok) => {
      if (finished) return;

      finished = true;

      clearTimeout(slowTimer);

      resolve(ok);
    };

    img.onload = async () => {
      /*
        圖片檔案已經真的下載完成。

        decode() 可以再稍微等，
        但 Safari 偶爾可能長時間不 resolve，
        所以 decode 本身仍保留短 timeout。

        注意：
        這個 timeout 不代表圖片失敗。
        因為 img.onload 已經成功了。
      */
      if (img.decode) {
        try {
          await Promise.race([
            img.decode().catch(() => {}),

            new Promise((resolveDecode) => {
              setTimeout(
                resolveDecode,
                GARDEN_IPAD_SAFE_MODE
                  ? 4000
                  : 2500
              );
            }),
          ]);
        } catch {}
      }

      finish(true);
    };

    img.onerror = () => {
      console.warn(
        "[Garden] animation image failed:",
        src
      );

      finish(false);
    };

    img.src = src;
  });
}


async function warmupGardenAnimationSheet(
  key,
  sheetClass,
  src,
  options = {}
) {
  if (
    gardenAnimationWarmupState[key]
  ) {
    return true;
  }

  const allowIpad =
    options.allowIpad === true;

  /*
    iPad 不做全量 warmup。

    只有即將真正使用的 sheet，
    才允許 targeted warmup。
  */
  if (
    GARDEN_IPAD_SAFE_MODE &&
    !allowIpad
  ) {
    return false;
  }

  /*
    先真正等待圖片 load + decode。

    這裡不使用原本
    preloadGardenImage() 的
    decode timeout fallback。

    避免圖片其實還沒 decode 完，
    卻已經被標記成 ready。
  */
  const loaded =
  await preloadGardenAnimationImageStrict(
    src
  );

if (!loaded) {
  return false;
}

  /*
    如果同一張以前有殘留 holder，
    先清掉。
  */
  const oldHolder =
    gardenAnimationWarmupHolders.get(
      key
    );

  if (oldHolder) {
    oldHolder.remove();

    gardenAnimationWarmupHolders.delete(
      key
    );
  }

  /*
    建立畫面外的真正 CSS background。

    目的：
    不只 decode PNG，
    還讓瀏覽器先建立這張 background
    所需的 paint / texture。
  */
  const holder =
    document.createElement("div");

  holder.style.position = "fixed";
  holder.style.left = "-3000px";
  holder.style.top = "-3000px";

  holder.style.width = "650px";
  holder.style.height = "650px";

  holder.style.pointerEvents = "none";
  holder.style.overflow = "hidden";

  /*
    不可使用：
    display:none
    visibility:hidden
    opacity:0

    否則 Safari / WebKit
    有可能完全不 paint。
  */
  holder.style.opacity = "0.001";

  const frame =
    createGardenWarmupFrame(
      sheetClass,
      src
    );

  /*
    實體 PNG 現在是縮小版本，
    但 CSS 邏輯座標仍然使用原尺寸。
  */
  const logicalSize =
    sheetClass.includes("talk")
      ? GARDEN_TALK_LOGICAL_SHEET_SIZE
      : GARDEN_WALK_IDLE_LOGICAL_SHEET_SIZE;

  frame.style.backgroundSize =
    `${logicalSize}px ${logicalSize}px`;

  holder.appendChild(frame);

  document.body.appendChild(holder);

  /*
    強制 style / layout 套用。
  */
  void frame.offsetWidth;

  /*
    給瀏覽器數個真正的 frame，
    確保 background 已經進入 paint 流程。
  */
  await new Promise((resolve) => {
    let finished = false;

    const finish = () => {
      if (finished) return;

      finished = true;

      resolve();
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(finish);
      });
    });

    /*
      rAF 特殊情況的保險。
    */
    setTimeout(
      finish,
      500
    );
  });

  /*
    先保留 holder。

    等真正角色開始使用這張 sheet，
    setter 裡現有的
    releaseGardenAnimationWarmup()
    會再延後兩幀移除。
  */
  gardenAnimationWarmupHolders.set(
    key,
    holder
  );

  gardenAnimationWarmupState[key] =
    true;

  return true;
}


/*
  同一張 sheet 如果正在準備，
  不重複建立 decode / warmup 工作。
*/
const gardenOnDemandWarmupPromises =
  new Map();


/*
  iPad 一次只 warmup 一張角色 sheet。

  例如：
  千冬 Talk
  ↓
  完成
  ↓
  千夏 Talk

  避免兩張大型 PNG
  同時 decode 造成瞬間記憶體尖峰。
*/
let gardenIpadWarmupChain =
  Promise.resolve();


function requestGardenAnimationWarmup(
  character,
  mode,
  anim
) {
  const key =
    getGardenAnimationWarmupKey(
      character,
      mode
    );

  if (!key || !anim) {
    return Promise.resolve(false);
  }

  /*
    已經準備好就不用再做。
  */
  if (
    gardenAnimationWarmupState[key]
  ) {
    return Promise.resolve(true);
  }

  /*
    正在準備同一張的話，
    直接沿用現有 Promise。
  */
  if (
    gardenOnDemandWarmupPromises.has(
      key
    )
  ) {
    return gardenOnDemandWarmupPromises.get(
      key
    );
  }

  const asset =
    getGardenAnimationAsset(
      character,
      mode
    );

  const run = () =>
    warmupGardenAnimationSheet(
      key,
      anim.sheetClass,
      asset.src,
      {
        allowIpad: true,
      }
    );

  let promise;

  /*
    iPad：
    所有 targeted warmup 排隊處理，
    不同時 decode 多張 spritesheet。
  */
  if (GARDEN_IPAD_SAFE_MODE) {
    promise =
      gardenIpadWarmupChain.then(
        run,
        run
      );

    gardenIpadWarmupChain =
      promise.catch(() => {});
  } else {
    promise = run();
  }

  gardenOnDemandWarmupPromises.set(
    key,
    promise
  );

  promise.finally(() => {
    gardenOnDemandWarmupPromises.delete(
      key
    );
  });

  return promise;
}


async function warmupGardenCriticalAnimationSheets() {

  /*
    iPadOS 不使用 offscreen spritesheet warmup。
    iPad 的 compressed cache 已經由
    Garden 進場流程另外管理。
  */
  if (GARDEN_IPAD_SAFE_MODE) {
    return;
  }

  const alreadyDone =
    gardenAnimationWarmupState.chifuyuIdle &&
    gardenAnimationWarmupState.chifuyuWalk &&
    gardenAnimationWarmupState.chifuyuTalk &&
    gardenAnimationWarmupState.chinatsuIdle &&
    gardenAnimationWarmupState.chinatsuWalk &&
    gardenAnimationWarmupState.chinatsuTalk;

  if (alreadyDone) return;

  // 後面原本內容照舊

  if (
    gardenCriticalAnimationWarmupPromise
  ) {
    await gardenCriticalAnimationWarmupPromise;
    return;
  }

  gardenCriticalAnimationWarmupPromise =
    (async () => {

      /*
        Talk
      */
      await warmupGardenAnimationSheet(
        "chifuyuTalk",
        CHIFUYU_TALK_SHEET_CLASS,
        CHIFUYU_TALK_SHEET_SRC
      );

      await warmupGardenAnimationSheet(
        "chinatsuTalk",
        CHINATSU_TALK_SHEET_CLASS,
        CHINATSU_TALK_SHEET_SRC
      );

      /*
        Idle
      */
      await warmupGardenAnimationSheet(
        "chifuyuIdle",
        CHIFUYU_IDLE_SHEET_CLASS,
        CHIFUYU_IDLE_SHEET_SRC
      );

      await warmupGardenAnimationSheet(
        "chinatsuIdle",
        CHINATSU_IDLE_SHEET_CLASS,
        CHINATSU_IDLE_SHEET_SRC
      );

      /*
        Walk

        圖片此時早已 decode 完成，
        這裡只是提前讓瀏覽器 paint 一次。
      */
      await warmupGardenAnimationSheet(
        "chifuyuWalk",
        CHIFUYU_WALK_SHEET_CLASS,
        CHIFUYU_WALK_SHEET_SRC
      );

      await warmupGardenAnimationSheet(
        "chinatsuWalk",
        CHINATSU_WALK_SHEET_CLASS,
        CHINATSU_WALK_SHEET_SRC
      );
    })();

  try {
    await gardenCriticalAnimationWarmupPromise;
  } finally {
    gardenCriticalAnimationWarmupPromise =
      null;
  }
}


/*
  walk 不需要卡在拉門關閉期間處理。

  因為進庭院後角色本來會先 idle 一段時間，
  利用這段空檔再準備。
*/
async function warmupGardenDeferredWalkSheets() {
  if (
    gardenDeferredAnimationWarmupRunning
  ) {
    return;
  }

  const alreadyDone =
    gardenAnimationWarmupState.chifuyuWalk &&
    gardenAnimationWarmupState.chinatsuWalk;

  if (alreadyDone) return;

  if (
    !gardenScreen ||
    gardenScreen.classList.contains(
      "hidden"
    )
  ) {
    return;
  }

  gardenDeferredAnimationWarmupRunning =
    true;

  try {
    if (
      !gardenScreen.classList.contains(
        "hidden"
      )
    ) {
      await warmupGardenAnimationSheet(
        "chifuyuWalk",
        CHIFUYU_WALK_SHEET_CLASS,
        CHIFUYU_WALK_SHEET_SRC
      );
    }

    if (
      !gardenScreen.classList.contains(
        "hidden"
      )
    ) {
      await new Promise((resolve) => {
        setTimeout(resolve, 120);
      });

      await warmupGardenAnimationSheet(
        "chinatsuWalk",
        CHINATSU_WALK_SHEET_CLASS,
        CHINATSU_WALK_SHEET_SRC
      );
    }
  } finally {
    gardenDeferredAnimationWarmupRunning =
      false;
  }
}


function startGardenDeferredAnimationWarmup() {

    if (GARDEN_IPAD_SAFE_MODE) {
    return;
  }

  const run = () => {
    if (
      !gardenScreen ||
      gardenScreen.classList.contains(
        "hidden"
      )
    ) {
      return;
    }

    warmupGardenDeferredWalkSheets();
  };

  if (
    "requestIdleCallback" in window
  ) {
    requestIdleCallback(
      run,
      {
        timeout: 1200,
      }
    );
  } else {
    setTimeout(
      run,
      450
    );
  }
}


const gardenBufferedSpriteSwapState = {
  chifuyu: {
    busy: false,
  },

  chinatsu: {
    busy: false,
  },
};



const chifuyuWalkTestState = {
  x: 600,
  y: 1725,

  direction: 1,

  animMode: "",

  frameIndex: 0,
  frameTimer: 0,
  animLoopCount: 0,

  moveSpeed: 150,

  path: [],
  isMoving: false,

  lastTime: performance.now(),
};

function setChifuyuAnimationMode(
  mode,
  force = false
) {
  if (!chifuyuWalkTest) return;

  const safeMode =
    mode === "talk"
      ? "talk"
      : mode === "walk"
        ? "walk"
        : "idle";

  const anim =
    CHIFUYU_ANIMS[safeMode];

  const state =
    chifuyuWalkTestState;

  const warmupKey =
    getGardenAnimationWarmupKey(
      "chifuyu",
      safeMode
    );

  /*
    該模式還沒完成 warmup：
    先維持目前畫面。
  */
  if (
    !gardenAnimationWarmupState[
      warmupKey
    ]
  ) {
    requestGardenAnimationWarmup(
      "chifuyu",
      safeMode,
      anim
    );

    return;
  }

  if (
    !ensureChifuyuSpriteLayers()
  ) {
    return;
  }

  if (
    !force &&
    state.animMode === safeMode
  ) {
    return;
  }

  state.animMode =
    safeMode;

  state.frameIndex = 0;
  state.frameTimer = 0;
  state.animLoopCount = 0;

  const layer =
    getChifuyuSpriteLayer(
      safeMode
    );

  if (layer) {
    layer.style.backgroundPosition =
      anim.positions[0];
  }

  /*
    只切 layer 可見性，
    永遠不再 runtime 更換 background-image。
  */
  showChifuyuSpriteLayer(
    safeMode
  );

  releaseGardenAnimationWarmup(
    warmupKey
  );
}



function updateChifuyuAnimationFrame(
  deltaMs
) {
  if (!chifuyuWalkTest) return;

  const state =
    chifuyuWalkTestState;

  const anim =
    CHIFUYU_ANIMS[
      state.animMode
    ] ||
    CHIFUYU_ANIMS.idle;

  const layer =
    getChifuyuSpriteLayer(
      state.animMode
    );

  if (!layer) return;

  if (
    gardenChatState.mode ===
      "chat" &&
    state.animMode === "talk" &&
    isGardenTalkReadyToEndForCharacter(
      "chifuyu"
    )
  ) {
    state.frameIndex = 0;
    state.frameTimer = 0;

    layer.style.backgroundPosition =
      anim.positions[0];

    return;
  }

  state.frameTimer += deltaMs;

  while (
    state.frameTimer >= anim.frameMs
  ) {
    state.frameTimer -=
      anim.frameMs;

    const nextFrameIndex =
      (
        state.frameIndex + 1
      ) %
      anim.positions.length;

    if (
      nextFrameIndex === 0 &&
      state.frameIndex !== 0
    ) {
      state.animLoopCount =
        (
          state.animLoopCount ||
          0
        ) + 1;
    }

    state.frameIndex =
      nextFrameIndex;

    layer.style.backgroundPosition =
      anim.positions[
        state.frameIndex
      ];

    if (
      gardenChatState.mode ===
        "chat" &&
      state.animMode ===
        "talk" &&
      (
        state.animLoopCount ||
        0
      ) >=
        Math.max(
          1,
          gardenChatState
            .targetLoops || 1
        ) &&
      state.frameIndex === 0
    ) {
      markGardenTalkReadyToEnd(
        "chifuyu"
      );

      state.frameIndex = 0;
      state.frameTimer = 0;

      layer.style.backgroundPosition =
        anim.positions[0];

      return;
    }
  }
}

function getGardenLocalPointFromEvent(e) {
  const root = document.getElementById("gameRoot");
  if (!root) return null;

  const rect = root.getBoundingClientRect();

  const x = (e.clientX - rect.left) * (1080 / rect.width);
  const y = (e.clientY - rect.top) * (1920 / rect.height);

  return { x, y };
}

function setChifuyuMovePath(points) {
  chifuyuWalkTestState.path = points.map(p => ({ x: p.x, y: p.y }));
  chifuyuWalkTestState.isMoving = chifuyuWalkTestState.path.length > 0;
}

/* =========================
   Garden Independent Character Travel
========================= */


function getGardenCharacterRuntime(
  character
) {
  if (
    character ===
    "chifuyu"
  ) {
    return {
      moveState:
        chifuyuWalkTestState,

      autoState:
        chifuyuAutoWalkState,

      setPath:
        setChifuyuMovePath,

      resetAutoWalk:
        resetChifuyuAutoWalk,
    };
  }


  if (
    character ===
    "chinatsu"
  ) {
    return {
      moveState:
        chinatsuWalkTestState,

      autoState:
        chinatsuAutoWalkState,

      setPath:
        setChinatsuMovePath,

      resetAutoWalk:
        resetChinatsuAutoWalk,
    };
  }


  return null;
}


/*
  暫時只有兩張正式場景，
  所以先明確定義兩個方向。

  之後場景增加時，
  再把這層搬進 scene.exits /
  scene.entrances。
*/
function getGardenCharacterTravelRoute(
  fromSceneId,
  toSceneId
) {
  const fromScene =
    getGardenSceneById(
      fromSceneId
    );


  const toScene =
    getGardenSceneById(
      toSceneId
    );


  if (
    !fromScene ||
    !toScene
  ) {
    return null;
  }


  /*
    從「角色目前所在場景」
    找通往目的地的出口。
  */
  const exit =
    fromScene.exits?.[
      toSceneId
    ];


  if (!exit) {
    return null;
  }


  /*
    Exit 明確指定：

    抵達目的地後
    要使用哪一個 Entrance。
  */
  const entranceId =
    exit.targetEntranceId;


  if (!entranceId) {
    console.warn(
      "[Garden Travel] exit has no targetEntranceId:",
      fromSceneId,
      "→",
      toSceneId
    );

    return null;
  }


  const entrance =
    toScene.entrances?.[
      entranceId
    ];


  if (!entrance) {
    console.warn(
      "[Garden Travel] destination entrance not found:",
      toSceneId,
      entranceId
    );

    return null;
  }


  return {
    fromSceneId,
    toSceneId,

    exitType:
      exit.exitType,

    exitByCharacter:
      exit.characters,

    entranceByCharacter:
      entrance.characters,

    entranceDirection:
      entrance.direction ?? 1,

    /*
      先保留下來。
      之後 Travel State Debug
      也會很好用。
    */
    entranceId,
  };
}


function isGardenCharacterTraveling(
  character
) {
  return !!(
    gardenCharacterWorldState[
      character
    ]?.travel
  );
}


function isAnyGardenCharacterTraveling() {
  return (
    isGardenCharacterTraveling(
      "chifuyu"
    ) ||
    isGardenCharacterTraveling(
      "chinatsu"
    )
  );
}


/*
  建立角色離開目前場景的 path。
*/
function buildGardenCharacterExitPath(
  character,
  route
) {
  const runtime =
    getGardenCharacterRuntime(
      character
    );


  if (
    !runtime ||
    !route
  ) {
    return null;
  }


  const state =
    runtime.moveState;


  const exit =
    route.exitByCharacter?.[
      character
    ];


  if (!exit) {
    return null;
  }


  const start = {
    x: state.x,
    y: state.y,
  };


  /*
    Courtyard → Moon Bridge

    出口點本身仍位於庭院
    far walkArea 內，
    所以直接正常尋路。
  */
  if (
    route.exitType ===
    "direct"
  ) {
    return findGardenPath(
      start,
      exit,
      route.fromSceneId
    );
  }


  /*
    Moon Bridge → Courtyard

    先正常走到橋面左端，
    再追加一個位於畫面外的 out。
  */
  if (
    route.exitType ===
    "approachOut"
  ) {
    const approachPath =
      findGardenPath(
        start,
        exit.approach,
        route.fromSceneId
      );


    if (!approachPath) {
      return null;
    }


    return [
      ...approachPath,

      {
        x: exit.out.x,
        y: exit.out.y,
      },
    ];
  }


  return null;
}


/*
  Transit 完成後，
  讓指定角色自己從目的地入口走進來。
*/
function startGardenCharacterTravelEntrance(
  character
) {
  const worldState =
    gardenCharacterWorldState[
      character
    ];


  const runtime =
    getGardenCharacterRuntime(
      character
    );


  if (
    !worldState ||
    !runtime ||
    !worldState.travel
  ) {
    return false;
  }


  const travel =
    worldState.travel;


  const route =
    getGardenCharacterTravelRoute(
      travel.fromSceneId,
      travel.toSceneId
    );


  if (!route) {
    console.warn(
      "[Garden Travel] route missing:",
      character,
      travel.fromSceneId,
      travel.toSceneId
    );

    return false;
  }


  const entrance =
    route.entranceByCharacter?.[
      character
    ];


  if (!entrance) {
    console.warn(
      "[Garden Travel] entrance missing:",
      character,
      travel.toSceneId
    );

    return false;
  }


  const state =
    runtime.moveState;


  /*
    從現在開始，
    角色在世界狀態上已經屬於目的地。
  */
  worldState.sceneId =
    travel.toSceneId;


  state.x =
    entrance.spawn.x;

  state.y =
    entrance.spawn.y;

  state.direction =
    route.entranceDirection;

  state.path = [];

  state.isMoving =
    false;


  /*
    spawn 本來可以在 walkArea 外，
    所以入口動畫直接走專用 path。
  */
  runtime.setPath([
    {
      x: entrance.enter.x,
      y: entrance.enter.y,
    },
  ]);


  travel.phase =
    "walkingFromEntrance";


  updateGardenCharacterVisibility();


  console.log(
    `[Garden Travel] ${character} entering ${travel.toSceneId}`
  );


  return true;
}


/*
  每一幀更新「單一角色」的旅行。
*/
function updateGardenCharacterTravel(
  character,
  now = performance.now()
) {
  const worldState =
    gardenCharacterWorldState[
      character
    ];


  const runtime =
    getGardenCharacterRuntime(
      character
    );


  if (
    !worldState ||
    !runtime
  ) {
    return;
  }


  const travel =
    worldState.travel;


  if (!travel) {
    return;
  }


  const state =
    runtime.moveState;


  /* =========================
     1. Walking To Exit
  ========================= */

  if (
    travel.phase ===
      "walkingToExit"
  ) {
    if (
      state.isMoving
    ) {
      return;
    }


    /*
      已經走出原場景。

      Transit 期間不屬於
      courtyard / moonBridge
      任一可觀看場景。
    */
    worldState.sceneId =
      null;


    state.path = [];

    state.isMoving =
      false;


    travel.phase =
      "transit";


    travel.transitUntil =
  now +
  GARDEN_CHARACTER_TRAVEL_TRANSIT_MS;


    updateGardenCharacterVisibility();


    console.log(
      `[Garden Travel] ${character} → transit`
    );


    return;
  }


  /* =========================
     2. Transit
  ========================= */

  if (
    travel.phase ===
      "transit"
  ) {
    if (
      now <
      travel.transitUntil
    ) {
      return;
    }


    startGardenCharacterTravelEntrance(
      character
    );


    return;
  }


  /* =========================
     3. Walking From Entrance
  ========================= */

  if (
    travel.phase ===
      "walkingFromEntrance"
  ) {
    if (
      state.isMoving
    ) {
      return;
    }


    const destinationSceneId =
      travel.toSceneId;


    worldState.sceneId =
      destinationSceneId;


    /*
      正式完成旅行。
    */
    worldState.travel =
      null;
setGardenCharacterActivity(
  character,
  GARDEN_CHARACTER_ACTIVITY
    .WANDER
);

    runtime.resetAutoWalk();


    updateGardenCharacterVisibility();


    console.log(
      `[Garden Travel] ${character} arrived:`,
      destinationSceneId
    );
  }
}


/*
  正式通用 API。

  character:
  "chifuyu"
  "chinatsu"

  toSceneId:
  "courtyard"
  "moonBridge"
*/
function travelGardenCharacter(
  character,
  toSceneId
) {
  const worldState =
    gardenCharacterWorldState[
      character
    ];


  const runtime =
    getGardenCharacterRuntime(
      character
    );


  if (
    !worldState ||
    !runtime
  ) {
    console.warn(
      "[Garden Travel] unknown character:",
      character
    );

    return false;
  }



  if (
    worldState.travel
  ) {
    console.warn(
      "[Garden Travel] character already traveling:",
      character
    );

    return false;
  }


  const fromSceneId =
    worldState.sceneId;


  if (!fromSceneId) {
    console.warn(
      "[Garden Travel] character has no current scene:",
      character
    );

    return false;
  }


  if (
    fromSceneId ===
    toSceneId
  ) {
    return true;
  }


  /*
    目前先不允許正在進行雙人聊天時
    任意拉走其中一個人。

    玩家切鏡頭仍然完全不受限制。
  */
  if (
    gardenChatState.mode !==
      "wander"
  ) {
    console.warn(
      "[Garden Travel] wait until wander mode:",
      character
    );

    return false;
  }


  const route =
    getGardenCharacterTravelRoute(
      fromSceneId,
      toSceneId
    );


  if (!route) {
    console.warn(
      "[Garden Travel] route not found:",
      fromSceneId,
      "→",
      toSceneId
    );

    return false;
  }


  const path =
    buildGardenCharacterExitPath(
      character,
      route
    );


  if (
    !path ||
    path.length === 0
  ) {
    console.warn(
      "[Garden Travel] exit path not found:",
      character,
      fromSceneId,
      "→",
      toSceneId
    );

    return false;
  }


  worldState.travel = {
    fromSceneId,
    toSceneId,

    phase:
      "walkingToExit",

    transitUntil:
      0,
  };


  setGardenCharacterActivity(
  character,
  GARDEN_CHARACTER_ACTIVITY
    .TRAVEL,
  {
    fromSceneId,
    toSceneId,
  }
);


  runtime.autoState.wasMoving =
    false;


  runtime.setPath(
    path
  );


  updateGardenCharacterVisibility();


  console.log(
    `[Garden Travel] ${character}: ${fromSceneId} → ${toSceneId}`,
    {
      path,
    }
  );


  return true;
}


/* =========================
   Test Wrappers
========================= */

function startChifuyuCourtyardMoonBridgeTravelTest() {
  return travelGardenCharacter(
    "chifuyu",
    "moonBridge"
  );
}


function startChifuyuMoonBridgeCourtyardTravelTest() {
  return travelGardenCharacter(
    "chifuyu",
    "courtyard"
  );
}


window.testChifuyuCourtyardMoonBridgeTravel =
  startChifuyuCourtyardMoonBridgeTravelTest;


window.testChifuyuMoonBridgeCourtyardTravel =
  startChifuyuMoonBridgeCourtyardTravelTest;


/*
  千夏測試
*/
window.testChinatsuCourtyardMoonBridgeTravel =
  () =>
    travelGardenCharacter(
      "chinatsu",
      "moonBridge"
    );


window.testChinatsuMoonBridgeCourtyardTravel =
  () =>
    travelGardenCharacter(
      "chinatsu",
      "courtyard"
    );


/*
  正式 API 也先掛出來，
  方便 Console 測試。
*/
window.travelGardenCharacter =
  travelGardenCharacter;



/*
  Console：

  testChifuyuCourtyardMoonBridgeTravel()
*/
window.testChifuyuCourtyardMoonBridgeTravel =
  startChifuyuCourtyardMoonBridgeTravelTest;



/* =========================
   Chinatsu Garden Character
   千夏庭園角色
========================= */

const chinatsuWalkTestWrap = document.getElementById("chinatsuWalkTestWrap");
const chinatsuWalkTest = document.getElementById("chinatsuWalkTest");

const CHINATSU_WALK_SHEET_CLASS = "chinatsu-walk-sheet";
const CHINATSU_IDLE_SHEET_CLASS = "chinatsu-idle-sheet";
const CHINATSU_TALK_SHEET_CLASS = "chinatsu-talk-sheet";

const CHINATSU_ANIMS = {
  walk: {
    sheetClass: CHINATSU_WALK_SHEET_CLASS,
    frameMs: CHINATSU_WALK_FRAME_MS,
    positions: CHIFUYU_FRAME_POSITIONS,
  },

  idle: {
    sheetClass: CHINATSU_IDLE_SHEET_CLASS,
    frameMs: CHINATSU_IDLE_FRAME_MS,
    positions: CHIFUYU_IDLE_FRAME_POSITIONS,
  },

  talk: {
  sheetClass: CHINATSU_TALK_SHEET_CLASS,
  frameMs: CHINATSU_TALK_FRAME_MS,
  positions: CHINATSU_TALK_FRAME_POSITIONS,
},
};

/* =========================
   Chinatsu Three-Layer Sprite
========================= */

const chinatsuSpriteLayers = {
  idle: null,
  walk: null,
  talk: null,
};

let chinatsuSpriteLayersReady = false;


function ensureChinatsuSpriteLayers() {
  if (chinatsuSpriteLayersReady) {
    return true;
  }

  if (!chinatsuWalkTest) {
    return false;
  }

  // 原本 sprite 本體改成純容器
  chinatsuWalkTest.classList.remove(
    CHINATSU_WALK_SHEET_CLASS,
    CHINATSU_IDLE_SHEET_CLASS,
    CHINATSU_TALK_SHEET_CLASS
  );

  chinatsuWalkTest.style.backgroundImage =
    "none";

  chinatsuWalkTest.style.backgroundPosition =
    "";

  chinatsuWalkTest.style.backgroundSize =
    "";

  chinatsuWalkTest.style.backgroundRepeat =
    "";

  chinatsuWalkTest.style.width =
    "650px";

  chinatsuWalkTest.style.height =
    "650px";

  delete chinatsuWalkTest.dataset
    .gardenFrozenVisual;


  for (const mode of [
    "idle",
    "walk",
    "talk",
  ]) {
    const anim =
      CHINATSU_ANIMS[mode];

    const asset =
      getGardenAnimationAsset(
        "chinatsu",
        mode
      );

    const layer =
      document.createElement("div");

    layer.dataset.gardenSpriteMode =
      mode;

    layer.style.position =
      "absolute";

    layer.style.left =
      "0";

    layer.style.top =
      "0";

    layer.style.width =
      "650px";

    layer.style.height =
      "650px";

    layer.style.pointerEvents =
      "none";

    // 每一層永遠綁自己的 spritesheet
    layer.style.backgroundImage =
      `url("${asset.src}")`;

    layer.style.backgroundSize =
      `${asset.logicalSize}px ` +
      `${asset.logicalSize}px`;

    layer.style.backgroundRepeat =
      "no-repeat";

    layer.style.backgroundPosition =
      anim.positions[0];

    layer.style.opacity =
      "0";

    layer.style.transition =
      "none";

    layer.style.transform =
      "none";

    layer.style.transformOrigin =
      "center bottom";

    chinatsuWalkTest.appendChild(
      layer
    );

    chinatsuSpriteLayers[mode] =
      layer;
  }

  chinatsuSpriteLayersReady = true;

  return true;
}


function getChinatsuSpriteLayer(mode) {
  if (!ensureChinatsuSpriteLayers()) {
    return null;
  }

  return (
    chinatsuSpriteLayers[mode] ||
    chinatsuSpriteLayers.idle
  );
}


function showChinatsuSpriteLayer(mode) {
  if (!ensureChinatsuSpriteLayers()) {
    return;
  }

  for (const layerMode of [
    "idle",
    "walk",
    "talk",
  ]) {
    const layer =
      chinatsuSpriteLayers[
        layerMode
      ];

    if (!layer) continue;

    layer.style.opacity =
      layerMode === mode
        ? "1"
        : "0";
  }
}


/* =========================
   Garden Idle-Sheet-Only A/B Test

   永遠使用 Idle spritesheet，
   但恢復 Idle sheet 自己的逐幀動畫。

   用來判斷：
   - 同一張 sheet 換 background-position 是否會閃
   - 還是只有換 background-image 才會閃
========================= */





const chinatsuWalkTestState = {
  x: 430,
  y: 1680,

  direction: 1,

  animMode: "",

  frameIndex: 0,
  frameTimer: 0,
  animLoopCount: 0,

  moveSpeed: 145,

  path: [],
  isMoving: false,

  currentDepthLayer: "normal",
};

const chinatsuAutoWalkState = {
  nextMoveTime: 0,
  wasMoving: false,
};

function moveChinatsuToDepthLayer(layerName) {
  if (!chinatsuWalkTestWrap) return;
  if (chinatsuWalkTestState.currentDepthLayer === layerName) return;

  let targetLayer = gardenCharNormalLayer;

  if (layerName === "far") {
    targetLayer = gardenCharFarLayer;
  }

  if (layerName === "front") {
    targetLayer = gardenCharFrontLayer;
  }

  if (layerName === "cornerFront") {
    targetLayer = gardenCharCornerFrontLayer;
  }

  if (!targetLayer) return;

  targetLayer.appendChild(chinatsuWalkTestWrap);
  chinatsuWalkTestState.currentDepthLayer = layerName;
}

function setChinatsuAnimationMode(
  mode,
  force = false
) {
  if (!chinatsuWalkTest) return;

  const safeMode =
    mode === "talk"
      ? "talk"
      : mode === "walk"
        ? "walk"
        : "idle";

  const anim =
    CHINATSU_ANIMS[safeMode];

  const state =
    chinatsuWalkTestState;

  const warmupKey =
    getGardenAnimationWarmupKey(
      "chinatsu",
      safeMode
    );

  if (
    !gardenAnimationWarmupState[
      warmupKey
    ]
  ) {
    requestGardenAnimationWarmup(
      "chinatsu",
      safeMode,
      anim
    );

    return;
  }

  if (
    !ensureChinatsuSpriteLayers()
  ) {
    return;
  }

  if (
    !force &&
    state.animMode === safeMode
  ) {
    return;
  }

  state.animMode =
    safeMode;

  state.frameIndex = 0;
  state.frameTimer = 0;
  state.animLoopCount = 0;

  const layer =
    getChinatsuSpriteLayer(
      safeMode
    );

  if (layer) {
    layer.style.backgroundPosition =
      anim.positions[0];
  }

  showChinatsuSpriteLayer(
    safeMode
  );

  releaseGardenAnimationWarmup(
    warmupKey
  );
}
function updateChinatsuAnimationFrame(
  deltaMs
) {
  if (!chinatsuWalkTest) return;

  const state =
    chinatsuWalkTestState;

  const anim =
    CHINATSU_ANIMS[
      state.animMode
    ] ||
    CHINATSU_ANIMS.idle;

  const layer =
    getChinatsuSpriteLayer(
      state.animMode
    );

  if (!layer) return;

  if (
    gardenChatState.mode ===
      "chat" &&
    state.animMode === "talk" &&
    isGardenTalkReadyToEndForCharacter(
      "chinatsu"
    )
  ) {
    state.frameIndex = 0;
    state.frameTimer = 0;

    layer.style.backgroundPosition =
      anim.positions[0];

    return;
  }

  state.frameTimer += deltaMs;

  while (
    state.frameTimer >= anim.frameMs
  ) {
    state.frameTimer -=
      anim.frameMs;

    const nextFrameIndex =
      (
        state.frameIndex + 1
      ) %
      anim.positions.length;

    if (
      nextFrameIndex === 0 &&
      state.frameIndex !== 0
    ) {
      state.animLoopCount =
        (
          state.animLoopCount ||
          0
        ) + 1;
    }

    state.frameIndex =
      nextFrameIndex;

    layer.style.backgroundPosition =
      anim.positions[
        state.frameIndex
      ];

    if (
      gardenChatState.mode ===
        "chat" &&
      state.animMode ===
        "talk" &&
      (
        state.animLoopCount ||
        0
      ) >=
        Math.max(
          1,
          gardenChatState
            .targetLoops || 1
        ) &&
      state.frameIndex === 0
    ) {
      markGardenTalkReadyToEnd(
        "chinatsu"
      );

      state.frameIndex = 0;
      state.frameTimer = 0;

      layer.style.backgroundPosition =
        anim.positions[0];

      return;
    }
  }
}

function getChinatsuMoveSpeedByY(y) {
  const farY = 470;
  const nearY = 1810;

  const farSpeed = 95;
  const nearSpeed = 150;

  const t = Math.max(0, Math.min(1, (y - farY) / (nearY - farY)));

  return farSpeed + t * (nearSpeed - farSpeed);
}

function updateChinatsuWalkPosition(deltaMs) {
  const state = chinatsuWalkTestState;

  if (!state.path || state.path.length === 0) {
    state.isMoving = false;
    return;
  }

  state.isMoving = true;

  const target = state.path[0];

  const dx = target.x - state.x;
  const dy = target.y - state.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const currentSpeed = getChinatsuMoveSpeedByY(state.y);
  const step = currentSpeed * (deltaMs / 1000);

  if (dist <= step) {
    state.x = target.x;
    state.y = target.y;
    state.path.shift();

    if (state.path.length === 0) {
      state.isMoving = false;
    }

    return;
  }

  if (Math.abs(dx) > 2) {
    state.direction = dx > 0 ? 1 : -1;
  }

  state.x += (dx / dist) * step;
  state.y += (dy / dist) * step;
}

function setChinatsuMovePath(points) {
  chinatsuWalkTestState.path = points.map(p => ({ x: p.x, y: p.y }));
  chinatsuWalkTestState.isMoving = chinatsuWalkTestState.path.length > 0;
}

const CHIFUYU_AUTO_WALK_MAX_DISTANCE = 620;
const CHINATSU_AUTO_WALK_MAX_DISTANCE = 560;

/* =========================
   Chinatsu Companion Auto Walk
   姊姊陪伴式散步
========================= */

const CHINATSU_AUTO_IDLE_MIN_MS = 4200;
const CHINATSU_AUTO_IDLE_MAX_MS = 10500;
const CHINATSU_AUTO_PICK_RETRY = 18;

function scheduleNextChinatsuAutoMove(now = performance.now()) {
  chinatsuAutoWalkState.nextMoveTime =
    now + randomBetween(CHINATSU_AUTO_IDLE_MIN_MS, CHINATSU_AUTO_IDLE_MAX_MS);
}

function pickRandomPointNearChifuyu() {
  const chifuyuSceneId =
    gardenCharacterWorldState
      .chifuyu.sceneId;

  const chinatsuSceneId =
    gardenCharacterWorldState
      .chinatsu.sceneId;


  /*
    不在同一個場景時，
    千夏不能執行「靠近千冬」行為。
  */
  if (
    !chifuyuSceneId ||
    chifuyuSceneId !==
      chinatsuSceneId
  ) {
    return null;
  }


  const sceneId =
    chifuyuSceneId;


  const baseX =
    chifuyuWalkTestState.x;

  const baseY =
    chifuyuWalkTestState.y;


  const scene =
    getGardenSceneById(
      sceneId
    );

  if (!scene) {
    return null;
  }


  const autoTargets =
    scene.autoTargets || [];


  let candidates =
    autoTargets
    .filter(
  (p) =>
    isGardenWalkablePointInScene(
      sceneId,
      p.x,
      p.y
    )
)
    .map((p) => {
      const dx = p.x - baseX;
      const dy = (p.y - baseY) * 1.35;

      return {
        x: p.x,
        y: p.y,
        dist: Math.sqrt(dx * dx + dy * dy),
      };
    })
    .filter((p) => p.dist >= 110 && p.dist <= 420);

  if (candidates.length > 0) {
    // 從比較靠近千冬的前幾個點中抽，避免每次都貼太近
    candidates.sort((a, b) => a.dist - b.dist);
    candidates = candidates.slice(0, 6);

    const index = Math.floor(Math.random() * candidates.length);
    const p = candidates[index];

    return { x: p.x, y: p.y };
  }

  return pickRandomGardenWalkTarget(
  sceneId
);
}

function startChinatsuAutoWalkToCompanionTarget() {
  const sceneId =
    gardenCharacterWorldState
      .chinatsu.sceneId;


  if (!sceneId) {
    return false;
  }


  const start = {
    x:
      chinatsuWalkTestState.x,

    y:
      chinatsuWalkTestState.y,
  };


  const scene =
    getGardenSceneById(
      sceneId
    );

  if (!scene) {
    return false;
  }


  const autoTargets =
    scene.autoTargets || [];

  const candidates = [];

  /*
    先把現在真正能走的目的地全部找出來，
    最後再從合格候選中隨機選。

    這樣不會因為隨機重抽運氣不好，
    明明有路卻一直 return false。
  */
  for (
  const target of
  autoTargets
) {
    if (
      !isGardenWalkablePointInScene(
  sceneId,
  target.x,
  target.y
)
    ) {
      continue;
    }

    const dx =
      target.x - start.x;

    const dy =
      target.y - start.y;

    const dist =
      Math.sqrt(
        dx * dx +
        dy * dy
      );

    // 避免原地小碎步
    if (dist < 110) {
      continue;
    }

    // 太遠先不尋路
    if (
      dist >
      CHINATSU_AUTO_WALK_MAX_DISTANCE *
        1.15
    ) {
      continue;
    }

    const path =
  findGardenPath(
    start,
    target,
    sceneId
  );

    if (
      !path ||
      path.length === 0
    ) {
      continue;
    }

    const pathDistance =
      getGardenPathDistance(
        start,
        path
      );

    if (
      pathDistance >
      CHINATSU_AUTO_WALK_MAX_DISTANCE
    ) {
      continue;
    }

    candidates.push({
      path,
      pathDistance,
    });
  }

  if (
    candidates.length === 0
  ) {
    return false;
  }

  const choice =
    candidates[
      Math.floor(
        Math.random() *
        candidates.length
      )
    ];

  setChinatsuMovePath(
    choice.path
  );

  return true;
}

function updateChinatsuAutoWalk(now) {
  // 正在走就不打斷
  if (chinatsuWalkTestState.isMoving) {
    chinatsuAutoWalkState.wasMoving = true;
    return;
  }

  // 剛停下，重新安排下一次行動
  if (chinatsuAutoWalkState.wasMoving) {
    chinatsuAutoWalkState.wasMoving = false;
    scheduleNextChinatsuAutoMove(now);
    return;
  }

  if (
  now <
  chinatsuAutoWalkState
    .nextMoveTime
) {
  return;
}


/*
  下一個行動開始前，
  先低機率判斷是否要跨場景。
*/
if (
  tryStartGardenAutoTravel(
    "chinatsu"
  )
) {
  return;
}


const moved =
  startChinatsuAutoWalkToCompanionTarget();

  if (!moved) {
    scheduleNextChinatsuAutoMove(now);
  }
}

function resetChinatsuAutoWalk() {
  chinatsuAutoWalkState.wasMoving = false;
  scheduleNextChinatsuAutoMove(performance.now());
}



/* =========================
   Garden Chat System
   進庭院 / 散步中偶爾聊天
========================= */


const GARDEN_INITIAL_CHAT_CHANCE = 0.5;

// 散步中自然聊天：不要太頻繁
const GARDEN_WANDER_CHAT_CHANCE = 0.18;
const GARDEN_CHAT_CHECK_MIN_MS = 5000;
const GARDEN_CHAT_CHECK_MAX_MS = 9000;

const GARDEN_CHAT_LOOP_MIN = 2;
const GARDEN_CHAT_LOOP_MAX = 4;

/*
  iPadOS 暫時不使用原尺寸 Talk spritesheet。

  聊天行為照常進行，
  但改用 Idle 動畫 + 計時結束，
  避免載入兩張超大型 Talk sheet 導致 WebContent crash。
*/
const GARDEN_IPAD_CHAT_FALLBACK_MIN_MS = 8000;
const GARDEN_IPAD_CHAT_FALLBACK_MAX_MS = 14000;

const GARDEN_AFTER_CHAT_IDLE_MIN_MS = 600;
const GARDEN_AFTER_CHAT_IDLE_MAX_MS = 1400;

const GARDEN_CHAT_APPROACH_MAX_PATH_DISTANCE = 2200;
const GARDEN_CHAT_APPROACH_TIMEOUT_MS = 30000;

function randomIntBetween(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);

  return min + Math.floor(Math.random() * (max - min + 1));
}

// 散步中自然停下聊天，只允許在前景安全區發生
const GARDEN_NATURAL_CHAT_AREAS = [
  {
    name: "front",
    zone: "ground",
    xMin: 220,
    xMax: 970,
    yMin: 1450,
    yMax: 1840,
    baseMinDistance: 320,
    baseMaxDistance: 520,
    maxYDiff: 100,
  },

  {
    name: "far",
    zone: "far",
    xMin: 300,
    xMax: 790,
    yMin: 535,
    yMax: 590,
    baseMinDistance: 320,
    baseMaxDistance: 520,
    maxYDiff: 70,
  },

  {
    name: "corridor",
    zone: "ground",
    xMin: 600,
    xMax: 1010,
    yMin: 690,
    yMax: 820,
    baseMinDistance: 320,
    baseMaxDistance: 520,
    maxYDiff: 95,
  },
];

const GARDEN_NATURAL_CHAT_MIN_DISTANCE = 320;
const GARDEN_NATURAL_CHAT_MAX_DISTANCE = 500;
const GARDEN_NATURAL_CHAT_MAX_Y_DIFF = 90;

// 進場直接聊天用的固定安全點位
const GARDEN_CHAT_SPOTS = [
  {
    name: "front-center",
    chifuyu: { x: 420, y: 1720, direction: 1 },
    chinatsu: { x: 800, y: 1720, direction: -1 },
  },


  {
    name: "front-center",
    chifuyu: { x: 800, y: 1720, direction: -1 },
    chinatsu: { x: 420, y: 1720, direction: 1 },
  },


   {
    name: "bottom-center",
    chifuyu: { x: 790, y: 1810, direction: -1 },
    chinatsu: { x: 390, y: 1810, direction: 1 },
  },

 // 遠景中央 A
{
  name: "far-center-a",
  chifuyu: { x: 500, y: 560, direction: 1 },
  chinatsu: { x: 730, y: 560, direction: -1 },
},

// 遠景中央 B：左右交換
{
  name: "far-center-b",
  chifuyu: { x: 730, y: 560, direction: -1 },
  chinatsu: { x: 500, y: 560, direction: 1 },
},

// 遠景右側
{
  name: "far-right",
  chifuyu: { x: 780, y: 540, direction: -1 },
  chinatsu: { x: 560, y: 540, direction: 1 },
},


// 走廊：比上一版稍微往下
{
  name: "corridor-right",
  chifuyu: { x: 550, y: 740, direction: 1 },
  chinatsu: { x: 800, y: 740, direction: -1 },
},

{
  name: "upper-right",
  chifuyu: { x: 780, y: 700, direction: -1 },
  chinatsu: { x: 520, y: 700, direction: 1 },
},

// 枯山水後方
{
  name: "karesansui-back",
  chifuyu: {
    x: 460,
    y: 1040,
    direction: 1,
  },
  chinatsu: {
    x: 780,
    y: 1040,
    direction: -1,
  },
},

// 枯山水後方
{
  name: "karesansui-back",
  chifuyu: {
    x: 780,
    y: 1040,
    direction: -1,
  },
  chinatsu: {
    x: 460,
    y: 1040,
    direction: 1,
  },
},


];

const gardenChatState = {
  mode: "wander",

  targetLoops: 0,
  shouldEndOnNextFrame: false,

  chifuyuTalkReadyToEnd: false,
  chinatsuTalkReadyToEnd: false,

  /*
    iPad 不播放真正 Talk 動畫時，
    改由這個時間決定聊天結束。
  */
  ipadFallbackUntil: 0,

  approachSpot: null,
  approachStartedAt: 0,

  nextCheckTime: 0,
  currentSpotName: "",
};


function resetGardenTalkEndFlags() {
  gardenChatState.shouldEndOnNextFrame = false;
  gardenChatState.chifuyuTalkReadyToEnd = false;
  gardenChatState.chinatsuTalkReadyToEnd = false;
}

function isGardenTalkReadyToEndForCharacter(characterName) {
  if (characterName === "chifuyu") {
    return gardenChatState.chifuyuTalkReadyToEnd;
  }

  if (characterName === "chinatsu") {
    return gardenChatState.chinatsuTalkReadyToEnd;
  }

  return false;
}

function markGardenTalkReadyToEnd(characterName) {
  if (characterName === "chifuyu") {
    gardenChatState.chifuyuTalkReadyToEnd = true;
  }

  if (characterName === "chinatsu") {
    gardenChatState.chinatsuTalkReadyToEnd = true;
  }
}

function areBothGardenTalkAnimationsReadyToEnd() {
  return (
    gardenChatState.chifuyuTalkReadyToEnd &&
    gardenChatState.chinatsuTalkReadyToEnd
  );
}




function isGardenChatting() {
  return gardenChatState.mode === "chat";
}

function isGardenChatBlockingWalk() {
  return (
    gardenChatState.mode === "chat" ||
    gardenChatState.mode ===
      "chatPreparing" ||
    gardenChatState.mode ===
      "approachChat"
  );
}

function scheduleNextGardenChatCheck(now = performance.now()) {
  gardenChatState.nextCheckTime =
    now + randomBetween(GARDEN_CHAT_CHECK_MIN_MS, GARDEN_CHAT_CHECK_MAX_MS);
}

function clearGardenChatState() {
  gardenChatState.mode = "wander";
  gardenChatState.targetLoops = 0;
  gardenChatState.ipadFallbackUntil = 0;
  gardenChatState.shouldEndOnNextFrame = false;

  gardenChatState.approachSpot = null;
  gardenChatState.approachStartedAt = 0;

  gardenChatState.currentSpotName = "";

  resetGardenTalkEndFlags();

  chifuyuWalkTestState.path = [];
  chifuyuWalkTestState.isMoving = false;

  chinatsuWalkTestState.path = [];
  chinatsuWalkTestState.isMoving = false;

  scheduleNextGardenChatCheck(performance.now());
}

function getGardenNaturalChatAreaForPointInScene(
  sceneId,
  p
) {
  if (
    !sceneId ||
    !p
  ) {
    return null;
  }


  /*
    目前 Natural Chat Area
    只正式設定過 Courtyard。

    Moon Bridge 已經有自己的
    fixed chatSpots，
    所以那邊暫時走 Approach Chat。
  */
  if (
    sceneId !==
    "courtyard"
  ) {
    return null;
  }


  const zone =
    getGardenMoveZoneAtInScene(
      sceneId,
      p.x,
      p.y
    );


  for (
    const area of
    GARDEN_NATURAL_CHAT_AREAS
  ) {
    if (
      area.zone &&
      area.zone !== zone
    ) {
      continue;
    }


    if (
      p.x >= area.xMin &&
      p.x <= area.xMax &&
      p.y >= area.yMin &&
      p.y <= area.yMax
    ) {
      return area;
    }
  }


  return null;
}


function getGardenNaturalChatAreaForPoint(
  p
) {
  return getGardenNaturalChatAreaForPointInScene(
    getGardenSharedCharacterSceneId(),
    p
  );
}

function isPointInsideNaturalChatArea(p) {
  return !!getGardenNaturalChatAreaForPoint(p);
}

function isGardenChatSpotValidInScene(
  sceneId,
  spot
) {
  if (
    !sceneId ||
    !spot ||
    !spot.chifuyu ||
    !spot.chinatsu
  ) {
    return false;
  }


  if (
    !isGardenWalkablePointInScene(
      sceneId,
      spot.chifuyu.x,
      spot.chifuyu.y
    )
  ) {
    return false;
  }


  if (
    !isGardenWalkablePointInScene(
      sceneId,
      spot.chinatsu.x,
      spot.chinatsu.y
    )
  ) {
    return false;
  }


  if (
    !isGardenChatDistanceValid(
      spot.chifuyu,
      spot.chinatsu,
      {
        baseMinDistance:
          spot.baseMinDistance ??
          320,

        baseMaxDistance:
          spot.baseMaxDistance ??
          520,

        maxYDiff:
          spot.maxYDiff ??
          110,

        distanceMultiplier:
          spot.distanceMultiplier ??
          1,
      }
    )
  ) {
    return false;
  }


  return true;
}


/*
  舊名稱保留作 wrapper。

  但 Chat 正式邏輯之後
  都應該傳明確 sceneId。
*/
function isGardenChatSpotValid(
  spot
) {
  const sceneId =
    getGardenSharedCharacterSceneId();

  if (!sceneId) {
    return false;
  }

  return isGardenChatSpotValidInScene(
    sceneId,
    spot
  );
}

function pickRandomGardenChatSpot() {
  const validSpots = GARDEN_CHAT_SPOTS.filter(isGardenChatSpotValid);

  if (validSpots.length === 0) {
    return null;
  }

  return validSpots[Math.floor(Math.random() * validSpots.length)];
}

function buildChifuyuChatArrivalPath(
  start,
  target
) {
  /*
    聊天目前仍然只會在
    角色所在場景被玩家觀看時啟動。

    但尋路本身已經改成 scene-aware，
    所以明確使用千冬自己的 sceneId。
  */
  const sceneId =
    gardenCharacterWorldState
      .chifuyu.sceneId;

  if (!sceneId) {
    return null;
  }


  /*
    先只用便宜的幾何檢查找前置點。
    不要每試一個距離就跑一次完整尋路。
  */
  const preferredDistances = [
    70,
    60,
    50,
    40,
    30,
    20,
    12,
  ];

  let stagingPoint = null;


  for (
    const distance of
    preferredDistances
  ) {
    const candidate = {
      x:
        target.x -
        target.direction *
          distance,

      y:
        target.y,
    };


    /*
      使用角色自己的場景判斷。
    */
    if (
      !isGardenWalkablePointInScene(
        sceneId,
        candidate.x,
        candidate.y
      )
    ) {
      continue;
    }


    /*
      確認最後一小段
      可以直接走進聊天位置。
    */
    if (
      !isGardenSegmentWalkableInScene(
        sceneId,
        candidate,
        target
      )
    ) {
      continue;
    }


    stagingPoint =
      candidate;

    break;
  }


  /*
    找到前置點後，
    才真正尋路一次。
  */
  if (
    stagingPoint
  ) {
    const pathToStaging =
      findGardenPath(
        start,
        stagingPoint,
        sceneId
      );


    if (
      pathToStaging
    ) {
      return [
        ...pathToStaging,

        {
          x: target.x,
          y: target.y,
        },
      ];
    }
  }


  /*
    前置點真的走不到時，
    最多再做一次普通尋路當 fallback。
  */
  return findGardenPath(
    start,
    target,
    sceneId
  );
}



function getGardenChatApproachPlanForSpot(
  spot,
  sceneId
) {
  if (
    !isGardenChatSpotValidInScene(
      sceneId,
      spot
    )
  ) {
    return null;
  }


  const chifuyuStart = {
    x:
      chifuyuWalkTestState.x,

    y:
      chifuyuWalkTestState.y,
  };


  const chinatsuStart = {
    x:
      chinatsuWalkTestState.x,

    y:
      chinatsuWalkTestState.y,
  };


  /*
    千冬的 arrival path
    本身已經讀角色自己的 sceneId。
  */
  const chifuyuPath =
    buildChifuyuChatArrivalPath(
      chifuyuStart,
      spot.chifuyu
    );


  /*
    千夏這裡明確使用
    Shared Character Scene。
  */
  const chinatsuPath =
    findGardenPath(
      chinatsuStart,
      spot.chinatsu,
      sceneId
    );


  if (
    !chifuyuPath ||
    !chinatsuPath
  ) {
    return null;
  }


  const chifuyuDistance =
    getGardenPathDistance(
      chifuyuStart,
      chifuyuPath
    );


  const chinatsuDistance =
    getGardenPathDistance(
      chinatsuStart,
      chinatsuPath
    );


  if (
    chifuyuDistance >
    GARDEN_CHAT_APPROACH_MAX_PATH_DISTANCE
  ) {
    return null;
  }


  if (
    chinatsuDistance >
    GARDEN_CHAT_APPROACH_MAX_PATH_DISTANCE
  ) {
    return null;
  }


  return {
    spot,

    sceneId,

    chifuyuPath,
    chinatsuPath,

    totalDistance:
      chifuyuDistance +
      chinatsuDistance,
  };
}

function getGardenChatSpotAreaNameInScene(
  sceneId,
  spot
) {
  if (
    !sceneId ||
    !spot ||
    !spot.chifuyu ||
    !spot.chinatsu
  ) {
    return "front";
  }


  const chifuyuZone =
    getGardenMoveZoneAtInScene(
      sceneId,
      spot.chifuyu.x,
      spot.chifuyu.y
    );


  const chinatsuZone =
    getGardenMoveZoneAtInScene(
      sceneId,
      spot.chinatsu.x,
      spot.chinatsu.y
    );


  if (
    chifuyuZone === "far" &&
    chinatsuZone === "far"
  ) {
    return "far";
  }


  const avgY =
    (
      spot.chifuyu.y +
      spot.chinatsu.y
    ) / 2;


  if (
    chifuyuZone === "ground" &&
    chinatsuZone === "ground" &&
    avgY < 900
  ) {
    return "corridor";
  }


  return "front";
}


function getGardenChatSpotAreaName(
  spot
) {
  const sceneId =
    getGardenSharedCharacterSceneId();

  return getGardenChatSpotAreaNameInScene(
    sceneId,
    spot
  );
}

function getGardenChatSpotRoughDistance(spot) {
  const chifuyuDx =
    spot.chifuyu.x - chifuyuWalkTestState.x;

  const chifuyuDy =
    spot.chifuyu.y - chifuyuWalkTestState.y;

  const chinatsuDx =
    spot.chinatsu.x - chinatsuWalkTestState.x;

  const chinatsuDy =
    spot.chinatsu.y - chinatsuWalkTestState.y;

  const chifuyuDist =
    Math.sqrt(
      chifuyuDx * chifuyuDx +
      chifuyuDy * chifuyuDy
    );

  const chinatsuDist =
    Math.sqrt(
      chinatsuDx * chinatsuDx +
      chinatsuDy * chinatsuDy
    );

  return chifuyuDist + chinatsuDist;
}

function getGardenChatSpotPickWeight(
  spot,
  sceneId
) {
  const roughDistance =
    getGardenChatSpotRoughDistance(
      spot
    );


  const distanceWeight =
    1 /
    (
      1 +
      roughDistance / 900
    );


  const area =
    getGardenChatSpotAreaNameInScene(
      sceneId,
      spot
    );


  let areaWeight = 1;


  if (
    area === "far"
  ) {
    areaWeight = 1.25;

  } else if (
    area === "corridor"
  ) {
    areaWeight = 1.1;
  }


  return (
    distanceWeight *
    areaWeight
  );
}

function pickWeightedGardenChatSpot(
  spots,
  sceneId
) {
  if (
    !spots ||
    spots.length === 0
  ) {
    return null;
  }


  let totalWeight = 0;


  const weighted =
    spots.map((spot) => {
      const weight =
        Math.max(
          0.001,
          getGardenChatSpotPickWeight(
            spot,
            sceneId
          )
        );


      totalWeight +=
        weight;


      return {
        spot,
        weight,
      };
    });


  let roll =
    Math.random() *
    totalWeight;


  for (
    const item of weighted
  ) {
    roll -= item.weight;


    if (
      roll <= 0
    ) {
      return item.spot;
    }
  }


  return weighted[
    weighted.length - 1
  ].spot;
}

function pickGardenChatApproachPlan() {
  /*
    Chat 不再看 Player View。

    直接詢問兩個角色
    真正共同所在的場景。
  */
  const sceneId =
    getGardenSharedCharacterSceneId();


  if (!sceneId) {
    return null;
  }


  const scene =
    getGardenSceneById(
      sceneId
    );


  if (!scene) {
    return null;
  }


  const chatSpots =
    scene.chatSpots || [];


  let remainingSpots =
    chatSpots.filter(
      (spot) =>
        isGardenChatSpotValidInScene(
          sceneId,
          spot
        )
    );


  if (
    remainingSpots.length ===
    0
  ) {
    return null;
  }


  const maxAttempts =
    Math.min(
      3,
      remainingSpots.length
    );


  for (
    let attempt = 0;
    attempt < maxAttempts;
    attempt++
  ) {
    const spot =
      pickWeightedGardenChatSpot(
        remainingSpots,
        sceneId
      );


    if (!spot) {
      break;
    }


    const plan =
      getGardenChatApproachPlanForSpot(
        spot,
        sceneId
      );


    if (plan) {
      return plan;
    }


    remainingSpots =
      remainingSpots.filter(
        (candidate) =>
          candidate !== spot
      );
  }


  return null;
}

function startGardenChatApproach(now = performance.now()) {
  if (gardenChatState.mode !== "wander") return false;

  const plan = pickGardenChatApproachPlan();

  if (!plan) {
    console.warn("[Garden Chat] no valid approach plan", {
      chifuyu: {
        x: Math.round(chifuyuWalkTestState.x),
        y: Math.round(chifuyuWalkTestState.y),
        moving: chifuyuWalkTestState.isMoving,
      },
      chinatsu: {
        x: Math.round(chinatsuWalkTestState.x),
        y: Math.round(chinatsuWalkTestState.y),
        moving: chinatsuWalkTestState.isMoving,
      },
    });

    return false;
  }

  gardenChatState.mode = "approachChat";
gardenChatState.approachSpot = plan.spot;
gardenChatState.approachStartedAt = now;
gardenChatState.currentSpotName = plan.spot.name || "approach";


setGardenPairActivity(
  GARDEN_CHARACTER_ACTIVITY
    .CHAT,
  {
    phase: "approach",

    sceneId:
      getGardenSharedCharacterSceneId(),
  }
);


resetGardenTalkEndFlags();

  // 中斷原本自由散步，改走向聊天點
  chifuyuWalkTestState.path = [];
  chifuyuWalkTestState.isMoving = false;

  chinatsuWalkTestState.path = [];
  chinatsuWalkTestState.isMoving = false;

  chifuyuAutoWalkState.wasMoving = false;
  chinatsuAutoWalkState.wasMoving = false;

  setChifuyuMovePath(plan.chifuyuPath);
  setChinatsuMovePath(plan.chinatsuPath);

  console.log("[Garden Chat] approach started:", {
    spot: plan.spot.name,
    totalDistance: Math.round(plan.totalDistance),
  });

  return true;
}

window.testGardenChatApproach = function () {
  return startGardenChatApproach(performance.now());
};

function cancelGardenChatApproach(now = performance.now()) {
  gardenChatState.mode = "wander";


  setGardenPairActivity(
    GARDEN_CHARACTER_ACTIVITY
      .WANDER
  );


  gardenChatState.approachSpot = null;
  gardenChatState.approachStartedAt = 0;
  gardenChatState.currentSpotName = "";

  chifuyuWalkTestState.path = [];
  chifuyuWalkTestState.isMoving = false;

  chinatsuWalkTestState.path = [];
  chinatsuWalkTestState.isMoving = false;

  resetGardenTalkEndFlags();
  scheduleNextGardenChatCheck(now);
}

function updateGardenChatApproach(now = performance.now()) {
  if (gardenChatState.mode !== "approachChat") return false;

  if (
    now - gardenChatState.approachStartedAt >
    GARDEN_CHAT_APPROACH_TIMEOUT_MS
  ) {
    cancelGardenChatApproach(now);
    return false;
  }

  // 至少還有一人在走，就繼續 approach
  if (chifuyuWalkTestState.isMoving) return false;
  if (chinatsuWalkTestState.isMoving) return false;

  const spot = gardenChatState.approachSpot;

  if (!spot) {
    cancelGardenChatApproach(now);
    return false;
  }

  /*
    重要：
    不要再重新設定 x / y。

    角色的 path 最後一點本來就是聊天座標，
    updateWalkPosition() 抵達時已經精確落在 target。
    這裡直接從目前位置切換聊天即可，
    避免 walk → talk 時發生微小順移。
  */

  chifuyuWalkTestState.path = [];
  chifuyuWalkTestState.isMoving = false;

  chinatsuWalkTestState.path = [];
  chinatsuWalkTestState.isMoving = false;

  gardenChatState.approachSpot = null;
  gardenChatState.approachStartedAt = 0;

  const started = startGardenChat(now, null);

  if (!started) {
    cancelGardenChatApproach(now);
    return false;
  }

  gardenChatState.currentSpotName = spot.name || "approach";

  return true;
}

function faceGardenCharactersToEachOther() {
  if (chifuyuWalkTestState.x <= chinatsuWalkTestState.x) {
    chifuyuWalkTestState.direction = 1;
    chinatsuWalkTestState.direction = -1;
  } else {
    chifuyuWalkTestState.direction = -1;
    chinatsuWalkTestState.direction = 1;
  }
}

function applyGardenChatSpot(spot) {
  if (!spot) return false;

  chifuyuWalkTestState.x = spot.chifuyu.x;
  chifuyuWalkTestState.y = spot.chifuyu.y;
  chifuyuWalkTestState.direction = spot.chifuyu.direction;
  chifuyuWalkTestState.path = [];
  chifuyuWalkTestState.isMoving = false;

  chinatsuWalkTestState.x = spot.chinatsu.x;
  chinatsuWalkTestState.y = spot.chinatsu.y;
  chinatsuWalkTestState.direction = spot.chinatsu.direction;
  chinatsuWalkTestState.path = [];
  chinatsuWalkTestState.isMoving = false;

  renderChifuyuWalkTest();
  renderChinatsuWalkTest();

  return true;
}

    /* =========================
   Garden Night Lighting
========================= */

/*
  左下燈籠的「光源中心」。

  這不是圖片本身的位置，
  而是庭院 1080×1920 logical 座標中的
  發光中心。

  這組先作為測試值，
  等實際畫面確認後再微調。
*/
const GARDEN_LANTERN_LIGHTS = [
  {
    x: 170,
    y: 1660,
    radius: 600,
  },

  {
    x: 910,
    y: 1660,
    radius: 600,
  },
];


/*
  避免每一 frame 都重寫完全相同的 filter。
*/
const gardenCharacterLightCache = {
  chifuyu: null,
  chinatsu: null,
};


function clamp01(value) {
  return Math.max(
    0,
    Math.min(1, value)
  );
}


function smoothGardenLight(value) {
  const t = clamp01(value);

  /*
    smoothstep：
    比單純線性變化自然，
    不會一進光照範圍就突然變色。
  */
  return (
    t * t * (3 - 2 * t)
  );
}

function getPointToSegmentDistance(
  px,
  py,
  ax,
  ay,
  bx,
  by
) {
  const abx = bx - ax;
  const aby = by - ay;

  const apx = px - ax;
  const apy = py - ay;

  const abLengthSq =
    abx * abx +
    aby * aby;

  if (abLengthSq === 0) {
    return Math.hypot(
      px - ax,
      py - ay
    );
  }

  let t =
    (
      apx * abx +
      apy * aby
    ) /
    abLengthSq;

  t = clamp01(t);

  const closestX =
    ax + abx * t;

  const closestY =
    ay + aby * t;

  return Math.hypot(
    px - closestX,
    py - closestY
  );
}


function getDistanceToGardenPolygonEdge(
  x,
  y,
  points
) {
  let minDistance = Infinity;

  for (
    let i = 0;
    i < points.length;
    i++
  ) {
    const a = points[i];

    const b =
      points[
        (i + 1) %
        points.length
      ];

    const distance =
      getPointToSegmentDistance(
        x,
        y,
        a.x,
        a.y,
        b.x,
        b.y
      );

    if (
      distance <
      minDistance
    ) {
      minDistance =
        distance;
    }
  }

  return minDistance;
}


function getGardenFarDarknessInScene(
  sceneId,
  x,
  y
) {
  if (!sceneId) {
    return 0;
  }


  const zone =
    getGardenMoveZoneAtInScene(
      sceneId,
      x,
      y
    );


  if (zone !== "far") {
    return 0;
  }


  const scene =
    getGardenSceneById(
      sceneId
    );


  const farArea =
    scene?.walkAreas?.far?.[0];


  if (!farArea) {
    return 0;
  }


  const distance =
    getDistanceToGardenPolygonEdge(
      x,
      y,
      farArea.points
    );


  const raw =
    clamp01(
      distance / 140
    );


  return smoothGardenLight(
    raw
  );
}

/*
  舊版 View Scene wrapper。
  給尚未 scene-aware 的舊程式使用。
*/
function getGardenFarDarkness(
  x,
  y
) {
  return getGardenFarDarknessInScene(
    gardenViewSceneId,
    x,
    y
  );
}


function getGardenLanternInfluenceInScene(
  sceneId,
  x,
  y
) {
  const scene =
    getGardenSceneById(
      sceneId
    );

  if (!scene) {
    return 0;
  }

  const lanternLights =
    scene.lanternLights || [];

  // ↓↓↓
  // 從這裡開始，
  // 你目前原本的整段函式內容全部保留。


  let strongestInfluence = 0;


  /*
    =========================
    燈籠本身的圓形光源
    =========================
  */
  for (
    const light of
    lanternLights
  ) {
    const dx =
      x - light.x;

    const dy =
      y - light.y;

    const distance =
      Math.hypot(
        dx,
        dy
      );

    const raw =
      1 -
      distance /
        light.radius;

    const influence =
      smoothGardenLight(
        clamp01(raw)
      );


    if (
      influence >
      strongestInfluence
    ) {
      strongestInfluence =
        influence;
    }
  }


  /*
    =========================
    前兩盞燈之間的橫向暖光帶
    =========================

    courtyard 目前有左右兩盞燈，
    所以沿用原本效果。

    未來如果某個場景沒有兩盞燈，
    這段會自動跳過。
  */
  const leftLight =
    lanternLights[0];

  const rightLight =
    lanternLights[1];


  if (
    leftLight &&
    rightLight
  ) {
    const minX =
      Math.min(
        leftLight.x,
        rightLight.x
      );

    const maxX =
      Math.max(
        leftLight.x,
        rightLight.x
      );


    const bridgeY =
      (
        leftLight.y +
        rightLight.y
      ) / 2;


    /*
      只有兩盞燈之間
      才有這條補光。
    */
    if (
      x >= minX &&
      x <= maxX
    ) {
      const verticalDistance =
        Math.abs(
          y - bridgeY
        );


      const bridgeRadius =
        720;


      const rawBridge =
        1 -
        verticalDistance /
          bridgeRadius;


      const bridgeInfluence =
        smoothGardenLight(
          clamp01(rawBridge)
        ) * 0.85;


      strongestInfluence =
        Math.max(
          strongestInfluence,
          bridgeInfluence
        );
    }
  }


  return strongestInfluence;

}

function getGardenLanternInfluence(
  x,
  y
) {
  return getGardenLanternInfluenceInScene(
    gardenViewSceneId,
    x,
    y
  );
}


function updateGardenCharacterNightLighting(
  character,
  spriteEl,
  x,
  y,
  sceneId = null
) {
  if (!spriteEl) return;


  const characterSceneId =
    sceneId ||
    getGardenCharacterSceneId(
      character
    );


  if (!characterSceneId) {
    return;
  }


  /*
    =========================
    Day / Night
    =========================
  */
  const isNight =
    document.body.classList.contains(
      "night-mode"
    );


  /*
    白天：
    清除所有夜間角色 filter。
  */
  if (!isNight) {
    if (
      gardenCharacterLightCache[
        character
      ] !== "day"
    ) {
      spriteEl.style.removeProperty(
        "--garden-char-brightness"
      );

      spriteEl.style.removeProperty(
        "--garden-char-saturate"
      );

      spriteEl.style.removeProperty(
        "--garden-char-sepia"
      );

      spriteEl.style.removeProperty(
        "--garden-char-hue"
      );


      gardenCharacterLightCache[
        character
      ] = "day";
    }


    return;
  }


  /*
    =========================
    Night Lighting
    =========================
  */

  const influence =
    getGardenLanternInfluenceInScene(
      characterSceneId,
      x,
      y
    );


  const level =
    Math.round(
      influence * 50
    ) / 50;


  const depthLayer =
    getGardenDepthLayerByPositionInScene(
      characterSceneId,
      x,
      y
    );


  const farDarknessRaw =
    getGardenFarDarknessInScene(
      characterSceneId,
      x,
      y
    );


  const farDarkness =
    Math.round(
      farDarknessRaw * 50
    ) / 50;


  /*
    Character Scene
    必須是 cache key 的一部分。

    這樣角色從 courtyard
    去 moonBridge 時一定會重新計算。
  */
  const cacheKey =
    `${characterSceneId}:${depthLayer}:${level}:${farDarkness}`;


  if (
    gardenCharacterLightCache[
      character
    ] === cacheKey
  ) {
    return;
  }


  gardenCharacterLightCache[
    character
  ] = cacheKey;


  /*
    夜間基礎亮度
    + 燈籠暖光
    + 遠景暗度
  */
  let brightness =
    0.65 +
    level * 0.18 -
    farDarkness * 0.28;


  let saturate =
    1.08 +
    level * 0.42;


  let sepia =
    level * 0.3;


  let hue =
    level * -4;


  /*
    =========================
    Moon Bridge Night Tone
    =========================
  */
  if (
    characterSceneId ===
    "moonBridge"
  ) {
    brightness *= 1.18;
  }


  spriteEl.style.setProperty(
    "--garden-char-brightness",
    brightness.toFixed(3)
  );


  spriteEl.style.setProperty(
    "--garden-char-saturate",
    saturate.toFixed(3)
  );


  spriteEl.style.setProperty(
    "--garden-char-sepia",
    sepia.toFixed(3)
  );


  spriteEl.style.setProperty(
    "--garden-char-hue",
    `${hue.toFixed(1)}deg`
  );
}

function startGardenChat(
  now = performance.now(),
  spot = null
) {
  if (gardenChatState.mode === "chat") {
    return false;
  }

  if (spot) {
    const applied =
      applyGardenChatSpot(spot);

    if (!applied) return false;

    gardenChatState.currentSpotName =
      spot.name || "";
  } else {
    faceGardenCharactersToEachOther();

    gardenChatState.currentSpotName =
      "natural";
  }

  gardenChatState.mode =
  "chatPreparing";


setGardenPairActivity(
  GARDEN_CHARACTER_ACTIVITY
    .CHAT,
  {
    phase: "talk",

    sceneId:
      getGardenSharedCharacterSceneId(),
  }
);


resetGardenTalkEndFlags();

  chifuyuWalkTestState.path = [];
  chifuyuWalkTestState.isMoving = false;

  chinatsuWalkTestState.path = [];
  chinatsuWalkTestState.isMoving = false;


  /*
    =========================
    iPadOS Safe Chat
    =========================

    不碰原尺寸 Talk spritesheet。

    聊天邏輯、站位、面向全部保留，
    視覺暫時使用 Idle 動畫。
  */
 




  /*
    =========================
    其他裝置
    =========================
  */

  gardenChatState.ipadFallbackUntil = 0;

  gardenChatState.targetLoops =
    randomIntBetween(
      GARDEN_CHAT_LOOP_MIN,
      GARDEN_CHAT_LOOP_MAX
    );

  /*
  Talk 不在這裡立即切換。

  先同時要求兩張 Talk sheet warmup。
  等兩邊都真正準備好後，
  updateGardenChatSystem()
  再讓兩人同一幀開始 Talk。
*/
requestGardenAnimationWarmup(
  "chifuyu",
  "talk",
  CHIFUYU_ANIMS.talk
);

requestGardenAnimationWarmup(
  "chinatsu",
  "talk",
  CHINATSU_ANIMS.talk
);

renderChifuyuWalkTest();
renderChinatsuWalkTest();

return true;
}

function startGardenChatAtRandomSpot(now = performance.now()) {
  const spot = pickRandomGardenChatSpot();

  if (!spot) {
    return false;
  }

  return startGardenChat(now, spot);
}

function endGardenChat(now = performance.now()) {
  gardenChatState.mode = "wander";


  setGardenPairActivity(
    GARDEN_CHARACTER_ACTIVITY
      .WANDER
  );


  gardenChatState.targetLoops = 0;

gardenChatState.approachSpot = null;
gardenChatState.approachStartedAt = 0;

gardenChatState.currentSpotName = "";

  resetGardenTalkEndFlags();

  chifuyuWalkTestState.path = [];
  chifuyuWalkTestState.isMoving = false;

  chinatsuWalkTestState.path = [];
  chinatsuWalkTestState.isMoving = false;

  setChifuyuAnimationMode("idle", true);
  setChinatsuAnimationMode("idle", true);

  chifuyuAutoWalkState.wasMoving = false;
  chinatsuAutoWalkState.wasMoving = false;

  chifuyuAutoWalkState.nextMoveTime =
    now + randomBetween(GARDEN_AFTER_CHAT_IDLE_MIN_MS, GARDEN_AFTER_CHAT_IDLE_MAX_MS);

  chinatsuAutoWalkState.nextMoveTime =
    now + randomBetween(GARDEN_AFTER_CHAT_IDLE_MIN_MS, GARDEN_AFTER_CHAT_IDLE_MAX_MS);

  scheduleNextGardenChatCheck(now + 9000);
}

function canStartNaturalGardenChat() {
  if (
    gardenChatState.mode !==
    "wander"
  ) {
    return false;
  }


  const sceneId =
    getGardenSharedCharacterSceneId();


  if (!sceneId) {
    return false;
  }


  if (
    chifuyuWalkTestState
      .isMoving
  ) {
    return false;
  }


  if (
    chinatsuWalkTestState
      .isMoving
  ) {
    return false;
  }


  const chifuyuPoint = {
    x:
      chifuyuWalkTestState.x,

    y:
      chifuyuWalkTestState.y,
  };


  const chinatsuPoint = {
    x:
      chinatsuWalkTestState.x,

    y:
      chinatsuWalkTestState.y,
  };


  const chifuyuArea =
    getGardenNaturalChatAreaForPointInScene(
      sceneId,
      chifuyuPoint
    );


  const chinatsuArea =
    getGardenNaturalChatAreaForPointInScene(
      sceneId,
      chinatsuPoint
    );


  if (
    !chifuyuArea ||
    !chinatsuArea
  ) {
    return false;
  }


  if (
    chifuyuArea.name !==
    chinatsuArea.name
  ) {
    return false;
  }


  if (
    !isGardenChatDistanceValid(
      chifuyuPoint,
      chinatsuPoint,
      {
        baseMinDistance:
          chifuyuArea
            .baseMinDistance ??
          GARDEN_NATURAL_CHAT_MIN_DISTANCE,

        baseMaxDistance:
          chifuyuArea
            .baseMaxDistance ??
          GARDEN_NATURAL_CHAT_MAX_DISTANCE,

        maxYDiff:
          chifuyuArea
            .maxYDiff ??
          GARDEN_NATURAL_CHAT_MAX_Y_DIFF,

        distanceMultiplier:
          chifuyuArea
            .distanceMultiplier ??
          1,
      }
    )
  ) {
    return false;
  }


  return true;
}

function tryStartNaturalGardenChat(now = performance.now()) {
  if (gardenChatState.mode !== "wander") return false;
  if (now < gardenChatState.nextCheckTime) return false;

  scheduleNextGardenChatCheck(now);

  if (Math.random() > GARDEN_WANDER_CHAT_CHANCE) {
    return false;
  }

  // 優先：走到附近聊天點再聊天
  if (startGardenChatApproach(now)) {
    return true;
  }

  // 保底：如果剛好已經站在合適位置，就原地自然聊天
  if (canStartNaturalGardenChat()) {
    return startGardenChat(now, null);
  }

  return false;
}

function updateGardenChatSystem(
  now = performance.now()
) {
  if (
    gardenChatState.mode ===
    "approachChat"
  ) {
    updateGardenChatApproach(now);
    return;
  }


/*
  =========================
  Chat Talk Pair Preparation
  =========================

  兩張 Talk sheet 都準備完成後，
  才讓雙方同一個 animation frame
  一起進入 Talk。
*/
if (
  gardenChatState.mode ===
  "chatPreparing"
) {
  const chifuyuReady =
    gardenAnimationWarmupState
      .chifuyuTalk;

  const chinatsuReady =
    gardenAnimationWarmupState
      .chinatsuTalk;

  if (
    !chifuyuReady ||
    !chinatsuReady
  ) {
    /*
      warmup 還沒完成就繼續等。
      兩人此時維持 Idle，
      不會出現一個先講、一個還沒講。
    */
    return;
  }


  gardenChatState.mode = "chat";

  resetGardenTalkEndFlags();

  /*
    同一幀發出 Talk 切換。
  */
  setChifuyuAnimationMode(
    "talk",
    true
  );

  setChinatsuAnimationMode(
    "talk",
    true
  );

  /*
    兩人的 Talk 時鐘歸零。
  */
  chifuyuWalkTestState.frameIndex = 0;
  chifuyuWalkTestState.frameTimer = 0;
  chifuyuWalkTestState.animLoopCount = 0;

  chinatsuWalkTestState.frameIndex = 0;
  chinatsuWalkTestState.frameTimer = 0;
  chinatsuWalkTestState.animLoopCount = 0;

  renderChifuyuWalkTest();
  renderChinatsuWalkTest();

  return;
}



  if (
    gardenChatState.mode ===
    "chat"
  ) {

    /*
      iPad：
      不等待 Talk loop，
      因為根本沒有載入 Talk sheet。
    */
  


    /*
      其他裝置維持原本邏輯。
    */
    if (
      gardenChatState.shouldEndOnNextFrame
    ) {
      endGardenChat(now);
      return;
    }

    if (
      areBothGardenTalkAnimationsReadyToEnd()
    ) {
      gardenChatState.shouldEndOnNextFrame =
        true;

      return;
    }

    return;
  }

  tryStartNaturalGardenChat(now);
}


function planGardenInitialMode() {
  /*
    Garden World 已經存在。

    重新進入只是重新打開 View，
    不再重新抽「初次進場 Chat」。
  */
  if (
    gardenWorldInitialized
  ) {
    gardenPendingInitialMode =
      null;


    if (
      gardenChatState.mode ===
      "chat"
    ) {
      return "chat";
    }


    return "wander";
  }


  /*
    第一次真正建立 Garden World。
  */
  if (
    gardenPendingInitialMode
  ) {
    return gardenPendingInitialMode;
  }


  gardenPendingInitialMode =
    Math.random() <
    GARDEN_INITIAL_CHAT_CHANCE
      ? "chat"
      : "wander";


  return gardenPendingInitialMode;
}




function setupGardenInitialMode(
  now = performance.now()
) {
  clearGardenChatState();

  let startAsChat;

  /*
    iPad：
    使用進門前已經決定好的模式。

    這樣 preload 才能準確知道
    到底只需要 Talk 還是 Idle。
  */
  if (gardenPendingInitialMode) {
  startAsChat =
    gardenPendingInitialMode ===
    "chat";

  gardenPendingInitialMode = null;
} else {
  startAsChat =
    Math.random() <
    GARDEN_INITIAL_CHAT_CHANCE;
}

  if (startAsChat) {
    const started =
      startGardenChatAtRandomSpot(now);

    if (started) {
      return "chat";
    }
  }

  return "wander";
}






function renderChinatsuWalkTest() {
  if (!chinatsuWalkTestWrap) {
    return;
  }


  const sceneId =
    gardenCharacterWorldState
      .chinatsu.sceneId;


  if (
    !sceneId ||
    sceneId !==
      gardenViewSceneId
  ) {
    return;
  }


  const depthLayer =
    getGardenDepthLayerByPositionInScene(
      sceneId,
      chinatsuWalkTestState.x,
      chinatsuWalkTestState.y
    );


  moveChinatsuToDepthLayer(
    depthLayer
  );


  const facingScale =
    chinatsuWalkTestState.direction === 1
      ? 1
      : -1;

  const depthScale = getGardenScaleByY(chinatsuWalkTestState.y);

  chinatsuWalkTestWrap.style.transform =
    `translate3d(${chinatsuWalkTestState.x}px, ${chinatsuWalkTestState.y}px, 0) ` +
    `translate(-50%, -100%) ` +
    `scaleX(${facingScale}) ` +
    `scale(${depthScale})`;

  chinatsuWalkTestWrap.style.zIndex = Math.round(chinatsuWalkTestState.y);

 updateGardenCharacterNightLighting(
  "chinatsu",
  chinatsuWalkTest,
  chinatsuWalkTestState.x,
  chinatsuWalkTestState.y,
  sceneId
);

}


/* =========================
   Chifuyu Auto Walk
   自由散步系統
========================= */

const CHIFUYU_AUTO_WALK_ENABLED = true;

/*
  =========================
  Garden Auto Travel Test
  =========================

  暫時讓角色在自由散步期間，
  偶爾自行決定前往其他場景。

  之後正式 Schedule 完成後，
  可以直接改成 false，
  或整套交給日程系統接管。
*/

const GARDEN_AUTO_TRAVEL_ENABLED =
  true;

/*
  每次角色「準備決定下一個行動」時，
  有 12% 機率嘗試跨場景。

  不是每一幀抽，
  所以不會瘋狂切場景。
*/
const GARDEN_AUTO_TRAVEL_CHANCE =
  0.12;


function getGardenAutoTravelTargets(
  character
) {
  const worldState =
    gardenCharacterWorldState[
      character
    ];


  if (
    !worldState ||
    !worldState.sceneId
  ) {
    return [];
  }


  const fromSceneId =
    worldState.sceneId;


  const scene =
    getGardenSceneById(
      fromSceneId
    );


  if (!scene) {
    return [];
  }


  const exits =
    scene.exits || {};


  const targets =
    Object.values(
      exits
    )
      .map(
        (exit) =>
          exit?.targetSceneId ||
          null
      )
      .filter(Boolean);


  /*
    去掉重複場景，
    並確認正式 Travel Route
    真的存在。
  */
  return [
    ...new Set(targets),
  ].filter(
    (toSceneId) =>
      toSceneId !==
        fromSceneId &&
      !!getGardenCharacterTravelRoute(
        fromSceneId,
        toSceneId
      )
  );
}


function tryStartGardenAutoTravel(
  character
) {
  if (
    !GARDEN_AUTO_TRAVEL_ENABLED
  ) {
    return false;
  }


  const worldState =
    gardenCharacterWorldState[
      character
    ];


  if (!worldState) {
    return false;
  }


  /*
    只有真正處於自由散步狀態
    才可以自己決定旅行。
  */
  if (
    worldState.activity !==
    GARDEN_CHARACTER_ACTIVITY
      .WANDER
  ) {
    return false;
  }


  if (
    worldState.travel
  ) {
    return false;
  }


  /*
    測試階段先限制：
    一次只讓一人自動開始跨場景。

    Console 手動指令仍然可以
    測兩人同時旅行。
  */
  if (
    isAnyGardenCharacterTraveling()
  ) {
    return false;
  }


  /*
    聊天／靠近聊天期間
    不能突然跑去別的場景。
  */
  if (
    gardenChatState.mode !==
    "wander"
  ) {
    return false;
  }


  const targets =
    getGardenAutoTravelTargets(
      character
    );


  if (
    targets.length === 0
  ) {
    return false;
  }


  /*
    真正的低機率判定。
  */
  if (
    Math.random() >=
    GARDEN_AUTO_TRAVEL_CHANCE
  ) {
    return false;
  }


  const toSceneId =
    targets[
      Math.floor(
        Math.random() *
        targets.length
      )
    ];


  const started =
    travelGardenCharacter(
      character,
      toSceneId
    );


  if (started) {
    console.log(
      `[Garden Auto Travel] ${character} decided to travel → ${toSceneId}`
    );
  }


  return started;
}

// 停下來多久後再走下一段
const CHIFUYU_AUTO_IDLE_MIN_MS = 3500;
const CHIFUYU_AUTO_IDLE_MAX_MS = 9000;

// 目標點重抽次數，避免抽到 blocked 或找不到路
const CHIFUYU_AUTO_PICK_RETRY = 40;

// 隨機目標比例
// farChance 越高，千冬越常走去遠景
const CHIFUYU_AUTO_FAR_CHANCE = 0.18;

const chifuyuAutoWalkState = {
  nextMoveTime: 0,
  wasMoving: false,
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function scheduleNextChifuyuAutoMove(now = performance.now()) {
  chifuyuAutoWalkState.nextMoveTime =
    now + randomBetween(CHIFUYU_AUTO_IDLE_MIN_MS, CHIFUYU_AUTO_IDLE_MAX_MS);
}

function getGardenAreaBounds(area) {
  const points = area.points;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  return { minX, maxX, minY, maxY };
}

function pickRandomPointInGardenArea(area) {
  const bounds = getGardenAreaBounds(area);

  for (let i = 0; i < CHIFUYU_AUTO_PICK_RETRY; i++) {
    const x = randomBetween(bounds.minX, bounds.maxX);
    const y = randomBetween(bounds.minY, bounds.maxY);

    if (pointInPolygon(x, y, area.points)) {
      return { x, y };
    }
  }

  return null;
}

function pickRandomGardenWalkTarget(
  sceneId =
    gardenCharacterWorldState
      .chifuyu.sceneId
) {
  if (!sceneId) {
    return null;
  }


  const scene =
    getGardenSceneById(
      sceneId
    );

  if (!scene) {
    return null;
  }


  const autoTargets =
    scene.autoTargets || [];


  const useFar =
    Math.random() <
    CHIFUYU_AUTO_FAR_CHANCE;


  let pool =
    autoTargets.filter(
      (p) => {
        if (useFar) {
          return (
            p.zone === "far"
          );
        }

        return (
          p.zone === "ground"
        );
      }
    );


  pool = pool.filter(
    (p) =>
      isGardenWalkablePointInScene(
        sceneId,
        p.x,
        p.y
      )
  );


  if (
    pool.length === 0
  ) {
    pool =
      autoTargets.filter(
        (p) =>
          isGardenWalkablePointInScene(
            sceneId,
            p.x,
            p.y
          )
      );
  }


  if (
    pool.length === 0
  ) {
    return null;
  }


  const index =
    Math.floor(
      Math.random() *
      pool.length
    );

  const p =
    pool[index];


  return {
    x: p.x,
    y: p.y,
  };
}

function startChifuyuAutoWalkToRandomTarget() {

const sceneId =
  gardenCharacterWorldState
    .chifuyu.sceneId;

if (!sceneId) {
  return false;
}




  const start = {
    x: chifuyuWalkTestState.x,
    y: chifuyuWalkTestState.y,
  };

  for (let i = 0; i < CHIFUYU_AUTO_PICK_RETRY; i++) {
    const target =
  pickRandomGardenWalkTarget(
    sceneId
  );
    if (!target) continue;

    const dx = target.x - start.x;
const dy = target.y - start.y;
const dist = Math.sqrt(dx * dx + dy * dy);

// 避免抽到離現在太近的點，看起來像原地抖動
if (dist < 140) continue;

// 先用直線距離粗略排除太遠目標，避免浪費尋路
if (dist > CHIFUYU_AUTO_WALK_MAX_DISTANCE * 1.15) continue;

   const path =
  findGardenPath(
    start,
    target,
    sceneId
  );
if (!path || path.length === 0) continue;

const pathDistance = getGardenPathDistance(start, path);

// 單次移動太遠就重抽
if (pathDistance > CHIFUYU_AUTO_WALK_MAX_DISTANCE) continue;

if (GARDEN_WALK_DEBUG && typeof drawGardenPathDebug === "function") {
  drawGardenPathDebug(path);
}

setChifuyuMovePath(path);
return true;
}

  return false;
}

function updateChifuyuAutoWalk(now) {
  if (!CHIFUYU_AUTO_WALK_ENABLED) return;

  // 正在移動時，不要打斷目前路線
  if (chifuyuWalkTestState.isMoving) {
    chifuyuAutoWalkState.wasMoving = true;
    return;
  }

  // 剛從移動狀態停下來：安排下一次發呆時間
  if (chifuyuAutoWalkState.wasMoving) {
    chifuyuAutoWalkState.wasMoving = false;
    scheduleNextChifuyuAutoMove(now);
    return;
  }

  // 還沒到下一次移動時間
  if (
  now <
  chifuyuAutoWalkState
    .nextMoveTime
) {
  return;
}


/*
  下一個行動開始前，
  先低機率判斷是否要跨場景。
*/
if (
  tryStartGardenAutoTravel(
    "chifuyu"
  )
) {
  return;
}


const moved =
  startChifuyuAutoWalkToRandomTarget();

  // 無論成功或失敗，都先安排下一次，避免每一幀狂抽
  if (!moved) {
    scheduleNextChifuyuAutoMove(now);
  }
}

function resetChifuyuAutoWalk() {
  chifuyuAutoWalkState.wasMoving = false;
  scheduleNextChifuyuAutoMove(performance.now());
}



function handleGardenPointerDown(e) {
  if (e.target.closest("button")) return;

  const point = getGardenLocalPointFromEvent(e);
  if (!point) return;

  const targetZone = getGardenMoveZoneAt(point.x, point.y);


  drawGardenClickDebugPoint(point.x, point.y, targetZone);

  if (targetZone === "blocked") {
    return;
  }

  const start = {
    x: chifuyuWalkTestState.x,
    y: chifuyuWalkTestState.y,
  };

  const path = findGardenPath(start, point);

  if (!path || path.length === 0) {
    return;
  }


  drawGardenPathDebug(path);
  setChifuyuMovePath(path);
}

function drawGardenClickDebugPoint(x, y, zone) {
  if (!GARDEN_WALK_DEBUG) return;

  const canvas = document.getElementById("gardenWalkDebugCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 先重畫可走區
  drawGardenWalkDebug();

  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);

  if (zone === "far") {
    ctx.fillStyle = "rgba(255, 230, 0, 1)";
  } else if (zone === "ground") {
    ctx.fillStyle = "rgba(0, 255, 0, 1)";
  } else {
    ctx.fillStyle = "rgba(255, 0, 0, 1)";
  }

  ctx.fill();

  ctx.font = "26px sans-serif";
  ctx.fillStyle = "white";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 4;

  const text = `${Math.round(x)}, ${Math.round(y)} / ${zone}`;
  ctx.strokeText(text, x + 18, y - 18);
  ctx.fillText(text, x + 18, y - 18);
}

function updateChifuyuWalkPosition(deltaMs) {
  const state = chifuyuWalkTestState;

  if (!state.path || state.path.length === 0) {
    state.isMoving = false;
    return;
  }

  state.isMoving = true;


  const target = state.path[0];

  const dx = target.x - state.x;
  const dy = target.y - state.y;

  const dist = Math.sqrt(dx * dx + dy * dy);

  const step =
    state.moveSpeed * (deltaMs / 1000);

  // 朝向永遠依照實際移動方向
  if (Math.abs(dx) > 2) {
    state.direction = dx > 0 ? 1 : -1;
  }

  if (dist <= step || dist < 0.001) {
    state.x = target.x;
    state.y = target.y;

    state.path.shift();

    if (state.path.length === 0) {
      state.isMoving = false;
    }

    return;
  }

  state.x += (dx / dist) * step;
  state.y += (dy / dist) * step;
}


function renderChifuyuWalkTest() {
  if (!chifuyuWalkTestWrap) {
    return;
  }


  const sceneId =
    gardenCharacterWorldState
      .chifuyu.sceneId;


  /*
    World State 照樣更新，
    但角色不在玩家目前看的場景時，
    完全不做 DOM render。
  */
  if (
    !sceneId ||
    sceneId !==
      gardenViewSceneId
  ) {
    return;
  }


  const depthLayer =
    getGardenDepthLayerByPositionInScene(
      sceneId,
      chifuyuWalkTestState.x,
      chifuyuWalkTestState.y
    );

  moveChifuyuToDepthLayer(depthLayer);

  const facingScale =
    chifuyuWalkTestState.direction === 1
      ? -1
      : 1;

  const depthScale =
    getGardenScaleByY(chifuyuWalkTestState.y);

  /*
    角色本體 + 陰影一起翻面。
    這樣兩者永遠維持原本的相對位置。
  */
  chifuyuWalkTestWrap.style.transform =
    `translate3d(${chifuyuWalkTestState.x}px, ${chifuyuWalkTestState.y}px, 0) ` +
    `translate(-50%, -100%) ` +
    `scaleX(${facingScale}) ` +
    `scale(${depthScale})`;

  /*
    清除上一版曾直接寫在角色 spritesheet 上的 transform。
    這兩行要保留，否則瀏覽器 inline style 可能還殘留。
  */
  if (chifuyuWalkTest) {
    chifuyuWalkTest.style.transform = "";
    chifuyuWalkTest.style.transformOrigin = "";
  }

  chifuyuWalkTestWrap.style.zIndex =
    Math.round(chifuyuWalkTestState.y);

updateGardenCharacterNightLighting(
  "chifuyu",
  chifuyuWalkTest,
  chifuyuWalkTestState.x,
  chifuyuWalkTestState.y,
  sceneId
);

}

function getGardenScaleByY(y) {
  /*
    y 越小 = 越遠 = 越小
    y 越大 = 越近 = 越大

    目前建議：
    farY   控制遠景最小尺寸的位置
    nearY  控制前景最大尺寸的位置
  */

  const farY = 470;
  const nearY = 1810;

  const farScale = 0.6;
  const nearScale = 1.3;

  const t = Math.max(0, Math.min(1, (y - farY) / (nearY - farY)));

  return farScale + t * (nearScale - farScale);
}

const GARDEN_CHAT_DISTANCE_REF_Y = 1720;

// 遠景不要縮得太誇張，最低保留約 52% 的前景聊天距離
const GARDEN_CHAT_DISTANCE_SCALE_MIN = 0.52;
const GARDEN_CHAT_DISTANCE_SCALE_MAX = 1.0;

function getGardenChatDistanceScale(pointA, pointB) {
  const avgY = (pointA.y + pointB.y) / 2;

  const refScale = getGardenScaleByY(GARDEN_CHAT_DISTANCE_REF_Y);
  const currentScale = getGardenScaleByY(avgY);

  const ratio = currentScale / refScale;

  return Math.max(
    GARDEN_CHAT_DISTANCE_SCALE_MIN,
    Math.min(GARDEN_CHAT_DISTANCE_SCALE_MAX, ratio)
  );
}

function getGardenScaledChatDistanceRange(pointA, pointB, options = {}) {
  const baseMinDistance = options.baseMinDistance ?? 320;
  const baseMaxDistance = options.baseMaxDistance ?? 520;
  const distanceMultiplier = options.distanceMultiplier ?? 1;

  const scale =
    getGardenChatDistanceScale(pointA, pointB) * distanceMultiplier;

  return {
    minDistance: baseMinDistance * scale,
    maxDistance: baseMaxDistance * scale,
    maxYDiff: options.maxYDiff ?? 100,
  };
}

function isGardenChatDistanceValid(pointA, pointB, options = {}) {
  const dx = pointB.x - pointA.x;
  const dy = pointB.y - pointA.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const range = getGardenScaledChatDistanceRange(pointA, pointB, options);

  if (dist < range.minDistance) return false;
  if (dist > range.maxDistance) return false;
  if (Math.abs(dy) > range.maxYDiff) return false;

  return true;
}




function chifuyuWalkMoveLoop(now) {
  if (!gardenScreen || gardenScreen.classList.contains("hidden")) {
    chifuyuWalkMoveFrame = null;
    return;
  }

  const rawDeltaMs = now - chifuyuWalkTestState.lastTime;
  chifuyuWalkTestState.lastTime = now;

  // 避免切頁、轉場、手機瞬間卡頓後，下一幀一次補太多造成角色跳動
  const deltaMs = Math.min(rawDeltaMs, 50);


/*
  =========================
  Character World Update
  =========================

  角色移動本身不再依賴玩家正在看的場景。

  即使玩家正在看另一張場景，
  已經存在的 path 仍然繼續走。
*/
updateChifuyuWalkPosition(
  deltaMs
);

updateChinatsuWalkPosition(
  deltaMs
);


/*
  =========================
  Independent Character Travel
  =========================
*/

updateGardenCharacterTravel(
  "chifuyu",
  now
);

updateGardenCharacterTravel(
  "chinatsu",
  now
);


const sharedChatSceneId =
  getGardenSharedCharacterSceneId();


/*
  只要兩人在同一個 World Scene，
  Chat 就能正常運作。

  玩家鏡頭在哪裡完全無關。
*/
if (
  sharedChatSceneId
) {
  updateGardenChatSystem(
    now
  );
}


if (
  gardenChatState.mode ===
    "wander"
) {
  if (
    !isGardenCharacterTraveling(
      "chifuyu"
    )
  ) {
    updateChifuyuAutoWalk(
      now
    );
  }


  if (
    !isGardenCharacterTraveling(
      "chinatsu"
    )
  ) {
    updateChinatsuAutoWalk(
      now
    );
  }
}

  // 千冬動畫
  if (isGardenChatting()) {
    setChifuyuAnimationMode("talk");
  } else if (chifuyuWalkTestState.isMoving) {
    setChifuyuAnimationMode("walk");
  } else {
    setChifuyuAnimationMode("idle");
  }

  // 千夏動畫
  if (isGardenChatting()) {
    setChinatsuAnimationMode("talk");
  } else if (chinatsuWalkTestState.isMoving) {
    setChinatsuAnimationMode("walk");
  } else {
    setChinatsuAnimationMode("idle");
  }

  // 推進動畫幀，這段不能拿掉
  updateChifuyuAnimationFrame(deltaMs);
  updateChinatsuAnimationFrame(deltaMs);

  // 聊天動畫跑完後，這裡再判斷是否該收尾。
  // 這樣可以保留「回到下一輪第 0 幀後再切回 idle」的效果。
  if (isGardenChatting()) {
    updateGardenChatSystem(now);
  }

renderChifuyuWalkTest();
renderChinatsuWalkTest();

/*
  根據 Character World State
  與 Player View 更新顯示。
*/
updateGardenCharacterVisibility();


chifuyuWalkMoveFrame =
  requestAnimationFrame(
    chifuyuWalkMoveLoop
  );
}




/*
  Garden World 只初始化一次。

  回 Menu 再進 Garden 時，
  不重新生成角色位置、
  不重新同步角色 sceneId。
*/
let gardenWorldInitialized =
  false;


let chifuyuWalkMoveFrame =
  null;

function startChifuyuWalkMoveTest() {
  if (chifuyuWalkMoveFrame) return;

  chifuyuWalkTestState.lastTime = performance.now();
  chifuyuWalkMoveFrame = requestAnimationFrame(chifuyuWalkMoveLoop);
}

function stopChifuyuWalkMoveTest() {
  /*
    離開 Garden 時，
    只停止 requestAnimationFrame。

    不再修改：
    - sceneId
    - x / y
    - path
    - isMoving
    - travel
    - chat state
    - animation state

    這些都屬於 Garden World State，
    不是畫面生命週期。
  */
  if (
    chifuyuWalkMoveFrame
  ) {
    cancelAnimationFrame(
      chifuyuWalkMoveFrame
    );

    chifuyuWalkMoveFrame =
      null;
  }
}

function initGardenScreen() {
  const now =
    performance.now();


  /*
    避免從 Menu 回來之後，
    第一幀吃到很大的 delta。
  */
  chifuyuWalkTestState.lastTime =
    now;


  let initialMode =
    "wander";


  /* =========================
     First Garden Initialization
  ========================= */

  if (
    !gardenWorldInitialized
  ) {
    /*
      只有第一次進 Garden
      才允許產生初始 Chat / Wander。
    */
    initialMode =
      setupGardenInitialMode(
        now
      );


    /*
      如果第一次不是直接聊天，
      才隨機生成初始站位。
    */
    if (
      initialMode !==
      "chat"
    ) {
      randomizeGardenCharacterStartPositions();


      /*
        千冬安全位置檢查。
      */
      if (
        !isGardenWalkablePointInScene(
          gardenViewSceneId,
          chifuyuWalkTestState.x,
          chifuyuWalkTestState.y
        )
      ) {
        chifuyuWalkTestState.x =
          600;

        chifuyuWalkTestState.y =
          1725;

        chifuyuWalkTestState.path =
          [];

        chifuyuWalkTestState.isMoving =
          false;
      }


      /*
        千夏安全位置檢查。
      */
      if (
        !isGardenWalkablePointInScene(
          gardenViewSceneId,
          chinatsuWalkTestState.x,
          chinatsuWalkTestState.y
        )
      ) {
        chinatsuWalkTestState.x =
          430;

        chinatsuWalkTestState.y =
          1680;

        chinatsuWalkTestState.path =
          [];

        chinatsuWalkTestState.isMoving =
          false;
      }


      setChifuyuAnimationMode(
        "idle",
        true
      );


      setChinatsuAnimationMode(
        "idle",
        true
      );


      resetChifuyuAutoWalk();

      resetChinatsuAutoWalk();
    }


    /*
      只有 World 第一次建立時，
      才設定角色初始場景。

      之後永遠不再由 Player View
      覆蓋角色 sceneId。
    */
    gardenCharacterWorldState
      .chifuyu.sceneId =
        gardenViewSceneId;


    gardenCharacterWorldState
      .chinatsu.sceneId =
        gardenViewSceneId;


    gardenWorldInitialized =
      true;
  }


  /* =========================
     Resume Existing Garden World
  ========================= */

  else {
    /*
      不呼叫：
      setupGardenInitialMode()
      randomizeGardenCharacterStartPositions()

      不修改：
      sceneId
      x / y
      path
      travel
      chat
    */

    initialMode =
      gardenChatState.mode ===
        "chat"
        ? "chat"
        : "wander";
  }


  /* =========================
     Restore Player View
  ========================= */

  /*
    玩家 View 本身保留最後的位置。
  */
  if (
    gardenScreen
  ) {
    gardenScreen.classList.toggle(
      "moon-bridge-active",
      gardenViewSceneId ===
        "moonBridge"
    );
  }


/*
  回到 Garden 時，
  重新依現在時間刷新月亮。
*/
updateMoonBridgeMoonPosition();


if (
  gardenViewSceneId ===
    "moonBridge"
) {
  startMoonBridgeClouds();
} else {
  stopMoonBridgeClouds();
}


  /*
    場景自己的動畫屬於 Player View，
    所以重新進 Garden 時要恢復。
  */
  if (
    gardenViewSceneId ===
      "moonBridge"
  ) {
    startMoonBridgeClouds();
  } else {
    stopMoonBridgeClouds();
  }


  /*
    根據：
    character.sceneId
    vs
    gardenViewSceneId

    恢復各角色 visibility。
  */
  updateGardenCharacterVisibility();


  renderChifuyuWalkTest();

  renderChinatsuWalkTest();


  drawGardenWalkDebug();


  /*
    從保存的 World State
    繼續模擬。
  */
  startChifuyuWalkMoveTest();


  return initialMode;
}

// 自由移動模式：不再讓玩家點擊控制千冬
// if (gardenScreen) {
//   gardenScreen.addEventListener("pointerdown", handleGardenPointerDown);
// }



/* =========================
   Moon Bridge Movement Config
========================= */


/* =========================
   Moon Bridge Clouds
========================= */

/*
  Performance Test

  false：
  完全停止賞月橋動態雲，
  不產生 timer / animation。

  測試完成後要恢復時改回 true。
*/
const MOON_BRIDGE_CLOUDS_ENABLED =
  true;


const MOON_BRIDGE_CLOUD_MIN_Y = -60;
const MOON_BRIDGE_CLOUD_MAX_Y = 200;

const MOON_BRIDGE_CLOUD_PROFILES = [
  {
    widthMin: 480,
    widthMax: 540,

    durationMin: 22000,
    durationMax: 28000,
  },

  {
    widthMin: 530,
    widthMax: 600,

    durationMin: 26000,
    durationMax: 33000,
  },

  {
    widthMin: 590,
    widthMax: 670,

    durationMin: 30000,
    durationMax: 38000,
  },
];




/*
  兩朵雲如果同時存在，
  高度至少差這麼多。
*/
const MOON_BRIDGE_CLOUD_ACTIVE_Y_GAP =
  110;

const MOON_BRIDGE_CLOUD_LAST_Y_GAP =
  70;


function getMoonBridgeCloudSpawnDelay() {
  const cloudEls =
    getMoonBridgeCloudElements();

  const activeCount =
    cloudEls.filter((el) =>
      el.classList.contains(
        "is-moving"
      )
    ).length;


  let min;
  let max;


  /*
    天空完全沒有雲：
    不要空太久。
  */
  if (activeCount === 0) {
    min = 2200;
    max = 5200;
  }

  /*
    已經有一朵：
    最自然的主要狀態。
  */
  else if (activeCount === 1) {
    min = 4000;
    max = 8500;
  }

  /*
    已經有兩朵以上：
    讓天空喘一下，
    不要立刻再塞第三朵。
  */
  else {
    min = 7000;
    max = 13000;
  }


  let delay =
    randomMoonBridgeCloudNumber(
      min,
      max
    );


  /*
    約 18% 機率出現額外空窗。

    這個就是打破
    「每隔幾秒固定來一組」
    的關鍵。
  */
  if (Math.random() < 0.18) {
    delay +=
      randomMoonBridgeCloudNumber(
        2500,
        6500
      );
  }


  return delay;
}



/*
  下一朵雲出現間隔。
*/
const MOON_BRIDGE_CLOUD_SPAWN_MIN_MS =
  4000;

const MOON_BRIDGE_CLOUD_SPAWN_MAX_MS =
  6500;


/*
  單朵雲從右走到左的時間。
*/
const MOON_BRIDGE_CLOUD_DURATION_MIN_MS =
  18000;

const MOON_BRIDGE_CLOUD_DURATION_MAX_MS =
  26000;


let moonBridgeCloudTimer = null;

let moonBridgeCloudRunning =
  false;

let moonBridgeLastCloudIndex =
  -1;

let moonBridgeLastCloudY =
  null;


function randomMoonBridgeCloudNumber(
  min,
  max
) {
  return (
    min +
    Math.random() *
      (max - min)
  );
}

function getMoonBridgeCloudElements() {
  return [
    document.querySelector(
      ".moon-bridge-cloud-01"
    ),

    document.querySelector(
      ".moon-bridge-cloud-02"
    ),

    document.querySelector(
      ".moon-bridge-cloud-03"
    ),
  ].filter(Boolean);
}

function pickMoonBridgeCloudY(
  cloudEls
) {
  const activeYs =
    cloudEls
      .filter((el) =>
        el.classList.contains(
          "is-moving"
        )
      )
      .map((el) =>
        Number(
          el.dataset.cloudY
        )
      )
      .filter(
        Number.isFinite
      );


  /*
    最多嘗試 12 次。

    避免：
    - 和目前畫面中的雲太近
    - 和上一朵的位置幾乎一樣
  */
  for (
    let i = 0;
    i < 12;
    i++
  ) {
    const y =
      randomMoonBridgeCloudNumber(
        MOON_BRIDGE_CLOUD_MIN_Y,
        MOON_BRIDGE_CLOUD_MAX_Y
      );


    const tooCloseToActive =
  activeYs.some(
    (otherY) =>
      Math.abs(
        y - otherY
      ) <
      MOON_BRIDGE_CLOUD_ACTIVE_Y_GAP
  );


    const tooCloseToLast =
  Number.isFinite(
    moonBridgeLastCloudY
  ) &&
  Math.abs(
    y -
    moonBridgeLastCloudY
  ) <
    MOON_BRIDGE_CLOUD_LAST_Y_GAP;


    if (
      !tooCloseToActive &&
      !tooCloseToLast
    ) {
      return y;
    }
  }


  /*
    如果天空剛好塞得太滿，
    這次乾脆不生雲。

    比硬塞一朵重疊的更自然。
  */
  return null;
}


function pickMoonBridgeCloudElement(
  cloudEls
) {
  const available =
    cloudEls
      .map(
        (el, index) => ({
          el,
          index,
        })
      )
      .filter(
        (item) =>
          !item.el.classList.contains(
            "is-moving"
          ) &&
          item.index !==
            moonBridgeLastCloudIndex
      );


  if (
    available.length === 0
  ) {
    return null;
  }


  const picked =
    available[
      Math.floor(
        Math.random() *
        available.length
      )
    ];


  return picked;
}


function spawnMoonBridgeCloud() {
  if (
    !moonBridgeCloudRunning
  ) {
    return;
  }


  if (
    gardenViewSceneId !==
    "moonBridge"
  ) {
    return;
  }


  const cloudEls =
    getMoonBridgeCloudElements();


    /*
  手機效能保護：

  同一時間最多只允許一朵雲移動。

  三張雲素材仍然會隨機輪流使用，
  只是不要同時疊加透明 PNG 動畫。
*/
const hasActiveCloud =
  cloudEls.some((el) =>
    el.classList.contains(
      "is-moving"
    )
  );


if (hasActiveCloud) {
  return;
}


  const picked =
    pickMoonBridgeCloudElement(
      cloudEls
    );


  if (!picked) {
    return;
  }


  const y =
    pickMoonBridgeCloudY(
      cloudEls
    );


  if (y === null) {
    return;
  }


  const {
  el,
  index,
} = picked;


const profile =
  MOON_BRIDGE_CLOUD_PROFILES[index] ||
  MOON_BRIDGE_CLOUD_PROFILES[0];


const duration =
  randomMoonBridgeCloudNumber(
    profile.durationMin,
    profile.durationMax
  );


const width =
  randomMoonBridgeCloudNumber(
    profile.widthMin,
    profile.widthMax
  );


  moonBridgeLastCloudIndex =
    index;

  moonBridgeLastCloudY =
    y;


  el.dataset.cloudY =
    String(y);


  el.style.top =
  `${Math.round(y)}px`;

el.style.width =
  `${Math.round(width)}px`;

el.style.animationDuration =
  `${Math.round(duration)}ms`;


  /*
    保證重新觸發 animation。
  */
  el.classList.remove(
    "is-moving"
  );

  void el.offsetWidth;

  el.classList.add(
    "is-moving"
  );
}

for (
  const cloudEl of
  getMoonBridgeCloudElements()
) {
  cloudEl.addEventListener(
    "animationend",
    () => {
      cloudEl.classList.remove(
        "is-moving"
      );

      cloudEl.style.willChange =
  "auto";

      cloudEl.dataset.cloudY =
        "";

      cloudEl.style.animationDuration =
        "";

        cloudEl.style.width =
  "";

      cloudEl.style.opacity =
        "";
    }
  );
}


function scheduleNextMoonBridgeCloud() {
  if (
    !moonBridgeCloudRunning
  ) {
    return;
  }


  if (moonBridgeCloudTimer) {
    clearTimeout(
      moonBridgeCloudTimer
    );
  }


const delay =
  getMoonBridgeCloudSpawnDelay();


  moonBridgeCloudTimer =
    setTimeout(() => {
      moonBridgeCloudTimer =
        null;


      spawnMoonBridgeCloud();


      scheduleNextMoonBridgeCloud();
    }, delay);
}

function startMoonBridgeClouds() {
  /*
    手機效能測試：
    關閉時確保舊 timer / animation
    也全部清乾淨。
  */
  if (
    !MOON_BRIDGE_CLOUDS_ENABLED
  ) {
    stopMoonBridgeClouds();
    return;
  }


  if (
    moonBridgeCloudRunning
  ) {
    return;
  }


  moonBridgeCloudRunning =
    true;


  /*
    剛進場不要立刻飛出一朵。
  */
  const firstDelay =
    randomMoonBridgeCloudNumber(
      1000,
      3000
    );


  moonBridgeCloudTimer =
    setTimeout(() => {
      moonBridgeCloudTimer =
        null;

      spawnMoonBridgeCloud();

      scheduleNextMoonBridgeCloud();
    }, firstDelay);
}


function stopMoonBridgeClouds() {
  moonBridgeCloudRunning =
    false;


  if (moonBridgeCloudTimer) {
    clearTimeout(
      moonBridgeCloudTimer
    );

    moonBridgeCloudTimer =
      null;
  }


  for (
    const cloudEl of
    getMoonBridgeCloudElements()
  ) {
    cloudEl.classList.remove(
      "is-moving"
    );

    cloudEl.style.willChange =
  "auto";

    cloudEl.dataset.cloudY =
      "";

    cloudEl.style.animationDuration =
      "";

      cloudEl.style.width =
  "";

    cloudEl.style.opacity =
      "";
  }


  moonBridgeLastCloudIndex =
    -1;

  moonBridgeLastCloudY =
    null;
}






/*
  第一版先使用單純水平矩形。

  等賞月橋實際顯示後，
  再依橋面的腳底位置微調 y。
*/
const MOON_BRIDGE_WALK_AREAS = {
  ground: [
    {
      name: "moon-bridge-ground",

      points: [
        { x: 160, y: 1180 },
        { x: 920, y: 1180 },
        { x: 920, y: 1420 },
        { x: 160, y: 1420 },
      ],
    },
  ],

  far: [],
};


/*
  因為橋面目前是完整凸矩形，
  任意兩個可走點之間都能直接連線。

  findGardenPath() 本身會優先檢查
  direct segment，
  所以目前不需要額外 path nodes。
*/
const MOON_BRIDGE_PATH_NODES = [];


/*
  自動散步目的地。

  先平均分布在橋面左右與前後，
  之後看實際美術構圖再調。
*/
const MOON_BRIDGE_AUTO_TARGET_POINTS = [
  {
    name: "bridge-left-back",
    x: 250,
    y: 1230,
    zone: "ground",
  },

  {
    name: "bridge-center-back",
    x: 540,
    y: 1230,
    zone: "ground",
  },

  {
    name: "bridge-right-back",
    x: 830,
    y: 1230,
    zone: "ground",
  },

  {
    name: "bridge-left-front",
    x: 250,
    y: 1360,
    zone: "ground",
  },

  {
    name: "bridge-center-front",
    x: 540,
    y: 1360,
    zone: "ground",
  },

  {
    name: "bridge-right-front",
    x: 830,
    y: 1360,
    zone: "ground",
  },
];

/* =========================
   Moon Bridge Chat Spots
========================= */

const MOON_BRIDGE_CHAT_SPOTS = [
  /*
    橋中央
  */
  {
    name: "moon-bridge-center",

    chifuyu: {
      x: 360,
      y: 1300,
      direction: 1,
    },

    chinatsu: {
      x: 720,
      y: 1300,
      direction: -1,
    },
  },


  /*
    稍偏左
  */
  {
    name: "moon-bridge-left",

    chifuyu: {
      x: 270,
      y: 1240,
      direction: 1,
    },

    chinatsu: {
      x: 620,
      y: 1240,
      direction: -1,
    },
  },


  /*
    稍偏右，交換站位
  */
  {
    name: "moon-bridge-right",

    chifuyu: {
      x: 810,
      y: 1360,
      direction: -1,
    },

    chinatsu: {
      x: 450,
      y: 1360,
      direction: 1,
    },
  },
];

const GARDEN_CHARACTER_ACTIVITY =
  Object.freeze({
    WANDER: "wander",
    TRAVEL: "travel",
    CHAT: "chat",
  });


const gardenCharacterWorldState = {
  chifuyu: {
    sceneId: "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,

    activityData: null,

    travel: null,
  },

  chinatsu: {
    sceneId: "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,

    activityData: null,

    travel: null,
  },
};

function areGardenCharactersInViewedScene() {
  return (
    gardenCharacterWorldState.chifuyu.sceneId ===
      gardenViewSceneId &&
    gardenCharacterWorldState.chinatsu.sceneId ===
      gardenViewSceneId
  );
}


/* =========================
   Garden Scene Config
========================= */

let gardenViewSceneId =
  "courtyard";


function getGardenSceneById(
  sceneId
) {
  if (
    sceneId ===
    "courtyard"
  ) {
    return {
      id: "courtyard",

      nav: {
  left: null,
  right: "moonBridge",
},

/*
  Character World Travel

  nav
  → 玩家鏡頭切換

  exits / entrances
  → 角色自己的跨場景移動
*/
exits: {
  moonBridge: {
    targetSceneId:
      "moonBridge",

    targetEntranceId:
      "courtyard-right",

    exitType:
      "direct",

    characters:
      COURTYARD_MOON_BRIDGE_EXIT_TARGETS,
  },
},

entrances: {
  "moon-bridge-left": {
    fromSceneId:
      "moonBridge",

    direction:
      -1,

    characters:
      COURTYARD_MOON_BRIDGE_ENTRANCE,
  },
},



      walkAreas:
        GARDEN_WALK_AREAS,

      pathNodes:
        GARDEN_PATH_NODES,

      autoTargets:
        GARDEN_AUTO_TARGET_POINTS,

      chatSpots:
        GARDEN_CHAT_SPOTS,

      lanternLights:
        GARDEN_LANTERN_LIGHTS,


        sceneLayers:
  GARDEN_SCENE_LAYER_ASSETS,

  defaultSpawn: {
  x: 600,
  y: 1725,
},


      /*
        景深 / 遮擋規則。

        順序就是優先順序：
        越前面的規則越先判斷。
      */
      depthRules: [

        /*
          最下方前景。
          y > 1400 時進 front layer。
        */
        {
          name: "front-bottom",

          zone: "ground",

          layer: "front",

          yMinExclusive: 1400,
        },


        /*
          枯山水後方。

          必須比 building-corner
          更早判斷，
          才不會被送進 cornerFront。
        */
        {
          name: "karesansui-back",

          zone: "ground",

          layer: "normal",

          xMin: 450,
          xMax: 860,

          yMin: 930,
          yMax: 1150,
        },


        /*
          右上建築轉角前方。
        */
        {
          name: "building-corner",

          zone: "ground",

          layer: "cornerFront",

          xMin: 560,

          yMinExclusive: 780,
          yMax: 1400,
        },
      ],
    };
  }

  /*
    =========================
    多場景系統測試用場景


    暫時共用 courtyard 圖片，
    但使用完全不同的：
    - 可走區
    - path nodes
    - auto targets
    - spawn
    =========================
  */

  /*
    =========================
    Moon Bridge
    賞月橋
    =========================




  */
  if (
    sceneId ===
    "moonBridge"
  ) {
    return {
      id: "moonBridge",

nav: {
  left: "courtyard",
  right: null,
},

exits: {
  courtyard: {
    targetSceneId:
      "courtyard",

    targetEntranceId:
      "moon-bridge-left",

    exitType:
      "approachOut",

    characters:
      MOON_BRIDGE_COURTYARD_EXIT,
  },
},

entrances: {
  "courtyard-right": {
    fromSceneId:
      "courtyard",

    direction:
      1,

    characters:
      MOON_BRIDGE_LEFT_ENTRANCE,
  },
},


      walkAreas:
        MOON_BRIDGE_WALK_AREAS,


      pathNodes:
        MOON_BRIDGE_PATH_NODES,


      autoTargets:
        MOON_BRIDGE_AUTO_TARGET_POINTS,


      /*
        聊天地點之後再依實際畫面設定。
      */
      chatSpots:
  MOON_BRIDGE_CHAT_SPOTS,


      /*
        賞月橋目前沒有庭院燈籠。
        之後若新增橋燈，
        再建立自己的 lighting config。
      */
      lanternLights: [],


      sceneLayers:
        MOON_BRIDGE_SCENE_LAYER_ASSETS,


      /*
        場景切換後兩人的安全出生基準。
      */
      defaultSpawn: {
        x: 540,
        y: 1300,
      },


      /*
        橋欄杆本身已經固定在
        z-index: 650。

        角色目前保持 normal layer 500
        就會自然被前方欄杆遮擋，
        所以暫時不需要額外 depth rule。
      */
      depthRules: [],
    };
  }


  if (
    sceneId ===
    "testScene"
  ) {
    return {
      id: "testScene",


      /*
        只允許角色在畫面中下方
        一個小矩形內活動。
      */
      walkAreas: {
        ground: [
          {
            name: "test-ground",

            points: [
              { x: 180, y: 1180 },
              { x: 700, y: 1180 },
              { x: 700, y: 1380 },
              { x: 180, y: 1380 },
            ],
          },
        ],

        far: [],
      },


      /*
        測試用導航骨架。
      */
      pathNodes: [
        {
          name: "test-left",
          x: 260,
          y: 1280,
        },

        {
          name: "test-center",
          x: 440,
          y: 1280,
        },

        {
          name: "test-right",
          x: 620,
          y: 1280,
        },
      ],


      /*
        角色只會從這些點中
        挑散步目的地。
      */
      autoTargets: [
        {
          name: "test-a",
          x: 240,
          y: 1230,
          zone: "ground",
        },

        {
          name: "test-b",
          x: 440,
          y: 1230,
          zone: "ground",
        },

        {
          name: "test-c",
          x: 640,
          y: 1230,
          zone: "ground",
        },

        {
          name: "test-d",
          x: 240,
          y: 1330,
          zone: "ground",
        },

        {
          name: "test-e",
          x: 440,
          y: 1330,
          zone: "ground",
        },

        {
          name: "test-f",
          x: 640,
          y: 1330,
          zone: "ground",
        },
      ],


      /*
        這次先不測指定聊天點。
      */
      chatSpots: [],


      /*
        先沿用庭院燈光，
        避免這輪混入夜間視覺差異。
      */
      lanternLights:
        GARDEN_LANTERN_LIGHTS,


      /*
        暫時共用同一套庭院圖片。
        所以切換時背景看起來不會變。
      */
      sceneLayers:
        GARDEN_SCENE_LAYER_ASSETS,


      /*
        沒有有效 auto target 時的
        最後保險出生點。
      */
      defaultSpawn: {
        x: 440,
        y: 1280,
      },


      /*
        測試區不需要特殊遮擋。
      */
      depthRules: [],
    };
  }


  return null;
}


/* =========================
   Garden View / World Scene Helpers
========================= */

function getGardenViewScene() {
  return getGardenSceneById(
    gardenViewSceneId
  );
}


/*
  舊名稱暫時保留。

  現階段所有還沒完成重構的
  視覺 / UI 程式仍可繼續使用。
*/
function getCurrentGardenScene() {
  return getGardenViewScene();
}


function getGardenCharacterSceneId(
  character
) {
  return (
    gardenCharacterWorldState[
      character
    ]?.sceneId || null
  );
}



function getGardenSharedCharacterSceneId() {
  const chifuyuSceneId =
    gardenCharacterWorldState
      .chifuyu.sceneId;

  const chinatsuSceneId =
    gardenCharacterWorldState
      .chinatsu.sceneId;


  /*
    Transit 時 sceneId = null，
    當然不能聊天。
  */
  if (
    !chifuyuSceneId ||
    !chinatsuSceneId
  ) {
    return null;
  }


  /*
    不在同一張場景，
    不能進行雙人 Chat。
  */
  if (
    chifuyuSceneId !==
    chinatsuSceneId
  ) {
    return null;
  }


  /*
    任一角色正在旅行，
    不開啟新的 Chat。
  */
  if (
    isGardenCharacterTraveling(
      "chifuyu"
    ) ||
    isGardenCharacterTraveling(
      "chinatsu"
    )
  ) {
    return null;
  }


  return chifuyuSceneId;
}


function areGardenCharactersInSameScene() {
  return !!getGardenSharedCharacterSceneId();
}



function getGardenCharacterScene(
  character
) {
  const sceneId =
    getGardenCharacterSceneId(
      character
    );

  if (!sceneId) {
    return null;
  }

  return getGardenSceneById(
    sceneId
  );
}

function getGardenSceneAssetsByMode(
  scene,
  mode
) {
  if (!scene) {
    return [];
  }


  const safeMode =
    mode === "night"
      ? "night"
      : "day";


  const sceneLayers =
    scene.sceneLayers || [];


  return sceneLayers
    .map(
      (item) =>
        item[safeMode]
    )
    .filter(Boolean);
}


function getCurrentGardenSceneAssetsByMode(
  mode
) {
  return getGardenSceneAssetsByMode(
    getCurrentGardenScene(),
    mode
  );
}



async function switchGardenScene(
  sceneId,
  options = {}
) {
  const {
    force = false,

    /*
      場景切換預設只影響玩家鏡頭。

      若未來真的有 Debug / Reset
      需要搬動角色，
      必須明確傳 true。
    */
    resetCharacters = false,
  } = options;


  /*
    先取得目標場景。

    這時候還沒有修改
    gardenViewSceneId。
  */
  const targetScene =
    getGardenSceneById(
      sceneId
    );


  if (!targetScene) {
    console.warn(
      "[Garden] unknown scene:",
      sceneId
    );

    return false;
  }


  /*
    已經在這張場景，
    一般情況不用重新切。

    force:true 留給測試。
  */
  if (
    !force &&
    sceneId ===
      gardenViewSceneId
  ) {
    return true;
  }


 


  const sceneMode =
    getGardenSceneModeByTime();


  /*
    先準備目標場景圖片。

    注意：
    gardenViewSceneId
    此時仍然是舊場景。
  */
  await ensureGardenSceneModeReady(
    sceneMode,
    targetScene
  );


  /*
    圖片準備好後，
    才真正切換目前場景。
  */
  gardenViewSceneId =
    sceneId;




    if (gardenScreen) {
  gardenScreen.classList.toggle(
    "moon-bridge-active",
    gardenViewSceneId ===
      "moonBridge"
  );
}


  /*
    將目標場景的 day/night
    圖片套到現有 DOM。
  */
  applyGardenSceneMode(
  sceneMode
);


/*
  切換 Player View 後，
  同步刷新月亮位置。
*/
updateMoonBridgeMoonPosition();


if (
  gardenViewSceneId ===
  "moonBridge"
) {
  startMoonBridgeClouds();
} else {
  stopMoonBridgeClouds();
}



  if (
  GARDEN_WALK_DEBUG &&
  typeof drawGardenWalkDebug ===
    "function"
) {
  drawGardenWalkDebug();
}


  if (resetCharacters) {
    /*
      舊場景的路徑不能帶進新場景。
    */
    chifuyuWalkTestState.path = [];
    chifuyuWalkTestState.isMoving =
      false;

    chinatsuWalkTestState.path = [];
    chinatsuWalkTestState.isMoving =
      false;


    /*
      使用新場景的 autoTargets
      重新決定兩人的位置。
    */
    randomizeGardenCharacterStartPositions();


    /*
      場景切換後先回 Idle。
    */
    setChifuyuAnimationMode(
      "idle",
      true
    );

    setChinatsuAnimationMode(
      "idle",
      true
    );


    /*
      重新啟動自動散步排程。
    */
    resetChifuyuAutoWalk();
    resetChinatsuAutoWalk();


    /*
      聊天檢查也重新安排，
      不沿用上一張地圖剩餘的時間。
    */
    if (
      typeof scheduleNextGardenChatCheck ===
      "function"
    ) {
      scheduleNextGardenChatCheck(
        performance.now()
      );
    }


    /*
      立即刷新角色位置與景深。
    */
    renderChifuyuWalkTest();
    renderChinatsuWalkTest();
  }


  /*
    Debug 模式開啟時，
    同步重畫新場景 polygon。
  */
  if (
    typeof drawGardenWalkDebug ===
    "function"
  ) {
    drawGardenWalkDebug();
  }


  console.log(
    "[Garden] scene switched:",
    sceneId
  );


  return true;
}


