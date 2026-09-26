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
  /*
    先經過 Registry fallback。

    例如：
    tea 不存在
    → idle

    未來 tea 存在
    → tea
  */
  const resolvedMode =
    resolveGardenCharacterAnimationFallback(
      character,
      mode
    );


  if (!resolvedMode) {
    return null;
  }


  const anim =
    getGardenCharacterAnimationDefinition(
      character,
      resolvedMode
    );


  if (
    !anim ||
    !anim.src ||
    !Number.isFinite(
      anim.logicalSize
    )
  ) {
    console.warn(
      `[Garden Animation] missing asset definition: ${character}/${resolvedMode}`
    );

    return null;
  }


  return {
    mode:
      resolvedMode,

    src:
      anim.src,

    logicalSize:
      anim.logicalSize,
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
       "images/garden/moon-bridge/moon-bridge-bg-day.png",

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
    白天背景已經把天空 + 湖面合併，
    所以不需要額外湖面層。
  */
  day:
    null,

  /*
    夜晚仍然需要獨立湖面，
    用來遮住月亮下半部並維持原有景深。
  */
  night:
    "images/garden/moon-bridge/moon-bridge-lake-night.png",
},


{
  selector:
    ".moon-bridge-cloud-01",

  day:
    "images/garden/moon-bridge/moon-bridge-cloud-01-day.png",

  night:
    "images/garden/moon-bridge/moon-bridge-cloud-01-night.png",
},

{
  selector:
    ".moon-bridge-cloud-02",

  day:
    "images/garden/moon-bridge/moon-bridge-cloud-02-day.png",

  night:
    "images/garden/moon-bridge/moon-bridge-cloud-02-night.png",
},

{
  selector:
    ".moon-bridge-cloud-03",

  day:
    "images/garden/moon-bridge/moon-bridge-cloud-03-day.png",

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
     "images/garden/moon-bridge/moon-bridge-main-day.png",


    night:
      "images/garden/moon-bridge/moon-bridge-main-night.png",
  },


  {
    selector:
      ".moon-bridge-railing-front",

    day:
      "images/garden/moon-bridge/moon-bridge-railing-front-day.png",

    night:
      "images/garden/moon-bridge/moon-bridge-railing-front-night.png",
  },


  {
    selector:
      ".moon-bridge-fg-shidarezakura",

    day:
       "images/garden/moon-bridge/moon-bridge-fg-shidarezakura-day.png",

    night:
      "images/garden/moon-bridge/moon-bridge-fg-shidarezakura-night.png",
  },

{
  selector:
    ".moon-bridge-fg-shidarezakura-shadow-a",

  day:
      "images/garden/moon-bridge/moon-bridge-fg-shidarezakura-shadow-01-day.png",

  night:
    "images/garden/moon-bridge/moon-bridge-fg-shidarezakura-shadow-01-night.png",
},

{
  selector:
    ".moon-bridge-fg-shidarezakura-shadow-b",

  day:
    "images/garden/moon-bridge/moon-bridge-fg-shidarezakura-shadow-02-day.png",

  night:
    "images/garden/moon-bridge/moon-bridge-fg-shidarezakura-shadow-02-night.png",
},

];


/* =========================
   Moon Bridge Moon Test Clock
========================= */

/*
  null：
  使用七原世界 Canonical Time。

  測試時：
  暫時覆蓋月亮顯示使用的
  一天中分鐘數。

  只影響 Moon Bridge visual debug，
  不修改真正 World Clock。
*/
let moonBridgeMoonTestMinutes =
  null;

function getMoonBridgeMoonTimeMinutes() {
  /*
    手動 Moon Debug 仍然保留最高優先權。

    例如：
    setMoonBridgeMoonTestTime("23:30")
  */
  if (
    moonBridgeMoonTestMinutes !==
    null
  ) {
    return moonBridgeMoonTestMinutes;
  }


  /*
    正式狀態：
    使用七原世界 Canonical Time。

    不再使用玩家：
    new Date().getHours()
  */
  const minuteOfDay =
    getGardenWorldMinuteOfDay();


  return Number.isFinite(
    minuteOfDay
  )
    ? minuteOfDay
    : 0;
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

  const isMoonBridge =
    gardenViewSceneId ===
      "moonBridge";


  /*
    特殊月映湖光：

    22:00 ～ 01:59

    注意：
    這次不再控制「有沒有湖光」，
    只控制湖光的最大亮度。
  */
  const isSpecialGlow =
    isMoonBridge &&
    (
      minutes >= 22 * 60 ||
      minutes < 2 * 60
    );


  /*
    把特殊時段狀態放在 Garden Screen。

    CSS 會依這個 class
    切換 upper / lower 的峰值透明度。
  */
  gardenScreen?.classList.toggle(
    "moon-bridge-lake-glow-special",
    isSpecialGlow
  );


  const upperGlowEls =
    gardenScreen?.querySelectorAll(
      [
        ".moon-bridge-lake-glow-01",
        ".moon-bridge-lake-glow-02",
        ".moon-bridge-lake-glow-03",
      ].join(",")
    );


  if (!upperGlowEls) {
    return;
  }


  for (const el of upperGlowEls) {
    if (isMoonBridge) {

      /*
        賞月橋中：

        全天都讓 upper 湖光運作。
        特殊時段只改亮度，
        不重新開關動畫。
      */
      el.classList.add(
        "is-active"
      );

      el.style.display =
        "block";

    } else {

      /*
        離開賞月橋後停止，
        不浪費其他場景的效能。
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

/*
  Canonical World Time 的定義
  位於檔案後段。

  script 首次由上往下執行時，
  Garden 必須能安全使用舊 fallback，
  避免初始化順序造成 TDZ 問題。
*/
var gardenCanonicalWorldTimeReady =
  false;



function getGardenSceneModeByTime() {
  /*
    正式完成 World Time 初始化後，
    Garden 永遠使用七原世界時間。
  */
  if (
    gardenCanonicalWorldTimeReady
  ) {
    return getGardenWorldDayNightMode();
  }


  /*
    Script 首次初始化期間的
    極短暫 fallback。

    等檔案執行到 World Clock 區塊後，
    就不再使用玩家 local time。
  */
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


  /*
    Garden 專用 Canonical Night Flag。

    和全站 body.night-mode 分離：
    這個 class 只代表七原世界目前是否為夜晚。
  */
  document.body.classList.toggle(
    "garden-world-night",
    safeMode === "night"
  );


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
  ? 3
  : 3,

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


/*
  首次真正需要的 sheet
  已經下載 + decode + warmup。

  趁拉門仍然關著，
  提前建立角色 sprite layer。
*/
ensureChifuyuSpriteLayers();
ensureChinatsuSpriteLayers();

bindGardenSpriteLayerImage(
  "chifuyu",
  firstMode
);

bindGardenSpriteLayerImage(
  "chinatsu",
  firstMode
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

/*
  在 planGardenInitialMode()
  之前先恢復 World Clock。

  下一步加入 Reconciliation 後，
  角色世界會先推算到「現在」，
  再決定進場要顯示什麼動畫。
*/
const gardenResumeResult =
  resumeGardenWorld(
    "gardenEnter"
  );


/*
  正常 Resume：
  使用原有 Resume Result。

  第一次開網站：
  沒有 suspended state，
  就直接把世界 reconciliation 到現在。
*/
const gardenEnterWorldResult =
  gardenResumeResult ??
  reconcileGardenWorldAtCurrentTime(
    "gardenEnterInitial"
  );


if (gardenEnterWorldResult) {
  console.log(
    "[Garden World] enter reconciled:",
    gardenEnterWorldResult
  );
}


const gardenInitialMode =
  planGardenInitialMode();

let actualInitialMode =
  "wander";

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


/*
  素材已準備好，而且拉門現在仍完全關閉。

  在這裡就完成：
  - 角色位置
  - Idle / Talk 模式
  - sprite layer opacity
  - Garden world 初始化

  不再等畫面露出後才初始化角色。
*/
if (
  typeof initGardenScreen ===
  "function"
) {
  actualInitialMode =
    initGardenScreen() ||
    "wander";
}

  
},

 () => {
 
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

/* =========================
   Garden Scene Fade Transition
========================= */

const GARDEN_SCENE_FADE_TIMEOUT_MS =
  420;


function waitGardenSceneFade(
  overlay
) {
  return new Promise((resolve) => {
    if (!overlay) {
      resolve();
      return;
    }


    let finished = false;


    const finish = () => {
      if (finished) {
        return;
      }

      finished = true;

      overlay.removeEventListener(
        "transitionend",
        onTransitionEnd
      );

      resolve();
    };


    const onTransitionEnd = (e) => {
      if (
        e.target !== overlay ||
        e.propertyName !== "opacity"
      ) {
        return;
      }

      finish();
    };


    overlay.addEventListener(
      "transitionend",
      onTransitionEnd
    );


    /*
      Safari / WebKit 保險。

      transitionend 萬一沒有正常送出，
      場景切換也不能永久卡住。
    */
    setTimeout(
      finish,
      GARDEN_SCENE_FADE_TIMEOUT_MS
    );
  });
}


function waitGardenScenePaint() {
  return new Promise((resolve) => {
    /*
      等兩個 frame：

      第一幀：
      新場景 DOM / src / visibility
      已經套用。

      第二幀：
      瀏覽器有機會真正畫出來。

      黑幕再打開，
      可以減少閃一下舊畫面的機會。
    */
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}


async function switchGardenSceneWithFade(
  sceneId,
  options = {}
) {
  /*
    同場景且不是 force，
    不需要做一次黑幕。
  */
  if (
    !options.force &&
    sceneId === gardenViewSceneId
  ) {
    return true;
  }


  const overlay =
    document.getElementById(
      "gardenSceneTransition"
    );


  /*
    HTML 尚未加入黑幕時，
    保留原本切換功能，
    不讓整個 Garden 壞掉。
  */
  if (!overlay) {
    return await switchGardenScene(
      sceneId,
      options
    );
  }


  /*
    ① 先把目前場景完全遮黑
  */
  overlay.setAttribute(
    "aria-hidden",
    "false"
  );

  overlay.classList.add(
    "is-active"
  );


  await waitGardenSceneFade(
    overlay
  );


  try {
    /*
      ② 畫面全黑之後，
      才開始真正準備 / 切換場景。

      如果第一次下載素材比較慢，
      玩家現在看到的是黑幕，
      而不是舊畫面卡住。
    */
    const switched =
  await switchGardenScene(
    sceneId,
    options
  );


    /*
      ③ 等新場景真正 paint。
    */
    await waitGardenScenePaint();


    return switched;

  } finally {
    /*
      ④ 不論成功或發生錯誤，
      都一定把黑幕重新打開。
    */
    overlay.classList.remove(
      "is-active"
    );


    await waitGardenSceneFade(
      overlay
    );


    overlay.setAttribute(
      "aria-hidden",
      "true"
    );
  }
}




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
  await switchGardenSceneWithFade(
    targetSceneId,
    {
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

  /*
    從使用者按下 Menu 的這一刻
    就開始計算世界離開時間。

    不等拉門動畫播完。
  */
  suspendGardenWorld(
  "menu"
);


/*
  Garden 世界從這一刻
  已停止 Runtime 更新。

  因此現在保存的 Snapshot
  就是離開 Garden 時的
  最後可靠世界狀態。
*/
saveGardenWorldState(
  "menu"
);


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
   Moon Bridge Time Resync
========================= */

/*
  使用者從背景切回網站時，
  立刻重新同步月亮與湖光。

  不需要等下一次一分鐘 timer。
*/
document.addEventListener(
  "visibilitychange",
  () => {
    if (document.hidden) {
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
  }
);





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
  =========================
  Garden Travel World Timeline
  =========================

  performance.now()
  → 畫面正在執行時的即時計時

  getGardenWorldNow()
  → 可跨 Menu / 背景 / Reload
     的絕對世界時間
*/
function createGardenCharacterTravelTimeline(
  startedAtOverride = null
) {
  const now =
    isValidGardenWorldTimestamp(
      startedAtOverride
    )
      ? startedAtOverride
      : getGardenWorldNow();


  return {
    /*
      整趟 Travel 正式開始時間。
    */
    startedAt:
      now,


    /*
      目前 phase 開始時間。
    */
    phaseStartedAt:
      now,


    /*
      真正離開原場景、
      進入 transit 的時間。
    */
    transitStartedAt:
      null,


    /*
      理論上抵達目的地入口的時間。

      walkingToExit 階段還不知道，
      所以一開始是 null。
    */
    expectedArrivalAt:
      null,


    /*
      已正式進入目的地 Scene
      時才填入。
    */
    arrivedAt:
      null,
  };
}


/* =========================
   Garden Canonical Travel Spatial Plan
   12H-4A
========================= */

const GARDEN_TRAVEL_SPATIAL_PLAN_SCHEMA =
  "nanaharaGardenTravelSpatialPlan";

const GARDEN_TRAVEL_SPATIAL_PLAN_VERSION =
  1;

/*
  =========================
  Canonical Travel Runtime
  =========================

  true：
  Travel 的 phase / scene / position
  正式允許由 Spatial Plan +
  Absolute World Time 重建。

  4C-1 尚未接入主 Loop，
  4C-2 才正式 handoff。
*/
const GARDEN_CANONICAL_TRAVEL_RUNTIME_ENABLED =
  true;


const GARDEN_TRAVEL_FALLBACK_SPEED =
  140;


/*
  取得 Travel Timeline 使用的
  deterministic walking speed。

  千冬：
  與目前 Runtime moveSpeed 相同，
  150 px/s。

  千夏：
  沿用目前依 Y 改變速度的規則。

  注意：
  這裡只讀 world geometry，
  不使用 deltaMs / performance.now()。
*/
function getGardenCanonicalTravelSpeedAtPoint(
  characterId,
  point
) {
  const y =
    Number.isFinite(
      point?.y
    )
      ? point.y
      : 0;


  if (
    characterId ===
      "chinatsu" &&
    typeof getChinatsuMoveSpeedByY ===
      "function"
  ) {
    const speed =
      getChinatsuMoveSpeedByY(
        y
      );


    if (
      Number.isFinite(
        speed
      ) &&
      speed > 0
    ) {
      return speed;
    }
  }


  if (
    characterId ===
      "chifuyu"
  ) {
    return 150;
  }


  if (
    characterId ===
      "chinatsu"
  ) {
    return 145;
  }


  return (
    GARDEN_TRAVEL_FALLBACK_SPEED
  );
}


/*
  將既有 Garden path
  轉成「時間化 Path」。

  一般 Path 只有：

  point A
  point B
  point C

  Canonical Travel Path 還會知道：

  A → B 要多久
  B → C 要多久
  整條走完要多久
*/
function createGardenCanonicalTravelPathRecord(
  characterId,
  startPoint,
  pathPoints
) {
  const rawPoints = [
    startPoint,

    ...(
      Array.isArray(
        pathPoints
      )
        ? pathPoints
        : []
    ),
  ];


  const cleanedPoints =
    [];


  /*
    清除：
    - invalid point
    - 重複 point
  */
  for (
    const point of
    rawPoints
  ) {
    if (
      !point ||
      !Number.isFinite(
        point.x
      ) ||
      !Number.isFinite(
        point.y
      )
    ) {
      continue;
    }


    const normalized = {
      x:
        point.x,

      y:
        point.y,
    };


    const previous =
      cleanedPoints[
        cleanedPoints.length -
          1
      ];


    if (previous) {
      const dx =
        normalized.x -
        previous.x;

      const dy =
        normalized.y -
        previous.y;


      if (
        Math.sqrt(
          dx * dx +
          dy * dy
        ) <
        0.001
      ) {
        continue;
      }
    }


    cleanedPoints.push(
      normalized
    );
  }


  if (
    cleanedPoints.length ===
    0
  ) {
    return null;
  }


  const cumulativeDistances =
    [0];

  const cumulativeDurationMs =
    [0];

  const segmentDurationsMs =
    [];


  let totalDistance =
    0;

  let totalDurationMs =
    0;


  for (
    let i = 1;
    i <
      cleanedPoints.length;
    i++
  ) {
    const from =
      cleanedPoints[
        i - 1
      ];

    const to =
      cleanedPoints[i];


    const dx =
      to.x - from.x;

    const dy =
      to.y - from.y;


    const distance =
      Math.sqrt(
        dx * dx +
        dy * dy
      );


    /*
      取 segment 兩端速度平均。

      千冬是固定 150，
      所以結果完全等同
      distance / 150。

      千夏則保留
      遠景慢、近景快的感覺。
    */
    const fromSpeed =
      getGardenCanonicalTravelSpeedAtPoint(
        characterId,
        from
      );


    const toSpeed =
      getGardenCanonicalTravelSpeedAtPoint(
        characterId,
        to
      );


    const averageSpeed =
      Math.max(
        1,

        (
          fromSpeed +
          toSpeed
        ) /
          2
      );


    const durationMs =
      (
        distance /
        averageSpeed
      ) *
      1000;


    totalDistance +=
      distance;

    totalDurationMs +=
      durationMs;


    segmentDurationsMs.push(
      durationMs
    );


    cumulativeDistances.push(
      totalDistance
    );


    cumulativeDurationMs.push(
      totalDurationMs
    );
  }


  return Object.freeze({
    characterId,


    points:
      Object.freeze(
        cleanedPoints.map(
          point =>
            Object.freeze({
              ...point,
            })
        )
      ),


    cumulativeDistances:
      Object.freeze([
        ...cumulativeDistances,
      ]),


    cumulativeDurationMs:
      Object.freeze([
        ...cumulativeDurationMs,
      ]),


    segmentDurationsMs:
      Object.freeze([
        ...segmentDurationsMs,
      ]),


    totalDistance,

    totalDurationMs,
  });
}


/*
  用 elapsed time
  直接取 Path 上應該所在的位置。

  不讀上一幀位置。
*/
function sampleGardenCanonicalTravelPath(
  pathRecord,
  elapsedMs
) {
  if (
    !pathRecord ||
    !Array.isArray(
      pathRecord.points
    ) ||
    pathRecord.points.length ===
      0
  ) {
    return null;
  }


  const safeElapsed =
    Math.max(
      0,

      Math.min(
        Number.isFinite(
          elapsedMs
        )
          ? elapsedMs
          : 0,

        pathRecord
          .totalDurationMs
      )
    );


  /*
    只有一個點。
  */
  if (
    pathRecord.points.length ===
      1 ||
    pathRecord.totalDurationMs <=
      0
  ) {
    const point =
      pathRecord.points[0];


    return Object.freeze({
      x:
        point.x,

      y:
        point.y,

      direction:
        null,

      elapsedMs:
        0,

      progress:
        1,

      segmentIndex:
        0,

      segmentProgress:
        1,
    });
  }


  /*
    已經走完整條 Path。
  */
  if (
    safeElapsed >=
    pathRecord.totalDurationMs
  ) {
    const lastIndex =
      pathRecord.points.length -
      1;


    const from =
      pathRecord.points[
        lastIndex - 1
      ];

    const to =
      pathRecord.points[
        lastIndex
      ];


    const dx =
      to.x - from.x;


    return Object.freeze({
      x:
        to.x,

      y:
        to.y,

      direction:
        Math.abs(dx) >
        0.001
          ? dx > 0
            ? 1
            : -1
          : null,

      elapsedMs:
        safeElapsed,

      progress:
        1,

      segmentIndex:
        lastIndex - 1,

      segmentProgress:
        1,
    });
  }


  /*
    找出 timestamp
    落在哪一段 path。
  */
  let segmentIndex =
    0;


  for (
    let i = 1;
    i <
      pathRecord
        .cumulativeDurationMs
        .length;
    i++
  ) {
    if (
      safeElapsed <=
      pathRecord
        .cumulativeDurationMs[
          i
        ]
    ) {
      segmentIndex =
        i - 1;

      break;
    }
  }


  const from =
    pathRecord.points[
      segmentIndex
    ];

  const to =
    pathRecord.points[
      segmentIndex + 1
    ];


  if (
    !from ||
    !to
  ) {
    return null;
  }


  const segmentStartMs =
    pathRecord
      .cumulativeDurationMs[
        segmentIndex
      ];


  const segmentEndMs =
    pathRecord
      .cumulativeDurationMs[
        segmentIndex + 1
      ];


  const segmentDurationMs =
    segmentEndMs -
    segmentStartMs;


  const segmentProgress =
    segmentDurationMs >
      0
      ? Math.max(
          0,

          Math.min(
            1,

            (
              safeElapsed -
              segmentStartMs
            ) /
              segmentDurationMs
          )
        )
      : 1;


  const dx =
    to.x - from.x;

  const dy =
    to.y - from.y;


  const x =
    from.x +
    dx *
      segmentProgress;


  const y =
    from.y +
    dy *
      segmentProgress;


  return Object.freeze({
    x,

    y,


    direction:
      Math.abs(dx) >
      0.001
        ? dx > 0
          ? 1
          : -1
        : null,


    elapsedMs:
      safeElapsed,


    progress:
      pathRecord
        .totalDurationMs >
      0
        ? safeElapsed /
          pathRecord
            .totalDurationMs
        : 1,


    segmentIndex,

    segmentProgress,
  });
}


/*
  建立一整趟 Travel
  的 Absolute Spatial Timeline。

  Timeline：

  startedAt
      ↓
  walkingToExit
      ↓
  transit
      ↓
  walkingFromEntrance
      ↓
  completedAt
*/
function createGardenCanonicalTravelSpatialPlan({
  characterId,

  route,

  startPoint,

  startDirection = 1,

  exitPath,

  startedAt =
    getGardenWorldNow(),

  transitDurationMs =
    GARDEN_CHARACTER_TRAVEL_TRANSIT_MS,
} = {}) {
  if (
    !characterId ||
    !route ||
    !isValidGardenWorldTimestamp(
      startedAt
    )
  ) {
    return null;
  }


  const entrance =
    route
      .entranceByCharacter?.[
        characterId
      ];


  if (
    !entrance?.spawn ||
    !entrance?.enter
  ) {
    return null;
  }


  /*
    出口 Walking Path。
  */
  const exitRecord =
    createGardenCanonicalTravelPathRecord(
      characterId,
      startPoint,
      exitPath
    );


  /*
    入口 Walking Path。

    spawn 可以在 walkArea 外，
    沒關係。

    這本來就是 Travel
    專用入口動畫。
  */
  const entranceRecord =
    createGardenCanonicalTravelPathRecord(
      characterId,

      entrance.spawn,

      [
        entrance.enter,
      ]
    );


  if (
    !exitRecord ||
    !entranceRecord
  ) {
    return null;
  }


  const safeTransitDurationMs =
    Math.max(
      0,

      Number.isFinite(
        transitDurationMs
      )
        ? transitDurationMs
        : 0
    );


  /*
    =========================
    Absolute Phase Boundaries
    =========================
  */

  const exitStartedAt =
    startedAt;


  const exitEndsAt =
    exitStartedAt +
    exitRecord.totalDurationMs;


  const transitStartedAt =
    exitEndsAt;


  const transitEndsAt =
    transitStartedAt +
    safeTransitDurationMs;


  const entranceStartedAt =
    transitEndsAt;


  const entranceEndsAt =
    entranceStartedAt +
    entranceRecord
      .totalDurationMs;


  return Object.freeze({
    schema:
      GARDEN_TRAVEL_SPATIAL_PLAN_SCHEMA,

    version:
      GARDEN_TRAVEL_SPATIAL_PLAN_VERSION,


    characterId,


    fromSceneId:
      route.fromSceneId,

    toSceneId:
      route.toSceneId,


    startedAt,


    startDirection:
      startDirection === -1
        ? -1
        : 1,


    entranceDirection:
      route
        .entranceDirection ===
      -1
        ? -1
        : 1,


    exit:
      Object.freeze({
        startedAt:
          exitStartedAt,

        endsAt:
          exitEndsAt,

        durationMs:
          exitRecord
            .totalDurationMs,

        path:
          exitRecord,
      }),


    transit:
      Object.freeze({
        startedAt:
          transitStartedAt,

        endsAt:
          transitEndsAt,

        durationMs:
          safeTransitDurationMs,
      }),


    entrance:
      Object.freeze({
        startedAt:
          entranceStartedAt,

        endsAt:
          entranceEndsAt,

        durationMs:
          entranceRecord
            .totalDurationMs,

        path:
          entranceRecord,
      }),


    completedAt:
      entranceEndsAt,
  });
}


/*
  給任意 Absolute World Timestamp，

  直接算角色現在應該
  位於 Travel Timeline 的哪裡。
*/
function resolveGardenCanonicalTravelSpatialState(
  plan,

  timestamp =
    getGardenWorldNow()
) {
  if (
    !plan ||
    plan.schema !==
      GARDEN_TRAVEL_SPATIAL_PLAN_SCHEMA ||
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return null;
  }


  /*
    =========================
    Walking To Exit
    =========================
  */
  if (
    timestamp <
    plan.exit.endsAt
  ) {
    const sample =
      sampleGardenCanonicalTravelPath(
        plan.exit.path,

        Math.max(
          0,

          timestamp -
            plan.exit.startedAt
        )
      );


    return Object.freeze({
      phase:
        "walkingToExit",


      phaseProgress:
        plan.exit.durationMs >
          0
          ? Math.max(
              0,

              Math.min(
                1,

                (
                  timestamp -
                  plan.exit
                    .startedAt
                ) /
                  plan.exit
                    .durationMs
              )
            )
          : 1,


      sceneId:
        plan.fromSceneId,


      x:
        sample?.x ??
        null,

      y:
        sample?.y ??
        null,


      direction:
        sample?.direction ??
        plan.startDirection,


      isMoving:
        true,


      sample,
    });
  }


  /*
    =========================
    Transit
    =========================
  */
  if (
    timestamp <
    plan.transit.endsAt
  ) {
    return Object.freeze({
      phase:
        "transit",


      phaseProgress:
        plan.transit
          .durationMs >
        0
          ? Math.max(
              0,

              Math.min(
                1,

                (
                  timestamp -
                  plan.transit
                    .startedAt
                ) /
                  plan.transit
                    .durationMs
              )
            )
          : 1,


      sceneId:
        null,

      x:
        null,

      y:
        null,

      direction:
        null,

      isMoving:
        false,

      sample:
        null,
    });
  }


  /*
    =========================
    Walking From Entrance
    =========================
  */
  if (
    timestamp <
    plan.entrance.endsAt
  ) {
    const sample =
      sampleGardenCanonicalTravelPath(
        plan.entrance.path,

        Math.max(
          0,

          timestamp -
            plan.entrance
              .startedAt
        )
      );


    return Object.freeze({
      phase:
        "walkingFromEntrance",


      phaseProgress:
        plan.entrance
          .durationMs >
        0
          ? Math.max(
              0,

              Math.min(
                1,

                (
                  timestamp -
                  plan.entrance
                    .startedAt
                ) /
                  plan.entrance
                    .durationMs
              )
            )
          : 1,


      sceneId:
        plan.toSceneId,


      x:
        sample?.x ??
        null,

      y:
        sample?.y ??
        null,


      direction:
        sample?.direction ??
        plan.entranceDirection,


      isMoving:
        true,


      sample,
    });
  }


  /*
    =========================
    Completed
    =========================
  */

  const finalSample =
    sampleGardenCanonicalTravelPath(
      plan.entrance.path,
      plan.entrance.durationMs
    );


  return Object.freeze({
    phase:
      "completed",

    phaseProgress:
      1,


    sceneId:
      plan.toSceneId,


    x:
      finalSample?.x ??
      null,

    y:
      finalSample?.y ??
      null,


    direction:
      finalSample?.direction ??
      plan.entranceDirection,


    isMoving:
      false,


    sample:
      finalSample,
  });
}



/* =========================
   12H-4E
   Travel → Wander Continuity
========================= */

const GARDEN_WANDER_CONTINUITY_SCHEMA =
  "nanaharaGardenWanderContinuity";

const GARDEN_WANDER_CONTINUITY_VERSION =
  1;


/*
  最多向未來找幾個 Wander Slot Boundary。

  正常情況通常第 1～2 個就足夠。
*/
const GARDEN_WANDER_CONTINUITY_MAX_SLOT_SEARCH =
  4;


/*
  將 Wander Slot Address
  轉回真正的 Absolute World Timestamp。

  目前 Garden World Time Zone
  固定為 Asia/Tokyo / JST，
  所以使用 +09:00。
*/
function getGardenWanderSlotBoundaryTimestamp(
  dateKey,
  slotIndex
) {
  const address =
    normalizeGardenWanderSlotAddress(
      dateKey,
      slotIndex
    );


  if (!address) {
    return null;
  }


  const secondOfDay =
    address.slotIndex *
    GARDEN_WANDER_SLOT_SECONDS;


  const hour =
    Math.floor(
      secondOfDay /
      3600
    );


  const minute =
    Math.floor(
      (
        secondOfDay %
        3600
      ) /
      60
    );


  const second =
    secondOfDay %
    60;


  const pad2 =
    value =>
      String(
        value
      ).padStart(
        2,
        "0"
      );


  const timestamp =
    Date.parse(
      `${address.dateKey}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}+09:00`
    );


  return (
    isValidGardenWorldTimestamp(
      timestamp
    )
      ? timestamp
      : null
  );
}

function createGardenTravelToWanderContinuityPlan({
  characterId,

  sceneId,

  startPoint,

  startDirection = 1,

  startedAt =
    getGardenWorldNow(),
} = {}) {
  if (
    !characterId ||
    !sceneId ||
    !startPoint ||
    !Number.isFinite(
      startPoint.x
    ) ||
    !Number.isFinite(
      startPoint.y
    ) ||
    !isValidGardenWorldTimestamp(
      startedAt
    )
  ) {
    return null;
  }


  const calendar =
    getGardenWorldCalendarParts(
      startedAt
    );


  if (!calendar) {
    return null;
  }


  const currentSlotIndex =
    Math.floor(
      calendar.secondOfDay /
      GARDEN_WANDER_SLOT_SECONDS
    );


  /*
    Travel completion 後，
    尋找最早一個：

    「有足夠真實時間
      讓角色正常走到 Anchor」

    的未來 slot boundary。
  */
  for (
    let offset = 1;
    offset <=
      GARDEN_WANDER_CONTINUITY_MAX_SLOT_SEARCH;
    offset++
  ) {
    const targetAddress =
      normalizeGardenWanderSlotAddress(
        calendar.dateKey,
        currentSlotIndex +
          offset
      );


    if (!targetAddress) {
      continue;
    }


    const targetAnchor =
      getGardenDeterministicWanderAnchor({
        dateKey:
          targetAddress.dateKey,

        slotIndex:
          targetAddress.slotIndex,

        characterId,

        sceneId,
      });


    if (!targetAnchor) {
      continue;
    }


    const boundaryTimestamp =
      getGardenWanderSlotBoundaryTimestamp(
        targetAddress.dateKey,
        targetAddress.slotIndex
      );


    if (
      !isValidGardenWorldTimestamp(
        boundaryTimestamp
      ) ||
      boundaryTimestamp <=
        startedAt
    ) {
      continue;
    }


    /*
      Travel 已經完全抵達目的 Scene。

      所以從 entrance.enter
      正常尋路到 Wander Anchor。
    */
    const path =
      findGardenPath(
        startPoint,
        targetAnchor,
        sceneId
      );


    if (!path) {
      continue;
    }


    /*
      直接重用 12H-4A
      已經建立好的時間化 Path Model。

      這樣：
      千冬固定 speed、
      千夏依 Y 深度 speed

      都與 Canonical Travel
      使用同一套模型。
    */
    const pathRecord =
      createGardenCanonicalTravelPathRecord(
        characterId,
        startPoint,
        path
      );


    if (!pathRecord) {
      continue;
    }


    const availableDurationMs =
      boundaryTimestamp -
      startedAt;


    /*
      時間不夠正常走過去，
      就找下一個 boundary。

      絕不為了趕時間
      突然加速或瞬移。
    */
    if (
      pathRecord.totalDurationMs >
      availableDurationMs
    ) {
      continue;
    }


    /*
      角色不需要 Travel 一結束
      就立刻開始走。

      如果到 boundary 還有很多時間，
      先在入口停留，
      再用正常速度走過去。
    */
    const moveStartedAt =
      boundaryTimestamp -
      pathRecord.totalDurationMs;


    return Object.freeze({
      schema:
        GARDEN_WANDER_CONTINUITY_SCHEMA,

      version:
        GARDEN_WANDER_CONTINUITY_VERSION,


      characterId,

      sceneId,


      startedAt,

      endsAt:
        boundaryTimestamp,


      startPoint:
        Object.freeze({
          x:
            startPoint.x,

          y:
            startPoint.y,
        }),


      startDirection:
        startDirection === -1
          ? -1
          : 1,


      moveStartedAt,


      targetDateKey:
        targetAddress.dateKey,

      targetSlotIndex:
        targetAddress.slotIndex,


      targetAnchor,


      path:
        pathRecord,


      totalDurationMs:
        availableDurationMs,

      moveDurationMs:
        pathRecord.totalDurationMs,

      idleDurationMs:
        Math.max(
          0,
          moveStartedAt -
          startedAt
        ),
    });
  }


  return null;
}


function resolveGardenTravelToWanderContinuity(
  plan,

  timestamp =
    getGardenWorldNow()
) {
  if (
    !plan ||
    plan.schema !==
      GARDEN_WANDER_CONTINUITY_SCHEMA ||
    plan.version !==
      GARDEN_WANDER_CONTINUITY_VERSION ||
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return null;
  }


  /*
    =========================
    Before / At Start
    =========================
  */
  if (
    timestamp <=
    plan.startedAt
  ) {
    return Object.freeze({
      phase:
        "idle",

      completed:
        false,

      sceneId:
        plan.sceneId,

      x:
        plan.startPoint.x,

      y:
        plan.startPoint.y,

      direction:
        plan.startDirection,

      isMoving:
        false,

      progress:
        0,
    });
  }


  /*
    =========================
    Completed
    =========================

    在 endsAt 時，
    必須精準落在
    Wander Slot 的 fromAnchor。
  */
  if (
    timestamp >=
    plan.endsAt
  ) {
    return Object.freeze({
      phase:
        "completed",

      completed:
        true,

      sceneId:
        plan.sceneId,

      x:
        plan.targetAnchor.x,

      y:
        plan.targetAnchor.y,

      direction:
        null,

      isMoving:
        false,

      progress:
        1,
    });
  }


  /*
    =========================
    Idle Before Move
    =========================
  */
  if (
    timestamp <
    plan.moveStartedAt
  ) {
    return Object.freeze({
      phase:
        "idle",

      completed:
        false,

      sceneId:
        plan.sceneId,

      x:
        plan.startPoint.x,

      y:
        plan.startPoint.y,

      direction:
        plan.startDirection,

      isMoving:
        false,

      progress:
        0,
    });
  }


  /*
    =========================
    Move To Wander Anchor
    =========================
  */
  const sample =
    sampleGardenCanonicalTravelPath(
      plan.path,

      timestamp -
      plan.moveStartedAt
    );


  if (!sample) {
    return null;
  }


  return Object.freeze({
    phase:
      "move",

    completed:
      false,

    sceneId:
      plan.sceneId,

    x:
      sample.x,

    y:
      sample.y,

    direction:
      sample.direction ??
      plan.startDirection,

    isMoving:
      true,

    progress:
      sample.progress,

    sample,
  });
}

function isGardenWanderContinuityPlanUsable(
  plan,
  characterId = null,
  sceneId = null
) {
  if (
    !plan ||
    typeof plan !==
      "object"
  ) {
    return false;
  }


  if (
    plan.schema !==
      GARDEN_WANDER_CONTINUITY_SCHEMA ||
    plan.version !==
      GARDEN_WANDER_CONTINUITY_VERSION
  ) {
    return false;
  }


  if (
    !plan.characterId ||
    !plan.sceneId
  ) {
    return false;
  }


  /*
    Caller 若指定角色 / Scene，
    Plan 必須完全一致。
  */
  if (
    characterId &&
    plan.characterId !==
      characterId
  ) {
    return false;
  }


  if (
    sceneId &&
    plan.sceneId !==
      sceneId
  ) {
    return false;
  }


  if (
    !isValidGardenWorldTimestamp(
      plan.startedAt
    ) ||
    !isValidGardenWorldTimestamp(
      plan.moveStartedAt
    ) ||
    !isValidGardenWorldTimestamp(
      plan.endsAt
    )
  ) {
    return false;
  }


  /*
    Timeline 必須：

    startedAt
      <= moveStartedAt
      <= endsAt
  */
  if (
    plan.moveStartedAt <
      plan.startedAt ||
    plan.endsAt <
      plan.moveStartedAt
  ) {
    return false;
  }


  if (
    !Number.isFinite(
      plan.startPoint?.x
    ) ||
    !Number.isFinite(
      plan.startPoint?.y
    ) ||
    !Number.isFinite(
      plan.targetAnchor?.x
    ) ||
    !Number.isFinite(
      plan.targetAnchor?.y
    )
  ) {
    return false;
  }


  if (
    !plan.path ||
    typeof plan.path !==
      "object"
  ) {
    return false;
  }


  if (
    !Number.isFinite(
      plan.path.totalDurationMs
    ) ||
    plan.path.totalDurationMs <
      0
  ) {
    return false;
  }


  if (
    !Number.isFinite(
      plan.moveDurationMs
    ) ||
    !Number.isFinite(
      plan.idleDurationMs
    ) ||
    plan.moveDurationMs <
      0 ||
    plan.idleDurationMs <
      0
  ) {
    return false;
  }


  /*
    moveStartedAt 是：

    endsAt - 正常走路所需時間
  */
  const expectedMoveStartedAt =
    plan.endsAt -
    plan.moveDurationMs;


  if (
    Math.abs(
      expectedMoveStartedAt -
      plan.moveStartedAt
    ) >
      0.001
  ) {
    return false;
  }


  /*
    整份 Plan 長度
    必須等於 idle + move。
  */
  const expectedTotalDuration =
    plan.endsAt -
    plan.startedAt;


  if (
    Math.abs(
      expectedTotalDuration -
      plan.totalDurationMs
    ) >
      0.001
  ) {
    return false;
  }


  if (
    Math.abs(
      (
        plan.idleDurationMs +
        plan.moveDurationMs
      ) -
      plan.totalDurationMs
    ) >
      0.001
  ) {
    return false;
  }


  return true;
}


/* =========================
   12H-4E-2C
   Travel Completion → Wander Continuity
========================= */

function createGardenWanderContinuityFromCompletedTravel(
  characterId,
  travel
) {
  const spatialPlan =
    travel?.spatialPlan;


  if (
    !isGardenCanonicalTravelSpatialPlanUsable(
      spatialPlan
    )
  ) {
    return null;
  }


  /*
    非常重要：

    Continuity 永遠從
    Travel 真正 canonical completedAt
    開始。

    絕不能使用：
    - Date.now()
    - getGardenWorldNow()
    - Resume 時間
    - 當前 frame 時間

    否則不同 Client
    會建立不同 Timeline。
  */
  const completedAt =
    spatialPlan.completedAt;


  const completedState =
    resolveGardenCanonicalTravelSpatialState(
      spatialPlan,
      completedAt
    );


  if (
    !completedState ||
    completedState.phase !==
      "completed" ||
    !completedState.sceneId ||
    !Number.isFinite(
      completedState.x
    ) ||
    !Number.isFinite(
      completedState.y
    )
  ) {
    return null;
  }


  return (
    createGardenTravelToWanderContinuityPlan({
      characterId,

      sceneId:
        completedState.sceneId,

      startPoint: {
        x:
          completedState.x,

        y:
          completedState.y,
      },

      startDirection:
        completedState.direction ===
          -1
          ? -1
          : 1,

      startedAt:
        completedAt,
    })
  );
}

function createGardenWanderContinuityFromActivitySpot({
  characterId,

  sceneId,

  spotId,

  activityId,

  startedAt,
} = {}) {
  if (
    !characterId ||
    !sceneId ||
    !spotId ||
    !activityId ||
    !isValidGardenWorldTimestamp(
      startedAt
    )
  ) {
    return null;
  }


  /*
    起點永遠重新從正式 Spot Registry 取得。

    不使用：
    - DOM 座標
    - Runtime 當前座標
    - Snapshot 舊座標

    因此即使 Cold Start，
    同一個 Activity End Timestamp
    仍會產生同一份 Continuity。
  */
  const spot =
    getGardenActivitySpot(
      sceneId,
      spotId,
      activityId
    );


  if (!spot) {
    return null;
  }


  return (
    createGardenTravelToWanderContinuityPlan({
      characterId,

      sceneId,

      startPoint: {
        x:
          spot.x,

        y:
          spot.y,
      },

      startDirection:
        spot.direction === -1
          ? -1
          : 1,

      startedAt,
    })
  );
}


function createGardenWanderContinuityFromCurrentPosition(
  characterId,
  startedAt =
    getGardenWorldNow()
) {
  const worldState =
    gardenCharacterWorldState[
      characterId
    ];

  const runtime =
    getGardenCharacterRuntime(
      characterId
    );

  const moveState =
    runtime?.moveState;


  if (
    !worldState?.sceneId ||
    !moveState ||
    !Number.isFinite(
      moveState.x
    ) ||
    !Number.isFinite(
      moveState.y
    ) ||
    !isValidGardenWorldTimestamp(
      startedAt
    )
  ) {
    return null;
  }


  return (
    createGardenTravelToWanderContinuityPlan({
      characterId,

      sceneId:
        worldState.sceneId,

      startPoint: {
        x:
          moveState.x,

        y:
          moveState.y,
      },

      startDirection:
        moveState.direction === -1
          ? -1
          : 1,

      startedAt,
    })
  );
}


function finalizeGardenCanonicalTravelToWander(
  characterId,
  travel
) {
  const worldState =
    gardenCharacterWorldState[
      characterId
    ];


  const runtime =
    getGardenCharacterRuntime(
      characterId
    );


  const spatialPlan =
    travel?.spatialPlan;


  if (
    !worldState ||
    !runtime?.moveState ||
    !isGardenCanonicalTravelSpatialPlanUsable(
      spatialPlan
    )
  ) {
    return Object.freeze({
      ok:
        false,

      characterId,

      reason:
        "completionUnavailable",

      continuityCreated:
        false,
    });
  }


  /*
    永遠重新取得
    EXACT completedAt endpoint。

    不使用 caller 當下那份
    timestamp sample。
  */
  const completedState =
    resolveGardenCanonicalTravelSpatialState(
      spatialPlan,
      spatialPlan.completedAt
    );


  if (
    !completedState ||
    completedState.phase !==
      "completed"
  ) {
    return Object.freeze({
      ok:
        false,

      characterId,

      reason:
        "completedStateUnavailable",

      continuityCreated:
        false,
    });
  }


  const state =
    runtime.moveState;


  /*
    =========================
    Exact Travel Endpoint
    =========================
  */

  worldState.sceneId =
    completedState.sceneId ??
    travel.toSceneId;


  if (
    Number.isFinite(
      completedState.x
    ) &&
    Number.isFinite(
      completedState.y
    )
  ) {
    state.x =
      completedState.x;

    state.y =
      completedState.y;
  }


  if (
    completedState.direction ===
      1 ||
    completedState.direction ===
      -1
  ) {
    state.direction =
      completedState.direction;
  }


  runtime.setPath?.([]);

  state.path =
    [];

  state.isMoving =
    false;


  if (
    runtime.autoState
  ) {
    runtime.autoState.wasMoving =
      false;
  }


  /*
    先建立 Continuity Plan。

    即使現在實際時間
    已經晚於 endsAt，
    也仍然建立同一份 plan。

    下一次 Wander Resolve
    會自行發現它已完成，
    並直接切回 Standard Wander。
  */
  const continuityPlan =
    createGardenWanderContinuityFromCompletedTravel(
      characterId,
      travel
    );


  /*
    Semantic Travel 正式結束。
  */
  worldState.travel =
    null;


  setGardenCharacterActivity(
    characterId,
    GARDEN_CHARACTER_ACTIVITY
      .WANDER,
    null
  );


  /*
    setGardenCharacterActivity(WANDER)
    不會清掉 Continuity。

    在 Activity transition 完成後
    再正式掛上 Plan。
  */
  worldState.wanderContinuity =
    continuityPlan;


  return Object.freeze({
    ok:
      true,

    characterId,

    reason:
      continuityPlan
        ? "continuityCreated"
        : "continuityUnavailable",

    sceneId:
      worldState.sceneId,

    completedAt:
      spatialPlan.completedAt,

    continuityCreated:
      !!continuityPlan,

    continuityEndsAt:
      continuityPlan?.endsAt ??
      null,

    completedState,

    continuityPlan,
  });
}



function runGardenTravelToWanderContinuitySelfTest() {
  const characterId =
    "chifuyu";


  const route =
    getGardenCharacterTravelRoute(
      "courtyard",
      "moonBridge"
    );


  if (!route) {
    const result = {
      pass:
        false,

      reason:
        "routeMissing",
    };


    console.warn(
      "[Garden Travel → Wander Continuity Self-Test] FAIL",
      result
    );


    return result;
  }


  const entrance =
    route
      .entranceByCharacter?.[
        characterId
      ];


  if (!entrance?.enter) {
    const result = {
      pass:
        false,

      reason:
        "entranceMissing",
    };


    console.warn(
      "[Garden Travel → Wander Continuity Self-Test] FAIL",
      result
    );


    return result;
  }


  /*
    故意選在 slot 中間，
    不依賴目前真實時間。
  */
  const startedAt =
    Date.parse(
      "2026-09-23T12:00:37+09:00"
    );


  const plan =
    createGardenTravelToWanderContinuityPlan({
      characterId,

      sceneId:
        "moonBridge",

      startPoint:
        entrance.enter,

      startDirection:
        route.entranceDirection,

      startedAt,
    });


  if (!plan) {
    const result = {
      pass:
        false,

      reason:
        "planBuildFailed",
    };


    console.warn(
      "[Garden Travel → Wander Continuity Self-Test] FAIL",
      result
    );


    return result;
  }


  const atStart =
    resolveGardenTravelToWanderContinuity(
      plan,
      plan.startedAt
    );


  const atEnd =
    resolveGardenTravelToWanderContinuity(
      plan,
      plan.endsAt
    );


  /*
    Continuity 結束的同一瞬間，
    查詢正式 Wander Timeline。
  */
  const standardWanderResolution =
    resolveGardenDeterministicWanderAtTimestamp(
      characterId,
      plan.sceneId,
      plan.endsAt
    );


  const standardWanderPosition =
    resolveGardenDeterministicWanderPosition(
      standardWanderResolution
    );


  const endCalendar =
    getGardenWorldCalendarParts(
      plan.endsAt
    );


  const serialized =
    JSON.stringify(
      plan
    );


  const restored =
    JSON.parse(
      serialized
    );


  const restoredEnd =
    resolveGardenTravelToWanderContinuity(
      restored,
      restored.endsAt
    );


  const epsilon =
    0.000001;


  const checks = {
    planCreated:
      !!plan,


    futureBoundary:
      plan.endsAt >
      plan.startedAt,


    enoughWalkingTime:
      plan.moveDurationMs <=
      plan.totalDurationMs,


    nonNegativeIdle:
      plan.idleDurationMs >=
      0,


    startsAtTravelArrival:
      Math.abs(
        atStart.x -
        entrance.enter.x
      ) <
        epsilon &&

      Math.abs(
        atStart.y -
        entrance.enter.y
      ) <
        epsilon,


    startIdle:
      atStart.isMoving ===
        false,


    endsCompleted:
      atEnd.phase ===
        "completed" &&

      atEnd.completed ===
        true,


    /*
      endsAt 必須正好落在
      Wander slot boundary。
    */
    endsAtSlotBoundary:
      !!endCalendar &&

      endCalendar.secondOfDay %
        GARDEN_WANDER_SLOT_SECONDS ===
      0,


    /*
      Continuity 的終點，
      必須就是該 Wander Slot
      正式起點。
    */
    standardWanderAvailable:
      !!standardWanderPosition,


    seamlessX:
      !!standardWanderPosition &&

      Math.abs(
        atEnd.x -
        standardWanderPosition.x
      ) <
        epsilon,


    seamlessY:
      !!standardWanderPosition &&

      Math.abs(
        atEnd.y -
        standardWanderPosition.y
      ) <
        epsilon,


    targetAnchorMatchesSlot:
      standardWanderResolution
        ?.slot
        ?.fromAnchor
        ?.targetId ===
      plan.targetAnchor.targetId,


    serializable:
      !!serialized,


    reloadStable:
      Math.abs(
        restoredEnd.x -
        atEnd.x
      ) <
        epsilon &&

      Math.abs(
        restoredEnd.y -
        atEnd.y
      ) <
        epsilon,
  };


  const pass =
    Object.values(
      checks
    ).every(
      Boolean
    );


  const result = {
    pass,

    checks,

    plan,

    atStart,

    atEnd,

    standardWanderResolution,

    standardWanderPosition,
  };


  if (pass) {
    console.log(
      "[Garden Travel → Wander Continuity Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Travel → Wander Continuity Self-Test] FAIL",
      result
    );
  }


  return result;
}

function runGardenWanderContinuityPersistenceSelfTest() {
  const characterId =
    "chifuyu";


  const route =
    getGardenCharacterTravelRoute(
      "courtyard",
      "moonBridge"
    );


  const entrance =
    route?.entranceByCharacter?.[
      characterId
    ];


  const startedAt =
    Date.parse(
      "2026-09-23T12:00:37+09:00"
    );


  const plan =
    entrance?.enter
      ? createGardenTravelToWanderContinuityPlan({
          characterId,

          sceneId:
            "moonBridge",

          startPoint:
            entrance.enter,

          startDirection:
            route.entranceDirection,

          startedAt,
        })
      : null;


  const serialized =
    plan
      ? JSON.stringify(
          plan
        )
      : null;


  const restored =
    serialized
      ? JSON.parse(
          serialized
        )
      : null;


  const checks = {
    planCreated:
      !!plan,

    validOriginal:
      isGardenWanderContinuityPlanUsable(
        plan,
        characterId,
        "moonBridge"
      ),

    serializable:
      !!serialized,

    validAfterJson:
      isGardenWanderContinuityPlanUsable(
        restored,
        characterId,
        "moonBridge"
      ),

    wrongCharacterRejected:
      !isGardenWanderContinuityPlanUsable(
        restored,
        "chinatsu",
        "moonBridge"
      ),

    wrongSceneRejected:
      !isGardenWanderContinuityPlanUsable(
        restored,
        characterId,
        "courtyard"
      ),

    timestampStable:
      restored?.startedAt ===
        plan?.startedAt &&
      restored?.moveStartedAt ===
        plan?.moveStartedAt &&
      restored?.endsAt ===
        plan?.endsAt,

    targetStable:
      restored?.targetAnchor
        ?.targetId ===
      plan?.targetAnchor
        ?.targetId,
  };


  const pass =
    Object.values(
      checks
    ).every(
      Boolean
    );


  const result = {
    pass,

    checks,

    plan,

    restored,
  };


  if (pass) {
    console.log(
      "[Garden Wander Continuity Persistence Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Wander Continuity Persistence Self-Test] FAIL",
      result
    );
  }


  return result;
}



function runGardenWanderContinuityRuntimeSelfTest() {
  const characterId =
    "chifuyu";


  const route =
    getGardenCharacterTravelRoute(
      "courtyard",
      "moonBridge"
    );


  const entrance =
    route?.entranceByCharacter?.[
      characterId
    ];


  const startedAt =
    Date.parse(
      "2026-09-23T12:00:37+09:00"
    );


  const plan =
    entrance?.enter
      ? createGardenTravelToWanderContinuityPlan({
          characterId,

          sceneId:
            "moonBridge",

          startPoint:
            entrance.enter,

          startDirection:
            route.entranceDirection,

          startedAt,
        })
      : null;


  if (!plan) {
    const result = {
      pass:
        false,

      reason:
        "planBuildFailed",
    };


    console.warn(
      "[Garden Wander Continuity Runtime Self-Test] FAIL",
      result
    );


    return result;
  }


  /*
    不碰真實角色 World State。
  */
  const fakeWorldState = {
    sceneId:
      "moonBridge",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,

    activityData:
      null,

    wanderContinuity:
      JSON.parse(
        JSON.stringify(
          plan
        )
      ),

    travel:
      null,
  };


  /*
    Continuity MOVE 中間取樣。

    若 path 恰好為 0 長度，
    就退回 idle 區段測試。
  */
  const activeTimestamp =
    plan.moveDurationMs > 0
      ? plan.moveStartedAt +
        plan.moveDurationMs *
          0.5
      : plan.startedAt;


  const activeResult =
    resolveGardenCanonicalWanderSpatialSource(
      characterId,
      fakeWorldState,
      activeTimestamp
    );


  const continuityStillExists =
    !!fakeWorldState
      .wanderContinuity;


  /*
    到達 boundary 的同一 timestamp。

    Resolver 應：
    1. 清掉 Continuity
    2. 直接回 Standard Wander
  */
  const boundaryResult =
    resolveGardenCanonicalWanderSpatialSource(
      characterId,
      fakeWorldState,
      plan.endsAt
    );


  const standardDirect =
    resolveGardenWanderRuntimeSampleAtTimestamp(
      characterId,
      "moonBridge",
      plan.endsAt
    );


  const epsilon =
    0.000001;


  const checks = {
    planCreated:
      !!plan,


    activeUsesContinuity:
      activeResult?.source ===
        "continuity",


    activeSampleAvailable:
      Number.isFinite(
        activeResult?.sample?.x
      ) &&
      Number.isFinite(
        activeResult?.sample?.y
      ),


    activeContinuityPreserved:
      continuityStillExists,


    boundaryUsesStandard:
      boundaryResult?.source ===
        "standard",


    boundaryContinuityCleared:
      fakeWorldState
        .wanderContinuity ===
      null,


    boundaryStandardAvailable:
      !!standardDirect &&
      !!boundaryResult?.sample,


    /*
      同一 timestamp：

      handoff 後的結果
      必須與直接 Standard Wander
      完全一致。
    */
    boundaryXStable:
      !!standardDirect &&
      Math.abs(
        boundaryResult.sample.x -
        standardDirect.x
      ) <
        epsilon,


    boundaryYStable:
      !!standardDirect &&
      Math.abs(
        boundaryResult.sample.y -
        standardDirect.y
      ) <
        epsilon,


    boundaryMovementStable:
      !!standardDirect &&
      boundaryResult.sample
        .isMoving ===
      standardDirect.isMoving,
  };


  const pass =
    Object.values(
      checks
    ).every(
      Boolean
    );


  const result = {
    pass,

    checks,

    plan,

    activeResult,

    boundaryResult,

    standardDirect,

    finalFakeWorldState:
      fakeWorldState,
  };


  if (pass) {
    console.log(
      "[Garden Wander Continuity Runtime Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Wander Continuity Runtime Self-Test] FAIL",
      result
    );
  }


  return result;
}


function isGardenCanonicalTravelSpatialPlanUsable(
  plan
) {
  if (
    !plan ||
    typeof plan !==
      "object"
  ) {
    return false;
  }


  if (
    plan.schema !==
      GARDEN_TRAVEL_SPATIAL_PLAN_SCHEMA ||
    plan.version !==
      GARDEN_TRAVEL_SPATIAL_PLAN_VERSION
  ) {
    return false;
  }


  if (
    !isValidGardenWorldTimestamp(
      plan.startedAt
    ) ||
    !isValidGardenWorldTimestamp(
      plan.completedAt
    )
  ) {
    return false;
  }


  if (
    !plan.exit ||
    !plan.transit ||
    !plan.entrance
  ) {
    return false;
  }


  const timestamps = [
    plan.exit.startedAt,
    plan.exit.endsAt,

    plan.transit.startedAt,
    plan.transit.endsAt,

    plan.entrance.startedAt,
    plan.entrance.endsAt,
  ];


  if (
    !timestamps.every(
      isValidGardenWorldTimestamp
    )
  ) {
    return false;
  }


  /*
    Phase boundaries 必須連續。

    walkingToExit
        ↓
    transit
        ↓
    walkingFromEntrance
  */
  if (
    plan.exit.endsAt !==
      plan.transit.startedAt ||

    plan.transit.endsAt !==
      plan.entrance.startedAt ||

    plan.entrance.endsAt !==
      plan.completedAt
  ) {
    return false;
  }


  return true;
}


function canGardenCharacterUseCanonicalTravelRuntime(
  characterId,
  worldStateOverride = null
) {
  if (
    !GARDEN_CANONICAL_TRAVEL_RUNTIME_ENABLED
  ) {
    return false;
  }


  const worldState =
    worldStateOverride ??
    gardenCharacterWorldState[
      characterId
    ];


  if (!worldState) {
    return false;
  }


  if (
  getGardenCharacterActivityOwnership(
    characterId,
    worldState
  )?.owner !==
    GARDEN_CHARACTER_ACTIVITY_OWNER
      .TRAVEL
) {
  return false;
}


  const travel =
    worldState.travel;


  if (!travel) {
    return false;
  }


  return (
    isGardenCanonicalTravelSpatialPlanUsable(
      travel.spatialPlan
    )
  );
}

function applyGardenCanonicalTravelRuntimeForCharacter(
  characterId,
  timestamp =
    getGardenWorldNow()
) {
  const worldState =
    gardenCharacterWorldState[
      characterId
    ];


  const runtime =
    getGardenCharacterRuntime(
      characterId
    );


  if (
    !worldState ||
    !runtime ||
    !runtime.moveState
  ) {
    return Object.freeze({
      characterId,

      owned:
        false,

      applied:
        false,

      completed:
        false,

      reason:
        "runtimeUnavailable",

      canonicalState:
        null,
    });
  }


  if (
    !canGardenCharacterUseCanonicalTravelRuntime(
      characterId
    )
  ) {
    return Object.freeze({
      characterId,

      owned:
        false,

      applied:
        false,

      completed:
        false,

      reason:
        "notCanonicalTravel",

      canonicalState:
        null,
    });
  }


  const travel =
    worldState.travel;


  const plan =
    travel.spatialPlan;


  const canonicalState =
    resolveGardenCanonicalTravelSpatialState(
      plan,
      timestamp
    );


  /*
    Plan 明明有效卻無法 Resolve：

    不允許偷偷退回 Local Simulation。

    否則不同 Client
    又可能開始分岔。
  */
  if (!canonicalState) {
    return Object.freeze({
      characterId,

      owned:
        true,

      applied:
        false,

      completed:
        false,

      reason:
        "canonicalResolveFailed",

      canonicalState:
        null,
    });
  }


  const state =
    runtime.moveState;


  const previousSceneId =
    worldState.sceneId;


  /*
    Canonical Travel
    絕對不使用 local path queue。
  */
  runtime.setPath?.([]);


  state.path =
    [];

  state.isMoving =
    false;


  if (
    runtime.autoState
  ) {
    runtime.autoState.wasMoving =
      false;
  }


  /*
    =========================
    Completed
    =========================

    整趟 Travel 已經結束。
  */
  if (
  canonicalState.phase ===
    "completed"
) {
  const completion =
    finalizeGardenCanonicalTravelToWander(
      characterId,
      travel
    );


  /*
    Live Runtime 才需要處理 View visibility。

    Finalizer 本身保持純 World State。
  */
  if (
    completion.ok &&
    previousSceneId !==
      worldState.sceneId
  ) {
    updateGardenCharacterVisibility();
  }



/*
  Canonical Travel 已正式完成。

  如果目前仍有有效 Schedule，
  立刻接續下一階段，例如：

  Travel
  → Afternoon Rest
  → Activity Spot Approach

  不再等待下一次
  30 秒 World Live Tick。
*/
const scheduleContinuation =
  completion.ok
    ? continueGardenCharacterScheduleAfterTravel(
        characterId,
        timestamp
      )
    : null;


  return Object.freeze({
    characterId,

    owned:
      true,

    applied:
      completion.ok,

    completed:
      true,

    reason:
      completion.ok
        ? "canonicalTravelCompleted"
        : "canonicalTravelCompletionFailed",

    sceneId:
      worldState.sceneId,

    continuityCreated:
      completion.continuityCreated,

    continuityEndsAt:
      completion.continuityEndsAt,

    canonicalState,

    completion,

    scheduleContinuation,
  });
}


  /*
    =========================
    Active Travel
    =========================
  */

  travel.phase =
    canonicalState.phase;


  /*
    舊 Timeline 欄位先同步成
    Canonical Plan 的值。

    這些欄位目前還有
    Debug / Legacy Reconciliation
    會讀取，所以暫時保留。
  */
  travel.transitStartedAt =
    plan.transit.startedAt;


  travel.expectedArrivalAt =
    plan.transit.endsAt;


  if (
    canonicalState.phase ===
      "walkingToExit"
  ) {
    travel.phaseStartedAt =
      plan.exit.startedAt;

    travel.arrivedAt =
      null;
  }


  if (
    canonicalState.phase ===
      "transit"
  ) {
    travel.phaseStartedAt =
      plan.transit.startedAt;

    travel.arrivedAt =
      null;
  }


  if (
    canonicalState.phase ===
      "walkingFromEntrance"
  ) {
    travel.phaseStartedAt =
      plan.entrance.startedAt;


    /*
      arrivedAt 的既有語意是：
      正式進入目的 Scene 的時間。

      不是入口 walk 完成時間。
    */
    travel.arrivedAt =
      plan.entrance.startedAt;
  }


  /*
    performance.now() 的 transitUntil
    已經不再是 Ground Truth。
  */
  travel.transitUntil =
    0;


  /*
    Scene ownership
    直接來自 Canonical Timeline。
  */
  worldState.sceneId =
    canonicalState.sceneId;


  /*
    Transit 本身沒有可觀看位置。

    這時不把 moveState.x/y
    改成 null，避免舊 renderer
    遇到非數字。

    sceneId = null 已經足以
    讓角色不可見。
  */
  if (
    Number.isFinite(
      canonicalState.x
    ) &&
    Number.isFinite(
      canonicalState.y
    )
  ) {
    state.x =
      canonicalState.x;

    state.y =
      canonicalState.y;
  }


  if (
    canonicalState.direction ===
      1 ||
    canonicalState.direction ===
      -1
  ) {
    state.direction =
      canonicalState.direction;
  }


  state.isMoving =
    canonicalState.isMoving ===
      true;


  if (
    previousSceneId !==
    worldState.sceneId
  ) {
    updateGardenCharacterVisibility();
  }


  return Object.freeze({
    characterId,

    owned:
      true,

    applied:
      true,

    completed:
      false,

    reason:
      "canonicalTravel",

    sceneId:
      worldState.sceneId,

    phase:
      canonicalState.phase,

    canonicalState,
  });
}


function updateGardenCanonicalTravelRuntime(
  timestamp =
    getGardenWorldNow()
) {
  const chifuyu =
    applyGardenCanonicalTravelRuntimeForCharacter(
      "chifuyu",
      timestamp
    );


  const chinatsu =
    applyGardenCanonicalTravelRuntimeForCharacter(
      "chinatsu",
      timestamp
    );


  return Object.freeze({
    timestamp,

    chifuyu,

    chinatsu,
  });
}

function inspectGardenCanonicalTravelRuntime(
  characterId =
    "chifuyu"
) {
  const worldState =
    gardenCharacterWorldState[
      characterId
    ];


  const runtime =
    getGardenCharacterRuntime(
      characterId
    );


  const travel =
    worldState?.travel;


  const timestamp =
    getGardenWorldNow();


  const owned =
    canGardenCharacterUseCanonicalTravelRuntime(
      characterId
    );


  const canonicalState =
    owned
      ? resolveGardenCanonicalTravelSpatialState(
          travel.spatialPlan,
          timestamp
        )
      : null;


  const info = {
    character:
      characterId,

    activity:
      worldState?.activity ??
      null,

    runtimePhase:
      travel?.phase ??
      null,

    canonicalPhase:
      canonicalState?.phase ??
      null,

    worldScene:
      worldState?.sceneId ??
      null,

    canonicalScene:
      canonicalState?.sceneId ??
      null,

    owned,

    x:
      runtime?.moveState?.x ??
      null,

    y:
      runtime?.moveState?.y ??
      null,

    canonicalX:
      canonicalState?.x ??
      null,

    canonicalY:
      canonicalState?.y ??
      null,

    isMoving:
      runtime?.moveState
        ?.isMoving ??
      null,

    canonicalMoving:
      canonicalState
        ?.isMoving ??
      null,

    localPathLength:
      runtime?.moveState
        ?.path?.length ??
      0,
  };


  console.table([
    info,
  ]);


  return {
    ...info,

    canonicalState,

    spatialPlan:
      travel?.spatialPlan ??
      null,
  };
}


function runGardenCanonicalTravelRuntimeOwnershipSelfTest() {
  const fakeValidPlan = {
    schema:
      GARDEN_TRAVEL_SPATIAL_PLAN_SCHEMA,

    version:
      GARDEN_TRAVEL_SPATIAL_PLAN_VERSION,

    startedAt:
      1000,

    completedAt:
      5000,

    exit: {
      startedAt:
        1000,

      endsAt:
        2000,
    },

    transit: {
      startedAt:
        2000,

      endsAt:
        3000,
    },

    entrance: {
      startedAt:
        3000,

      endsAt:
        5000,
    },
  };


  const fakeTravelState = {
    activity:
      GARDEN_CHARACTER_ACTIVITY
        .TRAVEL,

    travel: {
      fromSceneId:
        "moonBridge",

      toSceneId:
        "courtyard",

      phase:
        "walkingToExit",

      spatialPlan:
        fakeValidPlan,
    },
  };


  const validTravelOwned =
    canGardenCharacterUseCanonicalTravelRuntime(
      "chifuyu",
      fakeTravelState
    );


  const fakeWanderState = {
    ...fakeTravelState,

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,
  };


  const wanderNotOwned =
    !canGardenCharacterUseCanonicalTravelRuntime(
      "chifuyu",
      fakeWanderState
    );


  const fakeLegacyTravelState = {
    activity:
      GARDEN_CHARACTER_ACTIVITY
        .TRAVEL,

    travel: {
      fromSceneId:
        "moonBridge",

      toSceneId:
        "courtyard",

      phase:
        "walkingToExit",

      spatialPlan:
        null,
    },
  };


  const legacyTravelNotOwned =
    !canGardenCharacterUseCanonicalTravelRuntime(
      "chifuyu",
      fakeLegacyTravelState
    );


  const brokenBoundaryPlan = {
    ...fakeValidPlan,

    transit: {
      startedAt:
        2500,

      endsAt:
        3000,
    },
  };


  const brokenPlanRejected =
    !isGardenCanonicalTravelSpatialPlanUsable(
      brokenBoundaryPlan
    );


  const checks = {
    featureEnabled:
      GARDEN_CANONICAL_TRAVEL_RUNTIME_ENABLED ===
      true,

    validTravelOwned,

    wanderNotOwned,

    legacyTravelNotOwned,

    brokenPlanRejected,
  };


  const pass =
    Object.values(
      checks
    ).every(
      Boolean
    );


  const result = {
    pass,

    checks,
  };


  if (pass) {
    console.log(
      "[Garden Canonical Travel Runtime Ownership Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Canonical Travel Runtime Ownership Self-Test] FAIL",
      result
    );
  }


  return result;
}




function runGardenCanonicalTravelSpatialPlanSelfTest() {
  const characterId =
    "chifuyu";


  /*
    使用真實 Route Config，
    但完全不修改 Runtime State。
  */
  const route =
    getGardenCharacterTravelRoute(
      "courtyard",
      "moonBridge"
    );


  if (!route) {
    const result = {
      pass:
        false,

      reason:
        "routeMissing",
    };


    console.warn(
      "[Garden Canonical Travel Spatial Plan Self-Test] FAIL",
      result
    );


    return result;
  }


  /*
    使用庭院內合法的測試起點。
  */
  const startPoint = {
    x:
      600,

    y:
      1725,
  };


  const exitTarget =
    route
      .exitByCharacter?.[
        characterId
      ];


  /*
    Courtyard → Moon Bridge
    是 direct exit，
    所以可以直接使用
    scene-aware pathfinding。
  */
  const exitPath =
    exitTarget
      ? findGardenPath(
          startPoint,
          exitTarget,
          route.fromSceneId
        )
      : null;


  if (
    !exitPath ||
    exitPath.length ===
      0
  ) {
    const result = {
      pass:
        false,

      reason:
        "exitPathMissing",
    };


    console.warn(
      "[Garden Canonical Travel Spatial Plan Self-Test] FAIL",
      result
    );


    return result;
  }


  /*
    固定 Absolute World Time。

    不用 Date.now()，
    所以每次測試結果完全一致。
  */
  const startedAt =
    Date.parse(
      "2026-09-23T12:00:00+09:00"
    );


  const planA =
    createGardenCanonicalTravelSpatialPlan({
      characterId,

      route,

      startPoint,

      startDirection:
        1,

      exitPath,

      startedAt,
    });


  /*
    完全相同輸入再建立一次，
    驗證 Deterministic Rebuild。
  */
  const planB =
    createGardenCanonicalTravelSpatialPlan({
      characterId,

      route,

      startPoint,

      startDirection:
        1,

      exitPath,

      startedAt,
    });


  if (
    !planA ||
    !planB
  ) {
    const result = {
      pass:
        false,

      reason:
        "planBuildFailed",
    };


    console.warn(
      "[Garden Canonical Travel Spatial Plan Self-Test] FAIL",
      result
    );


    return result;
  }


  /*
    各 Phase 中間各取一個 timestamp。
  */
  const exitTimestamp =
    planA.exit.startedAt +
    planA.exit.durationMs *
      0.5;


  const transitTimestamp =
    planA.transit.startedAt +
    planA.transit.durationMs *
      0.5;


  const entranceTimestamp =
    planA.entrance.startedAt +
    planA.entrance.durationMs *
      0.5;


  const completedTimestamp =
    planA.completedAt +
    1000;


  const exitState =
    resolveGardenCanonicalTravelSpatialState(
      planA,
      exitTimestamp
    );


  const transitState =
    resolveGardenCanonicalTravelSpatialState(
      planA,
      transitTimestamp
    );


  const entranceState =
    resolveGardenCanonicalTravelSpatialState(
      planA,
      entranceTimestamp
    );


  const completedState =
    resolveGardenCanonicalTravelSpatialState(
      planA,
      completedTimestamp
    );


  const entrance =
    route
      .entranceByCharacter?.[
        characterId
      ];


  /*
    Snapshot / localStorage 模擬。

    Travel Plan 未來會直接存在
    travel state 裡，
    所以必須能完整 JSON serialize。
  */
  const serialized =
    JSON.stringify(
      planA
    );


  const restoredPlan =
    JSON.parse(
      serialized
    );


  const restoredCompletedState =
    resolveGardenCanonicalTravelSpatialState(
      restoredPlan,
      completedTimestamp
    );


  const epsilon =
    0.000001;


  const checks = {
    planCreated:
      !!planA,


    deterministicRebuild:
      JSON.stringify(
        planA
      ) ===
      JSON.stringify(
        planB
      ),


    exitDurationPositive:
      planA.exit
        .durationMs >
      0,


    transitDurationMatches:
      Math.abs(
        planA.transit
          .durationMs -
        GARDEN_CHARACTER_TRAVEL_TRANSIT_MS
      ) <
      epsilon,


    entranceDurationPositive:
      planA.entrance
        .durationMs >
      0,


    /*
      所有 Phase 必須首尾相接。

      不允許：
      gap
      overlap
      local wait
    */
    boundariesMonotonic:
      planA.startedAt <=
        planA.exit.endsAt &&

      planA.exit.endsAt ===
        planA.transit.startedAt &&

      planA.transit.endsAt ===
        planA.entrance.startedAt &&

      planA.entrance.endsAt ===
        planA.completedAt,


    exitPhaseCorrect:
      exitState?.phase ===
        "walkingToExit" &&

      exitState.sceneId ===
        "courtyard" &&

      Number.isFinite(
        exitState.x
      ) &&

      Number.isFinite(
        exitState.y
      ) &&

      exitState.isMoving ===
        true,


    transitPhaseCorrect:
      transitState?.phase ===
        "transit" &&

      transitState.sceneId ===
        null &&

      transitState.x ===
        null &&

      transitState.y ===
        null &&

      transitState.isMoving ===
        false,


    entrancePhaseCorrect:
      entranceState?.phase ===
        "walkingFromEntrance" &&

      entranceState.sceneId ===
        "moonBridge" &&

      Number.isFinite(
        entranceState.x
      ) &&

      Number.isFinite(
        entranceState.y
      ) &&

      entranceState.isMoving ===
        true,


    completedPhaseCorrect:
      completedState?.phase ===
        "completed" &&

      completedState.sceneId ===
        "moonBridge" &&

      completedState.isMoving ===
        false,


    /*
      Travel 最後一定精確停在
      entrance.enter。
    */
    completedAtEntrance:
      !!entrance &&

      Math.abs(
        completedState.x -
        entrance.enter.x
      ) <
        epsilon &&

      Math.abs(
        completedState.y -
        entrance.enter.y
      ) <
        epsilon,


    /*
      Plan 必須可以完整存進
      Garden Snapshot。
    */
    serializable:
      !!serialized &&

      restoredPlan.schema ===
        GARDEN_TRAVEL_SPATIAL_PLAN_SCHEMA,


    /*
      JSON round-trip 之後，
      同一 timestamp
      仍然得到相同世界狀態。
    */
    reloadStateStable:
      !!restoredCompletedState &&

      Math.abs(
        restoredCompletedState.x -
        completedState.x
      ) <
        epsilon &&

      Math.abs(
        restoredCompletedState.y -
        completedState.y
      ) <
        epsilon &&

      restoredCompletedState.phase ===
        completedState.phase,
  };


  const pass =
    Object.values(
      checks
    ).every(
      Boolean
    );


  const result = {
    pass,

    checks,

    plan:
      planA,

    exitState,

    transitState,

    entranceState,

    completedState,
  };


  if (pass) {
    console.log(
      "[Garden Canonical Travel Spatial Plan Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Canonical Travel Spatial Plan Self-Test] FAIL",
      result
    );
  }


  return result;
}



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


  const previousActivity =
    worldState.activity;


  /*
    =========================
    Animation Override Lifecycle
    =========================

    只有「真正換 Activity」時
    才解除舊 Override。

    例如：

    TEA
      sitDown
      ↓
      sitIdle

    TEA 還沒有結束時，
    Override 可以繼續存在。

    但：

    TEA → WANDER

    就必須把 sitIdle 清掉，
    讓新的 Activity 重新取得
    Animation Resolver 控制權。
  */
  if (
  previousActivity !==
  activity
) {
  /*
    ① 舊 Activity 留下的 Override
    不得進入新 Activity。
  */
  clearGardenCharacterAnimationOverride(
    character
  );


  /*
    ② 清掉舊 Activity 的：

    - Sequence Runtime
    - Sequence Requests
    - 普通 Activity Requests

    全部依 ownership 處理。
  */
  if (previousActivity) {
    cancelGardenCharacterAnimationSequencesByActivity(
      character,
      previousActivity
    );
  }
}

  /*
    =========================
    Activity Movement Policy
    =========================
  */

  if (
    previousActivity !==
      activity
  ) {
    const runtime =
      getGardenCharacterRuntime(
        character
      );


    /*
      REST 必須真的停下來。

      如果角色原本正在 Wander path，
      不可以 Activity 已經變 REST，
      人卻繼續往前走。
    */
    if (
      activity ===
        GARDEN_CHARACTER_ACTIVITY
          .REST
    ) {
      runtime?.setPath?.([]);


      if (
        runtime?.autoState
      ) {
        runtime.autoState
          .wasMoving =
          false;
      }
    }


    /*
  從任何非 Wander Activity
  回到 WANDER。
*/
if (
  activity ===
    GARDEN_CHARACTER_ACTIVITY
      .WANDER &&
  previousActivity !==
    GARDEN_CHARACTER_ACTIVITY
      .WANDER
) {
  /*
    Canonical Wander：

    不再重新建立
    local Auto Walk timer。

    同時清掉上一個 Activity
    可能留下的 local path，
    下一個 Garden Runtime Tick
    會直接依 Canonical Time
    重建正確位置。
  */
  if (
    GARDEN_CANONICAL_WANDER_RUNTIME_ENABLED
  ) {
    runtime?.setPath?.([]);


    if (
      runtime?.autoState
    ) {
      runtime.autoState.wasMoving =
        false;
    }
  }

  /*
    Legacy fallback。

    未來若暫時關閉
    Canonical Wander，
    舊行為仍然可以使用。
  */
  else {
    runtime?.resetAutoWalk?.();
  }
}
  }


/*
  Continuity 只屬於 WANDER。

  一旦世界正式進入：
  - TRAVEL
  - CHAT
  - REST
  - 未來其他 Activity

  舊 Continuity 必須失效，
  不准等角色之後回 Wander
  又突然復活。
*/
if (
  activity !==
    GARDEN_CHARACTER_ACTIVITY
      .WANDER
) {
  worldState.wanderContinuity =
    null;
}

/*
  Activity Spot Approach
  只屬於它指定的 Activity。

  例如：
  REST → WANDER
  REST → TRAVEL
  REST → CHAT

  舊 approach 都必須失效。
*/
if (
  worldState.activitySpotApproach &&
  activity !==
    worldState.activitySpotApproach
      .activityId
) {
  worldState.activitySpotApproach =
    null;
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


/* =========================
   Garden Animation Definition

   每個動畫的統一資料格式。

   現階段真正參與播放的仍是：
   - sheetClass
   - frameMs
   - positions

   其他 metadata 先建立規格，
   供未來 Activity / Priority /
   Preload / One-shot 系統使用。
========================= */

function defineGardenAnimation(
  config
) {
  if (!config) {
    console.warn(
      "[Garden Animation] missing animation definition"
    );

    return null;
  }


  const {
    sheetClass,
    frameMs,
    positions,

    /*
      spritesheet 素材資訊
    */
    src,
    logicalSize,

    type = "generic",

    playback = "loop",

    interruptible = true,

    movementAllowed = false,

    preloadTier = "onDemand",

    holdLastFrame = false,
  } = config;


  /*
    目前播放引擎必要欄位。
  */
  if (
    !sheetClass ||
    !Number.isFinite(frameMs) ||
    frameMs <= 0 ||
    !Array.isArray(positions) ||
    positions.length === 0 ||
    !src ||
    !Number.isFinite(logicalSize) ||
    logicalSize <= 0
  ) {
    console.warn(
      "[Garden Animation] invalid animation definition:",
      config
    );

    return null;
  }


  return Object.freeze({
    sheetClass,
    frameMs,
    positions,

    src,
    logicalSize,

    type,
    playback,
    interruptible,
    movementAllowed,
    preloadTier,
    holdLastFrame,
  });
}




const CHIFUYU_ANIMS =
  Object.freeze({
    walk:
      defineGardenAnimation({
        sheetClass:
          CHIFUYU_WALK_SHEET_CLASS,

        frameMs:
          CHIFUYU_WALK_FRAME_MS,

        positions:
          CHIFUYU_FRAME_POSITIONS,

          src:
  CHIFUYU_WALK_SHEET_SRC,

logicalSize:
  GARDEN_WALK_IDLE_LOGICAL_SHEET_SIZE,


        type:
          "locomotion",

        playback:
          "loop",

        interruptible:
          true,

        movementAllowed:
          true,

        preloadTier:
          "core",

        holdLastFrame:
          false,
      }),


    idle:
      defineGardenAnimation({
        sheetClass:
          CHIFUYU_IDLE_SHEET_CLASS,

        frameMs:
          CHIFUYU_IDLE_FRAME_MS,

        positions:
          CHIFUYU_IDLE_FRAME_POSITIONS,

src:
  CHIFUYU_IDLE_SHEET_SRC,

logicalSize:
  GARDEN_WALK_IDLE_LOGICAL_SHEET_SIZE,


        type:
          "idle",

        playback:
          "loop",

        interruptible:
          true,

        movementAllowed:
          false,

        preloadTier:
          "core",

        holdLastFrame:
          false,
      }),


    talk:
      defineGardenAnimation({
        sheetClass:
          CHIFUYU_TALK_SHEET_CLASS,

        frameMs:
          CHIFUYU_TALK_FRAME_MS,

        positions:
          CHIFUYU_TALK_FRAME_POSITIONS,

          src:
  CHIFUYU_TALK_SHEET_SRC,

logicalSize:
  GARDEN_TALK_LOGICAL_SHEET_SIZE,


        type:
          "social",

        playback:
          "loop",

        interruptible:
          true,

        movementAllowed:
          false,

        preloadTier:
          "onDemand",

        holdLastFrame:
          false,
      }),
  });

/* =========================
   Chifuyu Three-Layer Sprite Test

   Idle / Walk / Talk 各自擁有固定 DOM layer。
   background-image 設定一次後永遠不再更換。

   模式切換只改 opacity。
========================= */

const chifuyuSpriteLayers =
  Object.create(null);

let chifuyuSpriteLayersReady = false;


function ensureChifuyuSpriteLayers() {
  if (chifuyuSpriteLayersReady) {
    return true;
  }

  if (!chifuyuWalkTest) {
    return false;
  }


  /*
    原本 #chifuyuWalkTest
    從 sprite 本體改成純容器。

    wrapper 不碰：
    - 位置
    - 翻面
    - 景深

    全部維持原本行為。
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


  delete chifuyuWalkTest.dataset
    .gardenFrozenVisual;


  /*
    注意：
    這裡不再建立 idle / walk / talk。

    只完成 container 初始化。

    真正的動畫 layer
    由 getChifuyuSpriteLayer(mode)
    第一次需要時才建立。
  */
  chifuyuSpriteLayersReady =
    true;


  return true;
}

function createChifuyuSpriteLayer(
  mode
) {
  if (
    !ensureChifuyuSpriteLayers()
  ) {
    return null;
  }


  /*
    已經建立過就直接回傳。
  */
  if (
    chifuyuSpriteLayers[mode]
  ) {
    return chifuyuSpriteLayers[
      mode
    ];
  }


  const anim =
    CHIFUYU_ANIMS[mode];


  /*
    沒有 Animation Definition，
    不建立假的 layer。
  */
  if (!anim) {
    return null;
  }


  const asset =
    getGardenAnimationAsset(
      "chifuyu",
      mode
    );


  if (!asset) {
    return null;
  }


  const layer =
    document.createElement(
      "div"
    );


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


  const warmupKey =
    getGardenAnimationWarmupKey(
      "chifuyu",
      mode
    );


  /*
    只有素材已 warmup 才掛圖片。

    如果尚未完成，
    bindGardenSpriteLayerImage()
    之後會補上。

    同一個 layer 一旦取得圖片，
    後續不會再切換成其他 spritesheet。
  */
  layer.style.backgroundImage =
    gardenAnimationWarmupState[
      warmupKey
    ]
      ? `url("${asset.src}")`
      : "none";


  layer.style.backgroundSize =
    `${asset.logicalSize}px ` +
    `${asset.logicalSize}px`;

  layer.style.backgroundRepeat =
    "no-repeat";

  layer.style.backgroundPosition =
    anim.positions[0];


  /*
    layer 永遠存在，
    顯示切換只使用 opacity。
  */
  layer.style.opacity =
    "0";

  layer.style.transition =
    "none";

  layer.style.transform =
    "none";

  layer.style.transformOrigin =
    "center bottom";


  chifuyuWalkTest.appendChild(
    layer
  );


  chifuyuSpriteLayers[mode] =
    layer;


  return layer;
}


function getChifuyuSpriteLayer(
  mode
) {
  if (
    !ensureChifuyuSpriteLayers()
  ) {
    return null;
  }


  /*
    已存在直接使用。
  */
  if (
    chifuyuSpriteLayers[mode]
  ) {
    return chifuyuSpriteLayers[
      mode
    ];
  }


  /*
    第一次真正需要這個 mode，
    才建立它自己的固定 layer。
  */
  return createChifuyuSpriteLayer(
    mode
  );
}


function showChifuyuSpriteLayer(
  mode
) {
  if (
    !ensureChifuyuSpriteLayers()
  ) {
    return;
  }


  /*
    確保這次真正需要的 layer
    已經存在。
  */
  const targetLayer =
    getChifuyuSpriteLayer(
      mode
    );


  if (!targetLayer) {
    return;
  }


  /*
    不再知道有哪些動畫名稱。

    只遍歷目前真正建立過的 layer。
  */
  for (
    const [
      layerMode,
      layer
    ] of
    Object.entries(
      chifuyuSpriteLayers
    )
  ) {
    if (!layer) continue;


    layer.style.opacity =
      layerMode === mode
        ? "1"
        : "0";
  }
}

/*
  已完成 warmup 的動畫狀態。

  不再預先寫死：
  idle / walk / talk。

  未來例如：
  chifuyuTea
  chinatsuRead
  sanaePray

  都可以在 warmup 完成時
  自動建立自己的 key。
*/
const gardenAnimationWarmupState =
  Object.create(null);

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
  if (
    !character ||
    !mode
  ) {
    return "";
  }


  const safeCharacter =
    String(character).trim();

  const safeMode =
    String(mode).trim();


  if (
    !safeCharacter ||
    !safeMode
  ) {
    return "";
  }


  /*
    保留目前既有 key 格式：

    chifuyu + idle
    → chifuyuIdle

    chifuyu + walk
    → chifuyuWalk

    chinatsu + talk
    → chinatsuTalk

    未來：

    chifuyu + tea
    → chifuyuTea

    chinatsu + swordPractice
    → chinatsuSwordPractice
  */
  const normalizedMode =
    safeMode.charAt(0).toUpperCase() +
    safeMode.slice(1);


  return (
    safeCharacter +
    normalizedMode
  );
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

if (!asset) {
  console.warn(
    `[Garden Animation] warmup asset unavailable: ${character}/${mode}`
  );

  return Promise.resolve(
    false
  );
}


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


function bindGardenSpriteLayerImage(
  character,
  mode
) {
  const asset =
    getGardenAnimationAsset(
      character,
      mode
    );

  let layer = null;

  if (
    character === "chifuyu"
  ) {
    layer =
      getChifuyuSpriteLayer(
        mode
      );
  }

  if (
    character === "chinatsu"
  ) {
    layer =
      getChinatsuSpriteLayer(
        mode
      );
  }

  if (!layer || !asset) {
    return;
  }

  if (
    !layer.style.backgroundImage ||
    layer.style.backgroundImage ===
      "none"
  ) {
    layer.style.backgroundImage =
      `url("${asset.src}")`;

    layer.style.backgroundSize =
      `${asset.logicalSize}px ` +
      `${asset.logicalSize}px`;

    layer.style.backgroundRepeat =
      "no-repeat";
  }
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

  animFinished: false,

  moveSpeed: 150,

  path: [],
  isMoving: false,

  lastTime: performance.now(),
};

function setChifuyuAnimationMode(
  mode,
  force = false
) {
  if (!chifuyuWalkTest) {
    return;
  }


  /*
    不再寫死：
    talk / walk / idle。

    統一交給 Animation Registry
    判斷這個角色是否真的擁有
    requested mode。

    如果不存在，
    Registry 會安全 fallback。
  */
  const safeMode =
    resolveGardenCharacterAnimationFallback(
      "chifuyu",
      mode
    );


  if (!safeMode) {
    return;
  }


  const anim =
    CHIFUYU_ANIMS[
      safeMode
    ];


  /*
    雙重保險：
    Registry 理論上已經確認過，
    但底層 setter 不應假設資料
    永遠完整。
  */
  if (!anim) {
    console.warn(
      `[Garden Animation] missing Chifuyu definition: ${safeMode}`
    );

    return;
  }


  const state =
    chifuyuWalkTestState;


  const warmupKey =
    getGardenAnimationWarmupKey(
      "chifuyu",
      safeMode
    );


  /*
    該動畫尚未 warmup：

    先保持目前畫面，
    同時要求新動畫準備。

    下一幀再次進來時，
    warmup 完成後才正式切換。
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


  /*
    Step 9A 的動態 Layer Manager
    會在第一次真正需要這個動畫時
    建立它自己的固定 layer。
  */
  bindGardenSpriteLayerImage(
    "chifuyu",
    safeMode
  );


  /*
    已經在同一動畫，
    就不要重設 frame clock。
  */
  if (
    !force &&
    state.animMode ===
      safeMode
  ) {
    return;
  }


  state.animMode =
  safeMode;

state.frameIndex =
  0;

state.frameTimer =
  0;

state.animLoopCount =
  0;

state.animFinished =
  false;


  const layer =
    getChifuyuSpriteLayer(
      safeMode
    );


  if (layer) {
    layer.style.backgroundPosition =
      anim.positions[0];
  }


  /*
    只切 layer opacity。

    不 runtime 更換同一 layer
    的 background-image，
    保留 Safari 防閃爍策略。
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
  if (!chifuyuWalkTest) {
    return;
  }


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


  if (
    !anim ||
    !layer
  ) {
    return;
  }


  /*
    =========================
    Talk 專用完成等待
    =========================

    這段保留原本聊天機制。
  */
  if (
    gardenChatState.mode ===
      "chat" &&
    state.animMode ===
      "talk" &&
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


  /*
    =========================
    已完成的 One-shot
    =========================

    播放一次的動畫完成之後，
    就不要再繼續推進 frame。
  */
  if (
    anim.playback ===
      "once" &&
    state.animFinished
  ) {
    return;
  }


  state.frameTimer +=
    deltaMs;


  while (
    state.frameTimer >=
    anim.frameMs
  ) {
    state.frameTimer -=
      anim.frameMs;


    /*
      =========================
      One-shot Animation
      =========================
    */
    if (
      anim.playback ===
        "once"
    ) {
      const lastFrameIndex =
        anim.positions.length - 1;


      /*
        還沒到最後一格：
        正常往下一格前進。
      */
      if (
        state.frameIndex <
        lastFrameIndex
      ) {
        state.frameIndex +=
          1;


        layer.style.backgroundPosition =
          anim.positions[
            state.frameIndex
          ];


        continue;
      }


      /*
        最後一格也完整顯示完畢。

        正式標記：
        這個 One-shot 動畫完成了。
      */
      state.animFinished =
        true;

      state.animLoopCount =
        1;

      state.frameTimer =
        0;


      /*
        holdLastFrame = true
        → 留在最後一格。

        false
        → 回到第一格後停止。
      */
      if (
        !anim.holdLastFrame
      ) {
        state.frameIndex =
          0;


        layer.style.backgroundPosition =
          anim.positions[0];
      }


      return;
    }


    /*
      =========================
      Loop Animation
      =========================

      現有 Idle / Walk / Talk
      都會走這裡。
    */
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


    /*
      =========================
      Talk 專用 Loop 完成判斷
      =========================

      這段也是原本聊天機制，
      不改行為。
    */
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


      state.frameIndex =
        0;

      state.frameTimer =
        0;


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
  route,
  startPointOverride = null
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


  const hasStartPointOverride =
  Number.isFinite(
    startPointOverride?.x
  ) &&
  Number.isFinite(
    startPointOverride?.y
  );


const start =
  hasStartPointOverride
    ? {
        x:
          startPointOverride.x,

        y:
          startPointOverride.y,
      }
    : {
        x:
          state.x,

        y:
          state.y,
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


const arrivedAt =
  getGardenWorldNow();


travel.phaseStartedAt =
  arrivedAt;


/*
  從這一刻開始，
  worldState.sceneId 已經是目的地。

  所以 arrivedAt 的定義是：
  「正式進入目的地世界狀態」
  而不是入口動畫完全走完。
*/
travel.arrivedAt =
  arrivedAt;


updateGardenCharacterVisibility();

  console.log(
    `[Garden Travel] ${character} entering ${travel.toSceneId}`
  );


  return true;
}


function getGardenCharacterTravelTimelineSnapshot(
  character
) {
  const worldState =
    gardenCharacterWorldState[
      character
    ];


  const travel =
    worldState?.travel;


  if (!travel) {
    return null;
  }


  const spatialPlan =
    travel.spatialPlan ??
    null;


  const worldNow =
    getGardenWorldNow();


  const canonicalSpatialState =
    spatialPlan
      ? resolveGardenCanonicalTravelSpatialState(
          spatialPlan,
          worldNow
        )
      : null;



  return {
    character,

    fromSceneId:
      travel.fromSceneId,

    toSceneId:
      travel.toSceneId,

    phase:
      travel.phase,

    startedAt:
      travel.startedAt ??
      null,

    phaseStartedAt:
      travel.phaseStartedAt ??
      null,

    transitStartedAt:
      travel.transitStartedAt ??
      null,

    expectedArrivalAt:
      travel.expectedArrivalAt ??
      null,

    arrivedAt:
      travel.arrivedAt ??
      null,


    /*
      =========================
      Canonical Spatial Plan
      =========================
    */

    hasSpatialPlan:
      !!spatialPlan,


    spatialPlanSchema:
      spatialPlan?.schema ??
      null,


    spatialPlanVersion:
      spatialPlan?.version ??
      null,


    canonicalCompletedAt:
      spatialPlan?.completedAt ??
      null,


    canonicalPhase:
      canonicalSpatialState
        ?.phase ??
      null,


    canonicalSceneId:
      canonicalSpatialState
        ?.sceneId ??
      null,


    canonicalPhaseProgress:
      canonicalSpatialState
        ?.phaseProgress ??
      null,


    canonicalPosition:
      canonicalSpatialState &&
      Number.isFinite(
        canonicalSpatialState.x
      ) &&
      Number.isFinite(
        canonicalSpatialState.y
      )
        ? {
            x:
              canonicalSpatialState.x,

            y:
              canonicalSpatialState.y,

            direction:
              canonicalSpatialState.direction,
          }
        : null,




    /*
      Debug 時順便顯示
      目前離 Travel 開始多久。
    */
    elapsedSinceStartMs:
      isValidGardenWorldTimestamp(
        travel.startedAt
      )
        ? getGardenWorldElapsedMs(
            travel.startedAt
          )
        : null,
  };
}

function inspectGardenCharacterTravelSpatialPlan(
  character =
    "chifuyu"
) {
  const worldState =
    gardenCharacterWorldState[
      character
    ];


  const travel =
    worldState?.travel;


  if (!travel) {
    const result = {
      character,

      traveling:
        false,

      spatialPlan:
        null,

      canonicalState:
        null,
    };


    console.log(
      "[Garden Travel Spatial Plan] not traveling:",
      result
    );


    return result;
  }


  const spatialPlan =
    travel.spatialPlan ??
    null;


  const worldNow =
    getGardenWorldNow();


  const canonicalState =
    spatialPlan
      ? resolveGardenCanonicalTravelSpatialState(
          spatialPlan,
          worldNow
        )
      : null;


  const result = {
    character,

    traveling:
      true,


    runtimePhase:
      travel.phase,


    worldSceneId:
      worldState.sceneId,


    hasSpatialPlan:
      !!spatialPlan,


    canonicalPhase:
      canonicalState?.phase ??
      null,


    canonicalSceneId:
      canonicalState?.sceneId ??
      null,


    canonicalProgress:
      canonicalState
        ?.phaseProgress ??
      null,


    canonicalX:
      canonicalState?.x ??
      null,


    canonicalY:
      canonicalState?.y ??
      null,


    startedAt:
      travel.startedAt ??
      null,


    canonicalCompletedAt:
      spatialPlan
        ?.completedAt ??
      null,


    spatialPlan,

    canonicalState,
  };


  console.table([
    {
      character:
        result.character,

      runtimePhase:
        result.runtimePhase,

      canonicalPhase:
        result.canonicalPhase,

      worldSceneId:
        result.worldSceneId,

      canonicalSceneId:
        result.canonicalSceneId,

      canonicalProgress:
        result.canonicalProgress,

      hasSpatialPlan:
        result.hasSpatialPlan,
    },
  ]);


  return result;
}


function runGardenTravelSpatialPlanPersistenceSelfTest() {
  const characterId =
    "chifuyu";


  const route =
    getGardenCharacterTravelRoute(
      "courtyard",
      "moonBridge"
    );


  if (!route) {
    const result = {
      pass:
        false,

      reason:
        "routeMissing",
    };


    console.warn(
      "[Garden Travel Spatial Plan Persistence Self-Test] FAIL",
      result
    );


    return result;
  }


  const startPoint = {
    x:
      600,

    y:
      1725,
  };


  const exit =
    route.exitByCharacter?.[
      characterId
    ];


  const exitPath =
    exit
      ? findGardenPath(
          startPoint,
          exit,
          route.fromSceneId
        )
      : null;


  if (
    !exitPath ||
    exitPath.length ===
      0
  ) {
    const result = {
      pass:
        false,

      reason:
        "exitPathMissing",
    };


    console.warn(
      "[Garden Travel Spatial Plan Persistence Self-Test] FAIL",
      result
    );


    return result;
  }


  const startedAt =
    Date.parse(
      "2026-09-23T12:00:00+09:00"
    );


  const spatialPlan =
    createGardenCanonicalTravelSpatialPlan({
      characterId,

      route,

      startPoint,

      startDirection:
        1,

      exitPath,

      startedAt,
    });


  if (!spatialPlan) {
    const result = {
      pass:
        false,

      reason:
        "spatialPlanMissing",
    };


    console.warn(
      "[Garden Travel Spatial Plan Persistence Self-Test] FAIL",
      result
    );


    return result;
  }


  /*
    模擬現在 worldState.travel
    實際會保存的結構。
  */
  const travelState = {
    fromSceneId:
      "courtyard",

    toSceneId:
      "moonBridge",

    phase:
      "walkingToExit",

    spatialPlan,

    transitUntil:
      0,

    startedAt,

    phaseStartedAt:
      startedAt,

    transitStartedAt:
      null,

    expectedArrivalAt:
      null,

    arrivedAt:
      null,
  };


  /*
    模擬 Snapshot clone。
  */
  const cloned =
    cloneGardenWorldSerializableValue(
      travelState
    );


  const serialized =
    JSON.stringify(
      cloned
    );


  const restored =
    JSON.parse(
      serialized
    );


  /*
    Reload 很久以後：
    直接取 Entrance 中段。
  */
  const testTimestamp =
    spatialPlan
      .entrance
      .startedAt +
    spatialPlan
      .entrance
      .durationMs *
      0.5;


  const beforeReload =
    resolveGardenCanonicalTravelSpatialState(
      spatialPlan,
      testTimestamp
    );


  const afterReload =
    resolveGardenCanonicalTravelSpatialState(
      restored.spatialPlan,
      testTimestamp
    );


  const epsilon =
    0.000001;


  const checks = {
    spatialPlanCreated:
      !!spatialPlan,


    travelContainsPlan:
      travelState.spatialPlan ===
      spatialPlan,


    cloneContainsPlan:
      cloned?.spatialPlan
        ?.schema ===
      GARDEN_TRAVEL_SPATIAL_PLAN_SCHEMA,


    jsonContainsPlan:
      restored?.spatialPlan
        ?.schema ===
      GARDEN_TRAVEL_SPATIAL_PLAN_SCHEMA,


    versionPreserved:
      restored.spatialPlan
        .version ===
      GARDEN_TRAVEL_SPATIAL_PLAN_VERSION,


    startedAtPreserved:
      restored.spatialPlan
        .startedAt ===
      startedAt,


    completedAtPreserved:
      restored.spatialPlan
        .completedAt ===
      spatialPlan.completedAt,


    reloadPhaseStable:
      beforeReload?.phase ===
        "walkingFromEntrance" &&
      afterReload?.phase ===
        beforeReload.phase,


    reloadPositionStable:
      !!(
        beforeReload &&
        afterReload &&

        Math.abs(
          beforeReload.x -
          afterReload.x
        ) <
          epsilon &&

        Math.abs(
          beforeReload.y -
          afterReload.y
        ) <
          epsilon
      ),
  };


  const pass =
    Object.values(
      checks
    ).every(
      Boolean
    );


  const result = {
    pass,

    checks,

    travelState,

    restored,

    beforeReload,

    afterReload,
  };


  if (pass) {
    console.log(
      "[Garden Travel Spatial Plan Persistence Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Travel Spatial Plan Persistence Self-Test] FAIL",
      result
    );
  }


  return result;
}




function continueGardenCharacterScheduleAfterTravel(
  characterId,
  timestamp =
    getGardenWorldNow()
) {
  if (
    !characterId ||
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return null;
  }


  if (
    typeof gardenWorldScheduleProvider !==
      "function"
  ) {
    return null;
  }


  const schedules =
    gardenWorldScheduleProvider(
      timestamp
    );


  const safeSchedules =
    Array.isArray(schedules)
      ? schedules.filter(
          isValidGardenDailySchedule
        )
      : [];


  if (
    safeSchedules.length ===
    0
  ) {
    return null;
  }


  const worldPoint =
    getGardenScheduleWorldPoint(
      timestamp
    );


  if (!worldPoint) {
    return null;
  }


  return (
    executeGardenCharacterScheduleAtWorldPoint(
      safeSchedules,
      characterId,
      worldPoint,
      {
        worldTimestamp:
          timestamp,
      }
    )
  );
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


   /*
  Runtime Clock：
  現有即時 Travel 照舊。
*/
travel.phase =
  "transit";


travel.transitUntil =
  now +
  GARDEN_CHARACTER_TRAVEL_TRANSIT_MS;


/*
  World Clock：
  記錄這個 Transit
  在真實世界時間上的區間。
*/
const transitStartedAt =
  getGardenWorldNow();


travel.phaseStartedAt =
  transitStartedAt;


travel.transitStartedAt =
  transitStartedAt;


travel.expectedArrivalAt =
  transitStartedAt +
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


/*
  Travel 已正式抵達目標 Scene。

  如果目前仍有有效 Schedule，
  立刻接續下一步，例如：

  Travel
  → Rest Spot Approach

  不再等待下一次
  30 秒 World Live Tick。
*/
continueGardenCharacterScheduleAfterTravel(
  character,
  getGardenWorldNow()
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
  toSceneId,
  options = null
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


  const hasTravelOptions =
  options &&
  typeof options ===
    "object" &&
  !Array.isArray(
    options
  );


const requestedStartedAt =
  (
    hasTravelOptions &&
    isValidGardenWorldTimestamp(
      options.startedAt
    )
  )
    ? options.startedAt
    : null;


const travelTimeline =
  createGardenCharacterTravelTimeline(
    requestedStartedAt
  );


/*
  Historical Schedule Travel：

  如果外部指定 startedAt，
  起點也必須使用那一刻的
  Canonical Wander Position。

  不能拿現在 snapshot 的 x/y
  去建立一趟過去開始的 Travel。
*/
const canonicalStart =
  requestedStartedAt !== null
    ? resolveGardenDeterministicWanderPositionAtTimestamp(
        character,
        fromSceneId,
        travelTimeline.startedAt
      )
    : null;


/*
  有指定 historical startedAt，
  卻無法取得 canonical 起點時，

  不允許偷偷退回目前 runtime 座標。
  否則 Reload / 不同裝置會重新分岔。
*/
if (
  requestedStartedAt !== null &&
  (
    !canonicalStart ||
    !Number.isFinite(
      canonicalStart.x
    ) ||
    !Number.isFinite(
      canonicalStart.y
    )
  )
) {
  console.warn(
    "[Garden Travel] historical canonical start unavailable:",
    character,
    fromSceneId,
    travelTimeline.startedAt
  );

  return false;
}


const travelStartPoint =
  canonicalStart
    ? {
        x:
          canonicalStart.x,

        y:
          canonicalStart.y,
      }
    : {
        x:
          runtime.moveState.x,

        y:
          runtime.moveState.y,
      };


const travelStartDirection =
  canonicalStart?.direction ===
    -1
    ? -1
    : canonicalStart?.direction ===
        1
      ? 1
      : runtime.moveState.direction ===
          -1
        ? -1
        : 1;


const path =
  buildGardenCharacterExitPath(
    character,
    route,
    travelStartPoint
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


const spatialPlan =
  createGardenCanonicalTravelSpatialPlan({
    characterId:
      character,

    route,

    startPoint:
      travelStartPoint,

    startDirection:
      travelStartDirection,

    exitPath:
      path,

    /*
      必須與整趟 Travel
      共用完全同一個 startedAt。
    */
    startedAt:
      travelTimeline.startedAt,

    transitDurationMs:
      GARDEN_CHARACTER_TRAVEL_TRANSIT_MS,
  });


/*
  Canonical Travel 啟用後，
  沒有 Spatial Plan
  就不能偷偷退回純 Local Travel。

  否則不同玩家 / Reload
  又會重新分岔。
*/
if (!spatialPlan) {
  console.warn(
    "[Garden Travel] canonical spatial plan build failed:",
    character,
    fromSceneId,
    "→",
    toSceneId
  );

  return false;
}



/*
  Schedule Bridge 可以明確告訴 Travel：
  「這趟移動底層是為了什麼 Activity」。

  一般手動 Travel 沒有傳入時，
  則沿用 Travel 開始前角色原本的
  semantic activity。
*/
const semanticActivityId =
  (
    hasTravelOptions
      ? options.semanticActivityId
      : null
  ) ??
  getGardenCharacterSemanticActivityId(
    character,
    worldState
  ) ??
  null;



worldState.travel = {
  fromSceneId,
  toSceneId,

  phase:
    "walkingToExit",


      /*
    Canonical Spatial Timeline。

    這是整趟旅行的
    Absolute World-Time Ground Truth。
  */
  spatialPlan,

  /*
    =========================
    Runtime Clock
    =========================

    保留既有 performance.now()
    Transit 流程。
  */
  transitUntil:
    0,


  /*
    =========================
    World Clock Timeline
    =========================
  */
  startedAt:
    travelTimeline.startedAt,

  phaseStartedAt:
    travelTimeline.phaseStartedAt,

  transitStartedAt:
    travelTimeline.transitStartedAt,

  expectedArrivalAt:
    travelTimeline.expectedArrivalAt,

  arrivedAt:
    travelTimeline.arrivedAt,
};


  setGardenCharacterActivity(
  character,
  GARDEN_CHARACTER_ACTIVITY
    .TRAVEL,
  {
    fromSceneId,
    toSceneId,

    semanticActivityId,

    startedAt:
      travelTimeline.startedAt,
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

const CHINATSU_ANIMS =
  Object.freeze({
    walk:
      defineGardenAnimation({
        sheetClass:
          CHINATSU_WALK_SHEET_CLASS,

        frameMs:
          CHINATSU_WALK_FRAME_MS,

        positions:
          CHIFUYU_FRAME_POSITIONS,
src:
  CHINATSU_WALK_SHEET_SRC,

logicalSize:
  GARDEN_WALK_IDLE_LOGICAL_SHEET_SIZE,

        type:
          "locomotion",

        playback:
          "loop",

        interruptible:
          true,

        movementAllowed:
          true,

        preloadTier:
          "core",

        holdLastFrame:
          false,
      }),


    idle:
      defineGardenAnimation({
        sheetClass:
          CHINATSU_IDLE_SHEET_CLASS,

        frameMs:
          CHINATSU_IDLE_FRAME_MS,

        positions:
          CHIFUYU_IDLE_FRAME_POSITIONS,

src:
  CHINATSU_IDLE_SHEET_SRC,

logicalSize:
  GARDEN_WALK_IDLE_LOGICAL_SHEET_SIZE,


        type:
          "idle",

        playback:
          "loop",

        interruptible:
          true,

        movementAllowed:
          false,

        preloadTier:
          "core",

        holdLastFrame:
          false,
      }),


    talk:
      defineGardenAnimation({
        sheetClass:
          CHINATSU_TALK_SHEET_CLASS,

        frameMs:
          CHINATSU_TALK_FRAME_MS,

        positions:
          CHINATSU_TALK_FRAME_POSITIONS,

          src:
  CHINATSU_TALK_SHEET_SRC,

logicalSize:
  GARDEN_TALK_LOGICAL_SHEET_SIZE,

        type:
          "social",

        playback:
          "loop",

        interruptible:
          true,

        movementAllowed:
          false,

        preloadTier:
          "onDemand",

        holdLastFrame:
          false,
      }),
  });

/* =========================
   Chinatsu Three-Layer Sprite
========================= */

const chinatsuSpriteLayers =
  Object.create(null);

let chinatsuSpriteLayersReady = false;


function ensureChinatsuSpriteLayers() {
  if (chinatsuSpriteLayersReady) {
    return true;
  }

  if (!chinatsuWalkTest) {
    return false;
  }


  /*
    原本 sprite 本體改成純容器。
  */
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


  /*
    只初始化 container。

    動畫 layer
    第一次真正需要時才建立。
  */
  chinatsuSpriteLayersReady =
    true;


  return true;
}


function createChinatsuSpriteLayer(
  mode
) {
  if (
    !ensureChinatsuSpriteLayers()
  ) {
    return null;
  }


  if (
    chinatsuSpriteLayers[mode]
  ) {
    return chinatsuSpriteLayers[
      mode
    ];
  }


  const anim =
    CHINATSU_ANIMS[mode];


  if (!anim) {
    return null;
  }


  const asset =
    getGardenAnimationAsset(
      "chinatsu",
      mode
    );


  if (!asset) {
    return null;
  }


  const layer =
    document.createElement(
      "div"
    );


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


  const warmupKey =
    getGardenAnimationWarmupKey(
      "chinatsu",
      mode
    );


  layer.style.backgroundImage =
    gardenAnimationWarmupState[
      warmupKey
    ]
      ? `url("${asset.src}")`
      : "none";


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


  return layer;
}



function getChinatsuSpriteLayer(
  mode
) {
  if (
    !ensureChinatsuSpriteLayers()
  ) {
    return null;
  }


  if (
    chinatsuSpriteLayers[mode]
  ) {
    return chinatsuSpriteLayers[
      mode
    ];
  }


  return createChinatsuSpriteLayer(
    mode
  );
}


function showChinatsuSpriteLayer(
  mode
) {
  if (
    !ensureChinatsuSpriteLayers()
  ) {
    return;
  }


  const targetLayer =
    getChinatsuSpriteLayer(
      mode
    );


  if (!targetLayer) {
    return;
  }


  for (
    const [
      layerMode,
      layer
    ] of
    Object.entries(
      chinatsuSpriteLayers
    )
  ) {
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
  animFinished: false,

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
  if (!chinatsuWalkTest) {
    return;
  }


  /*
    不再限制動畫名稱。

    統一由 Registry 決定
    requested mode 是否存在，
    並處理 fallback。
  */
  const safeMode =
    resolveGardenCharacterAnimationFallback(
      "chinatsu",
      mode
    );


  if (!safeMode) {
    return;
  }


  const anim =
    CHINATSU_ANIMS[
      safeMode
    ];


  if (!anim) {
    console.warn(
      `[Garden Animation] missing Chinatsu definition: ${safeMode}`
    );

    return;
  }


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


  bindGardenSpriteLayerImage(
    "chinatsu",
    safeMode
  );


  if (
    !force &&
    state.animMode ===
      safeMode
  ) {
    return;
  }


  state.animMode =
  safeMode;

state.frameIndex =
  0;

state.frameTimer =
  0;

state.animLoopCount =
  0;

state.animFinished =
  false;


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
  if (!chinatsuWalkTest) {
    return;
  }


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


  if (
    !anim ||
    !layer
  ) {
    return;
  }


  /*
    =========================
    Talk 專用完成等待
    =========================

    保留原本姐妹聊天機制。
  */
  if (
    gardenChatState.mode ===
      "chat" &&
    state.animMode ===
      "talk" &&
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


  /*
    =========================
    已完成的 One-shot
    =========================
  */
  if (
    anim.playback ===
      "once" &&
    state.animFinished
  ) {
    return;
  }


  state.frameTimer +=
    deltaMs;


  while (
    state.frameTimer >=
    anim.frameMs
  ) {
    state.frameTimer -=
      anim.frameMs;


    /*
      =========================
      One-shot Animation
      =========================
    */
    if (
      anim.playback ===
        "once"
    ) {
      const lastFrameIndex =
        anim.positions.length - 1;


      /*
        還沒到最後一格，
        繼續往下一格。
      */
      if (
        state.frameIndex <
        lastFrameIndex
      ) {
        state.frameIndex +=
          1;


        layer.style.backgroundPosition =
          anim.positions[
            state.frameIndex
          ];


        continue;
      }


      /*
        最後一格已經完整播放完。
      */
      state.animFinished =
        true;

      state.animLoopCount =
        1;

      state.frameTimer =
        0;


      /*
        true：
        停在最後一格。

        false：
        回第一格後停止。
      */
      if (
        !anim.holdLastFrame
      ) {
        state.frameIndex =
          0;


        layer.style.backgroundPosition =
          anim.positions[0];
      }


      return;
    }


    /*
      =========================
      Loop Animation
      =========================

      現有 Idle / Walk / Talk
      都仍然走這裡。
    */
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


    /*
      =========================
      Talk 專用 Loop 完成判斷
      =========================

      原有聊天結束方式保留。
    */
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


      state.frameIndex =
        0;

      state.frameTimer =
        0;


      layer.style.backgroundPosition =
        anim.positions[0];


      return;
    }
  }
}


/* =========================
   Garden Character Animation Registry

   角色動畫統一註冊層。

   注意：
   這一層目前只負責「登記」與
   提供統一動畫入口。

   不負責：
   - spritesheet 載入
   - warmup
   - sprite layer
   - travel
   - scene
   - movement
   - character visibility

   以上全部仍由原系統處理。
========================= */

const GARDEN_CHARACTER_ANIMATION_REGISTRY =
  new Map();


function registerGardenCharacterAnimation(
  characterId,
  config
) {
  if (!characterId) {
    console.warn(
      "[Garden Animation] missing characterId"
    );

    return false;
  }


  if (!config) {
    console.warn(
      `[Garden Animation] missing config: ${characterId}`
    );

    return false;
  }


  if (!config.animations) {
    console.warn(
      `[Garden Animation] missing animations: ${characterId}`
    );

    return false;
  }


  if (!config.state) {
    console.warn(
      `[Garden Animation] missing state: ${characterId}`
    );

    return false;
  }


  if (
    typeof config.setMode !==
    "function"
  ) {
    console.warn(
      `[Garden Animation] missing setMode(): ${characterId}`
    );

    return false;
  }


  if (
    typeof config.updateFrame !==
    "function"
  ) {
    console.warn(
      `[Garden Animation] missing updateFrame(): ${characterId}`
    );

    return false;
  }


  GARDEN_CHARACTER_ANIMATION_REGISTRY.set(
    characterId,
    {
      id:
        characterId,

      animations:
        config.animations,

      state:
        config.state,

      setMode:
        config.setMode,

      updateFrame:
        config.updateFrame,
    }
  );


  console.log(
    `[Garden Animation] registered: ${characterId}`,
    Object.keys(
      config.animations
    )
  );


  return true;
}


function getGardenCharacterAnimationRuntime(
  characterId
) {
  return (
    GARDEN_CHARACTER_ANIMATION_REGISTRY.get(
      characterId
    ) ||
    null
  );
}

/* =========================
   Garden Animation Runtime Status
========================= */

/*
  取得角色目前真正正在播放的動畫名稱。

  例如：
  "idle"
  "walk"
  "talk"
  未來也可以是：
  "tea"
  "sitDown"
  "swordPractice"
*/
function getGardenCharacterCurrentAnimation(
  characterId
) {
  const runtime =
    getGardenCharacterAnimationRuntime(
      characterId
    );


  if (!runtime) {
    return null;
  }


  return (
    runtime.state?.animMode ||
    null
  );
}


/*
  查詢角色目前動畫是否已完成。

  主要給 playback:"once"
  的動畫使用。

  Loop 動畫正常情況下
  animFinished 會一直是 false。
*/
function isGardenCharacterAnimationFinished(
  characterId,
  expectedMode = null
) {
  const runtime =
    getGardenCharacterAnimationRuntime(
      characterId
    );


  if (!runtime) {
    return false;
  }


  const state =
    runtime.state;


  if (!state) {
    return false;
  }


  /*
    如果有指定 expectedMode，
    必須確認現在仍然是那個動畫。

    這可以避免：

    sitDown 已完成
    → 系統切成 sitIdle
    → 舊邏輯下一幀又誤判
      sitDown 還完成著。
  */
  if (
    expectedMode !== null &&
    state.animMode !==
      expectedMode
  ) {
    return false;
  }


  return (
    state.animFinished ===
    true
  );
}

/* =========================
   Garden Animation Metadata Status
========================= */

/*
  取得角色「目前正在播放」的
  Animation Definition。

  未來其他系統不要直接去讀：

  CHIFUYU_ANIMS[state.animMode]
  CHINATSU_ANIMS[state.animMode]

  統一從 Registry 查。
*/
function getGardenCharacterCurrentAnimationDefinition(
  characterId
) {
  const currentMode =
    getGardenCharacterCurrentAnimation(
      characterId
    );


  if (!currentMode) {
    return null;
  }


  return (
    getGardenCharacterAnimationDefinition(
      characterId,
      currentMode
    ) ||
    null
  );
}


/*
  目前動畫是否允許被其他動畫打斷。
*/
function isGardenCharacterCurrentAnimationInterruptible(
  characterId
) {
  const anim =
    getGardenCharacterCurrentAnimationDefinition(
      characterId
    );


  /*
    找不到 Definition 時保守處理：
    不允許未知動畫被直接打斷。
  */
  if (!anim) {
    return false;
  }


  return (
    anim.interruptible ===
    true
  );
}
/*
  判斷角色現在是否允許
  切換到另一個 Animation。

  規則：

  1. 還沒有動畫
     → 可以

  2. 目標就是目前動畫
     → 可以

  3. force = true
     → 可以

  4. One-shot 已經播放完成
     → 可以進入下一個動畫

  5. 其他情況
     → 看目前動畫的 interruptible
*/
function canGardenCharacterSwitchAnimation(
  characterId,
  nextMode,
  force = false
) {
  const runtime =
    getGardenCharacterAnimationRuntime(
      characterId
    );


  if (!runtime) {
    return false;
  }


  const state =
    runtime.state;


  if (!state) {
    return false;
  }


  const currentMode =
    state.animMode || null;


  /*
    初始化階段還沒有動畫。
  */
  if (!currentMode) {
    return true;
  }


  /*
    每幀 Resolver 都可能要求同一個模式。

    同動畫不算「中斷」。
  */
  if (
    currentMode ===
    nextMode
  ) {
    return true;
  }


  /*
    明確強制切換。

    例如目前 Chat 系統一些
    必須立即成立的切換。
  */
  if (force) {
    return true;
  }


  /*
    One-shot 已經正式播放完，
    即使本身 interruptible:false，
    也必須允許進入下一個動畫。

    否則：

    sitDown finished
    → sitIdle

    會永遠卡在 sitDown。
  */
  if (
    state.animFinished ===
    true
  ) {
    return true;
  }


  /*
    尚未完成時，
    才正式讀取目前動畫的
    interruptible。
  */
  return (
    isGardenCharacterCurrentAnimationInterruptible(
      characterId
    )
  );
}

/*
  目前動畫播放期間，
  是否允許角色進行位置移動。
*/
function isGardenCharacterMovementAllowed(
  characterId
) {
  const anim =
    getGardenCharacterCurrentAnimationDefinition(
      characterId
    );


  if (!anim) {
    return false;
  }


  return (
    anim.movementAllowed ===
    true
  );
}

/*
  判斷角色目前是否可以
  真正推進地圖位置。

  和單純讀 movementAllowed 不同：

  Idle → Walk 的起步必須允許，
  否則角色會因為 Idle 本身
  movementAllowed:false 而永遠走不了。
*/
function canGardenCharacterAdvanceMovement(
  characterId
) {
  const runtime =
    getGardenCharacterAnimationRuntime(
      characterId
    );


  if (!runtime) {
    return false;
  }


  const state =
    runtime.state;


  if (!state) {
    return false;
  }


  /*
    沒有 path，
    本來就沒有位置可以推進。
  */
  if (
    !state.path ||
    state.path.length === 0
  ) {
    return false;
  }


  const currentMode =
    state.animMode ||
    null;


  /*
    =========================
    1. Override Movement Rule
    =========================
  */
  const overrideMode =
    getGardenCharacterAnimationOverride(
      characterId
    );


  if (overrideMode) {
    const overrideAnim =
      getGardenCharacterAnimationDefinition(
        characterId,
        overrideMode
      );


    if (!overrideAnim) {
      clearGardenCharacterAnimationOverride(
        characterId
      );

    } else {
      /*
        如果 Override 已經能接管動畫，
        Movement 立刻依 Override 判斷。

        如果目前是不可中斷 One-shot，
        Override 還不能接管，
        就繼續尊重目前動畫。
      */
      const canTakeControl =
        !currentMode ||
        currentMode ===
          overrideMode ||
        canGardenCharacterSwitchAnimation(
          characterId,
          overrideMode,
          false
        );


      if (canTakeControl) {
        return (
          overrideAnim
            .movementAllowed ===
          true
        );
      }
    }
  }


  /*
    =========================
    2. Priority Request Movement Rule
    =========================
  */
  const request =
    getGardenCharacterTopAnimationRequest(
      characterId
    );


  if (request) {
    const requestAnim =
      getGardenCharacterAnimationDefinition(
        characterId,
        request.mode
      );


    if (!requestAnim) {
      clearGardenCharacterAnimationRequest(
        characterId,
        request.source
      );

    } else {
      /*
        Request 必須真的有能力
        取得 Animation 控制權，
        才能改變 Movement 權限。

        例如：

        sitDown
        interruptible:false

        此時普通 walk request
        即使存在，也不能讓角色
        一邊坐下、一邊開始滑動。
      */
      const canTakeControl =
        !currentMode ||
        currentMode ===
          request.mode ||
        canGardenCharacterSwitchAnimation(
          characterId,
          request.mode,
          request.force === true
        );


      if (canTakeControl) {
        return (
          requestAnim
            .movementAllowed ===
          true
        );
      }
    }
  }


  /*
    =========================
    3. Current Animation
    =========================
  */
  const currentAnim =
    getGardenCharacterCurrentAnimationDefinition(
      characterId
    );


  /*
    初始化瞬間。

    已經有 path 的話，
    允許先啟動 Movement。
  */
  if (!currentAnim) {
    return true;
  }


  if (
    currentAnim.movementAllowed ===
    true
  ) {
    return true;
  }


  /*
    Idle → Walk 起步例外。

    Idle 自己不能邊播放邊滑動，
    但只要已經取得 path，
    必須允許第一幀起步。

    下一輪 Resolver 就會因：
    state.isMoving === true

    切成 Walk。
  */
  if (
    currentAnim.type ===
    "idle"
  ) {
    return true;
  }


  return false;
}

/* =========================
   Garden Animation Completion Transitions
========================= */

/*
  動畫播放完成後的轉場規則。

  key：
  characterId:fromMode

  value：
  {
    toMode
  }

  例如未來：

  chifuyu:sitDown
  →
  sitIdle

  chifuyu:standUp
  →
  idle
*/
const GARDEN_ANIMATION_COMPLETION_TRANSITIONS =
  new Map();


function getGardenAnimationCompletionTransitionKey(
  characterId,
  fromMode
) {
  if (
    !characterId ||
    !fromMode
  ) {
    return "";
  }


  return (
    `${characterId}:${fromMode}`
  );
}


/*
  登記：

  某角色的某個動畫播放完後，
  下一個動畫應該是什麼。
*/
function registerGardenAnimationCompletionTransition(
  characterId,
  fromMode,
  toMode
) {
  const key =
    getGardenAnimationCompletionTransitionKey(
      characterId,
      fromMode
    );


  if (
    !key ||
    !toMode
  ) {
    console.warn(
      "[Garden Animation] invalid completion transition:",
      {
        characterId,
        fromMode,
        toMode,
      }
    );

    return false;
  }


  GARDEN_ANIMATION_COMPLETION_TRANSITIONS.set(
    key,
    {
      characterId,
      fromMode,
      toMode,
    }
  );


  return true;
}


/*
  查詢某個動畫完成後，
  是否有指定下一個動畫。
*/
function getGardenAnimationCompletionTransition(
  characterId,
  fromMode
) {
  const key =
    getGardenAnimationCompletionTransitionKey(
      characterId,
      fromMode
    );


  if (!key) {
    return null;
  }


  return (
    GARDEN_ANIMATION_COMPLETION_TRANSITIONS.get(
      key
    ) ||
    null
  );
}


/*
  查看角色「目前」是否已經完成一個
  有 Transition 規則的動畫。

  注意：

  這裡只回傳資料，
  現在還不真正切換動畫。
*/
function getGardenPendingAnimationCompletionTransition(
  characterId
) {
  const currentMode =
    getGardenCharacterCurrentAnimation(
      characterId
    );


  if (!currentMode) {
    return null;
  }


  if (
    !isGardenCharacterAnimationFinished(
      characterId,
      currentMode
    )
  ) {
    return null;
  }


  return (
    getGardenAnimationCompletionTransition(
      characterId,
      currentMode
    )
  );
}

/* =========================
   Garden Animation Override
========================= */

/*
  暫時覆蓋 Activity Resolver
  所決定的動畫。

  用途例如：

  sitDown
  → sitIdle

  在 sitIdle 活動尚未結束前，
  Resolver 不應該下一幀又把角色
  打回一般 idle / walk。
*/
const gardenCharacterAnimationOverrides =
  new Map();


function getGardenCharacterAnimationOverride(
  characterId
) {
  if (!characterId) {
    return null;
  }


  return (
    gardenCharacterAnimationOverrides.get(
      characterId
    ) ||
    null
  );
}


/*
  設定動畫 Override。

  注意：
  Override 只接受角色真正存在的動畫，
  不在這裡做 fallback。

  這樣拼錯動畫名稱時，
  不會偷偷變成 idle。
*/
function setGardenCharacterAnimationOverride(
  characterId,
  mode
) {
  if (
    !characterId ||
    !mode
  ) {
    return false;
  }


  if (
    !hasGardenCharacterAnimation(
      characterId,
      mode
    )
  ) {
    console.warn(
      `[Garden Animation] cannot override "${characterId}" → "${mode}": animation not registered.`
    );

    return false;
  }


  gardenCharacterAnimationOverrides.set(
    characterId,
    mode
  );


  return true;
}


/*
  清除 Override。

  清掉後，
  下一幀重新交還 Activity Resolver：
  CHAT / TRAVEL / WANDER 等系統決定動畫。
*/
function clearGardenCharacterAnimationOverride(
  characterId
) {
  if (!characterId) {
    return false;
  }


  gardenCharacterAnimationOverrides.delete(
    characterId
  );


  return true;
}

/* =========================
   Garden Animation Requests
========================= */

/*
  動畫 Request 優先權。

  數字越大，優先權越高。

  BASELINE
  → 普通 Idle / Walk 等基礎行為

  ACTIVITY
  → Tea / Read / Pray 等正式 Activity

  SEQUENCE
  → Activity 內部的動畫序列

  CRITICAL
  → 未來真正需要立即搶控制權的特殊狀況
*/
const GARDEN_ANIMATION_REQUEST_PRIORITY =
  Object.freeze({
    BASELINE: 0,
    ACTIVITY: 100,
    SEQUENCE: 200,
    CRITICAL: 300,
  });


/*
  characterId
    ↓
  Map(
    sourceId
      ↓
    request
  )

  例如：

  chifuyu
    activity:tea
    sequence:sit
*/
const gardenCharacterAnimationRequests =
  new Map();


let gardenAnimationRequestOrder =
  0;


/*
  取得某角色的 Request Map。

  create = true 時，
  不存在就自動建立。
*/
function getGardenCharacterAnimationRequestMap(
  characterId,
  create = false
) {
  if (!characterId) {
    return null;
  }


  let requestMap =
    gardenCharacterAnimationRequests.get(
      characterId
    );


  if (
    !requestMap &&
    create
  ) {
    requestMap =
      new Map();


    gardenCharacterAnimationRequests.set(
      characterId,
      requestMap
    );
  }


  return (
    requestMap ||
    null
  );
}


/*
  登記一個 Animation Request。
*/
function requestGardenCharacterAnimation(
  characterId,
  mode,
  options = {}
) {
 const {
  source =
    "default",

  owner =
    null,

  sequence =
    null,

  priority =
    GARDEN_ANIMATION_REQUEST_PRIORITY
      .ACTIVITY,

  force =
    false,
} = options;


  if (
    !characterId ||
    !mode ||
    !source
  ) {
    return false;
  }


  /*
    Request 不做 fallback。

    動畫不存在就直接拒絕，
    避免拼錯名稱後偷偷變 Idle。
  */
  if (
    !hasGardenCharacterAnimation(
      characterId,
      mode
    )
  ) {
    console.warn(
      `[Garden Animation] request rejected: ${characterId}/${mode}`
    );

    return false;
  }


  const safePriority =
    Number.isFinite(priority)
      ? priority
      : GARDEN_ANIMATION_REQUEST_PRIORITY
          .ACTIVITY;


  const requestMap =
    getGardenCharacterAnimationRequestMap(
      characterId,
      true
    );


  gardenAnimationRequestOrder +=
    1;


  requestMap.set(
  source,
  {
    characterId,

    mode,

    source,

    owner:
      owner
        ? String(owner)
        : null,

sequence:
  sequence
    ? String(sequence)
    : null,

    priority:
      safePriority,

    force:
      force === true,

    order:
      gardenAnimationRequestOrder,
  }
);


  return true;
}


/*
  清除指定來源的 Request。

  例如：
  clear activity:tea

  但不影響其他系統的 request。
*/
function clearGardenCharacterAnimationRequest(
  characterId,
  source
) {
  const requestMap =
    getGardenCharacterAnimationRequestMap(
      characterId
    );


  if (
    !requestMap ||
    !source
  ) {
    return false;
  }


  const deleted =
    requestMap.delete(
      source
    );


  /*
    角色已經完全沒有 Request，
    順便清掉外層 Map。
  */
  if (
    requestMap.size === 0
  ) {
    gardenCharacterAnimationRequests.delete(
      characterId
    );
  }


  return deleted;
}

/*
  清掉某角色所有屬於指定 Owner
  的 Animation Requests。

  回傳實際刪除數量。
*/
function clearGardenCharacterAnimationRequestsByOwner(
  characterId,
  owner
) {
  if (
    !characterId ||
    !owner
  ) {
    return 0;
  }


  const requestMap =
    getGardenCharacterAnimationRequestMap(
      characterId
    );


  if (!requestMap) {
    return 0;
  }


  const safeOwner =
    String(owner);


  let deletedCount =
    0;


  for (
    const [
      source,
      request
    ] of
    requestMap
  ) {
    if (
      request?.owner !==
      safeOwner
    ) {
      continue;
    }


    requestMap.delete(
      source
    );


    deletedCount +=
      1;
  }


  /*
    全部清空後，
    外層角色 Map 也一起移除。
  */
  if (
    requestMap.size === 0
  ) {
    gardenCharacterAnimationRequests.delete(
      characterId
    );
  }


  return deletedCount;
}

/*
  Activity 專用 Owner Key。

  未來：

  tea
  → activity:tea

  read
  → activity:read

  pray
  → activity:pray
*/
function getGardenActivityAnimationRequestOwner(
  activity
) {
  if (!activity) {
    return null;
  }


  return (
    `activity:${activity}`
  );
}


/*
  Activity 之下的 Sequence Key。

  例如：

  activity = tea
  sequenceId = sit

  ↓

  activity:tea/sequence:sit
*/
function getGardenActivityAnimationSequenceKey(
  activity,
  sequenceId
) {
  if (
    !activity ||
    !sequenceId
  ) {
    return null;
  }


  const activityOwner =
    getGardenActivityAnimationRequestOwner(
      activity
    );


  if (!activityOwner) {
    return null;
  }


  return (
    `${activityOwner}/sequence:${sequenceId}`
  );
}


/*
  只清除指定 Sequence 的 Requests。

  不影響：

  - 同 Activity 的其他 Sequence
  - 同 Activity 的普通 Request
  - 其他 Activity
  - Critical / Event Request
*/
function clearGardenCharacterAnimationRequestsBySequence(
  characterId,
  sequenceKey
) {
  if (
    !characterId ||
    !sequenceKey
  ) {
    return 0;
  }


  const requestMap =
    getGardenCharacterAnimationRequestMap(
      characterId
    );


  if (!requestMap) {
    return 0;
  }


  const safeSequence =
    String(sequenceKey);


  let deletedCount =
    0;


  for (
    const [
      source,
      request
    ] of
    requestMap
  ) {
    if (
      request?.sequence !==
      safeSequence
    ) {
      continue;
    }


    requestMap.delete(
      source
    );


    deletedCount +=
      1;
  }


  if (
    requestMap.size === 0
  ) {
    gardenCharacterAnimationRequests.delete(
      characterId
    );
  }


  return deletedCount;
}

/*
  Activity Sequence 專用動畫要求。

  同一個 Sequence 永遠使用
  同一個 source。

  所以：

  sitDown
    ↓
  sitIdle
    ↓
  standUp

  不會留下三個 Request，
  而是同一筆 Request 不斷更新。
*/
function requestGardenCharacterActivitySequenceAnimation(
  characterId,
  activity,
  sequenceId,
  mode,
  options = {}
) {
  if (
    !characterId ||
    !activity ||
    !sequenceId ||
    !mode
  ) {
    return false;
  }


  const activityOwner =
    getGardenActivityAnimationRequestOwner(
      activity
    );


  const sequenceKey =
    getGardenActivityAnimationSequenceKey(
      activity,
      sequenceId
    );


  if (
    !activityOwner ||
    !sequenceKey
  ) {
    return false;
  }


  /*
    預設使用固定 Sequence Key
    當 source。

    這是刻意的：

    sitDown
    sitIdle
    standUp

    都覆寫同一筆資料。
  */
  const source =
    options.source ||
    sequenceKey;


  return (
    requestGardenCharacterAnimation(
      characterId,
      mode,
      {
        ...options,

        source,

        owner:
          activityOwner,

        sequence:
          sequenceKey,

        priority:
          Number.isFinite(
            options.priority
          )
            ? options.priority
            : GARDEN_ANIMATION_REQUEST_PRIORITY
                .SEQUENCE,
      }
    )
  );
}


function clearGardenCharacterActivityAnimationSequence(
  characterId,
  activity,
  sequenceId
) {
  const sequenceKey =
    getGardenActivityAnimationSequenceKey(
      activity,
      sequenceId
    );


  if (!sequenceKey) {
    return 0;
  }


  return (
    clearGardenCharacterAnimationRequestsBySequence(
      characterId,
      sequenceKey
    )
  );
}




/* =========================
   Garden Animation Sequence Phases
========================= */

const GARDEN_ANIMATION_SEQUENCE_PHASE =
  Object.freeze({
    ENTER: "enter",
    HOLD: "hold",
    EXIT: "exit",
  });


/*
  如果 Step 有明確指定 phase，
  就使用指定值。

  沒指定時自動判斷：

  單一步驟
    → hold

  第一步
    → enter

  最後一步
    → exit

  中間步驟
    → hold
*/
function resolveGardenAnimationSequenceStepPhase(
  step,
  index,
  totalSteps
) {
  const explicitPhase =
    step?.phase;


  if (
    explicitPhase ===
      GARDEN_ANIMATION_SEQUENCE_PHASE.ENTER ||
    explicitPhase ===
      GARDEN_ANIMATION_SEQUENCE_PHASE.HOLD ||
    explicitPhase ===
      GARDEN_ANIMATION_SEQUENCE_PHASE.EXIT
  ) {
    return explicitPhase;
  }


  if (
    totalSteps <= 1
  ) {
    return (
      GARDEN_ANIMATION_SEQUENCE_PHASE
        .HOLD
    );
  }


  if (index === 0) {
    return (
      GARDEN_ANIMATION_SEQUENCE_PHASE
        .ENTER
    );
  }


  if (
    index ===
    totalSteps - 1
  ) {
    return (
      GARDEN_ANIMATION_SEQUENCE_PHASE
        .EXIT
    );
  }


  return (
    GARDEN_ANIMATION_SEQUENCE_PHASE
      .HOLD
  );
}





/* =========================
   Garden Animation Sequence Controller
========================= */
/*
  儲存目前正在執行的 Sequence。

  key:
    characterId|activity|sequenceId
*/
const gardenCharacterAnimationSequences =
  new Map();


function getGardenCharacterAnimationSequenceKey(
  characterId,
  activity,
  sequenceId
) {
  if (
    !characterId ||
    !activity ||
    !sequenceId
  ) {
    return "";
  }


  return (
    `${characterId}|${activity}|${sequenceId}`
  );
}


/*
  取得 Sequence Runtime。
*/
function getGardenCharacterAnimationSequence(
  characterId,
  activity,
  sequenceId
) {
  const key =
    getGardenCharacterAnimationSequenceKey(
      characterId,
      activity,
      sequenceId
    );


  if (!key) {
    return null;
  }


  return (
    gardenCharacterAnimationSequences.get(
      key
    ) ||
    null
  );
}


/*
  =========================
  Garden Animation Sequence Events
  =========================
*/

/*
  建立給外部 Controller 使用的
  Sequence Event Snapshot。

  不直接把 sequence Runtime
  本體傳出去，避免外部誤改。
*/
function createGardenCharacterAnimationSequenceEvent(
  sequence,
  eventType,
  reason = null
) {
  if (!sequence) {
    return null;
  }


  const currentStep =
    sequence.steps[
      sequence.index
    ] ||
    null;


  return {
    type:
      eventType,

    reason,

    characterId:
      sequence.characterId,

    activity:
      sequence.activity,

    sequenceId:
      sequence.sequenceId,

    index:
      sequence.index,

    stepCount:
      sequence.steps.length,

    mode:
      currentStep?.mode ||
      null,

    phase:
      currentStep?.phase ||
      null,

    advance:
      currentStep?.advance ||
      null,

    force:
      currentStep?.force ===
      true,

    startedAt:
      sequence.startedAt,

    phaseStartedAt:
      sequence.phaseStartedAt,
  };
}

/*
  安全執行 Sequence Callback。

  Callback 自己出錯時，
  不允許把 Garden 主循環炸掉。
*/
function emitGardenCharacterAnimationSequenceEvent(
  sequence,
  callbackName,
  eventType,
  reason = null
) {
  if (!sequence) {
    return false;
  }


  const callback =
    sequence.callbacks?.[
      callbackName
    ];


  if (
    typeof callback !==
    "function"
  ) {
    return false;
  }


  const event =
    createGardenCharacterAnimationSequenceEvent(
      sequence,
      eventType,
      reason
    );


  try {
    callback(event);
  } catch (err) {
    console.error(
      `[Garden Animation] Sequence ${eventType} callback failed:`,
      err
    );
  }


  return true;
}


/*
  啟動一串 Animation Sequence。

  steps 格式：

  [
    {
      mode: "sitDown",
      advance: "complete"
    },

    {
      mode: "sitIdle",
      advance: "manual"
    },

    {
      mode: "standUp",
      advance: "complete"
    }
  ]

  advance:

  "complete"
    → 動畫 finished 後自動下一步

  "manual"
    → 停在這一步，
      等外部 Controller 要求前進
*/
function startGardenCharacterAnimationSequence(
  characterId,
  activity,
  sequenceId,
  steps,
  options = {}
) {
  if (
    !characterId ||
    !activity ||
    !sequenceId ||
    !Array.isArray(steps) ||
    steps.length === 0
  ) {
    return false;
  }


  /*
    每一步的動畫都必須存在。

    Sequence 不做 fallback，
    避免配置錯誤後偷偷播 Idle。
  */
  for (const step of steps) {
    if (
      !step ||
      !step.mode ||
      !hasGardenCharacterAnimation(
        characterId,
        step.mode
      )
    ) {
      console.warn(
        "[Garden Animation] invalid sequence step:",
        {
          characterId,
          activity,
          sequenceId,
          step,
        }
      );

      return false;
    }
  }


  const key =
    getGardenCharacterAnimationSequenceKey(
      characterId,
      activity,
      sequenceId
    );


  const sequence = {
    key,

    characterId,

    activity,

    sequenceId,

   steps:
  steps.map(
    (
      step,
      index,
      allSteps
    ) => ({
      mode:
        step.mode,

      phase:
        resolveGardenAnimationSequenceStepPhase(
          step,
          index,
          allSteps.length
        ),

      advance:
        step.advance ===
          "complete"
          ? "complete"
          : "manual",

      force:
        step.force === true,
    })
  ),

    index:
      0,

    finished:
      false,

    startedAt:
  performance.now(),

phaseStartedAt:
  performance.now(),


callbacks: {
  onStepEnter:
    typeof options.onStepEnter ===
      "function"
      ? options.onStepEnter
      : null,

  onComplete:
    typeof options.onComplete ===
      "function"
      ? options.onComplete
      : null,

  onCancel:
    typeof options.onCancel ===
      "function"
      ? options.onCancel
      : null,
},


priority:
      Number.isFinite(
        options.priority
      )
        ? options.priority
        : GARDEN_ANIMATION_REQUEST_PRIORITY
            .SEQUENCE,
  };


  gardenCharacterAnimationSequences.set(
    key,
    sequence
  );


  /*
    立即送出第一步。
  */
  const firstStep =
    sequence.steps[0];


  const requested =
    requestGardenCharacterActivitySequenceAnimation(
      characterId,
      activity,
      sequenceId,
      firstStep.mode,
      {
        priority:
          sequence.priority,

        force:
          firstStep.force,
      }
    );


  if (!requested) {
  gardenCharacterAnimationSequences.delete(
    key
  );

  return false;
}


/*
  第一個 Step 已成功建立 Request，
  現在才通知外部。
*/
emitGardenCharacterAnimationSequenceEvent(
  sequence,
  "onStepEnter",
  "stepEnter"
);


return true;
}

function getGardenCharacterAnimationSequenceCurrentStep(
  characterId,
  activity,
  sequenceId
) {
  const sequence =
    getGardenCharacterAnimationSequence(
      characterId,
      activity,
      sequenceId
    );


  if (
    !sequence ||
    sequence.finished
  ) {
    return null;
  }


  return (
    sequence.steps[
      sequence.index
    ] ||
    null
  );
}


/*
  取得 Sequence 目前 Phase。

  回傳：

  "enter"
  "hold"
  "exit"

  Sequence 不存在時：
  null
*/
function getGardenCharacterAnimationSequencePhase(
  characterId,
  activity,
  sequenceId
) {
  const currentStep =
    getGardenCharacterAnimationSequenceCurrentStep(
      characterId,
      activity,
      sequenceId
    );


  return (
    currentStep?.phase ||
    null
  );
}


/*
  判斷 Sequence 是否正在指定 Phase。
*/
function isGardenCharacterAnimationSequencePhase(
  characterId,
  activity,
  sequenceId,
  expectedPhase
) {
  if (!expectedPhase) {
    return false;
  }


  return (
    getGardenCharacterAnimationSequencePhase(
      characterId,
      activity,
      sequenceId
    ) ===
    expectedPhase
  );
}


/*
  給高階 Activity Controller
  一次取得完整 Sequence 狀態。

  外部系統之後盡量不要直接讀：

  sequence.index
  sequence.steps[...]

  統一使用這個 API。
*/
function getGardenCharacterAnimationSequenceStatus(
  characterId,
  activity,
  sequenceId
) {
  const sequence =
    getGardenCharacterAnimationSequence(
      characterId,
      activity,
      sequenceId
    );


  if (
    !sequence ||
    sequence.finished
  ) {
    return null;
  }


  const currentStep =
    sequence.steps[
      sequence.index
    ];


  if (!currentStep) {
    return null;
  }


  return {
    characterId:
      sequence.characterId,

    activity:
      sequence.activity,

    sequenceId:
      sequence.sequenceId,

    index:
      sequence.index,

    stepCount:
      sequence.steps.length,

    mode:
      currentStep.mode,

    phase:
      currentStep.phase,

    advance:
      currentStep.advance,

    force:
      currentStep.force,

    startedAt:
      sequence.startedAt,

    phaseStartedAt:
      sequence.phaseStartedAt,

    phaseElapsedMs:
      Math.max(
        0,
        performance.now() -
          sequence.phaseStartedAt
      ),
  };
}



function advanceGardenCharacterAnimationSequence(
  characterId,
  activity,
  sequenceId
) {
  const sequence =
    getGardenCharacterAnimationSequence(
      characterId,
      activity,
      sequenceId
    );


  if (
    !sequence ||
    sequence.finished
  ) {
    return false;
  }


  const nextIndex =
    sequence.index + 1;


  /*
    =========================
    Sequence 完成
    =========================
  */
  if (
    nextIndex >=
    sequence.steps.length
  ) {
    sequence.finished =
      true;


    clearGardenCharacterActivityAnimationSequence(
      characterId,
      activity,
      sequenceId
    );


    gardenCharacterAnimationSequences.delete(
      sequence.key
    );


    emitGardenCharacterAnimationSequenceEvent(
      sequence,
      "onComplete",
      "complete"
    );


    return true;
  }


  /*
    =========================
    嘗試進入下一 Step
    =========================
  */
  const nextStep =
    sequence.steps[
      nextIndex
    ];


  const requested =
    requestGardenCharacterActivitySequenceAnimation(
      characterId,
      activity,
      sequenceId,
      nextStep.mode,
      {
        priority:
          sequence.priority,

        force:
          nextStep.force,
      }
    );


  /*
    Request 沒成功，
    不允許 Runtime 偷偷前進。
  */
  if (!requested) {
    return false;
  }


  /*
    Request 成功後才正式進入下一步。
  */
  sequence.index =
    nextIndex;


  sequence.phaseStartedAt =
    performance.now();


  emitGardenCharacterAnimationSequenceEvent(
    sequence,
    "onStepEnter",
    "stepEnter"
  );


  return true;
}


/*
  每幀檢查：

  advance:"complete"
  的 Sequence Step

  是否已經播放完成。
*/
function updateGardenCharacterAnimationSequences(
  characterId
) {
  if (!characterId) {
    return;
  }


  const sequences =
    Array.from(
      gardenCharacterAnimationSequences.values()
    );


  for (const sequence of sequences) {
    if (
      sequence.characterId !==
        characterId ||
      sequence.finished
    ) {
      continue;
    }


    const currentStep =
      sequence.steps[
        sequence.index
      ];


    if (!currentStep) {
      continue;
    }


    /*
      manual Step 不自動前進。
    */
    if (
      currentStep.advance !==
      "complete"
    ) {
      continue;
    }


    /*
      必須確認目前真的正在播放
      Sequence 要求的這個 mode。

      避免其他高優先系統暫時搶走控制權時，
      Sequence 在背景偷偷前進。
    */
    if (
      getGardenCharacterCurrentAnimation(
        characterId
      ) !==
      currentStep.mode
    ) {
      continue;
    }


    if (
      !isGardenCharacterAnimationFinished(
        characterId,
        currentStep.mode
      )
    ) {
      continue;
    }


    advanceGardenCharacterAnimationSequence(
      sequence.characterId,
      sequence.activity,
      sequence.sequenceId
    );
  }
}

/*
  主動取消一個 Animation Sequence。

  與自然完成不同：

  自然完成
    → Sequence 自己跑完

  cancel
    → Activity / Event 中途終止它
*/
function cancelGardenCharacterAnimationSequence(
  characterId,
  activity,
  sequenceId
) {
  const sequence =
    getGardenCharacterAnimationSequence(
      characterId,
      activity,
      sequenceId
    );


  if (!sequence) {
    return false;
  }


  /*
    先清掉 Sequence Request。
  */
  clearGardenCharacterActivityAnimationSequence(
    characterId,
    activity,
    sequenceId
  );


  /*
    再移除 Runtime。
  */
  gardenCharacterAnimationSequences.delete(
    sequence.key
  );


  /*
    最後通知外部：

    這是手動取消。
  */
  emitGardenCharacterAnimationSequenceEvent(
    sequence,
    "onCancel",
    "cancel",
    "manual"
  );


  return true;
}

/*
  Activity 結束時使用。

  清掉：

  1. 此 Activity 擁有的所有 Sequence Runtime
  2. 此 Activity 擁有的所有 Animation Requests

  回傳實際取消的 Sequence 數量。
*/
function cancelGardenCharacterAnimationSequencesByActivity(
  characterId,
  activity
) {
  if (
    !characterId ||
    !activity
  ) {
    return 0;
  }


  let cancelledCount =
    0;


  /*
    使用快照。

    因為迴圈途中會 delete Map，
    不直接遍歷原 Map 比較安全。
  */
  const sequences =
    Array.from(
      gardenCharacterAnimationSequences.values()
    );


  for (const sequence of sequences) {
    if (
      sequence.characterId !==
        characterId ||
      sequence.activity !==
        activity
    ) {
      continue;
    }


  gardenCharacterAnimationSequences.delete(
  sequence.key
);


/*
  Activity 被切走，
  Sequence 屬於被動取消。
*/
emitGardenCharacterAnimationSequenceEvent(
  sequence,
  "onCancel",
  "cancel",
  "activityChanged"
);


cancelledCount +=
  1;
  }


  /*
    Sequence Request 的 owner
    本來就是：

    activity:xxx

    所以這裡一次把舊 Activity
    擁有的所有 Request 都清掉。

    包含：
    - Sequence Request
    - 普通 Activity Request
  */
  const owner =
    getGardenActivityAnimationRequestOwner(
      activity
    );


  if (owner) {
    clearGardenCharacterAnimationRequestsByOwner(
      characterId,
      owner
    );
  }


  return cancelledCount;
}





/*
  Activity 建立 Animation Request
  時統一使用這個入口。

  這樣 Request 自動帶上：

  owner = activity:xxx
*/
function requestGardenCharacterActivityAnimation(
  characterId,
  activity,
  mode,
  options = {}
) {
  if (
    !characterId ||
    !activity ||
    !mode
  ) {
    return false;
  }


  const source =
    options.source ||
    `activity:${activity}`;


  return (
    requestGardenCharacterAnimation(
      characterId,
      mode,
      {
        ...options,

        source,

        owner:
          getGardenActivityAnimationRequestOwner(
            activity
          ),

        priority:
          Number.isFinite(
            options.priority
          )
            ? options.priority
            : GARDEN_ANIMATION_REQUEST_PRIORITY
                .ACTIVITY,
      }
    )
  );
}

/* =========================
   Garden Activity ↔ Sequence Bridge
========================= */

/*
  將：

  characterId
  activity
  sequenceId

  綁成一個高階控制物件。

  Activity Controller 不需要
  每次重複傳三個參數。
*/
function createGardenCharacterActivityAnimationSequenceBridge(
  characterId,
  activity,
  sequenceId
) {
  if (
    !characterId ||
    !activity ||
    !sequenceId
  ) {
    return null;
  }


  /*
    Bridge 綁定建立當下的 Activity。

    如果角色之後已經離開該 Activity，
    舊 Bridge 不允許重新 start，
    避免幽靈 Activity 復活。
  */
  function isOwnerActivityCurrent() {
    return (
      getGardenCharacterActivity(
        characterId
      ) ===
      activity
    );
  }


  return Object.freeze({
    characterId,
    activity,
    sequenceId,


    /*
      啟動 Sequence。
    */
    start(
      steps,
      options = {}
    ) {
      if (
        !isOwnerActivityCurrent()
      ) {
        return false;
      }


      return (
        startGardenCharacterAnimationSequence(
          characterId,
          activity,
          sequenceId,
          steps,
          options
        )
      );
    },


    /*
      手動推進 Sequence。
    */
    advance() {
      return (
        advanceGardenCharacterAnimationSequence(
          characterId,
          activity,
          sequenceId
        )
      );
    },


    /*
      主動取消 Sequence。
    */
    cancel() {
      return (
        cancelGardenCharacterAnimationSequence(
          characterId,
          activity,
          sequenceId
        )
      );
    },


    /*
      Sequence 是否仍存在。
    */
    isActive() {
      return (
        getGardenCharacterAnimationSequence(
          characterId,
          activity,
          sequenceId
        ) !==
        null
      );
    },


    /*
      目前 Step。
    */
    step() {
      return (
        getGardenCharacterAnimationSequenceCurrentStep(
          characterId,
          activity,
          sequenceId
        )
      );
    },


    /*
      enter / hold / exit
    */
    phase() {
      return (
        getGardenCharacterAnimationSequencePhase(
          characterId,
          activity,
          sequenceId
        )
      );
    },


    /*
      完整公開狀態。
    */
    status() {
      return (
        getGardenCharacterAnimationSequenceStatus(
          characterId,
          activity,
          sequenceId
        )
      );
    },
  });
}

/*
  不必手動傳 activity。

  建立當下自動讀取角色
  目前真正的 Activity。
*/
function createGardenCharacterCurrentActivityAnimationSequenceBridge(
  characterId,
  sequenceId
) {
  if (
    !characterId ||
    !sequenceId
  ) {
    return null;
  }


  const activity =
    getGardenCharacterActivity(
      characterId
    );


  if (!activity) {
    return null;
  }


  return (
    createGardenCharacterActivityAnimationSequenceBridge(
      characterId,
      activity,
      sequenceId
    )
  );
}

/* =========================
   Garden Activity Animation
   Sequence Definition Registry
========================= */

/*
  儲存：

  Activity
    ↓
  Sequence ID
    ↓
  Animation Steps

  例如：

  tea
    └─ sit
       ├─ sitDown
       ├─ sitIdle
       └─ standUp
*/
const gardenActivityAnimationSequenceDefinitions =
  new Map();


function getGardenActivityAnimationSequenceDefinitionKey(
  activity,
  sequenceId
) {
  if (
    !activity ||
    !sequenceId
  ) {
    return "";
  }


  return (
    `${activity}|${sequenceId}`
  );
}

/*
  將外部 Definition
  轉成安全、固定格式。

  Registry 儲存的是資料，
  不儲存 Runtime Callback。
*/
function normalizeGardenActivityAnimationSequenceDefinition(
  definition
) {
  if (
    !definition ||
    !Array.isArray(
      definition.steps
    ) ||
    definition.steps.length === 0
  ) {
    return null;
  }


  const normalizedSteps =
    [];


  for (
    const step of
    definition.steps
  ) {
    if (
      !step ||
      !step.mode
    ) {
      return null;
    }


    /*
      phase 可以不指定。

      null 的情況，
      startGardenCharacterAnimationSequence()
      會使用原本的自動推導：

      first  → enter
      middle → hold
      last   → exit
    */
    let phase =
      null;


    if (
      step.phase ===
        GARDEN_ANIMATION_SEQUENCE_PHASE
          .ENTER ||
      step.phase ===
        GARDEN_ANIMATION_SEQUENCE_PHASE
          .HOLD ||
      step.phase ===
        GARDEN_ANIMATION_SEQUENCE_PHASE
          .EXIT
    ) {
      phase =
        step.phase;
    }


    normalizedSteps.push(
      Object.freeze({
        mode:
          String(
            step.mode
          ),

        phase,

        advance:
          step.advance ===
            "complete"
            ? "complete"
            : "manual",

        force:
          step.force === true,
      })
    );
  }


  return Object.freeze({
    steps:
      Object.freeze(
        normalizedSteps
      ),

    priority:
      Number.isFinite(
        definition.priority
      )
        ? definition.priority
        : null,
  });
}

function registerGardenActivityAnimationSequenceDefinition(
  activity,
  sequenceId,
  definition,
  options = {}
) {
  const key =
    getGardenActivityAnimationSequenceDefinitionKey(
      activity,
      sequenceId
    );


  if (!key) {
    return false;
  }


  const normalizedDefinition =
    normalizeGardenActivityAnimationSequenceDefinition(
      definition
    );


  if (!normalizedDefinition) {
    console.warn(
      "[Garden Animation] invalid Activity Sequence definition:",
      {
        activity,
        sequenceId,
        definition,
      }
    );

    return false;
  }


  /*
    正式資料預設不允許
    不小心重複覆寫。

    Debug / 開發測試可使用：
    { replace: true }
  */
  if (
    gardenActivityAnimationSequenceDefinitions.has(
      key
    ) &&
    options.replace !==
      true
  ) {
    console.warn(
      "[Garden Animation] Activity Sequence definition already exists:",
      key
    );

    return false;
  }


  gardenActivityAnimationSequenceDefinitions.set(
    key,
    normalizedDefinition
  );


  return true;
}


function getGardenActivityAnimationSequenceDefinition(
  activity,
  sequenceId
) {
  const key =
    getGardenActivityAnimationSequenceDefinitionKey(
      activity,
      sequenceId
    );


  if (!key) {
    return null;
  }


  return (
    gardenActivityAnimationSequenceDefinitions.get(
      key
    ) ||
    null
  );
}


function hasGardenActivityAnimationSequenceDefinition(
  activity,
  sequenceId
) {
  return (
    getGardenActivityAnimationSequenceDefinition(
      activity,
      sequenceId
    ) !==
    null
  );
}

function unregisterGardenActivityAnimationSequenceDefinition(
  activity,
  sequenceId
) {
  const key =
    getGardenActivityAnimationSequenceDefinitionKey(
      activity,
      sequenceId
    );


  if (!key) {
    return false;
  }


  return (
    gardenActivityAnimationSequenceDefinitions.delete(
      key
    )
  );
}

/*
  使用 Registry 裡的 Definition
  啟動角色 Sequence。
*/
function startGardenCharacterActivityAnimationSequenceFromDefinition(
  characterId,
  activity,
  sequenceId,
  runtimeOptions = {}
) {
  const definition =
    getGardenActivityAnimationSequenceDefinition(
      activity,
      sequenceId
    );


  if (!definition) {
    console.warn(
      "[Garden Animation] missing Activity Sequence definition:",
      {
        characterId,
        activity,
        sequenceId,
      }
    );

    return false;
  }


  const bridge =
    createGardenCharacterActivityAnimationSequenceBridge(
      characterId,
      activity,
      sequenceId
    );


  if (!bridge) {
    return false;
  }


  const startOptions = {
    ...runtimeOptions,
  };


  /*
    Runtime 沒另外指定 priority
    才使用 Definition 預設值。
  */
  if (
    !Number.isFinite(
      startOptions.priority
    ) &&
    Number.isFinite(
      definition.priority
    )
  ) {
    startOptions.priority =
      definition.priority;
  }


  return (
    bridge.start(
      definition.steps,
      startOptions
    )
  );
}

function startGardenCharacterCurrentActivityAnimationSequenceFromDefinition(
  characterId,
  sequenceId,
  runtimeOptions = {}
) {
  const activity =
    getGardenCharacterActivity(
      characterId
    );


  if (!activity) {
    return false;
  }


  return (
    startGardenCharacterActivityAnimationSequenceFromDefinition(
      characterId,
      activity,
      sequenceId,
      runtimeOptions
    )
  );
}

/* =========================
   Garden Activity Animation Controller
========================= */

/*
  高階 Activity 不需要直接接觸：

  - Definition Registry
  - Sequence API
  - Bridge 細節

  統一透過 Controller 操作。
*/
function createGardenCharacterActivityAnimationController(
  characterId,
  activity,
  sequenceId
) {
  if (
    !characterId ||
    !activity ||
    !sequenceId
  ) {
    return null;
  }


  const bridge =
    createGardenCharacterActivityAnimationSequenceBridge(
      characterId,
      activity,
      sequenceId
    );


  if (!bridge) {
    return null;
  }


  /*
    Controller 本身不保存
    Sequence Runtime。

    真正 Runtime 仍然只有
    Sequence Controller 擁有。

    這樣 Activity 改變時，
    原本的 Ownership Cleanup
    仍然是唯一真相來源。
  */
  return Object.freeze({
    characterId,
    activity,
    sequenceId,


    /*
      使用 Registry Definition
      啟動這個 Controller。
    */
    start(
      runtimeOptions = {}
    ) {
      /*
        舊 Activity Controller
        不准重新啟動。
      */
      if (
        getGardenCharacterActivity(
          characterId
        ) !==
        activity
      ) {
        return false;
      }


      /*
        同一串 Sequence
        已經存在時不重複 Start。
      */
      if (
        bridge.isActive()
      ) {
        return false;
      }


      return (
        startGardenCharacterActivityAnimationSequenceFromDefinition(
          characterId,
          activity,
          sequenceId,
          runtimeOptions
        )
      );
    },


    /*
      手動推進。

      未來例如：

      sitIdle
      ↓
      Tea 決定結束
      ↓
      advance()
      ↓
      standUp
    */
    advance() {
      return (
        bridge.advance()
      );
    },


    /*
      主動取消。
    */
    cancel() {
      return (
        bridge.cancel()
      );
    },


    /*
      是否仍在執行。
    */
    isActive() {
      return (
        bridge.isActive()
      );
    },


    step() {
      return (
        bridge.step()
      );
    },


    phase() {
      return (
        bridge.phase()
      );
    },


    status() {
      return (
        bridge.status()
      );
    },
  });
}


/*
  自動綁定角色目前 Activity。

  正式 Activity Controller
  大部分會使用這個入口。
*/
function createGardenCharacterCurrentActivityAnimationController(
  characterId,
  sequenceId
) {
  if (
    !characterId ||
    !sequenceId
  ) {
    return null;
  }


  const activity =
    getGardenCharacterActivity(
      characterId
    );


  if (!activity) {
    return null;
  }


  return (
    createGardenCharacterActivityAnimationController(
      characterId,
      activity,
      sequenceId
    )
  );
}

/* =========================
   Garden Animation Debug Snapshot
========================= */

function getGardenCharacterAnimationDebugSnapshot(
  characterId
) {
  if (!characterId) {
    return null;
  }


  const requestMap =
    getGardenCharacterAnimationRequestMap(
      characterId
    );


  const sequences =
    Array.from(
      gardenCharacterAnimationSequences.values()
    ).filter(
      (sequence) =>
        sequence.characterId ===
        characterId
    );


  return {
    characterId,

    activity:
      getGardenCharacterActivity(
        characterId
      ),

    requestCount:
      requestMap?.size || 0,

    sequenceCount:
      sequences.length,

    requests:
      requestMap
        ? Array.from(
            requestMap.values()
          ).map(
            (request) => ({
              source:
                request.source,

              owner:
                request.owner,

              sequence:
                request.sequence,

              mode:
                request.mode,

              priority:
                request.priority,
            })
          )
        : [],

    sequences:
      sequences.map(
        (sequence) => ({
          activity:
            sequence.activity,

          sequenceId:
            sequence.sequenceId,

          index:
            sequence.index,

          phase:
            sequence.steps[
              sequence.index
            ]?.phase || null,

          mode:
            sequence.steps[
              sequence.index
            ]?.mode || null,
        })
      ),
  };
}


/*
  清掉某角色全部 Animation Request。

  正式功能之後不會隨便使用，
  主要給初始化 / debug / reset。
*/
function clearAllGardenCharacterAnimationRequests(
  characterId
) {
  if (!characterId) {
    return false;
  }


  return (
    gardenCharacterAnimationRequests.delete(
      characterId
    )
  );
}


/*
  取得目前優先權最高的 Request。

  規則：

  1. priority 高的優先
  2. priority 相同時，
     後送出的 Request 優先
*/
function getGardenCharacterTopAnimationRequest(
  characterId
) {
  const requestMap =
    getGardenCharacterAnimationRequestMap(
      characterId
    );


  if (
    !requestMap ||
    requestMap.size === 0
  ) {
    return null;
  }


  let bestRequest =
    null;


  for (
    const request of
    requestMap.values()
  ) {
    if (!bestRequest) {
      bestRequest =
        request;

      continue;
    }


    if (
      request.priority >
      bestRequest.priority
    ) {
      bestRequest =
        request;

      continue;
    }


    if (
      request.priority ===
        bestRequest.priority &&
      request.order >
        bestRequest.order
    ) {
      bestRequest =
        request;
    }
  }


  return (
    bestRequest
      ? { ...bestRequest }
      : null
  );
}

/*
  =========================
  Garden Animation Command Resolver
  =========================

  最終控制順序：

  1. Completion / Sequence Override
  2. Priority Animation Request
  3. 原本 Activity Resolver

  最後不只回傳 mode，
  也一起帶出 force。
*/
function resolveGardenCharacterAnimationCommand(
  characterId,
  animationRuntime
) {
  if (
    !characterId ||
    !animationRuntime
  ) {
    return {
      mode: "idle",
      force: false,
      source: "fallback",
      priority: null,
    };
  }


  /*
    =========================
    1. Override
    =========================

    Completion Transition
    產生的 Override 優先最高。
  */
  const overrideMode =
    getGardenCharacterAnimationOverride(
      characterId
    );


  if (overrideMode) {
    if (
      hasGardenCharacterAnimation(
        characterId,
        overrideMode
      )
    ) {
      return {
        mode: overrideMode,
        force: false,
        source: "override",
        priority: null,
      };
    }


    /*
      Definition 已經不存在時，
      清掉壞掉的 Override。
    */
    clearGardenCharacterAnimationOverride(
      characterId
    );
  }


  /*
    =========================
    2. Priority Request
    =========================
  */
  const request =
    getGardenCharacterTopAnimationRequest(
      characterId
    );


  if (request) {
    if (
      hasGardenCharacterAnimation(
        characterId,
        request.mode
      )
    ) {
      return {
        mode:
          request.mode,

        force:
          request.force === true,

        source:
          request.source,

        priority:
          request.priority,
      };
    }


    /*
      理論上 request() 時已經檢查過，
      這裡只是防 Definition 日後被移除。
    */
    clearGardenCharacterAnimationRequest(
      characterId,
      request.source
    );
  }


  /*
    =========================
    3. Baseline Activity Resolver
    =========================
  */
  return {
    mode:
      resolveGardenCharacterAnimationMode(
        characterId,
        animationRuntime
      ),

    force:
      false,

    source:
      "activity",

    priority:
      GARDEN_ANIMATION_REQUEST_PRIORITY
        .BASELINE,
  };
}

/*
  嘗試處理角色目前已完成的
  One-shot Animation Transition。

  例如：

  sitDown finished
      ↓
  transition:
  sitDown → sitIdle
      ↓
  set override = sitIdle
*/
function applyGardenAnimationCompletionTransition(
  characterId
) {
  const transition =
    getGardenPendingAnimationCompletionTransition(
      characterId
    );


  /*
    沒有完成動畫，
    或這個動畫沒有登記 transition。
  */
  if (!transition) {
    return false;
  }


  const {
    fromMode,
    toMode,
  } = transition;


  /*
    保險：
    下一個動畫必須真的存在。

    不使用 fallback，
    避免拼錯動畫名稱卻偷偷變 Idle。
  */
  if (
    !hasGardenCharacterAnimation(
      characterId,
      toMode
    )
  ) {
    console.warn(
      `[Garden Animation] completion target missing: ${characterId} ${fromMode} → ${toMode}`
    );

    return false;
  }


  /*
    避免錯誤設定：

    sitDown → sitDown

    否則 finished 狀態可能造成
    無意義的循環處理。
  */
  if (
    fromMode ===
    toMode
  ) {
    console.warn(
      `[Garden Animation] completion transition cannot target itself: ${characterId}/${fromMode}`
    );

    return false;
  }


  /*
    不在這一幀直接強制換 layer。

    只設定 Override。

    下一幀正常經過：

    Resolver
      ↓
    Override
      ↓
    setAnimationMode()

    這樣所有 warmup / layer / setter
    流程仍然只走原本的統一入口。
  */
  const applied =
    setGardenCharacterAnimationOverride(
      characterId,
      toMode
    );


  if (!applied) {
    return false;
  }


  return true;
}



/* =========================
   Garden Animation Capability
========================= */

function getGardenCharacterAnimationDefinition(
  characterId,
  mode
) {
  const runtime =
    getGardenCharacterAnimationRuntime(
      characterId
    );


  if (
    !runtime ||
    !mode
  ) {
    return null;
  }


  const animations =
    runtime.animations;


  if (
    !animations ||
    !Object.prototype.hasOwnProperty.call(
      animations,
      mode
    )
  ) {
    return null;
  }


  return animations[mode];
}


function hasGardenCharacterAnimation(
  characterId,
  mode
) {
  return (
    getGardenCharacterAnimationDefinition(
      characterId,
      mode
    ) !== null
  );
}


/*
  Resolver 要求的動畫不存在時，
  決定安全退回哪一個動畫。
*/
function resolveGardenCharacterAnimationFallback(
  characterId,
  requestedMode
) {
  const runtime =
    getGardenCharacterAnimationRuntime(
      characterId
    );


  if (!runtime) {
    return null;
  }


  /*
    要求的動畫本來就存在，
    直接使用。
  */
  if (
    hasGardenCharacterAnimation(
      characterId,
      requestedMode
    )
  ) {
    return requestedMode;
  }


  /*
    正在移動時，
    優先退回 Walk。
  */
  if (
    runtime.state?.isMoving &&
    hasGardenCharacterAnimation(
      characterId,
      "walk"
    )
  ) {
    return "walk";
  }


  /*
    沒移動時，
    優先退回 Idle。
  */
  if (
    hasGardenCharacterAnimation(
      characterId,
      "idle"
    )
  ) {
    return "idle";
  }


  /*
    極端保險：
    如果連 Idle 都沒有，
    使用這個角色登記的第一個動畫。
  */
  const availableModes =
    Object.keys(
      runtime.animations || {}
    );


  return (
    availableModes[0] ||
    null
  );
}


const gardenAnimationFallbackWarnings =
  new Set();


function warnGardenAnimationFallbackOnce(
  characterId,
  requestedMode,
  fallbackMode
) {
  const key =
    `${characterId}:${requestedMode}:${fallbackMode}`;


  if (
    gardenAnimationFallbackWarnings.has(
      key
    )
  ) {
    return;
  }


  gardenAnimationFallbackWarnings.add(
    key
  );


  console.warn(
    `[Garden Animation] "${characterId}" has no "${requestedMode}" animation. Fallback → "${fallbackMode}".`
  );
}




function setGardenCharacterAnimationMode(
  characterId,
  mode,
  force = false
) {
  const runtime =
    getGardenCharacterAnimationRuntime(
      characterId
    );


  if (!runtime) {
    console.warn(
      `[Garden Animation] character not registered: ${characterId}`
    );

    return false;
  }


  const resolvedMode =
    resolveGardenCharacterAnimationFallback(
      characterId,
      mode
    );


  /*
    角色甚至沒有任何可用動畫。
  */
  if (!resolvedMode) {
    console.warn(
      `[Garden Animation] no usable animation: ${characterId}`
    );

    return false;
  }


  /*
    要求的動畫不存在時，
    記錄一次 fallback。
  */
  if (
    resolvedMode !==
    mode
  ) {
    warnGardenAnimationFallbackOnce(
      characterId,
      mode,
      resolvedMode
    );
  }


  /*
    =========================
    Interruptibility Gate
    =========================

    Resolver 想換動畫，
    不代表一定可以立刻換。

    如果目前動畫不可中斷，
    就保持目前動畫繼續播放。
  */
  if (
    !canGardenCharacterSwitchAnimation(
      characterId,
      resolvedMode,
      force
    )
  ) {
    return false;
  }


  runtime.setMode(
    resolvedMode,
    force
  );


  return true;
}


function updateGardenCharacterAnimationFrame(
  characterId,
  deltaMs
) {
  const runtime =
    getGardenCharacterAnimationRuntime(
      characterId
    );


  if (!runtime) {
    return false;
  }


  runtime.updateFrame(
    deltaMs
  );


  return true;
}


/* =========================
   Existing Garden Characters
========================= */

registerGardenCharacterAnimation(
  "chifuyu",
  {
    animations:
      CHIFUYU_ANIMS,

    state:
      chifuyuWalkTestState,

    setMode:
      setChifuyuAnimationMode,

    updateFrame:
      updateChifuyuAnimationFrame,
  }
);


registerGardenCharacterAnimation(
  "chinatsu",
  {
    animations:
      CHINATSU_ANIMS,

    state:
      chinatsuWalkTestState,

    setMode:
      setChinatsuAnimationMode,

    updateFrame:
      updateChinatsuAnimationFrame,
  }
);








function getChinatsuMoveSpeedByY(y) {
  const farY = 470;
  const nearY = 1810;

  const farSpeed = 95;
  const nearSpeed = 150;

  const t = Math.max(0, Math.min(1, (y - farY) / (nearY - farY)));

  return farSpeed + t * (nearSpeed - farSpeed);
}

function updateChinatsuWalkPosition(deltaMs) {
  const state =
    chinatsuWalkTestState;


  if (
    !state.path ||
    state.path.length === 0
  ) {
    state.isMoving =
      false;

    return;
  }


  if (
    !canGardenCharacterAdvanceMovement(
      "chinatsu"
    )
  ) {
    state.isMoving =
      false;

    return;
  }


  state.isMoving =
    true;


  const target =
    state.path[0];

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
  

  if (
    GARDEN_CANONICAL_WANDER_RUNTIME_ENABLED &&
    canGardenCharacterUseCanonicalWanderRuntime(
      "chinatsu"
    )
  ) {
    return;
  }


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

function resolveGardenChatTargetLoops(
  requestedTargetLoops = null
) {
  /*
    Schedule / Deterministic Chat
    可以明確指定 loop 數。
  */
  if (
    Number.isInteger(
      requestedTargetLoops
    )
  ) {
    return Math.max(
      GARDEN_CHAT_LOOP_MIN,

      Math.min(
        GARDEN_CHAT_LOOP_MAX,
        requestedTargetLoops
      )
    );
  }


  /*
    舊自然聊天維持原本邏輯。
  */
  return randomIntBetween(
    GARDEN_CHAT_LOOP_MIN,
    GARDEN_CHAT_LOOP_MAX
  );
}


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

/*
  Canonical Event Approach
  的雙人固定路徑資料。

  null = 使用舊 Local Approach /
         目前沒有 Canonical Approach。
*/
canonicalApproachPlan: null,

resumeActivity:
  null,

pendingTargetLoops:
  null,

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

gardenChatState.canonicalApproachPlan =
  null;

  gardenChatState.resumeActivity =
  null;

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

function startGardenChatApproach(
  now = performance.now(),
  options = {}
) {
  if (
    gardenChatState.mode !==
      "wander"
  ) {
    return false;
  }


  const requestedSpot =
    options?.spot ??
    null;

  const sceneId =
    getGardenSharedCharacterSceneId();


  const plan =
    requestedSpot
      ? getGardenChatApproachPlanForSpot(
          requestedSpot,
          sceneId
        )
      : pickGardenChatApproachPlan();

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


gardenChatState.pendingTargetLoops =
  Number.isInteger(
    options?.targetLoops
  )
    ? resolveGardenChatTargetLoops(
        options.targetLoops
      )
    : null;

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


function startGardenCanonicalChatApproach(
  event,
  targetLoops
) {
  if (
    gardenChatState.mode !==
      "wander" ||
    !event ||
    !Number.isInteger(
      targetLoops
    )
  ) {
    return false;
  }


  const spot =
    getGardenMoonBridgeNightChatSpot(
      event
    );


  const pairPlan =
    createGardenMoonBridgeNightChatApproachPlans(
      event
    );


  if (
    !spot ||
    !pairPlan
  ) {
    return false;
  }


  /*
    正式進入 Chat Approach。

    注意：
    Spatial movement 不再由
    performance.now() 決定。

    真正的位置 / 進度全部交給
    canonicalApproachPlan +
    Absolute World Timestamp。
  */
  gardenChatState.mode =
    "approachChat";

  gardenChatState.approachSpot =
    spot;

  /*
    這個欄位暫時只保留給
    Legacy timeout watchdog。

    不參與 Canonical movement。
  */
  gardenChatState.approachStartedAt =
    performance.now();


  gardenChatState.canonicalApproachPlan =
    pairPlan;


  gardenChatState.pendingTargetLoops =
    resolveGardenChatTargetLoops(
      targetLoops
    );


  gardenChatState.currentSpotName =
    spot.name ??
    "approach";


  setGardenPairActivity(
    GARDEN_CHARACTER_ACTIVITY
      .CHAT,
    {
      phase:
        "approach",

      sceneId:
        "moonBridge",

      eventId:
        event.id,

      canonical:
        true,
    }
  );


  resetGardenTalkEndFlags();


  /*
    Canonical Runtime 已取得
    Spatial Ownership。

    舊 local path 必須立即清空。
  */
  chifuyuWalkTestState.path =
    [];

  chifuyuWalkTestState.isMoving =
    false;

  chinatsuWalkTestState.path =
    [];

  chinatsuWalkTestState.isMoving =
    false;


  chifuyuAutoWalkState.wasMoving =
    false;

  chinatsuAutoWalkState.wasMoving =
    false;


  return true;
}


function startGardenCanonicalAfternoonRestChatApproach(
  event,
  targetLoops
) {
  if (
    gardenChatState.mode !==
      "wander" ||
    !event ||
    !Number.isInteger(
      targetLoops
    )
  ) {
    return false;
  }


  const spot =
    getGardenAfternoonRestChatSpot(
      event
    );


  const pairPlan =
    createGardenAfternoonRestChatApproachPlans(
      event
    );


  if (
    !spot ||
    !pairPlan
  ) {
    return false;
  }


  gardenChatState.mode =
    "approachChat";


  gardenChatState.approachSpot =
    spot;


  /*
    Legacy watchdog only。

    Spatial timing 完全由
    canonical pair plan 控制。
  */
  gardenChatState.approachStartedAt =
    performance.now();


  gardenChatState.canonicalApproachPlan =
    pairPlan;


  /*
    Afternoon Rest Chat 結束後
    必須回 REST，
    不能像 Night Chat 一樣回 Wander。
  */
  gardenChatState.resumeActivity =
    GARDEN_CHARACTER_ACTIVITY
      .REST;


  gardenChatState.pendingTargetLoops =
    resolveGardenChatTargetLoops(
      targetLoops
    );


  gardenChatState.currentSpotName =
    spot.name ??
    "afternoon-rest";


  setGardenPairActivity(
    GARDEN_CHARACTER_ACTIVITY
      .CHAT,
    {
      phase:
        "approach",

      sceneId:
        "courtyard",

      eventId:
        event.id,

      canonical:
        true,

   semanticActivityId:
  GARDEN_CHARACTER_ACTIVITY
    .REST,

parentActivity:
  GARDEN_CHARACTER_ACTIVITY
    .REST,
    }
  );


  resetGardenTalkEndFlags();


  chifuyuWalkTestState.path =
    [];

  chifuyuWalkTestState.isMoving =
    false;


  chinatsuWalkTestState.path =
    [];

  chinatsuWalkTestState.isMoving =
    false;


  chifuyuAutoWalkState.wasMoving =
    false;

  chinatsuAutoWalkState.wasMoving =
    false;


  return true;
}


window.testGardenChatApproach = function () {
  return startGardenChatApproach(performance.now());
};

function cancelGardenChatApproach(
  now = performance.now()
) {
  const resumeActivity =
    gardenChatState
      .resumeActivity ??
    GARDEN_CHARACTER_ACTIVITY
      .WANDER;


  gardenChatState.mode =
    "wander";


  setGardenPairActivity(
    resumeActivity
  );


 gardenChatState.approachSpot = null;
gardenChatState.approachStartedAt = 0;

gardenChatState.canonicalApproachPlan =
  null;

  gardenChatState.resumeActivity =
  null;

gardenChatState.pendingTargetLoops =
  null;
gardenChatState.currentSpotName = "";

  chifuyuWalkTestState.path = [];
  chifuyuWalkTestState.isMoving = false;

  chinatsuWalkTestState.path = [];
  chinatsuWalkTestState.isMoving = false;

  resetGardenTalkEndFlags();
  scheduleNextGardenChatCheck(now);
}

function updateGardenChatApproach(now = performance.now()) {
  if (
    gardenChatState.mode !==
      "approachChat"
  ) {
    return false;
  }


  const canonicalPairPlan =
    gardenChatState
      .canonicalApproachPlan;


  /*
    =========================
    Canonical Chat Approach
    =========================

    不使用：
    - performance.now()
    - local timeout
    - local isMoving 作為完成時間

    是否抵達完全由
    Absolute World Timestamp
    與 pairPlan.completedAt 決定。
  */
  if (canonicalPairPlan) {
    const canonicalTimestamp =
      getGardenWorldNow();


   const canonicalResolution =
  resolveGardenCanonicalChatApproachPairPlan(
    canonicalPairPlan,
    canonicalTimestamp
  );


    if (!canonicalResolution) {
      cancelGardenChatApproach(now);
      return false;
    }


    if (
      canonicalResolution
        .completed !== true
    ) {
      return false;
    }
  } else {
    /*
      =========================
      Legacy Chat Approach
      =========================

      舊測試 / fallback
      繼續維持原本 local 邏輯。
    */
    if (
      now -
        gardenChatState
          .approachStartedAt >
      GARDEN_CHAT_APPROACH_TIMEOUT_MS
    ) {
      cancelGardenChatApproach(
        now
      );

      return false;
    }


    // 至少還有一人在走，就繼續 approach
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
  }


  const spot =
    gardenChatState.approachSpot;

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

  const pendingTargetLoops =
  gardenChatState
    .pendingTargetLoops;


const semanticActivityByCharacter =
  Object.freeze({
    chifuyu:
      getGardenCharacterSemanticActivityId(
        "chifuyu"
      ),

    chinatsu:
      getGardenCharacterSemanticActivityId(
        "chinatsu"
      ),
  });


gardenChatState.approachSpot =
  null;

gardenChatState.approachStartedAt =
  0;

gardenChatState.canonicalApproachPlan =
  null;

gardenChatState.pendingTargetLoops =
  null;


const started =
 startGardenChat(
  now,
  null,
  {
    targetLoops:
      pendingTargetLoops,

    semanticActivityByCharacter,
  }
);

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
  isGardenWorldNight();


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
  spot = null,
  options = {}
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

    semanticActivityByCharacter:
  options
    ?.semanticActivityByCharacter ??
  null,

semanticActivityId:
  options
    ?.semanticActivityId ??
  null,
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
  resolveGardenChatTargetLoops(
    options?.targetLoops ??
      null
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
  const canonicalEndedAt =
    getGardenWorldNow();


  const resumeActivity =
    gardenChatState
      .resumeActivity ??
    GARDEN_CHARACTER_ACTIVITY
      .WANDER;


  /*
    Chat Runtime 結束。

    mode = wander 在這裡代表
    「Chat 系統已空閒」，
    不代表角色 World Activity
    一定是 WANDER。
  */
  gardenChatState.mode =
    "wander";


  if (
    resumeActivity ===
      GARDEN_CHARACTER_ACTIVITY
        .REST
  ) {
    /*
      =========================
      Afternoon Rest Chat
      =========================

      CHAT
      → REST
      → 各自走回原本 Rest Spot
    */

    gardenCharacterWorldState
      .chifuyu
      .wanderContinuity =
        null;

    gardenCharacterWorldState
      .chinatsu
      .wanderContinuity =
        null;


    const chifuyuRestPlan =
      startGardenCharacterActivitySpotApproach(
        "chifuyu",
        {
          sceneId:
            "courtyard",

          spotId:
            "courtyard-rest-01",

          activityId:
            GARDEN_CHARACTER_ACTIVITY
              .REST,

          startedAt:
            canonicalEndedAt,
        }
      );


    const chinatsuRestPlan =
      startGardenCharacterActivitySpotApproach(
        "chinatsu",
        {
          sceneId:
            "courtyard",

          spotId:
            "courtyard-rest-02",

          activityId:
            GARDEN_CHARACTER_ACTIVITY
              .REST,

          startedAt:
            canonicalEndedAt,
        }
      );


    /*
      理論上兩個 plan 都應成功。

      若未來場景資料異常，
      至少不能把角色留在 CHAT。
    */
    if (
      !chifuyuRestPlan ||
      !chinatsuRestPlan
    ) {
      setGardenPairActivity(
        GARDEN_CHARACTER_ACTIVITY
          .REST
      );
    }
  } else {
    /*
      =========================
      Night / Natural Chat
      =========================

      保留原本：
      CHAT → WANDER
    */

    const chifuyuContinuity =
      createGardenWanderContinuityFromCurrentPosition(
        "chifuyu",
        canonicalEndedAt
      );


    const chinatsuContinuity =
      createGardenWanderContinuityFromCurrentPosition(
        "chinatsu",
        canonicalEndedAt
      );


    setGardenPairActivity(
      GARDEN_CHARACTER_ACTIVITY
        .WANDER
    );


    gardenCharacterWorldState
      .chifuyu
      .wanderContinuity =
        chifuyuContinuity;


   gardenCharacterWorldState
  .chinatsu
  .wanderContinuity =
    chinatsuContinuity;
  }


  /*
    =========================
    Chat Common Cleanup
    =========================
  */

  gardenChatState.targetLoops =
    0;


  gardenChatState.approachSpot =
    null;


  gardenChatState.approachStartedAt =
    0;


  gardenChatState.canonicalApproachPlan =
    null;


  gardenChatState.resumeActivity =
    null;


  gardenChatState.pendingTargetLoops =
    null;


  gardenChatState.currentSpotName =
    "";


  resetGardenTalkEndFlags();


  chifuyuWalkTestState.path =
    [];

  chifuyuWalkTestState.isMoving =
    false;


  chinatsuWalkTestState.path =
    [];

  chinatsuWalkTestState.isMoving =
    false;


  setGardenCharacterAnimationMode(
    "chifuyu",
    "idle",
    true
  );


  setGardenCharacterAnimationMode(
    "chinatsu",
    "idle",
    true
  );


  chifuyuAutoWalkState.wasMoving =
    false;

  chinatsuAutoWalkState.wasMoving =
    false;


  chifuyuAutoWalkState.nextMoveTime =
    now +
    randomBetween(
      GARDEN_AFTER_CHAT_IDLE_MIN_MS,
      GARDEN_AFTER_CHAT_IDLE_MAX_MS
    );


  chinatsuAutoWalkState.nextMoveTime =
    now +
    randomBetween(
      GARDEN_AFTER_CHAT_IDLE_MIN_MS,
      GARDEN_AFTER_CHAT_IDLE_MAX_MS
    );


  scheduleNextGardenChatCheck(
    now + 9000
  );
}


function canStartNaturalGardenChat() {
  if (
    gardenChatState.mode !==
    "wander"
  ) {
    return false;
  }

  /*
    兩人都必須真的處於自由 WANDER。

    REST / TRAVEL / CHAT /
    Schedule Activity 期間
    都不能被自然聊天打斷。
  */
  if (
    !canGardenCharacterUseAmbientWander(
      "chifuyu"
    ) ||
    !canGardenCharacterUseAmbientWander(
      "chinatsu"
    )
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

function tryStartNaturalGardenChat(
  now = performance.now()
) {
  /*
    舊 Natural Chat
    使用 local performance.now()
    + Math.random()。

    Canonical World 下不能再由
    每個玩家自行決定是否發生 CHAT。

    未來 CHAT Activity
    會由 deterministic timeline
    重新接回。
  */
  if (
    GARDEN_CANONICAL_WANDER_RUNTIME_ENABLED
  ) {
    return false;
  }


  if (
    gardenChatState.mode !==
      "wander"
  ) {
    return false;
  }
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


/*
  Talk 素材都已經準備完成。

  正式把聊天狀態從
  chatPreparing 推進到 chat。
*/
gardenChatState.mode =
  "chat";

resetGardenTalkEndFlags();


/*
  同一幀透過 Animation Registry
  讓兩人正式進入 Talk。
*/
setGardenCharacterAnimationMode(
  "chifuyu",
  "talk",
  true
);

setGardenCharacterAnimationMode(
  "chinatsu",
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

  /*
    Canonical World 建立後，

    Initial Chat 不可以由
    每個 client 自己 Math.random()。

    在正式 deterministic CHAT
    Timeline 完成前，
    新 World 一律由 WANDER 開始。
  */
  if (
    GARDEN_CANONICAL_WANDER_RUNTIME_ENABLED
  ) {
    gardenPendingInitialMode =
      "wander";

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


  /*
    planGardenInitialMode()
    理論上已經決定 Wander。

    這裡再做一次 Runtime Guard，
    避免其他 caller 跳過 plan。
  */
  if (
    GARDEN_CANONICAL_WANDER_RUNTIME_ENABLED
  ) {
    gardenPendingInitialMode =
      null;

    return "wander";
  }


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


  /*
    Canonical World 開始接管後，

    舊的 local random Auto Travel
    不再允許自行改變 World Scene。

    未來 Travel 由：
    Schedule / Activity Timeline
    決定。
  */
  if (
    GARDEN_CANONICAL_WANDER_RUNTIME_ENABLED
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
    !canGardenCharacterUseAmbientWander(
      character,
      worldState
    )
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
  if (!CHIFUYU_AUTO_WALK_ENABLED) {
    return;
  }


  if (
    GARDEN_CANONICAL_WANDER_RUNTIME_ENABLED &&
    canGardenCharacterUseCanonicalWanderRuntime(
      "chifuyu"
    )
  ) {
    return;
  }

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

    /*
    Animation Movement Gate

    path 保留，
    但動畫不允許移動時，
    暫停實際位置推進。

    等限制解除後，
    可以從原 path 繼續。
  */
  if (
    !canGardenCharacterAdvanceMovement(
      "chifuyu"
    )
  ) {
    state.isMoving =
      false;

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

/* =========================
   Garden Character Animation Resolver

   World State / Activity
   ↓
   Animation Mode

   目前正式支援：
   - idle
   - walk
   - talk

   未來 read / tea / pray / swordPractice
   等 Activity 動畫也會從這裡接入。
========================= */

function resolveGardenCharacterAnimationMode(
  characterId,
  animationRuntime
) {
  if (
    !characterId ||
    !animationRuntime
  ) {
    return "idle";
  }


  const moveState =
    animationRuntime.state;

  /*
    =========================
    Animation Override
    =========================

    Completion Transition /
    Activity Sequence
    明確指定動畫時，
    優先於一般 Activity Resolver。
  */
  const overrideMode =
    getGardenCharacterAnimationOverride(
      characterId
    );


  if (overrideMode) {

    /*
      正常情況下 setOverride()
      已經檢查過動畫存在。

      這裡再保險一次：
      如果 Definition 日後被移除，
      不讓角色卡在無效 Override。
    */
    if (
      hasGardenCharacterAnimation(
        characterId,
        overrideMode
      )
    ) {
      return overrideMode;
    }


    clearGardenCharacterAnimationOverride(
      characterId
    );
  }


  const activity =
    typeof getGardenCharacterActivity ===
      "function"
      ? getGardenCharacterActivity(
          characterId
        )
      : null;


  /*
    =========================
    Chat
    =========================

    CHAT activity 不代表現在一定
    已經進入 Talk 動畫。

    approachChat：
    角色正在走去聊天位置
    → walk

    chatPreparing：
    等待 Talk sheet warmup
    → idle

    chat：
    正式聊天
    → talk
  */
  if (
    activity ===
      GARDEN_CHARACTER_ACTIVITY
        .CHAT
  ) {
    if (
      gardenChatState.mode ===
      "chat"
    ) {
      return "talk";
    }


    if (
      moveState?.isMoving
    ) {
      return "walk";
    }


    return "idle";
  }


  /*
    =========================
    Travel
    =========================

    目前 Travel 還是使用一般 Walk。

    transit 階段角色通常不可見，
    所以即使這裡回 idle，
    也不影響畫面。
  */
  if (
    activity ===
      GARDEN_CHARACTER_ACTIVITY
        .TRAVEL
  ) {
    return moveState?.isMoving
      ? "walk"
      : "idle";
  }


/*
  =========================
  Rest
  =========================

  第一版 REST 直接使用
  現有 idle animation。

  未來如果有：

  sit
  read-idle
  tea-idle

  再由 Activity Sequence /
  Override 接管。
*/
if (
  activity ===
    GARDEN_CHARACTER_ACTIVITY
      .REST
) {
  return moveState?.isMoving
    ? "walk"
    : "idle";
}



  /*
    =========================
    Wander
    =========================
  */
  if (
    activity ===
      GARDEN_CHARACTER_ACTIVITY
        .WANDER
  ) {
    return moveState?.isMoving
      ? "walk"
      : "idle";
  }


  /*
    =========================
    Fallback
    =========================

    未來如果新增 Activity，
    但還沒建立對應動畫規則，
    至少仍能安全退回 Walk / Idle。
  */
  return moveState?.isMoving
    ? "walk"
    : "idle";
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
  Canonical Character Spatial Runtime
  =========================

  同一幀只取得一次
  Absolute World Time。

  WANDER / TRAVEL
  都使用完全相同的 timestamp。
*/
const canonicalWorldTimestamp =
  getGardenWorldNow();


/*
  先 Resolve Wander。

  如果角色目前正在 TRAVEL，
  Wander 不會取得 ownership。
*/
const canonicalWanderRuntime =
  updateGardenCanonicalWanderRuntime(
    canonicalWorldTimestamp
  );


/*
  再 Resolve Travel。

  特別保留這個順序：

  Wander → Travel

  如果 Travel 正好在這一幀完成，
  Travel endpoint 會至少完整套用這一幀，
  不會在同一幀又被 Wander 覆寫。
*/
const canonicalTravelRuntime =
  updateGardenCanonicalTravelRuntime(
    canonicalWorldTimestamp
  );


/*
  Activity Spot Approach
  使用同一個 Absolute World Timestamp。
*/
const canonicalActivitySpotRuntime =
  updateGardenCanonicalActivitySpotRuntime(
    canonicalWorldTimestamp
  );


/*
  Canonical Chat Approach
  使用與 Wander / Travel /
  Activity Spot 完全相同的
  Absolute World Timestamp。

  目前只有 canonicalApproachPlan
  存在時才會取得 ownership。
*/
const canonicalChatApproachRuntime =
  updateGardenCanonicalChatApproachRuntime(
    canonicalWorldTimestamp
  );


const chifuyuCanonicalSpatialOwned =
  canonicalWanderRuntime
    .chifuyu
    .owned ||
  canonicalTravelRuntime
    .chifuyu
    .owned ||
  canonicalActivitySpotRuntime
    .chifuyu
    .owned ||
  canonicalChatApproachRuntime
    .chifuyu
    .owned;


const chinatsuCanonicalSpatialOwned =
  canonicalWanderRuntime
    .chinatsu
    .owned ||
  canonicalTravelRuntime
    .chinatsu
    .owned ||
  canonicalActivitySpotRuntime
    .chinatsu
    .owned ||
  canonicalChatApproachRuntime
    .chinatsu
    .owned;


/*
  只有完全沒有 Canonical
  Spatial Owner 的 Activity，

  例如：
  - Legacy Chat Approach
  - Legacy fallback

  才繼續使用舊 deltaMs
  path integrator。
*/
if (
  !chifuyuCanonicalSpatialOwned
) {
  updateChifuyuWalkPosition(
    deltaMs
  );
}


if (
  !chinatsuCanonicalSpatialOwned
) {
  updateChinatsuWalkPosition(
    deltaMs
  );
}


/*
  =========================
  Legacy Travel Fallback
  =========================

  有 Canonical Travel Ownership：
  完全不執行舊 phase simulator。

  沒有 spatialPlan 的舊存檔 /
  Legacy Travel：
  才允許繼續舊流程。
*/

if (
  !canonicalTravelRuntime
    .chifuyu
    .owned
) {
  updateGardenCharacterTravel(
    "chifuyu",
    now
  );
}


if (
  !canonicalTravelRuntime
    .chinatsu
    .owned
) {
  updateGardenCharacterTravel(
    "chinatsu",
    now
  );
}


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
  /*
    Canonical WANDER 已取得 ownership：

    不允許舊 Auto Walk
    再建立 random path。
  */
  if (
    !canonicalWanderRuntime
      .chifuyu
      .owned &&
    canGardenCharacterUseAmbientWander(
      "chifuyu"
    )
  ) {
    updateChifuyuAutoWalk(
      now
    );
  }


  if (
    !canonicalWanderRuntime
      .chinatsu
      .owned &&
    canGardenCharacterUseAmbientWander(
      "chinatsu"
    )
  ) {
    updateChinatsuAutoWalk(
      now
    );
  }
}


/* =========================
   Garden Character Animation Update

   所有已註冊角色統一從
   Animation Registry 更新。

   目前行為保持：
   Chat  → talk
   Moving → walk
   Other → idle
========================= */

for (
  const [
    characterId,
    animationRuntime
  ] of
  GARDEN_CHARACTER_ANIMATION_REGISTRY
) {
  const animationCommand =
  resolveGardenCharacterAnimationCommand(
    characterId,
    animationRuntime
  );


setGardenCharacterAnimationMode(
  characterId,
  animationCommand.mode,
  animationCommand.force
);


    updateGardenCharacterAnimationFrame(
  characterId,
  deltaMs
);


/*
  Sequence 要在 Frame Update 後檢查。

  因為 animFinished
  就是在 Frame Update 中成立。
*/
updateGardenCharacterAnimationSequences(
  characterId
);


applyGardenAnimationCompletionTransition(
  characterId
);
}

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
    "chat" &&
  !GARDEN_CANONICAL_WANDER_RUNTIME_ENABLED
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


      setGardenCharacterAnimationMode(
  "chifuyu",
  "idle",
  true
);

setGardenCharacterAnimationMode(
  "chinatsu",
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


  /*
  =========================
  Canonical Spatial First Sync
  =========================

  DOM 第一次 render 之前，
  先把角色同步到
  現在真正的 World Timestamp。

  順序與主 Loop 相同：
  Wander → Travel。
*/
const canonicalInitialTimestamp =
  getGardenWorldNow();


if (
  GARDEN_CANONICAL_WANDER_RUNTIME_ENABLED
) {
  updateGardenCanonicalWanderRuntime(
    canonicalInitialTimestamp
  );
}


if (
  GARDEN_CANONICAL_TRAVEL_RUNTIME_ENABLED
) {
  updateGardenCanonicalTravelRuntime(
    canonicalInitialTimestamp
  );
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

    durationMin: 28000,
    durationMax: 36000,
  },

  {
    widthMin: 530,
    widthMax: 600,

    durationMin: 33000,
    durationMax: 42000,
  },

  {
    widthMin: 590,
    widthMax: 670,

    durationMin: 38000,
    durationMax: 48000,
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

/* =========================
   Garden World Clock
========================= */

/*
  Garden 世界的「絕對時間」。

  與 Animation / RAF 使用的
  performance.now() 分開。

  World State / Activity Timeline /
  Suspend / Resume / Persistence
  之後都統一使用這個 API。
*/
let gardenWorldClockTestNow =
  null;


/*
  取得目前 Garden 世界時間。

  單位：
  Unix timestamp milliseconds

  正式狀態：
  Date.now()

  Debug 狀態：
  可由 test clock 覆蓋。
*/
function getGardenWorldNow() {
  if (
    Number.isFinite(
      gardenWorldClockTestNow
    )
  ) {
    return gardenWorldClockTestNow;
  }


  return Date.now();
}


/*
  判斷 timestamp 是否可以使用。
*/
function isValidGardenWorldTimestamp(
  timestamp
) {
  return (
    Number.isFinite(timestamp) &&
    timestamp >= 0
  );
}


/* =========================
   Garden Canonical World Time
========================= */

/*
  七原世界唯一標準時區。

  玩家人在台灣、日本、美國或歐洲，
  都必須以這個時區解讀：

  - 世界日期
  - 世界時刻
  - Daily Schedule
  - Event Seed
  - Activity Window

  不使用玩家本地 timezone。
*/
const GARDEN_WORLD_TIME_ZONE =
  "Asia/Tokyo";


const GARDEN_WORLD_TIME_ZONE_LABEL =
  "JST";


/*
  固定 Formatter。

  不要每次查時間都重新建立
  Intl.DateTimeFormat。
*/
const gardenWorldCalendarFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        GARDEN_WORLD_TIME_ZONE,

      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit",

      hourCycle:
        "h23",
    }
  );


const GARDEN_WORLD_WEEKDAY_KEYS =
  Object.freeze([
    "sun",
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "sat",
  ]);


/*
  將 Unix timestamp
  轉換成「七原世界日曆時間」。

  timestamp 本身是全球一致的絕對時間。

  timezone 只負責回答：

  「在七原世界裡，
    這一瞬間算幾月幾日、幾點？」
*/
function getGardenWorldCalendarParts(
  timestamp =
    getGardenWorldNow()
) {
  if (
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return null;
  }


  const date =
    new Date(
      timestamp
    );


  const formattedParts =
    gardenWorldCalendarFormatter
      .formatToParts(
        date
      );


  const partMap =
    {};


  for (
    const part of
    formattedParts
  ) {
    if (
      part.type ===
        "literal"
    ) {
      continue;
    }


    partMap[
      part.type
    ] =
      part.value;
  }


  const year =
    Number(
      partMap.year
    );

  const month =
    Number(
      partMap.month
    );

  const day =
    Number(
      partMap.day
    );

  const hour =
    Number(
      partMap.hour
    );

  const minute =
    Number(
      partMap.minute
    );

  const second =
    Number(
      partMap.second
    );


  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second)
  ) {
    return null;
  }


  /*
    這裡 year / month / day
    已經是七原世界日期。

    再用 UTC 建一個純曆法日期，
    只是為了安全取得星期幾，
    不會重新套玩家 timezone。
  */
  const weekdayIndex =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    ).getUTCDay();


  const pad2 =
    (value) =>
      String(
        value
      ).padStart(
        2,
        "0"
      );


  const dateKey =
    [
      year,
      pad2(month),
      pad2(day),
    ].join("-");


  const timeKey =
    [
      pad2(hour),
      pad2(minute),
      pad2(second),
    ].join(":");


  const minuteOfDay =
    hour * 60 +
    minute;


  const secondOfDay =
    minuteOfDay * 60 +
    second;


  return Object.freeze({
    timestamp,

    timeZone:
      GARDEN_WORLD_TIME_ZONE,

    timeZoneLabel:
      GARDEN_WORLD_TIME_ZONE_LABEL,

    year,
    month,
    day,

    hour,
    minute,
    second,

    weekdayIndex,

    weekday:
      GARDEN_WORLD_WEEKDAY_KEYS[
        weekdayIndex
      ],

    dateKey,

    timeKey,

    minuteOfDay,

    secondOfDay,
  });
}

/*
  今日世界日期。

  12B Deterministic Random
  之後會大量使用這個值當 Seed 的一部分。
*/
function getGardenWorldDateKey(
  timestamp =
    getGardenWorldNow()
) {
  return (
    getGardenWorldCalendarParts(
      timestamp
    )?.dateKey ??
    null
  );
}


/*
  一天中的分鐘數。

  例如：

  12:30
  =
  750
*/
function getGardenWorldMinuteOfDay(
  timestamp =
    getGardenWorldNow()
) {
  return (
    getGardenWorldCalendarParts(
      timestamp
    )?.minuteOfDay ??
    null
  );
}


/*
  Garden 世界的正式日夜規則：

  Night
  18:00 ～ 05:59

  Day
  06:00 ～ 17:59
*/
function isGardenWorldNight(
  timestamp =
    getGardenWorldNow()
) {
  const minuteOfDay =
    getGardenWorldMinuteOfDay(
      timestamp
    );


  if (
    !Number.isFinite(
      minuteOfDay
    )
  ) {
    return false;
  }


  return (
    minuteOfDay >=
      18 * 60 ||
    minuteOfDay <
      6 * 60
  );
}


function getGardenWorldDayNightMode(
  timestamp =
    getGardenWorldNow()
) {
  return isGardenWorldNight(
    timestamp
  )
    ? "night"
    : "day";
}


function getGardenWorldCanonicalTimeSnapshot(
  timestamp =
    getGardenWorldNow()
) {
  const calendar =
    getGardenWorldCalendarParts(
      timestamp
    );


  if (!calendar) {
    return null;
  }


  return {
    ...calendar,

    instantIso:
      new Date(
        timestamp
      ).toISOString(),

    dayNightMode:
      getGardenWorldDayNightMode(
        timestamp
      ),

    testClock:
      isGardenWorldClockInTestMode(),
  };
}


/*
  計算兩個世界 timestamp
  之間經過多久。

  如果系統時間被往回調，
  不允許出現負 elapsed。
*/
function getGardenWorldElapsedMs(
  fromTimestamp,
  toTimestamp =
    getGardenWorldNow()
) {
  if (
    !isValidGardenWorldTimestamp(
      fromTimestamp
    ) ||
    !isValidGardenWorldTimestamp(
      toTimestamp
    )
  ) {
    return 0;
  }


  return Math.max(
    0,
    toTimestamp -
      fromTimestamp
  );
}


/*
  Canonical World Time API
  到這裡已全部初始化完成。

  從此之後 Garden visual time
  不再依賴玩家 local timezone。
*/
gardenCanonicalWorldTimeReady =
  true;


/* =========================
   Garden Deterministic World Random
========================= */

/*
  世界隨機演算法版本。

  非常重要：

  一旦正式 Schedule 開始使用，
  不要隨便修改既有版本的算法。

  否則同一個日期重新計算時，
  過去的世界結果會全部改變。

  如果未來真的要換算法，
  應增加 VERSION。
*/
const GARDEN_WORLD_RANDOM_NAMESPACE =
  "nanahara-world";

const GARDEN_WORLD_RANDOM_VERSION =
  1;


/*
  將 Key 的每個部分做成
  不容易碰撞的穩定文字。

  例如：

  ["ab", "c"]

  不會和：

  ["a", "bc"]

  產生相同 key。
*/
function serializeGardenWorldRandomKeyPart(
  value
) {
  let text;

  if (value === null) {
    text = "<null>";

  } else if (
    value === undefined
  ) {
    text = "<undefined>";

  } else {
    text =
      String(value);
  }


  return (
    `${text.length}:${text}`
  );
}


/*
  建立正式 World Random Key。
*/
function buildGardenWorldRandomKey(
  ...parts
) {
  const namespace =
    [
      GARDEN_WORLD_RANDOM_NAMESPACE,
      `v${GARDEN_WORLD_RANDOM_VERSION}`,
    ].join("@");


  return [
    namespace,

    ...parts.map(
      serializeGardenWorldRandomKeyPart
    ),
  ].join("|");
}


/*
  將世界 Key 轉成
  deterministic uint32。

  使用固定 32-bit integer mixing，
  不依賴瀏覽器 timezone、
  locale 或 Math.random()。
*/
function hashGardenWorldRandomKey(
  ...parts
) {
  const key =
    buildGardenWorldRandomKey(
      ...parts
    );


  let hash =
    1779033703 ^
    key.length;


  for (
    let i = 0;
    i < key.length;
    i++
  ) {
    hash =
      Math.imul(
        hash ^
          key.charCodeAt(i),
        3432918353
      );


    hash =
      (hash << 13) |
      (hash >>> 19);
  }


  hash =
    Math.imul(
      hash ^
        (hash >>> 16),
      2246822507
    );


  hash =
    Math.imul(
      hash ^
        (hash >>> 13),
      3266489909
    );


  hash ^=
    hash >>> 16;


  return hash >>> 0;
}


function getGardenWorldDeterministicUnit(
  ...parts
) {
  return (
    hashGardenWorldRandomKey(
      ...parts
    ) /
    4294967296
  );
}


/*
  指定世界日期的 Daily Random。

  dateKey 必須是 Canonical World Date：

  YYYY-MM-DD
*/
function getGardenWorldDailyRandomUnit(
  dateKey,
  ...parts
) {
  if (
    !dateKey ||
    typeof dateKey !==
      "string"
  ) {
    return null;
  }


  return (
    getGardenWorldDeterministicUnit(
      "daily",
      dateKey,
      ...parts
    )
  );
}


/*
  今天的世界 Random。

  日期永遠來自
  Canonical World Time，
  不是玩家 local date。
*/
function getGardenWorldTodayRandomUnit(
  ...parts
) {
  const dateKey =
    getGardenWorldDateKey();


  if (!dateKey) {
    return null;
  }


  return (
    getGardenWorldDailyRandomUnit(
      dateKey,
      ...parts
    )
  );
}


function getGardenWorldDeterministicRange(
  min,
  max,
  ...parts
) {
  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max)
  ) {
    return null;
  }


  const low =
    Math.min(
      min,
      max
    );

  const high =
    Math.max(
      min,
      max
    );


  const unit =
    getGardenWorldDeterministicUnit(
      ...parts
    );


  return (
    low +
    unit *
      (high - low)
  );
}


/*
  inclusive integer：

  min 和 max 都有可能抽到。
*/
function getGardenWorldDeterministicInt(
  min,
  max,
  ...parts
) {
  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max)
  ) {
    return null;
  }


  const low =
    Math.ceil(
      Math.min(
        min,
        max
      )
    );

  const high =
    Math.floor(
      Math.max(
        min,
        max
      )
    );


  if (
    high < low
  ) {
    return null;
  }


  const unit =
    getGardenWorldDeterministicUnit(
      ...parts
    );


  return (
    low +
    Math.floor(
      unit *
      (high - low + 1)
    )
  );
}


function rollGardenWorldDeterministicChance(
  probability,
  ...parts
) {
  if (
    !Number.isFinite(
      probability
    )
  ) {
    return false;
  }


  const safeProbability =
    Math.max(
      0,
      Math.min(
        1,
        probability
      )
    );


  return (
    getGardenWorldDeterministicUnit(
      ...parts
    ) <
    safeProbability
  );
}


function pickGardenWorldDeterministic(
  items,
  ...parts
) {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return null;
  }


  const index =
    getGardenWorldDeterministicInt(
      0,
      items.length - 1,
      ...parts
    );


  return (
    items[index] ??
    null
  );
}



/* =========================
   Garden World Decision API
========================= */

const GARDEN_WORLD_DECISION_DEFAULT_CHARACTER =
  "world";

const GARDEN_WORLD_DECISION_DEFAULT_INSTANCE =
  "main";


function normalizeGardenWorldDecisionToken(
  value,
  fallback = null
) {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }


  const text =
    String(value).trim();


  return (
    text.length > 0
      ? text
      : fallback
  );
}


function createGardenWorldDailyDecisionDescriptor(
  options = {}
) {
  const dateKey =
    normalizeGardenWorldDecisionToken(
      options.dateKey,
      getGardenWorldDateKey()
    );


  const characterId =
    normalizeGardenWorldDecisionToken(
      options.characterId,
      GARDEN_WORLD_DECISION_DEFAULT_CHARACTER
    );


  const domainId =
    normalizeGardenWorldDecisionToken(
      options.domainId
    );


  const subjectId =
    normalizeGardenWorldDecisionToken(
      options.subjectId
    );


  const instanceId =
    normalizeGardenWorldDecisionToken(
      options.instanceId,
      GARDEN_WORLD_DECISION_DEFAULT_INSTANCE
    );


  const decisionId =
    normalizeGardenWorldDecisionToken(
      options.decisionId
    );


  /*
    Daily Decision 必須使用
    Canonical World Date 格式。
  */
  if (
    !dateKey ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateKey
    )
  ) {
    console.warn(
      "[Garden World] invalid decision dateKey:",
      dateKey
    );

    return null;
  }


  if (
    !characterId ||
    !domainId ||
    !subjectId ||
    !instanceId ||
    !decisionId
  ) {
    console.warn(
      "[Garden World] incomplete decision descriptor:",
      options
    );

    return null;
  }


  return Object.freeze({
    scope:
      "daily",

    dateKey,

    characterId,

    domainId,

    subjectId,

    instanceId,

    decisionId,
  });
}


function getGardenWorldDailyDecisionUnit(
  options = {}
) {
  const descriptor =
    createGardenWorldDailyDecisionDescriptor(
      options
    );


  if (!descriptor) {
    return null;
  }


  return (
    getGardenWorldDailyRandomUnit(
      descriptor.dateKey,

      descriptor.characterId,

      descriptor.domainId,

      descriptor.subjectId,

      descriptor.instanceId,

      descriptor.decisionId
    )
  );
}


function getGardenWorldDailyDecisionInt(
  options = {}
) {
  const min =
    options.min;

  const max =
    options.max;


  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max)
  ) {
    return null;
  }


  const low =
    Math.ceil(
      Math.min(
        min,
        max
      )
    );


  const high =
    Math.floor(
      Math.max(
        min,
        max
      )
    );


  if (
    high < low
  ) {
    return null;
  }


  const unit =
    getGardenWorldDailyDecisionUnit(
      options
    );


  if (
    !Number.isFinite(unit)
  ) {
    return null;
  }


  return (
    low +
    Math.floor(
      unit *
      (high - low + 1)
    )
  );
}


function rollGardenWorldDailyDecisionChance(
  options = {}
) {
  const probability =
    options.probability;


  if (
    !Number.isFinite(
      probability
    )
  ) {
    return false;
  }


  const safeProbability =
    Math.max(
      0,
      Math.min(
        1,
        probability
      )
    );


  const unit =
    getGardenWorldDailyDecisionUnit(
      options
    );


  if (
    !Number.isFinite(unit)
  ) {
    return false;
  }


  return (
    unit <
    safeProbability
  );
}



function pickGardenWorldDailyDecision(
  items,
  options = {}
) {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return null;
  }


  const index =
    getGardenWorldDailyDecisionInt({
      ...options,

      min:
        0,

      max:
        items.length - 1,
    });


  if (
    !Number.isInteger(index)
  ) {
    return null;
  }


  return (
    items[index] ??
    null
  );
}


function inspectGardenWorldDailyDecision(
  options = {}
) {
  const descriptor =
    createGardenWorldDailyDecisionDescriptor(
      options
    );


  if (!descriptor) {
    return null;
  }


  const randomParts = [
    "daily",

    descriptor.dateKey,

    descriptor.characterId,

    descriptor.domainId,

    descriptor.subjectId,

    descriptor.instanceId,

    descriptor.decisionId,
  ];


  const key =
    buildGardenWorldRandomKey(
      ...randomParts
    );


  const hash =
    hashGardenWorldRandomKey(
      ...randomParts
    );


  const unit =
    getGardenWorldDailyDecisionUnit(
      descriptor
    );


  return {
    descriptor,

    key,

    hash,

    unit,
  };
}

function getGardenWorldDailyDecisionDebugReport(
  dateKey =
    getGardenWorldDateKey()
) {
  if (!dateKey) {
    return null;
  }


  /*
    -------------------------
    Probe 1：
    午餐開始時間測試
    -------------------------

    11:40 ～ 13:10
    =
    700 ～ 790 分鐘
  */
  const lunchStartProbe =
    getGardenWorldDailyDecisionInt({
      dateKey,

      characterId:
        "chifuyu",

      domainId:
        "debug",

      subjectId:
        "lunchProbe",

      instanceId:
        "main",

      decisionId:
        "startMinute",

      min:
        700,

      max:
        790,
    });


  /*
    -------------------------
    Probe 2：
    Activity Choice
    -------------------------
  */
  const activityChoiceProbe =
    pickGardenWorldDailyDecision(
      [
        "read",
        "walk",
        "tea",
      ],
      {
        dateKey,

        characterId:
          "chinatsu",

        domainId:
          "debug",

        subjectId:
          "freeTimeProbe",

        instanceId:
          "slot-01",

        decisionId:
          "activityChoice",
      }
    );


  /*
    -------------------------
    Probe 3：
    Rare Event
    -------------------------
  */
  const rareEventProbe =
    rollGardenWorldDailyDecisionChance({
      dateKey,

      characterId:
        "chinatsu",

      domainId:
        "debug",

      subjectId:
        "rareEventProbe",

      instanceId:
        "main",

      decisionId:
        "trigger",

      probability:
        0.1,
    });


  return {
    debugOnly:
      true,

    dateKey,

    lunchStartProbe,

    activityChoiceProbe,

    rareEventProbe,
  };
}

/* =========================
   Garden Schedule Data Model
========================= */

const GARDEN_SCHEDULE_INTENT_SCHEMA =
  "nanaharaGardenScheduleIntent";

const GARDEN_SCHEDULE_INTENT_VERSION =
  1;


/*
  Schedule Priority

  目前只是資料語意。

  未來 Condition / Event Resolver
  才會真正拿它處理衝突。
*/
const GARDEN_SCHEDULE_PRIORITY =
  Object.freeze({
    LOW: 25,
    NORMAL: 50,
    HIGH: 75,
    CRITICAL: 100,
  });


/*
  Intent 原定時間錯過之後
  應採取的策略。

  SKIP
  → 今天就不做了。

  DEFER
  → 延後執行同一件事。

  COMPENSATE
  → 原活動錯過，
     之後產生替代活動。

  例如：
  Dinner 錯過
  → LateMeal
*/
const GARDEN_SCHEDULE_LATE_POLICY =
  Object.freeze({
    SKIP: "skip",
    DEFER: "defer",
    COMPENSATE: "compensate",
  });


function parseGardenScheduleTime(
  timeText
) {
  const match =
    String(
      timeText ?? ""
    ).match(
      /^(\d{1,2}):(\d{2})$/
    );


  if (!match) {
    return null;
  }


  const hour =
    Number(
      match[1]
    );

  const minute =
    Number(
      match[2]
    );


  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }


  return (
    hour * 60 +
    minute
  );
}


function formatGardenScheduleMinute(
  minuteOfDay
) {
  if (
    !Number.isFinite(
      minuteOfDay
    )
  ) {
    return null;
  }


  /*
    支援跨日資料。

    例如：
    1470
    → 下一日 00:30
  */
  const normalized =
    (
      Math.floor(
        minuteOfDay
      ) %
        1440 +
      1440
    ) %
    1440;


  const hour =
    Math.floor(
      normalized / 60
    );

  const minute =
    normalized % 60;


  return (
    `${String(hour).padStart(2, "0")}:` +
    `${String(minute).padStart(2, "0")}`
  );
}

function createGardenScheduleWindow(
  startTime,
  endTime
) {
  const startMinute =
    parseGardenScheduleTime(
      startTime
    );

  const endMinute =
    parseGardenScheduleTime(
      endTime
    );


  if (
    !Number.isInteger(
      startMinute
    ) ||
    !Number.isInteger(
      endMinute
    )
  ) {
    console.warn(
      "[Garden Schedule] invalid window:",
      startTime,
      endTime
    );

    return null;
  }


  /*
    例如：

    11:40 → 13:10
    不跨日。

    22:30 → 00:30
    跨到下一天。
  */
  const wrapsNextDay =
    endMinute <
    startMinute;


  const spanMinutes =
    wrapsNextDay
      ? (
          1440 -
          startMinute +
          endMinute
        )
      : (
          endMinute -
          startMinute
        );


  return Object.freeze({
    startTime:
      formatGardenScheduleMinute(
        startMinute
      ),

    endTime:
      formatGardenScheduleMinute(
        endMinute
      ),

    startMinute,

    endMinute,

    wrapsNextDay,

    spanMinutes,
  });
}


function createGardenScheduleDurationRange(
  minMinutes,
  maxMinutes = minMinutes
) {
  if (
    !Number.isFinite(
      minMinutes
    ) ||
    !Number.isFinite(
      maxMinutes
    )
  ) {
    return null;
  }


  const min =
    Math.floor(
      minMinutes
    );

  const max =
    Math.floor(
      maxMinutes
    );


  if (
    min < 0 ||
    max < 0 ||
    max < min
  ) {
    console.warn(
      "[Garden Schedule] invalid duration range:",
      minMinutes,
      maxMinutes
    );

    return null;
  }


  return Object.freeze({
    minMinutes:
      min,

    maxMinutes:
      max,

    fixed:
      min === max,
  });
}


function normalizeGardenScheduleActivityCandidates(
  values
) {
  if (
    !Array.isArray(values)
  ) {
    return Object.freeze([]);
  }


  const normalized =
    [];


  for (
    const value of
    values
  ) {
    const activityId =
      normalizeGardenWorldDecisionToken(
        value
      );


    if (
      !activityId ||
      normalized.includes(
        activityId
      )
    ) {
      continue;
    }


    normalized.push(
      activityId
    );
  }


  return Object.freeze(
    normalized
  );
}

function createGardenScheduleIntentDefinition(
  options = {}
) {
  const id =
    normalizeGardenWorldDecisionToken(
      options.id
    );


  const characterId =
    normalizeGardenWorldDecisionToken(
      options.characterId
    );


  const intentId =
    normalizeGardenWorldDecisionToken(
      options.intentId
    );


  const instanceId =
    normalizeGardenWorldDecisionToken(
      options.instanceId,
      "main"
    );


  if (
    !id ||
    !characterId ||
    !intentId ||
    !instanceId
  ) {
    console.warn(
      "[Garden Schedule] incomplete intent definition:",
      options
    );

    return null;
  }


  const window =
    createGardenScheduleWindow(
      options.windowStart,
      options.windowEnd
    );


  if (!window) {
    return null;
  }


  const duration =
    createGardenScheduleDurationRange(
      options.durationMinMinutes ??
        0,

      options.durationMaxMinutes ??
        options.durationMinMinutes ??
        0
    );


  if (!duration) {
    return null;
  }


  const rawPriority =
    Number.isFinite(
      options.priority
    )
      ? options.priority
      : GARDEN_SCHEDULE_PRIORITY
          .NORMAL;


  const priority =
    Math.max(
      0,
      Math.min(
        100,
        rawPriority
      )
    );


  const sceneId =
    normalizeGardenWorldDecisionToken(
      options.sceneId
    );


  const spotId =
    normalizeGardenWorldDecisionToken(
      options.spotId
    );


  const activityId =
    normalizeGardenWorldDecisionToken(
      options.activityId
    );


  const activityCandidates =
    normalizeGardenScheduleActivityCandidates(
      options.activityCandidates
    );


  const fallbackActivityId =
    normalizeGardenWorldDecisionToken(
      options.fallbackActivityId,
      "wander"
    );


  const requestedLatePolicy =
    normalizeGardenWorldDecisionToken(
      options.latePolicy,
      GARDEN_SCHEDULE_LATE_POLICY
        .SKIP
    );


  const validLatePolicies =
    Object.values(
      GARDEN_SCHEDULE_LATE_POLICY
    );


  const latePolicy =
    validLatePolicies.includes(
      requestedLatePolicy
    )
      ? requestedLatePolicy
      : GARDEN_SCHEDULE_LATE_POLICY
          .SKIP;


  const maxDelayMinutes =
    Number.isFinite(
      options.maxDelayMinutes
    )
      ? Math.max(
          0,
          Math.floor(
            options.maxDelayMinutes
          )
        )
      : null;


  const tags =
    Array.isArray(
      options.tags
    )
      ? Object.freeze(
          [
            ...new Set(
              options.tags
                .map((value) =>
                  normalizeGardenWorldDecisionToken(
                    value
                  )
                )
                .filter(Boolean)
            ),
          ]
        )
      : Object.freeze([]);


  return Object.freeze({
    schema:
      GARDEN_SCHEDULE_INTENT_SCHEMA,

    version:
      GARDEN_SCHEDULE_INTENT_VERSION,

    id,

    characterId,

    intentId,

    instanceId,

    window,

    duration,

    priority,

    target:
      Object.freeze({
        sceneId,
        spotId,
      }),

    activity:
      Object.freeze({
        activityId,
        candidates:
          activityCandidates,

        fallbackActivityId,
      }),

    flexibility:
      Object.freeze({
        canDelay:
          options.canDelay !==
          false,

        canBeOverridden:
          options.canBeOverridden !==
          false,

        latePolicy,

        maxDelayMinutes,
      }),

    tags,
  });
}

function isValidGardenScheduleIntentDefinition(
  definition
) {
  if (
    !definition ||
    typeof definition !==
      "object"
  ) {
    return false;
  }


  if (
    definition.schema !==
      GARDEN_SCHEDULE_INTENT_SCHEMA ||
    definition.version !==
      GARDEN_SCHEDULE_INTENT_VERSION
  ) {
    return false;
  }


  if (
    !definition.id ||
    !definition.characterId ||
    !definition.intentId ||
    !definition.window ||
    !definition.duration
  ) {
    return false;
  }


  if (
    !Number.isInteger(
      definition.window.startMinute
    ) ||
    !Number.isInteger(
      definition.window.endMinute
    )
  ) {
    return false;
  }


  return true;
}

function getGardenScheduleDataModelDebugSamples() {
  const lunch =
    createGardenScheduleIntentDefinition({
      id:
        "debug-chifuyu-lunch",

      characterId:
        "chifuyu",

      intentId:
        "lunch",

      windowStart:
        "11:40",

      windowEnd:
        "13:10",

      durationMinMinutes:
        30,

      durationMaxMinutes:
        50,

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .HIGH,

      activityId:
        "meal",

      fallbackActivityId:
        "wander",

      canDelay:
        true,

      canBeOverridden:
        true,

      latePolicy:
        GARDEN_SCHEDULE_LATE_POLICY
          .COMPENSATE,

      maxDelayMinutes:
        120,

      tags: [
        "meal",
        "routine",
      ],
    });


  const afternoonFree =
    createGardenScheduleIntentDefinition({
      id:
        "debug-chinatsu-afternoon-free",

      characterId:
        "chinatsu",

      intentId:
        "afternoonFree",

      instanceId:
        "slot-01",

      windowStart:
        "13:00",

      windowEnd:
        "17:00",

      durationMinMinutes:
        35,

      durationMaxMinutes:
        90,

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .NORMAL,

      activityCandidates: [
        "read",
        "walk",
        "tea",
      ],

      fallbackActivityId:
        "wander",

      latePolicy:
        GARDEN_SCHEDULE_LATE_POLICY
          .SKIP,

      tags: [
        "freeTime",
      ],
    });


  const eveningBridge =
    createGardenScheduleIntentDefinition({
      id:
        "debug-chifuyu-evening-bridge",

      characterId:
        "chifuyu",

      intentId:
        "eveningBridge",

      windowStart:
        "19:00",

      windowEnd:
        "22:30",

      durationMinMinutes:
        30,

      durationMaxMinutes:
        75,

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .LOW,

      sceneId:
        "moonBridge",

      activityCandidates: [
        "walk",
        "tea",
      ],

      fallbackActivityId:
        "wander",

      canDelay:
        true,

      latePolicy:
        GARDEN_SCHEDULE_LATE_POLICY
          .SKIP,

      tags: [
        "freeTime",
        "outdoor",
      ],
    });


  return Object.freeze({
    debugOnly:
      true,

    lunch,

    afternoonFree,

    eveningBridge,

    allValid:
      [
        lunch,
        afternoonFree,
        eveningBridge,
      ].every(
        isValidGardenScheduleIntentDefinition
      ),
  });
}


/* =========================
   Garden Daily Schedule Generator
========================= */

const GARDEN_DAILY_SCHEDULE_SCHEMA =
  "nanaharaGardenDailySchedule";

const GARDEN_DAILY_SCHEDULE_VERSION =
  1;

const GARDEN_DAILY_SCHEDULE_ENTRY_SCHEMA =
  "nanaharaGardenScheduleEntry";

const GARDEN_DAILY_SCHEDULE_ENTRY_VERSION =
  1;

function splitGardenScheduleTimelineMinute(
  timelineMinute
) {
  if (
    !Number.isFinite(
      timelineMinute
    )
  ) {
    return null;
  }


  const safeMinute =
    Math.floor(
      timelineMinute
    );


  const dayOffset =
    Math.floor(
      safeMinute / 1440
    );


  const minuteOfDay =
    (
      safeMinute % 1440 +
      1440
    ) % 1440;


  return Object.freeze({
    timelineMinute:
      safeMinute,

    dayOffset,

    minuteOfDay,

    time:
      formatGardenScheduleMinute(
        minuteOfDay
      ),
  });
}


/*
  將：

  base dateKey
  +
  timelineMinute

  轉成真正的 Garden
  Absolute World Timestamp。

  支援跨午夜：
  1440 以上 → 下一天
  負數      → 前一天

  Garden World 固定使用 JST / +09:00。
*/
function getGardenTimelineTimestamp(
  baseDateKey,
  timelineMinute,
  second = 0
) {
  if (
    typeof baseDateKey !==
      "string" ||
    !Number.isFinite(
      timelineMinute
    ) ||
    !Number.isInteger(
      second
    ) ||
    second < 0 ||
    second >= 60
  ) {
    return null;
  }


  const point =
    splitGardenScheduleTimelineMinute(
      timelineMinute
    );


  if (!point) {
    return null;
  }


  const effectiveDateKey =
    shiftGardenScheduleDateKey(
      baseDateKey,
      point.dayOffset
    );


  if (!effectiveDateKey) {
    return null;
  }


  const hour =
    Math.floor(
      point.minuteOfDay / 60
    );

  const minute =
    point.minuteOfDay % 60;


  const pad2 =
    (value) =>
      String(value).padStart(
        2,
        "0"
      );


  const timestamp =
    Date.parse(
      `${effectiveDateKey}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}+09:00`
    );


  return (
    isValidGardenWorldTimestamp(
      timestamp
    )
      ? timestamp
      : null
  );
}


function generateGardenDailyScheduleDuration(
  definition,
  dateKey
) {
  if (
    !isValidGardenScheduleIntentDefinition(
      definition
    )
  ) {
    return null;
  }


  const {
    minMinutes,
    maxMinutes,
  } =
    definition.duration;


  /*
    固定 Duration 不需要 Random。
  */
  if (
    minMinutes ===
    maxMinutes
  ) {
    return minMinutes;
  }


  return (
    getGardenWorldDailyDecisionInt({
      dateKey,

      characterId:
        definition.characterId,

      domainId:
        "schedule",

      subjectId:
        definition.intentId,

      instanceId:
        definition.instanceId,

      decisionId:
        "durationMinutes",

      min:
        minMinutes,

      max:
        maxMinutes,
    })
  );
}



function generateGardenDailyScheduleActivity(
  definition,
  dateKey
) {
  if (
    !isValidGardenScheduleIntentDefinition(
      definition
    )
  ) {
    return null;
  }


  const activity =
    definition.activity;


  /*
    明確指定 Activity：
    直接使用，不需要抽。
  */
  if (
    activity.activityId
  ) {
    return Object.freeze({
      selectedActivityId:
        activity.activityId,

      source:
        "fixed",

      fallbackActivityId:
        activity.fallbackActivityId,
    });
  }


  /*
    有候選清單：
    用 World Decision 選今天那個。
  */
  if (
    activity.candidates.length >
    0
  ) {
    const selected =
      pickGardenWorldDailyDecision(
        activity.candidates,
        {
          dateKey,

          characterId:
            definition.characterId,

          domainId:
            "schedule",

          subjectId:
            definition.intentId,

          instanceId:
            definition.instanceId,

          decisionId:
            "activityChoice",
        }
      );


    return Object.freeze({
      selectedActivityId:
        selected,

      source:
        "candidate",

      fallbackActivityId:
        activity.fallbackActivityId,
    });
  }


  /*
    沒有正式 Activity：
    直接留下 fallback。
  */
  return Object.freeze({
    selectedActivityId:
      activity.fallbackActivityId,

    source:
      "fallback",

    fallbackActivityId:
      activity.fallbackActivityId,
  });
}



function generateGardenDailyScheduleStartMinute(
  definition,
  dateKey,
  durationMinutes
) {
  if (
    !isValidGardenScheduleIntentDefinition(
      definition
    ) ||
    !Number.isFinite(
      durationMinutes
    )
  ) {
    return null;
  }


  const window =
    definition.window;


  /*
    Window 代表：

    「允許開始 Activity 的時間範圍」

    Duration 可以超過 Window 尾端。

    例如：

    Lunch Window
    11:40 ～ 13:10

    13:05 開始、
    13:45 結束

    是合法的。
  */
  const windowStart =
    window.startMinute;


  const windowEnd =
    window.startMinute +
    window.spanMinutes;


  /*
    固定開始時間。
  */
  if (
    windowEnd ===
    windowStart
  ) {
    return windowStart;
  }


  return (
    getGardenWorldDailyDecisionInt({
      dateKey,

      characterId:
        definition.characterId,

      domainId:
        "schedule",

      subjectId:
        definition.intentId,

      instanceId:
        definition.instanceId,

      decisionId:
        "startMinute",

      min:
        windowStart,

      max:
        windowEnd,
    })
  );
}

function generateGardenDailyScheduleEntry(
  definition,
  dateKey =
    getGardenWorldDateKey()
) {
  if (
    !isValidGardenScheduleIntentDefinition(
      definition
    )
  ) {
    return null;
  }


  if (
    !dateKey ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateKey
    )
  ) {
    return null;
  }


  const durationMinutes =
    generateGardenDailyScheduleDuration(
      definition,
      dateKey
    );


  if (
    !Number.isFinite(
      durationMinutes
    )
  ) {
    return null;
  }


  const startTimelineMinute =
    generateGardenDailyScheduleStartMinute(
      definition,
      dateKey,
      durationMinutes
    );


  if (
    !Number.isFinite(
      startTimelineMinute
    )
  ) {
    return null;
  }


  const endTimelineMinute =
    startTimelineMinute +
    durationMinutes;


  const start =
    splitGardenScheduleTimelineMinute(
      startTimelineMinute
    );


  const end =
    splitGardenScheduleTimelineMinute(
      endTimelineMinute
    );


  if (
    !start ||
    !end
  ) {
    return null;
  }


  const activity =
    generateGardenDailyScheduleActivity(
      definition,
      dateKey
    );


  if (!activity) {
    return null;
  }


  /*
    是否完整落在原始 Window 裡。

    未來 Event Resolver / Inspector
    可以拿來判斷異常。
  */
  const windowStartTimeline =
  definition.window
    .startMinute;


const windowEndTimeline =
  windowStartTimeline +
  definition.window
    .spanMinutes;


/*
  Window 是 Start Window。

  所以只判斷：
  Activity 的開始時間
  是否仍位於原本允許區間。
*/
const fitsOriginalWindow =
  startTimelineMinute >=
    windowStartTimeline &&
  startTimelineMinute <=
    windowEndTimeline;


  return Object.freeze({
    schema:
      GARDEN_DAILY_SCHEDULE_ENTRY_SCHEMA,

    version:
      GARDEN_DAILY_SCHEDULE_ENTRY_VERSION,

    dateKey,

    definitionId:
      definition.id,

    characterId:
      definition.characterId,

    intentId:
      definition.intentId,

    instanceId:
      definition.instanceId,

window:
  definition.window,

    start,

    end,

    durationMinutes,

    priority:
      definition.priority,

    target:
      definition.target,

    activity,

    flexibility:
      definition.flexibility,

    tags:
      definition.tags,

    fitsOriginalWindow,
  });
}


function generateGardenDailySchedule(
  definitions,
  dateKey =
    getGardenWorldDateKey()
) {
  if (
    !Array.isArray(
      definitions
    ) ||
    !dateKey ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateKey
    )
  ) {
    return null;
  }


  const entries =
    [];


  for (
    const definition of
    definitions
  ) {
    if (
      !isValidGardenScheduleIntentDefinition(
        definition
      )
    ) {
      continue;
    }


    const entry =
      generateGardenDailyScheduleEntry(
        definition,
        dateKey
      );


    if (entry) {
      entries.push(
        entry
      );
    }
  }


  /*
    按開始時間排序。

    同時開始時：
    高 Priority 優先。

    再相同：
    用 ID 保證排序穩定。
  */
  entries.sort(
    (a, b) => {
      const timeDiff =
        a.start.timelineMinute -
        b.start.timelineMinute;


      if (
        timeDiff !== 0
      ) {
        return timeDiff;
      }


      const priorityDiff =
        b.priority -
        a.priority;


      if (
        priorityDiff !== 0
      ) {
        return priorityDiff;
      }


      return (
        a.definitionId.localeCompare(
          b.definitionId
        )
      );
    }
  );


  return Object.freeze({
    schema:
      GARDEN_DAILY_SCHEDULE_SCHEMA,

    version:
      GARDEN_DAILY_SCHEDULE_VERSION,

    dateKey,

    entries:
      Object.freeze(
        entries
      ),
  });
}


function getGardenDailyScheduleGeneratorDebugReport(
  dateKey =
    getGardenWorldDateKey()
) {
  const samples =
    getGardenScheduleDataModelDebugSamples();


  if (
    !samples ||
    !samples.allValid
  ) {
    return null;
  }


  const definitions = [
    samples.lunch,
    samples.afternoonFree,
    samples.eveningBridge,
  ];


  const schedule =
    generateGardenDailySchedule(
      definitions,
      dateKey
    );


  if (!schedule) {
    return null;
  }


  return {
    debugOnly:
      true,

    dateKey,

    schedule,

    summary:
      schedule.entries.map(
        (entry) => ({
          character:
            entry.characterId,

          intent:
            entry.intentId,

          start:
            (
              entry.start.dayOffset >
              0
                ? `+${entry.start.dayOffset} `
                : ""
            ) +
            entry.start.time,

          end:
            (
              entry.end.dayOffset >
              0
                ? `+${entry.end.dayOffset} `
                : ""
            ) +
            entry.end.time,

          duration:
            entry.durationMinutes,

          activity:
            entry.activity
              .selectedActivityId,

          scene:
            entry.target
              .sceneId,

          priority:
            entry.priority,
        })
      ),
  };
}

/* =========================
   Garden Schedule Override Model
========================= */

const GARDEN_SCHEDULE_OVERRIDE_SCHEMA =
  "nanaharaGardenScheduleOverride";

const GARDEN_SCHEDULE_OVERRIDE_VERSION =
  1;


const GARDEN_SCHEDULE_OVERRIDE_ACTION =
  Object.freeze({
    CANCEL:
      "cancel",

    SHIFT:
      "shift",
  });

function createGardenScheduleOverrideDefinition(
  options = {}
) {
  const id =
    normalizeGardenWorldDecisionToken(
      options.id
    );


  const eventId =
    normalizeGardenWorldDecisionToken(
      options.eventId
    );


  const action =
    normalizeGardenWorldDecisionToken(
      options.action
    );


  if (
    !id ||
    !eventId ||
    !Object.values(
      GARDEN_SCHEDULE_OVERRIDE_ACTION
    ).includes(
      action
    )
  ) {
    return null;
  }


  const target =
    Object.freeze({
      definitionId:
        normalizeGardenWorldDecisionToken(
          options.targetDefinitionId
        ),

      characterId:
        normalizeGardenWorldDecisionToken(
          options.targetCharacterId
        ),

      intentId:
        normalizeGardenWorldDecisionToken(
          options.targetIntentId
        ),

      instanceId:
        normalizeGardenWorldDecisionToken(
          options.targetInstanceId
        ),
    });


  /*
    至少必須指定一種 Target。
  */
  if (
    !target.definitionId &&
    !target.characterId &&
    !target.intentId &&
    !target.instanceId
  ) {
    return null;
  }


  const priority =
    Number.isFinite(
      options.priority
    )
      ? options.priority
      : 50;


  let shiftMinutes =
    0;


  if (
    action ===
      GARDEN_SCHEDULE_OVERRIDE_ACTION
        .SHIFT
  ) {
    if (
      !Number.isFinite(
        options.shiftMinutes
      )
    ) {
      return null;
    }


    shiftMinutes =
      Math.trunc(
        options.shiftMinutes
      );
  }


  return Object.freeze({
    schema:
      GARDEN_SCHEDULE_OVERRIDE_SCHEMA,

    version:
      GARDEN_SCHEDULE_OVERRIDE_VERSION,

    id,

    eventId,

    action,

    priority,

    target,

    shiftMinutes,

    tags:
      Object.freeze(
        Array.isArray(
          options.tags
        )
          ? [
              ...new Set(
                options.tags
                  .map(
                    (value) =>
                      normalizeGardenWorldDecisionToken(
                        value
                      )
                  )
                  .filter(Boolean)
              ),
            ]
          : []
      ),
  });
}

function doesGardenScheduleOverrideMatchEntry(
  override,
  entry
) {
  if (
    !override ||
    override.schema !==
      GARDEN_SCHEDULE_OVERRIDE_SCHEMA ||
    !entry
  ) {
    return false;
  }


  const target =
    override.target;


  if (
    target.definitionId &&
    entry.definitionId !==
      target.definitionId
  ) {
    return false;
  }


  if (
    target.characterId &&
    entry.characterId !==
      target.characterId
  ) {
    return false;
  }


  if (
    target.intentId &&
    entry.intentId !==
      target.intentId
  ) {
    return false;
  }


  if (
    target.instanceId &&
    entry.instanceId !==
      target.instanceId
  ) {
    return false;
  }


  return true;
}

function getActiveGardenScheduleOverrides(
  overrideDefinitions,
  eventResolution
) {
  if (
    !Array.isArray(
      overrideDefinitions
    ) ||
    !eventResolution ||
    !Array.isArray(
      eventResolution.triggeredEvents
    )
  ) {
    return [];
  }


  const triggeredEventIds =
    new Set(
      eventResolution
        .triggeredEvents
        .map(
          (event) =>
            event.eventId
        )
    );


  return (
    overrideDefinitions
      .filter(
        (override) =>
          override &&
          override.schema ===
            GARDEN_SCHEDULE_OVERRIDE_SCHEMA &&
          triggeredEventIds.has(
            override.eventId
          )
      )
      .sort(
        (a, b) => {
          const priorityDiff =
            b.priority -
            a.priority;


          if (
            priorityDiff !== 0
          ) {
            return priorityDiff;
          }


          return (
            a.id.localeCompare(
              b.id
            )
          );
        }
      )
  );
}


function shiftGardenScheduleEntry(
  entry,
  override
) {
  if (
    !entry ||
    !override ||
    override.action !==
      GARDEN_SCHEDULE_OVERRIDE_ACTION
        .SHIFT
  ) {
    return null;
  }


  const shiftMinutes =
    override.shiftMinutes;


  const startTimelineMinute =
    entry.start.timelineMinute +
    shiftMinutes;


  const endTimelineMinute =
    entry.end.timelineMinute +
    shiftMinutes;


  const start =
    splitGardenScheduleTimelineMinute(
      startTimelineMinute
    );


  const end =
    splitGardenScheduleTimelineMinute(
      endTimelineMinute
    );


  if (
    !start ||
    !end
  ) {
    return null;
  }


  /*
    Override 後重新判斷
    是否還落在原始 Window。
  */
  let fitsOriginalWindow =
    entry.fitsOriginalWindow;


  if (entry.window) {
    const windowStart =
      entry.window.startMinute;

    const windowEnd =
      windowStart +
      entry.window.spanMinutes;


    fitsOriginalWindow =
  startTimelineMinute >=
    windowStart &&
  startTimelineMinute <=
    windowEnd;
  }


  const previousHistory =
    Array.isArray(
      entry.overrideHistory
    )
      ? entry.overrideHistory
      : [];


  return Object.freeze({
    ...entry,

    start,

    end,

    fitsOriginalWindow,

    overrideHistory:
      Object.freeze([
        ...previousHistory,

        Object.freeze({
          overrideId:
            override.id,

          eventId:
            override.eventId,

          action:
            override.action,

          shiftMinutes,
        }),
      ]),
  });
}

function applyGardenScheduleOverrides(
  schedule,
  overrideDefinitions,
  eventResolution
) {
  if (
    !isValidGardenDailySchedule(
      schedule
    )
  ) {
    return null;
  }


  const activeOverrides =
    getActiveGardenScheduleOverrides(
      overrideDefinitions,
      eventResolution
    );


  const effectiveEntries =
    [];


  const appliedOverrides =
    [];


  const cancelledEntries =
    [];


  for (
    const entry of
    schedule.entries
  ) {
    const matching =
      activeOverrides.filter(
        (override) =>
          doesGardenScheduleOverrideMatchEntry(
            override,
            entry
          )
      );


    /*
      同一 Entry 同時命中多個 Override：

      高 Priority 的第一個勝出。

      暫時不做多個 Override 疊加，
      避免結果變得難以追蹤。
    */
    const winner =
      matching[0] ??
      null;


    if (!winner) {
      effectiveEntries.push(
        entry
      );

      continue;
    }


    if (
      winner.action ===
        GARDEN_SCHEDULE_OVERRIDE_ACTION
          .CANCEL
    ) {
      cancelledEntries.push(
        entry
      );


      appliedOverrides.push({
        overrideId:
          winner.id,

        eventId:
          winner.eventId,

        action:
          winner.action,

        definitionId:
          entry.definitionId,
      });


      continue;
    }


    if (
      winner.action ===
        GARDEN_SCHEDULE_OVERRIDE_ACTION
          .SHIFT
    ) {
      const shiftedEntry =
        shiftGardenScheduleEntry(
          entry,
          winner
        );


      if (shiftedEntry) {
        effectiveEntries.push(
          shiftedEntry
        );


        appliedOverrides.push({
          overrideId:
            winner.id,

          eventId:
            winner.eventId,

          action:
            winner.action,

          definitionId:
            entry.definitionId,

          shiftMinutes:
            winner.shiftMinutes,
        });


        continue;
      }
    }


    /*
      Override 失敗時保守保留原 Entry。
    */
    effectiveEntries.push(
      entry
    );
  }


  /*
    SHIFT 後時間順序可能改變，
    所以重新排序。
  */
  effectiveEntries.sort(
    (a, b) => {
      const timeDiff =
        a.start.timelineMinute -
        b.start.timelineMinute;


      if (
        timeDiff !== 0
      ) {
        return timeDiff;
      }


      const priorityDiff =
        b.priority -
        a.priority;


      if (
        priorityDiff !== 0
      ) {
        return priorityDiff;
      }


      return (
        a.definitionId.localeCompare(
          b.definitionId
        )
      );
    }
  );


  const effectiveSchedule =
    Object.freeze({
      schema:
        schedule.schema,

      version:
        schedule.version,

      dateKey:
        schedule.dateKey,

      entries:
        Object.freeze(
          effectiveEntries
        ),

      derivedFromOverrides:
        true,
  });


  return Object.freeze({
    sourceSchedule:
      schedule,

    effectiveSchedule,

    activeOverrides:
      Object.freeze(
        activeOverrides
      ),

    appliedOverrides:
      Object.freeze(
        appliedOverrides
      ),

    cancelledEntries:
      Object.freeze(
        cancelledEntries
      ),
  });
}

function runGardenScheduleOverrideSelfTest() {
  const dateKey =
    "2026-09-23";


  /*
    =========================
    Original Schedule
    =========================
  */

  const swordPractice =
    createGardenScheduleIntentDefinition({
      id:
        "test-chifuyu-sword-practice",

      characterId:
        "chifuyu",

      intentId:
        "swordPractice",

      windowStart:
        "10:00",

      windowEnd:
        "10:00",

      durationMinMinutes:
        60,

      durationMaxMinutes:
        60,

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .NORMAL,

      activityId:
        "swordPractice",

      fallbackActivityId:
        "wander",
    });


  const dinner =
    createGardenScheduleIntentDefinition({
      id:
        "test-chinatsu-dinner",

      characterId:
        "chinatsu",

      intentId:
        "dinner",

      windowStart:
        "18:00",

      windowEnd:
        "18:00",

      durationMinMinutes:
        45,

      durationMaxMinutes:
        45,

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .HIGH,

      activityId:
        "meal",

      fallbackActivityId:
        "wander",
    });


  const sourceSchedule =
    generateGardenDailySchedule(
      [
        swordPractice,
        dinner,
      ],
      dateKey
    );


  /*
    =========================
    Conditions
    =========================
  */

  const snapshot =
    createGardenWorldConditionSnapshot({
      dateKey,

      characters: {
        chinatsu: {
          stress:
            0.80,
        },

        chifuyu: {
          fatigue:
            0.90,
        },
      },
    });


  /*
    =========================
    Events
    =========================
  */

  const heavyPaperwork =
    createGardenWorldEventDefinition({
      id:
        "heavyPaperwork",

      characterId:
        "chinatsu",

      probability:
        1,

      priority:
        70,

      conditions: [
        createGardenWorldEventCondition({
          scope:
            GARDEN_WORLD_EVENT_CONDITION_SCOPE
              .CHARACTER,

          characterId:
            "chinatsu",

          key:
            "stress",

          operator:
            GARDEN_WORLD_EVENT_CONDITION_OPERATOR
              .GTE,

          value:
            0.60,
        }),
      ],
    });


  const trainingForbidden =
    createGardenWorldEventDefinition({
      id:
        "trainingForbidden",

      characterId:
        "chifuyu",

      probability:
        1,

      priority:
        90,

      conditions: [
        createGardenWorldEventCondition({
          scope:
            GARDEN_WORLD_EVENT_CONDITION_SCOPE
              .CHARACTER,

          characterId:
            "chifuyu",

          key:
            "fatigue",

          operator:
            GARDEN_WORLD_EVENT_CONDITION_OPERATOR
              .GTE,

          value:
            0.80,
        }),
      ],
    });


  const eventResolution =
    resolveGardenWorldDailyEvents(
      [
        heavyPaperwork,
        trainingForbidden,
      ],
      snapshot,
      dateKey
    );


  /*
    =========================
    Overrides
    =========================
  */

  const dinnerDelay =
    createGardenScheduleOverrideDefinition({
      id:
        "heavy-paperwork-delay-dinner",

      eventId:
        "heavyPaperwork",

      action:
        GARDEN_SCHEDULE_OVERRIDE_ACTION
          .SHIFT,

      targetDefinitionId:
        "test-chinatsu-dinner",

      shiftMinutes:
        60,

      priority:
        70,
    });


  const cancelTraining =
    createGardenScheduleOverrideDefinition({
      id:
        "fatigue-cancel-training",

      eventId:
        "trainingForbidden",

      action:
        GARDEN_SCHEDULE_OVERRIDE_ACTION
          .CANCEL,

      targetDefinitionId:
        "test-chifuyu-sword-practice",

      priority:
        90,
    });


  const first =
    applyGardenScheduleOverrides(
      sourceSchedule,
      [
        dinnerDelay,
        cancelTraining,
      ],
      eventResolution
    );


  const second =
    applyGardenScheduleOverrides(
      sourceSchedule,
      [
        dinnerDelay,
        cancelTraining,
      ],
      eventResolution
    );


  const sourceDinner =
    sourceSchedule.entries.find(
      (entry) =>
        entry.intentId ===
        "dinner"
    );


  const effectiveDinner =
    first
      ?.effectiveSchedule
      ?.entries
      ?.find(
        (entry) =>
          entry.intentId ===
          "dinner"
      );


  const effectiveTraining =
    first
      ?.effectiveSchedule
      ?.entries
      ?.find(
        (entry) =>
          entry.intentId ===
          "swordPractice"
      );


  const checks = {
    sourceScheduleExists:
      !!sourceSchedule,

    bothEventsTriggered:
      eventResolution
        ?.triggeredCount ===
      2,

    sourceTrainingStillExists:
      sourceSchedule.entries.some(
        (entry) =>
          entry.intentId ===
          "swordPractice"
      ),

    effectiveTrainingCancelled:
      !effectiveTraining,

    dinnerStillExists:
      !!effectiveDinner,

    dinnerShifted60Minutes:
      effectiveDinner
        ?.start
        ?.timelineMinute ===
      sourceDinner
        ?.start
        ?.timelineMinute +
        60,

    dinnerDurationPreserved:
      effectiveDinner
        ?.durationMinutes ===
      sourceDinner
        ?.durationMinutes,

    twoOverridesApplied:
      first
        ?.appliedOverrides
        ?.length ===
      2,

    originalScheduleUnchanged:
      sourceDinner
        ?.start
        ?.time ===
      "18:00",

    deterministic:
      JSON.stringify(first) ===
      JSON.stringify(second),
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    eventResolution,

    sourceSchedule:

      sourceSchedule,

    effectiveSchedule:
      first
        ?.effectiveSchedule,

    appliedOverrides:
      first
        ?.appliedOverrides,
  };


  if (pass) {
    console.log(
      "[Garden Schedule Override Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Schedule Override Self-Test] FAIL",
      result
    );
  }


  return result;
}


/* =========================
   Garden Schedule Conflict Resolver
========================= */

function doGardenScheduleEntriesOverlap(
  a,
  b
) {
  if (
    !a ||
    !b ||
    a.characterId !==
      b.characterId
  ) {
    return false;
  }


  return (
    a.start.timelineMinute <
      b.end.timelineMinute &&
    b.start.timelineMinute <
      a.end.timelineMinute
  );
}

function resolveGardenScheduleConflicts(
  schedule
) {
  if (
    !isValidGardenDailySchedule(
      schedule
    )
  ) {
    return null;
  }


  /*
    Winner Ranking：

    1. Priority 高
    2. 相同 Priority → 較晚開始
    3. 再相同 → definitionId

    和 12D Resolver 的原則一致。
  */
  const ranked =
    [...schedule.entries].sort(
      (a, b) => {
        const priorityDiff =
          b.priority -
          a.priority;


        if (
          priorityDiff !== 0
        ) {
          return priorityDiff;
        }


        const startDiff =
          b.start.timelineMinute -
          a.start.timelineMinute;


        if (
          startDiff !== 0
        ) {
          return startDiff;
        }


        return (
          a.definitionId.localeCompare(
            b.definitionId
          )
        );
      }
    );


  const accepted =
    [];

  const suppressedEntries =
    [];

  const conflicts =
    [];


  for (
    const candidate of
    ranked
  ) {
    const winner =
      accepted.find(
        (entry) =>
          doGardenScheduleEntriesOverlap(
            candidate,
            entry
          )
      );


    if (!winner) {
      accepted.push(
        candidate
      );

      continue;
    }


    suppressedEntries.push(
      candidate
    );


    conflicts.push(
      Object.freeze({
        characterId:
          candidate.characterId,

        winnerDefinitionId:
          winner.definitionId,

        winnerIntentId:
          winner.intentId,

        loserDefinitionId:
          candidate.definitionId,

        loserIntentId:
          candidate.intentId,

        winnerPriority:
          winner.priority,

        loserPriority:
          candidate.priority,
      })
    );
  }


  /*
    最後重新恢復時間順序。
  */
  accepted.sort(
    (a, b) =>
      a.start.timelineMinute -
        b.start.timelineMinute ||
      b.priority -
        a.priority ||
      a.definitionId.localeCompare(
        b.definitionId
      )
  );


  const effectiveSchedule =
    Object.freeze({
      schema:
        schedule.schema,

      version:
        schedule.version,

      dateKey:
        schedule.dateKey,

      entries:
        Object.freeze(
          accepted
        ),

      derivedFromConflictResolution:
        true,
  });


  return Object.freeze({
    sourceSchedule:
      schedule,

    effectiveSchedule,

    conflicts:
      Object.freeze(
        conflicts
      ),

    suppressedEntries:
      Object.freeze(
        suppressedEntries
      ),

    conflictCount:
      conflicts.length,
  });
}

const GARDEN_SCHEDULE_COMPENSATION_TRIGGER =
  Object.freeze({
    CANCELLED:
      "cancelled",

    OUTSIDE_START_WINDOW:
      "outsideStartWindow",

    CONFLICT_LOSER:
      "conflictLoser",
  });


function createGardenScheduleCompensationDefinition(
  options = {}
) {
  const id =
    normalizeGardenWorldDecisionToken(
      options.id
    );


  const trigger =
    normalizeGardenWorldDecisionToken(
      options.trigger
    );


  const replacementIntentId =
    normalizeGardenWorldDecisionToken(
      options.replacementIntentId
    );


  if (
    !id ||
    !replacementIntentId ||
    !Object.values(
      GARDEN_SCHEDULE_COMPENSATION_TRIGGER
    ).includes(
      trigger
    )
  ) {
    return null;
  }


  const target =
    Object.freeze({
      definitionId:
        normalizeGardenWorldDecisionToken(
          options.targetDefinitionId
        ),

      characterId:
        normalizeGardenWorldDecisionToken(
          options.targetCharacterId
        ),

      intentId:
        normalizeGardenWorldDecisionToken(
          options.targetIntentId
        ),
    });


  const sourceEventId =
    normalizeGardenWorldDecisionToken(
      options.sourceEventId
    );


  const sourceOverrideId =
    normalizeGardenWorldDecisionToken(
      options.sourceOverrideId
    );


  /*
    防止規則過於廣泛，
    至少要指定 Event / Override / Target 之一。
  */
  if (
    !sourceEventId &&
    !sourceOverrideId &&
    !target.definitionId &&
    !target.characterId &&
    !target.intentId
  ) {
    return null;
  }


  const activityCandidates =
    normalizeGardenScheduleActivityCandidates(
      options.activityCandidates
    );


  return Object.freeze({
    id,

    trigger,

    sourceEventId,

    sourceOverrideId,

    target,

    replacementIntentId,

    priority:
      Number.isFinite(
        options.priority
      )
        ? options.priority
        : GARDEN_SCHEDULE_PRIORITY
            .NORMAL,

    activityId:
      normalizeGardenWorldDecisionToken(
        options.activityId
      ),

    activityCandidates,

    fallbackActivityId:
      normalizeGardenWorldDecisionToken(
        options.fallbackActivityId,
        "wander"
      ),

    targetSceneId:
      normalizeGardenWorldDecisionToken(
        options.targetSceneId
      ),

    targetSpotId:
      normalizeGardenWorldDecisionToken(
        options.targetSpotId
      ),

    /*
      OUTSIDE_WINDOW 常用：

      原 Dinner Entry
      → 換成 LateDinner Entry
    */
    replaceSource:
      options.replaceSource ??
      (
        trigger ===
        GARDEN_SCHEDULE_COMPENSATION_TRIGGER
          .OUTSIDE_START_WINDOW
      ),

    tags:
      Object.freeze(
        Array.isArray(
          options.tags
        )
          ? options.tags
              .map(
                (value) =>
                  normalizeGardenWorldDecisionToken(
                    value
                  )
              )
              .filter(Boolean)
          : []
      ),
  });
}


function collectGardenScheduleCompensationContexts(
  overrideResult,
  conflictResult = null
) {
  if (!overrideResult) {
    return [];
  }


  const contexts =
    [];


  /*
    =========================
    CANCELLED
    =========================
  */
  for (
    const applied of
    overrideResult.appliedOverrides ??
    []
  ) {
    if (
      applied.action !==
        GARDEN_SCHEDULE_OVERRIDE_ACTION
          .CANCEL
    ) {
      continue;
    }


    const sourceEntry =
      overrideResult.sourceSchedule
        ?.entries
        ?.find(
          (entry) =>
            entry.definitionId ===
            applied.definitionId
        );


    if (!sourceEntry) {
      continue;
    }


    contexts.push(
      Object.freeze({
        trigger:
          GARDEN_SCHEDULE_COMPENSATION_TRIGGER
            .CANCELLED,

        entry:
          sourceEntry,

        eventId:
          applied.eventId,

        overrideId:
          applied.overrideId,
      })
    );
  }


  /*
    =========================
    OUTSIDE START WINDOW
    =========================
  */
  for (
    const entry of
    overrideResult.effectiveSchedule
      ?.entries ??
    []
  ) {
    if (
      entry.fitsOriginalWindow !==
        false ||
      !Array.isArray(
        entry.overrideHistory
      ) ||
      entry.overrideHistory.length ===
        0
    ) {
      continue;
    }


    const lastOverride =
      entry.overrideHistory[
        entry.overrideHistory.length -
        1
      ];


    contexts.push(
      Object.freeze({
        trigger:
          GARDEN_SCHEDULE_COMPENSATION_TRIGGER
            .OUTSIDE_START_WINDOW,

        entry,

        eventId:
          lastOverride.eventId,

        overrideId:
          lastOverride.overrideId,
      })
    );
  }


  /*
    =========================
    CONFLICT LOSER
    =========================
  */
  for (
    const entry of
    conflictResult
      ?.suppressedEntries ??
    []
  ) {
    const lastOverride =
      Array.isArray(
        entry.overrideHistory
      ) &&
      entry.overrideHistory.length > 0
        ? entry.overrideHistory[
            entry.overrideHistory.length -
            1
          ]
        : null;


    contexts.push(
      Object.freeze({
        trigger:
          GARDEN_SCHEDULE_COMPENSATION_TRIGGER
            .CONFLICT_LOSER,

        entry,

        eventId:
          lastOverride?.eventId ??
          null,

        overrideId:
          lastOverride?.overrideId ??
          null,
      })
    );
  }


  return contexts;
}


function doesGardenScheduleCompensationMatch(
  definition,
  context
) {
  if (
    !definition ||
    !context ||
    definition.trigger !==
      context.trigger
  ) {
    return false;
  }


  if (
    definition.sourceEventId &&
    definition.sourceEventId !==
      context.eventId
  ) {
    return false;
  }


  if (
    definition.sourceOverrideId &&
    definition.sourceOverrideId !==
      context.overrideId
  ) {
    return false;
  }


  const entry =
    context.entry;


  if (
    definition.target.definitionId &&
    definition.target.definitionId !==
      entry.definitionId
  ) {
    return false;
  }


  if (
    definition.target.characterId &&
    definition.target.characterId !==
      entry.characterId
  ) {
    return false;
  }


  if (
    definition.target.intentId &&
    definition.target.intentId !==
      entry.intentId
  ) {
    return false;
  }


  return true;
}


function createGardenScheduleCompensationEntry(
  definition,
  context,
  dateKey
) {
  const source =
    context?.entry;


  if (
    !definition ||
    !source ||
    !dateKey
  ) {
    return null;
  }


  let selectedActivityId =
    definition.activityId;


  if (
    !selectedActivityId &&
    definition.activityCandidates
      .length > 0
  ) {
    selectedActivityId =
      pickGardenWorldDailyDecision(
        definition.activityCandidates,
        {
          dateKey,

          characterId:
            source.characterId,

          domainId:
            "compensation",

          subjectId:
            definition.id,

          instanceId:
            source.definitionId,

          decisionId:
            "activityChoice",
        }
      );
  }


  if (!selectedActivityId) {
    selectedActivityId =
      definition.fallbackActivityId;
  }


  return Object.freeze({
    schema:
      GARDEN_DAILY_SCHEDULE_ENTRY_SCHEMA,

    version:
      GARDEN_DAILY_SCHEDULE_ENTRY_VERSION,

    dateKey,

    definitionId:
      `compensation:${definition.id}:${source.definitionId}`,

    characterId:
      source.characterId,

    intentId:
      definition.replacementIntentId,

    instanceId:
      `compensation:${source.instanceId}`,

    /*
      Compensation 自己不是原 Routine Window，
      因此不沿用 source window。
    */
    window:
      null,

    start:
      source.start,

    end:
      source.end,

    durationMinutes:
      source.durationMinutes,

    priority:
      definition.priority,

    target:
      Object.freeze({
        sceneId:
          definition.targetSceneId ??
          source.target?.sceneId ??
          null,

        spotId:
          definition.targetSpotId ??
          source.target?.spotId ??
          null,
      }),

    activity:
      Object.freeze({
        selectedActivityId,

        source:
          "compensation",

        fallbackActivityId:
          definition.fallbackActivityId,
      }),

    flexibility:
      Object.freeze({
        canDelay:
          false,

        canBeOverridden:
          true,

        latePolicy:
          GARDEN_SCHEDULE_LATE_POLICY
            .SKIP,

        maxDelayMinutes:
          null,
      }),

    tags:
      Object.freeze([
        ...new Set([
          ...(source.tags ?? []),
          ...definition.tags,
          "compensation",
        ]),
      ]),

    fitsOriginalWindow:
      true,

    overrideHistory:
      source.overrideHistory ??
      Object.freeze([]),

    compensation:
      Object.freeze({
        definitionId:
          definition.id,

        trigger:
          context.trigger,

        sourceDefinitionId:
          source.definitionId,

        sourceIntentId:
          source.intentId,

        sourceEventId:
          context.eventId,

        sourceOverrideId:
          context.overrideId,
      }),
  });
}

function applyGardenScheduleCompensations(
  overrideResult,
  conflictResult,
  compensationDefinitions
) {
  const baseSchedule =
    conflictResult
      ?.effectiveSchedule ??
    overrideResult
      ?.effectiveSchedule;


  if (
    !isValidGardenDailySchedule(
      baseSchedule
    ) ||
    !Array.isArray(
      compensationDefinitions
    )
  ) {
    return null;
  }


  const contexts =
    collectGardenScheduleCompensationContexts(
      overrideResult,
      conflictResult
    );


  const definitions =
    compensationDefinitions
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.priority -
            a.priority ||
          a.id.localeCompare(
            b.id
          )
      );


  const generatedEntries =
    [];

  const appliedCompensations =
    [];

  const replaceDefinitionIds =
    new Set();


  for (
    const context of
    contexts
  ) {
    /*
      每一個後果只選最高 Priority
      的一條 Compensation Rule。
    */
    const definition =
      definitions.find(
        (item) =>
          doesGardenScheduleCompensationMatch(
            item,
            context
          )
      );


    if (!definition) {
      continue;
    }


    const entry =
      createGardenScheduleCompensationEntry(
        definition,
        context,
        baseSchedule.dateKey
      );


    if (!entry) {
      continue;
    }


    if (
      definition.replaceSource
    ) {
      replaceDefinitionIds.add(
        context.entry.definitionId
      );
    }


    generatedEntries.push(
      entry
    );


    appliedCompensations.push(
      Object.freeze({
        compensationId:
          definition.id,

        trigger:
          context.trigger,

        sourceDefinitionId:
          context.entry.definitionId,

        generatedDefinitionId:
          entry.definitionId,
      })
    );
  }


  const mergedEntries = [
    ...baseSchedule.entries.filter(
      (entry) =>
        !replaceDefinitionIds.has(
          entry.definitionId
        )
    ),

    ...generatedEntries,
  ];


  mergedEntries.sort(
    (a, b) =>
      a.start.timelineMinute -
        b.start.timelineMinute ||
      b.priority -
        a.priority ||
      a.definitionId.localeCompare(
        b.definitionId
      )
  );


  const preConflictSchedule =
    Object.freeze({
      schema:
        GARDEN_DAILY_SCHEDULE_SCHEMA,

      version:
        GARDEN_DAILY_SCHEDULE_VERSION,

      dateKey:
        baseSchedule.dateKey,

      entries:
        Object.freeze(
          mergedEntries
        ),

      derivedFromCompensation:
        true,
  });


  /*
    Compensation 本身也可能撞到別的行程，
    所以最後再跑一次 Conflict Resolver。
  */
  const finalConflictResolution =
    resolveGardenScheduleConflicts(
      preConflictSchedule
    );


  return Object.freeze({
    baseSchedule,

    contexts:
      Object.freeze(
        contexts
      ),

    generatedEntries:
      Object.freeze(
        generatedEntries
      ),

    appliedCompensations:
      Object.freeze(
        appliedCompensations
      ),

    preConflictSchedule,

    finalConflictResolution,

    effectiveSchedule:
      finalConflictResolution
        ?.effectiveSchedule ??
      preConflictSchedule,
  });
}


function runGardenScheduleConsequenceSelfTest() {
  const dateKey =
    "2026-09-23";


  const training =
    createGardenScheduleIntentDefinition({
      id:
        "test-training",

      characterId:
        "chifuyu",

      intentId:
        "swordPractice",

      windowStart:
        "10:00",

      windowEnd:
        "10:00",

      durationMinMinutes:
        60,

      activityId:
        "swordPractice",

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .NORMAL,
    });


  const dinner =
    createGardenScheduleIntentDefinition({
      id:
        "test-dinner",

      characterId:
        "chinatsu",

      intentId:
        "dinner",

      windowStart:
        "18:00",

      windowEnd:
        "18:30",

      durationMinMinutes:
        45,

      activityId:
        "meal",

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .HIGH,
    });


  const tea =
    createGardenScheduleIntentDefinition({
      id:
        "test-evening-tea",

      characterId:
        "chinatsu",

      intentId:
        "eveningTea",

      windowStart:
        "19:15",

      windowEnd:
        "19:15",

      durationMinMinutes:
        45,

      activityId:
        "tea",

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .LOW,
    });


  const sourceSchedule =
    generateGardenDailySchedule(
      [
        training,
        dinner,
        tea,
      ],
      dateKey
    );


  /*
    Self-Test 專用：
    視為兩事件都已 Trigger。
  */
  const eventResolution =
    Object.freeze({
      triggeredEvents:
        Object.freeze([
          {
            eventId:
              "heavyPaperwork",
          },
          {
            eventId:
              "trainingForbidden",
          },
        ]),
    });


  const delayDinner =
    createGardenScheduleOverrideDefinition({
      id:
        "delay-dinner",

      eventId:
        "heavyPaperwork",

      action:
        GARDEN_SCHEDULE_OVERRIDE_ACTION
          .SHIFT,

      targetDefinitionId:
        "test-dinner",

      shiftMinutes:
        60,

      priority:
        70,
    });


  const cancelTraining =
    createGardenScheduleOverrideDefinition({
      id:
        "cancel-training",

      eventId:
        "trainingForbidden",

      action:
        GARDEN_SCHEDULE_OVERRIDE_ACTION
          .CANCEL,

      targetDefinitionId:
        "test-training",

      priority:
        90,
    });


  const overrideResult =
    applyGardenScheduleOverrides(
      sourceSchedule,
      [
        delayDinner,
        cancelTraining,
      ],
      eventResolution
    );


  const conflictResult =
    resolveGardenScheduleConflicts(
      overrideResult
        .effectiveSchedule
    );


  const cancelledTrainingRest =
    createGardenScheduleCompensationDefinition({
      id:
        "training-rest",

      trigger:
        GARDEN_SCHEDULE_COMPENSATION_TRIGGER
          .CANCELLED,

      sourceOverrideId:
        "cancel-training",

      targetDefinitionId:
        "test-training",

      replacementIntentId:
        "recoveryRest",

      activityCandidates: [
        "rest",
        "read",
      ],

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .NORMAL,
    });


  const lateDinner =
    createGardenScheduleCompensationDefinition({
      id:
        "late-dinner",

      trigger:
        GARDEN_SCHEDULE_COMPENSATION_TRIGGER
          .OUTSIDE_START_WINDOW,

      sourceOverrideId:
        "delay-dinner",

      targetDefinitionId:
        "test-dinner",

      replacementIntentId:
        "lateDinner",

      activityId:
        "meal",

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .HIGH,

      replaceSource:
        true,
    });


  const first =
    applyGardenScheduleCompensations(
      overrideResult,
      conflictResult,
      [
        cancelledTrainingRest,
        lateDinner,
      ]
    );


  const second =
    applyGardenScheduleCompensations(
      overrideResult,
      conflictResult,
      [
        cancelledTrainingRest,
        lateDinner,
      ]
    );


  const entries =
    first
      ?.effectiveSchedule
      ?.entries ??
    [];


  const checks = {
    sourceHasTraining:
      sourceSchedule.entries.some(
        (entry) =>
          entry.intentId ===
          "swordPractice"
      ),

    trainingCancelled:
      !overrideResult
        .effectiveSchedule
        .entries
        .some(
          (entry) =>
            entry.intentId ===
            "swordPractice"
        ),

    shiftedDinnerOutsideWindow:
      overrideResult
        .effectiveSchedule
        .entries
        .find(
          (entry) =>
            entry.intentId ===
            "dinner"
        )
        ?.fitsOriginalWindow ===
      false,

    teaSuppressedByConflict:
      conflictResult
        .suppressedEntries
        .some(
          (entry) =>
            entry.intentId ===
            "eveningTea"
        ),

    recoveryGenerated:
      entries.some(
        (entry) =>
          entry.intentId ===
          "recoveryRest"
      ),

    lateDinnerGenerated:
      entries.some(
        (entry) =>
          entry.intentId ===
          "lateDinner"
      ),

    originalDinnerReplaced:
      !entries.some(
        (entry) =>
          entry.intentId ===
          "dinner"
      ),

    teaStillSuppressed:
      !entries.some(
        (entry) =>
          entry.intentId ===
          "eveningTea"
      ),

    twoCompensationsApplied:
      first
        ?.appliedCompensations
        ?.length ===
      2,

    finalNoConflict:
      first
        ?.finalConflictResolution
        ?.conflictCount ===
      0,

    deterministic:
      JSON.stringify(first) ===
      JSON.stringify(second),
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    sourceSchedule,

    overrideResult,

    conflictResult,

    compensationResult:
      first,
  };


  if (pass) {
    console.log(
      "[Garden Schedule Consequence Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Schedule Consequence Self-Test] FAIL",
      result
    );
  }


  return result;
}





/* =========================
   Garden Schedule Inspector
========================= */

function isValidGardenDailySchedule(
  schedule
) {
  if (
    !schedule ||
    typeof schedule !==
      "object"
  ) {
    return false;
  }


  if (
    schedule.schema !==
      GARDEN_DAILY_SCHEDULE_SCHEMA ||
    schedule.version !==
      GARDEN_DAILY_SCHEDULE_VERSION
  ) {
    return false;
  }


  if (
    !schedule.dateKey ||
    !Array.isArray(
      schedule.entries
    )
  ) {
    return false;
  }


  for (
    const entry of
    schedule.entries
  ) {
    if (
      !entry ||
      entry.schema !==
        GARDEN_DAILY_SCHEDULE_ENTRY_SCHEMA ||
      entry.version !==
        GARDEN_DAILY_SCHEDULE_ENTRY_VERSION
    ) {
      return false;
    }


    if (
      !entry.characterId ||
      !entry.intentId ||
      !entry.start ||
      !entry.end
    ) {
      return false;
    }


    if (
      !Number.isFinite(
        entry.start.timelineMinute
      ) ||
      !Number.isFinite(
        entry.end.timelineMinute
      ) ||
      entry.end.timelineMinute <
        entry.start.timelineMinute
    ) {
      return false;
    }
  }


  return true;
}



function formatGardenScheduleTimelinePoint(
  point
) {
  if (
    !point ||
    !Number.isFinite(
      point.timelineMinute
    )
  ) {
    return null;
  }


  const prefix =
    point.dayOffset > 0
      ? `+${point.dayOffset} `
      : point.dayOffset < 0
        ? `${point.dayOffset} `
        : "";


  return (
    `${prefix}${point.time}`
  );
}


function getGardenDailyScheduleEntriesForCharacter(
  schedule,
  characterId
) {
  if (
    !isValidGardenDailySchedule(
      schedule
    )
  ) {
    return [];
  }


  const safeCharacterId =
    normalizeGardenWorldDecisionToken(
      characterId
    );


  if (!safeCharacterId) {
    return [];
  }


  return (
    schedule.entries.filter(
      (entry) =>
        entry.characterId ===
        safeCharacterId
    )
  );
}

function createGardenScheduleInspectorRows(
  schedule
) {
  if (
    !isValidGardenDailySchedule(
      schedule
    )
  ) {
    return [];
  }


  return (
    schedule.entries.map(
      (entry) => ({
        character:
          entry.characterId,

        intent:
          entry.intentId,

        instance:
          entry.instanceId,

        start:
          formatGardenScheduleTimelinePoint(
            entry.start
          ),

        end:
          formatGardenScheduleTimelinePoint(
            entry.end
          ),

        durationMin:
          entry.durationMinutes,

        activity:
          entry.activity
            ?.selectedActivityId ??
          null,

        activitySource:
          entry.activity
            ?.source ??
          null,

        scene:
          entry.target
            ?.sceneId ??
          null,

        spot:
          entry.target
            ?.spotId ??
          null,

        priority:
          entry.priority,

        latePolicy:
          entry.flexibility
            ?.latePolicy ??
          null,

        fitsWindow:
          entry.fitsOriginalWindow,
      })
    )
  );
}


function findGardenScheduleOverlaps(
  schedule
) {
  if (
    !isValidGardenDailySchedule(
      schedule
    )
  ) {
    return [];
  }


  const byCharacter =
    new Map();


  for (
    const entry of
    schedule.entries
  ) {
    if (
      !byCharacter.has(
        entry.characterId
      )
    ) {
      byCharacter.set(
        entry.characterId,
        []
      );
    }


    byCharacter
      .get(
        entry.characterId
      )
      .push(
        entry
      );
  }


  const overlaps =
    [];


  for (
    const [
      characterId,
      entries,
    ] of byCharacter
  ) {
    const sorted =
      [...entries].sort(
        (a, b) =>
          a.start.timelineMinute -
          b.start.timelineMinute
      );


    for (
      let i = 0;
      i < sorted.length;
      i++
    ) {
      const current =
        sorted[i];


      /*
        不只比較下一個。

        因為一個很長的 Activity
        有可能同時壓到後面兩三個。
      */
      for (
        let j = i + 1;
        j < sorted.length;
        j++
      ) {
        const next =
          sorted[j];


        /*
          後面的 Activity
          已經在 current 結束之後，
          再往後也不可能重疊。
        */
        if (
          next.start.timelineMinute >=
          current.end.timelineMinute
        ) {
          break;
        }


        const overlapStart =
          Math.max(
            current.start
              .timelineMinute,

            next.start
              .timelineMinute
          );


        const overlapEnd =
          Math.min(
            current.end
              .timelineMinute,

            next.end
              .timelineMinute
          );


        overlaps.push({
          characterId,

          firstIntent:
            current.intentId,

          secondIntent:
            next.intentId,

          overlapMinutes:
            Math.max(
              0,
              overlapEnd -
              overlapStart
            ),

          firstStart:
            formatGardenScheduleTimelinePoint(
              current.start
            ),

          firstEnd:
            formatGardenScheduleTimelinePoint(
              current.end
            ),

          secondStart:
            formatGardenScheduleTimelinePoint(
              next.start
            ),

          secondEnd:
            formatGardenScheduleTimelinePoint(
              next.end
            ),
        });
      }
    }
  }


  return overlaps;
}


function inspectGardenDailySchedule(
  schedule,
  options = {}
) {
  const valid =
    isValidGardenDailySchedule(
      schedule
    );


  if (!valid) {
    const invalidReport = {
      valid:
        false,

      reason:
        "invalidSchedule",
    };


    if (
      options.print !==
      false
    ) {
      console.warn(
        "[Garden Schedule Inspector] invalid schedule"
      );
    }


    return invalidReport;
  }


  const rows =
    createGardenScheduleInspectorRows(
      schedule
    );


  const overlaps =
    findGardenScheduleOverlaps(
      schedule
    );


  const characters =
    [
      ...new Set(
        schedule.entries.map(
          (entry) =>
            entry.characterId
        )
      ),
    ];


  const report = {
    valid:
      true,

    dateKey:
      schedule.dateKey,

    entryCount:
      schedule.entries.length,

    characters,

    overlapCount:
      overlaps.length,

    overlaps,

    rows,
  };


  if (
    options.print !==
    false
  ) {
    console.log(
      `[Garden Schedule] ${schedule.dateKey}`
    );


    console.table(
      rows
    );


    if (
      overlaps.length > 0
    ) {
      console.warn(
        "[Garden Schedule] overlaps detected:",
        overlaps
      );

      console.table(
        overlaps
      );

    } else {
      console.log(
        "[Garden Schedule] no overlaps"
      );
    }
  }


  return report;
}



function inspectGardenCharacterDailySchedule(
  schedule,
  characterId,
  options = {}
) {
  if (
    !isValidGardenDailySchedule(
      schedule
    )
  ) {
    return null;
  }


  const entries =
    getGardenDailyScheduleEntriesForCharacter(
      schedule,
      characterId
    );


  const characterSchedule =
    Object.freeze({
      schema:
        GARDEN_DAILY_SCHEDULE_SCHEMA,

      version:
        GARDEN_DAILY_SCHEDULE_VERSION,

      dateKey:
        schedule.dateKey,

      entries:
        Object.freeze(
          [...entries]
        ),
    });


  const report =
    inspectGardenDailySchedule(
      characterSchedule,
      {
        print:
          false,
      }
    );


  if (
    options.print !==
    false
  ) {
    console.log(
      `[Garden Schedule] ${schedule.dateKey} / ${characterId}`
    );


    console.table(
      report?.rows ??
      []
    );
  }


  return report;
}


function inspectGardenScheduleDebugDay(
  dateKey =
    getGardenWorldDateKey(),
  options = {}
) {
  const samples =
    getGardenScheduleDataModelDebugSamples();


  if (
    !samples ||
    !samples.allValid
  ) {
    return null;
  }


  const definitions = [
    samples.lunch,
    samples.afternoonFree,
    samples.eveningBridge,
  ];


  const schedule =
    generateGardenDailySchedule(
      definitions,
      dateKey
    );


  if (!schedule) {
    return null;
  }


  return (
    inspectGardenDailySchedule(
      schedule,
      options
    )
  );
}


function runGardenScheduleInspectorSelfTest() {
  const samples =
    getGardenScheduleDataModelDebugSamples();


  const normalSchedule =
    samples?.allValid
      ? generateGardenDailySchedule(
          [
            samples.lunch,
            samples.afternoonFree,
            samples.eveningBridge,
          ],
          "2026-09-23"
        )
      : null;


  const firstJson =
    normalSchedule
      ? JSON.stringify(
          normalSchedule
        )
      : null;


  const secondSchedule =
    samples?.allValid
      ? generateGardenDailySchedule(
          [
            samples.lunch,
            samples.afternoonFree,
            samples.eveningBridge,
          ],
          "2026-09-23"
        )
      : null;


  const secondJson =
    secondSchedule
      ? JSON.stringify(
          secondSchedule
        )
      : null;


  const normalReport =
    normalSchedule
      ? inspectGardenDailySchedule(
          normalSchedule,
          {
            print: false,
          }
        )
      : null;


  /*
    固定做一組 overlap probe。
  */
  const overlapA =
    createGardenScheduleIntentDefinition({
      id:
        "selftest-overlap-a",

      characterId:
        "chifuyu",

      intentId:
        "overlapA",

      windowStart:
        "10:00",

      windowEnd:
        "10:00",

      durationMinMinutes:
        60,

      activityId:
        "walk",
    });


  const overlapB =
    createGardenScheduleIntentDefinition({
      id:
        "selftest-overlap-b",

      characterId:
        "chifuyu",

      intentId:
        "overlapB",

      windowStart:
        "10:30",

      windowEnd:
        "10:30",

      durationMinMinutes:
        60,

      activityId:
        "read",
    });


  const overlapSchedule =
    generateGardenDailySchedule(
      [
        overlapA,
        overlapB,
      ],
      "2026-09-23"
    );


  const overlapReport =
    inspectGardenDailySchedule(
      overlapSchedule,
      {
        print: false,
      }
    );


  const checks = {
    samplesValid:
      samples?.allValid ===
      true,

    normalScheduleValid:
      normalReport?.valid ===
      true,

    deterministic:
      firstJson !== null &&
      firstJson ===
        secondJson,

    normalEntryCount:
      normalReport
        ?.entryCount ===
      3,

    normalNoOverlap:
      normalReport
        ?.overlapCount ===
      0,

    overlapDetected:
      overlapReport
        ?.overlapCount ===
      1,

    overlapMinutesCorrect:
      overlapReport
        ?.overlaps?.[0]
        ?.overlapMinutes ===
      30,
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    normal:
      normalReport,

    overlapProbe:
      overlapReport,
  };


  if (pass) {
    console.log(
      "[Garden Schedule Inspector Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Schedule Inspector Self-Test] FAIL",
      result
    );
  }


  return result;
}


/* =========================
   Garden Schedule Resolver
========================= */

const GARDEN_SCHEDULE_RESOLUTION_STATE =
  Object.freeze({
    ACTIVE:
      "active",

    GAP:
      "gap",
  });



function shiftGardenScheduleDateKey(
  dateKey,
  dayOffset
) {
  const dayNumber =
    getGardenScheduleDateDayNumber(
      dateKey
    );


  if (
    !Number.isInteger(
      dayNumber
    ) ||
    !Number.isInteger(
      dayOffset
    )
  ) {
    return null;
  }


  const date =
    new Date(
      (
        dayNumber +
        dayOffset
      ) *
      86400000
    );


  const year =
    date.getUTCFullYear();

  const month =
    String(
      date.getUTCMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getUTCDate()
    ).padStart(
      2,
      "0"
    );


  return (
    `${year}-${month}-${day}`
  );
}


function getGardenScheduleDateDayNumber(
  dateKey
) {
  if (
    typeof dateKey !==
      "string"
  ) {
    return null;
  }


  const match =
    dateKey.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );


  if (!match) {
    return null;
  }


  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );


  const utc =
    Date.UTC(
      year,
      month - 1,
      day
    );


  const check =
    new Date(
      utc
    );


  /*
    防止：

    2026-02-31

    被 Date 自動變成三月。
  */
  if (
    check.getUTCFullYear() !==
      year ||
    check.getUTCMonth() !==
      month - 1 ||
    check.getUTCDate() !==
      day
  ) {
    return null;
  }


  return Math.floor(
    utc /
    86400000
  );
}


function createGardenScheduleWorldPoint(
  dateKey,
  minuteOfDay,
  second = 0
) {
  const dayNumber =
    getGardenScheduleDateDayNumber(
      dateKey
    );


  if (
    !Number.isInteger(
      dayNumber
    ) ||
    !Number.isFinite(
      minuteOfDay
    ) ||
    !Number.isFinite(
      second
    )
  ) {
    return null;
  }


  if (
    minuteOfDay < 0 ||
    minuteOfDay >= 1440 ||
    second < 0 ||
    second >= 60
  ) {
    return null;
  }


  const preciseMinute =
    minuteOfDay +
    second / 60;


  return Object.freeze({
    dateKey,

    dayNumber,

    minuteOfDay,

    second,

    /*
      全世界日曆上的連續分鐘。

      不是 Unix timestamp，
      是 Resolver 比較用座標。
    */
    absoluteMinute:
      dayNumber * 1440 +
      preciseMinute,
  });
}



function getGardenScheduleWorldPoint(
  timestamp =
    getGardenWorldNow()
) {
  const calendar =
    getGardenWorldCalendarParts(
      timestamp
    );


  if (!calendar) {
    return null;
  }


  return (
    createGardenScheduleWorldPoint(
      calendar.dateKey,
      calendar.minuteOfDay,
      calendar.second
    )
  );
}

function getGardenScheduleEntryAbsoluteRange(
  schedule,
  entry
) {
  if (
    !isValidGardenDailySchedule(
      schedule
    ) ||
    !entry
  ) {
    return null;
  }


  const dayNumber =
    getGardenScheduleDateDayNumber(
      schedule.dateKey
    );


  if (
    !Number.isInteger(
      dayNumber
    ) ||
    !Number.isFinite(
      entry.start
        ?.timelineMinute
    ) ||
    !Number.isFinite(
      entry.end
        ?.timelineMinute
    )
  ) {
    return null;
  }


  const baseMinute =
    dayNumber * 1440;


  return Object.freeze({
    scheduleDateKey:
      schedule.dateKey,

    startAbsoluteMinute:
      baseMinute +
      entry.start.timelineMinute,

    endAbsoluteMinute:
      baseMinute +
      entry.end.timelineMinute,

    entry,
  });
}


function normalizeGardenDailyScheduleCollection(
  schedules
) {
  const list =
    Array.isArray(
      schedules
    )
      ? schedules
      : [schedules];


  return list.filter(
    isValidGardenDailySchedule
  );
}


function resolveGardenCharacterScheduleAtWorldPoint(
  schedules,
  characterId,
  worldPoint
) {
  const safeSchedules =
    normalizeGardenDailyScheduleCollection(
      schedules
    );


  const safeCharacterId =
    normalizeGardenWorldDecisionToken(
      characterId
    );


  if (
    safeSchedules.length === 0 ||
    !safeCharacterId ||
    !worldPoint ||
    !Number.isFinite(
      worldPoint.absoluteMinute
    )
  ) {
    return null;
  }


  const candidates =
    [];


  for (
    const schedule of
    safeSchedules
  ) {
    for (
      const entry of
      schedule.entries
    ) {
      if (
        entry.characterId !==
        safeCharacterId
      ) {
        continue;
      }


      const range =
        getGardenScheduleEntryAbsoluteRange(
          schedule,
          entry
        );


      if (!range) {
        continue;
      }


      candidates.push(
        range
      );
    }
  }


  /*
    Resolver 使用：

    start <= now < end

    所以正好抵達 end 的瞬間，
    Activity 已視為完成。
  */
  const active =
    candidates.filter(
      (candidate) =>
        worldPoint.absoluteMinute >=
          candidate.startAbsoluteMinute &&
        worldPoint.absoluteMinute <
          candidate.endAbsoluteMinute
    );


  /*
    若有 Schedule overlap：

    1. 高 Priority 優先
    2. Priority 相同：
       較晚開始的優先
    3. 還相同：
       definitionId 保證 deterministic
  */
  active.sort(
    (a, b) => {
      const priorityDiff =
        b.entry.priority -
        a.entry.priority;


      if (
        priorityDiff !== 0
      ) {
        return priorityDiff;
      }


      const startDiff =
        b.startAbsoluteMinute -
        a.startAbsoluteMinute;


      if (
        startDiff !== 0
      ) {
        return startDiff;
      }


      return (
        a.entry.definitionId.localeCompare(
          b.entry.definitionId
        )
      );
    }
  );


  const selected =
    active[0] ??
    null;


  /*
    找上一件已結束 Activity。
  */
  const previous =
    candidates
      .filter(
        (candidate) =>
          candidate.endAbsoluteMinute <=
          worldPoint.absoluteMinute
      )
      .sort(
        (a, b) =>
          b.endAbsoluteMinute -
          a.endAbsoluteMinute
      )[0] ??
    null;


  /*
    找下一件尚未開始 Activity。
  */
  const next =
    candidates
      .filter(
        (candidate) =>
          candidate.startAbsoluteMinute >
          worldPoint.absoluteMinute
      )
      .sort(
        (a, b) =>
          a.startAbsoluteMinute -
          b.startAbsoluteMinute
      )[0] ??
    null;


  return Object.freeze({
    characterId:
      safeCharacterId,

    worldPoint,

    state:
      selected
        ? GARDEN_SCHEDULE_RESOLUTION_STATE
            .ACTIVE
        : GARDEN_SCHEDULE_RESOLUTION_STATE
            .GAP,

    activeEntry:
      selected?.entry ??
      null,

    activeScheduleDateKey:
      selected
        ?.scheduleDateKey ??
      null,

    activeCandidateCount:
      active.length,

    /*
      若 > 1，
      代表 Schedule 本身有 overlap。

      Resolver 已選 winner，
      但保留資訊供 Inspector / Event 使用。
    */
    hasConflict:
      active.length > 1,

    activeCandidates:
      Object.freeze(
        active.map(
          (item) =>
            item.entry
        )
      ),

    previousEntry:
      previous?.entry ??
      null,

    nextEntry:
      next?.entry ??
      null,
  });
}


function resolveGardenCharacterScheduleAtTimestamp(
  schedules,
  characterId,
  timestamp =
    getGardenWorldNow()
) {
  const worldPoint =
    getGardenScheduleWorldPoint(
      timestamp
    );


  if (!worldPoint) {
    return null;
  }


  return (
    resolveGardenCharacterScheduleAtWorldPoint(
      schedules,
      characterId,
      worldPoint
    )
  );
}

function createGardenScheduleWorldPointFromTimeline(
  baseDateKey,
  timelineMinute
) {
  const baseDayNumber =
    getGardenScheduleDateDayNumber(
      baseDateKey
    );


  if (
    !Number.isInteger(
      baseDayNumber
    ) ||
    !Number.isFinite(
      timelineMinute
    )
  ) {
    return null;
  }


  return Object.freeze({
    dateKey:
      baseDateKey,

    dayNumber:
      baseDayNumber,

    minuteOfDay:
      null,

    second:
      0,

    absoluteMinute:
      baseDayNumber * 1440 +
      timelineMinute,
  });
}

function runGardenScheduleResolverSelfTest() {
  const dateKey =
    "2026-09-23";


  const samples =
    getGardenScheduleDataModelDebugSamples();


  if (
    !samples ||
    !samples.allValid
  ) {
    return {
      pass: false,

      reason:
        "invalidSamples",
    };
  }


  const schedule =
    generateGardenDailySchedule(
      [
        samples.lunch,
        samples.afternoonFree,
        samples.eveningBridge,
      ],
      dateKey
    );


  /*
    =========================
    Test 1：
    Lunch 中間點應該 ACTIVE
    =========================
  */
  const lunchEntry =
    schedule.entries.find(
      (entry) =>
        entry.intentId ===
        "lunch"
    );


  const lunchMiddleMinute =
    lunchEntry.start.timelineMinute +
    lunchEntry.durationMinutes / 2;


  const lunchPoint =
    createGardenScheduleWorldPointFromTimeline(
      dateKey,
      lunchMiddleMinute
    );


  const lunchResolution =
    resolveGardenCharacterScheduleAtWorldPoint(
      schedule,
      "chifuyu",
      lunchPoint
    );


  /*
    =========================
    Test 2：
    end 邊界應已結束
    =========================
  */
  const lunchEndPoint =
    createGardenScheduleWorldPointFromTimeline(
      dateKey,
      lunchEntry.end.timelineMinute
    );


  const lunchEndResolution =
    resolveGardenCharacterScheduleAtWorldPoint(
      schedule,
      "chifuyu",
      lunchEndPoint
    );


  /*
    =========================
    Test 3：
    Priority Conflict
    =========================
  */
  const low =
    createGardenScheduleIntentDefinition({
      id:
        "resolver-low",

      characterId:
        "chifuyu",

      intentId:
        "lowPriority",

      windowStart:
        "10:00",

      windowEnd:
        "10:00",

      durationMinMinutes:
        60,

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .LOW,

      activityId:
        "walk",
    });


  const high =
    createGardenScheduleIntentDefinition({
      id:
        "resolver-high",

      characterId:
        "chifuyu",

      intentId:
        "highPriority",

      windowStart:
        "10:00",

      windowEnd:
        "10:00",

      durationMinMinutes:
        60,

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .HIGH,

      activityId:
        "read",
    });


  const conflictSchedule =
    generateGardenDailySchedule(
      [
        low,
        high,
      ],
      dateKey
    );


  const conflictPoint =
    createGardenScheduleWorldPoint(
      dateKey,
      10 * 60 + 30
    );


  const conflictResolution =
    resolveGardenCharacterScheduleAtWorldPoint(
      conflictSchedule,
      "chifuyu",
      conflictPoint
    );


  /*
    =========================
    Test 4：
    昨日 Activity 跨午夜
    =========================
  */
  const yesterdayKey =
    shiftGardenScheduleDateKey(
      dateKey,
      -1
    );


  const overnightDefinition =
    createGardenScheduleIntentDefinition({
      id:
        "resolver-overnight",

      characterId:
        "chifuyu",

      intentId:
        "overnight",

      windowStart:
        "23:30",

      windowEnd:
        "00:30",

      durationMinMinutes:
        60,

      durationMaxMinutes:
        60,

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .NORMAL,

      activityId:
        "read",
    });


  const yesterdaySchedule =
    generateGardenDailySchedule(
      [
        overnightDefinition,
      ],
      yesterdayKey
    );


  /*
    今天 00:10。
  */
  const afterMidnightPoint =
    createGardenScheduleWorldPoint(
      dateKey,
      10
    );


  const overnightResolution =
    resolveGardenCharacterScheduleAtWorldPoint(
      [
        yesterdaySchedule,
        schedule,
      ],
      "chifuyu",
      afterMidnightPoint
    );


  /*
    =========================
    Results
    =========================
  */
  const checks = {
    lunchActive:
      lunchResolution?.state ===
        GARDEN_SCHEDULE_RESOLUTION_STATE
          .ACTIVE,

    lunchSelected:
      lunchResolution
        ?.activeEntry
        ?.intentId ===
      "lunch",

    endBoundaryClosed:
      lunchEndResolution
        ?.activeEntry
        ?.intentId !==
      "lunch",

    conflictDetected:
      conflictResolution
        ?.hasConflict ===
      true,

    priorityWins:
      conflictResolution
        ?.activeEntry
        ?.intentId ===
      "highPriority",

    yesterdayKeyCorrect:
      yesterdayKey ===
      "2026-09-22",

    overnightActive:
      overnightResolution
        ?.activeEntry
        ?.intentId ===
      "overnight",

    overnightComesFromYesterday:
      overnightResolution
        ?.activeScheduleDateKey ===
      "2026-09-22",
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    lunch:
      lunchResolution,

    lunchEnd:
      lunchEndResolution,

    conflict:
      conflictResolution,

    overnight:
      overnightResolution,
  };


  if (pass) {
    console.log(
      "[Garden Schedule Resolver Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Schedule Resolver Self-Test] FAIL",
      result
    );
  }


  return result;
}


/* =========================
   Garden World Schedule Context
========================= */

const GARDEN_WORLD_SCHEDULE_CONTEXT_SCHEMA =
  "nanaharaGardenWorldScheduleContext";

const GARDEN_WORLD_SCHEDULE_CONTEXT_VERSION =
  1;


function createGardenWorldScheduleContext(
  definitions,
  timestamp =
    getGardenWorldNow()
) {
  if (
    !Array.isArray(
      definitions
    )
  ) {
    return null;
  }


  const calendar =
    getGardenWorldCalendarParts(
      timestamp
    );


  const worldPoint =
    getGardenScheduleWorldPoint(
      timestamp
    );


  if (
    !calendar ||
    !worldPoint
  ) {
    return null;
  }


  const currentDateKey =
    calendar.dateKey;


  const previousDateKey =
    shiftGardenScheduleDateKey(
      currentDateKey,
      -1
    );


  if (!previousDateKey) {
    return null;
  }


  /*
    只讓合法 Intent
    進入 World Schedule。
  */
  const validDefinitions =
    definitions.filter(
      isValidGardenScheduleIntentDefinition
    );


  const previousSchedule =
    generateGardenDailySchedule(
      validDefinitions,
      previousDateKey
    );


  const currentSchedule =
    generateGardenDailySchedule(
      validDefinitions,
      currentDateKey
    );


  if (
    !previousSchedule ||
    !currentSchedule
  ) {
    return null;
  }


  return Object.freeze({
    schema:
      GARDEN_WORLD_SCHEDULE_CONTEXT_SCHEMA,

    version:
      GARDEN_WORLD_SCHEDULE_CONTEXT_VERSION,

    timestamp,

    calendar,

    worldPoint,

    previousDateKey,

    currentDateKey,

    previousSchedule,

    currentSchedule,

    /*
      Resolver 可以直接吃這個陣列。
    */
    schedules:
      Object.freeze([
        previousSchedule,
        currentSchedule,
      ]),
  });
}



function resolveGardenCharacterWorldSchedule(
  definitions,
  characterId,
  timestamp =
    getGardenWorldNow()
) {
  const context =
    createGardenWorldScheduleContext(
      definitions,
      timestamp
    );


  if (!context) {
    return null;
  }


  const resolution =
    resolveGardenCharacterScheduleAtWorldPoint(
      context.schedules,
      characterId,
      context.worldPoint
    );


  if (!resolution) {
    return null;
  }


  return Object.freeze({
    contextDateKey:
      context.currentDateKey,

    previousDateKey:
      context.previousDateKey,

    ...resolution,
  });
}

function resolveGardenWorldSchedule(
  definitions,
  timestamp =
    getGardenWorldNow()
) {
  if (
    !Array.isArray(
      definitions
    )
  ) {
    return null;
  }


  const context =
    createGardenWorldScheduleContext(
      definitions,
      timestamp
    );


  if (!context) {
    return null;
  }


  /*
    從 Intent Definition 自動找出
    這份 Schedule 涉及哪些角色。
  */
  const characterIds =
    [
      ...new Set(
        definitions
          .filter(
            isValidGardenScheduleIntentDefinition
          )
          .map(
            (definition) =>
              definition.characterId
          )
      ),
    ];


  const characters = {};


  for (
    const characterId of
    characterIds
  ) {
    characters[
      characterId
    ] =
      resolveGardenCharacterScheduleAtWorldPoint(
        context.schedules,
        characterId,
        context.worldPoint
      );
  }


  return Object.freeze({
    context,

    characters:
      Object.freeze(
        characters
      ),
  });
}

function getGardenScheduleDebugDefinitions() {
  const samples =
    getGardenScheduleDataModelDebugSamples();


  if (
    !samples ||
    !samples.allValid
  ) {
    return [];
  }


  return [
    samples.lunch,
    samples.afternoonFree,
    samples.eveningBridge,
  ];
}


function inspectGardenWorldScheduleDebug(
  timestamp =
    getGardenWorldNow()
) {
  const definitions =
    getGardenScheduleDebugDefinitions();


  const result =
    resolveGardenWorldSchedule(
      definitions,
      timestamp
    );


  if (!result) {
    return null;
  }


  const rows =
    Object.entries(
      result.characters
    ).map(
      ([
        characterId,
        resolution,
      ]) => ({
        character:
          characterId,

        date:
          result.context
            .currentDateKey,

        time:
          result.context
            .calendar
            .timeKey,

        state:
          resolution?.state ??
          null,

        activeIntent:
          resolution
            ?.activeEntry
            ?.intentId ??
          null,

        activity:
          resolution
            ?.activeEntry
            ?.activity
            ?.selectedActivityId ??
          null,

        scene:
          resolution
            ?.activeEntry
            ?.target
            ?.sceneId ??
          null,

        fromScheduleDate:
          resolution
            ?.activeScheduleDateKey ??
          null,

        conflict:
          resolution
            ?.hasConflict ??
          false,
      })
    );


  console.log(
    "[Garden World Schedule Debug]",
    result.context
      .calendar
  );


  console.table(
    rows
  );


  return result;
}


function runGardenWorldScheduleContextSelfTest() {
  /*
    UTC：
    2026-09-23 15:10

    JST：
    2026-09-24 00:10
  */
  const testTimestamp =
    Date.parse(
      "2026-09-23T15:10:00Z"
    );


  const overnight =
    createGardenScheduleIntentDefinition({
      id:
        "context-test-overnight",

      characterId:
        "chifuyu",

      intentId:
        "overnight",

      windowStart:
        "23:30",

      windowEnd:
        "23:30",

      durationMinMinutes:
        60,

      durationMaxMinutes:
        60,

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .NORMAL,

      activityId:
        "read",

      fallbackActivityId:
        "wander",
    });


  const definitions = [
    overnight,
  ];


  const context =
    createGardenWorldScheduleContext(
      definitions,
      testTimestamp
    );


  const first =
    resolveGardenCharacterWorldSchedule(
      definitions,
      "chifuyu",
      testTimestamp
    );


  /*
    再算一次，
    確認 Context / Schedule
    仍然 deterministic。
  */
  const secondContext =
    createGardenWorldScheduleContext(
      definitions,
      testTimestamp
    );


  const checks = {
    contextCreated:
      !!context,

    canonicalDateCorrect:
      context
        ?.currentDateKey ===
      "2026-09-24",

    canonicalTimeCorrect:
      context
        ?.calendar
        ?.timeKey ===
      "00:10:00",

    previousDateCorrect:
      context
        ?.previousDateKey ===
      "2026-09-23",

    previousScheduleCorrect:
      context
        ?.previousSchedule
        ?.dateKey ===
      "2026-09-23",

    currentScheduleCorrect:
      context
        ?.currentSchedule
        ?.dateKey ===
      "2026-09-24",

    hasTwoSchedules:
      context
        ?.schedules
        ?.length ===
      2,

    overnightStillActive:
      first
        ?.activeEntry
        ?.intentId ===
      "overnight",

    overnightFromYesterday:
      first
        ?.activeScheduleDateKey ===
      "2026-09-23",

    deterministic:
      JSON.stringify(
        context?.schedules
      ) ===
      JSON.stringify(
        secondContext?.schedules
      ),
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    context,

    resolution:
      first,
  };


  if (pass) {
    console.log(
      "[Garden World Schedule Context Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden World Schedule Context Self-Test] FAIL",
      result
    );
  }


  return result;
}

/* =========================
   Garden World Condition / Event Resolver
========================= */

const GARDEN_WORLD_CONDITION_SNAPSHOT_SCHEMA =
  "nanaharaGardenWorldConditionSnapshot";

const GARDEN_WORLD_CONDITION_SNAPSHOT_VERSION =
  1;

const GARDEN_WORLD_EVENT_SCHEMA =
  "nanaharaGardenWorldEvent";

const GARDEN_WORLD_EVENT_VERSION =
  1;


const GARDEN_WORLD_EVENT_CONDITION_SCOPE =
  Object.freeze({
    CHARACTER:
      "character",

    WORLD:
      "world",
  });


const GARDEN_WORLD_EVENT_CONDITION_OPERATOR =
  Object.freeze({
    EQ:
      "eq",

    NE:
      "ne",

    GT:
      "gt",

    GTE:
      "gte",

    LT:
      "lt",

    LTE:
      "lte",

    TRUTHY:
      "truthy",

    FALSY:
      "falsy",
  });


function createGardenWorldConditionSnapshot(
  options = {}
) {
  const dateKey =
    normalizeGardenWorldDecisionToken(
      options.dateKey,
      getGardenWorldDateKey()
    );


  if (
    !dateKey ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateKey
    )
  ) {
    return null;
  }


  const sourceCharacters =
    options.characters &&
    typeof options.characters ===
      "object"
      ? options.characters
      : {};


  const characters = {};


  for (
    const [
      characterId,
      state,
    ] of Object.entries(
      sourceCharacters
    )
  ) {
    if (
      !state ||
      typeof state !==
        "object"
    ) {
      continue;
    }


    characters[
      characterId
    ] =
      Object.freeze({
        ...state,
      });
  }


  const world =
    options.world &&
    typeof options.world ===
      "object"
      ? Object.freeze({
          ...options.world,
        })
      : Object.freeze({});


  return Object.freeze({
    schema:
      GARDEN_WORLD_CONDITION_SNAPSHOT_SCHEMA,

    version:
      GARDEN_WORLD_CONDITION_SNAPSHOT_VERSION,

    dateKey,

    characters:
      Object.freeze(
        characters
      ),

    world,
  });
}


function createGardenWorldEventCondition(
  options = {}
) {
  const scope =
    normalizeGardenWorldDecisionToken(
      options.scope,
      GARDEN_WORLD_EVENT_CONDITION_SCOPE
        .WORLD
    );


  const key =
    normalizeGardenWorldDecisionToken(
      options.key
    );


  const characterId =
    normalizeGardenWorldDecisionToken(
      options.characterId
    );


  const operator =
    normalizeGardenWorldDecisionToken(
      options.operator,
      GARDEN_WORLD_EVENT_CONDITION_OPERATOR
        .EQ
    );


  if (!key) {
    return null;
  }


  if (
    scope ===
      GARDEN_WORLD_EVENT_CONDITION_SCOPE
        .CHARACTER &&
    !characterId
  ) {
    return null;
  }


  const validOperators =
    Object.values(
      GARDEN_WORLD_EVENT_CONDITION_OPERATOR
    );


  if (
    !validOperators.includes(
      operator
    )
  ) {
    return null;
  }


  return Object.freeze({
    scope,

    characterId,

    key,

    operator,

    value:
      options.value,
  });
}


function getGardenWorldConditionValue(
  snapshot,
  condition
) {
  if (
    !snapshot ||
    snapshot.schema !==
      GARDEN_WORLD_CONDITION_SNAPSHOT_SCHEMA ||
    !condition
  ) {
    return undefined;
  }


  if (
    condition.scope ===
      GARDEN_WORLD_EVENT_CONDITION_SCOPE
        .CHARACTER
  ) {
    return (
      snapshot.characters
        ?.[
          condition.characterId
        ]
        ?.[
          condition.key
        ]
    );
  }


  return (
    snapshot.world
      ?.[
        condition.key
      ]
  );
}


function evaluateGardenWorldEventCondition(
  snapshot,
  condition
) {
  const actual =
    getGardenWorldConditionValue(
      snapshot,
      condition
    );


  const expected =
    condition?.value;


  switch (
    condition?.operator
  ) {
    case GARDEN_WORLD_EVENT_CONDITION_OPERATOR
      .EQ:
      return actual ===
        expected;


    case GARDEN_WORLD_EVENT_CONDITION_OPERATOR
      .NE:
      return actual !==
        expected;


    case GARDEN_WORLD_EVENT_CONDITION_OPERATOR
      .GT:
      return (
        Number.isFinite(actual) &&
        Number.isFinite(expected) &&
        actual > expected
      );


    case GARDEN_WORLD_EVENT_CONDITION_OPERATOR
      .GTE:
      return (
        Number.isFinite(actual) &&
        Number.isFinite(expected) &&
        actual >= expected
      );


    case GARDEN_WORLD_EVENT_CONDITION_OPERATOR
      .LT:
      return (
        Number.isFinite(actual) &&
        Number.isFinite(expected) &&
        actual < expected
      );


    case GARDEN_WORLD_EVENT_CONDITION_OPERATOR
      .LTE:
      return (
        Number.isFinite(actual) &&
        Number.isFinite(expected) &&
        actual <= expected
      );


    case GARDEN_WORLD_EVENT_CONDITION_OPERATOR
      .TRUTHY:
      return Boolean(
        actual
      );


    case GARDEN_WORLD_EVENT_CONDITION_OPERATOR
      .FALSY:
      return !actual;


    default:
      return false;
  }
}


function createGardenWorldEventDefinition(
  options = {}
) {
  const id =
    normalizeGardenWorldDecisionToken(
      options.id
    );


  const characterId =
    normalizeGardenWorldDecisionToken(
      options.characterId,
      "world"
    );


  const instanceId =
    normalizeGardenWorldDecisionToken(
      options.instanceId,
      "main"
    );


  if (!id) {
    return null;
  }


  const probability =
    Number.isFinite(
      options.probability
    )
      ? Math.max(
          0,
          Math.min(
            1,
            options.probability
          )
        )
      : 1;


  const priority =
    Number.isFinite(
      options.priority
    )
      ? options.priority
      : 50;


  const conditions =
    Array.isArray(
      options.conditions
    )
      ? options.conditions.filter(
          Boolean
        )
      : [];


  const participants =
    Array.isArray(
      options.participants
    )
      ? [
          ...new Set(
            options.participants
              .map(
                (value) =>
                  normalizeGardenWorldDecisionToken(
                    value
                  )
              )
              .filter(Boolean)
          ),
        ]
      : [];


  const tags =
    Array.isArray(
      options.tags
    )
      ? [
          ...new Set(
            options.tags
              .map(
                (value) =>
                  normalizeGardenWorldDecisionToken(
                    value
                  )
              )
              .filter(Boolean)
          ),
        ]
      : [];


  return Object.freeze({
    schema:
      GARDEN_WORLD_EVENT_SCHEMA,

    version:
      GARDEN_WORLD_EVENT_VERSION,

    id,

    characterId,

    instanceId,

    probability,

    priority,

    conditions:
      Object.freeze(
        conditions
      ),

    participants:
      Object.freeze(
        participants
      ),

    tags:
      Object.freeze(
        tags
      ),
  });
}


function resolveGardenWorldDailyEvent(
  definition,
  conditionSnapshot,
  dateKey =
    conditionSnapshot?.dateKey ??
    getGardenWorldDateKey()
) {
  if (
    !definition ||
    definition.schema !==
      GARDEN_WORLD_EVENT_SCHEMA ||
    !conditionSnapshot ||
    conditionSnapshot.schema !==
      GARDEN_WORLD_CONDITION_SNAPSHOT_SCHEMA ||
    !dateKey
  ) {
    return null;
  }


  /*
    Snapshot 不能拿錯日期。
  */
  if (
    conditionSnapshot.dateKey !==
    dateKey
  ) {
    return null;
  }


  const conditionResults =
    definition.conditions.map(
      (condition) => ({
        condition,

        passed:
          evaluateGardenWorldEventCondition(
            conditionSnapshot,
            condition
          ),

        actual:
          getGardenWorldConditionValue(
            conditionSnapshot,
            condition
          ),
      })
    );


  const conditionsPassed =
    conditionResults.every(
      (result) =>
        result.passed
    );


  /*
    Chance 本身仍然無條件算出來。

    這樣 Debug 時可以知道：

    條件沒過，
    但今天這顆 deterministic roll
    本來是多少。
  */
  const unit =
    getGardenWorldDailyDecisionUnit({
      dateKey,

      characterId:
        definition.characterId,

      domainId:
        "event",

      subjectId:
        definition.id,

      instanceId:
        definition.instanceId,

      decisionId:
        "trigger",
    });


  const chancePassed =
    Number.isFinite(unit) &&
    unit <
      definition.probability;


  const triggered =
    conditionsPassed &&
    chancePassed;


  return Object.freeze({
    dateKey,

    eventId:
      definition.id,

    characterId:
      definition.characterId,

    instanceId:
      definition.instanceId,

    priority:
      definition.priority,

    probability:
      definition.probability,

    deterministicUnit:
      unit,

    conditionsPassed,

    chancePassed,

    triggered,

    conditionResults:
      Object.freeze(
        conditionResults
      ),

    participants:
      definition.participants,

    tags:
      definition.tags,
  });
}


function resolveGardenWorldDailyEvents(
  definitions,
  conditionSnapshot,
  dateKey =
    conditionSnapshot?.dateKey ??
    getGardenWorldDateKey()
) {
  if (
    !Array.isArray(
      definitions
    ) ||
    !conditionSnapshot
  ) {
    return null;
  }


  const resolutions =
    [];


  for (
    const definition of
    definitions
  ) {
    const resolution =
      resolveGardenWorldDailyEvent(
        definition,
        conditionSnapshot,
        dateKey
      );


    if (resolution) {
      resolutions.push(
        resolution
      );
    }
  }


  /*
    Triggered Event：

    高 priority 優先，
    再用 Event ID 保證排序穩定。
  */
  const triggeredEvents =
    resolutions
      .filter(
        (item) =>
          item.triggered
      )
      .sort(
        (a, b) => {
          const priorityDiff =
            b.priority -
            a.priority;


          if (
            priorityDiff !== 0
          ) {
            return priorityDiff;
          }


          return (
            a.eventId.localeCompare(
              b.eventId
            )
          );
        }
      );


  return Object.freeze({
    dateKey,

    resolutions:
      Object.freeze(
        resolutions
      ),

    triggeredEvents:
      Object.freeze(
        triggeredEvents
      ),

    triggeredCount:
      triggeredEvents.length,
  });
}

function runGardenWorldEventResolverSelfTest() {
  const dateKey =
    "2026-09-23";


  const snapshot =
    createGardenWorldConditionSnapshot({
      dateKey,

      characters: {
        chinatsu: {
          fatigue:
            0.35,

          stress:
            0.72,
        },

        chifuyu: {
          fatigue:
            0.88,

          stress:
            0.20,
        },
      },

      world: {
        festivalDay:
          false,
      },
    });


  const heavyPaperwork =
    createGardenWorldEventDefinition({
      id:
        "heavyPaperwork",

      characterId:
        "chinatsu",

      participants: [
        "chinatsu",
        "chifuyu",
      ],

      /*
        Self-Test 固定 100%，
        避免測試依賴碰巧抽中。
      */
      probability:
        1,

      priority:
        70,

      conditions: [
        createGardenWorldEventCondition({
          scope:
            GARDEN_WORLD_EVENT_CONDITION_SCOPE
              .CHARACTER,

          characterId:
            "chinatsu",

          key:
            "stress",

          operator:
            GARDEN_WORLD_EVENT_CONDITION_OPERATOR
              .GTE,

          value:
            0.60,
        }),
      ],
    });


  const trainingForbidden =
    createGardenWorldEventDefinition({
      id:
        "trainingForbidden",

      characterId:
        "chifuyu",

      probability:
        1,

      priority:
        90,

      conditions: [
        createGardenWorldEventCondition({
          scope:
            GARDEN_WORLD_EVENT_CONDITION_SCOPE
              .CHARACTER,

          characterId:
            "chifuyu",

          key:
            "fatigue",

          operator:
            GARDEN_WORLD_EVENT_CONDITION_OPERATOR
              .GTE,

          value:
            0.80,
        }),
      ],
    });


  /*
    條件故意不成立。
  */
  const lowFatigueEvent =
    createGardenWorldEventDefinition({
      id:
        "lowFatigueShouldFail",

      characterId:
        "chinatsu",

      probability:
        1,

      conditions: [
        createGardenWorldEventCondition({
          scope:
            GARDEN_WORLD_EVENT_CONDITION_SCOPE
              .CHARACTER,

          characterId:
            "chinatsu",

          key:
            "fatigue",

          operator:
            GARDEN_WORLD_EVENT_CONDITION_OPERATOR
              .GTE,

          value:
            0.90,
        }),
      ],
    });


  /*
    Chance 故意 0。
  */
  const impossibleEvent =
    createGardenWorldEventDefinition({
      id:
        "zeroChance",

      characterId:
        "chinatsu",

      probability:
        0,
    });


  const definitions = [
    heavyPaperwork,
    trainingForbidden,
    lowFatigueEvent,
    impossibleEvent,
  ];


  const first =
    resolveGardenWorldDailyEvents(
      definitions,
      snapshot,
      dateKey
    );


  const second =
    resolveGardenWorldDailyEvents(
      definitions,
      snapshot,
      dateKey
    );


  const heavy =
    first?.resolutions.find(
      (item) =>
        item.eventId ===
        "heavyPaperwork"
    );


  const training =
    first?.resolutions.find(
      (item) =>
        item.eventId ===
        "trainingForbidden"
    );


  const lowFatigue =
    first?.resolutions.find(
      (item) =>
        item.eventId ===
        "lowFatigueShouldFail"
    );


  const zeroChance =
    first?.resolutions.find(
      (item) =>
        item.eventId ===
        "zeroChance"
    );


  const checks = {
    snapshotCreated:
      !!snapshot,

    heavyConditionsPass:
      heavy?.conditionsPassed ===
      true,

    heavyTriggered:
      heavy?.triggered ===
      true,

    trainingTriggered:
      training?.triggered ===
      true,

    failedConditionBlocked:
      lowFatigue?.conditionsPassed ===
        false &&
      lowFatigue?.triggered ===
        false,

    zeroChanceBlocked:
      zeroChance?.chancePassed ===
        false &&
      zeroChance?.triggered ===
        false,

    triggeredCountCorrect:
      first?.triggeredCount ===
      2,

    priorityOrderingCorrect:
      first
        ?.triggeredEvents
        ?.[0]
        ?.eventId ===
      "trainingForbidden",

    deterministic:
      JSON.stringify(first) ===
      JSON.stringify(second),
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    snapshot,

    events:
      first,
  };


  if (pass) {
    console.log(
      "[Garden World Event Resolver Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden World Event Resolver Self-Test] FAIL",
      result
    );
  }


  return result;
}



/*
  秒數版本。

  Activity 排程有時候
  使用秒會比較方便。
*/
function getGardenWorldElapsedSeconds(
  fromTimestamp,
  toTimestamp =
    getGardenWorldNow()
) {
  return (
    getGardenWorldElapsedMs(
      fromTimestamp,
      toTimestamp
    ) /
    1000
  );
}

/*
  =========================
  Garden World Clock Debug
  =========================

  不修改電腦系統時間，
  只讓 Garden 世界時間暫時前進。

  正式功能不會主動使用。
*/

function setGardenWorldClockTestNow(
  timestamp
) {
  if (
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return false;
  }


  gardenWorldClockTestNow =
    timestamp;


  /*
    Test Clock 改變後，
    如果玩家正在 Garden，
    立刻同步當前場景日夜素材。
  */
  if (
    typeof updateDayNightMode ===
      "function"
  ) {
    updateDayNightMode();
  }


  if (
    typeof updateMoonBridgeMoonPosition ===
      "function"
  ) {
    updateMoonBridgeMoonPosition();
  }


  return true;
}


function advanceGardenWorldClockTestBy(
  milliseconds
) {
  if (
    !Number.isFinite(
      milliseconds
    )
  ) {
    return false;
  }


  /*
    第一次使用時，
    從真實時間開始。
  */
  if (
    !Number.isFinite(
      gardenWorldClockTestNow
    )
  ) {
    gardenWorldClockTestNow =
      Date.now();
  }


  gardenWorldClockTestNow =
    Math.max(
      0,
      gardenWorldClockTestNow +
        milliseconds
    );


  return true;
}


function clearGardenWorldClockTestNow() {
  const previousTestNow =
    gardenWorldClockTestNow;


  gardenWorldClockTestNow =
    null;


  const realNow =
    Date.now();


  /*
    =========================
    Future Test Travel Guard
    =========================

    如果 Test Clock 曾經跑到
    真實時間的未來，

    並在那個未來時間建立 Travel，
    清除 Test Clock 後不能把這趟
    「尚未發生的 Travel」留下來。

    否則會出現：
    activity = travel
    startedAt > realNow
    → 原地循環 walk。
  */
  if (
    Number.isFinite(
      previousTestNow
    ) &&
    previousTestNow >
      realNow
  ) {
    for (
      const characterId of
      Object.keys(
        gardenCharacterWorldState
      )
    ) {
      const state =
        gardenCharacterWorldState[
          characterId
        ];

      const runtime =
        getGardenCharacterRuntime(
          characterId
        );


      const travelStartedAt =
        state?.travel?.startedAt ??
        state?.travel?.spatialPlan
          ?.startedAt ??
        null;


      const hasFutureTravel =
        !!state?.travel &&
        isValidGardenWorldTimestamp(
          travelStartedAt
        ) &&
        travelStartedAt >
          realNow + 1000;


      if (!hasFutureTravel) {
        continue;
      }


      state.travel =
        null;

      state.wanderContinuity =
        null;


      setGardenCharacterActivity(
        characterId,
        GARDEN_CHARACTER_ACTIVITY
          .WANDER,
        null
      );


      runtime?.setPath?.([]);


      if (
        runtime?.moveState
      ) {
        runtime.moveState.path =
          [];

        runtime.moveState.isMoving =
          false;
      }


      if (
        runtime?.autoState
      ) {
        runtime.autoState.wasMoving =
          false;
      }
    }
  }


  /*
    Test Clock 時可能 seed 過
    未來 Schedule signature。

    回到真實時間後重新建立基準。
  */
  if (
    typeof resetGardenScheduleBoundaryWatcher ===
      "function"
  ) {
    resetGardenScheduleBoundaryWatcher();
  }


  /*
    把 Wander Runtime 重新對齊
    真實 canonical world time。
  */
  if (
    typeof updateGardenCanonicalWanderRuntime ===
      "function"
  ) {
    updateGardenCanonicalWanderRuntime(
      realNow
    );
  }


  if (
    typeof updateGardenCharacterVisibility ===
      "function"
  ) {
    updateGardenCharacterVisibility();
  }


  /*
    離開 Test Clock 後，
    立刻同步回正式世界時間的日夜素材。
  */
  if (
    typeof updateDayNightMode ===
      "function"
  ) {
    updateDayNightMode();
  }


  if (
    typeof updateMoonBridgeMoonPosition ===
      "function"
  ) {
    updateMoonBridgeMoonPosition();
  }


  return true;
}


function isGardenWorldClockInTestMode() {
  return Number.isFinite(
    gardenWorldClockTestNow
  );
}

/*
  Debug / Persistence
  共用的簡單時間 Snapshot。
*/
function getGardenWorldClockSnapshot() {
  const now =
    getGardenWorldNow();


  return {
    now,

    iso:
      new Date(
        now
      ).toISOString(),

    testMode:
      isGardenWorldClockInTestMode(),
  };
}


/* =========================
   Garden World Suspend / Resume
========================= */

/*
  注意：

  suspended 的意思不是
  「世界時間停止」。

  恰恰相反：

  RAF / 畫面模擬暫停，
  但 getGardenWorldNow()
  仍然繼續前進。

  回來時才能計算
  真正過了多久。
*/
const gardenWorldSuspendState = {
  isSuspended: false,

  suspendedAt: null,

  suspendReason: null,

  lastResumedAt: null,

  lastResumeReason: null,

  lastElapsedMs: 0,

  resumeCount: 0,
};


/*
  Garden 畫面目前是否真的開著。

  不使用 body class 作唯一判斷，
  避免 fallback 畫面切換流程
  沒有更新 body class 時失效。
*/
function isGardenWorldViewActive() {
  return (
    gardenScreen &&
    !gardenScreen.classList.contains(
      "hidden"
    )
  );
}


/*
  開始暫停 Garden Runtime。

  已經 suspended 時，
  不覆寫第一次的 timestamp。

  例如：

  Garden → Menu
  ↓
  再切到其他分頁

  仍然應從「離開 Garden」
  那一刻開始計算。
*/
function suspendGardenWorld(
  reason = "unknown",
  timestamp =
    getGardenWorldNow()
) {
  if (
    gardenWorldSuspendState
      .isSuspended
  ) {
    return false;
  }


  if (
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return false;
  }


  gardenWorldSuspendState
    .isSuspended =
    true;


  gardenWorldSuspendState
    .suspendedAt =
    timestamp;


  gardenWorldSuspendState
    .suspendReason =
    String(reason);


  return true;
}


/* =========================
   Garden World Reconciliation
========================= */

/*
  所有需要在 Garden Resume 時
  重新推算世界狀態的系統，
  都登記在這裡。

  例如未來：

  travel
  activity
  schedule
*/
const gardenWorldReconciliationHandlers =
  new Map();


let gardenWorldReconciliationOrder =
  0;


/*
  Debug 用：

  保存最近一次 Resume Context
  與 Pipeline 執行結果。
*/
let gardenWorldLastResumeContext =
  null;


let gardenWorldLastReconciliationResults =
  Object.freeze([]);


function registerGardenWorldReconciliationHandler(
  handlerId,
  handler,
  options = {}
) {
  if (
    !handlerId ||
    typeof handler !==
      "function"
  ) {
    return false;
  }


  const id =
    String(handlerId);


  const existing =
    gardenWorldReconciliationHandlers.get(
      id
    );


  /*
    預設不允許偷偷覆蓋。

    開發階段若真的要替換：
    { replace: true }
  */
  if (
    existing &&
    options.replace !==
      true
  ) {
    console.warn(
      "[Garden World] reconciliation handler already exists:",
      id
    );

    return false;
  }


  const priority =
    Number.isFinite(
      options.priority
    )
      ? options.priority
      : 0;


  /*
    replace 時保留原本 order，
    避免同 priority 的執行順序
    因 hot reload 改變。
  */
  const order =
    existing?.order ??
    ++gardenWorldReconciliationOrder;


  gardenWorldReconciliationHandlers.set(
    id,
    Object.freeze({
      id,
      handler,
      priority,
      order,
    })
  );


  return true;
}


function unregisterGardenWorldReconciliationHandler(
  handlerId
) {
  if (!handlerId) {
    return false;
  }


  return (
    gardenWorldReconciliationHandlers.delete(
      String(handlerId)
    )
  );
}

/*
  將 Suspend / Resume 資訊
  正規化成所有 World System
  共用的 Context。
*/
function createGardenWorldResumeContext(
  suspendedAt,
  resumedAt,
  suspendReason,
  resumeReason
) {
  if (
    !isValidGardenWorldTimestamp(
      suspendedAt
    ) ||
    !isValidGardenWorldTimestamp(
      resumedAt
    )
  ) {
    return null;
  }


  const elapsedMs =
    getGardenWorldElapsedMs(
      suspendedAt,
      resumedAt
    );


  return Object.freeze({
    source:
      "runtimeResume",

    suspendedAt,

    resumedAt,

    elapsedMs,

    elapsedSeconds:
      elapsedMs / 1000,

    suspendReason:
      String(
        suspendReason ||
        "unknown"
      ),

    resumeReason:
      String(
        resumeReason ||
        "unknown"
      ),
  });
}

/*
  依 priority 執行全部
  Reconciliation Handler。

  規則：

  priority 高 → 先執行

  priority 相同 →
  依註冊順序執行。
*/
function runGardenWorldReconciliation(
  context
) {
  if (!context) {
    return Object.freeze([]);
  }


  const handlers =
    Array.from(
      gardenWorldReconciliationHandlers.values()
    ).sort(
      (a, b) =>
        b.priority -
          a.priority ||
        a.order -
          b.order
    );


  const results =
    [];


  for (
    const entry of
    handlers
  ) {
    try {
      const result =
        entry.handler(
          context
        );


      /*
        World Reconciliation
        必須同步完成。

        因為之後：
        planGardenInitialMode()

        必須看到已經更新完成的世界。
      */
      if (
        result &&
        typeof result.then ===
          "function"
      ) {
        console.error(
          "[Garden World] reconciliation handler must be synchronous:",
          entry.id
        );


        results.push(
          Object.freeze({
            id:
              entry.id,

            ok:
              false,

            reason:
              "asyncNotSupported",
          })
        );


        continue;
      }


      results.push(
        Object.freeze({
          id:
            entry.id,

          ok:
            true,

          result:
            result ?? null,
        })
      );

    } catch (err) {
      /*
        一個系統失敗，
        不允許阻止其他系統
        繼續 reconciliation。
      */
      console.error(
        `[Garden World] reconciliation handler failed: ${entry.id}`,
        err
      );


      results.push(
        Object.freeze({
          id:
            entry.id,

          ok:
            false,

          reason:
            "handlerError",
        })
      );
    }
  }


  return Object.freeze(
    results
  );
}

function getGardenWorldReconciliationSnapshot() {
  const handlers =
    Array.from(
      gardenWorldReconciliationHandlers.values()
    )
      .sort(
        (a, b) =>
          b.priority -
            a.priority ||
          a.order -
            b.order
      )
      .map(
        (entry) => ({
          id:
            entry.id,

          priority:
            entry.priority,

          order:
            entry.order,
        })
      );


  return {
    handlerCount:
      handlers.length,

    handlers,

    lastContext:
      gardenWorldLastResumeContext,

    lastResults:
      gardenWorldLastReconciliationResults,
  };
}



/*
  Garden Runtime 恢復。

  計算離開期間經過時間，
  建立 Resume Context，

  並同步執行所有
  World Reconciliation Handler。

  所有世界狀態推算完成後，
  才會回到 Garden 顯示流程。
*/
function resumeGardenWorld(
  reason = "unknown",
  timestamp =
    getGardenWorldNow()
) {
  if (
    !gardenWorldSuspendState
      .isSuspended
  ) {
    return null;
  }


  if (
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return null;
  }


  const suspendedAt =
    gardenWorldSuspendState
      .suspendedAt;


  const elapsedMs =
    getGardenWorldElapsedMs(
      suspendedAt,
      timestamp
    );


  const suspendReason =
    gardenWorldSuspendState
      .suspendReason;


  /*
    Resume 後重新成為 Active。
  */
  gardenWorldSuspendState
    .isSuspended =
    false;


  gardenWorldSuspendState
    .suspendedAt =
    null;


  gardenWorldSuspendState
    .suspendReason =
    null;


  gardenWorldSuspendState
    .lastResumedAt =
    timestamp;


  gardenWorldSuspendState
    .lastResumeReason =
    String(reason);


  gardenWorldSuspendState
    .lastElapsedMs =
    elapsedMs;


  gardenWorldSuspendState
    .resumeCount +=
    1;


  /*
  建立正式 Resume Context。
*/
const context =
  createGardenWorldResumeContext(
    suspendedAt,
    timestamp,
    suspendReason,
    reason
  );


if (!context) {
  return null;
}


/*
  所有 World System
  在這裡同步推算到「現在」。
*/
const reconciliationResults =
  runGardenWorldReconciliation(
    context
  );


/*
  Resume 已經把正式 World State
  reconciliation 到目前時間。

  Boundary Watcher 的舊 signature
  屬於 Suspend 前的觀測結果，
  不應跨 Resume 繼續沿用。

  下一個 1 秒 Event Tick
  會重新 seed 現在的 Schedule state。
*/
if (
  typeof resetGardenScheduleBoundaryWatcher ===
    "function"
) {
  resetGardenScheduleBoundaryWatcher();
}




/*
  完整 Result。

  Context 本身仍保持 immutable。
*/
const result =
  Object.freeze({
    ...context,

    reconciliation:
      reconciliationResults,
  });


gardenWorldLastResumeContext =
  result;


gardenWorldLastReconciliationResults =
  reconciliationResults;


return result;
}


function reconcileGardenWorldAtCurrentTime(
  reason =
    "currentTime",

  timestamp =
    getGardenWorldNow()
) {
  if (
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return null;
  }


  /*
    沒有真正 Suspend。

    用同一個 timestamp
    建立 0 elapsed 的 Context，
    讓所有 Reconciliation Handler
    都能使用既有介面。
  */
  const context =
    createGardenWorldResumeContext(
      timestamp,
      timestamp,
      reason,
      reason
    );


  if (!context) {
    return null;
  }


  const reconciliationResults =
    runGardenWorldReconciliation(
      context
    );


  gardenWorldLastReconciliationResults =
    reconciliationResults;


  return Object.freeze({
    ...context,

    reconciliation:
      reconciliationResults,
  });
}


/* =========================
   Garden World Live Tick
========================= */

const GARDEN_WORLD_LIVE_TICK_MS =
  30 * 1000;


function runGardenWorldLiveTick() {
  /*
    Garden 沒有開著時，
    不需要持續執行 World Reconciliation。
  */
  if (
    !isGardenWorldViewActive()
  ) {
    return null;
  }


  /*
    Menu / 背景頁面等 Suspend 狀態，
    交給既有 Resume 系統處理。
  */
  if (
    gardenWorldSuspendState
      .isSuspended
  ) {
    return null;
  }


  /*
    同一個 Live Tick 全部使用
    完全相同的 Canonical Timestamp。

    避免剛好跨分鐘時：
    Schedule 還在上一分鐘，
    Chat 卻已經進下一分鐘。
  */
  const timestamp =
    getGardenWorldNow();


  /*
    先做正式 World Reconciliation。

    這一步負責：
    - Schedule
    - Travel
    - Activity
    - Wander
  */
  const reconciliation =
    reconcileGardenWorldAtCurrentTime(
      "liveTick",
      timestamp
    );


  if (!reconciliation) {
    return null;
  }


tryStartGardenAfternoonRestChat(
  timestamp
);


  /*
    Reconciliation 完成後，
    才嘗試 deterministic
    Moon Bridge Night Chat。

    如果角色還在 Travel、
    不在賞月橋、
    不是 Wander、
    沒有命中 Chat event，
    函式都會安全地什麼也不做。
  */
  tryStartGardenMoonBridgeNightChat(
    timestamp
  );


  /*
    保持舊 API 不變。

    外部如果原本依賴
    runGardenWorldLiveTick()
    的 reconciliation result，
    不需要跟著修改。
  */
  return reconciliation;
}



/* =========================
   Garden Lightweight Event Tick
========================= */

const GARDEN_WORLD_EVENT_TICK_MS =
  1000;


/* =========================
   Garden Schedule Boundary Watcher
========================= */

const gardenScheduleBoundarySignatureByCharacter =
  Object.create(null);


function getGardenScheduleBoundarySignature(
  resolution
) {
  if (!resolution) {
    return null;
  }


  const entry =
    resolution.activeEntry ??
    null;


  if (!entry) {
    return "gap";
  }


  return [
  "active",

  resolution.activeScheduleDateKey ??
    entry.dateKey ??
    "unknownDate",

  entry.definitionId ??
    "unknownDefinition",

  entry.intentId ??
    "unknownIntent",

  entry.instanceId ??
    "unknownInstance",

  entry.start
    ?.timelineMinute ??
    "unknownStart",

  entry.end
    ?.timelineMinute ??
    "unknownEnd",
].join(":");
}


function resetGardenScheduleBoundaryWatcher() {
  for (
    const key of
    Object.keys(
      gardenScheduleBoundarySignatureByCharacter
    )
  ) {
    delete gardenScheduleBoundarySignatureByCharacter[
      key
    ];
  }

  return true;
}


function runGardenScheduleBoundaryTick(
  timestamp =
    getGardenWorldNow()
) {
  if (
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return null;
  }


  /*
    沿用正式 Schedule Provider，
    不另外建立第二套 Schedule 資料源。
  */
  const schedules =
    getGardenWorldSchedulesFromProvider({
      resumedAt:
        timestamp,
    });


  if (
    schedules.length ===
    0
  ) {
    return Object.freeze({
      timestamp,

      changed:
        false,

      reason:
        "noSchedules",

      results:
        Object.freeze([]),
    });
  }


  const worldPoint =
    getGardenScheduleWorldPoint(
      timestamp
    );


  if (!worldPoint) {
    return null;
  }


  const results =
    [];


  for (
    const characterId of
    Object.keys(
      gardenCharacterWorldState
    )
  ) {
    const resolution =
      resolveGardenCharacterScheduleAtWorldPoint(
        schedules,
        characterId,
        worldPoint
      );


    const signature =
      getGardenScheduleBoundarySignature(
        resolution
      );


    if (!signature) {
      results.push(
        Object.freeze({
          characterId,

          changed:
            false,

          reason:
            "resolutionUnavailable",
        })
      );

      continue;
    }


    const hasPrevious =
      Object.prototype.hasOwnProperty.call(
        gardenScheduleBoundarySignatureByCharacter,
        characterId
      );


    /*
      第一次只建立基準。

      Cold Start / Resume 本來就有
      正式 Reconciliation，
      Boundary Watcher 不重做一次。
    */
    if (!hasPrevious) {
      gardenScheduleBoundarySignatureByCharacter[
        characterId
      ] =
        signature;


      results.push(
        Object.freeze({
          characterId,

          changed:
            false,

          reason:
            "seeded",

          signature,
        })
      );

      continue;
    }


    const previousSignature =
      gardenScheduleBoundarySignatureByCharacter[
        characterId
      ];


    if (
      previousSignature ===
        signature
    ) {
      results.push(
        Object.freeze({
          characterId,

          changed:
            false,

          reason:
            "unchanged",

          signature,
        })
      );

      continue;
    }


    /*
      真正跨過 Schedule Boundary。

      只在這一刻執行一次
      正式 Schedule Bridge。
    */
    const bridgeResult =
      executeGardenCharacterScheduleAtWorldPoint(
        schedules,
        characterId,
        worldPoint,
        {
          worldTimestamp:
            timestamp,
        }
      );


    const failed =
  !bridgeResult ||
  bridgeResult.execution?.ok ===
    false;


const deferred =
  bridgeResult?.decision?.action ===
    GARDEN_SCHEDULE_BRIDGE_ACTION
      .PRESERVE_RUNTIME;


/*
  只有真正套用 Boundary 後，
  才更新 signature。

  failed：
  執行失敗，下一秒重試。

  deferred：
  目前被 Travel / Chat 等 Runtime
  暫時佔用，也保持舊 signature，
  等 Runtime 結束後下一秒再重試。
*/
if (
  !failed &&
  !deferred
) {
  gardenScheduleBoundarySignatureByCharacter[
    characterId
  ] =
    signature;
}


    results.push(
      Object.freeze({
        characterId,

        changed:
          true,

        applied:
  !failed &&
  !deferred,

reason:
  failed
    ? "boundaryApplyFailed"
    : deferred
      ? "boundaryDeferred"
      : "boundaryApplied",

        previousSignature,

        signature,

        bridgeResult,
      })
    );
  }


  return Object.freeze({
    timestamp,

    changed:
      results.some(
        (result) =>
          result.changed === true
      ),

    reason:
      "checked",

    results:
      Object.freeze(
        results
      ),
  });
}



function runGardenWorldEventTick() {
  /*
    只負責需要準時開始的
    deterministic visual events。

    不執行完整 World Reconciliation。
  */

  if (
    !isGardenWorldViewActive()
  ) {
    return null;
  }


  if (
    gardenWorldSuspendState
      .isSuspended
  ) {
    return null;
  }


 const timestamp =
  getGardenWorldNow();


const scheduleBoundary =
  runGardenScheduleBoundaryTick(
    timestamp
  );


const afternoonRestChat =
  tryStartGardenAfternoonRestChat(
    timestamp
  );


  const moonBridgeNightChat =
    tryStartGardenMoonBridgeNightChat(
      timestamp
    );


  return Object.freeze({
  timestamp,

  scheduleBoundary,

  afternoonRestChat,

  moonBridgeNightChat,
});
}


setInterval(
  runGardenWorldEventTick,
  GARDEN_WORLD_EVENT_TICK_MS
);


setInterval(
  runGardenWorldLiveTick,
  GARDEN_WORLD_LIVE_TICK_MS
);




function getGardenWorldSuspendSnapshot() {
  return {
    isSuspended:
      gardenWorldSuspendState
        .isSuspended,

    suspendedAt:
      gardenWorldSuspendState
        .suspendedAt,

    suspendReason:
      gardenWorldSuspendState
        .suspendReason,

    lastResumedAt:
      gardenWorldSuspendState
        .lastResumedAt,

    lastResumeReason:
      gardenWorldSuspendState
        .lastResumeReason,

    lastElapsedMs:
      gardenWorldSuspendState
        .lastElapsedMs,

    resumeCount:
      gardenWorldSuspendState
        .resumeCount,
  };
}





/*
  只給開發測試使用。
*/
function resetGardenWorldSuspendTracker() {
  gardenWorldSuspendState
    .isSuspended =
    false;

  gardenWorldSuspendState
    .suspendedAt =
    null;

  gardenWorldSuspendState
    .suspendReason =
    null;

  gardenWorldSuspendState
    .lastResumedAt =
    null;

  gardenWorldSuspendState
    .lastResumeReason =
    null;

  gardenWorldSuspendState
    .lastElapsedMs =
    0;

  gardenWorldSuspendState
    .resumeCount =
    0;
gardenWorldLastResumeContext =
  null;


gardenWorldLastReconciliationResults =
  Object.freeze([]);

  return true;
}


const GARDEN_CHARACTER_ACTIVITY =
  Object.freeze({
    WANDER: "wander",
    TRAVEL: "travel",
    CHAT: "chat",

    REST: "rest",
  });


const gardenCharacterWorldState = {
 chifuyu: {
  sceneId: "courtyard",

  activity:
    GARDEN_CHARACTER_ACTIVITY
      .WANDER,

  activityData: null,

  /*
    Travel → Wander 的
    Canonical Spatial Handoff。

    null：
    目前直接使用 Standard Wander Timeline。
  */
  wanderContinuity: null,

  activitySpotApproach: null,

  travel: null,
},

  chinatsu: {
  sceneId: "courtyard",

  activity:
    GARDEN_CHARACTER_ACTIVITY
      .WANDER,

  activityData: null,

  wanderContinuity: null,

  activitySpotApproach: null,

  travel: null,
},
};


/* =========================
   Garden Character Activity Ownership
========================= */

const GARDEN_CHARACTER_ACTIVITY_OWNER =
  Object.freeze({
    WANDER:
      "wander",

    TRAVEL:
      "travel",

    CHAT:
      "chat",

    SCHEDULE:
      "schedule",

    ACTIVITY:
      "activity",
  });


function getGardenCharacterActivityOwnership(
  characterId,
  worldStateOverride = null
) {
 const hasWorldStateOverride =
  worldStateOverride &&
  typeof worldStateOverride ===
    "object" &&
  !Array.isArray(
    worldStateOverride
  );


const worldState =
  hasWorldStateOverride
    ? worldStateOverride
    : gardenCharacterWorldState[
        characterId
      ];


  if (!worldState) {
    return null;
  }


  const activity =
    worldState.activity ??
    null;


  const activityData =
    worldState.activityData ??
    null;


  let owner =
    GARDEN_CHARACTER_ACTIVITY_OWNER
      .ACTIVITY;


  /*
    Travel / Chat 是暫時取得角色
    Runtime 控制權的高階狀態。

    即使角色原本來自 Schedule Activity，
    此刻真正控制移動 / 動畫的仍然是
    Travel 或 Chat。
  */
  if (
    activity ===
      GARDEN_CHARACTER_ACTIVITY
        .TRAVEL
  ) {
    owner =
      GARDEN_CHARACTER_ACTIVITY_OWNER
        .TRAVEL;
  }

  else if (
    activity ===
      GARDEN_CHARACTER_ACTIVITY
        .CHAT
  ) {
    owner =
      GARDEN_CHARACTER_ACTIVITY_OWNER
        .CHAT;
  }

  /*
    正式 Schedule Activity。

    例如：
    REST
    未來的 tea / meal / reading 等。
  */
  else if (
    activityData?.source ===
      "schedule"
  ) {
    owner =
      GARDEN_CHARACTER_ACTIVITY_OWNER
        .SCHEDULE;
  }

  else if (
    activity ===
      GARDEN_CHARACTER_ACTIVITY
        .WANDER
  ) {
    owner =
      GARDEN_CHARACTER_ACTIVITY_OWNER
        .WANDER;
  }


  return Object.freeze({
    characterId,

    owner,

    activity,

    sceneId:
      worldState.sceneId ??
      null,

    source:
      activityData?.source ??
      null,

    semanticActivityId:
      activityData
        ?.semanticActivityId ??
      null,

    scheduleDefinitionId:
      activityData
        ?.definitionId ??
      null,

    scheduleInstanceId:
      activityData
        ?.instanceId ??
      null,
  });
}


function getGardenCharacterSemanticActivityId(
  characterId,
  worldStateOverride = null
) {
  const hasWorldStateOverride =
    worldStateOverride &&
    typeof worldStateOverride ===
      "object" &&
    !Array.isArray(
      worldStateOverride
    );


  const worldState =
    hasWorldStateOverride
      ? worldStateOverride
      : gardenCharacterWorldState[
          characterId
        ];


  if (!worldState) {
    return null;
  }


  const ownership =
    getGardenCharacterActivityOwnership(
      characterId,
      worldState
    );


  const activity =
    worldState.activity ??
    null;


  const activityData =
    worldState.activityData ??
    null;


  /*
    正式 Schedule Activity：

    semanticActivityId
    才是 Schedule 真正想表達的活動。
  */
  if (
    ownership?.owner ===
      GARDEN_CHARACTER_ACTIVITY_OWNER
        .SCHEDULE
  ) {
    return (
      activityData
        ?.semanticActivityId ??
      activity
    );
  }


  /*
    暫時 Chat 可以保留
    原本底層 Activity。

    Afternoon Rest Chat
    已經使用 parentActivity。
  */
if (
  ownership?.owner ===
    GARDEN_CHARACTER_ACTIVITY_OWNER
      .CHAT
) {
  return (
    activityData
      ?.semanticActivityByCharacter
      ?.[characterId] ??
    activityData
      ?.semanticActivityId ??
    activityData
      ?.parentActivity ??
    null
  );
}


  /*
    Travel 現階段還沒有保存
    underlying semantic activity。

    不猜測。
  */
  if (
  ownership?.owner ===
    GARDEN_CHARACTER_ACTIVITY_OWNER
      .TRAVEL
) {
  return (
    activityData
      ?.semanticActivityId ??
    null
  );
}


  /*
    一般 Wander / 非 Schedule Activity
    本身就是目前 semantic activity。
  */
  return activity;
}


function getGardenCharacterActivityTimeline(
  characterId,
  worldStateOverride = null
) {
  const hasWorldStateOverride =
    worldStateOverride &&
    typeof worldStateOverride ===
      "object" &&
    !Array.isArray(
      worldStateOverride
    );


  const worldState =
    hasWorldStateOverride
      ? worldStateOverride
      : gardenCharacterWorldState[
          characterId
        ];


  if (!worldState) {
    return null;
  }


  const ownership =
    getGardenCharacterActivityOwnership(
      characterId,
      worldState
    );


  const semanticActivityId =
    getGardenCharacterSemanticActivityId(
      characterId,
      worldState
    );


  const activityData =
    worldState.activityData ??
    null;


  return Object.freeze({
    characterId,

    /*
      此刻真正控制角色 Runtime 的系統。
    */
    runtimeOwner:
      ownership?.owner ??
      null,

    /*
      角色目前實際 World Activity。
      例如 wander / travel / chat / rest。
    */
    runtimeActivityId:
      worldState.activity ??
      null,

    /*
      角色在世界語意上「正在做什麼」。

      Travel / Chat 期間也可以與
      runtimeActivityId 不同。
    */
    semanticActivityId,

    sceneId:
      worldState.sceneId ??
      null,

    /*
      只有目前 activityData 本身
      有 provenance 時才回傳。

      不做推測。
    */
    source:
      activityData?.source ??
      null,

    scheduleDefinitionId:
      ownership
        ?.scheduleDefinitionId ??
      null,

    scheduleInstanceId:
      ownership
        ?.scheduleInstanceId ??
      null,

    /*
      Runtime phase。

      Chat：
      approach / talk

      Travel：
      walkingToExit / transit / ...
    */
    phase:
      activityData?.phase ??
      worldState.travel?.phase ??
      null,
  });
}

function runGardenCharacterActivityTimelineSelfTest() {
  const fakeWanderState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,

    activityData:
      null,

    travel:
      null,
  };


  const fakeScheduleState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .REST,

    activityData: {
      source:
        "schedule",

      semanticActivityId:
        "rest",

      definitionId:
        "timeline-test-rest",

      instanceId:
        "timeline-test-instance",
    },

    travel:
      null,
  };


  const fakeTravelState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .TRAVEL,

    activityData: {
      semanticActivityId:
        "meal",
    },

    travel: {
      phase:
        "walkingToExit",
    },
  };


  const fakeChatState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .CHAT,

    activityData: {
      phase:
        "talk",

      semanticActivityByCharacter: {
        chifuyu:
          "reading",

        chinatsu:
          "tea",
      },
    },

    travel:
      null,
  };


  const wander =
    getGardenCharacterActivityTimeline(
      "chifuyu",
      fakeWanderState
    );


  const schedule =
    getGardenCharacterActivityTimeline(
      "chifuyu",
      fakeScheduleState
    );


  const travel =
    getGardenCharacterActivityTimeline(
      "chifuyu",
      fakeTravelState
    );


  const chifuyuChat =
    getGardenCharacterActivityTimeline(
      "chifuyu",
      fakeChatState
    );


  const chinatsuChat =
    getGardenCharacterActivityTimeline(
      "chinatsu",
      fakeChatState
    );


  /*
    Array.map(callback) safety。

    index 不得被誤認成
    worldStateOverride。
  */
  let directMapSafe =
    false;

  let directMapResults =
    null;


  try {
    directMapResults =
      [
        "chifuyu",
        "chinatsu",
      ].map(
        getGardenCharacterActivityTimeline
      );

    directMapSafe =
      Array.isArray(
        directMapResults
      ) &&
      directMapResults.length ===
        2 &&
      directMapResults[0]
        ?.characterId ===
        "chifuyu" &&
      directMapResults[1]
        ?.characterId ===
        "chinatsu";

  } catch (error) {
    directMapSafe =
      false;
  }


  const checks = {
    wanderOwner:
      wander?.runtimeOwner ===
        GARDEN_CHARACTER_ACTIVITY_OWNER
          .WANDER,

    wanderSemantic:
      wander?.semanticActivityId ===
        GARDEN_CHARACTER_ACTIVITY
          .WANDER,

    scheduleOwner:
      schedule?.runtimeOwner ===
        GARDEN_CHARACTER_ACTIVITY_OWNER
          .SCHEDULE,

    scheduleSemantic:
      schedule?.semanticActivityId ===
        "rest",

    scheduleMetadata:
      schedule
        ?.scheduleDefinitionId ===
        "timeline-test-rest" &&
      schedule
        ?.scheduleInstanceId ===
        "timeline-test-instance",

    travelOwner:
      travel?.runtimeOwner ===
        GARDEN_CHARACTER_ACTIVITY_OWNER
          .TRAVEL,

    travelSemantic:
      travel?.semanticActivityId ===
        "meal",

    travelPhase:
      travel?.phase ===
        "walkingToExit",

    chifuyuChatSemantic:
      chifuyuChat
        ?.semanticActivityId ===
        "reading",

    chinatsuChatSemantic:
      chinatsuChat
        ?.semanticActivityId ===
        "tea",

    chatPhase:
      chifuyuChat?.phase ===
        "talk" &&
      chinatsuChat?.phase ===
        "talk",

    directMapSafe,
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    wander,

    schedule,

    travel,

    chifuyuChat,

    chinatsuChat,

    directMapResults,
  };


  if (pass) {
    console.log(
      "[Garden Activity Timeline Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Activity Timeline Self-Test] FAIL",
      result
    );
  }


  return result;
}



function runGardenCharacterSemanticActivitySelfTest() {
  const fakeWanderState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,

    activityData:
      null,
  };


  const fakeScheduleRestState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .REST,

    activityData: {
      source:
        "schedule",

      semanticActivityId:
        "rest",
    },
  };


  /*
    舊資料或不完整 Schedule Data
    即使沒有 semanticActivityId，
    仍應 fallback 到 Runtime Activity。
  */
  const fakeScheduleFallbackState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .REST,

    activityData: {
      source:
        "schedule",
    },
  };


  const fakeRestChatState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .CHAT,

    activityData: {
      phase:
        "talk",

      parentActivity:
        GARDEN_CHARACTER_ACTIVITY
          .REST,
    },
  };


  const fakeNormalChatState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .CHAT,

    activityData: {
      phase:
        "talk",
    },
  };


  const fakeTravelState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .TRAVEL,

    activityData: {
      fromSceneId:
        "courtyard",

      toSceneId:
        "moonBridge",
    },
  };


  const wander =
    getGardenCharacterSemanticActivityId(
      "chifuyu",
      fakeWanderState
    );


  const scheduleRest =
    getGardenCharacterSemanticActivityId(
      "chifuyu",
      fakeScheduleRestState
    );


  const scheduleFallback =
    getGardenCharacterSemanticActivityId(
      "chifuyu",
      fakeScheduleFallbackState
    );


  const restChat =
    getGardenCharacterSemanticActivityId(
      "chifuyu",
      fakeRestChatState
    );


  const normalChat =
    getGardenCharacterSemanticActivityId(
      "chifuyu",
      fakeNormalChatState
    );


  const travel =
    getGardenCharacterSemanticActivityId(
      "chifuyu",
      fakeTravelState
    );


  /*
    和 Ownership Reader 一樣，
    Semantic Reader 也允許直接當作
    Array.map callback。

    index 不得被誤認成
    worldStateOverride。
  */
  let directMapSafe =
    false;

  let directMapResults =
    null;


  try {
    directMapResults =
      [
        "chifuyu",
        "chinatsu",
      ].map(
        getGardenCharacterSemanticActivityId
      );

    directMapSafe =
      Array.isArray(
        directMapResults
      ) &&
      directMapResults.length ===
        2;

  } catch (error) {
    directMapSafe =
      false;
  }


  const checks = {
    wanderPreserved:
      wander ===
        GARDEN_CHARACTER_ACTIVITY
          .WANDER,

    scheduleSemanticPreserved:
      scheduleRest ===
        "rest",

    scheduleFallbackPreserved:
      scheduleFallback ===
        GARDEN_CHARACTER_ACTIVITY
          .REST,

    restChatKeepsParent:
      restChat ===
        GARDEN_CHARACTER_ACTIVITY
          .REST,

    normalChatHasNoSemanticActivity:
      normalChat ===
        null,

    travelDoesNotGuessSemanticActivity:
      travel ===
        null,

    directMapSafe,
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    wander,

    scheduleRest,

    scheduleFallback,

    restChat,

    normalChat,

    travel,

    directMapResults,
  };


  if (pass) {
    console.log(
      "[Garden Semantic Activity Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Semantic Activity Self-Test] FAIL",
      result
    );
  }


  return result;
}



function runGardenCharacterActivityOwnershipSelfTest() {
  const fakeWanderState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,

    activityData:
      null,
  };


  const fakeTravelState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .TRAVEL,

    activityData:
      null,
  };


  const fakeChatState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .CHAT,

    activityData:
      {
        phase:
          "talk",
      },
  };


  const fakeScheduleState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .REST,

    activityData: {
      source:
        "schedule",

      semanticActivityId:
        "rest",

      definitionId:
        "ownership-test-rest",

      instanceId:
        "ownership-test-instance",
    },
  };


  const fakeActivityState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .REST,

    activityData:
      null,
  };


  const wander =
    getGardenCharacterActivityOwnership(
      "chifuyu",
      fakeWanderState
    );


  const travel =
    getGardenCharacterActivityOwnership(
      "chifuyu",
      fakeTravelState
    );


  const chat =
    getGardenCharacterActivityOwnership(
      "chifuyu",
      fakeChatState
    );


  const schedule =
    getGardenCharacterActivityOwnership(
      "chifuyu",
      fakeScheduleState
    );


  const activity =
    getGardenCharacterActivityOwnership(
      "chifuyu",
      fakeActivityState
    );


  /*
    Array.map(callback) 會額外傳入：

    value,
    index,
    array

    這裡永久確認 index 不會被誤認成
    worldStateOverride。
  */
  const directMapResults =
    [
      "chifuyu",
      "chinatsu",
    ].map(
      getGardenCharacterActivityOwnership
    );


  const checks = {
    wanderOwned:
      wander?.owner ===
        GARDEN_CHARACTER_ACTIVITY_OWNER
          .WANDER,

    travelOwned:
      travel?.owner ===
        GARDEN_CHARACTER_ACTIVITY_OWNER
          .TRAVEL,

    chatOwned:
      chat?.owner ===
        GARDEN_CHARACTER_ACTIVITY_OWNER
          .CHAT,

    scheduleOwned:
      schedule?.owner ===
        GARDEN_CHARACTER_ACTIVITY_OWNER
          .SCHEDULE,

    genericActivityOwned:
      activity?.owner ===
        GARDEN_CHARACTER_ACTIVITY_OWNER
          .ACTIVITY,

    scheduleSemanticPreserved:
      schedule
        ?.semanticActivityId ===
        "rest",

    scheduleDefinitionPreserved:
      schedule
        ?.scheduleDefinitionId ===
        "ownership-test-rest",

    scheduleInstancePreserved:
      schedule
        ?.scheduleInstanceId ===
        "ownership-test-instance",

    directMapSafe:
      directMapResults.length ===
        2 &&
      directMapResults[0]
        ?.characterId ===
        "chifuyu" &&
      directMapResults[1]
        ?.characterId ===
        "chinatsu" &&
      !!directMapResults[0]
        ?.owner &&
      !!directMapResults[1]
        ?.owner,
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    wander,

    travel,

    chat,

    schedule,

    activity,

    directMapResults,
  };


  if (pass) {
    console.log(
      "[Garden Activity Ownership Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Activity Ownership Self-Test] FAIL",
      result
    );
  }


  return result;
}




/* =========================
   12I-1
   Garden Activity Spot Registry
========================= */

const GARDEN_ACTIVITY_SPOT_SCHEMA =
  "nanaharaGardenActivitySpot";

const GARDEN_ACTIVITY_SPOT_VERSION =
  1;


/*
  第一個 Spot 先使用庭院既有、
  已確認可作為 Auto Target 的座標。

  目前只是 Runtime / Router 測試點。
  之後真正決定「休息要坐哪裡」時，
  可以直接換座標或增加正式 Spot。
*/
const COURTYARD_ACTIVITY_SPOTS =
  Object.freeze({
    "courtyard-rest-01":
      Object.freeze({
        schema:
          GARDEN_ACTIVITY_SPOT_SCHEMA,

        version:
          GARDEN_ACTIVITY_SPOT_VERSION,

        id:
          "courtyard-rest-01",

        sceneId:
          "courtyard",

        x:
          790,

        y:
          985,

        direction:
          -1,

        activities:
          Object.freeze([
            GARDEN_CHARACTER_ACTIVITY
              .REST,
          ]),
      }),

    "courtyard-rest-02":
      Object.freeze({
        schema:
          GARDEN_ACTIVITY_SPOT_SCHEMA,

        version:
          GARDEN_ACTIVITY_SPOT_VERSION,

        id:
          "courtyard-rest-02",

        sceneId:
          "courtyard",

        x:
          620,

        y:
          1080,

        direction:
          1,

        activities:
          Object.freeze([
            GARDEN_CHARACTER_ACTIVITY
              .REST,
          ]),
      }),

  });


const MOON_BRIDGE_ACTIVITY_SPOTS =
  Object.freeze({});


function isGardenActivitySpotUsable(
  spot,
  sceneId = null,
  activityId = null
) {
  if (
    !spot ||
    typeof spot !==
      "object"
  ) {
    return false;
  }


  if (
    spot.schema !==
      GARDEN_ACTIVITY_SPOT_SCHEMA ||
    spot.version !==
      GARDEN_ACTIVITY_SPOT_VERSION
  ) {
    return false;
  }


  if (
    !spot.id ||
    !spot.sceneId ||
    !Number.isFinite(
      spot.x
    ) ||
    !Number.isFinite(
      spot.y
    )
  ) {
    return false;
  }


  if (
    spot.direction !== 1 &&
    spot.direction !== -1
  ) {
    return false;
  }


  if (
    !Array.isArray(
      spot.activities
    ) ||
    spot.activities.length ===
      0
  ) {
    return false;
  }


  if (
    sceneId &&
    spot.sceneId !==
      sceneId
  ) {
    return false;
  }


  if (
    activityId &&
    !spot.activities.includes(
      activityId
    )
  ) {
    return false;
  }


  /*
    Spot 必須真的位於
    該 Scene 可走區。
  */
  if (
    !isGardenWalkablePointInScene(
      spot.sceneId,
      spot.x,
      spot.y
    )
  ) {
    return false;
  }


  return true;
}



function getGardenActivitySpot(
  sceneId,
  spotId,
  activityId = null
) {
  if (
    !sceneId ||
    !spotId
  ) {
    return null;
  }


  const scene =
    getGardenSceneById(
      sceneId
    );


  const spot =
    scene
      ?.activitySpots
      ?.[spotId] ??
    null;


  if (
    !isGardenActivitySpotUsable(
      spot,
      sceneId,
      activityId
    )
  ) {
    return null;
  }


  return spot;
}


function runGardenActivitySpotRegistrySelfTest() {
  const restSpot =
    getGardenActivitySpot(
      "courtyard",
      "courtyard-rest-01",
      GARDEN_CHARACTER_ACTIVITY
        .REST
    );


  const wrongActivity =
    getGardenActivitySpot(
      "courtyard",
      "courtyard-rest-01",
      GARDEN_CHARACTER_ACTIVITY
        .CHAT
    );


  const missingSpot =
    getGardenActivitySpot(
      "courtyard",
      "missing-spot",
      GARDEN_CHARACTER_ACTIVITY
        .REST
    );


  const scene =
    getGardenSceneById(
      "courtyard"
    );


  const checks = {
    spotFound:
      !!restSpot,

    correctScene:
      restSpot?.sceneId ===
        "courtyard",

    correctId:
      restSpot?.id ===
        "courtyard-rest-01",

    restAllowed:
      restSpot?.activities
        ?.includes(
          GARDEN_CHARACTER_ACTIVITY
            .REST
        ) === true,

    wrongActivityRejected:
      wrongActivity ===
        null,

    missingRejected:
      missingSpot ===
        null,

    walkable:
      !!restSpot &&
      isGardenWalkablePointInScene(
        "courtyard",
        restSpot.x,
        restSpot.y
      ),

    registeredInScene:
      scene?.activitySpots ===
        COURTYARD_ACTIVITY_SPOTS,

    moonBridgeRegistryExists:
      getGardenSceneById(
        "moonBridge"
      )?.activitySpots ===
        MOON_BRIDGE_ACTIVITY_SPOTS,
  };


  const pass =
    Object.values(
      checks
    ).every(
      Boolean
    );


  const result = {
    pass,
    checks,
    restSpot,
  };


  if (pass) {
    console.log(
      "[Garden Activity Spot Registry Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Activity Spot Registry Self-Test] FAIL",
      result
    );
  }


  return result;
}


/* =========================
   Canonical Event Approach
========================= */

const GARDEN_EVENT_APPROACH_SCHEMA =
  "nanaharaGardenEventApproach";

const GARDEN_EVENT_APPROACH_VERSION =
  1;


function createGardenCanonicalEventApproachPlan({
  characterId,

  sceneId,

  eventId,

  startPoint,

  startDirection = 1,

  targetPoint,

  targetDirection = 1,

  startedAt =
    getGardenWorldNow(),
} = {}) {
  if (
    !characterId ||
    !sceneId ||
    !eventId ||
    !startPoint ||
    !targetPoint ||
    !Number.isFinite(
      startPoint.x
    ) ||
    !Number.isFinite(
      startPoint.y
    ) ||
    !Number.isFinite(
      targetPoint.x
    ) ||
    !Number.isFinite(
      targetPoint.y
    ) ||
    !isValidGardenWorldTimestamp(
      startedAt
    )
  ) {
    return null;
  }


  /*
    Event Approach 和玩家目前
    正在觀看哪個場景無關。

    明確使用角色所在 scene
    建立固定路徑。
  */
  const path =
    findGardenPath(
      startPoint,
      targetPoint,
      sceneId
    );


  if (!path) {
    return null;
  }


  /*
    沿用 Travel 已驗證過的
    Canonical Path-Time Model。

    因此：
    同一 startedAt + 同一路徑
    → 不同裝置會得到相同進度。
  */
  const pathRecord =
    createGardenCanonicalTravelPathRecord(
      characterId,
      startPoint,
      path
    );


  if (!pathRecord) {
    return null;
  }


  const durationMs =
    pathRecord.totalDurationMs;


  const endsAt =
    startedAt +
    durationMs;


  return Object.freeze({
    schema:
      GARDEN_EVENT_APPROACH_SCHEMA,

    version:
      GARDEN_EVENT_APPROACH_VERSION,

    characterId,

    sceneId,

    eventId,

    startedAt,

    endsAt,

    durationMs,

    startPoint:
      Object.freeze({
        x:
          startPoint.x,

        y:
          startPoint.y,
      }),

startDirection:
  startDirection === -1
    ? -1
    : 1,


    targetPoint:
      Object.freeze({
        x:
          targetPoint.x,

        y:
          targetPoint.y,

        direction:
          targetDirection === -1
            ? -1
            : 1,
      }),

    path:
      pathRecord,
  });
}

function resolveGardenCanonicalEventApproach(
  plan,

  timestamp =
    getGardenWorldNow()
) {
  if (
    !plan ||
    plan.schema !==
      GARDEN_EVENT_APPROACH_SCHEMA ||
    plan.version !==
      GARDEN_EVENT_APPROACH_VERSION ||
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return null;
  }


  /*
    尚未開始。
  */
  if (
    timestamp <
    plan.startedAt
  ) {
    return Object.freeze({
      phase:
        "pending",

      completed:
        false,

      sceneId:
        plan.sceneId,

      eventId:
        plan.eventId,

      x:
        plan.startPoint.x,

      y:
        plan.startPoint.y,

      direction:
  plan.startDirection,

      isMoving:
        false,

      progress:
        0,
    });
  }


  /*
    已經抵達事件位置。
  */
  if (
    timestamp >=
    plan.endsAt
  ) {
    return Object.freeze({
      phase:
        "completed",

      completed:
        true,

      sceneId:
        plan.sceneId,

      eventId:
        plan.eventId,

      x:
        plan.targetPoint.x,

      y:
        plan.targetPoint.y,

      direction:
        plan.targetPoint
          .direction,

      isMoving:
        false,

      progress:
        1,
    });
  }


  /*
    Approach 途中。

    直接依：
    world timestamp - startedAt

    從固定 Canonical Path
    取出此刻的位置。
  */
  const sample =
    sampleGardenCanonicalTravelPath(
      plan.path,

      timestamp -
        plan.startedAt
    );


  if (!sample) {
    return null;
  }


  return Object.freeze({
    phase:
      "approach",

    completed:
      false,

    sceneId:
      plan.sceneId,

    eventId:
      plan.eventId,

    x:
      sample.x,

    y:
      sample.y,

   direction:
  sample.direction ??
  plan.startDirection,

    isMoving:
      true,

    progress:
      sample.progress,

    sample,
  });
}





/* =========================
   12I-2
   Canonical Activity Spot Approach
========================= */

const GARDEN_ACTIVITY_SPOT_APPROACH_SCHEMA =
  "nanaharaGardenActivitySpotApproach";

const GARDEN_ACTIVITY_SPOT_APPROACH_VERSION =
  1;


function createGardenCanonicalActivitySpotApproachPlan({
  characterId,

  sceneId,

  spotId,

  activityId,

  startPoint,

  startDirection = 1,

  startedAt =
    getGardenWorldNow(),
} = {}) {
  if (
    !characterId ||
    !sceneId ||
    !spotId ||
    !activityId ||
    !startPoint ||
    !Number.isFinite(
      startPoint.x
    ) ||
    !Number.isFinite(
      startPoint.y
    ) ||
    !isValidGardenWorldTimestamp(
      startedAt
    )
  ) {
    return null;
  }


  /*
    Spot 必須：
    - 存在
    - 屬於正確 Scene
    - 支援這個 Activity
    - 位於可走區
  */
  const spot =
    getGardenActivitySpot(
      sceneId,
      spotId,
      activityId
    );


  if (!spot) {
    return null;
  }


  /*
    起點也必須真的位於
    角色所在 Scene 的可走區。
  */
  if (
    !isGardenWalkablePointInScene(
      sceneId,
      startPoint.x,
      startPoint.y
    )
  ) {
    return null;
  }


  const targetPoint = {
    x:
      spot.x,

    y:
      spot.y,
  };


  /*
    使用 Scene-aware path finder。

    它不看玩家目前畫面，
    而是明確指定 character scene。
  */
  const path =
    findGardenPath(
      startPoint,
      targetPoint,
      sceneId
    );


  if (!path) {
    return null;
  }


  /*
    重用 Travel 已驗證的
    Canonical Path-Time Model。
  */
  const pathRecord =
    createGardenCanonicalTravelPathRecord(
      characterId,
      startPoint,
      path
    );


  if (!pathRecord) {
    return null;
  }


  const durationMs =
    pathRecord.totalDurationMs;


  const endsAt =
    startedAt +
    durationMs;


  return Object.freeze({
    schema:
      GARDEN_ACTIVITY_SPOT_APPROACH_SCHEMA,

    version:
      GARDEN_ACTIVITY_SPOT_APPROACH_VERSION,


    characterId,

    sceneId,

    spotId,

    activityId,


    startedAt,

    endsAt,

    durationMs,


    startPoint:
      Object.freeze({
        x:
          startPoint.x,

        y:
          startPoint.y,
      }),


    startDirection:
      startDirection === -1
        ? -1
        : 1,


    /*
      把目標 Spot 的空間資料
      固定進 Plan。

      之後即使 Runtime 不直接查 Registry，
      也能從這份 Canonical Plan
      重建抵達位置。
    */
    targetSpot:
      Object.freeze({
        id:
          spot.id,

        sceneId:
          spot.sceneId,

        x:
          spot.x,

        y:
          spot.y,

        direction:
          spot.direction,
      }),


    path:
      pathRecord,
  });
}

function isGardenCanonicalActivitySpotApproachPlanUsable(
  plan,
  characterId = null,
  sceneId = null,
  activityId = null
) {
  if (
    !plan ||
    typeof plan !==
      "object"
  ) {
    return false;
  }


  if (
    plan.schema !==
      GARDEN_ACTIVITY_SPOT_APPROACH_SCHEMA ||
    plan.version !==
      GARDEN_ACTIVITY_SPOT_APPROACH_VERSION
  ) {
    return false;
  }


  if (
    !plan.characterId ||
    !plan.sceneId ||
    !plan.spotId ||
    !plan.activityId
  ) {
    return false;
  }


  if (
    characterId &&
    plan.characterId !==
      characterId
  ) {
    return false;
  }


  if (
    sceneId &&
    plan.sceneId !==
      sceneId
  ) {
    return false;
  }


  if (
    activityId &&
    plan.activityId !==
      activityId
  ) {
    return false;
  }


  if (
    !isValidGardenWorldTimestamp(
      plan.startedAt
    ) ||
    !isValidGardenWorldTimestamp(
      plan.endsAt
    )
  ) {
    return false;
  }


  if (
    plan.endsAt <
    plan.startedAt
  ) {
    return false;
  }


  if (
    !Number.isFinite(
      plan.durationMs
    ) ||
    plan.durationMs <
      0
  ) {
    return false;
  }


  if (
    Math.abs(
      (
        plan.endsAt -
        plan.startedAt
      ) -
      plan.durationMs
    ) >
      0.001
  ) {
    return false;
  }


  if (
    !Number.isFinite(
      plan.startPoint?.x
    ) ||
    !Number.isFinite(
      plan.startPoint?.y
    ) ||
    !Number.isFinite(
      plan.targetSpot?.x
    ) ||
    !Number.isFinite(
      plan.targetSpot?.y
    )
  ) {
    return false;
  }


  if (
    plan.targetSpot?.direction !==
      1 &&
    plan.targetSpot?.direction !==
      -1
  ) {
    return false;
  }


  if (
    !plan.path ||
    !Array.isArray(
      plan.path.points
    ) ||
    plan.path.points.length ===
      0 ||
    !Number.isFinite(
      plan.path.totalDurationMs
    )
  ) {
    return false;
  }


  if (
    Math.abs(
      plan.path.totalDurationMs -
      plan.durationMs
    ) >
      0.001
  ) {
    return false;
  }


  /*
    Path 最後一點
    必須真的就是 Spot。
  */
  const lastPoint =
    plan.path.points[
      plan.path.points.length -
      1
    ];


  if (
    !lastPoint ||
    Math.abs(
      lastPoint.x -
      plan.targetSpot.x
    ) >
      0.001 ||
    Math.abs(
      lastPoint.y -
      plan.targetSpot.y
    ) >
      0.001
  ) {
    return false;
  }


  return true;
}



function resolveGardenCanonicalActivitySpotApproach(
  plan,

  timestamp =
    getGardenWorldNow()
) {
  if (
    !isGardenCanonicalActivitySpotApproachPlanUsable(
      plan
    ) ||
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return null;
  }


  /*
    =========================
    尚未開始
    =========================
  */
  if (
    timestamp <
    plan.startedAt
  ) {
    return Object.freeze({
      phase:
        "pending",

      completed:
        false,

      sceneId:
        plan.sceneId,

      spotId:
        plan.spotId,

      x:
        plan.startPoint.x,

      y:
        plan.startPoint.y,

      direction:
        plan.startDirection,

      isMoving:
        false,

      progress:
        0,
    });
  }


  /*
    =========================
    已抵達 Spot
    =========================

    最終朝向使用 Spot 自己指定的
    direction，而不是最後 path segment。
  */
  if (
    timestamp >=
    plan.endsAt
  ) {
    return Object.freeze({
      phase:
        "completed",

      completed:
        true,

      sceneId:
        plan.sceneId,

      spotId:
        plan.spotId,

      x:
        plan.targetSpot.x,

      y:
        plan.targetSpot.y,

      direction:
        plan.targetSpot.direction,

      isMoving:
        false,

      progress:
        1,
    });
  }


  /*
    =========================
    Approach 中
    =========================
  */
  const sample =
    sampleGardenCanonicalTravelPath(
      plan.path,

      timestamp -
      plan.startedAt
    );


  if (!sample) {
    return null;
  }


  return Object.freeze({
    phase:
      "approach",

    completed:
      false,

    sceneId:
      plan.sceneId,

    spotId:
      plan.spotId,

    x:
      sample.x,

    y:
      sample.y,

    direction:
      sample.direction ??
      plan.startDirection,

    isMoving:
      true,

    progress:
      sample.progress,

    sample,
  });
}

function runGardenActivitySpotApproachSelfTest() {
  const characterId =
    "chifuyu";

  const sceneId =
    "courtyard";

  const spotId =
    "courtyard-rest-01";

  const activityId =
    GARDEN_CHARACTER_ACTIVITY
      .REST;


  /*
    使用庭院既有的安全出生位置。
  */
  const startPoint = {
    x:
      600,

    y:
      1725,
  };


  const startedAt =
    Date.parse(
      "2026-09-23T12:00:00+09:00"
    );


  const plan =
    createGardenCanonicalActivitySpotApproachPlan({
      characterId,

      sceneId,

      spotId,

      activityId,

      startPoint,

      startDirection:
        1,

      startedAt,
    });


  if (!plan) {
    const result = {
      pass:
        false,

      reason:
        "planBuildFailed",
    };


    console.warn(
      "[Garden Activity Spot Approach Self-Test] FAIL",
      result
    );


    return result;
  }


  const before =
    resolveGardenCanonicalActivitySpotApproach(
      plan,
      plan.startedAt -
        1000
    );


  const atStart =
    resolveGardenCanonicalActivitySpotApproach(
      plan,
      plan.startedAt
    );


  const midpoint =
    resolveGardenCanonicalActivitySpotApproach(
      plan,
      plan.startedAt +
        plan.durationMs *
          0.5
    );


  const atEnd =
    resolveGardenCanonicalActivitySpotApproach(
      plan,
      plan.endsAt
    );


  /*
    JSON round-trip：
    未來 Snapshot / Reload
    必須仍可使用同一份 Plan。
  */
  const serialized =
    JSON.stringify(
      plan
    );


  const restored =
    JSON.parse(
      serialized
    );


  const restoredEnd =
    resolveGardenCanonicalActivitySpotApproach(
      restored,
      restored.endsAt
    );


  const epsilon =
    0.000001;


  const checks = {
    planCreated:
      !!plan,


    planValid:
      isGardenCanonicalActivitySpotApproachPlanUsable(
        plan,
        characterId,
        sceneId,
        activityId
      ),


    positiveDuration:
      plan.durationMs >
      0,


    beforePending:
      before?.phase ===
        "pending" &&
      before?.isMoving ===
        false,


    startsApproach:
      atStart?.phase ===
        "approach",


    midpointApproach:
      midpoint?.phase ===
        "approach" &&
      midpoint?.isMoving ===
        true,


    endsCompleted:
      atEnd?.phase ===
        "completed" &&
      atEnd?.completed ===
        true &&
      atEnd?.isMoving ===
        false,


    endsAtSpotX:
      Math.abs(
        atEnd.x -
        plan.targetSpot.x
      ) <
        epsilon,


    endsAtSpotY:
      Math.abs(
        atEnd.y -
        plan.targetSpot.y
      ) <
        epsilon,


    finalDirectionMatchesSpot:
      atEnd.direction ===
        plan.targetSpot.direction,


    serializable:
      !!serialized,


    restoredValid:
      isGardenCanonicalActivitySpotApproachPlanUsable(
        restored,
        characterId,
        sceneId,
        activityId
      ),


    reloadStableX:
      Math.abs(
        restoredEnd.x -
        atEnd.x
      ) <
        epsilon,


    reloadStableY:
      Math.abs(
        restoredEnd.y -
        atEnd.y
      ) <
        epsilon,


    reloadStableDirection:
      restoredEnd.direction ===
        atEnd.direction,
  };


  const pass =
    Object.values(
      checks
    ).every(
      Boolean
    );


  const result = {
    pass,

    checks,

    plan,

    before,

    atStart,

    midpoint,

    atEnd,

    restoredEnd,
  };


  if (pass) {
    console.log(
      "[Garden Activity Spot Approach Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Activity Spot Approach Self-Test] FAIL",
      result
    );
  }


  return result;
}

/* =========================
   12I-3
   Canonical Activity Spot Runtime
========================= */

const GARDEN_CANONICAL_ACTIVITY_SPOT_RUNTIME_ENABLED =
  true;


function canGardenCharacterUseCanonicalActivitySpotRuntime(
  characterId,
  worldStateOverride = null
) {
  if (
    !GARDEN_CANONICAL_ACTIVITY_SPOT_RUNTIME_ENABLED
  ) {
    return false;
  }


  const worldState =
    worldStateOverride ??
    gardenCharacterWorldState[
      characterId
    ];


  if (!worldState) {
    return false;
  }


  /*
    Travel 永遠有更高 Spatial Priority。
  */
  if (
  worldState.travel ||
  getGardenCharacterActivityOwnership(
    characterId,
    worldState
  )?.owner ===
    GARDEN_CHARACTER_ACTIVITY_OWNER
      .TRAVEL
) {
  return false;
}

  const plan =
    worldState.activitySpotApproach;


  if (!plan) {
    return false;
  }


  /*
    Approach 必須仍然屬於
    角色目前真正的 Activity / Scene。
  */
  if (
    worldState.activity !==
      plan.activityId ||
    worldState.sceneId !==
      plan.sceneId
  ) {
    return false;
  }


  return (
    isGardenCanonicalActivitySpotApproachPlanUsable(
      plan,
      characterId,
      worldState.sceneId,
      worldState.activity
    )
  );
}

function applyGardenCanonicalActivitySpotRuntimeForCharacter(
  characterId,

  timestamp =
    getGardenWorldNow()
) {
  const worldState =
    gardenCharacterWorldState[
      characterId
    ];


  const runtime =
    getGardenCharacterRuntime(
      characterId
    );


  if (
    !worldState ||
    !runtime?.moveState
  ) {
    return Object.freeze({
      characterId,

      owned:
        false,

      applied:
        false,

      completed:
        false,

      reason:
        "runtimeUnavailable",
    });
  }


  const owned =
    canGardenCharacterUseCanonicalActivitySpotRuntime(
      characterId,
      worldState
    );


  if (!owned) {
    return Object.freeze({
      characterId,

      owned:
        false,

      applied:
        false,

      completed:
        false,

      reason:
        "notActivitySpotApproach",
    });
  }


  const plan =
    worldState.activitySpotApproach;


  const sample =
    resolveGardenCanonicalActivitySpotApproach(
      plan,
      timestamp
    );


  /*
    Canonical Owner 已取得，
    就絕不能掉回 local path。
  */
  runtime.setPath?.([]);

  runtime.moveState.path =
    [];


  if (
    runtime.autoState
  ) {
    runtime.autoState.wasMoving =
      false;
  }


  if (!sample) {
    runtime.moveState.isMoving =
      false;


    return Object.freeze({
      characterId,

      owned:
        true,

      applied:
        false,

      completed:
        false,

      reason:
        "sampleUnavailable",

      plan,
    });
  }


  const state =
    runtime.moveState;


  state.x =
    sample.x;

  state.y =
    sample.y;


  if (
    sample.direction === 1 ||
    sample.direction === -1
  ) {
    state.direction =
      sample.direction;
  }


  state.isMoving =
    sample.isMoving === true;


  worldState.sceneId =
    sample.sceneId;


  /*
    =========================
    Spot Reached
    =========================

    Activity 本身不結束。

    例如 REST：
    Approach 完成後仍然是 REST，
    只是 spatial approach 已完成。
  */
  if (
    sample.completed
  ) {
    state.isMoving =
      false;


    worldState.activitySpotApproach =
      null;


    return Object.freeze({
      characterId,

      owned:
        true,

      applied:
        true,

      completed:
        true,

      reason:
        "activitySpotReached",

      sceneId:
        worldState.sceneId,

      spotId:
        plan.spotId,

      activityId:
        worldState.activity,

      sample,
    });
  }


  return Object.freeze({
    characterId,

    owned:
      true,

    applied:
      true,

    completed:
      false,

    reason:
      "canonicalActivitySpotApproach",

    sceneId:
      worldState.sceneId,

    spotId:
      plan.spotId,

    activityId:
      worldState.activity,

    sample,
  });
}


function updateGardenCanonicalActivitySpotRuntime(
  timestamp =
    getGardenWorldNow()
) {
  const chifuyu =
    applyGardenCanonicalActivitySpotRuntimeForCharacter(
      "chifuyu",
      timestamp
    );


  const chinatsu =
    applyGardenCanonicalActivitySpotRuntimeForCharacter(
      "chinatsu",
      timestamp
    );


  return Object.freeze({
    chifuyu,
    chinatsu,
  });
}


function startGardenCharacterActivitySpotApproach(
  characterId,
  {
    sceneId,
    spotId,
    activityId,
    activityData = null,

    startedAt =
      getGardenWorldNow(),
  } = {}
) {
  const worldState =
    gardenCharacterWorldState[
      characterId
    ];


  const runtime =
    getGardenCharacterRuntime(
      characterId
    );


  if (
    !worldState ||
    !runtime?.moveState ||
    !sceneId ||
    !spotId ||
    !activityId
  ) {
    return null;
  }


  /*
    跨場景必須先走 Travel。
  */
  if (
    worldState.travel ||
    worldState.sceneId !==
      sceneId
  ) {
    return null;
  }


  const state =
    runtime.moveState;


  const plan =
    createGardenCanonicalActivitySpotApproachPlan({
      characterId,

      sceneId,

      spotId,

      activityId,

      startPoint: {
        x:
          state.x,

        y:
          state.y,
      },

      startDirection:
        state.direction,

      startedAt,
    });


  if (!plan) {
    return null;
  }


  /*
    先進入真正 Activity。

    REST 等 Activity 的 local path
    會被 setGardenCharacterActivity
    清乾淨。
  */
  const changed =
    setGardenCharacterActivity(
      characterId,
      activityId,
      activityData
    );


  if (
    changed === false
  ) {
    return null;
  }


  /*
    Activity 切換完成之後，
    再掛上 Canonical Spatial Plan。
  */
  worldState.activitySpotApproach =
    plan;


  return plan;
}


function inspectGardenActivitySpotRuntime(
  characterId =
    "chifuyu"
) {
  const worldState =
    gardenCharacterWorldState[
      characterId
    ];


  const runtime =
    getGardenCharacterRuntime(
      characterId
    );


  const result =
    applyGardenCanonicalActivitySpotRuntimeForCharacter(
      characterId,
      getGardenWorldNow()
    );


  const info = {
    character:
      characterId,

    activity:
      worldState?.activity ??
      null,

    sceneId:
      worldState?.sceneId ??
      null,

    hasApproach:
      !!worldState
        ?.activitySpotApproach,

    owned:
      result.owned,

    applied:
      result.applied,

    completed:
      result.completed,

    reason:
      result.reason,

    spotId:
      result.spotId ??
      worldState
        ?.activitySpotApproach
        ?.spotId ??
      null,

    x:
      runtime?.moveState?.x ??
      null,

    y:
      runtime?.moveState?.y ??
      null,

    isMoving:
      runtime?.moveState
        ?.isMoving ??
      null,

    localPathLength:
      runtime?.moveState
        ?.path
        ?.length ??
      0,
  };


  console.table([
    info,
  ]);


  return info;
}


function reconcileGardenActivitySpotApproachSystem(
  context
) {
  if (
    !context ||
    !isValidGardenWorldTimestamp(
      context.resumedAt
    )
  ) {
    return Object.freeze({
      ok:
        false,

      reason:
        "invalidContext",

      results:
        Object.freeze([]),
    });
  }


  const results =
    [];


  for (
    const characterId of
    Object.keys(
      gardenCharacterWorldState
    )
  ) {
    const worldState =
      gardenCharacterWorldState[
        characterId
      ];


    /*
      沒有 Approach 的角色
      不需要做任何事情。
    */
    if (
      !worldState
        ?.activitySpotApproach
    ) {
      results.push(
        Object.freeze({
          characterId,

          action:
            "none",

          reason:
            "noActivitySpotApproach",
        })
      );

      continue;
    }


    /*
      關鍵：

      不使用 Snapshot 的舊 x / y
      推進。

      直接拿同一份 Canonical Plan，
      問 resumedAt 這一刻
      應該在哪裡。
    */
    const result =
      applyGardenCanonicalActivitySpotRuntimeForCharacter(
        characterId,
        context.resumedAt
      );


    results.push(
      Object.freeze({
        characterId,

        action:
          result.completed
            ? "completed"
            : result.applied
              ? "resumed"
              : "none",

        reason:
          result.reason,

        owned:
          result.owned,

        applied:
          result.applied,

        completed:
          result.completed,
      })
    );
  }


  return Object.freeze({
    ok:
      true,

    reason:
      "reconciled",

    timestamp:
      context.resumedAt,

    results:
      Object.freeze(
        results
      ),
  });
}


registerGardenWorldReconciliationHandler(
  "activitySpotApproach",
  reconcileGardenActivitySpotApproachSystem,
  {
    priority:
      150,
  }
);

registerGardenWorldReconciliationHandler(
  "scheduleCatchUp",
  reconcileGardenScheduleCatchUpSystem,
  {
    priority:
      125,
  }
);




function runGardenActivitySpotResumeSelfTest() {
  const characterId =
    "chifuyu";

  const sceneId =
    "courtyard";

  const spotId =
    "courtyard-rest-01";

  const activityId =
    GARDEN_CHARACTER_ACTIVITY
      .REST;


  const worldState =
    gardenCharacterWorldState[
      characterId
    ];

  const runtime =
    getGardenCharacterRuntime(
      characterId
    );


  if (
    !worldState ||
    !runtime?.moveState
  ) {
    console.warn(
      "[Garden Activity Spot Resume Self-Test] FAIL: runtime unavailable"
    );

    return {
      pass:false,
      reason:"runtimeUnavailable",
    };
  }


  /*
    =========================
    Backup
    =========================

    Self-Test 結束後會完整放回去，
    不污染目前正式世界狀態。
  */
  const originalWorldState =
    cloneGardenWorldSerializableValue(
      worldState
    );

  const originalMoveState =
    cloneGardenWorldSerializableValue({
      x:
        runtime.moveState.x,

      y:
        runtime.moveState.y,

      direction:
        runtime.moveState.direction,

      isMoving:
        runtime.moveState.isMoving,

      path:
        runtime.moveState.path ??
        [],
    });

  const originalAutoWasMoving =
    runtime.autoState
      ?.wasMoving;


  let result = null;


  try {
    const startedAt =
      Date.parse(
        "2026-09-23T12:00:00+09:00"
      );


    const plan =
      createGardenCanonicalActivitySpotApproachPlan({
        characterId,

        sceneId,

        spotId,

        activityId,

        startPoint: {
          x:600,
          y:1725,
        },

        startDirection:
          1,

        startedAt,
      });


    if (!plan) {
      throw new Error(
        "failedToCreatePlan"
      );
    }


    /*
      模擬：

      Snapshot
      → JSON.stringify
      → localStorage
      → JSON.parse
    */
    const storedPlan =
      JSON.parse(
        JSON.stringify(
          plan
        )
      );


    const fakeSnapshot = {
      sceneId,

      activity:
        activityId,

      activityData: {
        source:
          "selfTest",
      },

      wanderContinuity:
        null,

      activitySpotApproach:
        storedPlan,

      travel:
        null,

      position: {
        x:600,
        y:1725,
        direction:1,
      },
    };


    /*
      =========================
      1. 模擬新頁面 Restore
      =========================
    */
    const restored =
      restoreGardenCharacterFromSnapshot(
        characterId,
        fakeSnapshot
      );


    const restoreKeepsApproach =
      worldState
        .activitySpotApproach
        ?.spotId ===
      spotId;


    /*
      =========================
      2. 模擬 Reload 發生在途中
      =========================
    */
    const midpointAt =
      startedAt +
      Math.floor(
        plan.durationMs / 2
      );


    const expectedMidpoint =
      resolveGardenCanonicalActivitySpotApproach(
        plan,
        midpointAt
      );


    const midpointContext =
      createGardenWorldResumeContext(
        startedAt,
        midpointAt,
        "selfTest",
        "selfTest"
      );


    const midpointReconciliation =
      reconcileGardenActivitySpotApproachSystem(
        midpointContext
      );


    const midpointX =
      runtime.moveState.x;

    const midpointY =
      runtime.moveState.y;


    /*
      =========================
      3. 模擬離開時間已超過 endsAt
      =========================
    */
    const completedAt =
      plan.endsAt +
      1;


    const completedContext =
      createGardenWorldResumeContext(
        midpointAt,
        completedAt,
        "selfTest",
        "selfTest"
      );


    const completedReconciliation =
      reconcileGardenActivitySpotApproachSystem(
        completedContext
      );


    const checks = {
      planCreated:
        !!plan,

      restored:
        restored === true,

      restoreKeepsApproach,

      restoreKeepsActivity:
        worldState.activity ===
          activityId,

      midpointResolved:
        !!expectedMidpoint,

      midpointIsApproach:
        expectedMidpoint
          ?.phase ===
        "approach",

      midpointPositionMatches:
        Math.abs(
          midpointX -
          expectedMidpoint.x
        ) < 0.001 &&
        Math.abs(
          midpointY -
          expectedMidpoint.y
        ) < 0.001,

      midpointReconciled:
        midpointReconciliation
          ?.ok ===
        true,

      completedReconciled:
        completedReconciliation
          ?.ok ===
        true,

      approachClearedAtEnd:
        worldState
          .activitySpotApproach ===
        null,

      activityStillRest:
        worldState.activity ===
          activityId,

      finalXCorrect:
        Math.abs(
          runtime.moveState.x -
          plan.targetSpot.x
        ) < 0.001,

      finalYCorrect:
        Math.abs(
          runtime.moveState.y -
          plan.targetSpot.y
        ) < 0.001,

      finalDirectionCorrect:
        runtime.moveState
          .direction ===
        plan.targetSpot.direction,

      stoppedAtSpot:
        runtime.moveState
          .isMoving ===
        false,

      localPathEmpty:
        runtime.moveState
          .path
          ?.length ===
        0,
    };


    const pass =
      Object.values(
        checks
      ).every(Boolean);


    result = {
      pass,

      checks,

      plan,

      expectedMidpoint,

      midpointReconciliation,

      completedReconciliation,
    };


    if (pass) {
      console.log(
        "[Garden Activity Spot Resume Self-Test] PASS",
        result
      );

    } else {
      console.warn(
        "[Garden Activity Spot Resume Self-Test] FAIL",
        result
      );
    }


  } catch (err) {
    result = {
      pass:false,

      reason:
        String(
          err?.message ||
          err
        ),

      error:
        err,
    };


    console.warn(
      "[Garden Activity Spot Resume Self-Test] FAIL",
      result
    );


  } finally {
    /*
      =========================
      Restore Original State
      =========================
    */
    Object.assign(
      worldState,
      cloneGardenWorldSerializableValue(
        originalWorldState
      )
    );


    runtime.setPath?.(
      cloneGardenWorldSerializableValue(
        originalMoveState.path
      ) || []
    );


    runtime.moveState.x =
      originalMoveState.x;

    runtime.moveState.y =
      originalMoveState.y;

    runtime.moveState.direction =
      originalMoveState.direction;

    runtime.moveState.isMoving =
      originalMoveState.isMoving;


    if (
      runtime.autoState
    ) {
      runtime.autoState.wasMoving =
        originalAutoWasMoving;
    }
  }


  return result;
}





function canGardenCharacterUseAmbientWander(
  character,
  worldStateOverride = null
) {
  const worldState =
    worldStateOverride ??
    gardenCharacterWorldState[
      character
    ];


  if (!worldState) {
    return false;
  }


  /*
    Ambient 行為包括：

    - 自動散步
    - 自動旅行
    - 自然聊天

    只有真正的 WANDER
    才允許參與。
  */
 if (
  getGardenCharacterActivityOwnership(
    character,
    worldState
  )?.owner !==
    GARDEN_CHARACTER_ACTIVITY_OWNER
      .WANDER
) {
  return false;
}


  if (
    worldState.travel
  ) {
    return false;
  }


  return true;
}




/* =========================
   Garden Schedule → Activity Bridge
========================= */

const GARDEN_SCHEDULE_BRIDGE_ACTION =
  Object.freeze({
    PRESERVE_RUNTIME:
      "preserveRuntime",

    WANDER:
      "wander",

    TRAVEL:
      "travel",

    ACTIVITY:
      "activity",
  });


function isGardenRuntimeActivitySupported(
  activityId
) {
  if (!activityId) {
    return false;
  }


  return Object.values(
    GARDEN_CHARACTER_ACTIVITY
  ).includes(
    activityId
  );
}


function resolveGardenScheduleRuntimeActivity(
  entry
) {
  if (!entry) {
    return (
      GARDEN_CHARACTER_ACTIVITY
        .WANDER
    );
  }


  const selectedActivityId =
    entry.activity
      ?.selectedActivityId ??
    null;


  const fallbackActivityId =
    entry.activity
      ?.fallbackActivityId ??
    GARDEN_CHARACTER_ACTIVITY
      .WANDER;


  /*
    Schedule 選中的 Activity
    已經有正式 Runtime implementation。
  */
  if (
    isGardenRuntimeActivitySupported(
      selectedActivityId
    )
  ) {
    return selectedActivityId;
  }


  /*
    正式 Activity 尚未實作，
    嘗試它指定的 fallback。
  */
  if (
    isGardenRuntimeActivitySupported(
      fallbackActivityId
    )
  ) {
    return fallbackActivityId;
  }


  /*
    最後保險。
  */
  return (
    GARDEN_CHARACTER_ACTIVITY
      .WANDER
  );
}


function createGardenScheduleBridgeDecision(
  schedules,
  characterId,
  worldPoint,
  options = {}
) {
  const safeCharacterId =
    normalizeGardenWorldDecisionToken(
      characterId
    );


  if (
    !safeCharacterId ||
    !worldPoint
  ) {
    return null;
  }


  /*
    正式狀態：
    使用 gardenCharacterWorldState。

    Self-Test：
    可以傳假的 worldState，
    完全不動真角色。
  */
  const worldState =
    options.worldState ??
    gardenCharacterWorldState[
      safeCharacterId
    ];


  if (!worldState) {
    return null;
  }


  const resolution =
    resolveGardenCharacterScheduleAtWorldPoint(
      schedules,
      safeCharacterId,
      worldPoint
    );


  if (!resolution) {
    return null;
  }


  const currentRuntimeActivity =
    worldState.activity ??
    GARDEN_CHARACTER_ACTIVITY
      .WANDER;


const currentOwnership =
  getGardenCharacterActivityOwnership(
    safeCharacterId,
    worldState
  );


  /*
    =========================
    1. Travel 有最高 Runtime 保護
    =========================

    Schedule 不可以在角色走到一半時
    突然把她切成 meal / read。
  */
  if (
  worldState.travel ||
  currentOwnership?.owner ===
    GARDEN_CHARACTER_ACTIVITY_OWNER
      .TRAVEL
) {
    return Object.freeze({
      characterId:
        safeCharacterId,

      action:
        GARDEN_SCHEDULE_BRIDGE_ACTION
          .PRESERVE_RUNTIME,

      reason:
        "travelInProgress",

      currentSceneId:
        worldState.sceneId ??
        null,

      currentRuntimeActivity,

      scheduleState:
        resolution.state,

      resolution,

      activeEntry:
        resolution.activeEntry ??
        null,

      semanticActivityId:
        resolution.activeEntry
          ?.activity
          ?.selectedActivityId ??
        null,

      runtimeActivityId:
        currentRuntimeActivity,

      targetSceneId:
        resolution.activeEntry
          ?.target
          ?.sceneId ??
        null,

      targetSpotId:
        resolution.activeEntry
          ?.target
          ?.spotId ??
        null,

      needsTravel:
        false,

      needsSpotMovement:
        false,
    });
  }


  /*
    =========================
    2. Chat 也不能被 Schedule 硬切
    =========================
  */
  if (
  currentOwnership?.owner ===
    GARDEN_CHARACTER_ACTIVITY_OWNER
      .CHAT
) {
    return Object.freeze({
      characterId:
        safeCharacterId,

      action:
        GARDEN_SCHEDULE_BRIDGE_ACTION
          .PRESERVE_RUNTIME,

      reason:
        "chatInProgress",

      currentSceneId:
        worldState.sceneId ??
        null,

      currentRuntimeActivity,

      scheduleState:
        resolution.state,

      resolution,

      activeEntry:
        resolution.activeEntry ??
        null,

      semanticActivityId:
        resolution.activeEntry
          ?.activity
          ?.selectedActivityId ??
        null,

      runtimeActivityId:
        currentRuntimeActivity,

      targetSceneId:
        resolution.activeEntry
          ?.target
          ?.sceneId ??
        null,

      targetSpotId:
        resolution.activeEntry
          ?.target
          ?.spotId ??
        null,

      needsTravel:
        false,

      needsSpotMovement:
        false,
    });
  }


  /*
    =========================
    3. Schedule GAP
    =========================
  */
  if (
    resolution.state ===
      GARDEN_SCHEDULE_RESOLUTION_STATE
        .GAP ||
    !resolution.activeEntry
  ) {
    return Object.freeze({
      characterId:
        safeCharacterId,

      action:
        GARDEN_SCHEDULE_BRIDGE_ACTION
          .WANDER,

      reason:
        "scheduleGap",

      currentSceneId:
        worldState.sceneId ??
        null,

      currentRuntimeActivity,

      scheduleState:
        resolution.state,

      resolution,

      activeEntry:
        null,

      semanticActivityId:
        null,

      runtimeActivityId:
        GARDEN_CHARACTER_ACTIVITY
          .WANDER,

      targetSceneId:
        null,

      targetSpotId:
        null,

      needsTravel:
        false,

      needsSpotMovement:
        false,
    });
  }


  /*
    =========================
    4. ACTIVE Schedule Entry
    =========================
  */
  const entry =
    resolution.activeEntry;


  const semanticActivityId =
    entry.activity
      ?.selectedActivityId ??
    null;


  const runtimeActivityId =
    resolveGardenScheduleRuntimeActivity(
      entry
    );


  const targetSceneId =
    entry.target
      ?.sceneId ??
    null;


  const targetSpotId =
    entry.target
      ?.spotId ??
    null;


  const currentSceneId =
    worldState.sceneId ??
    null;


  /*
    =========================
    5. 不在目標 Scene
    =========================
  */
  if (
    targetSceneId &&
    currentSceneId !==
      targetSceneId
  ) {
    return Object.freeze({
      characterId:
        safeCharacterId,

      action:
        GARDEN_SCHEDULE_BRIDGE_ACTION
          .TRAVEL,

      reason:
        "wrongScene",

      currentSceneId,

      currentRuntimeActivity,

      scheduleState:
        resolution.state,

      resolution,

      activeEntry:
        entry,

      semanticActivityId,

      runtimeActivityId:
        GARDEN_CHARACTER_ACTIVITY
          .TRAVEL,

      targetSceneId,

      targetSpotId,

      needsTravel:
        true,

      /*
        先完成跨場景，
        Spot movement 稍後再處理。
      */
      needsSpotMovement:
        false,
    });
  }


  /*
    =========================
    6. 已經在正確 Scene
    =========================
  */
  return Object.freeze({
    characterId:
      safeCharacterId,

    action:
      GARDEN_SCHEDULE_BRIDGE_ACTION
        .ACTIVITY,

    reason:
      "sceneReady",

    currentSceneId,

    currentRuntimeActivity,

    scheduleState:
      resolution.state,

    resolution,

    activeEntry:
      entry,

    semanticActivityId,

    runtimeActivityId,

    targetSceneId,

    targetSpotId,

    needsTravel:
      false,

    /*
      目前尚未建立 Spot Router。

      先把需求保留下來，
      不在這一步擅自走位。
    */
    needsSpotMovement:
      Boolean(
        targetSpotId
      ),
  });
}



function createGardenScheduleBridgeDecisionAtTimestamp(
  schedules,
  characterId,
  timestamp =
    getGardenWorldNow(),
  options = {}
) {
  const worldPoint =
    getGardenScheduleWorldPoint(
      timestamp
    );


  if (!worldPoint) {
    return null;
  }


  return (
    createGardenScheduleBridgeDecision(
      schedules,
      characterId,
      worldPoint,
      options
    )
  );
}


function inspectGardenScheduleBridgeDecision(
  decision
) {
  if (!decision) {
    console.warn(
      "[Garden Schedule Bridge] no decision"
    );

    return null;
  }


  const summary = {
    character:
      decision.characterId,

    action:
      decision.action,

    reason:
      decision.reason,

    scheduleState:
      decision.scheduleState,

    currentScene:
      decision.currentSceneId,

    targetScene:
      decision.targetSceneId,

    targetSpot:
      decision.targetSpotId,

    semanticActivity:
      decision.semanticActivityId,

    runtimeActivity:
      decision.runtimeActivityId,

    needsTravel:
      decision.needsTravel,

    needsSpotMovement:
      decision.needsSpotMovement,

    intent:
      decision.activeEntry
        ?.intentId ??
      null,
  };


  console.table([
    summary,
  ]);


  return summary;
}


function runGardenScheduleBridgeSelfTest() {
  const dateKey =
    "2026-09-23";


  /*
    12:00～13:00
    千冬應該到賞月橋吃飯。

    meal 尚未有正式 Runtime，
    所以現在 fallback → wander。
  */
  const mealDefinition =
    createGardenScheduleIntentDefinition({
      id:
        "bridge-test-meal",

      characterId:
        "chifuyu",

      intentId:
        "meal",

      windowStart:
        "12:00",

      windowEnd:
        "12:00",

      durationMinMinutes:
        60,

      durationMaxMinutes:
        60,

      sceneId:
        "moonBridge",

      activityId:
        "meal",

      fallbackActivityId:
        "wander",

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .HIGH,
    });


  const schedule =
    generateGardenDailySchedule(
      [
        mealDefinition,
      ],
      dateKey
    );


  /*
    11:30：
    尚未進入 Meal。
  */
  const beforePoint =
    createGardenScheduleWorldPoint(
      dateKey,
      11 * 60 + 30
    );


  /*
    12:15：
    Meal ACTIVE。
  */
  const activePoint =
    createGardenScheduleWorldPoint(
      dateKey,
      12 * 60 + 15
    );


  /*
    =========================
    A. GAP → WANDER
    =========================
  */
  const gapDecision =
    createGardenScheduleBridgeDecision(
      schedule,
      "chifuyu",
      beforePoint,
      {
        worldState: {
          sceneId:
            "courtyard",

          activity:
            GARDEN_CHARACTER_ACTIVITY
              .WANDER,

          activityData:
            null,

          travel:
            null,
        },
      }
    );


  /*
    =========================
    B. ACTIVE + Wrong Scene
       → TRAVEL
    =========================
  */
  const travelDecision =
    createGardenScheduleBridgeDecision(
      schedule,
      "chifuyu",
      activePoint,
      {
        worldState: {
          sceneId:
            "courtyard",

          activity:
            GARDEN_CHARACTER_ACTIVITY
              .WANDER,

          activityData:
            null,

          travel:
            null,
        },
      }
    );


  /*
    =========================
    C. ACTIVE + Correct Scene
       → ACTIVITY
    =========================
  */
  const activityDecision =
    createGardenScheduleBridgeDecision(
      schedule,
      "chifuyu",
      activePoint,
      {
        worldState: {
          sceneId:
            "moonBridge",

          activity:
            GARDEN_CHARACTER_ACTIVITY
              .WANDER,

          activityData:
            null,

          travel:
            null,
        },
      }
    );


  /*
    =========================
    D. Travel 中
       → PRESERVE
    =========================
  */
  const preserveTravelDecision =
    createGardenScheduleBridgeDecision(
      schedule,
      "chifuyu",
      activePoint,
      {
        worldState: {
          sceneId:
            "courtyard",

          activity:
            GARDEN_CHARACTER_ACTIVITY
              .TRAVEL,

          activityData:
            {},

          travel: {
            fromSceneId:
              "courtyard",

            toSceneId:
              "moonBridge",

            phase:
              "walkingToExit",
          },
        },
      }
    );


  /*
    =========================
    E. Chat 中
       → PRESERVE
    =========================
  */
  const preserveChatDecision =
    createGardenScheduleBridgeDecision(
      schedule,
      "chifuyu",
      activePoint,
      {
        worldState: {
          sceneId:
            "courtyard",

          activity:
            GARDEN_CHARACTER_ACTIVITY
              .CHAT,

          activityData:
            {},

          travel:
            null,
        },
      }
    );


  /*
    同一輸入再算一次。
  */
  const secondActivityDecision =
    createGardenScheduleBridgeDecision(
      schedule,
      "chifuyu",
      activePoint,
      {
        worldState: {
          sceneId:
            "moonBridge",

          activity:
            GARDEN_CHARACTER_ACTIVITY
              .WANDER,

          activityData:
            null,

          travel:
            null,
        },
      }
    );


  const checks = {
    scheduleExists:
      !!schedule,

    gapBecomesWander:
      gapDecision?.action ===
        GARDEN_SCHEDULE_BRIDGE_ACTION
          .WANDER,

    wrongSceneRequiresTravel:
      travelDecision?.action ===
        GARDEN_SCHEDULE_BRIDGE_ACTION
          .TRAVEL &&
      travelDecision
        ?.targetSceneId ===
        "moonBridge" &&
      travelDecision
        ?.needsTravel ===
        true,

    correctSceneAllowsActivity:
      activityDecision?.action ===
        GARDEN_SCHEDULE_BRIDGE_ACTION
          .ACTIVITY,

    semanticActivityPreserved:
      activityDecision
        ?.semanticActivityId ===
      "meal",

    unsupportedActivityFallsBack:
      activityDecision
        ?.runtimeActivityId ===
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,

    travelIsProtected:
      preserveTravelDecision
        ?.action ===
      GARDEN_SCHEDULE_BRIDGE_ACTION
        .PRESERVE_RUNTIME,

    chatIsProtected:
      preserveChatDecision
        ?.action ===
      GARDEN_SCHEDULE_BRIDGE_ACTION
        .PRESERVE_RUNTIME,

    deterministic:
      JSON.stringify(
        activityDecision
      ) ===
      JSON.stringify(
        secondActivityDecision
      ),
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    gapDecision,

    travelDecision,

    activityDecision,

    preserveTravelDecision,

    preserveChatDecision,
  };


  if (pass) {
    console.log(
      "[Garden Schedule Bridge Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Schedule Bridge Self-Test] FAIL",
      result
    );
  }


  return result;
}


/* =========================
   Garden Schedule Bridge Executor
========================= */

function createGardenScheduleBridgeExecutionResult(
  options = {}
) {
  return Object.freeze({
    ok:
      options.ok !== false,

    executed:
      options.executed === true,

    changed:
      options.changed === true,

    characterId:
      options.characterId ??
      null,

    action:
      options.action ??
      null,

    reason:
      options.reason ??
      null,

    runtimeActivityId:
      options.runtimeActivityId ??
      null,

    semanticActivityId:
      options.semanticActivityId ??
      null,

    targetSceneId:
      options.targetSceneId ??
      null,

    targetSpotId:
      options.targetSpotId ??
      null,
  });
}


function getGardenScheduleEntryStartTimestamp(
  entry
) {
  if (
    !entry?.dateKey ||
    !Number.isFinite(
      entry.start?.timelineMinute
    )
  ) {
    return null;
  }


  /*
    timelineMinute 可能跨過午夜。

    例如：
    25:00
    → 下一天 01:00
  */
  const start =
    splitGardenScheduleTimelineMinute(
      entry.start.timelineMinute
    );


  if (!start) {
    return null;
  }


  const startDateKey =
    shiftGardenScheduleDateKey(
      entry.dateKey,
      start.dayOffset
    );


  if (!startDateKey) {
    return null;
  }


  const hour =
    Math.floor(
      start.minuteOfDay / 60
    );


  const minute =
    start.minuteOfDay % 60;


  const hourText =
    String(hour).padStart(
      2,
      "0"
    );


  const minuteText =
    String(minute).padStart(
      2,
      "0"
    );


  /*
    Garden World canonical timezone：
    JST +09:00
  */
  const timestamp =
    Date.parse(
      `${startDateKey}T${hourText}:${minuteText}:00+09:00`
    );


  return (
    isValidGardenWorldTimestamp(
      timestamp
    )
      ? timestamp
      : null
  );
}


function getGardenScheduleEntryEndTimestamp(
  entry
) {
  if (
    !entry?.dateKey ||
    !Number.isFinite(
      entry.end?.timelineMinute
    )
  ) {
    return null;
  }


  /*
    timelineMinute 可能超過 1440，
    例如跨午夜的活動。

    所以不能直接拿 entry.end.time
    配原本 dateKey。
  */
  const end =
    splitGardenScheduleTimelineMinute(
      entry.end.timelineMinute
    );


  if (!end) {
    return null;
  }


  const endDateKey =
    shiftGardenScheduleDateKey(
      entry.dateKey,
      end.dayOffset
    );


  if (!endDateKey) {
    return null;
  }


  const hour =
    Math.floor(
      end.minuteOfDay / 60
    );

  const minute =
    end.minuteOfDay % 60;


  /*
    Garden World 固定使用 JST。
  */
 const hourText =
  String(hour).padStart(
    2,
    "0"
  );

const minuteText =
  String(minute).padStart(
    2,
    "0"
  );


const timestamp =
  Date.parse(
    `${endDateKey}T${hourText}:${minuteText}:00+09:00`
  );


  return (
    isValidGardenWorldTimestamp(
      timestamp
    )
      ? timestamp
      : null
  );
}


function createGardenScheduleGapWanderContinuity(
  decision,
  timestamp =
    getGardenWorldNow()
) {
  if (
    !decision ||
    decision.action !==
      GARDEN_SCHEDULE_BRIDGE_ACTION
        .WANDER ||
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return null;
  }


  const previousEntry =
    decision.resolution
      ?.previousEntry ??
    null;


  if (!previousEntry) {
    return null;
  }


  const sceneId =
    previousEntry.target
      ?.sceneId ??
    null;

  const spotId =
    previousEntry.target
      ?.spotId ??
    null;


  /*
    沒有固定 Activity Spot，
    就不需要這種 continuity。
  */
  if (
    !sceneId ||
    !spotId
  ) {
    return null;
  }


  const activityId =
    resolveGardenScheduleRuntimeActivity(
      previousEntry
    );


  /*
    WANDER 本身不是
    Activity Spot 行為。
  */
  if (
    !activityId ||
    activityId ===
      GARDEN_CHARACTER_ACTIVITY
        .WANDER
  ) {
    return null;
  }


  const startedAt =
    getGardenScheduleEntryEndTimestamp(
      previousEntry
    );


  if (
    !isValidGardenWorldTimestamp(
      startedAt
    )
  ) {
    return null;
  }


  /*
    使用上一個 Schedule Entry
    真正的 canonical end timestamp。

    絕不能用：
    - Date.now()
    - Resume 時間
    - 當前 frame 時間
  */
  const plan =
    createGardenWanderContinuityFromActivitySpot({
      characterId:
        decision.characterId,

      sceneId,

      spotId,

      activityId,

      startedAt,
    });


  if (!plan) {
    return null;
  }


  /*
    如果現在已經晚到
    continuity 都走完了，

    就直接使用 Standard Wander，
    不需要重新掛上一份舊 plan。
  */
  const state =
    resolveGardenTravelToWanderContinuity(
      plan,
      timestamp
    );


  if (
    !state ||
    state.completed
  ) {
    return null;
  }


  return plan;
}



function createGardenScheduleActivityData(
  decision
) {
  const entry =
    decision?.activeEntry;


  if (!entry) {
    return null;
  }


  return Object.freeze({
    source:
      "schedule",

    scheduleDateKey:
      decision.resolution
        ?.activeScheduleDateKey ??
      entry.dateKey ??
      null,

    definitionId:
      entry.definitionId,

    intentId:
      entry.intentId,

    instanceId:
      entry.instanceId,

    semanticActivityId:
      decision.semanticActivityId,

    runtimeActivityId:
      decision.runtimeActivityId,

    targetSceneId:
      decision.targetSceneId,

    targetSpotId:
      decision.targetSpotId,

    startTimelineMinute:
      entry.start
        ?.timelineMinute ??
      null,

    endTimelineMinute:
      entry.end
        ?.timelineMinute ??
      null,
  });
}


function isGardenScheduleActivityDataForEntry(
  activityData,
  entry
) {
  if (
    !activityData ||
    activityData.source !==
      "schedule" ||
    !entry
  ) {
    return false;
  }


  return (
    activityData.definitionId ===
      entry.definitionId &&
    activityData.instanceId ===
      entry.instanceId
  );
}


function executeGardenScheduleBridgeDecision(
  decision,
  options = {}
) {
  if (!decision) {
    return (
      createGardenScheduleBridgeExecutionResult({
        ok: false,
        reason:
          "missingDecision",
      })
    );
  }


  const characterId =
    decision.characterId;


  /*
    正式執行：
    使用真正 world state。

    Self-Test：
    可以注入假的 state。
  */
  const worldState =
    options.worldState ??
    gardenCharacterWorldState[
      characterId
    ];


  if (!worldState) {
    return (
      createGardenScheduleBridgeExecutionResult({
        ok: false,

        characterId,

        action:
          decision.action,

        reason:
          "missingWorldState",
      })
    );
  }


  /*
    可注入測試函式。

    正式狀態則使用真正 API。
  */
  const travelFn =
    options.travelFn ??
    travelGardenCharacter;


  const setActivityFn =
    options.setActivityFn ??
    setGardenCharacterActivity;


const spotApproachFn =
  options.spotApproachFn ??
  startGardenCharacterActivitySpotApproach;



  /*
    =========================
    Runtime Safety Recheck
    =========================

    Decision 建立後到 Executor 執行前，
    世界狀態有可能已經改變。

    所以 Executor 必須再檢查一次。
  */


const currentOwnership =
  getGardenCharacterActivityOwnership(
    characterId,
    worldState
  );


if (
  worldState.travel ||
  currentOwnership?.owner ===
    GARDEN_CHARACTER_ACTIVITY_OWNER
      .TRAVEL
) {
    return (
      createGardenScheduleBridgeExecutionResult({
        characterId,

        action:
          decision.action,

        reason:
          "travelAlreadyInProgress",

        runtimeActivityId:
          worldState.activity,

        semanticActivityId:
          decision.semanticActivityId,

        targetSceneId:
          decision.targetSceneId,

        targetSpotId:
          decision.targetSpotId,
      })
    );
  }


 if (
  currentOwnership?.owner ===
    GARDEN_CHARACTER_ACTIVITY_OWNER
      .CHAT
) {
    return (
      createGardenScheduleBridgeExecutionResult({
        characterId,

        action:
          decision.action,

        reason:
          "chatInProgress",

        runtimeActivityId:
          worldState.activity,

        semanticActivityId:
          decision.semanticActivityId,

        targetSceneId:
          decision.targetSceneId,

        targetSpotId:
          decision.targetSpotId,
      })
    );
  }


  /*
    =========================
    PRESERVE_RUNTIME
    =========================
  */
  if (
    decision.action ===
      GARDEN_SCHEDULE_BRIDGE_ACTION
        .PRESERVE_RUNTIME
  ) {
    return (
      createGardenScheduleBridgeExecutionResult({
        characterId,

        action:
          decision.action,

        reason:
          decision.reason ??
          "preserveRuntime",

        runtimeActivityId:
          worldState.activity,

        semanticActivityId:
          decision.semanticActivityId,

        targetSceneId:
          decision.targetSceneId,

        targetSpotId:
          decision.targetSpotId,
      })
    );
  }


  /*
  =========================
  GAP → WANDER
  =========================
*/
if (
  decision.action ===
    GARDEN_SCHEDULE_BRIDGE_ACTION
      .WANDER
) {
  /*
    Reconciliation 時優先使用
    context.resumedAt 傳進來的
    canonical world timestamp。

    一般 Runtime 呼叫才 fallback
    到目前 Garden World Time。
  */
  const gapTimestamp =
    isValidGardenWorldTimestamp(
      options.worldTimestamp
    )
      ? options.worldTimestamp
      : getGardenWorldNow();


  /*
    如果上一個 Schedule Activity
    是固定 Spot Activity，

    在真正切回 Standard Wander 前，
    先嘗試重建：

    Activity Spot
    → Wander Continuity
  */
  const continuityPlan =
    createGardenScheduleGapWanderContinuity(
      decision,
      gapTimestamp
    );


  const alreadyWandering =
    worldState.activity ===
      GARDEN_CHARACTER_ACTIVITY
        .WANDER &&
    worldState.activityData ===
      null;


  /*
    Cold Start 特別重要：

    Snapshot fallback 可能已經先把
    Activity 恢復成 WANDER。

    即使語意狀態不用再切一次，
    仍然必須補回 canonical continuity。
  */
  if (alreadyWandering) {
    if (continuityPlan) {
      worldState.wanderContinuity =
        continuityPlan;
    }


    return (
      createGardenScheduleBridgeExecutionResult({
        characterId,

        action:
          decision.action,

        reason:
          "alreadyWandering",

        runtimeActivityId:
          GARDEN_CHARACTER_ACTIVITY
            .WANDER,
      })
    );
  }


  const changed =
    setActivityFn(
      characterId,
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,
      null
    );


  /*
    只有 Activity transition
    真正成功後才掛 Continuity。

    setGardenCharacterActivity(WANDER)
    本身不會清除 wanderContinuity。
  */
  if (
    changed !== false &&
    continuityPlan
  ) {
    worldState.wanderContinuity =
      continuityPlan;
  }


  return (
    createGardenScheduleBridgeExecutionResult({
      ok:
        changed !== false,

      executed:
        changed !== false,

      changed:
        changed !== false,

      characterId,

      action:
        decision.action,

      /*
        保留原本 reason，
        避免既有 Schedule Self-Test
        因為字串改名而失敗。
      */
      reason:
        changed !== false
          ? "wanderApplied"
          : "wanderApplyFailed",

      runtimeActivityId:
        GARDEN_CHARACTER_ACTIVITY
          .WANDER,
    })
  );
}


  /*
    =========================
    TRAVEL
    =========================
  */
  if (
    decision.action ===
      GARDEN_SCHEDULE_BRIDGE_ACTION
        .TRAVEL
  ) {
    const targetSceneId =
      decision.targetSceneId;


    if (!targetSceneId) {
      return (
        createGardenScheduleBridgeExecutionResult({
          ok: false,

          characterId,

          action:
            decision.action,

          reason:
            "missingTargetScene",
        })
      );
    }


    /*
      Decision 可能已經過時：
      角色其實已經到目的地。
    */
    if (
      worldState.sceneId ===
        targetSceneId
    ) {
      return (
        createGardenScheduleBridgeExecutionResult({
          characterId,

          action:
            decision.action,

          reason:
            "sceneAlreadyReady",

          semanticActivityId:
            decision.semanticActivityId,

          targetSceneId,
        })
      );
    }



const scheduleStartedAt =
  getGardenScheduleEntryStartTimestamp(
    decision.activeEntry
  );



    /*
      注意：

      不在這裡手動：
      setActivity(TRAVEL)

      因為 travelGardenCharacter()
      本身會建立完整 Travel world state。
    */
 const started =
  travelFn(
    characterId,
    targetSceneId,
    {
      semanticActivityId:
        decision
          .semanticActivityId ??
        null,

      startedAt:
        scheduleStartedAt,
    }
  );


    return (
      createGardenScheduleBridgeExecutionResult({
        ok:
          started !== false,

        executed:
          started !== false,

        changed:
          started !== false,

        characterId,

        action:
          decision.action,

        reason:
          started !== false
            ? "travelStarted"
            : "travelStartFailed",

        runtimeActivityId:
          GARDEN_CHARACTER_ACTIVITY
            .TRAVEL,

        semanticActivityId:
          decision.semanticActivityId,

        targetSceneId,

        targetSpotId:
          decision.targetSpotId,
      })
    );
  }


  /*
    =========================
    ACTIVITY
    =========================
  */
  if (
    decision.action ===
      GARDEN_SCHEDULE_BRIDGE_ACTION
        .ACTIVITY
  ) {
    /*
      Executor 再確認一次 Scene。

      避免 stale Decision
      在錯誤場景啟動 Activity。
    */
    if (
      decision.targetSceneId &&
      worldState.sceneId !==
        decision.targetSceneId
    ) {
      return (
        createGardenScheduleBridgeExecutionResult({
          ok: false,

          characterId,

          action:
            decision.action,

          reason:
            "staleWrongScene",

          semanticActivityId:
            decision.semanticActivityId,

          targetSceneId:
            decision.targetSceneId,

          targetSpotId:
            decision.targetSpotId,
        })
      );
    }

const runtimeActivityId =
  decision.runtimeActivityId ??
  GARDEN_CHARACTER_ACTIVITY
    .WANDER;


const activityData =
  createGardenScheduleActivityData(
    decision
  );




    
    /*
      Spot Router 還沒建立。

      如果某個 Activity 指定了 spot，
      現在不能假裝角色已經站到那裡。
    */
    if (
  decision.needsSpotMovement
) {
  const targetSceneId =
    decision.targetSceneId ??
    worldState.sceneId;

  const targetSpotId =
    decision.targetSpotId;


  if (
    !targetSceneId ||
    !targetSpotId
  ) {
    return (
      createGardenScheduleBridgeExecutionResult({
        ok:
          false,

        characterId,

        action:
          decision.action,

        reason:
          "missingActivitySpotTarget",

        runtimeActivityId,

        semanticActivityId:
          decision.semanticActivityId,

        targetSceneId,

        targetSpotId,
      })
    );
  }


  const currentApproach =
    worldState.activitySpotApproach;


  const sameApproach =
    !!currentApproach &&
    currentApproach.sceneId ===
      targetSceneId &&
    currentApproach.spotId ===
      targetSpotId &&
    currentApproach.activityId ===
      runtimeActivityId;


  if (sameApproach) {
    return (
      createGardenScheduleBridgeExecutionResult({
        characterId,

        action:
          decision.action,

        reason:
          "spotApproachAlreadyInProgress",

        runtimeActivityId:
          worldState.activity,

        semanticActivityId:
          decision.semanticActivityId,

        targetSceneId,

        targetSpotId,
      })
    );
  }


  const sameEntryAlreadyApplied =
    worldState.activity ===
      runtimeActivityId &&
    isGardenScheduleActivityDataForEntry(
      worldState.activityData,
      decision.activeEntry
    );


  if (
    sameEntryAlreadyApplied &&
    !currentApproach
  ) {
    return (
      createGardenScheduleBridgeExecutionResult({
        characterId,

        action:
          decision.action,

        reason:
          "activityAlreadyApplied",

        runtimeActivityId,

        semanticActivityId:
          decision.semanticActivityId,

        targetSceneId,

        targetSpotId,
      })
    );
  }


  const startedAt =
    isValidGardenWorldTimestamp(
      options.worldTimestamp
    )
      ? options.worldTimestamp
      : getGardenWorldNow();


  const plan =
    spotApproachFn(
      characterId,
      {
        sceneId:
          targetSceneId,

        spotId:
          targetSpotId,

        activityId:
          runtimeActivityId,

        activityData,

        startedAt,
      }
    );


  return (
    createGardenScheduleBridgeExecutionResult({
      ok:
        !!plan,

      executed:
        !!plan,

      changed:
        !!plan,

      characterId,

      action:
        decision.action,

      reason:
        plan
          ? "spotApproachStarted"
          : "spotApproachStartFailed",

      runtimeActivityId:
        plan
          ? runtimeActivityId
          : worldState.activity,

      semanticActivityId:
        decision.semanticActivityId,

      targetSceneId,

      targetSpotId,
    })
  );
}



    /*
      已經執行同一 Entry，
      不需要重複套用。
    */
    if (
      worldState.activity ===
        runtimeActivityId &&
      isGardenScheduleActivityDataForEntry(
        worldState.activityData,
        decision.activeEntry
      )
    ) {
      return (
        createGardenScheduleBridgeExecutionResult({
          characterId,

          action:
            decision.action,

          reason:
            "activityAlreadyApplied",

          runtimeActivityId,

          semanticActivityId:
            decision.semanticActivityId,

          targetSceneId:
            decision.targetSceneId,

          targetSpotId:
            decision.targetSpotId,
        })
      );
    }


    const changed =
      setActivityFn(
        characterId,
        runtimeActivityId,
        activityData
      );


    return (
      createGardenScheduleBridgeExecutionResult({
        ok:
          changed !== false,

        executed:
          changed !== false,

        changed:
          changed !== false,

        characterId,

        action:
          decision.action,

        reason:
          changed !== false
            ? "activityApplied"
            : "activityApplyFailed",

        runtimeActivityId,

        semanticActivityId:
          decision.semanticActivityId,

        targetSceneId:
          decision.targetSceneId,

        targetSpotId:
          decision.targetSpotId,
      })
    );
  }


  return (
    createGardenScheduleBridgeExecutionResult({
      ok: false,

      characterId,

      action:
        decision.action,

      reason:
        "unknownBridgeAction",
    })
  );
}


function executeGardenCharacterScheduleAtWorldPoint(
  schedules,
  characterId,
  worldPoint,
  options = {}
) {
  const decision =
    createGardenScheduleBridgeDecision(
      schedules,
      characterId,
      worldPoint,
      options
    );


  if (!decision) {
    return null;
  }


  const execution =
    executeGardenScheduleBridgeDecision(
      decision,
      options
    );


  return Object.freeze({
    decision,
    execution,
  });
}


function runGardenScheduleSpotApproachExecutorSelfTest() {
  const worldTimestamp =
    Date.parse(
      "2026-09-23T12:15:00+09:00"
    );


  const fakeEntry = {
    definitionId:
      "spot-executor-test-rest",

    instanceId:
      "spot-executor-test-rest:2026-09-23",

    intentId:
      "afternoonRest",

    characterId:
      "chifuyu",

    dateKey:
      "2026-09-23",

    start: {
      timelineMinute:
        720,
    },

    end: {
      timelineMinute:
        780,
    },
  };


  const decision = {
    characterId:
      "chifuyu",

    action:
      GARDEN_SCHEDULE_BRIDGE_ACTION
        .ACTIVITY,

    reason:
      "sceneReady",

    activeEntry:
      fakeEntry,

    resolution: {
      activeScheduleDateKey:
        "2026-09-23",
    },

    semanticActivityId:
      "rest",

    runtimeActivityId:
      GARDEN_CHARACTER_ACTIVITY
        .REST,

    targetSceneId:
      "courtyard",

    targetSpotId:
      "courtyard-rest-01",

    needsTravel:
      false,

    needsSpotMovement:
      true,
  };


  const fakeWorldState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,

    activityData:
      null,

    wanderContinuity:
      null,

    activitySpotApproach:
      null,

    travel:
      null,
  };


  let approachCallCount =
    0;

  let receivedStartedAt =
    null;


  const fakeSpotApproachFn =
    (
      characterId,
      options
    ) => {
      approachCallCount +=
        1;


      receivedStartedAt =
        options.startedAt;


      const fakePlan = {
        characterId,

        sceneId:
          options.sceneId,

        spotId:
          options.spotId,

        activityId:
          options.activityId,

        startedAt:
          options.startedAt,
      };


      fakeWorldState.activity =
        options.activityId;

      fakeWorldState.activityData =
        options.activityData;

      fakeWorldState.activitySpotApproach =
        fakePlan;


      return fakePlan;
    };


  /*
    第一次：
    應正式開始 Spot Approach。
  */
  const first =
    executeGardenScheduleBridgeDecision(
      decision,
      {
        worldState:
          fakeWorldState,

        spotApproachFn:
          fakeSpotApproachFn,

        worldTimestamp,
      }
    );


  /*
    第二次：
    同一 Approach 還存在，
    不可以重新開始。
  */
  const second =
    executeGardenScheduleBridgeDecision(
      decision,
      {
        worldState:
          fakeWorldState,

        spotApproachFn:
          fakeSpotApproachFn,

        worldTimestamp,
      }
    );


  const checks = {
    firstStartsApproach:
      first?.reason ===
        "spotApproachStarted",

    firstExecuted:
      first?.executed ===
        true,

    approachCalledOnce:
      approachCallCount ===
        1,

    activityChangedToRest:
      fakeWorldState.activity ===
        GARDEN_CHARACTER_ACTIVITY
          .REST,

    scheduleDataPreserved:
      fakeWorldState
        .activityData
        ?.source ===
      "schedule",

    correctDefinition:
      fakeWorldState
        .activityData
        ?.definitionId ===
      "spot-executor-test-rest",

    correctSpot:
      fakeWorldState
        .activitySpotApproach
        ?.spotId ===
      "courtyard-rest-01",

    worldTimestampPreserved:
      receivedStartedAt ===
        worldTimestamp,

    secondDoesNotRestart:
      second?.reason ===
        "spotApproachAlreadyInProgress",

    stillOnlyOneCall:
      approachCallCount ===
        1,
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,
    checks,
    first,
    second,
    approachCallCount,
    fakeWorldState,
  };


  if (pass) {
    console.log(
      "[Garden Schedule Spot Approach Executor Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Schedule Spot Approach Executor Self-Test] FAIL",
      result
    );
  }


  return result;
}






function runGardenScheduleBridgeExecutorSelfTest() {
  const dateKey =
    "2026-09-23";


  const definition =
    createGardenScheduleIntentDefinition({
      id:
        "executor-test-meal",

      characterId:
        "chifuyu",

      intentId:
        "meal",

      windowStart:
        "12:00",

      windowEnd:
        "12:00",

      durationMinMinutes:
        60,

      durationMaxMinutes:
        60,

      sceneId:
        "moonBridge",

      activityId:
        "meal",

      fallbackActivityId:
        "wander",

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .HIGH,
    });


  const schedule =
    generateGardenDailySchedule(
      [
        definition,
      ],
      dateKey
    );


  const activePoint =
    createGardenScheduleWorldPoint(
      dateKey,
      12 * 60 + 15
    );


  const gapPoint =
    createGardenScheduleWorldPoint(
      dateKey,
      14 * 60
    );


  /*
    =========================
    Fake Runtime
    =========================
  */
  const fakeState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,

    activityData:
      null,

    travel:
      null,
  };


  let travelCallCount =
    0;

let capturedTravelOptions =
  null;


  let activityCallCount =
    0;


  const fakeTravelFn =
  (
    characterId,
    targetSceneId,
    travelOptions = null
  ) => {
    travelCallCount += 1;

    capturedTravelOptions =
      travelOptions;


      fakeState.travel = {
        fromSceneId:
          fakeState.sceneId,

        toSceneId:
          targetSceneId,

        phase:
          "walkingToExit",
      };


      fakeState.activity =
        GARDEN_CHARACTER_ACTIVITY
          .TRAVEL;


      return true;
    };


  const fakeSetActivityFn =
    (
      characterId,
      activity,
      activityData = null
    ) => {
      activityCallCount += 1;


      fakeState.activity =
        activity;


      fakeState.activityData =
        activityData;


      return true;
    };


  /*
    =========================
    1. Wrong Scene → Travel
    =========================
  */
  const travelStep =
    executeGardenCharacterScheduleAtWorldPoint(
      schedule,
      "chifuyu",
      activePoint,
      {
        worldState:
          fakeState,

        travelFn:
          fakeTravelFn,

        setActivityFn:
          fakeSetActivityFn,
      }
    );


  /*
    =========================
    2. 再執行一次
       Travel 不得重複開始
    =========================
  */
  const preserveStep =
    executeGardenCharacterScheduleAtWorldPoint(
      schedule,
      "chifuyu",
      activePoint,
      {
        worldState:
          fakeState,

        travelFn:
          fakeTravelFn,

        setActivityFn:
          fakeSetActivityFn,
      }
    );


  /*
    模擬旅行完成。
  */
  fakeState.travel =
    null;

  fakeState.sceneId =
    "moonBridge";

  fakeState.activity =
    GARDEN_CHARACTER_ACTIVITY
      .WANDER;

  fakeState.activityData =
    null;


  /*
    =========================
    3. Correct Scene → Activity
    =========================
  */
  const activityStep =
    executeGardenCharacterScheduleAtWorldPoint(
      schedule,
      "chifuyu",
      activePoint,
      {
        worldState:
          fakeState,

        travelFn:
          fakeTravelFn,

        setActivityFn:
          fakeSetActivityFn,
      }
    );


  /*
    =========================
    4. 同一 Schedule Entry
       不得重複 Apply
    =========================
  */
  const duplicateActivityStep =
    executeGardenCharacterScheduleAtWorldPoint(
      schedule,
      "chifuyu",
      activePoint,
      {
        worldState:
          fakeState,

        travelFn:
          fakeTravelFn,

        setActivityFn:
          fakeSetActivityFn,
      }
    );


  /*
    =========================
    5. Schedule 結束 → Wander
    =========================
  */
  const gapStep =
    executeGardenCharacterScheduleAtWorldPoint(
      schedule,
      "chifuyu",
      gapPoint,
      {
        worldState:
          fakeState,

        travelFn:
          fakeTravelFn,

        setActivityFn:
          fakeSetActivityFn,
      }
    );


  const checks = {
    scheduleExists:
      !!schedule,

    travelStarted:
      travelStep
        ?.execution
        ?.reason ===
      "travelStarted",

    travelCalledOnce:
      travelCallCount ===
      1,

      scheduleStartPassedToTravel:
  capturedTravelOptions
    ?.startedAt ===
  getGardenScheduleEntryStartTimestamp(
    travelStep
      ?.decision
      ?.activeEntry
  ),

travelSemanticPassedToTravel:
  capturedTravelOptions
    ?.semanticActivityId ===
    "meal",

    secondCallPreservesTravel:
      preserveStep
        ?.execution
        ?.reason ===
      "travelAlreadyInProgress",

    activityApplied:
      activityStep
        ?.execution
        ?.reason ===
      "activityApplied",

    semanticMealPreserved:
      fakeState.activityData ===
        null ||
      activityStep
        ?.decision
        ?.semanticActivityId ===
        "meal",

    mealFallsBackToWander:
      activityStep
        ?.decision
        ?.runtimeActivityId ===
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,

    duplicateNotReapplied:
      duplicateActivityStep
        ?.execution
        ?.reason ===
      "activityAlreadyApplied",

    activityAppliedOnlyOnce:
      activityCallCount ===
      2,

    gapReturnsToWander:
      gapStep
        ?.execution
        ?.reason ===
      "wanderApplied",

    finalStateWander:
      fakeState.activity ===
        GARDEN_CHARACTER_ACTIVITY
          .WANDER &&
      fakeState.activityData ===
        null,
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    travelCallCount,

    activityCallCount,

    travelStep,

    preserveStep,

    activityStep,

    duplicateActivityStep,

    gapStep,

    finalFakeState:
      fakeState,
  };


  if (pass) {
    console.log(
      "[Garden Schedule Bridge Executor Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Schedule Bridge Executor Self-Test] FAIL",
      result
    );
  }


  return result;
}





/* =========================
   Garden Travel Reconciliation
========================= */

/*
  Garden Resume 時，
  將 Travel 的 Runtime 狀態
  對齊到目前 World Clock。

  第一版主要處理：

  transit
  ↓
  還沒到時間 → 繼續 transit
  已經到時間 → 直接進目的地入口
*/
function reconcileGardenLegacyCharacterTravel(
  character,
  context
) {
  const worldState =
    gardenCharacterWorldState[
      character
    ];


  const travel =
    worldState?.travel;


  if (
    !worldState ||
    !travel
  ) {
    return {
      character,
      action: "none",
      reason: "notTraveling",
    };
  }


  /*
    walkingToExit：

    目前還沒有足夠資料推算
    「離線期間走了多遠」。

    這一版先保持原狀，
    回 Garden 後繼續走。

    之後 Activity / Movement Timeline
    再處理這類空間移動。
  */
  if (
    travel.phase ===
      "walkingToExit"
  ) {
    return {
      character,
      action: "continue",
      phase:
        travel.phase,

      reason:
        "walkingToExitNotTimeReconciledYet",
    };
  }


  /*
    已經進目的地入口。

    世界狀態本身已經屬於目的 Scene，
    這版先讓入口 walk 照常接續。
  */
  if (
    travel.phase ===
      "walkingFromEntrance"
  ) {
    return {
      character,
      action: "continue",
      phase:
        travel.phase,

      reason:
        "alreadyAtDestination",
    };
  }


  /*
    目前真正需要用
    World Clock 修正的是 transit。
  */
  if (
    travel.phase !==
      "transit"
  ) {
    return {
      character,
      action: "none",
      phase:
        travel.phase,

      reason:
        "unsupportedTravelPhase",
    };
  }


  /*
    expectedArrivalAt
    是 11B-1 建立的絕對時間。

    如果資料不完整，
    不亂猜角色位置。
  */
  if (
    !isValidGardenWorldTimestamp(
      travel.expectedArrivalAt
    )
  ) {
    return {
      character,
      action: "continue",
      phase:
        travel.phase,

      reason:
        "missingExpectedArrivalAt",
    };
  }


  const resumedAt =
    context.resumedAt;


  /*
    =========================
    還沒到抵達時間
    =========================
  */
  if (
    resumedAt <
    travel.expectedArrivalAt
  ) {
    const remainingMs =
      Math.max(
        0,
        travel.expectedArrivalAt -
          resumedAt
      );


    /*
      Runtime Clock 重新對齊。

      這很重要：

      World Clock 已經知道
      還剩多少時間，

      performance.now()
      則重新從「現在」開始
      等剩餘的那一小段。
    */
    travel.transitUntil =
      performance.now() +
      remainingMs;


    return {
      character,

      action:
        "continueTransit",

      phase:
        travel.phase,

      remainingMs,

      expectedArrivalAt:
        travel.expectedArrivalAt,
    };
  }


  /*
    =========================
    已經超過抵達時間
    =========================

    不再讓角色重新等待 transit。

    直接進目的地入口。
  */
  const entered =
    startGardenCharacterTravelEntrance(
      character
    );


  return {
    character,

    action:
      entered
        ? "enterDestination"
        : "enterDestinationFailed",

    phase:
      worldState.travel?.phase ||
      null,

    destinationSceneId:
      travel.toSceneId,

    expectedArrivalAt:
      travel.expectedArrivalAt,

    resumedAt,

    overdueMs:
      Math.max(
        0,
        resumedAt -
          travel.expectedArrivalAt
      ),
  };
}


/* =========================
   12H-4D
   Canonical Travel Reconciliation
========================= */

function reconcileGardenCanonicalCharacterTravel(
  character,
  context
) {
  const worldState =
    gardenCharacterWorldState[
      character
    ];


  const travel =
    worldState?.travel;


  if (
    !worldState ||
    !travel
  ) {
    return {
      character,

      action:
        "none",

      reason:
        "notTraveling",
    };
  }


  const resumedAt =
    context?.resumedAt;


  if (
    !isValidGardenWorldTimestamp(
      resumedAt
    )
  ) {
    return {
      character,

      action:
        "canonicalReconcileFailed",

      reason:
        "invalidResumeTimestamp",
    };
  }


  const plan =
    travel.spatialPlan;


  if (
    !isGardenCanonicalTravelSpatialPlanUsable(
      plan
    )
  ) {
    return {
      character,

      action:
        "canonicalReconcileFailed",

      reason:
        "invalidSpatialPlan",
    };
  }


  const canonicalState =
    resolveGardenCanonicalTravelSpatialState(
      plan,
      resumedAt
    );


  if (!canonicalState) {
    return {
      character,

      action:
        "canonicalReconcileFailed",

      reason:
        "canonicalResolveFailed",
    };
  }


  const runtime =
    getGardenCharacterRuntime(
      character
    );


  const state =
    runtime?.moveState;


  if (
    !runtime ||
    !state
  ) {
    return {
      character,

      action:
        "canonicalReconcileFailed",

      reason:
        "runtimeUnavailable",
    };
  }


  /*
    =========================
    Local Runtime Cleanup
    =========================

    Resume / Reload 之後，
    Canonical Travel 不需要
    恢復上一頁的 path queue。
  */
  runtime.setPath?.([]);


  state.path =
    [];

  state.isMoving =
    false;


  if (
    runtime.autoState
  ) {
    runtime.autoState.wasMoving =
      false;
  }


  /*
    =========================
    Travel Completed
    =========================
  */
  if (
  canonicalState.phase ===
    "completed"
) {
  const completion =
    finalizeGardenCanonicalTravelToWander(
      character,
      travel
    );


  if (!completion.ok) {
    return {
      character,

      action:
        "canonicalReconcileFailed",

      reason:
        "travelCompletionFailed",

      resumedAt,

      completedAt:
        plan.completedAt,
    };
  }


  return {
    character,

    action:
      "canonicalCompleted",

    phase:
      "completed",

    sceneId:
      worldState.sceneId,

    resumedAt,

    completedAt:
      plan.completedAt,

    overdueMs:
      Math.max(
        0,

        resumedAt -
        plan.completedAt
      ),

    continuityCreated:
      completion.continuityCreated,

    continuityEndsAt:
      completion.continuityEndsAt,
  };
}






  /*
    =========================
    Active Canonical Travel
    =========================
  */

  travel.phase =
    canonicalState.phase;


  /*
    舊欄位暫時保留，
    但全部改由 Spatial Plan
    校正。
  */
  travel.startedAt =
    plan.startedAt;


  travel.transitStartedAt =
    plan.transit.startedAt;


  travel.expectedArrivalAt =
    plan.transit.endsAt;


  travel.transitUntil =
    0;


  if (
    canonicalState.phase ===
      "walkingToExit"
  ) {
    travel.phaseStartedAt =
      plan.exit.startedAt;

    travel.arrivedAt =
      null;
  }


  if (
    canonicalState.phase ===
      "transit"
  ) {
    travel.phaseStartedAt =
      plan.transit.startedAt;

    travel.arrivedAt =
      null;
  }


  if (
    canonicalState.phase ===
      "walkingFromEntrance"
  ) {
    travel.phaseStartedAt =
      plan.entrance.startedAt;

    travel.arrivedAt =
      plan.entrance.startedAt;
  }


  /*
    Canonical Timeline
    直接決定 World Scene。
  */
  worldState.sceneId =
    canonicalState.sceneId;


  /*
    Transit 沒有可觀看座標。

    此時保留 moveState
    上一個 numeric x/y，
    只靠 sceneId = null
    隱藏角色。
  */
  if (
    Number.isFinite(
      canonicalState.x
    ) &&
    Number.isFinite(
      canonicalState.y
    )
  ) {
    state.x =
      canonicalState.x;

    state.y =
      canonicalState.y;
  }


  if (
    canonicalState.direction ===
      1 ||
    canonicalState.direction ===
      -1
  ) {
    state.direction =
      canonicalState.direction;
  }


  state.isMoving =
    canonicalState.isMoving ===
      true;


  return {
    character,

    action:
      "canonicalReconciled",

    phase:
      canonicalState.phase,

    sceneId:
      canonicalState.sceneId,

    phaseProgress:
      canonicalState.phaseProgress,

    resumedAt,

    x:
      canonicalState.x,

    y:
      canonicalState.y,
  };
}



function inspectGardenWanderContinuity(
  characterId =
    "chifuyu"
) {
  const worldState =
    gardenCharacterWorldState[
      characterId
    ];


  const plan =
    worldState?.wanderContinuity ??
    null;


  const timestamp =
    getGardenWorldNow();


  const state =
    plan &&
    isGardenWanderContinuityPlanUsable(
      plan,
      characterId,
      worldState?.sceneId
    )
      ? resolveGardenTravelToWanderContinuity(
          plan,
          timestamp
        )
      : null;


  const result = {
    character:
      characterId,

    activity:
      worldState?.activity ??
      null,

    sceneId:
      worldState?.sceneId ??
      null,

    hasContinuity:
      !!plan,

    valid:
      !!plan &&
      isGardenWanderContinuityPlanUsable(
        plan,
        characterId,
        worldState?.sceneId
      ),

    phase:
      state?.phase ??
      null,

    completed:
      state?.completed ??
      null,

    startedAt:
      plan?.startedAt ??
      null,

    moveStartedAt:
      plan?.moveStartedAt ??
      null,

    endsAt:
      plan?.endsAt ??
      null,

    x:
      state?.x ??
      null,

    y:
      state?.y ??
      null,

    isMoving:
      state?.isMoving ??
      null,

    plan,

    state,
  };


  console.table([
    {
      character:
        result.character,

      activity:
        result.activity,

      sceneId:
        result.sceneId,

      hasContinuity:
        result.hasContinuity,

      valid:
        result.valid,

      phase:
        result.phase,

      completed:
        result.completed,

      isMoving:
        result.isMoving,
    },
  ]);


  return result;
}



/*
  正式 Travel Reconciliation Entry。

  新 Canonical Travel：
  → Spatial Plan

  舊 Travel：
  → Legacy fallback
*/
function reconcileGardenCharacterTravel(
  character,
  context
) {
  const worldState =
    gardenCharacterWorldState[
      character
    ];


  const travel =
    worldState?.travel;


  if (
    !worldState ||
    !travel
  ) {
    return {
      character,

      action:
        "none",

      reason:
        "notTraveling",
    };
  }


  if (
    canGardenCharacterUseCanonicalTravelRuntime(
      character
    )
  ) {
    return reconcileGardenCanonicalCharacterTravel(
      character,
      context
    );
  }


  /*
    舊 Snapshot / Legacy Travel
    沒有 spatialPlan 時仍可使用。
  */
  return reconcileGardenLegacyCharacterTravel(
    character,
    context
  );
}



/*
  一次處理 Garden 所有角色。

  未來角色增加時，
  不需要為每一個角色
  各註冊一次 Handler。
*/
function reconcileGardenTravelSystem(
  context
) {
  const results =
    [];


  for (
    const character of
    Object.keys(
      gardenCharacterWorldState
    )
  ) {
    results.push(
      reconcileGardenCharacterTravel(
        character,
        context
      )
    );
  }


  return results;
}

/*
  Travel 應該比一般 Activity /
  Schedule 更早完成空間狀態推算。

  所以先給較高 priority。
*/
registerGardenWorldReconciliationHandler(
  "travel",
  reconcileGardenTravelSystem,
  {
    priority: 200,
  }
);

/* =========================
   Garden Schedule Reconciliation
========================= */

/*
  正式 Schedule Provider。

  現在預設為 null，
  所以不會改變目前網站行為。

  12G 建立正式 Routine 後，
  才會正式接上。
*/
let gardenWorldScheduleProvider =
  null;


function setGardenWorldScheduleProvider(
  provider = null
) {
  if (
    provider !== null &&
    typeof provider !==
      "function"
  ) {
    console.warn(
      "[Garden Schedule] invalid provider:",
      provider
    );

    return false;
  }


  gardenWorldScheduleProvider =
    provider;


  return true;
}


function clearGardenWorldScheduleProvider() {
  gardenWorldScheduleProvider =
    null;


  return true;
}


function isGardenWorldScheduleProviderActive() {
  return (
    typeof gardenWorldScheduleProvider ===
    "function"
  );
}


/* =========================
   Garden Official Routine
========================= */

const GARDEN_OFFICIAL_ROUTINE_VERSION =
  1;



/* =========================
   Moon Bridge Night Chat Timeline
========================= */

/*
  23:00 ～ 01:00 的散步時段內，
  暫定每天產生 3 個聊天機會點。

  每個時間點都由 dateKey 決定，
  所以：
  - Reload 不會改
  - 不同裝置不會改
  - 不使用 Math.random()
*/
const GARDEN_MOON_BRIDGE_NIGHT_CHAT_WINDOWS =
  Object.freeze([
    Object.freeze({
      id: "early",
      startTimelineMinute:
        23 * 60 + 12,
      endTimelineMinute:
        23 * 60 + 28,
    }),

    Object.freeze({
      id: "middle",
      startTimelineMinute:
        23 * 60 + 42,
      endTimelineMinute:
        24 * 60 + 5,
    }),

    Object.freeze({
      id: "late",
      startTimelineMinute:
        24 * 60 + 20,
      endTimelineMinute:
        24 * 60 + 40,
    }),
  ]);


function getGardenMoonBridgeNightChatTimeline(
  dateKey
) {
  if (
    typeof dateKey !==
      "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateKey
    )
  ) {
    return Object.freeze([]);
  }


  const events =
    GARDEN_MOON_BRIDGE_NIGHT_CHAT_WINDOWS
      .map(
        (window, index) => {
          const timelineMinute =
            getGardenWorldDeterministicInt(
              window
                .startTimelineMinute,

              window
                .endTimelineMinute,

              "officialRoutine",

              GARDEN_OFFICIAL_ROUTINE_VERSION,

              "moonBridgeNightChat",

              dateKey,

              window.id,

              "start"
            );


          const point =
            splitGardenScheduleTimelineMinute(
              timelineMinute
            );


          if (!point) {
            return null;
          }


          return Object.freeze({
            id:
              `moonBridgeNightChat-${window.id}`,

            index,

            dateKey,

            timelineMinute:
              point.timelineMinute,

            dayOffset:
              point.dayOffset,

            minuteOfDay:
              point.minuteOfDay,

            time:
              point.time,
          });
        }
      )
      .filter(Boolean);


  return Object.freeze(
    events
  );
}


function getGardenMoonBridgeNightChatEventStartedAt(
  event
) {
  if (
    !event ||
    typeof event.dateKey !==
      "string" ||
    !Number.isFinite(
      event.timelineMinute
    )
  ) {
    return null;
  }


  return (
    getGardenTimelineTimestamp(
      event.dateKey,
      event.timelineMinute,
      0
    )
  );
}


function getGardenMoonBridgeNightChatApproachStartSample(
  characterId,
  event
) {
  if (
    characterId !== "chifuyu" &&
    characterId !== "chinatsu"
  ) {
    return null;
  }


  const startedAt =
    getGardenMoonBridgeNightChatEventStartedAt(
      event
    );


  if (
    !isValidGardenWorldTimestamp(
      startedAt
    )
  ) {
    return null;
  }


  /*
    Night Chat 發生在
    Moon Bridge Night Walk 中。

    起點不讀目前 Runtime x / y，
    而是回到 event.startedAt，
    重新解析那一刻的
    Canonical Wander position。
  */
  const sample =
    resolveGardenWanderRuntimeSampleAtTimestamp(
      characterId,
      "moonBridge",
      startedAt
    );


  if (!sample) {
    return null;
  }


  const direction =
    resolveGardenCanonicalWanderDirection(
      characterId,
      sample
    );


  return Object.freeze({
    characterId,

    sceneId:
      "moonBridge",

    eventId:
      event.id,

    startedAt,

    x:
      sample.x,

    y:
      sample.y,

    direction:
      direction === -1
        ? -1
        : 1,

    sample,
  });
}


function createGardenMoonBridgeNightChatApproachPlans(
  event
) {
  if (!event) {
    return null;
  }


  const startedAt =
    getGardenMoonBridgeNightChatEventStartedAt(
      event
    );


  if (
    !isValidGardenWorldTimestamp(
      startedAt
    )
  ) {
    return null;
  }


  /*
    聊天位置本身也是 deterministic。
  */
  const spot =
    getGardenMoonBridgeNightChatSpot(
      event
    );


  if (
    !spot?.chifuyu ||
    !spot?.chinatsu
  ) {
    return null;
  }


  /*
    取得事件正式開始那一秒，
    兩人的 Canonical Wander 位置。
  */
  const chifuyuStart =
    getGardenMoonBridgeNightChatApproachStartSample(
      "chifuyu",
      event
    );

  const chinatsuStart =
    getGardenMoonBridgeNightChatApproachStartSample(
      "chinatsu",
      event
    );


  if (
    !chifuyuStart ||
    !chinatsuStart
  ) {
    return null;
  }


  const chifuyuPlan =
    createGardenCanonicalEventApproachPlan({
      characterId:
        "chifuyu",

      sceneId:
        "moonBridge",

      eventId:
        event.id,

      startPoint: {
        x:
          chifuyuStart.x,

        y:
          chifuyuStart.y,
      },

      startDirection:
        chifuyuStart.direction,

      targetPoint: {
        x:
          spot.chifuyu.x,

        y:
          spot.chifuyu.y,
      },

      targetDirection:
        spot.chifuyu.direction,

      startedAt,
    });


  const chinatsuPlan =
    createGardenCanonicalEventApproachPlan({
      characterId:
        "chinatsu",

      sceneId:
        "moonBridge",

      eventId:
        event.id,

      startPoint: {
        x:
          chinatsuStart.x,

        y:
          chinatsuStart.y,
      },

      startDirection:
        chinatsuStart.direction,

      targetPoint: {
        x:
          spot.chinatsu.x,

        y:
          spot.chinatsu.y,
      },

      targetDirection:
        spot.chinatsu.direction,

      startedAt,
    });


  if (
    !chifuyuPlan ||
    !chinatsuPlan
  ) {
    return null;
  }


  /*
    兩人的距離通常不同。

    所以真正能一起開始聊天的時間，
    必須等較晚抵達的人。
  */
  const completedAt =
    Math.max(
      chifuyuPlan.endsAt,
      chinatsuPlan.endsAt
    );


  return Object.freeze({
  routineId:
    "moonBridgeNightChat",

  eventId:
    event.id,

  startedAt,

  completedAt,

  spotName:
    spot.name ?? null,

  chifuyu:
    chifuyuPlan,

  chinatsu:
    chinatsuPlan,
});
}


function resolveGardenMoonBridgeNightChatApproachPlans(
  pairPlan,
  timestamp =
    getGardenWorldNow()
) {
  if (
    !pairPlan ||
    !pairPlan.chifuyu ||
    !pairPlan.chinatsu ||
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return null;
  }


  const chifuyu =
    resolveGardenCanonicalEventApproach(
      pairPlan.chifuyu,
      timestamp
    );

  const chinatsu =
    resolveGardenCanonicalEventApproach(
      pairPlan.chinatsu,
      timestamp
    );


  if (
    !chifuyu ||
    !chinatsu
  ) {
    return null;
  }


  /*
    只有兩人都抵達後，
    Pair Approach 才真正完成。

    某一人先到時，
    她會停在自己的聊天位置等待另一人。
  */
  const completed =
    chifuyu.completed === true &&
    chinatsu.completed === true;


  return Object.freeze({
    eventId:
      pairPlan.eventId,

    startedAt:
      pairPlan.startedAt,

    completedAt:
      pairPlan.completedAt,

    timestamp,

    completed,

    phase:
      timestamp <
        pairPlan.startedAt
        ? "pending"
        : completed
          ? "completed"
          : "approach",

    chifuyu,

    chinatsu,
  });
}

function applyGardenCanonicalChatApproachRuntimeForCharacter(
  characterId,
  pairResolution
) {
  const runtime =
    getGardenCharacterRuntime(
      characterId
    );

  const worldState =
    gardenCharacterWorldState[
      characterId
    ];


  if (
    !runtime?.moveState ||
    !worldState
  ) {
    return Object.freeze({
      characterId,

      owned:
        false,

      applied:
        false,

      completed:
        false,

      reason:
        "runtimeUnavailable",
    });
  }


  const sample =
    pairResolution?.[
      characterId
    ] ??
    null;


  /*
    Canonical Chat Approach 已取得 ownership。

    舊 local path 必須完全清掉，
    否則下一幀可能又被
    deltaMs integrator 推動。
  */
  runtime.setPath?.([]);

  runtime.moveState.path =
    [];


  if (
    runtime.autoState
  ) {
    runtime.autoState.wasMoving =
      false;
  }


  /*
    Pair Plan 已存在時，
    即使某一幀 Resolver 異常，
    也不能偷偷掉回 local movement。
  */
  if (!sample) {
    runtime.moveState.isMoving =
      false;


    return Object.freeze({
      characterId,

      owned:
        true,

      applied:
        false,

      completed:
        false,

      reason:
        "sampleUnavailable",
    });
  }


  const state =
    runtime.moveState;


  state.x =
    sample.x;

  state.y =
    sample.y;


  if (
    sample.direction === 1 ||
    sample.direction === -1
  ) {
    state.direction =
      sample.direction;
  }


  state.isMoving =
    sample.isMoving === true;


  if (
    sample.sceneId
  ) {
    worldState.sceneId =
      sample.sceneId;
  }


  return Object.freeze({
    characterId,

    owned:
      true,

    applied:
      true,

    completed:
      sample.completed === true,

    reason:
      sample.completed
        ? "canonicalChatApproachReached"
        : "canonicalChatApproach",

    sceneId:
      worldState.sceneId,

    sample,
  });
}



function updateGardenCanonicalChatApproachRuntime(
  timestamp =
    getGardenWorldNow()
) {
  const pairPlan =
    gardenChatState
      .canonicalApproachPlan;


  /*
    只有正式 Canonical Approach
    才取得 Spatial Ownership。

    舊測試 Chat / Legacy Chat
    仍然可以繼續使用 local path。
  */
  const active =
    gardenChatState.mode ===
      "approachChat" &&
    !!pairPlan;


  if (!active) {
    return Object.freeze({
      timestamp,

      active:
        false,

      completed:
        false,

      resolution:
        null,

      chifuyu:
        Object.freeze({
          characterId:
            "chifuyu",

          owned:
            false,

          applied:
            false,

          completed:
            false,

          reason:
            "notCanonicalChatApproach",
        }),

      chinatsu:
        Object.freeze({
          characterId:
            "chinatsu",

          owned:
            false,

          applied:
            false,

          completed:
            false,

          reason:
            "notCanonicalChatApproach",
        }),
    });
  }


  const resolution =
  resolveGardenCanonicalChatApproachPairPlan(
    pairPlan,
    timestamp
  );


  /*
    Plan 已經存在，
    ownership 就不能因單幀
    Resolver failure 而失效。
  */
  const chifuyu =
    applyGardenCanonicalChatApproachRuntimeForCharacter(
      "chifuyu",
      resolution
    );

  const chinatsu =
    applyGardenCanonicalChatApproachRuntimeForCharacter(
      "chinatsu",
      resolution
    );


  return Object.freeze({
    timestamp,

    active:
      true,

    completed:
      resolution?.completed ===
        true,

    resolution,

    chifuyu,

    chinatsu,
  });
}



function getGardenMoonBridgeNightChatTriggerAtTimestamp(
  timestamp =
    getGardenWorldNow()
) {
  const calendar =
    getGardenWorldCalendarParts(
      timestamp
    );


  if (!calendar) {
    return null;
  }


  const currentDateKey =
    calendar.dateKey;

  const previousDateKey =
    shiftGardenScheduleDateKey(
      currentDateKey,
      -1
    );


  if (!previousDateKey) {
    return null;
  }


  /*
    23:xx：
    → 今天夜間活動的 timeline。

    00:xx：
    → 也要檢查「昨天 23:00 開始」
       那場夜間活動的 +1 day timeline。
  */
  const candidates = [
    {
      dateKey:
        currentDateKey,

      timelineMinute:
        calendar.minuteOfDay,
    },

    {
      dateKey:
        previousDateKey,

      timelineMinute:
        calendar.minuteOfDay +
        1440,
    },
  ];


  for (
    const candidate of
    candidates
  ) {
    const events =
      getGardenMoonBridgeNightChatTimeline(
        candidate.dateKey
      );


    const matched =
      events.find(
        (event) =>
          event.timelineMinute ===
          candidate.timelineMinute
      );


    if (!matched) {
      continue;
    }


    return Object.freeze({
      ...matched,

      sourceDateKey:
        candidate.dateKey,

      worldDateKey:
        currentDateKey,

      worldTime:
        calendar.timeKey,
    });
  }


  return null;
}


function getGardenMoonBridgeNightChatLoopCount(
  dateKey,
  eventId
) {
  if (
    typeof dateKey !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateKey
    ) ||
    typeof eventId !== "string" ||
    !eventId
  ) {
    return null;
  }


  return (
    getGardenWorldDeterministicInt(
      GARDEN_CHAT_LOOP_MIN,
      GARDEN_CHAT_LOOP_MAX,

      "officialRoutine",
      GARDEN_OFFICIAL_ROUTINE_VERSION,
      "moonBridgeNightChat",
      dateKey,
      eventId,
      "loopCount"
    )
  );
}

function inspectGardenMoonBridgeNightChatPlan(
  dateKey = null
) {
 const currentCalendar =
  getGardenWorldCalendarParts(
    getGardenWorldNow()
  );


let resolvedDateKey =
  dateKey;


/*
  沒有手動指定 dateKey 時：

  00:00 ～ 00:59
  仍屬於前一天 23:00 開始的
  Moon Bridge Night Routine。

  01:00 之後則回到
  當天自己的 dateKey。
*/
if (
  resolvedDateKey == null
) {
  const currentDateKey =
    currentCalendar?.dateKey ??
    null;


  if (
    currentDateKey &&
    Number.isFinite(
      currentCalendar?.minuteOfDay
    ) &&
    currentCalendar.minuteOfDay <
      60
  ) {
    resolvedDateKey =
      shiftGardenScheduleDateKey(
        currentDateKey,
        -1
      );
  } else {
    resolvedDateKey =
      currentDateKey;
  }
}


  if (
    typeof resolvedDateKey !==
      "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      resolvedDateKey
    )
  ) {
    console.warn(
      "[Garden Night Chat] invalid dateKey:",
      resolvedDateKey
    );

    return null;
  }


  const events =
    getGardenMoonBridgeNightChatTimeline(
      resolvedDateKey
    );


  const rows =
    events.map(
      (event) => {
        const eventDateKey =
          shiftGardenScheduleDateKey(
            resolvedDateKey,
            event.dayOffset
          );


        const spot =
          getGardenMoonBridgeNightChatSpot(
            event
          );


        const loops =
          getGardenMoonBridgeNightChatLoopCount(
            resolvedDateKey,
            event.id
          );


        const eventForLedger = {
          ...event,

          sourceDateKey:
            resolvedDateKey,
        };


        return {
          event:
            event.id,

          date:
            eventDateKey,

          time:
            event.time,

          spot:
            spot?.name ??
            null,

          loops,

          consumed:
            isGardenMoonBridgeNightChatEventConsumed(
              eventForLedger
            ),
        };
      }
    );


  console.table(
    rows
  );


  return Object.freeze({
    dateKey:
      resolvedDateKey,

    events:
      Object.freeze(rows),
  });
}

function inspectGardenMoonBridgeNightRoutine(
  timestamp =
    getGardenWorldNow()
) {
  if (
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    console.warn(
      "[Garden Night Routine] invalid timestamp:",
      timestamp
    );

    return null;
  }


  const calendar =
    getGardenWorldCalendarParts(
      timestamp
    );

  const worldPoint =
    getGardenScheduleWorldPoint(
      timestamp
    );

  const schedules =
    provideGardenOfficialWorldSchedules(
      timestamp
    );


  if (
    !calendar ||
    !worldPoint
  ) {
    return null;
  }


  /*
    00:00～00:59 屬於
    前一天 23:00 開始的夜間活動。

    其他時間則把今天視為
    今晚 Routine 的 source date。
  */
  const nightDateKey =
    calendar.minuteOfDay < 60
      ? shiftGardenScheduleDateKey(
          calendar.dateKey,
          -1
        )
      : calendar.dateKey;


  const characterRows =
    [
      "chifuyu",
      "chinatsu",
    ].map(
      (characterId) => {
        const state =
          gardenCharacterWorldState[
            characterId
          ];

        const resolution =
          resolveGardenCharacterScheduleAtWorldPoint(
            schedules,
            characterId,
            worldPoint
          );


        const activeEntry =
          resolution
            ?.activeEntry ??
          null;


        return {
          character:
            characterId,

          scene:
            state?.sceneId ??
            null,

          activity:
            state?.activity ??
            null,

          travelFrom:
            state?.travel
              ?.fromSceneId ??
            null,

          travelTo:
            state?.travel
              ?.toSceneId ??
            null,

          travelPhase:
            state?.travel
              ?.phase ??
            null,

          scheduleState:
            resolution?.state ??
            null,

          activeIntent:
            activeEntry?.intentId ??
            null,

          scheduleDate:
            resolution
              ?.activeScheduleDateKey ??
            null,

          targetScene:
            activeEntry
              ?.target
              ?.sceneId ??
            null,

          targetActivity:
            activeEntry
              ?.activity
              ?.selectedActivityId ??
            null,

          continuity:
            state?.wanderContinuity
              ? "active"
              : null,
        };
      }
    );


  const chatEvents =
    nightDateKey
      ? getGardenMoonBridgeNightChatTimeline(
          nightDateKey
        )
      : [];


  const chatRows =
    chatEvents.map(
      (event) => {
        const eventDateKey =
          shiftGardenScheduleDateKey(
            nightDateKey,
            event.dayOffset
          );

        const ledgerEvent = {
          ...event,

          sourceDateKey:
            nightDateKey,
        };

        const spot =
          getGardenMoonBridgeNightChatSpot(
            ledgerEvent
          );


        return {
          event:
            event.id,

          date:
            eventDateKey,

          time:
            event.time,

          spot:
            spot?.name ??
            null,

          loops:
            getGardenMoonBridgeNightChatLoopCount(
              nightDateKey,
              event.id
            ),

          consumed:
            isGardenMoonBridgeNightChatEventConsumed(
              ledgerEvent
            ),
        };
      }
    );


  const summary = {
    timestamp,

    iso:
      new Date(
        timestamp
      ).toISOString(),

    worldDate:
      calendar.dateKey,

    worldTime:
      calendar.timeKey,

    viewScene:
      gardenViewSceneId,

    nightDateKey,

    chatMode:
      gardenChatState.mode,

    lastConsumedChat:
      gardenMoonBridgeNightChatEventLedger
        .lastConsumedEventKey,

    characters:
      characterRows,

    nightChats:
      chatRows,
  };


  console.log(
    "[Garden Night Routine]",
    {
      worldDate:
        summary.worldDate,

      worldTime:
        summary.worldTime,

      viewScene:
        summary.viewScene,

      nightDateKey:
        summary.nightDateKey,

      chatMode:
        summary.chatMode,

      lastConsumedChat:
        summary.lastConsumedChat,
    }
  );


  console.table(
    characterRows
  );


  console.table(
    chatRows
  );


  return Object.freeze(
    summary
  );
}

function runGardenMoonBridgeNightRoutineSelfTest() {
  const samples = [
    {
      label: "before",
      timestamp:
        Date.parse(
          "2026-09-23T22:59:00+09:00"
        ),
      expectedActive:
        false,
    },

    {
      label: "start",
      timestamp:
        Date.parse(
          "2026-09-23T23:00:00+09:00"
        ),
      expectedActive:
        true,
    },

    {
      label: "overnight",
      timestamp:
        Date.parse(
          "2026-09-24T00:30:00+09:00"
        ),
      expectedActive:
        true,
    },

    {
      label: "end",
      timestamp:
        Date.parse(
          "2026-09-24T01:00:00+09:00"
        ),
      expectedActive:
        false,
    },
  ];


  const rows =
    samples.map(
      (sample) => {
        const schedules =
          provideGardenOfficialWorldSchedules(
            sample.timestamp
          );

        const worldPoint =
          getGardenScheduleWorldPoint(
            sample.timestamp
          );


        const chifuyu =
          resolveGardenCharacterScheduleAtWorldPoint(
            schedules,
            "chifuyu",
            worldPoint
          );

        const chinatsu =
          resolveGardenCharacterScheduleAtWorldPoint(
            schedules,
            "chinatsu",
            worldPoint
          );


        const chifuyuActive =
          chifuyu
            ?.activeEntry
            ?.intentId ===
          "moonBridgeNightWalk";

        const chinatsuActive =
          chinatsu
            ?.activeEntry
            ?.intentId ===
          "moonBridgeNightWalk";


        const active =
          chifuyuActive &&
          chinatsuActive;


        return {
          label:
            sample.label,

          expected:
            sample.expectedActive,

          chifuyu:
            chifuyuActive,

          chinatsu:
            chinatsuActive,

          pass:
            active ===
            sample.expectedActive,
        };
      }
    );


  console.table(
    rows
  );


  const pass =
    rows.every(
      (row) =>
        row.pass
    );


  console.log(
    "[Garden Night Routine Self Test]",
    pass
      ? "PASS"
      : "FAIL"
  );


  return Object.freeze({
    pass,
    rows:
      Object.freeze(rows),
  });
}



/* =========================
   Moon Bridge Night Chat Event Ledger
========================= */

const gardenMoonBridgeNightChatEventLedger = {
  lastConsumedEventKey:
    null,
};

/* =========================
   Afternoon Rest Chat Event Ledger
========================= */

const gardenAfternoonRestChatEventLedger = {
  lastConsumedEventKey:
    null,
};


function getGardenAfternoonRestChatEventKey(
  event
) {
  const sourceDateKey =
    event?.sourceDateKey ??
    event?.dateKey ??
    null;


  const eventId =
    event?.id ??
    null;


  if (
    typeof sourceDateKey !==
      "string" ||
    !sourceDateKey ||
    typeof eventId !==
      "string" ||
    !eventId
  ) {
    return null;
  }


  return (
    `${sourceDateKey}::${eventId}`
  );
}


function isGardenAfternoonRestChatEventConsumed(
  event
) {
  const key =
    getGardenAfternoonRestChatEventKey(
      event
    );


  if (!key) {
    return false;
  }


  return (
    gardenAfternoonRestChatEventLedger
      .lastConsumedEventKey ===
    key
  );
}


function consumeGardenAfternoonRestChatEvent(
  event
) {
  const key =
    getGardenAfternoonRestChatEventKey(
      event
    );


  if (!key) {
    return null;
  }


  gardenAfternoonRestChatEventLedger
    .lastConsumedEventKey =
      key;


  return key;
}

function tryStartGardenAfternoonRestChat(
  timestamp =
    getGardenWorldNow()
) {
  /*
    ① 必須命中今天 deterministic
       Afternoon Rest Chat event。
  */
  const event =
    getGardenAfternoonRestChatTriggerAtTimestamp(
      timestamp
    );


  if (!event) {
    return Object.freeze({
      started:
        false,

      reason:
        "noChatEvent",
    });
  }


  /*
    ② 同一 event 不重播。
  */
  if (
    isGardenAfternoonRestChatEventConsumed(
      event
    )
  ) {
    return Object.freeze({
      started:
        false,

      reason:
        "alreadyConsumed",

      event,
    });
  }


  /*
    ③ Chat Runtime 必須空閒。
  */
  if (
    gardenChatState.mode !==
      "wander"
  ) {
    return Object.freeze({
      started:
        false,

      reason:
        "chatRuntimeBusy",

      event,
    });
  }


  /*
    ④ 兩人必須真的一起在 courtyard。
  */
  if (
    getGardenSharedCharacterSceneId() !==
      "courtyard"
  ) {
    return Object.freeze({
      started:
        false,

      reason:
        "charactersNotTogetherAtCourtyard",

      event,
    });
  }


  /*
    ⑤ 兩人 Runtime Activity
       都必須仍然是 REST。

    任何 Travel / Wander /
    其他活動都不能被強制打斷。
  */
  if (
    gardenCharacterWorldState
      .chifuyu
      ?.activity !==
        GARDEN_CHARACTER_ACTIVITY
          .REST ||
    gardenCharacterWorldState
      .chinatsu
      ?.activity !==
        GARDEN_CHARACTER_ACTIVITY
          .REST
  ) {
    return Object.freeze({
      started:
        false,

      reason:
        "charactersNotResting",

      event,
    });
  }


  /*
    ⑥ 必須已經真的抵達
       各自 Activity Spot。

    Activity Spot Approach 完成後
    這個欄位會被清成 null。
  */
  if (
    gardenCharacterWorldState
      .chifuyu
      ?.activitySpotApproach ||
    gardenCharacterWorldState
      .chinatsu
      ?.activitySpotApproach
  ) {
    return Object.freeze({
      started:
        false,

      reason:
        "restSpotApproachStillActive",

      event,
    });
  }


  /*
    Travel 也必須完全結束。
  */
  if (
    gardenCharacterWorldState
      .chifuyu
      ?.travel ||
    gardenCharacterWorldState
      .chinatsu
      ?.travel
  ) {
    return Object.freeze({
      started:
        false,

      reason:
        "characterTravelStillActive",

      event,
    });
  }


  /*
    ⑦ 正式 Schedule 必須仍然是
       兩人的 Afternoon Rest。

    避免未來更高 priority 的
    Schedule 已經接管角色，
    但 Chat 還硬插進來。
  */
  const schedules =
    provideGardenOfficialWorldSchedules(
      timestamp
    );


  const worldPoint =
    getGardenScheduleWorldPoint(
      timestamp
    );


  if (
    !worldPoint ||
    schedules.length === 0
  ) {
    return Object.freeze({
      started:
        false,

      reason:
        "scheduleUnavailable",

      event,
    });
  }


  const chifuyuResolution =
    resolveGardenCharacterScheduleAtWorldPoint(
      schedules,
      "chifuyu",
      worldPoint
    );


  const chinatsuResolution =
    resolveGardenCharacterScheduleAtWorldPoint(
      schedules,
      "chinatsu",
      worldPoint
    );


  const chifuyuEntry =
    chifuyuResolution
      ?.activeEntry ??
    null;


  const chinatsuEntry =
    chinatsuResolution
      ?.activeEntry ??
    null;


  const chifuyuAfternoonRest =
    chifuyuEntry
      ?.intentId ===
        "afternoonRest" &&
    chifuyuEntry
      ?.target
      ?.sceneId ===
        "courtyard" &&
    chifuyuEntry
      ?.target
      ?.spotId ===
        "courtyard-rest-01";


  const chinatsuAfternoonRest =
    chinatsuEntry
      ?.intentId ===
        "afternoonRest" &&
    chinatsuEntry
      ?.target
      ?.sceneId ===
        "courtyard" &&
    chinatsuEntry
      ?.target
      ?.spotId ===
        "courtyard-rest-02";


  if (
    !chifuyuAfternoonRest ||
    !chinatsuAfternoonRest
  ) {
    return Object.freeze({
      started:
        false,

      reason:
        "afternoonRestScheduleNotActive",

      event,
    });
  }


  /*
    ⑧ deterministic spot + loops。
  */
  const spot =
    getGardenAfternoonRestChatSpot(
      event
    );


  const sourceDateKey =
    event.sourceDateKey ??
    event.dateKey;


  const targetLoops =
    getGardenAfternoonRestChatLoopCount(
      sourceDateKey,
      event.id
    );


  if (
    !spot ||
    !Number.isInteger(
      targetLoops
    )
  ) {
    return Object.freeze({
      started:
        false,

      reason:
        "chatPlanUnavailable",

      event,
    });
  }


  /*
    ⑨ 啟動 Canonical
       Afternoon Rest Approach。
  */
  const started =
    startGardenCanonicalAfternoonRestChatApproach(
      event,
      targetLoops
    );


  if (!started) {
    /*
      啟動失敗絕不 consume。
      同一分鐘內仍可再次嘗試。
    */
    return Object.freeze({
      started:
        false,

      reason:
        "approachStartFailed",

      event,

      spotName:
        spot.name ??
        null,

      targetLoops,
    });
  }


  /*
    ⑩ 只有真正成功啟動後
       才 consume。
  */
  const consumedEventKey =
    consumeGardenAfternoonRestChatEvent(
      event
    );


  /*
    立刻持久化 ledger。
  */
  saveGardenWorldState(
    "afternoonRestChatConsumed"
  );


  return Object.freeze({
    started:
      true,

    reason:
      "started",

    event,

    consumedEventKey,

    spotName:
      spot.name ??
      null,

    targetLoops,

    resumeActivity:
      GARDEN_CHARACTER_ACTIVITY
        .REST,
  });
}

function getGardenMoonBridgeNightChatEventKey(
  event
) {
  const sourceDateKey =
    event?.sourceDateKey ??
    event?.dateKey ??
    null;

  const eventId =
    event?.id ??
    null;


  if (
    typeof sourceDateKey !==
      "string" ||
    !sourceDateKey ||
    typeof eventId !==
      "string" ||
    !eventId
  ) {
    return null;
  }


  return (
    `${sourceDateKey}::${eventId}`
  );
}


function getGardenMoonBridgeNightChatSpot(
  event
) {
  if (!event) {
    return null;
  }


  const sourceDateKey =
    event.sourceDateKey ??
    event.dateKey ??
    null;

  const eventId =
    event.id ??
    null;


  if (
    typeof sourceDateKey !==
      "string" ||
    !sourceDateKey ||
    typeof eventId !==
      "string" ||
    !eventId
  ) {
    return null;
  }


  const validSpots =
    MOON_BRIDGE_CHAT_SPOTS.filter(
      (spot) =>
        isGardenChatSpotValidInScene(
          "moonBridge",
          spot
        )
    );


  if (
    validSpots.length ===
    0
  ) {
    return null;
  }


  return (
    pickGardenWorldDeterministic(
      validSpots,

      "officialRoutine",
      GARDEN_OFFICIAL_ROUTINE_VERSION,
      "moonBridgeNightChat",
      sourceDateKey,
      eventId,
      "chatSpot"
    )
  );
}


function isGardenMoonBridgeNightChatEventConsumed(
  event
) {
  const key =
    getGardenMoonBridgeNightChatEventKey(
      event
    );


  if (!key) {
    return false;
  }


  return (
    gardenMoonBridgeNightChatEventLedger
      .lastConsumedEventKey ===
    key
  );
}


function consumeGardenMoonBridgeNightChatEvent(
  event
) {
  const key =
    getGardenMoonBridgeNightChatEventKey(
      event
    );


  if (!key) {
    return null;
  }


  gardenMoonBridgeNightChatEventLedger
    .lastConsumedEventKey =
      key;


  return key;
}


function tryStartGardenMoonBridgeNightChat(
  timestamp =
    getGardenWorldNow()
) {
  /*
    ① 目前時間必須真的命中
       deterministic Chat event。
  */
  const event =
    getGardenMoonBridgeNightChatTriggerAtTimestamp(
      timestamp
    );


  if (!event) {
    return Object.freeze({
      started: false,
      reason: "noChatEvent",
    });
  }


  /*
    ② 同一個 event 不得重播。
  */
  if (
    isGardenMoonBridgeNightChatEventConsumed(
      event
    )
  ) {
    return Object.freeze({
      started: false,
      reason: "alreadyConsumed",
      event,
    });
  }


  /*
    ③ Chat Runtime 本身必須是空閒。
  */
  if (
    gardenChatState.mode !==
      "wander"
  ) {
    return Object.freeze({
      started: false,
      reason: "chatRuntimeBusy",
      event,
    });
  }


  /*
    ④ 兩人必須真的都已經在賞月橋。
  */
  if (
    getGardenSharedCharacterSceneId() !==
      "moonBridge"
  ) {
    return Object.freeze({
      started: false,
      reason: "charactersNotTogetherAtMoonBridge",
      event,
    });
  }


  /*
    ⑤ 兩人目前都必須處於 Wander。

    Travel / Rest / 其他 Activity
    都不能被這場 Chat 強行打斷。
  */
  if (
    gardenCharacterWorldState
      .chifuyu
      ?.activity !==
        GARDEN_CHARACTER_ACTIVITY
          .WANDER ||
    gardenCharacterWorldState
      .chinatsu
      ?.activity !==
        GARDEN_CHARACTER_ACTIVITY
          .WANDER
  ) {
    return Object.freeze({
      started: false,
      reason: "charactersNotWandering",
      event,
    });
  }


  /*
    ⑥ 確認真正生效中的 Schedule
       仍然是兩人的 Moon Bridge Night Walk。

    未來如果同時間出現更高 priority
    的活動，Chat 就不能蓋掉它。
  */
  const schedules =
    provideGardenOfficialWorldSchedules(
      timestamp
    );

  const worldPoint =
    getGardenScheduleWorldPoint(
      timestamp
    );


  if (
    !worldPoint ||
    schedules.length === 0
  ) {
    return Object.freeze({
      started: false,
      reason: "scheduleUnavailable",
      event,
    });
  }


  const chifuyuResolution =
    resolveGardenCharacterScheduleAtWorldPoint(
      schedules,
      "chifuyu",
      worldPoint
    );

  const chinatsuResolution =
    resolveGardenCharacterScheduleAtWorldPoint(
      schedules,
      "chinatsu",
      worldPoint
    );


  const chifuyuNightWalk =
    chifuyuResolution
      ?.activeEntry
      ?.intentId ===
      "moonBridgeNightWalk";

  const chinatsuNightWalk =
    chinatsuResolution
      ?.activeEntry
      ?.intentId ===
      "moonBridgeNightWalk";


  if (
    !chifuyuNightWalk ||
    !chinatsuNightWalk
  ) {
    return Object.freeze({
      started: false,
      reason: "nightWalkScheduleNotActive",
      event,
    });
  }


  /*
    ⑦ 取得 deterministic spot + loops。
  */
  const spot =
    getGardenMoonBridgeNightChatSpot(
      event
    );

  const sourceDateKey =
    event.sourceDateKey ??
    event.dateKey;

  const targetLoops =
    getGardenMoonBridgeNightChatLoopCount(
      sourceDateKey,
      event.id
    );


  if (
    !spot ||
    !Number.isInteger(
      targetLoops
    )
  ) {
    return Object.freeze({
      started: false,
      reason: "chatPlanUnavailable",
      event,
    });
  }


  /*
    ⑧ 真正啟動 Approach Chat。
  */
  const started =
  startGardenCanonicalChatApproach(
    event,
    targetLoops
  );


  if (!started) {
    /*
      失敗時絕對不 consume。

      這樣同一分鐘下一次 Live Tick
      還有機會重新嘗試。
    */
    return Object.freeze({
      started: false,
      reason: "approachStartFailed",
      event,
      spotName:
        spot.name ?? null,
      targetLoops,
    });
  }


  /*
    ⑨ 只有 Runtime 真正成功啟動後
       才正式消耗 event。
  */
  const consumedEventKey =
    consumeGardenMoonBridgeNightChatEvent(
      event
    );


  /*
    立即存檔。

    即使玩家剛開始聊天就 F5，
    Cold Start 可以安全退回 Wander，
    但同一場 Chat 不會再播一次。
  */
  saveGardenWorldState(
    "moonBridgeNightChatConsumed"
  );


  return Object.freeze({
    started: true,
    reason: "started",

    event,

    consumedEventKey,

    spotName:
      spot.name ?? null,

    targetLoops,
  });
}



function getGardenOfficialScheduleDefinitionsForDate(
  dateKey
) {
  if (
    typeof dateKey !==
      "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateKey
    )
  ) {
    return Object.freeze([]);
  }


  const definitions =
    [];



  /*
    =========================
    Chifuyu — Courtyard Ambient
    =========================

    Garden 的 baseline spatial schedule。

    01:00 ～ 23:00 JST
    沒有更高 Priority 行程時，
    千冬預設在庭院 Wander。

    這不是特殊活動，
    而是角色日常世界位置的
    最低優先級 canonical ownership。
  */
  const chifuyuCourtyardAmbient =
    createGardenScheduleIntentDefinition({
      id:
        "official-chifuyu-courtyard-ambient",

      characterId:
        "chifuyu",

      intentId:
        "courtyardAmbient",

      instanceId:
        "daily",

      windowStart:
        "01:00",

      windowEnd:
        "01:00",

      durationMinMinutes:
        22 * 60,

      durationMaxMinutes:
        22 * 60,

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .LOW,

      sceneId:
        "courtyard",

      activityId:
        "wander",

      fallbackActivityId:
        "wander",

      canDelay:
        false,

      canBeOverridden:
        true,

      latePolicy:
        GARDEN_SCHEDULE_LATE_POLICY
          .SKIP,

      tags: [
        "official",
        "dailyRoutine",
        "ambient",
        "baseline",
        "courtyard",
      ],
    });


  /*
    =========================
    Chinatsu — Courtyard Ambient
    =========================

    與千冬相同：

    01:00 ～ 23:00 JST
    若沒有更高 Priority 行程，
    預設在庭院 Wander。
  */
  const chinatsuCourtyardAmbient =
    createGardenScheduleIntentDefinition({
      id:
        "official-chinatsu-courtyard-ambient",

      characterId:
        "chinatsu",

      intentId:
        "courtyardAmbient",

      instanceId:
        "daily",

      windowStart:
        "01:00",

      windowEnd:
        "01:00",

      durationMinMinutes:
        22 * 60,

      durationMaxMinutes:
        22 * 60,

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .LOW,

      sceneId:
        "courtyard",

      activityId:
        "wander",

      fallbackActivityId:
        "wander",

      canDelay:
        false,

      canBeOverridden:
        true,

      latePolicy:
        GARDEN_SCHEDULE_LATE_POLICY
          .SKIP,

      tags: [
        "official",
        "dailyRoutine",
        "ambient",
        "baseline",
        "courtyard",
      ],
    });

  /*
    =========================
    Chifuyu — Afternoon Rest
    =========================

    Start Window：
    14:00 ～ 15:30 JST

    Duration：
    30 ～ 45 分鐘

    實際每天開始時間與長度
    都由 deterministic
    World Decision 決定。
  */
  const chifuyuAfternoonRest =
    createGardenScheduleIntentDefinition({
      id:
        "official-chifuyu-afternoon-rest",

      characterId:
        "chifuyu",

      intentId:
        "afternoonRest",

      instanceId:
        "daily",

      windowStart:
        "14:00",

      windowEnd:
        "15:30",

      durationMinMinutes:
        30,

      durationMaxMinutes:
        45,

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .NORMAL,

      /*
  千冬午後休息：

  庭院固定休息點。
*/
sceneId:
  "courtyard",

spotId:
  "courtyard-rest-01",

activityId:
  "rest",

      fallbackActivityId:
        "wander",

      canDelay:
        true,

      canBeOverridden:
        true,

      latePolicy:
        GARDEN_SCHEDULE_LATE_POLICY
          .SKIP,

      maxDelayMinutes:
        30,

      tags: [
        "official",
        "dailyRoutine",
        "rest",
      ],
    });


/*
  =========================
  Chinatsu — Afternoon Rest
  =========================

  Start Window：
  14:00 ～ 15:30 JST

  Duration：
  30 ～ 45 分鐘

  實際每天開始時間與長度
  都由 deterministic
  World Decision 決定。
*/
const chinatsuAfternoonRest =
  createGardenScheduleIntentDefinition({
    id:
      "official-chinatsu-afternoon-rest",

    characterId:
      "chinatsu",

    intentId:
      "afternoonRest",

    instanceId:
      "daily",

    windowStart:
      "14:00",

    windowEnd:
      "15:30",

    durationMinMinutes:
      30,

    durationMaxMinutes:
      45,

    priority:
      GARDEN_SCHEDULE_PRIORITY
        .NORMAL,

    sceneId:
      "courtyard",

    spotId:
      "courtyard-rest-02",

    activityId:
      "rest",

    fallbackActivityId:
      "wander",

    canDelay:
      true,

    canBeOverridden:
      true,

    latePolicy:
      GARDEN_SCHEDULE_LATE_POLICY
        .SKIP,

    maxDelayMinutes:
      30,

    tags: [
      "official",
      "dailyRoutine",
      "rest",
    ],
  });


/*
  =========================
  Chifuyu — Moon Bridge Night Walk
  =========================

  每天 23:00 ～ 翌日 01:00 JST。

  23:00 固定開始，
  持續 120 分鐘。

  目前先只有 Wander。
  Chat 之後由 deterministic
  chat timeline 插入。
*/
const chifuyuMoonBridgeNightWalk =
  createGardenScheduleIntentDefinition({
    id:
      "official-chifuyu-moon-bridge-night-walk",

    characterId:
      "chifuyu",

    intentId:
      "moonBridgeNightWalk",

    instanceId:
      "daily",

    windowStart:
      "23:00",

    windowEnd:
      "23:00",

    durationMinMinutes:
      120,

    durationMaxMinutes:
      120,

    priority:
      GARDEN_SCHEDULE_PRIORITY
        .NORMAL,

    sceneId:
      "moonBridge",

    activityId:
      "wander",

    fallbackActivityId:
      "wander",

    canDelay:
      false,

    canBeOverridden:
      true,

    latePolicy:
      GARDEN_SCHEDULE_LATE_POLICY
        .SKIP,

    tags: [
      "official",
      "dailyRoutine",
      "moonBridge",
      "nightWalk",
    ],
  });

/*
  =========================
  Chinatsu — Moon Bridge Night Walk
  =========================

  每天 23:00 ～ 翌日 01:00 JST。

  與千冬共用同一段夜間
  賞月橋散步時段。

  目前先只有 Wander。
  Chat 之後由 deterministic
  chat timeline 插入。
*/
const chinatsuMoonBridgeNightWalk =
  createGardenScheduleIntentDefinition({
    id:
      "official-chinatsu-moon-bridge-night-walk",

    characterId:
      "chinatsu",

    intentId:
      "moonBridgeNightWalk",

    instanceId:
      "daily",

    windowStart:
      "23:00",

    windowEnd:
      "23:00",

    durationMinMinutes:
      120,

    durationMaxMinutes:
      120,

    priority:
      GARDEN_SCHEDULE_PRIORITY
        .NORMAL,

    sceneId:
      "moonBridge",

    activityId:
      "wander",

    fallbackActivityId:
      "wander",

    canDelay:
      false,

    canBeOverridden:
      true,

    latePolicy:
      GARDEN_SCHEDULE_LATE_POLICY
        .SKIP,

    tags: [
      "official",
      "dailyRoutine",
      "moonBridge",
      "nightWalk",
    ],
  });


  if (
    chifuyuCourtyardAmbient
  ) {
    definitions.push(
      chifuyuCourtyardAmbient
    );
  }


  if (
    chinatsuCourtyardAmbient
  ) {
    definitions.push(
      chinatsuCourtyardAmbient
    );
  }



  if (
    chifuyuAfternoonRest
  ) {
    definitions.push(
      chifuyuAfternoonRest
    );
  }

if (
  chinatsuAfternoonRest
) {
  definitions.push(
    chinatsuAfternoonRest
  );
}



if (
  chifuyuMoonBridgeNightWalk
) {
  definitions.push(
    chifuyuMoonBridgeNightWalk
  );
}


if (
  chinatsuMoonBridgeNightWalk
) {
  definitions.push(
    chinatsuMoonBridgeNightWalk
  );
}


  return Object.freeze(
    definitions
  );
}


function generateGardenOfficialDailySchedule(
  dateKey
) {
  const definitions =
    getGardenOfficialScheduleDefinitionsForDate(
      dateKey
    );


  return (
    generateGardenDailySchedule(
      definitions,
      dateKey
    )
  );
}


/* =========================
   Garden Schedule Catch-up
   Pure Scene Resolver
========================= */

function resolveGardenCharacterScheduleCatchUpScene({
  characterId,

  suspendedAt,

  resumedAt,

  initialSceneId = null,
} = {}) {
  const safeCharacterId =
    normalizeGardenWorldDecisionToken(
      characterId
    );


  if (
    !safeCharacterId ||
    !isValidGardenWorldTimestamp(
      suspendedAt
    ) ||
    !isValidGardenWorldTimestamp(
      resumedAt
    ) ||
    resumedAt <
      suspendedAt
  ) {
    return null;
  }


  const suspendedCalendar =
    getGardenWorldCalendarParts(
      suspendedAt
    );

  const resumedCalendar =
    getGardenWorldCalendarParts(
      resumedAt
    );


  if (
    !suspendedCalendar ||
    !resumedCalendar
  ) {
    return null;
  }


  const suspendedDayNumber =
    getGardenScheduleDateDayNumber(
      suspendedCalendar.dateKey
    );

  const resumedDayNumber =
    getGardenScheduleDateDayNumber(
      resumedCalendar.dateKey
    );


  if (
    !Number.isInteger(
      suspendedDayNumber
    ) ||
    !Number.isInteger(
      resumedDayNumber
    ) ||
    resumedDayNumber <
      suspendedDayNumber
  ) {
    return null;
  }


  /*
    收集離線區間內所有可能造成
    Schedule ownership 改變的時間邊界。

    額外從前一天開始掃，
    是為了支援未來可能跨午夜的
    Schedule Entry。
  */
  const boundarySet =
    new Set();


  const daySpan =
    resumedDayNumber -
    suspendedDayNumber;


  for (
    let dayOffset = -1;
    dayOffset <= daySpan;
    dayOffset++
  ) {
    const dateKey =
      shiftGardenScheduleDateKey(
        suspendedCalendar.dateKey,
        dayOffset
      );


    if (!dateKey) {
      continue;
    }


    const schedule =
      generateGardenOfficialDailySchedule(
        dateKey
      );


    if (
      !isValidGardenDailySchedule(
        schedule
      )
    ) {
      continue;
    }


    for (
      const entry of
      schedule.entries
    ) {
      if (
        entry.characterId !==
          safeCharacterId
      ) {
        continue;
      }


      for (
        const point of
        [
          entry.start,
          entry.end,
        ]
      ) {
        const timestamp =
          getGardenTimelineTimestamp(
            schedule.dateKey,
            point.timelineMinute
          );


        if (
          !isValidGardenWorldTimestamp(
            timestamp
          )
        ) {
          continue;
        }


        /*
          suspendedAt 當下以前的狀態
          應已存在 Snapshot。

          Catch-up 只處理離開之後
          發生的 Schedule transition。
        */
        if (
          timestamp >
            suspendedAt &&
          timestamp <=
            resumedAt
        ) {
          boundarySet.add(
            timestamp
          );
        }
      }
    }
  }


  const boundaries =
    [...boundarySet].sort(
      (a, b) =>
        a - b
    );


  let resolvedSceneId =
    initialSceneId;


  const transitions =
    [];


  for (
    const timestamp of
    boundaries
  ) {
    /*
      直接使用正式 Schedule Resolver。

      如有 overlap / priority，
      由既有 Schedule 系統決定
      這一刻真正取得 ownership 的 Entry。
    */
    const schedules =
      provideGardenOfficialWorldSchedules(
        timestamp
      );


    const resolution =
      resolveGardenCharacterScheduleAtTimestamp(
        schedules,
        safeCharacterId,
        timestamp
      );


    const activeEntry =
      resolution?.activeEntry ??
      null;


    const scheduleDateKey =
      resolution
        ?.activeScheduleDateKey ??
      null;


    const targetSceneId =
      activeEntry
        ?.target
        ?.sceneId ??
      null;


    if (
      !activeEntry ||
      !scheduleDateKey ||
      !targetSceneId
    ) {
      continue;
    }


    /*
      Catch-up 只補「整段已經錯過」
      的 Schedule。

      如果玩家回來時 Activity
      還在進行，就交回普通
      Schedule Reconciliation 處理，
      不在這裡提前跳到終點。
    */
    const activeEndsAt =
      getGardenTimelineTimestamp(
        scheduleDateKey,
        activeEntry
          .end
          .timelineMinute
      );


    if (
      !isValidGardenWorldTimestamp(
        activeEndsAt
      ) ||
      activeEndsAt >
        resumedAt
    ) {
      continue;
    }


    const previousSceneId =
      resolvedSceneId;


    resolvedSceneId =
      targetSceneId;


    transitions.push(
      Object.freeze({
        timestamp,

        scheduleDateKey,

        definitionId:
          activeEntry.definitionId,

        intentId:
          activeEntry.intentId,

        startsAt:
          getGardenTimelineTimestamp(
            scheduleDateKey,
            activeEntry
              .start
              .timelineMinute
          ),

        endsAt:
          activeEndsAt,

        fromSceneId:
          previousSceneId,

        toSceneId:
          targetSceneId,

        changed:
          previousSceneId !==
          targetSceneId,
      })
    );
  }


  return Object.freeze({
    characterId:
      safeCharacterId,

    suspendedAt,

    resumedAt,

    initialSceneId,

    resolvedSceneId,

    changed:
      resolvedSceneId !==
      initialSceneId,

    boundaryCount:
      boundaries.length,

    transitions:
      Object.freeze(
        transitions
      ),

    latestTransition:
      transitions[
        transitions.length - 1
      ] ??
      null,
  });
}


function reconcileGardenScheduleCatchUpSystem(
  context
) {
  if (
    !context ||
    !isValidGardenWorldTimestamp(
      context.suspendedAt
    ) ||
    !isValidGardenWorldTimestamp(
      context.resumedAt
    )
  ) {
    return Object.freeze({
      ok: false,
      reason: "invalidContext",
      results: Object.freeze([]),
    });
  }


  /*
    Live Tick 的 context：

    suspendedAt === resumedAt

    沒有離線區間，
    Catch-up 完全不需要執行。
  */
  if (
    context.resumedAt <=
      context.suspendedAt
  ) {
    return Object.freeze({
      ok: true,
      reason: "noElapsedTime",
      timestamp:
        context.resumedAt,

      results:
        Object.freeze([]),
    });
  }


  const results =
    [];

  let sceneChanged =
    false;


  for (
    const characterId of
    Object.keys(
      gardenCharacterWorldState
    )
  ) {
    const worldState =
      gardenCharacterWorldState[
        characterId
      ];


    if (!worldState) {
      results.push(
        Object.freeze({
          characterId,
          applied: false,
          reason:
            "missingWorldState",
        })
      );

      continue;
    }


    /*
      Travel 仍然 active：

      Travel Reconciliation
      已經擁有這個角色的空間狀態。

      Catch-up 不搶 ownership。
    */
   if (
  worldState.travel ||
  getGardenCharacterActivityOwnership(
    characterId,
    worldState
  )?.owner ===
    GARDEN_CHARACTER_ACTIVITY_OWNER
      .TRAVEL
) {
      results.push(
        Object.freeze({
          characterId,
          applied: false,
          reason:
            "travelStillActive",
        })
      );

      continue;
    }


    /*
      Activity Spot Approach
      在 priority 150 已先處理。

      若到這裡仍存在，
      代表它在 resumedAt
      仍然 legitimately active。
    */
    if (
      worldState
        .activitySpotApproach
    ) {
      results.push(
        Object.freeze({
          characterId,
          applied: false,
          reason:
            "activitySpotApproachStillActive",
        })
      );

      continue;
    }


    /*
      Chat Runtime 不由
      Schedule Catch-up 強制打斷。
    */
    if (
  getGardenCharacterActivityOwnership(
    characterId,
    worldState
  )?.owner ===
    GARDEN_CHARACTER_ACTIVITY_OWNER
      .CHAT ||
  gardenChatState.mode !==
    "wander"
) {
      results.push(
        Object.freeze({
          characterId,
          applied: false,
          reason:
            "chatRuntimeActive",
        })
      );

      continue;
    }


    /*
      可以安全被 Catch-up 修正的狀態：

      1. 普通 Wander
      2. 舊 Schedule 留下的 Activity

      未來若有玩家互動型／特殊 Activity，
      不會被這裡擅自覆蓋。
    */
    const currentOwnership =
  getGardenCharacterActivityOwnership(
    characterId,
    worldState
  );


const canApply =
  currentOwnership?.owner ===
    GARDEN_CHARACTER_ACTIVITY_OWNER
      .WANDER ||
  currentOwnership?.owner ===
    GARDEN_CHARACTER_ACTIVITY_OWNER
      .SCHEDULE;


    if (!canApply) {
      results.push(
        Object.freeze({
          characterId,
          applied: false,
          reason:
            "runtimeOwnedByNonScheduleActivity",
        })
      );

      continue;
    }


    const catchUp =
      resolveGardenCharacterScheduleCatchUpScene({
        characterId,

        suspendedAt:
          context.suspendedAt,

        resumedAt:
          context.resumedAt,

        initialSceneId:
          worldState.sceneId ??
          null,
      });


    if (!catchUp) {
      results.push(
        Object.freeze({
          characterId,
          applied: false,
          reason:
            "catchUpUnavailable",
        })
      );

      continue;
    }


    /*
      沒有任何 scene consequence。

      世界狀態完全不動。
    */
    if (
      catchUp.changed !==
        true ||
      !catchUp.resolvedSceneId
    ) {
      results.push(
        Object.freeze({
          characterId,
          applied: false,
          reason:
            "sceneAlreadyCorrect",

          catchUp,
        })
      );

      continue;
    }


    const previousSceneId =
      worldState.sceneId;


    /*
      這裡不是播放 Travel。

      這段移動已經完整發生在
      玩家離線期間。

      Resume 時只恢復其
      canonical consequence。
    */
    worldState.sceneId =
      catchUp.resolvedSceneId;


    /*
      被完整錯過的 Schedule
      已經結束。

      所以 Resume 後先回 Wander。

      若 resumedAt 當下另有
      active Schedule，
      priority 100 的正式
      Schedule Reconciliation
      稍後會再取得 ownership。
    */
    setGardenCharacterActivity(
      characterId,
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,
      null
    );


    worldState.wanderContinuity =
      null;


    /*
      清除舊 Scene 留下的
      local movement。

      真正 resumedAt 的位置
      交給 priority 50
      Canonical Wander 重建。
    */
    const runtime =
      getGardenCharacterRuntime(
        characterId
      );


    runtime?.setPath?.([]);


    if (
      runtime?.moveState
    ) {
      runtime.moveState.path =
        [];

      runtime.moveState.isMoving =
        false;
    }


    if (
      runtime?.autoState
    ) {
      runtime.autoState.wasMoving =
        false;
    }


    sceneChanged =
      true;


    results.push(
      Object.freeze({
        characterId,

        applied:
          true,

        reason:
          "missedScheduleSceneApplied",

        previousSceneId,

        sceneId:
          worldState.sceneId,

        catchUp,
      })
    );
  }


  if (sceneChanged) {
    updateGardenCharacterVisibility();
  }


  return Object.freeze({
    ok: true,

    reason:
      sceneChanged
        ? "catchUpApplied"
        : "noSceneChange",

    timestamp:
      context.resumedAt,

    results:
      Object.freeze(
        results
      ),
  });
}




/* =========================
   Afternoon Rest Overlap
========================= */

function getGardenAfternoonRestOverlap(
  dateKey
) {
  if (
    typeof dateKey !==
      "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateKey
    )
  ) {
    return null;
  }


  const schedule =
    generateGardenOfficialDailySchedule(
      dateKey
    );


  if (
    !isValidGardenDailySchedule(
      schedule
    )
  ) {
    return null;
  }


  const chifuyu =
    schedule.entries.find(
      (entry) =>
        entry.definitionId ===
        "official-chifuyu-afternoon-rest"
    ) ??
    null;


  const chinatsu =
    schedule.entries.find(
      (entry) =>
        entry.definitionId ===
        "official-chinatsu-afternoon-rest"
    ) ??
    null;


  if (
    !chifuyu ||
    !chinatsu ||
    !Number.isFinite(
      chifuyu.start
        ?.timelineMinute
    ) ||
    !Number.isFinite(
      chifuyu.end
        ?.timelineMinute
    ) ||
    !Number.isFinite(
      chinatsu.start
        ?.timelineMinute
    ) ||
    !Number.isFinite(
      chinatsu.end
        ?.timelineMinute
    )
  ) {
    return null;
  }


  /*
    共同休息：

    later start
    →
    earlier end
  */
  const startTimelineMinute =
    Math.max(
      chifuyu.start
        .timelineMinute,

      chinatsu.start
        .timelineMinute
    );


  const endTimelineMinute =
    Math.min(
      chifuyu.end
        .timelineMinute,

      chinatsu.end
        .timelineMinute
    );


  const durationMinutes =
    Math.max(
      0,
      endTimelineMinute -
        startTimelineMinute
    );


  return Object.freeze({
    dateKey,

    hasOverlap:
      durationMinutes > 0,

    startTimelineMinute,

    endTimelineMinute,

    durationMinutes,

    chifuyu:
      Object.freeze({
        startTimelineMinute:
          chifuyu.start
            .timelineMinute,

        endTimelineMinute:
          chifuyu.end
            .timelineMinute,
      }),

    chinatsu:
      Object.freeze({
        startTimelineMinute:
          chinatsu.start
            .timelineMinute,

        endTimelineMinute:
          chinatsu.end
            .timelineMinute,
      }),
  });
}

/* =========================
   Afternoon Rest Chat Timeline
========================= */

function getGardenAfternoonRestChatTimeline(
  dateKey
) {
  const overlap =
    getGardenAfternoonRestOverlap(
      dateKey
    );


  if (
    !overlap ||
    !overlap.hasOverlap
  ) {
    return Object.freeze([]);
  }


  /*
    太短的共同休息不安排聊天。
  */
 if (
  overlap.durationMinutes <
  5
) {
  return Object.freeze([]);
}


 const bufferMinutes =
  1;


  const safeStart =
    overlap.startTimelineMinute +
    bufferMinutes;


  const safeEnd =
    overlap.endTimelineMinute -
    bufferMinutes;


  if (
    safeEnd <
    safeStart
  ) {
    return Object.freeze([]);
  }


  /*
    共同休息夠長時，
    最多安排兩場。

    12～23 分鐘 → 1 場
    24 分鐘以上 → 2 場
  */
 const eventCount =
  overlap.durationMinutes >= 20
    ? 2
    : 1;


  const windows = [];


  if (
    eventCount === 1
  ) {
    windows.push({
      id:
        "single",

      startTimelineMinute:
        safeStart,

      endTimelineMinute:
        safeEnd,
    });
  } else {
    const middle =
      Math.floor(
        (
          safeStart +
          safeEnd
        ) / 2
      );


    windows.push(
      {
        id:
          "early",

        startTimelineMinute:
          safeStart,

        endTimelineMinute:
          middle,
      },

      {
        id:
          "late",

        startTimelineMinute:
          middle + 1,

        endTimelineMinute:
          safeEnd,
      }
    );
  }


  const events =
    windows
      .map(
        (
          window,
          index
        ) => {
          const timelineMinute =
            getGardenWorldDeterministicInt(
              window
                .startTimelineMinute,

              window
                .endTimelineMinute,

              "officialRoutine",

              GARDEN_OFFICIAL_ROUTINE_VERSION,

              "afternoonRestChat",

              dateKey,

              window.id,

              "start"
            );


          if (
            !Number.isFinite(
              timelineMinute
            )
          ) {
            return null;
          }


          const point =
            splitGardenScheduleTimelineMinute(
              timelineMinute
            );


          if (!point) {
            return null;
          }


          return Object.freeze({
            id:
              `afternoonRestChat-${window.id}`,

            index,

            dateKey,

            timelineMinute:
              point.timelineMinute,

            dayOffset:
              point.dayOffset,

            minuteOfDay:
              point.minuteOfDay,

            time:
              point.time,
          });
        }
      )
      .filter(Boolean);


  return Object.freeze(
    events
  );
}


function getGardenAfternoonRestChatEventStartedAt(
  event
) {
  if (
    !event ||
    typeof event.dateKey !==
      "string" ||
    !Number.isFinite(
      event.timelineMinute
    )
  ) {
    return null;
  }


  return (
    getGardenTimelineTimestamp(
      event.dateKey,
      event.timelineMinute,
      0
    )
  );
}


function getGardenAfternoonRestChatTriggerAtTimestamp(
  timestamp =
    getGardenWorldNow()
) {
  const calendar =
    getGardenWorldCalendarParts(
      timestamp
    );


  if (!calendar) {
    return null;
  }


  /*
    Afternoon Rest 不跨午夜，
    所以只檢查目前這一天。
  */
  const dateKey =
    calendar.dateKey;


  const events =
    getGardenAfternoonRestChatTimeline(
      dateKey
    );


  const matched =
    events.find(
      (event) =>
        event.timelineMinute ===
        calendar.minuteOfDay
    ) ??
    null;


  if (!matched) {
    return null;
  }


  const startedAt =
    getGardenAfternoonRestChatEventStartedAt(
      matched
    );


  if (
    !isValidGardenWorldTimestamp(
      startedAt
    )
  ) {
    return null;
  }


  return Object.freeze({
    ...matched,

    sourceDateKey:
      dateKey,

    worldDateKey:
      calendar.dateKey,

    worldTime:
      calendar.timeKey,

    startedAt,
  });
}

function getGardenAfternoonRestChatSpot(
  event
) {
  if (!event) {
    return null;
  }


  const sourceDateKey =
    event.sourceDateKey ??
    event.dateKey ??
    null;


  const eventId =
    event.id ??
    null;


  if (
    typeof sourceDateKey !==
      "string" ||
    !sourceDateKey ||
    typeof eventId !==
      "string" ||
    !eventId
  ) {
    return null;
  }


  const validSpots =
    GARDEN_CHAT_SPOTS.filter(
      (spot) =>
        isGardenChatSpotValidInScene(
          "courtyard",
          spot
        )
    );


  if (
    validSpots.length === 0
  ) {
    return null;
  }


  return (
    pickGardenWorldDeterministic(
      validSpots,

      "officialRoutine",

      GARDEN_OFFICIAL_ROUTINE_VERSION,

      "afternoonRestChat",

      sourceDateKey,

      eventId,

      "chatSpot"
    )
  );
}


function getGardenAfternoonRestChatLoopCount(
  dateKey,
  eventId
) {
  if (
    typeof dateKey !==
      "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateKey
    ) ||
    typeof eventId !==
      "string" ||
    !eventId
  ) {
    return null;
  }


  /*
    午後休息聊天刻意比
    Night Chat 稍短：
    2 ～ 3 loops。
  */
  return (
    getGardenWorldDeterministicInt(
      2,
      3,

      "officialRoutine",

      GARDEN_OFFICIAL_ROUTINE_VERSION,

      "afternoonRestChat",

      dateKey,

      eventId,

      "loopCount"
    )
  );
}


function createGardenAfternoonRestChatApproachPlans(
  event
) {
  if (!event) {
    return null;
  }


  const startedAt =
    getGardenAfternoonRestChatEventStartedAt(
      event
    );


  if (
    !isValidGardenWorldTimestamp(
      startedAt
    )
  ) {
    return null;
  }


  const spot =
    getGardenAfternoonRestChatSpot(
      event
    );


  if (
    !spot?.chifuyu ||
    !spot?.chinatsu
  ) {
    return null;
  }


  /*
    午後聊天不是從 Wander 出發。

    起點必須是兩人的正式
    Afternoon Rest Activity Spot。
  */
  const chifuyuRestSpot =
    getGardenActivitySpot(
      "courtyard",
      "courtyard-rest-01",
      GARDEN_CHARACTER_ACTIVITY
        .REST
    );


  const chinatsuRestSpot =
    getGardenActivitySpot(
      "courtyard",
      "courtyard-rest-02",
      GARDEN_CHARACTER_ACTIVITY
        .REST
    );


  if (
    !chifuyuRestSpot ||
    !chinatsuRestSpot
  ) {
    return null;
  }


  const chifuyuPlan =
    createGardenCanonicalEventApproachPlan({
      characterId:
        "chifuyu",

      sceneId:
        "courtyard",

      eventId:
        event.id,

      startPoint: {
        x:
          chifuyuRestSpot.x,

        y:
          chifuyuRestSpot.y,
      },

      startDirection:
        chifuyuRestSpot.direction,

      targetPoint: {
        x:
          spot.chifuyu.x,

        y:
          spot.chifuyu.y,
      },

      targetDirection:
        spot.chifuyu.direction,

      startedAt,
    });


  const chinatsuPlan =
    createGardenCanonicalEventApproachPlan({
      characterId:
        "chinatsu",

      sceneId:
        "courtyard",

      eventId:
        event.id,

      startPoint: {
        x:
          chinatsuRestSpot.x,

        y:
          chinatsuRestSpot.y,
      },

      startDirection:
        chinatsuRestSpot.direction,

      targetPoint: {
        x:
          spot.chinatsu.x,

        y:
          spot.chinatsu.y,
      },

      targetDirection:
        spot.chinatsu.direction,

      startedAt,
    });


  if (
    !chifuyuPlan ||
    !chinatsuPlan
  ) {
    return null;
  }


  const completedAt =
    Math.max(
      chifuyuPlan.endsAt,
      chinatsuPlan.endsAt
    );


return Object.freeze({
  routineId:
    "afternoonRestChat",

  eventId:
    event.id,

  sourceDateKey:
      event.sourceDateKey ??
      event.dateKey ??
      null,

    sceneId:
      "courtyard",

    parentActivity:
      GARDEN_CHARACTER_ACTIVITY
        .REST,

    startedAt,

    completedAt,

    spotName:
      spot.name ??
      null,

    chifuyu:
      chifuyuPlan,

    chinatsu:
      chinatsuPlan,
  });
}



function resolveGardenAfternoonRestChatApproachPlans(
  pairPlan,
  timestamp =
    getGardenWorldNow()
) {
  if (
    !pairPlan ||
    !pairPlan.chifuyu ||
    !pairPlan.chinatsu ||
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return null;
  }


  const chifuyu =
    resolveGardenCanonicalEventApproach(
      pairPlan.chifuyu,
      timestamp
    );


  const chinatsu =
    resolveGardenCanonicalEventApproach(
      pairPlan.chinatsu,
      timestamp
    );


  if (
    !chifuyu ||
    !chinatsu
  ) {
    return null;
  }


  const completed =
    chifuyu.completed === true &&
    chinatsu.completed === true;


  return Object.freeze({
    eventId:
      pairPlan.eventId,

    sourceDateKey:
      pairPlan.sourceDateKey ??
      null,

    sceneId:
      pairPlan.sceneId ??
      "courtyard",

    parentActivity:
      pairPlan.parentActivity ??
      GARDEN_CHARACTER_ACTIVITY
        .REST,

    startedAt:
      pairPlan.startedAt,

    completedAt:
      pairPlan.completedAt,

    timestamp,

    completed,

    phase:
      timestamp <
        pairPlan.startedAt
        ? "pending"
        : completed
          ? "completed"
          : "approach",

    chifuyu,

    chinatsu,
  });
}


function resolveGardenCanonicalChatApproachPairPlan(
  pairPlan,
  timestamp =
    getGardenWorldNow()
) {
  if (!pairPlan) {
    return null;
  }


  switch (
    pairPlan.routineId
  ) {
    case "moonBridgeNightChat":
      return (
        resolveGardenMoonBridgeNightChatApproachPlans(
          pairPlan,
          timestamp
        )
      );


    case "afternoonRestChat":
      return (
        resolveGardenAfternoonRestChatApproachPlans(
          pairPlan,
          timestamp
        )
      );


    default:
      return null;
  }
}



function provideGardenOfficialWorldSchedules(
  timestamp =
    getGardenWorldNow()
) {
  const calendar =
    getGardenWorldCalendarParts(
      timestamp
    );


  if (!calendar) {
    return Object.freeze([]);
  }


  const currentDateKey =
    calendar.dateKey;


  const previousDateKey =
    shiftGardenScheduleDateKey(
      currentDateKey,
      -1
    );


  if (!previousDateKey) {
    return Object.freeze([]);
  }


  /*
    昨天：
    用來承接未來可能跨午夜的 Activity。

    今天：
    正式 Resolver 使用。
  */
  const previousSchedule =
    generateGardenOfficialDailySchedule(
      previousDateKey
    );


  const currentSchedule =
    generateGardenOfficialDailySchedule(
      currentDateKey
    );


  const schedules = [
    previousSchedule,
    currentSchedule,
  ].filter(
    isValidGardenDailySchedule
  );


  return Object.freeze(
    schedules
  );
}


function inspectGardenOfficialSchedule(
  timestamp =
    getGardenWorldNow()
) {
  const schedules =
    provideGardenOfficialWorldSchedules(
      timestamp
    );


  const calendar =
    getGardenWorldCalendarParts(
      timestamp
    );


  const currentSchedule =
    schedules.find(
      (schedule) =>
        schedule.dateKey ===
        calendar?.dateKey
    );


  if (!currentSchedule) {
    console.warn(
      "[Garden Official Schedule] current schedule unavailable"
    );

    return null;
  }


  const rows =
    currentSchedule.entries.map(
      (entry) => ({
        character:
          entry.characterId,

        intent:
          entry.intentId,

        activity:
          entry.activity
            ?.selectedActivityId ??
          null,

        scene:
          entry.target
            ?.sceneId ??
          null,

        start:
          entry.start
            ?.time ??
          null,

        end:
          entry.end
            ?.time ??
          null,

        duration:
          entry.durationMinutes,

        priority:
          entry.priority,
      })
    );


  console.log(
    "[Garden Official Schedule]",
    {
      dateKey:
        calendar.dateKey,

      time:
        calendar.timeKey,

      schedule:
        currentSchedule,
    }
  );


  console.table(
    rows
  );


  return currentSchedule;
}



setGardenWorldScheduleProvider(
  provideGardenOfficialWorldSchedules
);



function getGardenWorldSchedulesFromProvider(
  context
) {
  if (
    !context ||
    !isValidGardenWorldTimestamp(
      context.resumedAt
    )
  ) {
    return [];
  }


  if (
    typeof gardenWorldScheduleProvider !==
    "function"
  ) {
    return [];
  }


  let provided;


  try {
    provided =
      gardenWorldScheduleProvider(
        context.resumedAt,
        context
      );

  } catch (err) {
    console.error(
      "[Garden Schedule] provider failed:",
      err
    );

    return [];
  }


  /*
    Reconciliation 必須同步。

    Provider 也不可以偷偷回 Promise。
  */
  if (
    provided &&
    typeof provided.then ===
      "function"
  ) {
    console.error(
      "[Garden Schedule] provider must be synchronous"
    );

    return [];
  }


  return (
    normalizeGardenDailyScheduleCollection(
      provided
    )
  );
}

function reconcileGardenScheduleSystemWithSchedules(
  context,
  schedules,
  options = {}
) {
  if (
    !context ||
    !isValidGardenWorldTimestamp(
      context.resumedAt
    )
  ) {
    return Object.freeze({
      ok:
        false,

      reason:
        "invalidContext",

      results:
        Object.freeze([]),
    });
  }


  const safeSchedules =
    normalizeGardenDailyScheduleCollection(
      schedules
    );


  if (
    safeSchedules.length ===
    0
  ) {
    return Object.freeze({
      ok:
        true,

      reason:
        "noSchedules",

      timestamp:
        context.resumedAt,

      scheduleCount:
        0,

      results:
        Object.freeze([]),
    });
  }


  const worldPoint =
    getGardenScheduleWorldPoint(
      context.resumedAt
    );


  if (!worldPoint) {
    return Object.freeze({
      ok:
        false,

      reason:
        "invalidWorldPoint",

      results:
        Object.freeze([]),
    });
  }


  /*
    正式：
    gardenCharacterWorldState

    Self-Test：
    可傳入 fake worldStates。
  */
  const worldStates =
    options.worldStates ??
    gardenCharacterWorldState;


  const characterIds =
    Array.isArray(
      options.characterIds
    )
      ? options.characterIds
      : Object.keys(
          worldStates
        );


  const results =
    [];


  for (
    const characterId of
    characterIds
  ) {
    const worldState =
      worldStates[
        characterId
      ];


    if (!worldState) {
      results.push(
        Object.freeze({
          characterId,

          ok:
            false,

          reason:
            "missingWorldState",
        })
      );

      continue;
    }


    const bridgeResult =
      executeGardenCharacterScheduleAtWorldPoint(
        safeSchedules,
        characterId,
        worldPoint,
        {
  worldState,

  travelFn:
    options.travelFn,

  setActivityFn:
    options.setActivityFn,

  spotApproachFn:
    options.spotApproachFn,

  worldTimestamp:
    context.resumedAt,
}
      );


    results.push(
      Object.freeze({
        characterId,

        ok:
          !!bridgeResult,

        bridgeResult:
          bridgeResult ??
          null,
      })
    );
  }


  return Object.freeze({
    ok:
      true,

    reason:
      "reconciled",

    timestamp:
      context.resumedAt,

    worldPoint,

    scheduleCount:
      safeSchedules.length,

    results:
      Object.freeze(
        results
      ),
  });
}

function reconcileGardenScheduleSystem(
  context
) {
  const schedules =
    getGardenWorldSchedulesFromProvider(
      context
    );


  /*
    Provider 還沒啟用時，
    正式網站什麼都不做。
  */
  if (
    schedules.length ===
    0
  ) {
    return Object.freeze({
      ok:
        true,

      action:
        "none",

      reason:
        isGardenWorldScheduleProviderActive()
          ? "providerReturnedNoSchedules"
          : "providerInactive",

      scheduleCount:
        0,

      results:
        Object.freeze([]),
    });
  }


  return (
    reconcileGardenScheduleSystemWithSchedules(
      context,
      schedules
    )
  );
}


/*
  Travel = 200

  Schedule = 100

  所以永遠先完成 Travel reconciliation，
  再處理目前 Schedule。
*/
registerGardenWorldReconciliationHandler(
  "schedule",
  reconcileGardenScheduleSystem,
  {
    priority: 100,
  }
);


function reconcileGardenCanonicalWanderSystem(
  context
) {
  if (
    !context ||
    !isValidGardenWorldTimestamp(
      context.resumedAt
    )
  ) {
    return Object.freeze({
      ok: false,

      reason:
        "invalidContext",

      results:
        Object.freeze([]),
    });
  }


  const results =
    [];


  for (
    const characterId of
    Object.keys(
      gardenCharacterWorldState
    )
  ) {
    const result =
      applyGardenCanonicalWanderRuntimeForCharacter(
        characterId,
        context.resumedAt
      );


    results.push(
      Object.freeze({
        characterId,

        owned:
          result.owned,

        applied:
          result.applied,

        reason:
          result.reason,

        spatialSource:
          result.spatialSource ??
          null,

        continuityPhase:
          result.continuityPhase ??
          null,
      })
    );
  }


  return Object.freeze({
    ok: true,

    reason:
      "reconciled",

    timestamp:
      context.resumedAt,

    results:
      Object.freeze(
        results
      ),
  });
}


registerGardenWorldReconciliationHandler(
  "canonicalWander",
  reconcileGardenCanonicalWanderSystem,
  {
    /*
      必須晚於 Schedule。

      Schedule 可能剛在 GAP →
      WANDER 時建立 continuity，
      這一層再於同一 resumedAt
      把它真正套到 Runtime。
    */
    priority: 50,
  }
);


function runGardenScheduleReconciliationSelfTest() {
  const dateKey =
    "2026-09-23";


  /*
    12:00～13:00
    千冬應前往賞月橋。
  */
  const definition =
    createGardenScheduleIntentDefinition({
      id:
        "reconciliation-test-meal",

      characterId:
        "chifuyu",

      intentId:
        "meal",

      windowStart:
        "12:00",

      windowEnd:
        "12:00",

      durationMinMinutes:
        60,

      durationMaxMinutes:
        60,

      sceneId:
        "moonBridge",

      activityId:
        "meal",

      fallbackActivityId:
        "wander",

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .HIGH,
    });


  const schedule =
    generateGardenDailySchedule(
      [
        definition,
      ],
      dateKey
    );


  /*
    12:15 JST
    =
    03:15 UTC
  */
  const activeContext =
    createGardenWorldResumeContext(
      Date.parse(
        "2026-09-23T02:30:00Z"
      ),

      Date.parse(
        "2026-09-23T03:15:00Z"
      ),

      "selfTest",

      "selfTest"
    );


  /*
    14:00 JST
    =
    05:00 UTC
  */
  const gapContext =
    createGardenWorldResumeContext(
      Date.parse(
        "2026-09-23T04:30:00Z"
      ),

      Date.parse(
        "2026-09-23T05:00:00Z"
      ),

      "selfTest",

      "selfTest"
    );


  const fakeState = {
    chifuyu: {
      sceneId:
        "courtyard",

      activity:
        GARDEN_CHARACTER_ACTIVITY
          .WANDER,

      activityData:
        null,

      travel:
        null,
    },
  };


  let travelCallCount =
    0;


  let activityCallCount =
    0;


  const fakeTravelFn =
    (
      characterId,
      targetSceneId
    ) => {
      travelCallCount +=
        1;


      const state =
        fakeState[
          characterId
        ];


      state.travel = {
        fromSceneId:
          state.sceneId,

        toSceneId:
          targetSceneId,

        phase:
          "walkingToExit",
      };


      state.activity =
        GARDEN_CHARACTER_ACTIVITY
          .TRAVEL;


      return true;
    };


  const fakeSetActivityFn =
    (
      characterId,
      activity,
      activityData = null
    ) => {
      activityCallCount +=
        1;


      const state =
        fakeState[
          characterId
        ];


      state.activity =
        activity;


      state.activityData =
        activityData;


      return true;
    };


  /*
    =========================
    1. Resume at 12:15
       → Schedule 要求 Travel
    =========================
  */
  const first =
    reconcileGardenScheduleSystemWithSchedules(
      activeContext,
      schedule,
      {
        worldStates:
          fakeState,

        characterIds: [
          "chifuyu",
        ],

        travelFn:
          fakeTravelFn,

        setActivityFn:
          fakeSetActivityFn,
      }
    );


  /*
    =========================
    2. 同一時間再次 reconciliation

       已經 Travel，
       不得再開始第二次。
    =========================
  */
  const second =
    reconcileGardenScheduleSystemWithSchedules(
      activeContext,
      schedule,
      {
        worldStates:
          fakeState,

        characterIds: [
          "chifuyu",
        ],

        travelFn:
          fakeTravelFn,

        setActivityFn:
          fakeSetActivityFn,
      }
    );


  /*
    模擬 Travel 已完成。
  */
  fakeState.chifuyu.travel =
    null;

  fakeState.chifuyu.sceneId =
    "moonBridge";

  fakeState.chifuyu.activity =
    GARDEN_CHARACTER_ACTIVITY
      .WANDER;

  fakeState.chifuyu.activityData =
    null;


  /*
    =========================
    3. 12:15 再 reconciliation

       已在正確 Scene，
       → Activity
    =========================
  */
  const third =
    reconcileGardenScheduleSystemWithSchedules(
      activeContext,
      schedule,
      {
        worldStates:
          fakeState,

        characterIds: [
          "chifuyu",
        ],

        travelFn:
          fakeTravelFn,

        setActivityFn:
          fakeSetActivityFn,
      }
    );


  /*
    =========================
    4. 14:00

       Schedule 已結束
       → Wander
    =========================
  */
  const fourth =
    reconcileGardenScheduleSystemWithSchedules(
      gapContext,
      schedule,
      {
        worldStates:
          fakeState,

        characterIds: [
          "chifuyu",
        ],

        travelFn:
          fakeTravelFn,

        setActivityFn:
          fakeSetActivityFn,
      }
    );


  const firstExecution =
    first
      ?.results
      ?.[0]
      ?.bridgeResult
      ?.execution;


  const secondExecution =
    second
      ?.results
      ?.[0]
      ?.bridgeResult
      ?.execution;


  const thirdExecution =
    third
      ?.results
      ?.[0]
      ?.bridgeResult
      ?.execution;


  const fourthExecution =
    fourth
      ?.results
      ?.[0]
      ?.bridgeResult
      ?.execution;


  const reconciliationSnapshot =
    getGardenWorldReconciliationSnapshot();


  const travelHandler =
    reconciliationSnapshot
      ?.handlers
      ?.find(
        (entry) =>
          entry.id ===
          "travel"
      );


  const scheduleHandler =
    reconciliationSnapshot
      ?.handlers
      ?.find(
        (entry) =>
          entry.id ===
          "schedule"
      );


  const checks = {
    scheduleExists:
      !!schedule,

    contextsCreated:
      !!activeContext &&
      !!gapContext,

    travelHandlerRegistered:
      travelHandler
        ?.priority ===
      200,

    scheduleHandlerRegistered:
      scheduleHandler
        ?.priority ===
      100,

    travelRunsBeforeSchedule:
      travelHandler
        ?.priority >
      scheduleHandler
        ?.priority,

    firstStartsTravel:
      firstExecution
        ?.reason ===
      "travelStarted",

    travelCalledOnce:
      travelCallCount ===
      1,

    secondPreservesTravel:
      secondExecution
        ?.reason ===
      "travelAlreadyInProgress",

    thirdAppliesActivity:
      thirdExecution
        ?.reason ===
      "activityApplied",

    semanticMealPreserved:
      third
        ?.results
        ?.[0]
        ?.bridgeResult
        ?.decision
        ?.semanticActivityId ===
      "meal",

    fourthReturnsToWander:
      fourthExecution
        ?.reason ===
      "wanderApplied",

    activityCalledTwice:
      activityCallCount ===
      2,

    officialProviderStillActive:
  isGardenWorldScheduleProviderActive() ===
  true,

officialProviderUntouched:
  gardenWorldScheduleProvider ===
  provideGardenOfficialWorldSchedules,
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    first,

    second,

    third,

    fourth,

    travelCallCount,

    activityCallCount,

    finalFakeState:
      fakeState.chifuyu,

    reconciliationSnapshot,
  };


  if (pass) {
    console.log(
      "[Garden Schedule Reconciliation Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Schedule Reconciliation Self-Test] FAIL",
      result
    );
  }


  return result;
}


/* =========================
   Garden REST Activity Self-Test
========================= */

function runGardenRestActivitySelfTest() {
  const fakeState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,

    activityData:
      null,

    travel:
      null,
  };


  /*
    =========================
    Ambient Eligibility
    =========================
  */

  const wanderAllowed =
    canGardenCharacterUseAmbientWander(
      "chifuyu",
      fakeState
    );


  fakeState.activity =
    GARDEN_CHARACTER_ACTIVITY
      .REST;


  const restBlocked =
    !canGardenCharacterUseAmbientWander(
      "chifuyu",
      fakeState
    );


  fakeState.activity =
    GARDEN_CHARACTER_ACTIVITY
      .TRAVEL;


  fakeState.travel = {
    phase:
      "walkingToExit",
  };


  const travelBlocked =
    !canGardenCharacterUseAmbientWander(
      "chifuyu",
      fakeState
    );


  fakeState.activity =
    GARDEN_CHARACTER_ACTIVITY
      .CHAT;

  fakeState.travel =
    null;


  const chatBlocked =
    !canGardenCharacterUseAmbientWander(
      "chifuyu",
      fakeState
    );


  /*
    =========================
    Bridge Runtime Recognition
    =========================
  */

  const definition =
    createGardenScheduleIntentDefinition({
      id:
        "rest-runtime-selftest",

      characterId:
        "chifuyu",

      intentId:
        "afternoonRest",

      windowStart:
        "15:00",

      windowEnd:
        "15:00",

      durationMinMinutes:
        60,

      durationMaxMinutes:
        60,

      sceneId:
        "courtyard",

      activityId:
        "rest",

      fallbackActivityId:
        "wander",

      priority:
        GARDEN_SCHEDULE_PRIORITY
          .NORMAL,
    });


  const schedule =
    generateGardenDailySchedule(
      [
        definition,
      ],
      "2026-09-23"
    );


  const point =
    createGardenScheduleWorldPoint(
      "2026-09-23",
      15 * 60 + 30
    );


  const bridgeFakeState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,

    activityData:
      null,

    travel:
      null,
  };


  let appliedActivity =
    null;


  let appliedActivityData =
    null;


  const fakeSetActivity =
    (
      characterId,
      activity,
      activityData
    ) => {
      appliedActivity =
        activity;

      appliedActivityData =
        activityData;

      bridgeFakeState.activity =
        activity;

      bridgeFakeState.activityData =
        activityData;

      return true;
    };


  const result =
    executeGardenCharacterScheduleAtWorldPoint(
      schedule,
      "chifuyu",
      point,
      {
        worldState:
          bridgeFakeState,

        setActivityFn:
          fakeSetActivity,

        travelFn:
          () => false,
      }
    );


  const checks = {
    restRegistered:
      GARDEN_CHARACTER_ACTIVITY
        .REST ===
      "rest",

    runtimeSupportsRest:
      isGardenRuntimeActivitySupported(
        "rest"
      ) ===
      true,

    wanderAmbientAllowed:
      wanderAllowed ===
      true,

    restBlocksAmbient:
      restBlocked ===
      true,

    travelBlocksAmbient:
      travelBlocked ===
      true,

    chatBlocksAmbient:
      chatBlocked ===
      true,

    bridgeChoosesActivity:
      result
        ?.decision
        ?.action ===
      GARDEN_SCHEDULE_BRIDGE_ACTION
        .ACTIVITY,

    semanticRest:
      result
        ?.decision
        ?.semanticActivityId ===
      "rest",

    runtimeRest:
      result
        ?.decision
        ?.runtimeActivityId ===
      GARDEN_CHARACTER_ACTIVITY
        .REST,

    executorAppliedRest:
      result
        ?.execution
        ?.reason ===
        "activityApplied" &&
      appliedActivity ===
        GARDEN_CHARACTER_ACTIVITY
          .REST,

    scheduleDataPreserved:
      appliedActivityData
        ?.semanticActivityId ===
      "rest",
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const selfTestResult = {
    pass,

    checks,

    bridgeResult:
      result,

    appliedActivity,

    appliedActivityData,
  };


  if (pass) {
    console.log(
      "[Garden REST Activity Self-Test] PASS",
      selfTestResult
    );

  } else {
    console.warn(
      "[Garden REST Activity Self-Test] FAIL",
      selfTestResult
    );
  }


  return selfTestResult;
}


function runGardenOfficialRoutineSelfTest() {
  /*
    JST：
    2026-09-23 12:00

    UTC：
    2026-09-23 03:00
  */
  const timestamp =
    Date.parse(
      "2026-09-23T03:00:00Z"
    );


  const first =
    provideGardenOfficialWorldSchedules(
      timestamp
    );


  const second =
    provideGardenOfficialWorldSchedules(
      timestamp
    );


  const currentSchedule =
    first.find(
      (schedule) =>
        schedule.dateKey ===
        "2026-09-23"
    );


  const previousSchedule =
    first.find(
      (schedule) =>
        schedule.dateKey ===
        "2026-09-22"
    );


  const restEntry =
    currentSchedule
      ?.entries
      ?.find(
        (entry) =>
          entry.definitionId ===
          "official-chifuyu-afternoon-rest"
      );


  let bridgeDecision =
    null;


  if (restEntry) {
    const middleMinute =
      restEntry.start.timelineMinute +
      restEntry.durationMinutes / 2;


    const point =
      createGardenScheduleWorldPointFromTimeline(
        "2026-09-23",
        middleMinute
      );


    bridgeDecision =
      createGardenScheduleBridgeDecision(
        first,
        "chifuyu",
        point,
        {
          worldState: {
            sceneId:
              "courtyard",

            activity:
              GARDEN_CHARACTER_ACTIVITY
                .WANDER,

            activityData:
              null,

            travel:
              null,
          },
        }
      );
  }


  const checks = {
    providerActive:
      isGardenWorldScheduleProviderActive() ===
      true,

    twoSchedulesGenerated:
      first.length ===
      2,

    previousDayExists:
      !!previousSchedule,

    currentDayExists:
      !!currentSchedule,

    restEntryExists:
      !!restEntry,

    correctCharacter:
      restEntry
        ?.characterId ===
      "chifuyu",

    correctIntent:
      restEntry
        ?.intentId ===
      "afternoonRest",

    runtimeActivityIsRest:
      restEntry
        ?.activity
        ?.selectedActivityId ===
      "rest",

    correctScene:
      restEntry
        ?.target
        ?.sceneId ===
      "courtyard",

correctSpot:
  restEntry
    ?.target
    ?.spotId ===
  "courtyard-rest-01",


    startWithinWindow:
      restEntry
        ?.start
        ?.timelineMinute >=
        14 * 60 &&
      restEntry
        ?.start
        ?.timelineMinute <=
        15 * 60 + 30,

    durationWithinRange:
      restEntry
        ?.durationMinutes >=
        30 &&
      restEntry
        ?.durationMinutes <=
        45,

    bridgeUsesRest:
      bridgeDecision
        ?.action ===
        GARDEN_SCHEDULE_BRIDGE_ACTION
          .ACTIVITY &&
      bridgeDecision
        ?.runtimeActivityId ===
        GARDEN_CHARACTER_ACTIVITY
          .REST,

bridgeTargetsSpot:
  bridgeDecision
    ?.targetSpotId ===
  "courtyard-rest-01" &&
  bridgeDecision
    ?.needsSpotMovement ===
  true,



    deterministic:
      JSON.stringify(first) ===
      JSON.stringify(second),

    currentReconciliationReady:
      typeof reconcileGardenWorldAtCurrentTime ===
      "function",
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    previousSchedule,

    currentSchedule,

    restEntry,

    bridgeDecision,
  };


  if (pass) {
    console.log(
      "[Garden Official Routine Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Official Routine Self-Test] FAIL",
      result
    );
  }


  return result;
}


/* =========================
   Garden Deterministic Wander Timeline
========================= */

const GARDEN_WANDER_TIMELINE_SCHEMA =
  "nanaharaGardenWanderTimeline";

const GARDEN_WANDER_TIMELINE_VERSION =
  1;


/*
  每 120 秒是一個 World Wander Slot。

  不是每兩分鐘才更新畫面。

  而是：
  每個兩分鐘區間都有一份固定的
  世界 Wander Plan。
*/
const GARDEN_WANDER_SLOT_SECONDS =
  120;


const GARDEN_WANDER_SLOTS_PER_DAY =
  Math.floor(
    86400 /
    GARDEN_WANDER_SLOT_SECONDS
  );


const GARDEN_WANDER_SEGMENT_TYPE =
  Object.freeze({
    IDLE:
      "idle",

    MOVE:
      "move",
  });


const gardenDeterministicWanderTargetCache =
  new Map();


function clearGardenDeterministicWanderTargetCache() {
  gardenDeterministicWanderTargetCache
    .clear();
}


function getGardenDeterministicWanderTargets(
  sceneId
) {
  const safeSceneId =
    normalizeGardenWorldDecisionToken(
      sceneId
    );


  if (!safeSceneId) {
    return Object.freeze([]);
  }


  /*
    Scene Target 是靜態資料。

    已整理過一次就直接從 cache 拿。
  */
  if (
    gardenDeterministicWanderTargetCache
      .has(
        safeSceneId
      )
  ) {
    return (
      gardenDeterministicWanderTargetCache
        .get(
          safeSceneId
        )
    );
  }


  const scene =
    getGardenSceneById(
      safeSceneId
    );


  if (!scene) {
    return Object.freeze([]);
  }


  const targets =
    (scene.autoTargets ?? [])
      .filter(
        (target) =>
          target &&
          typeof target.name ===
            "string" &&
          target.name.length > 0 &&
          Number.isFinite(
            target.x
          ) &&
          Number.isFinite(
            target.y
          ) &&
          isGardenWalkablePointInScene(
            safeSceneId,
            target.x,
            target.y
          )
      )
      .map(
        (
          target,
          index
        ) =>
          Object.freeze({
            index,

            id:
              String(
                target.name
              ),

            sceneId:
              safeSceneId,

            x:
              target.x,

            y:
              target.y,

            zone:
              target.zone ??
              null,
          })
      );


  const frozenTargets =
    Object.freeze(
      targets
    );


  gardenDeterministicWanderTargetCache
    .set(
      safeSceneId,
      frozenTargets
    );


  return frozenTargets;
}


function normalizeGardenWanderSlotAddress(
  dateKey,
  slotIndex
) {
  if (
    typeof dateKey !==
      "string" ||
    !Number.isInteger(
      slotIndex
    ) ||
    !Number.isInteger(
      getGardenScheduleDateDayNumber(
        dateKey
      )
    )
  ) {
    return null;
  }


  /*
    Math.floor 對負數也能正確處理：

    slot -1
    →
    前一天 slot 719
  */
  const dayOffset =
    Math.floor(
      slotIndex /
      GARDEN_WANDER_SLOTS_PER_DAY
    );


  const normalizedSlotIndex =
    slotIndex -
    dayOffset *
      GARDEN_WANDER_SLOTS_PER_DAY;


  const normalizedDateKey =
    shiftGardenScheduleDateKey(
      dateKey,
      dayOffset
    );


  if (!normalizedDateKey) {
    return null;
  }


  return Object.freeze({
    dateKey:
      normalizedDateKey,

    slotIndex:
      normalizedSlotIndex,
  });
}

function getGardenDeterministicWanderAnchor(
  options = {}
) {
  const characterId =
    normalizeGardenWorldDecisionToken(
      options.characterId
    );


  const sceneId =
    normalizeGardenWorldDecisionToken(
      options.sceneId
    );


  const address =
    normalizeGardenWanderSlotAddress(
      options.dateKey,
      options.slotIndex
    );


  if (
    !characterId ||
    !sceneId ||
    !address
  ) {
    return null;
  }


  const targets =
    getGardenDeterministicWanderTargets(
      sceneId
    );


  if (
    targets.length ===
    0
  ) {
    return null;
  }


  const targetIndex =
    getGardenWorldDailyDecisionInt({
      dateKey:
        address.dateKey,

      characterId,

      domainId:
        "wander",

      subjectId:
        `${sceneId}:anchor`,

      instanceId:
        `slot-${address.slotIndex}`,

      decisionId:
        "targetIndex",

      min:
        0,

      max:
        targets.length - 1,
    });


  if (
    !Number.isInteger(
      targetIndex
    )
  ) {
    return null;
  }


  const target =
    targets[
      targetIndex
    ];


  if (!target) {
    return null;
  }


  return Object.freeze({
    dateKey:
      address.dateKey,

    slotIndex:
      address.slotIndex,

    characterId,

    sceneId,

    targetIndex,

    targetId:
      target.id,

    x:
      target.x,

    y:
      target.y,

    zone:
      target.zone,
  });
}


function createGardenDeterministicWanderSlot(
  options = {}
) {
  const characterId =
    normalizeGardenWorldDecisionToken(
      options.characterId
    );


  const sceneId =
    normalizeGardenWorldDecisionToken(
      options.sceneId
    );


  const address =
    normalizeGardenWanderSlotAddress(
      options.dateKey,
      options.slotIndex
    );


  if (
    !characterId ||
    !sceneId ||
    !address
  ) {
    return null;
  }


  /*
    Slot 起點 Anchor。
  */
  const fromAnchor =
    getGardenDeterministicWanderAnchor({
      dateKey:
        address.dateKey,

      slotIndex:
        address.slotIndex,

      characterId,

      sceneId,
    });


  /*
    Slot 終點 Anchor。

    注意：
    使用「下一個 slot 的 anchor」。

    所以：

    slot N 的 to
    =
    slot N+1 的 from

    天然保證連續。
  */
  const nextAddress =
    normalizeGardenWanderSlotAddress(
      address.dateKey,
      address.slotIndex + 1
    );


  const toAnchor =
    nextAddress
      ? getGardenDeterministicWanderAnchor({
          dateKey:
            nextAddress.dateKey,

          slotIndex:
            nextAddress.slotIndex,

          characterId,

          sceneId,
        })
      : null;


  if (
    !fromAnchor ||
    !toAnchor
  ) {
    return null;
  }


  const slotStartSecondOfDay =
    address.slotIndex *
    GARDEN_WANDER_SLOT_SECONDS;


  const slotEndSecondOfDay =
    slotStartSecondOfDay +
    GARDEN_WANDER_SLOT_SECONDS;


  /*
    兩個 Anchor 剛好一樣時，
    這整個 Slot 就讓角色休息。

    這不是錯誤，
    反而讓 Wander 不會永遠走個不停。
  */
  const idleOnly =
    fromAnchor.targetId ===
    toAnchor.targetId;


  if (idleOnly) {
    return Object.freeze({
      schema:
        GARDEN_WANDER_TIMELINE_SCHEMA,

      version:
        GARDEN_WANDER_TIMELINE_VERSION,

      dateKey:
        address.dateKey,

      slotIndex:
        address.slotIndex,

      characterId,

      sceneId,

      slotStartSecondOfDay,

      slotEndSecondOfDay,

      fromAnchor,

      toAnchor,

      idleOnly:
        true,

      segments:
        Object.freeze([
          Object.freeze({
            type:
              GARDEN_WANDER_SEGMENT_TYPE
                .IDLE,

            startSecondOfDay:
              slotStartSecondOfDay,

            endSecondOfDay:
              slotEndSecondOfDay,

            anchor:
              fromAnchor,
          }),
        ]),
    });
  }


  /*
    用直線距離估算合理移動秒數。

    真正 Path Distance
    會在 12H-2 才計算。

    這裡只是 World Timeline
    的 timing model。
  */
  const dx =
    toAnchor.x -
    fromAnchor.x;


  const dy =
    (
      toAnchor.y -
      fromAnchor.y
    ) *
    1.15;


  const estimatedDistance =
    Math.sqrt(
      dx * dx +
      dy * dy
    );


  /*
    每日 deterministic walking speed。

    只是 Timeline speed，
    不是直接修改現有動畫速度。
  */
  const estimatedSpeed =
    getGardenWorldDailyDecisionInt({
      dateKey:
        address.dateKey,

      characterId,

      domainId:
        "wander",

      subjectId:
        `${sceneId}:slotTiming`,

      instanceId:
        `slot-${address.slotIndex}`,

      decisionId:
        "estimatedSpeed",

      min:
        55,

      max:
        75,
    }) ??
    65;


  const moveDurationSeconds =
    Math.max(
      8,

      Math.min(
        45,

        Math.round(
          estimatedDistance /
          estimatedSpeed
        )
      )
    );


  /*
    保證：

    Slot 開頭至少 idle 20 秒。

    Move 結束後
    至少保留 20 秒 idle。
  */
  const latestMoveStartOffset =
    Math.max(
      20,

      GARDEN_WANDER_SLOT_SECONDS -
        moveDurationSeconds -
        20
    );


  const moveStartOffset =
    getGardenWorldDailyDecisionInt({
      dateKey:
        address.dateKey,

      characterId,

      domainId:
        "wander",

      subjectId:
        `${sceneId}:slotTiming`,

      instanceId:
        `slot-${address.slotIndex}`,

      decisionId:
        "moveStartOffset",

      min:
        20,

      max:
        latestMoveStartOffset,
    }) ??
    20;


  const moveStartSecondOfDay =
    slotStartSecondOfDay +
    moveStartOffset;


  const moveEndSecondOfDay =
    moveStartSecondOfDay +
    moveDurationSeconds;


  return Object.freeze({
    schema:
      GARDEN_WANDER_TIMELINE_SCHEMA,

    version:
      GARDEN_WANDER_TIMELINE_VERSION,

    dateKey:
      address.dateKey,

    slotIndex:
      address.slotIndex,

    characterId,

    sceneId,

    slotStartSecondOfDay,

    slotEndSecondOfDay,

    fromAnchor,

    toAnchor,

    idleOnly:
      false,

    estimatedDistance,

    estimatedSpeed,

    moveDurationSeconds,

    moveStartSecondOfDay,

    moveEndSecondOfDay,

    segments:
      Object.freeze([
        /*
          IDLE BEFORE
        */
        Object.freeze({
          type:
            GARDEN_WANDER_SEGMENT_TYPE
              .IDLE,

          startSecondOfDay:
            slotStartSecondOfDay,

          endSecondOfDay:
            moveStartSecondOfDay,

          anchor:
            fromAnchor,
        }),

        /*
          MOVE
        */
        Object.freeze({
          type:
            GARDEN_WANDER_SEGMENT_TYPE
              .MOVE,

          startSecondOfDay:
            moveStartSecondOfDay,

          endSecondOfDay:
            moveEndSecondOfDay,

          fromAnchor,

          toAnchor,
        }),

        /*
          IDLE AFTER
        */
        Object.freeze({
          type:
            GARDEN_WANDER_SEGMENT_TYPE
              .IDLE,

          startSecondOfDay:
            moveEndSecondOfDay,

          endSecondOfDay:
            slotEndSecondOfDay,

          anchor:
            toAnchor,
        }),
      ]),
  });
}



function resolveGardenDeterministicWanderInSlot(
  slot,
  secondOfDay
) {
  if (
    !slot ||
    !Number.isFinite(
      secondOfDay
    ) ||
    secondOfDay <
      slot.slotStartSecondOfDay ||
    secondOfDay >=
      slot.slotEndSecondOfDay
  ) {
    return null;
  }


  const segment =
    slot.segments.find(
      (candidate) =>
        secondOfDay >=
          candidate.startSecondOfDay &&
        secondOfDay <
          candidate.endSecondOfDay
    );


  if (!segment) {
    return null;
  }


  let progress =
    0;


  if (
    segment.type ===
      GARDEN_WANDER_SEGMENT_TYPE
        .MOVE
  ) {
    const duration =
      segment.endSecondOfDay -
      segment.startSecondOfDay;


    if (
      duration > 0
    ) {
      progress =
        Math.max(
          0,

          Math.min(
            1,

            (
              secondOfDay -
              segment.startSecondOfDay
            ) /
            duration
          )
        );
    }
  }


  return Object.freeze({
    dateKey:
      slot.dateKey,

    slotIndex:
      slot.slotIndex,

    characterId:
      slot.characterId,

    sceneId:
      slot.sceneId,

    secondOfDay,

    segmentType:
      segment.type,

    progress,

    segment,

    slot,
  });
}


function resolveGardenDeterministicWanderAtTimestamp(
  characterId,
  sceneId,
  timestamp =
    getGardenWorldNow()
) {
  const calendar =
    getGardenWorldCalendarParts(
      timestamp
    );


  if (!calendar) {
    return null;
  }


  const slotIndex =
    Math.floor(
      calendar.secondOfDay /
      GARDEN_WANDER_SLOT_SECONDS
    );


  const slot =
    createGardenDeterministicWanderSlot({
      dateKey:
        calendar.dateKey,

      slotIndex,

      characterId,

      sceneId,
    });


  if (!slot) {
    return null;
  }


  return (
    resolveGardenDeterministicWanderInSlot(
      slot,
      calendar.secondOfDay
    )
  );
}



function inspectGardenDeterministicWander(
  characterId =
    "chifuyu",

  sceneId =
    gardenCharacterWorldState[
      characterId
    ]?.sceneId ??
    "courtyard",

  timestamp =
    getGardenWorldNow()
) {
  const result =
    resolveGardenDeterministicWanderAtTimestamp(
      characterId,
      sceneId,
      timestamp
    );


  if (!result) {
    console.warn(
      "[Garden Wander Timeline] unavailable"
    );

    return null;
  }


  console.table([
    {
      character:
        result.characterId,

      scene:
        result.sceneId,

      date:
        result.dateKey,

      slot:
        result.slotIndex,

      state:
        result.segmentType,

      from:
        result.segment
          .fromAnchor
          ?.targetId ??
        result.segment
          .anchor
          ?.targetId ??
        null,

      to:
        result.segment
          .toAnchor
          ?.targetId ??
        null,

      progress:
        Number(
          result.progress.toFixed(
            3
          )
        ),
    },
  ]);


  return result;
}



function runGardenDeterministicWanderTimelineSelfTest() {
  const dateKey =
    "2026-09-23";


  const characterId =
    "chifuyu";


  const sceneId =
    "courtyard";


  const targets =
    getGardenDeterministicWanderTargets(
      sceneId
    );


  const slotIndex =
    100;


  const first =
    createGardenDeterministicWanderSlot({
      dateKey,
      slotIndex,
      characterId,
      sceneId,
    });


  const second =
    createGardenDeterministicWanderSlot({
      dateKey,
      slotIndex,
      characterId,
      sceneId,
    });


  const next =
    createGardenDeterministicWanderSlot({
      dateKey,
      slotIndex:
        slotIndex + 1,

      characterId,
      sceneId,
    });


  /*
    午夜連續性。
  */
  const lastSlot =
    createGardenDeterministicWanderSlot({
      dateKey,

      slotIndex:
        GARDEN_WANDER_SLOTS_PER_DAY -
        1,

      characterId,
      sceneId,
    });


  const nextDateKey =
    shiftGardenScheduleDateKey(
      dateKey,
      1
    );


  const nextDayFirstSlot =
    createGardenDeterministicWanderSlot({
      dateKey:
        nextDateKey,

      slotIndex:
        0,

      characterId,
      sceneId,
    });


  /*
    取 Slot 中央時間做 Resolver 測試。
  */
  const middleSecond =
    first
      ? first.slotStartSecondOfDay +
        GARDEN_WANDER_SLOT_SECONDS /
          2
      : null;


  const middleResolution =
    first &&
    Number.isFinite(
      middleSecond
    )
      ? resolveGardenDeterministicWanderInSlot(
          first,
          middleSecond
        )
      : null;


  /*
    Segment 必須完全接起來，
    中間不能有時間洞。
  */
  let segmentsContinuous =
    false;


  if (
    first &&
    first.segments.length > 0
  ) {
    segmentsContinuous =
      first.segments[0]
        .startSecondOfDay ===
        first.slotStartSecondOfDay &&
      first.segments[
        first.segments.length - 1
      ].endSecondOfDay ===
        first.slotEndSecondOfDay;


    for (
      let i = 1;
      i <
      first.segments.length;
      i++
    ) {
      if (
        first.segments[i - 1]
          .endSecondOfDay !==
        first.segments[i]
          .startSecondOfDay
      ) {
        segmentsContinuous =
          false;

        break;
      }
    }
  }


  const checks = {
    targetsAvailable:
      targets.length > 0,

    slotCreated:
      !!first,

    deterministic:
      JSON.stringify(first) ===
      JSON.stringify(second),

    nextSlotCreated:
      !!next,

    adjacentSlotContinuous:
      first
        ?.toAnchor
        ?.targetId ===
      next
        ?.fromAnchor
        ?.targetId,

    midnightSlotsCreated:
      !!lastSlot &&
      !!nextDayFirstSlot,

    midnightContinuous:
      lastSlot
        ?.toAnchor
        ?.targetId ===
      nextDayFirstSlot
        ?.fromAnchor
        ?.targetId,

    segmentsContinuous,

    middleResolves:
      !!middleResolution,

    validSegmentType:
      [
        GARDEN_WANDER_SEGMENT_TYPE
          .IDLE,

        GARDEN_WANDER_SEGMENT_TYPE
          .MOVE,
      ].includes(
        middleResolution
          ?.segmentType
      ),

    progressValid:
      Number.isFinite(
        middleResolution
          ?.progress
      ) &&
      middleResolution
        .progress >= 0 &&
      middleResolution
        .progress <= 1,
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    targets,

    first,

    next,

    lastSlot,

    nextDayFirstSlot,

    middleResolution,
  };


  if (pass) {
    console.log(
      "[Garden Deterministic Wander Timeline Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Deterministic Wander Timeline Self-Test] FAIL",
      result
    );
  }


  return result;
}

/* =========================
   Garden Deterministic Wander Position
========================= */

const GARDEN_WANDER_PATH_SCHEMA =
  "nanaharaGardenWanderPath";

const GARDEN_WANDER_PATH_VERSION =
  1;


/*
  同一條 Scene Wander 路線
  只做一次 Pathfinding。

  Key：
  scene + from + to
*/
const gardenDeterministicWanderPathCache =
  new Map();


function clearGardenDeterministicWanderPathCache() {
  gardenDeterministicWanderPathCache
    .clear();
}


/* =========================
   Wander Path Cache Key
========================= */

function createGardenDeterministicWanderPathKey(
  fromAnchor,
  toAnchor
) {
  if (
    !fromAnchor ||
    !toAnchor ||
    !fromAnchor.sceneId ||
    !toAnchor.sceneId ||
    fromAnchor.sceneId !==
      toAnchor.sceneId ||
    !fromAnchor.targetId ||
    !toAnchor.targetId
  ) {
    return null;
  }


  return [
    `v${GARDEN_WANDER_PATH_VERSION}`,

    fromAnchor.sceneId,

    fromAnchor.targetId,

    toAnchor.targetId,
  ].join("|");
}


/* =========================
   Wander Path Builder
========================= */

function getGardenDeterministicWanderPath(
  fromAnchor,
  toAnchor
) {
  const cacheKey =
    createGardenDeterministicWanderPathKey(
      fromAnchor,
      toAnchor
    );


  if (!cacheKey) {
    return null;
  }


  /*
    已經算過同一條路，
    直接從 cache 取得。

    正式 Runtime 不可以
    每幀重新跑 Pathfinding。
  */
  if (
    gardenDeterministicWanderPathCache
      .has(
        cacheKey
      )
  ) {
    return (
      gardenDeterministicWanderPathCache
        .get(
          cacheKey
        )
    );
  }


  const sceneId =
    fromAnchor.sceneId;


  /*
    同一個 Anchor。

    正常 12H-1 會把這種情況
    判成 idleOnly，
    這裡仍然做保險。
  */
  if (
    fromAnchor.targetId ===
    toAnchor.targetId
  ) {
    const stationaryPath =
      Object.freeze({
        schema:
          GARDEN_WANDER_PATH_SCHEMA,

        version:
          GARDEN_WANDER_PATH_VERSION,

        key:
          cacheKey,

        sceneId,

        fromTargetId:
          fromAnchor.targetId,

        toTargetId:
          toAnchor.targetId,

        points:
          Object.freeze([
            Object.freeze({
              x:
                fromAnchor.x,

              y:
                fromAnchor.y,
            }),
          ]),

        cumulativeDistances:
          Object.freeze([
            0,
          ]),

        totalDistance:
          0,
      });


    gardenDeterministicWanderPathCache
      .set(
        cacheKey,
        stationaryPath
      );


    return stationaryPath;
  }


  /*
    使用既有 Garden scene-aware
    Pathfinding。

    注意：

    findGardenPath()
    回傳的 path 不包含 start，
    所以後面會自己補回去。
  */
  const rawPath =
    findGardenPath(
      {
        x:
          fromAnchor.x,

        y:
          fromAnchor.y,
      },

      {
        x:
          toAnchor.x,

        y:
          toAnchor.y,
      },

      sceneId
    );


  if (
    !Array.isArray(
      rawPath
    ) ||
    rawPath.length ===
      0
  ) {
    console.warn(
      "[Garden Wander] no path:",
      fromAnchor.targetId,
      "→",
      toAnchor.targetId,
      sceneId
    );

    return null;
  }


  /*
    建立完整 polyline：

    from
    → waypoint
    → waypoint
    → to
  */
  const points = [
    {
      x:
        fromAnchor.x,

      y:
        fromAnchor.y,
    },

    ...rawPath.map(
      (point) => ({
        x:
          point.x,

        y:
          point.y,
      })
    ),
  ];


  /*
    安全移除連續重複點。
  */
  const cleanedPoints =
    [];


  for (
    const point of
    points
  ) {
    const previous =
      cleanedPoints[
        cleanedPoints.length - 1
      ];


    if (
      previous &&
      previous.x ===
        point.x &&
      previous.y ===
        point.y
    ) {
      continue;
    }


    cleanedPoints.push(
      point
    );
  }


  if (
    cleanedPoints.length <
    2
  ) {
    return null;
  }


  /*
    每一個 waypoint
    對應整條路已經走過的距離。

    例如：

    0
    120
    310
    480
  */
  const cumulativeDistances =
    [0];


  let totalDistance =
    0;


  for (
    let i = 1;
    i <
    cleanedPoints.length;
    i++
  ) {
    const previous =
      cleanedPoints[
        i - 1
      ];


    const current =
      cleanedPoints[
        i
      ];


    const dx =
      current.x -
      previous.x;


    const dy =
      current.y -
      previous.y;


    totalDistance +=
      Math.sqrt(
        dx * dx +
        dy * dy
      );


    cumulativeDistances.push(
      totalDistance
    );
  }


  const frozenPoints =
    Object.freeze(
      cleanedPoints.map(
        (point) =>
          Object.freeze({
            x:
              point.x,

            y:
              point.y,
          })
      )
    );


  const pathRecord =
    Object.freeze({
      schema:
        GARDEN_WANDER_PATH_SCHEMA,

      version:
        GARDEN_WANDER_PATH_VERSION,

      key:
        cacheKey,

      sceneId,

      fromTargetId:
        fromAnchor.targetId,

      toTargetId:
        toAnchor.targetId,

      points:
        frozenPoints,

      cumulativeDistances:
        Object.freeze([
          ...cumulativeDistances,
        ]),

      totalDistance,
    });


  gardenDeterministicWanderPathCache
    .set(
      cacheKey,
      pathRecord
    );


  return pathRecord;
}

function sampleGardenDeterministicWanderPath(
  pathRecord,
  progress
) {
  if (
    !pathRecord ||
    !Array.isArray(
      pathRecord.points
    ) ||
    pathRecord.points.length ===
      0 ||
    !Number.isFinite(
      progress
    )
  ) {
    return null;
  }


  const safeProgress =
    Math.max(
      0,
      Math.min(
        1,
        progress
      )
    );


  /*
    只有一個點，
    就直接停在該點。
  */
  if (
    pathRecord.points.length ===
      1 ||
    pathRecord.totalDistance <=
      0
  ) {
    const point =
      pathRecord.points[0];


    return Object.freeze({
      x:
        point.x,

      y:
        point.y,

      direction:
        1,

      segmentIndex:
        0,

      segmentProgress:
        0,

      pathProgress:
        safeProgress,

      distance:
        0,
    });
  }


  const targetDistance =
    pathRecord.totalDistance *
    safeProgress;


  /*
    progress = 1
    強制精準落在最後一點，
    避免浮點數問題。
  */
  if (
    safeProgress >=
    1
  ) {
    const lastIndex =
      pathRecord.points.length -
      1;


    const previous =
      pathRecord.points[
        lastIndex - 1
      ];

    const last =
      pathRecord.points[
        lastIndex
      ];


    const dx =
      last.x -
      previous.x;


    return Object.freeze({
      x:
        last.x,

      y:
        last.y,

      direction:
        Math.abs(dx) > 2
          ? dx > 0
            ? 1
            : -1
          : 1,

      segmentIndex:
        lastIndex - 1,

      segmentProgress:
        1,

      pathProgress:
        1,

      distance:
        pathRecord.totalDistance,
    });
  }


  /*
    找出 targetDistance
    落在哪兩個 waypoint 之間。
  */
  let segmentIndex =
    0;


  for (
    let i = 1;
    i <
    pathRecord
      .cumulativeDistances
      .length;
    i++
  ) {
    if (
      targetDistance <=
      pathRecord
        .cumulativeDistances[i]
    ) {
      segmentIndex =
        i - 1;

      break;
    }
  }


  const from =
    pathRecord.points[
      segmentIndex
    ];


  const to =
    pathRecord.points[
      segmentIndex + 1
    ];


  if (
    !from ||
    !to
  ) {
    return null;
  }


  const segmentStartDistance =
    pathRecord
      .cumulativeDistances[
        segmentIndex
      ];


  const segmentEndDistance =
    pathRecord
      .cumulativeDistances[
        segmentIndex + 1
      ];


  const segmentDistance =
    segmentEndDistance -
    segmentStartDistance;


  const segmentProgress =
    segmentDistance > 0
      ? (
          targetDistance -
          segmentStartDistance
        ) /
        segmentDistance
      : 0;


  const x =
    from.x +
    (
      to.x -
      from.x
    ) *
      segmentProgress;


  const y =
    from.y +
    (
      to.y -
      from.y
    ) *
      segmentProgress;


  const dx =
    to.x -
    from.x;


  const direction =
    Math.abs(dx) > 2
      ? dx > 0
        ? 1
        : -1
      : 1;


  return Object.freeze({
    x,

    y,

    direction,

    segmentIndex,

    segmentProgress,

    pathProgress:
      safeProgress,

    distance:
      targetDistance,
  });
}

function resolveGardenDeterministicWanderPosition(
  wanderResolution
) {
  if (
    !wanderResolution ||
    !wanderResolution.segment
  ) {
    return null;
  }


  const {
    characterId,
    sceneId,
    segmentType,
    progress,
    segment,
  } =
    wanderResolution;


  /*
    =========================
    IDLE
    =========================
  */
  if (
    segmentType ===
      GARDEN_WANDER_SEGMENT_TYPE
        .IDLE
  ) {
    const anchor =
      segment.anchor;


    if (!anchor) {
      return null;
    }


    return Object.freeze({
      characterId,

      sceneId,

      segmentType,

      isMoving:
        false,

      x:
        anchor.x,

      y:
        anchor.y,

      /*
        Idle 不強迫改方向。

        Runtime Bridge 階段
        可以選擇保留上一個方向。
      */
      direction:
        null,

      progress:
        0,

      path:
        null,

      pathKey:
        null,

      pathDistance:
        0,

      fromTargetId:
        anchor.targetId,

      toTargetId:
        anchor.targetId,

      wanderResolution,
    });
  }


  /*
    =========================
    MOVE
    =========================
  */
  if (
    segmentType ===
      GARDEN_WANDER_SEGMENT_TYPE
        .MOVE
  ) {
    const fromAnchor =
      segment.fromAnchor;


    const toAnchor =
      segment.toAnchor;


    if (
      !fromAnchor ||
      !toAnchor
    ) {
      return null;
    }


    const path =
      getGardenDeterministicWanderPath(
        fromAnchor,
        toAnchor
      );


    if (!path) {
      return null;
    }


    const sampled =
      sampleGardenDeterministicWanderPath(
        path,
        progress
      );


    if (!sampled) {
      return null;
    }


    return Object.freeze({
      characterId,

      sceneId,

      segmentType,

      isMoving:
        true,

      x:
        sampled.x,

      y:
        sampled.y,

      direction:
        sampled.direction,

      progress:
        sampled.pathProgress,

      path,

      pathKey:
        path.key,

      pathDistance:
        path.totalDistance,

      pathSegmentIndex:
        sampled.segmentIndex,

      pathSegmentProgress:
        sampled.segmentProgress,

      fromTargetId:
        fromAnchor.targetId,

      toTargetId:
        toAnchor.targetId,

      wanderResolution,
    });
  }


  return null;
}


function resolveGardenDeterministicWanderPositionAtTimestamp(
  characterId,
  sceneId,
  timestamp =
    getGardenWorldNow()
) {
  const wanderResolution =
    resolveGardenDeterministicWanderAtTimestamp(
      characterId,
      sceneId,
      timestamp
    );


  if (!wanderResolution) {
    return null;
  }


  return (
    resolveGardenDeterministicWanderPosition(
      wanderResolution
    )
  );
}


function inspectGardenDeterministicWanderPosition(
  characterId =
    "chifuyu",

  sceneId =
    gardenCharacterWorldState[
      characterId
    ]?.sceneId ??
    "courtyard",

  timestamp =
    getGardenWorldNow()
) {
  const result =
    resolveGardenDeterministicWanderPositionAtTimestamp(
      characterId,
      sceneId,
      timestamp
    );


  if (!result) {
    console.warn(
      "[Garden Wander Position] unavailable"
    );

    return null;
  }


  console.table([
    {
      character:
        result.characterId,

      scene:
        result.sceneId,

      state:
        result.segmentType,

      moving:
        result.isMoving,

      from:
        result.fromTargetId,

      to:
        result.toTargetId,

      x:
        Number(
          result.x.toFixed(
            1
          )
        ),

      y:
        Number(
          result.y.toFixed(
            1
          )
        ),

      direction:
        result.direction,

      progress:
        Number(
          result.progress.toFixed(
            3
          )
        ),

      pathDistance:
        Number(
          result.pathDistance.toFixed(
            1
          )
        ),
    },
  ]);


  return result;
}

function runGardenDeterministicWanderPositionSelfTest() {
  const dateKey =
    "2026-09-23";


  const characterId =
    "chifuyu";


  const sceneId =
    "courtyard";


  /*
    找一個確實包含 MOVE 的 Slot。

    Self-Test 才掃，
    正式 Runtime 不會這樣做。
  */
  let moveSlot =
    null;


  for (
    let slotIndex = 0;
    slotIndex <
      GARDEN_WANDER_SLOTS_PER_DAY;
    slotIndex++
  ) {
    const candidate =
      createGardenDeterministicWanderSlot({
        dateKey,
        slotIndex,
        characterId,
        sceneId,
      });


    if (
      candidate &&
      !candidate.idleOnly
    ) {
      moveSlot =
        candidate;

      break;
    }
  }


  const moveSegment =
    moveSlot
      ?.segments
      ?.find(
        (segment) =>
          segment.type ===
          GARDEN_WANDER_SEGMENT_TYPE
            .MOVE
      ) ??
    null;


  const path =
    moveSegment
      ? getGardenDeterministicWanderPath(
          moveSegment.fromAnchor,
          moveSegment.toAnchor
        )
      : null;


  /*
    再拿一次，
    必須直接得到同一個 cache object。
  */
  const cachedPath =
    moveSegment
      ? getGardenDeterministicWanderPath(
          moveSegment.fromAnchor,
          moveSegment.toAnchor
        )
      : null;


  const start =
    path
      ? sampleGardenDeterministicWanderPath(
          path,
          0
        )
      : null;


  const middle =
    path
      ? sampleGardenDeterministicWanderPath(
          path,
          0.5
        )
      : null;


  const end =
    path
      ? sampleGardenDeterministicWanderPath(
          path,
          1
        )
      : null;


  const fakeResolution =
    moveSlot &&
    moveSegment
      ? Object.freeze({
          dateKey:
            moveSlot.dateKey,

          slotIndex:
            moveSlot.slotIndex,

          characterId,

          sceneId,

          secondOfDay:
            (
              moveSegment
                .startSecondOfDay +
              moveSegment
                .endSecondOfDay
            ) /
            2,

          segmentType:
            GARDEN_WANDER_SEGMENT_TYPE
              .MOVE,

          progress:
            0.5,

          segment:
            moveSegment,

          slot:
            moveSlot,
        })
      : null;


  const firstPosition =
    fakeResolution
      ? resolveGardenDeterministicWanderPosition(
          fakeResolution
        )
      : null;


  const secondPosition =
    fakeResolution
      ? resolveGardenDeterministicWanderPosition(
          fakeResolution
        )
      : null;


  const startMatchesAnchor =
    !!(
      start &&
      moveSegment &&
      Math.abs(
        start.x -
        moveSegment
          .fromAnchor.x
      ) <
        0.001 &&
      Math.abs(
        start.y -
        moveSegment
          .fromAnchor.y
      ) <
        0.001
    );


  const endMatchesAnchor =
    !!(
      end &&
      moveSegment &&
      Math.abs(
        end.x -
        moveSegment
          .toAnchor.x
      ) <
        0.001 &&
      Math.abs(
        end.y -
        moveSegment
          .toAnchor.y
      ) <
        0.001
    );


  const middleWalkable =
    !!(
      middle &&
      isGardenWalkablePointInScene(
        sceneId,
        middle.x,
        middle.y
      )
    );


  const checks = {
    moveSlotFound:
      !!moveSlot,

    moveSegmentFound:
      !!moveSegment,

    pathCreated:
      !!path,

    pathHasAtLeastTwoPoints:
      path
        ?.points
        ?.length >=
      2,

    pathDistancePositive:
      path
        ?.totalDistance >
      0,

    cacheReused:
      path ===
      cachedPath,

    startMatchesAnchor,

    endMatchesAnchor,

    middleResolved:
      !!middle,

    middleWalkable,

    positionResolved:
      !!firstPosition,

    positionIsMoving:
      firstPosition
        ?.isMoving ===
      true,

    positionProgressHalf:
      Math.abs(
        (
          firstPosition
            ?.progress ??
          -1
        ) -
        0.5
      ) <
      0.001,

    deterministicPosition:
      JSON.stringify(
        firstPosition
      ) ===
      JSON.stringify(
        secondPosition
      ),

    directionValid:
      firstPosition
        ?.direction ===
        1 ||
      firstPosition
        ?.direction ===
        -1,
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    moveSlot,

    moveSegment,

    path,

    start,

    middle,

    end,

    firstPosition,

    cacheSize:
      gardenDeterministicWanderPathCache
        .size,
  };


  if (pass) {
    console.log(
      "[Garden Deterministic Wander Position Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Deterministic Wander Position Self-Test] FAIL",
      result
    );
  }


  return result;
}



/* =========================
   Garden Wander Runtime Bridge
   12H-3A — Canonical Runtime Sampler
========================= */

const GARDEN_WANDER_RUNTIME_BRIDGE_SCHEMA =
  "nanaharaGardenWanderRuntimeBridge";

const GARDEN_WANDER_RUNTIME_BRIDGE_VERSION =
  1;



/*
  =========================
  Canonical Wander Runtime
  =========================

  true：
  WANDER 的 spatial state
  正式由 Canonical World Time 接管。

  舊 local Auto Walk /
  Random Ambient Behavior
  不再控制世界狀態。
*/
const GARDEN_CANONICAL_WANDER_RUNTIME_ENABLED =
  true;


/*
  Runtime Clock Cache

  getGardenWorldCalendarParts()
  內部會做 timezone calendar parsing。

  所以同一個 epoch second
  只解析一次 Calendar。

  幀與幀之間的小數秒，
  直接由 timestamp 的 millisecond 補回。
*/
const gardenWanderRuntimeClockCache = {
  epochSecond:
    null,

  calendar:
    null,
};


/*
  每個角色只保留
  「目前正在使用的 Canonical Wander Slot」。

  只有：

  - 日期改變
  - Slot 改變
  - Scene 改變

  才重新建立 Slot。
*/
const gardenWanderRuntimeSlotCache =
  new Map();


const gardenWanderRuntimeBridgeStats = {
  calendarRefreshCount:
    0,

  slotBuildCount:
    0,

  sampleCount:
    0,
};


function clearGardenWanderRuntimeBridgeCache(
  characterId = null
) {
  if (characterId) {
    gardenWanderRuntimeSlotCache.delete(
      characterId
    );

  } else {
    gardenWanderRuntimeSlotCache.clear();
  }


  gardenWanderRuntimeClockCache
    .epochSecond =
    null;

  gardenWanderRuntimeClockCache
    .calendar =
    null;
}


function getGardenWanderRuntimeClock(
  timestamp =
    getGardenWorldNow()
) {
  if (
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return null;
  }


  const epochSecond =
    Math.floor(
      timestamp / 1000
    );


  let calendar =
    gardenWanderRuntimeClockCache
      .calendar;


  /*
    Calendar timezone parsing
    每個實際秒最多做一次。

    不會 60 FPS × 2 characters
    一直 formatToParts()。
  */
  if (
    gardenWanderRuntimeClockCache
      .epochSecond !==
        epochSecond ||
    !calendar
  ) {
    calendar =
      getGardenWorldCalendarParts(
        timestamp
      );


    if (!calendar) {
      return null;
    }


    gardenWanderRuntimeClockCache
      .epochSecond =
      epochSecond;

    gardenWanderRuntimeClockCache
      .calendar =
      calendar;


    gardenWanderRuntimeBridgeStats
      .calendarRefreshCount +=
      1;
  }


  /*
    Calendar 的 secondOfDay
    是整秒。

    補回小數秒後：

    12:00:30.250
    不會被當成
    12:00:30.000。

    這樣 MOVE 才能平滑重建。
  */
  const millisecond =
    (
      (
        timestamp % 1000
      ) +
      1000
    ) %
    1000;


  const preciseSecondOfDay =
    calendar.secondOfDay +
    millisecond / 1000;


  return Object.freeze({
    timestamp,

    epochSecond,

    calendar,

    preciseSecondOfDay,
  });
}


function getGardenWanderRuntimeSlot(
  characterId,
  sceneId,
  clock
) {
  if (
    !characterId ||
    !sceneId ||
    !clock?.calendar
  ) {
    return null;
  }


  const slotIndex =
    Math.floor(
      clock.calendar
        .secondOfDay /
      GARDEN_WANDER_SLOT_SECONDS
    );


  const cacheKey =
    [
      clock.calendar.dateKey,
      slotIndex,
      characterId,
      sceneId,
    ].join("|");


  const cached =
    gardenWanderRuntimeSlotCache.get(
      characterId
    );


  /*
    同日期、同 Slot、
    同角色、同場景：

    直接使用同一份 Slot。
  */
  if (
    cached?.key ===
      cacheKey
  ) {
    return cached.slot;
  }


  const slot =
    createGardenDeterministicWanderSlot({
      dateKey:
        clock.calendar.dateKey,

      slotIndex,

      characterId,

      sceneId,
    });


  if (!slot) {
    return null;
  }


  gardenWanderRuntimeSlotCache.set(
    characterId,
    Object.freeze({
      key:
        cacheKey,

      slot,
    })
  );


  gardenWanderRuntimeBridgeStats
    .slotBuildCount +=
    1;


  return slot;
}


function resolveGardenWanderRuntimeSampleAtTimestamp(
  characterId,
  sceneId,
  timestamp =
    getGardenWorldNow()
) {
  const clock =
    getGardenWanderRuntimeClock(
      timestamp
    );


  if (!clock) {
    return null;
  }


  const slot =
    getGardenWanderRuntimeSlot(
      characterId,
      sceneId,
      clock
    );


  if (!slot) {
    return null;
  }


  /*
    這裡不重新生成 Timeline。

    使用 cached Slot，
    只根據目前 preciseSecondOfDay
    找出當前 segment / progress。
  */
  const wanderResolution =
    resolveGardenDeterministicWanderInSlot(
      slot,
      clock.preciseSecondOfDay
    );


  if (!wanderResolution) {
    return null;
  }


  /*
    交給 12H-2：

    Canonical Progress
      ↓
    Cached Path
      ↓
    x / y / direction
  */
  const position =
    resolveGardenDeterministicWanderPosition(
      wanderResolution
    );


  if (!position) {
    return null;
  }


  gardenWanderRuntimeBridgeStats
    .sampleCount +=
    1;


  return Object.freeze({
    ...position,

    runtimeBridgeSchema:
      GARDEN_WANDER_RUNTIME_BRIDGE_SCHEMA,

    runtimeBridgeVersion:
      GARDEN_WANDER_RUNTIME_BRIDGE_VERSION,

    runtimeTimestamp:
      timestamp,

    preciseSecondOfDay:
      clock.preciseSecondOfDay,
  });
}


/*
  IDLE Direction

  12H-2 的 IDLE direction
  刻意是 null。

  但正式 Runtime 不能單純
  「保留玩家本機上一個方向」。

  否則：

  Player A 冷啟動
  Player B 已經開著 Garden

  同一時間可能面向不同方向。

  所以 IDLE facing
  也必須 deterministic。
*/
function resolveGardenCanonicalWanderDirection(
  characterId,
  sample
) {
  if (!sample) {
    return null;
  }


  /*
    MOVE：

    直接使用 12H-2
    根據實際 path segment
    算出的方向。
  */
  if (
    sample.direction === 1 ||
    sample.direction === -1
  ) {
    return sample.direction;
  }


  const resolution =
    sample.wanderResolution;


  if (!resolution) {
    return 1;
  }


  /*
    IDLE：

    同一天、同角色、
    同 Scene / Anchor / Slot
    永遠得到相同 facing。
  */
  const idleFacingDecision =
    getGardenWorldDailyDecisionInt({
      dateKey:
        resolution.dateKey,

      characterId,

      domainId:
        "wanderRuntime",

      subjectId:
        `${sample.sceneId}:${sample.fromTargetId ?? "idle"}`,

      instanceId:
        `slot-${resolution.slotIndex}`,

      decisionId:
        "idleDirection",

      min:
        0,

      max:
        1,
    });


  return idleFacingDecision === 0
    ? -1
    : 1;
}


/*
  12H-3B 會使用這個 Gate
  決定 Spatial Ownership。

  現在先建立，
  但還不接主 Runtime Loop。
*/
function canGardenCharacterUseCanonicalWanderRuntime(
  characterId,
  worldStateOverride = null,
  chatModeOverride = null
) {
  const worldState =
    worldStateOverride ??
    gardenCharacterWorldState[
      characterId
    ];


  if (!worldState) {
    return false;
  }


  const chatMode =
    chatModeOverride ??
    gardenChatState.mode;


const timeline =
  getGardenCharacterActivityTimeline(
    characterId,
    worldState
  );


const wanderRuntimeAllowed =
  timeline?.runtimeActivityId ===
    GARDEN_CHARACTER_ACTIVITY.WANDER &&
  (
    timeline.runtimeOwner ===
      GARDEN_CHARACTER_ACTIVITY_OWNER.WANDER ||
    timeline.runtimeOwner ===
      GARDEN_CHARACTER_ACTIVITY_OWNER.SCHEDULE
  );


return (
  wanderRuntimeAllowed &&
  !worldState.travel &&
  !!worldState.sceneId &&
  chatMode ===
    "wander"
);
}


/*
  將 Canonical Sample
  寫進 Character Move State。

  注意：

  12H-3A Self-Test
  只會把它套在 fake state。

  12H-3B 才會正式傳入
  chifuyuWalkTestState /
  chinatsuWalkTestState。
*/
function applyGardenWanderSampleToMoveState(
  characterId,
  moveState,
  sample
) {
  if (
    !moveState ||
    !sample ||
    !Number.isFinite(
      sample.x
    ) ||
    !Number.isFinite(
      sample.y
    )
  ) {
    return false;
  }


  /*
    Canonical WANDER
    不使用舊 local path integrator。

    所以取得 ownership 時，
    local path 必須為空。
  */
  moveState.path =
    [];


  moveState.x =
    sample.x;

  moveState.y =
    sample.y;


  moveState.isMoving =
    sample.isMoving ===
    true;


  const direction =
    resolveGardenCanonicalWanderDirection(
      characterId,
      sample
    );


  if (
    direction === 1 ||
    direction === -1
  ) {
    moveState.direction =
      direction;
  }


  return true;
}




/* =========================
   12H-4E-2B
   Canonical Wander Spatial Source
========================= */

function resolveGardenCanonicalWanderSpatialSource(
  characterId,
  worldState,
  timestamp =
    getGardenWorldNow()
) {
  if (
    !characterId ||
    !worldState ||
    !worldState.sceneId ||
    !isValidGardenWorldTimestamp(
      timestamp
    )
  ) {
    return Object.freeze({
      source:
        "unavailable",

      sample:
        null,

      continuityPhase:
        null,
    });
  }


  const continuity =
    worldState.wanderContinuity;


  /*
    =========================
    Travel → Wander Continuity
    =========================
  */
  if (continuity) {
    const continuityValid =
      isGardenWanderContinuityPlanUsable(
        continuity,
        characterId,
        worldState.sceneId
      );


    /*
      Snapshot / Debug / 舊資料若留下
      壞掉的 Continuity，
      不允許它永久卡住 Wander。
    */
    if (!continuityValid) {
      worldState.wanderContinuity =
        null;

    } else {
      const continuityState =
        resolveGardenTravelToWanderContinuity(
          continuity,
          timestamp
        );


      /*
        Plan 本身合法，
        Resolver 卻拿不到結果：

        Canonical ownership 已存在，
        此時不要偷偷跳回 Standard Wander，
        否則可能造成瞬移。
      */
      if (!continuityState) {
        return Object.freeze({
          source:
            "continuityUnavailable",

          sample:
            null,

          continuityPhase:
            null,
        });
      }


      /*
        Continuity 尚未完成：

        直接把它轉成
        Wander Runtime 可使用的
        canonical sample。
      */
      if (
        !continuityState.completed
      ) {
        const sample =
          Object.freeze({
            x:
              continuityState.x,

            y:
              continuityState.y,

            direction:
              continuityState.direction,

            isMoving:
              continuityState.isMoving ===
              true,

            progress:
              continuityState.progress ?? 0,


            /*
              Debug / Animation inspector
              可以辨識現在不是普通
              Wander Segment。
            */
            segmentType:
              continuityState.phase ===
                "move"
                ? "CONTINUITY_MOVE"
                : "CONTINUITY_IDLE",


            spatialSource:
              "continuity",

            continuityPhase:
              continuityState.phase,

            continuityPlan:
              continuity,
          });


        return Object.freeze({
          source:
            "continuity",

          sample,

          continuityPhase:
            continuityState.phase,
        });
      }


      /*
        =========================
        Boundary Handoff
        =========================

        timestamp >= endsAt。

        Continuity 已經精準抵達
        Standard Wander 的 fromAnchor。

        立即清掉 Plan，
        並在「同一個 timestamp」
        繼續往下 Resolve
        Standard Wander。

        不多停一幀，
        不需要 teleport。
      */
      worldState.wanderContinuity =
        null;
    }
  }


  /*
    =========================
    Standard Deterministic Wander
    =========================
  */
  const standardSample =
    resolveGardenWanderRuntimeSampleAtTimestamp(
      characterId,
      worldState.sceneId,
      timestamp
    );


  return Object.freeze({
    source:
      "standard",

    sample:
      standardSample,

    continuityPhase:
      null,
  });
}



/* =========================
   12H-3B
   Canonical Wander Live Runtime
========================= */

function applyGardenCanonicalWanderRuntimeForCharacter(
  characterId,
  timestamp =
    getGardenWorldNow()
) {
  const worldState =
    gardenCharacterWorldState[
      characterId
    ];


  const runtime =
    getGardenCharacterRuntime(
      characterId
    );


  /*
    Runtime 不存在。
  */
  if (
    !worldState ||
    !runtime ||
    !runtime.moveState
  ) {
    return Object.freeze({
      characterId,

      owned:
        false,

      applied:
        false,

      reason:
        "runtimeUnavailable",

      sample:
        null,
    });
  }


  /*
    Feature Flag 關閉時，
    完整退回舊 Runtime。
  */
  if (
    !GARDEN_CANONICAL_WANDER_RUNTIME_ENABLED
  ) {
    return Object.freeze({
      characterId,

      owned:
        false,

      applied:
        false,

      reason:
        "disabled",

      sample:
        null,
    });
  }


  /*
    只有純 WANDER 才取得 Spatial Ownership。

    TRAVEL
    CHAT
    REST
    其他 Activity

    都不由這層接管。
  */
  const owned =
    canGardenCharacterUseCanonicalWanderRuntime(
      characterId
    );


  if (!owned) {
    return Object.freeze({
      characterId,

      owned:
        false,

      applied:
        false,

      reason:
        "notCanonicalWander",

      sample:
        null,
    });
  }


  /*
  =========================
  Canonical Wander Spatial Source
  =========================

  優先順序：

  1. Travel → Wander Continuity
  2. Standard Deterministic Wander
*/
const spatialResolution =
  resolveGardenCanonicalWanderSpatialSource(
    characterId,
    worldState,
    timestamp
  );


const sample =
  spatialResolution?.sample ??
  null;


  /*
    即使 sample 因極端資料錯誤拿不到，

    Canonical Runtime 既然已取得 ownership，
    也不能偷偷退回 local random path。

    否則不同玩家會重新分岔。

    所以：
    - 清掉舊 local path
    - 停在目前位置
    - 等下一次 sample 恢復
  */
  if (!sample) {
    runtime.setPath?.([]);

    runtime.moveState.isMoving =
      false;


    if (
      runtime.autoState
    ) {
      runtime.autoState.wasMoving =
        false;
    }


    return Object.freeze({
      characterId,

      owned:
        true,

      applied:
        false,

      reason:
        "sampleUnavailable",

      sceneId:
        worldState.sceneId,

      sample:
        null,
    });
  }


  const applied =
    applyGardenWanderSampleToMoveState(
      characterId,
      runtime.moveState,
      sample
    );


  /*
    舊 Auto Walk Runtime
    不可以保留「上一刻正在走」狀態。

    否則未來離開 Canonical Ownership 時
    可能立刻觸發舊 reset 流程。
  */
  if (
    runtime.autoState
  ) {
    runtime.autoState.wasMoving =
      false;
  }


  return Object.freeze({
    characterId,

    owned:
      true,

    applied,

    reason:
  applied
    ? spatialResolution
        ?.source ===
        "continuity"
        ? "canonicalWanderContinuity"
        : "canonicalWander"
    : "applyFailed",

    sceneId:
      worldState.sceneId,

spatialSource:
  spatialResolution?.source ??
  null,


continuityPhase:
  spatialResolution
    ?.continuityPhase ??
  null,



    sample,
  });
}


function updateGardenCanonicalWanderRuntime(
  timestamp =
    getGardenWorldNow()
) {
  /*
    兩個角色共用完全相同 timestamp。

    不能角色 A 取得一次 Date.now，
    角色 B 又取得一次。

    否則 boundary 附近可能跨到不同 segment。
  */
  const chifuyu =
    applyGardenCanonicalWanderRuntimeForCharacter(
      "chifuyu",
      timestamp
    );


  const chinatsu =
    applyGardenCanonicalWanderRuntimeForCharacter(
      "chinatsu",
      timestamp
    );


  return Object.freeze({
    timestamp,

    chifuyu,

    chinatsu,
  });
}


function inspectGardenCanonicalWanderRuntime(
  characterId =
    "chifuyu"
) {
  const timestamp =
    getGardenWorldNow();


  /*
    先同步到完全相同 timestamp，
    再檢查 Runtime State。
  */
  const result =
    applyGardenCanonicalWanderRuntimeForCharacter(
      characterId,
      timestamp
    );


  const runtime =
    getGardenCharacterRuntime(
      characterId
    );


  const worldState =
    gardenCharacterWorldState[
      characterId
    ];


  const moveState =
    runtime?.moveState;


  const info = {
    character:
      characterId,

    activity:
      worldState?.activity ??
      null,

    scene:
      worldState?.sceneId ??
      null,

    owned:
      result.owned,

    applied:
      result.applied,

    reason:
      result.reason,

spatialSource:
  result.spatialSource ??
  null,


continuityPhase:
  result.continuityPhase ??
  null,


    segment:
      result.sample
        ?.segmentType ??
      null,

    x:
      moveState?.x ??
      null,

    y:
      moveState?.y ??
      null,

    direction:
      moveState?.direction ??
      null,

    isMoving:
      moveState?.isMoving ??
      null,

    localPathLength:
      moveState?.path
        ?.length ??
      0,

    canonicalX:
      result.sample?.x ??
      null,

    canonicalY:
      result.sample?.y ??
      null,
  };


  console.table([
    info,
  ]);


  return {
    ...info,

    result,
  };
}


function runGardenCanonicalWanderOwnershipSelfTest() {
  const fakeWanderState = {
    sceneId:
      "courtyard",

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .WANDER,

    activityData:
      null,

    travel:
      null,
  };


  const wanderOwned =
    canGardenCharacterUseCanonicalWanderRuntime(
      "chifuyu",
      fakeWanderState,
      "wander"
    );


const fakeScheduleWanderState = {
  ...fakeWanderState,

  sceneId:
    "moonBridge",

  activityData: {
    source:
      "schedule",

    semanticActivityId:
      "wander",

    definitionId:
      "official-test-night-walk",

    instanceId:
      "test-instance",
  },
};


const scheduleWanderOwned =
  canGardenCharacterUseCanonicalWanderRuntime(
    "chifuyu",
    fakeScheduleWanderState,
    "wander"
  );



  const fakeTravelState = {
    ...fakeWanderState,

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .TRAVEL,

    travel: {
      phase:
        "walkingToExit",
    },
  };


  const travelNotOwned =
    !canGardenCharacterUseCanonicalWanderRuntime(
      "chifuyu",
      fakeTravelState,
      "wander"
    );


  const fakeRestState = {
    ...fakeWanderState,

    activity:
      GARDEN_CHARACTER_ACTIVITY
        .REST,
  };


  const restNotOwned =
    !canGardenCharacterUseCanonicalWanderRuntime(
      "chifuyu",
      fakeRestState,
      "wander"
    );


  const chatModeNotOwned =
    !canGardenCharacterUseCanonicalWanderRuntime(
      "chifuyu",
      fakeWanderState,
      "approachChat"
    );


  const checks = {
    featureEnabled:
      GARDEN_CANONICAL_WANDER_RUNTIME_ENABLED ===
      true,

    wanderOwned,

    scheduleWanderOwned,

    travelNotOwned,

    restNotOwned,

    chatModeNotOwned,
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,
  };


  if (pass) {
    console.log(
      "[Garden Canonical Wander Ownership Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Canonical Wander Ownership Self-Test] FAIL",
      result
    );
  }


  return result;
}


function runGardenWanderReloadDeterminismSelfTest() {
  const dateKey = "2026-09-23";
  const characterId = "chifuyu";
  const sceneId = "courtyard";

  let moveSlot = null;


  /*
    找一個真的包含 MOVE 的 Slot。

    不寫死 slot index，
    避免未來 Wander Timeline
    參數調整後 Self-Test 自己失效。
  */
  for (
    let slotIndex = 0;
    slotIndex < GARDEN_WANDER_SLOTS_PER_DAY;
    slotIndex++
  ) {
    const candidate =
      createGardenDeterministicWanderSlot({
        dateKey,
        slotIndex,
        characterId,
        sceneId,
      });


    if (
      candidate &&
      !candidate.idleOnly &&
      candidate.segments?.some(
        segment =>
          segment.type ===
          GARDEN_WANDER_SEGMENT_TYPE
            .MOVE
      )
    ) {
      moveSlot =
        candidate;

      break;
    }
  }


  const moveSegment =
    moveSlot
      ?.segments
      ?.find(
        segment =>
          segment.type ===
          GARDEN_WANDER_SEGMENT_TYPE
            .MOVE
      ) ??
    null;


  if (
    !moveSlot ||
    !moveSegment
  ) {
    const result = {
      pass:
        false,

      reason:
        "moveSegmentNotFound",
    };


    console.warn(
      "[Garden Wander Reload Determinism Self-Test] FAIL",
      result
    );


    return result;
  }


  /*
    MOVE 中段 + 小數秒。

    小數秒是刻意保留的，
    用來確認 Reload reconstruction
    不會退回整秒精度。
  */
  const testSecondOfDay =
    (
      moveSegment.startSecondOfDay +
      moveSegment.endSecondOfDay
    ) /
      2 +
    0.437;


  const wholeSecond =
    Math.floor(
      testSecondOfDay
    );


  const hour =
    Math.floor(
      wholeSecond /
        3600
    );


  const minute =
    Math.floor(
      (
        wholeSecond %
        3600
      ) /
        60
    );


  const timeSecond =
    wholeSecond %
    60;


  const millisecond =
    Math.round(
      (
        testSecondOfDay -
        wholeSecond
      ) *
        1000
    );


  const pad2 = value =>
    String(
      value
    ).padStart(
      2,
      "0"
    );


  /*
    Garden World Clock 使用 JST。

    所以測試 timestamp
    明確使用 +09:00。
  */
  const timestamp =
    Date.parse(
      `${dateKey}T${pad2(hour)}:${pad2(minute)}:${pad2(timeSecond)}+09:00`
    ) +
    millisecond;


  /*
    模擬一次「新頁面」。

    只清 Runtime / Path Cache，
    不修改任何 Garden World State。
  */
  function buildFreshSample() {
    clearGardenWanderRuntimeBridgeCache();


    gardenDeterministicWanderPathCache
      .clear();


    const sample =
      resolveGardenWanderRuntimeSampleAtTimestamp(
        characterId,
        sceneId,
        timestamp
      );


    return {
      sample,

      pathCacheSize:
        gardenDeterministicWanderPathCache
          .size,

      bridge:
        getGardenWanderRuntimeBridgeDebugInfo(),
    };
  }


  /*
    =========================
    Fresh Runtime A
    =========================
  */

  const first =
    buildFreshSample();


  /*
    故意製造一份非常髒的
    Local Runtime State。

    如果 Canonical 系統正確，
    這些舊資料都不應影響結果。
  */
  const fakeStateA = {
    x:
      -999,

    y:
      -999,

    direction:
      -1,

    isMoving:
      false,

    path: [
      {
        x:
          1,

        y:
          1,
      },
    ],
  };


  const firstApplied =
    applyGardenWanderSampleToMoveState(
      characterId,
      fakeStateA,
      first.sample
    );


  /*
    =========================
    Fresh Runtime B
    =========================

    再清一次所有 Wander Cache。

    等同另一位玩家
    或重新整理後重新建立。
  */

  const secondRun =
    buildFreshSample();


  /*
    第二份 Local Runtime
    刻意使用完全不同的資料。
  */
  const fakeStateB = {
    x:
      9999,

    y:
      9999,

    direction:
      1,

    isMoving:
      false,

    path: [
      {
        x:
          999,

        y:
          999,
      },

      {
        x:
          888,

        y:
          888,
      },
    ],
  };


  const secondApplied =
    applyGardenWanderSampleToMoveState(
      characterId,
      fakeStateB,
      secondRun.sample
    );


  const firstDirection =
    resolveGardenCanonicalWanderDirection(
      characterId,
      first.sample
    );


  const secondDirection =
    resolveGardenCanonicalWanderDirection(
      characterId,
      secondRun.sample
    );


  const epsilon =
    0.000001;


  const samePosition =
    !!(
      first.sample &&
      secondRun.sample &&

      Math.abs(
        first.sample.x -
        secondRun.sample.x
      ) <
        epsilon &&

      Math.abs(
        first.sample.y -
        secondRun.sample.y
      ) <
        epsilon
    );


  /*
    兩份完全不同的 Local Runtime
    套用 Canonical Sample 後，
    最後必須收斂到完全相同狀態。
  */
  const fakeStatesConverged =
    !!(
      first.sample &&
      secondRun.sample &&

      Math.abs(
        fakeStateA.x -
        fakeStateB.x
      ) <
        epsilon &&

      Math.abs(
        fakeStateA.y -
        fakeStateB.y
      ) <
        epsilon &&

      fakeStateA.direction ===
        fakeStateB.direction &&

      fakeStateA.isMoving ===
        fakeStateB.isMoving &&

      fakeStateA.path.length ===
        0 &&

      fakeStateB.path.length ===
        0
    );


  const checks = {
    firstResolved:
      !!first.sample,

    secondResolved:
      !!secondRun.sample,


    /*
      Reload 前後必須仍然
      命中同一 MOVE segment。
    */
    moveSegmentPreserved:
      first.sample
        ?.segmentType ===
        GARDEN_WANDER_SEGMENT_TYPE
          .MOVE &&

      secondRun.sample
        ?.segmentType ===
        GARDEN_WANDER_SEGMENT_TYPE
          .MOVE,


    samePosition,


    sameProgress:
      !!(
        first.sample &&
        secondRun.sample &&

        Math.abs(
          first.sample.progress -
          secondRun.sample.progress
        ) <
          epsilon
      ),


    samePathKey:
      !!first.sample
        ?.pathKey &&

      first.sample.pathKey ===
        secondRun.sample
          ?.pathKey,


    sameDirection:
      firstDirection ===
      secondDirection,


    sameMovementState:
      first.sample
        ?.isMoving ===
      secondRun.sample
        ?.isMoving,


    /*
      0.437 秒必須完整保留。
    */
    preciseTimePreserved:
      !!(
        first.sample &&
        secondRun.sample &&

        Math.abs(
          first.sample
            .preciseSecondOfDay -
          testSecondOfDay
        ) <
          0.001 &&

        Math.abs(
          secondRun.sample
            .preciseSecondOfDay -
          testSecondOfDay
        ) <
          0.001
      ),


    /*
      Cache 被清空後，
      MOVE reconstruction
      必須重新建立 path。
    */
    pathRebuiltAfterFreshCache:
      first.pathCacheSize >
        0 &&

      secondRun.pathCacheSize >
        0,


    firstApplied:
      firstApplied ===
      true,


    secondApplied:
      secondApplied ===
      true,


    /*
      Local State 不論原本多髒，
      最後都必須收斂。
    */
    fakeStatesConverged,
  };


  const pass =
    Object.values(
      checks
    ).every(
      Boolean
    );


  const result = {
    pass,

    checks,

    timestamp,

    testSecondOfDay,

    first,

    second:
      secondRun,

    fakeStateA,

    fakeStateB,
  };


  if (
    pass
  ) {
    console.log(
      "[Garden Wander Reload Determinism Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Wander Reload Determinism Self-Test] FAIL",
      result
    );
  }


  return result;
}



function getGardenWanderRuntimeBridgeDebugInfo() {
  return {
    schema:
      GARDEN_WANDER_RUNTIME_BRIDGE_SCHEMA,

    version:
      GARDEN_WANDER_RUNTIME_BRIDGE_VERSION,

    clockEpochSecond:
      gardenWanderRuntimeClockCache
        .epochSecond,

    slotCacheSize:
      gardenWanderRuntimeSlotCache
        .size,

    stats: {
      ...gardenWanderRuntimeBridgeStats,
    },
  };
}


/* =========================
   12H-3A Self-Test
========================= */

function runGardenWanderRuntimeBridgeSelfTest() {
  const dateKey =
    "2026-09-23";

  const characterId =
    "chifuyu";

  const sceneId =
    "courtyard";


  /*
    找一個確實有 MOVE 的 Slot。

    只有 Self-Test 會掃。
    正式 Runtime 不會。
  */
  let moveSlot =
    null;


  for (
    let slotIndex = 0;
    slotIndex <
      GARDEN_WANDER_SLOTS_PER_DAY;
    slotIndex++
  ) {
    const candidate =
      createGardenDeterministicWanderSlot({
        dateKey,
        slotIndex,
        characterId,
        sceneId,
      });


    if (
      candidate &&
      !candidate.idleOnly
    ) {
      moveSlot =
        candidate;

      break;
    }
  }


  const moveSegment =
    moveSlot
      ?.segments
      ?.find(
        (segment) =>
          segment.type ===
          GARDEN_WANDER_SEGMENT_TYPE
            .MOVE
      ) ??
    null;


  if (
    !moveSlot ||
    !moveSegment
  ) {
    const result = {
      pass:
        false,

      reason:
        "moveSegmentNotFound",
    };


    console.warn(
      "[Garden Wander Runtime Bridge Self-Test] FAIL",
      result
    );


    return result;
  }


  /*
    MOVE 中央 + 0.375 秒。

    特地加入小數秒，
    測試 Runtime 是否真的
    可以做到 frame-level reconstruction。
  */
  const testSecondOfDay =
    (
      moveSegment.startSecondOfDay +
      moveSegment.endSecondOfDay
    ) /
      2 +
    0.375;


  const wholeSecond =
    Math.floor(
      testSecondOfDay
    );


  const hour =
    Math.floor(
      wholeSecond / 3600
    );


  const minute =
    Math.floor(
      (
        wholeSecond % 3600
      ) /
      60
    );


  const second =
    wholeSecond % 60;


  const millisecond =
    Math.round(
      (
        testSecondOfDay -
        wholeSecond
      ) *
        1000
    );


  const pad2 =
    (value) =>
      String(value).padStart(
        2,
        "0"
      );


  /*
    七原世界目前固定 JST。
  */
  const timestamp =
    Date.parse(
      `${dateKey}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}+09:00`
    ) +
    millisecond;


  /*
    測試前清 Runtime Bridge cache。

    不會清掉 12H-2 Path Cache。
  */
  clearGardenWanderRuntimeBridgeCache();


  const statsBefore = {
    ...gardenWanderRuntimeBridgeStats,
  };


  const firstSample =
    resolveGardenWanderRuntimeSampleAtTimestamp(
      characterId,
      sceneId,
      timestamp
    );


  const statsAfterFirst = {
    ...gardenWanderRuntimeBridgeStats,
  };


  /*
    同一個 timestamp 再取一次。

    Calendar / Slot
    都不應重新建立。
  */
  const secondSample =
    resolveGardenWanderRuntimeSampleAtTimestamp(
      characterId,
      sceneId,
      timestamp
    );


  const statsAfterSecond = {
    ...gardenWanderRuntimeBridgeStats,
  };


  /*
    Fake Runtime State。

    確認 Bridge 套用後：
    舊 path 會被清掉，
    x/y/movement/direction
    由 Canonical Sample 接管。
  */
  const fakeMoveState = {
    x:
      -999,

    y:
      -999,

    direction:
      -1,

    isMoving:
      false,

    path: [
      {
        x:
          1,

        y:
          1,
      },
    ],
  };


  const applied =
    applyGardenWanderSampleToMoveState(
      characterId,
      fakeMoveState,
      firstSample
    );


  const deterministicMatch =
    !!(
      firstSample &&
      secondSample &&
      Math.abs(
        firstSample.x -
        secondSample.x
      ) <
        0.000001 &&
      Math.abs(
        firstSample.y -
        secondSample.y
      ) <
        0.000001 &&
      firstSample.isMoving ===
        secondSample.isMoving &&
      resolveGardenCanonicalWanderDirection(
        characterId,
        firstSample
      ) ===
        resolveGardenCanonicalWanderDirection(
          characterId,
          secondSample
        )
    );


  const checks = {
    moveSlotFound:
      !!moveSlot,

    moveSegmentFound:
      !!moveSegment,

    sampleResolved:
      !!firstSample,

    sampleIsMoving:
      firstSample
        ?.isMoving ===
      true,

    preciseFractionPreserved:
      Math.abs(
        (
          firstSample
            ?.preciseSecondOfDay ??
          -1
        ) -
        testSecondOfDay
      ) <
      0.001,

    deterministicMatch,

    /*
      同一個 epoch second
      Calendar 只建一次。
    */
    calendarBuiltOnce:
      statsAfterFirst
        .calendarRefreshCount -
        statsBefore
          .calendarRefreshCount ===
        1 &&
      statsAfterSecond
        .calendarRefreshCount ===
        statsAfterFirst
          .calendarRefreshCount,

    /*
      同角色、同 Scene、同 Slot
      Slot 也只建一次。
    */
    slotBuiltOnce:
      statsAfterFirst
        .slotBuildCount -
        statsBefore
          .slotBuildCount ===
        1 &&
      statsAfterSecond
        .slotBuildCount ===
        statsAfterFirst
          .slotBuildCount,

    fakeStateApplied:
      applied ===
      true,

    oldPathCleared:
      fakeMoveState.path.length ===
      0,

    runtimeMovingMatches:
      fakeMoveState.isMoving ===
      firstSample?.isMoving,

    runtimePositionMatches:
      !!firstSample &&
      Math.abs(
        fakeMoveState.x -
        firstSample.x
      ) <
        0.000001 &&
      Math.abs(
        fakeMoveState.y -
        firstSample.y
      ) <
        0.000001,

    runtimeDirectionValid:
      fakeMoveState.direction ===
        1 ||
      fakeMoveState.direction ===
        -1,

    runtimePositionWalkable:
      !!firstSample &&
      isGardenWalkablePointInScene(
        sceneId,
        firstSample.x,
        firstSample.y
      ),
  };


  const pass =
    Object.values(
      checks
    ).every(Boolean);


  const result = {
    pass,

    checks,

    timestamp,

    testSecondOfDay,

    firstSample,

    secondSample,

    fakeMoveState,

    bridgeDebug:
      getGardenWanderRuntimeBridgeDebugInfo(),
  };


  if (pass) {
    console.log(
      "[Garden Wander Runtime Bridge Self-Test] PASS",
      result
    );

  } else {
    console.warn(
      "[Garden Wander Runtime Bridge Self-Test] FAIL",
      result
    );
  }


  return result;
}



function areGardenCharactersInViewedScene() {
  return (
    gardenCharacterWorldState.chifuyu.sceneId ===
      gardenViewSceneId &&
    gardenCharacterWorldState.chinatsu.sceneId ===
      gardenViewSceneId
  );
}


/* =========================
   Garden Page Visibility
========================= */

document.addEventListener(
  "visibilitychange",
  () => {
    /*
      -------------------------
      頁面進入背景
      -------------------------
    */
    if (document.hidden) {
      /*
        只有真的正在 Garden
        才建立新的 suspend。

        如果本來就在 Menu，
        Garden 已經因 "menu"
        suspended，
        不覆寫時間。
      */
      if (
  isGardenWorldViewActive()
) {
  suspendGardenWorld(
    "documentHidden"
  );


  saveGardenWorldState(
    "documentHidden"
  );
}


      return;
    }


    /*
      -------------------------
      頁面重新可見
      -------------------------

      如果仍停留在 Garden，
      立刻 Resume。

      如果現在是 Menu，
      不 Resume。

      要等真正再次進 Garden
      才恢復。
    */
    if (
      isGardenWorldViewActive()
    ) {
      const result =
        resumeGardenWorld(
          "documentVisible"
        );


      if (result) {
        console.log(
          "[Garden World] resumed:",
          result
        );
      }
    }
  }
);


/*
  Safari / bfcache 保險。

  pagehide 不代表一定永久關閉；
  有可能只是被瀏覽器放進
  Back-Forward Cache。
*/
window.addEventListener(
  "pagehide",
  () => {
    if (
      isGardenWorldViewActive()
    ) {
      suspendGardenWorld(
        "pageHide"
      );


      saveGardenWorldState(
        "pageHide"
      );
    }
  }
);


window.addEventListener(
  "pageshow",
  () => {
    if (
      !document.hidden &&
      isGardenWorldViewActive()
    ) {
      const result =
        resumeGardenWorld(
          "pageShow"
        );


      if (result) {
        console.log(
          "[Garden World] resumed:",
          result
        );
      }
    }
  }
);


/* =========================
   Garden Scene Config
========================= */

let gardenViewSceneId =
  "courtyard";


/* =========================
   Garden World State Snapshot
========================= */

/*
  Snapshot Schema 版本。

  未來存檔結構如果真的改變，
  才增加版本號。
*/
const GARDEN_WORLD_SNAPSHOT_SCHEMA =
  "nanaharaGardenWorld";


const GARDEN_WORLD_SNAPSHOT_VERSION =
  1;


/*
  將資料轉成真正可以
  JSON.stringify() 的副本。

  Activity Data / Travel
  原則上都應該只包含：

  - string
  - number
  - boolean
  - null
  - Array
  - plain object

  不允許 DOM / function / Map
  等 Runtime 物件進入存檔。
*/
function cloneGardenWorldSerializableValue(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }


  try {
    const json =
      JSON.stringify(
        value
      );


    if (
      typeof json !==
        "string"
    ) {
      return null;
    }


    return JSON.parse(
      json
    );

  } catch (err) {
    console.warn(
      "[Garden World] value is not serializable:",
      err
    );


    return null;
  }
}


function createGardenCharacterWorldSnapshot(
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


  if (!worldState) {
    return null;
  }


  const moveState =
    runtime?.moveState ||
    null;


  return {
    /*
      =========================
      Semantic World State
      =========================
    */

    sceneId:
      worldState.sceneId ??
      null,

    activity:
      worldState.activity ??
      null,

    activityData:
      cloneGardenWorldSerializableValue(
        worldState.activityData
      ),

wanderContinuity:
  cloneGardenWorldSerializableValue(
    worldState.wanderContinuity
  ),


activitySpotApproach:
  cloneGardenWorldSerializableValue(
    worldState.activitySpotApproach
  ),

  

    travel:
      cloneGardenWorldSerializableValue(
        worldState.travel
      ),


    /*
      =========================
      Persistent Position
      =========================

      x / y / direction
      雖然目前仍存在 movement runtime，

      但它們其實是角色在世界中的
      必要持久位置資料，
      所以必須進 Snapshot。
    */
    position: {
      x:
        Number.isFinite(
          moveState?.x
        )
          ? moveState.x
          : null,

      y:
        Number.isFinite(
          moveState?.y
        )
          ? moveState.y
          : null,

      direction:
        Number.isFinite(
          moveState?.direction
        )
          ? moveState.direction
          : null,
    },
  };
}


function createGardenWorldStateSnapshot(
  reason = "manual"
) {
  const characters =
    {};


  for (
    const character of
    Object.keys(
      gardenCharacterWorldState
    )
  ) {
    const characterSnapshot =
      createGardenCharacterWorldSnapshot(
        character
      );


    if (
      characterSnapshot
    ) {
      characters[
        character
      ] =
        characterSnapshot;
    }
  }


  return {
    schema:
      GARDEN_WORLD_SNAPSHOT_SCHEMA,

    version:
      GARDEN_WORLD_SNAPSHOT_VERSION,


    /*
      這一定是 World Clock，
      不使用 performance.now()。
    */
    savedAt:
      getGardenWorldNow(),


    /*
      Debug 用。
      之後可能會看到：

      manual
      menu
      pageHide
      periodic
    */
    reason:
      String(
        reason ||
        "manual"
      ),


    /*
      Player View 與
      Character World 分開保存。

      View Scene 不等於
      角色真正所在 Scene。
    */
   view: {
  sceneId:
    gardenViewSceneId ||
    "courtyard",
},


worldEvents: {
  lastMoonBridgeNightChatEventKey:
    gardenMoonBridgeNightChatEventLedger
      .lastConsumedEventKey,

  lastAfternoonRestChatEventKey:
    gardenAfternoonRestChatEventLedger
      .lastConsumedEventKey,
},


characters,
  };
}

function isValidGardenWorldStateSnapshot(
  snapshot
) {
  if (
    !snapshot ||
    typeof snapshot !==
      "object"
  ) {
    return false;
  }


  if (
    snapshot.schema !==
      GARDEN_WORLD_SNAPSHOT_SCHEMA
  ) {
    return false;
  }


  if (
    snapshot.version !==
      GARDEN_WORLD_SNAPSHOT_VERSION
  ) {
    return false;
  }


  if (
    !isValidGardenWorldTimestamp(
      snapshot.savedAt
    )
  ) {
    return false;
  }


  if (
    !snapshot.characters ||
    typeof snapshot.characters !==
      "object"
  ) {
    return false;
  }


  return true;
}


function inspectGardenWorldStateSnapshot() {
  const snapshot =
    createGardenWorldStateSnapshot(
      "debug"
    );


  console.log(
    "[Garden World] Snapshot:",
    snapshot
  );


  console.log(
    "[Garden World] JSON:",
    JSON.stringify(
      snapshot,
      null,
      2
    )
  );


  return snapshot;
}

/* =========================
   Garden World Persistence
========================= */

const GARDEN_WORLD_STORAGE_KEY =
  "nanahara-garden-world-v1";


/*
  將目前 Garden World Snapshot
  寫入 localStorage。

  成功：
  回傳 snapshot

  失敗：
  回傳 null
*/
function saveGardenWorldState(
  reason = "manual"
) {
  try {
    const snapshot =
      createGardenWorldStateSnapshot(
        reason
      );


    if (
      !isValidGardenWorldStateSnapshot(
        snapshot
      )
    ) {
      console.warn(
        "[Garden World] refusing to save invalid snapshot"
      );

      return null;
    }


    const json =
      JSON.stringify(
        snapshot
      );


    localStorage.setItem(
      GARDEN_WORLD_STORAGE_KEY,
      json
    );


    return snapshot;

  } catch (err) {
    console.warn(
      "[Garden World] save failed:",
      err
    );


    return null;
  }
}


/*
  只「讀取並驗證」存檔。

  注意：
  這一步不會修改目前世界。

  11C-3 才會真正 Restore。
*/
function loadGardenWorldState() {
  try {
    const raw =
      localStorage.getItem(
        GARDEN_WORLD_STORAGE_KEY
      );


    if (!raw) {
      return null;
    }


    const snapshot =
      JSON.parse(
        raw
      );


    if (
      !isValidGardenWorldStateSnapshot(
        snapshot
      )
    ) {
      console.warn(
        "[Garden World] invalid saved snapshot"
      );

      return null;
    }


    return snapshot;

  } catch (err) {
    console.warn(
      "[Garden World] load failed:",
      err
    );


    return null;
  }
}


function clearGardenWorldSave() {
  try {
    localStorage.removeItem(
      GARDEN_WORLD_STORAGE_KEY
    );


    return true;

  } catch (err) {
    console.warn(
      "[Garden World] clear save failed:",
      err
    );


    return false;
  }
}


function getGardenWorldSaveInfo() {
  const snapshot =
    loadGardenWorldState();


  if (!snapshot) {
    return {
      exists: false,
      key:
        GARDEN_WORLD_STORAGE_KEY,
    };
  }


  return {
    exists: true,

    key:
      GARDEN_WORLD_STORAGE_KEY,

    schema:
      snapshot.schema,

    version:
      snapshot.version,

    savedAt:
      snapshot.savedAt,

    savedAtIso:
      new Date(
        snapshot.savedAt
      ).toISOString(),

    reason:
      snapshot.reason,

    viewSceneId:
      snapshot.view?.sceneId ??
      null,

    characterIds:
      Object.keys(
        snapshot.characters ||
        {}
      ),
  };
}

/* =========================
   Garden Cold Start Restore
========================= */

let gardenWorldLastColdStartRestore =
  null;



function createGardenWorldColdStartContext(
  snapshot,
  resumedAt =
    getGardenWorldNow()
) {
  if (
    !isValidGardenWorldStateSnapshot(
      snapshot
    ) ||
    !isValidGardenWorldTimestamp(
      resumedAt
    )
  ) {
    return null;
  }


  const elapsedMs =
    getGardenWorldElapsedMs(
      snapshot.savedAt,
      resumedAt
    );


  return Object.freeze({
    source:
      "coldStart",

    suspendedAt:
      snapshot.savedAt,

    resumedAt,

    elapsedMs,

    elapsedSeconds:
      elapsedMs / 1000,

    suspendReason:
      snapshot.reason ||
      "savedState",

    resumeReason:
      "coldStart",
  });
}


function restoreGardenCharacterFromSnapshot(
  character,
  snapshot
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
    !snapshot
  ) {
    return false;
  }


  /*
    =========================
    Position
    =========================
  */

  const position =
    snapshot.position;


  if (
    runtime?.moveState
  ) {
    const state =
      runtime.moveState;


    if (
      Number.isFinite(
        position?.x
      )
    ) {
      state.x =
        position.x;
    }


    if (
      Number.isFinite(
        position?.y
      )
    ) {
      state.y =
        position.y;
    }


    if (
      Number.isFinite(
        position?.direction
      )
    ) {
      state.direction =
        position.direction;
    }


    /*
      舊頁面的 Runtime 不能復活。

      特別是：
      path
      isMoving
      performance.now() timeline
    */
    state.path =
      [];

    state.isMoving =
      false;
  }


  /*
    =========================
    Semantic State
    =========================
  */

  const savedTravel =
    cloneGardenWorldSerializableValue(
      snapshot.travel
    );


const savedWanderContinuity =
  cloneGardenWorldSerializableValue(
    snapshot.wanderContinuity
  );

const savedActivitySpotApproach =
  cloneGardenWorldSerializableValue(
    snapshot.activitySpotApproach
  );

  /*
    如果有有效 Travel，
    Travel 優先於一般 Activity。
  */
  if (
    savedTravel &&
    typeof savedTravel ===
      "object" &&
    savedTravel.fromSceneId &&
    savedTravel.toSceneId &&
    savedTravel.phase
  ) {
    worldState.travel =
      savedTravel;


/*
  Travel 擁有更高 Spatial Priority。

  Snapshot 即使異常同時帶著
  wanderContinuity，
  Travel 期間也不能使用它。
*/
worldState.wanderContinuity =
  null;

worldState.activitySpotApproach =
  null;
  


    /*
      transitUntil 是上一個頁面的
      performance.now()。

      絕對不能跨 Reload 沿用。
    */
    worldState.travel
      .transitUntil =
      0;


    worldState.activity =
      GARDEN_CHARACTER_ACTIVITY
        .TRAVEL;


    worldState.activityData =
      cloneGardenWorldSerializableValue(
        snapshot.activityData
      );


    /*
      transit 時本來就不屬於
      任一可觀看場景。
    */
    if (
      savedTravel.phase ===
        "transit"
    ) {
      worldState.sceneId =
        null;

    } else {
      worldState.sceneId =
        snapshot.sceneId ??
        savedTravel.fromSceneId;
    }


    return true;
  }


/*
  =========================
  Activity Spot Approach
  Cold Start Restore
  =========================

  有效的 Canonical Approach
  可以跨 Reload 保留。

  位置不靠舊 local path，
  下一階段會依絕對世界時間
  重新取樣。
*/
if (
  snapshot.activity &&
  snapshot.sceneId &&

  isGardenCanonicalActivitySpotApproachPlanUsable(
    savedActivitySpotApproach,
    character,
    snapshot.sceneId,
    snapshot.activity
  )
) {
  worldState.sceneId =
    snapshot.sceneId;

  worldState.activity =
    snapshot.activity;

  worldState.activityData =
    cloneGardenWorldSerializableValue(
      snapshot.activityData
    );

  worldState.activitySpotApproach =
    savedActivitySpotApproach;

  worldState.wanderContinuity =
    null;

  worldState.travel =
    null;

  return true;
}



  /*
    =========================
    Chat Cold Start Policy
    =========================

    Chat Runtime 沒有持久化：

    - loop
    - talk ready
    - approach path
    - callback

    所以不能假裝從半句話繼續。
  */
  if (
    snapshot.activity ===
      GARDEN_CHARACTER_ACTIVITY
        .CHAT
  ) {
    worldState.activity =
      GARDEN_CHARACTER_ACTIVITY
        .WANDER;

    worldState.activityData =
  null;

worldState.wanderContinuity =
  null;


worldState.activitySpotApproach =
  null;


worldState.travel =
  null;

    worldState.sceneId =
      snapshot.sceneId ||
      "courtyard";


    return true;
  }


  /*
    目前其他一般狀態
    安全恢復為 Wander。

    等 Tea / Read / Pray
    有自己的 persistence policy 後，
    再擴充這裡。
  */
worldState.activity =
  GARDEN_CHARACTER_ACTIVITY
    .WANDER;

worldState.activityData =
  null;

worldState.activitySpotApproach =
  null;

worldState.travel =
  null;

worldState.sceneId =
  snapshot.sceneId ||
  "courtyard";


/*
  只有真正從 WANDER Snapshot
  恢復時，才允許 Continuity 存活。

  REST / 未來其他 Activity
  若目前尚無 persistence policy，
  仍然安全退回普通 WANDER。
*/
if (
  snapshot.activity ===
    GARDEN_CHARACTER_ACTIVITY
      .WANDER &&

  isGardenWanderContinuityPlanUsable(
    savedWanderContinuity,
    character,
    worldState.sceneId
  )
) {
  worldState.wanderContinuity =
    savedWanderContinuity;

} else {
  worldState.wanderContinuity =
    null;
}


return true;
}


function rebuildGardenCharacterTravelRuntime(
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


  const travel =
    worldState?.travel;


  if (
    !worldState ||
    !runtime ||
    !travel
  ) {
    return false;
  }


  const state =
    runtime.moveState;


  state.path =
    [];

  state.isMoving =
    false;


  const route =
    getGardenCharacterTravelRoute(
      travel.fromSceneId,
      travel.toSceneId
    );


  if (!route) {
    return false;
  }


  /*
    -------------------------
    Walking To Exit
    -------------------------

    從 Snapshot 保存的 x/y
    重新算到出口的路徑。
  */
  if (
    travel.phase ===
      "walkingToExit"
  ) {
    const path =
      buildGardenCharacterExitPath(
        character,
        route
      );


    if (
      path &&
      path.length > 0
    ) {
      runtime.setPath(
        path
      );


      return true;
    }


    return false;
  }


  /*
    -------------------------
    Transit
    -------------------------

    沒有空間 path。

    剩餘時間會由
    Travel Reconciliation
    重建 transitUntil。
  */
  if (
    travel.phase ===
      "transit"
  ) {
    return true;
  }


  /*
    -------------------------
    Walking From Entrance
    -------------------------

    從保存的位置繼續走向
    正式入口終點。
  */
  if (
    travel.phase ===
      "walkingFromEntrance"
  ) {
    const entrance =
      route.entranceByCharacter?.[
        character
      ];


    if (!entrance) {
      return false;
    }


    runtime.setPath([
      {
        x:
          entrance.enter.x,

        y:
          entrance.enter.y,
      },
    ]);


    return true;
  }


  return false;
}


/* =========================
   12H-4D-2
   Travel Hydrate Runtime Preparation
========================= */

let gardenLastTravelHydratePreparation =
  Object.freeze([]);


function prepareGardenCharacterTravelRuntimeAfterHydrate(
  character
) {
  const worldState =
    gardenCharacterWorldState[
      character
    ];


  const travel =
    worldState?.travel;


  if (
    !worldState ||
    !travel
  ) {
    return Object.freeze({
      character,

      handled:
        false,

      mode:
        "none",

      rebuilt:
        false,

      reason:
        "notTraveling",
    });
  }


  const runtime =
    getGardenCharacterRuntime(
      character
    );


  if (
    !runtime ||
    !runtime.moveState
  ) {
    return Object.freeze({
      character,

      handled:
        false,

      mode:
        "unavailable",

      rebuilt:
        false,

      reason:
        "runtimeUnavailable",
    });
  }


  /*
    Reload 後永遠不沿用
    上一頁的 transient path state。
  */
  runtime.setPath?.([]);


  runtime.moveState.path =
    [];

  runtime.moveState.isMoving =
    false;


  if (
    runtime.autoState
  ) {
    runtime.autoState.wasMoving =
      false;
  }


  /*
    =========================
    Canonical Travel
    =========================

    有 Spatial Plan 時，
    不重新尋路。

    接下來的 World Reconciliation
    會依 Absolute World Time
    直接重建真正狀態。
  */
  if (
    canGardenCharacterUseCanonicalTravelRuntime(
      character
    )
  ) {
    return Object.freeze({
      character,

      handled:
        true,

      mode:
        "canonicalDeferred",

      rebuilt:
        false,

      reason:
        "spatialPlanOwnsRuntime",

      phase:
        travel.phase,

      hasSpatialPlan:
        true,
    });
  }


  /*
    =========================
    Legacy Travel
    =========================

    舊 Snapshot 沒有 spatialPlan，
    才從保存的 x/y
    重建舊 movement path。
  */
  const rebuilt =
    rebuildGardenCharacterTravelRuntime(
      character
    );


  return Object.freeze({
    character,

    handled:
      true,

    mode:
      "legacyRebuild",

    rebuilt:
      rebuilt ===
      true,

    reason:
      rebuilt
        ? "legacyRuntimeRebuilt"
        : "legacyRuntimeRebuildFailed",

    phase:
      travel.phase,

    hasSpatialPlan:
      false,
  });
}


function getGardenTravelHydratePreparationInfo() {
  return (
    gardenLastTravelHydratePreparation
  );
}



function hydrateGardenWorldState(
  snapshot
) {
  if (
    !isValidGardenWorldStateSnapshot(
      snapshot
    )
  ) {
    return false;
  }


  /*
    =========================
    Player View
    =========================
  */

  const savedViewSceneId =
    snapshot.view?.sceneId;


  if (
    savedViewSceneId &&
    getGardenSceneById(
      savedViewSceneId
    )
  ) {
    gardenViewSceneId =
      savedViewSceneId;

  } else {
    gardenViewSceneId =
      "courtyard";
  }


  /*
    =========================
    Runtime-only Chat State
    =========================

    新頁面一定先從乾淨 Runtime 開始。
  */
  clearGardenChatState();


/*
  Deterministic Chat event ledger
  可以跨 Reload 保存。

  Chat Runtime 本身仍然不保存。
*/
gardenMoonBridgeNightChatEventLedger
  .lastConsumedEventKey =
    typeof snapshot
      .worldEvents
      ?.lastMoonBridgeNightChatEventKey ===
      "string"

      ? snapshot
          .worldEvents
          .lastMoonBridgeNightChatEventKey

      : null;


      gardenAfternoonRestChatEventLedger
  .lastConsumedEventKey =
    typeof snapshot
      .worldEvents
      ?.lastAfternoonRestChatEventKey ===
      "string"

      ? snapshot
          .worldEvents
          .lastAfternoonRestChatEventKey

      : null;


  /*
    =========================
    Characters
    =========================
  */

  for (
    const character of
    Object.keys(
      gardenCharacterWorldState
    )
  ) {
    const characterSnapshot =
      snapshot.characters?.[
        character
      ];


    if (
      !characterSnapshot
    ) {
      continue;
    }


    restoreGardenCharacterFromSnapshot(
      character,
      characterSnapshot
    );
  }


  /*
  =========================
  Travel Runtime Preparation
  =========================

  Canonical Travel：
  不重建 local path，
  等 World Reconciliation
  直接依現在時間重建。

  Legacy Travel：
  才保留舊 path rebuild。
*/

const travelPreparationResults =
  [];


for (
  const character of
  Object.keys(
    gardenCharacterWorldState
  )
) {
  if (
    gardenCharacterWorldState[
      character
    ]?.travel
  ) {
    travelPreparationResults.push(
      prepareGardenCharacterTravelRuntimeAfterHydrate(
        character
      )
    );
  }
}


gardenLastTravelHydratePreparation =
  Object.freeze([
    ...travelPreparationResults,
  ]);


  /*
    這是關鍵。

    告訴 initGardenScreen：

    世界不是第一次出生，
    不准重新 randomize / overwrite。
  */
  gardenWorldInitialized =
    true;


  gardenPendingInitialMode =
    null;


  return true;
}


function restoreGardenWorldFromStorage() {
  const snapshot =
    loadGardenWorldState();


  if (!snapshot) {
    gardenWorldLastColdStartRestore =
      null;


    return null;
  }


  const restored =
    hydrateGardenWorldState(
      snapshot
    );


  if (!restored) {
    console.warn(
      "[Garden World] cold start hydrate failed"
    );


    return null;
  }


  /*
    Hydrate 完成後，
    才能跑 Reconciliation。

    因為 Travel Handler
    必須看到已還原的 travel。
  */
  const context =
    createGardenWorldColdStartContext(
      snapshot
    );


  if (!context) {
    return null;
  }


  const reconciliationResults =
    runGardenWorldReconciliation(
      context
    );


  const result =
    Object.freeze({
      ...context,

      restored:
        true,

      savedReason:
        snapshot.reason,

      reconciliation:
        reconciliationResults,
    });


  /*
    與普通 Resume 共用
    Debug 狀態。
  */
  gardenWorldLastResumeContext =
    result;


  gardenWorldLastReconciliationResults =
    reconciliationResults;


  gardenWorldLastColdStartRestore =
    result;


  return result;
}


function getGardenWorldColdStartRestoreInfo() {
  return (
    gardenWorldLastColdStartRestore
  );
}


window.addEventListener(
  "load",
  () => {
    const result =
      restoreGardenWorldFromStorage();


    if (result) {
      console.log(
        "[Garden World] cold start restored:",
        result
      );
    }
  }
);





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

activitySpots:
  COURTYARD_ACTIVITY_SPOTS,

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

chatSpots:
  MOON_BRIDGE_CHAT_SPOTS,

activitySpots:
  MOON_BRIDGE_ACTIVITY_SPOTS,

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

  /*
    同一張圖片可能被多個 layer 共用。

    例如 Moon Bridge：
    upper glow / lower glow
    會共用同一組 PNG。

    preload 時只需要處理一次。
  */
  return [
    ...new Set(
      sceneLayers
        .map(
          (item) =>
            item[safeMode]
        )
        .filter(Boolean)
    ),
  ];
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
setGardenCharacterAnimationMode(
  "chifuyu",
  "idle",
  true
);

setGardenCharacterAnimationMode(
  "chinatsu",
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


