/* -------------------------------------------------------------
 * 戰國妖狐傳 — GitHub Pages RPG MVP
 * 三場景探索、簡短劇情、即時輕戰鬥、場景音樂切換
 * ------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  const STAGE_WIDTH = 800;
  const STAGE_HEIGHT = 600;

  const el = {
    stageWrapper: document.querySelector('.stage-wrapper'),
    stage: document.getElementById('game-stage'),
    player: document.getElementById('player-fox'),
    npc: document.getElementById('npc-merchant'),
    charm: document.getElementById('shrine-charm'),
    enemy: document.getElementById('enemy-fallen-samurai'),
    enemyHp: document.getElementById('enemy-hp'),
    enemyHpLabel: document.getElementById('enemy-hp-label'),
    enemyHpFill: document.getElementById('enemy-hp-fill'),
    slash: document.getElementById('slash-effect'),
    combatEffects: document.getElementById('combat-effects'),
    hint: document.getElementById('interact-hint'),
    toast: document.getElementById('toast'),
    dialog: document.getElementById('dialog-box'),
    dialogName: document.getElementById('dialog-name'),
    dialogText: document.getElementById('dialog-text'),
    endingCard: document.getElementById('ending-card'),
    sceneLabel: document.getElementById('scene-label'),
    objectiveText: document.getElementById('objective-text'),
    hpHearts: document.getElementById('hp-hearts'),
    mapNodes: {
      left_shrine: document.getElementById('map-node-left'),
      center_forest: document.getElementById('map-node-center'),
      right_battlefield: document.getElementById('map-node-right'),
    },
    bgmToggle: document.getElementById('checkbox-bgm'),
    bgmVolume: document.getElementById('input-bgm-volume'),
    bgmVolumeValue: document.getElementById('val-bgm-volume'),
    attackButton: document.getElementById('btn-attack'),
    dpadButtons: {
      up: document.getElementById('btn-up'),
      left: document.getElementById('btn-left'),
      down: document.getElementById('btn-down'),
      right: document.getElementById('btn-right'),
    },
    spriteControls: {
      frameWidth: document.getElementById('input-frame-width'),
      frameHeight: document.getElementById('input-frame-height'),
      offsetX: document.getElementById('input-offset-x'),
      offsetY: document.getElementById('input-offset-y'),
      scale: document.getElementById('input-img-scale'),
      removeBg: document.getElementById('checkbox-remove-bg'),
      animSpeed: document.getElementById('input-animation-speed'),
      moveSpeed: document.getElementById('input-move-speed'),
      framesCount: document.getElementById('input-frames-count'),
      toggleBg: document.getElementById('btn-toggle-bg'),
      reset: document.getElementById('btn-reset-sprite'),
      values: {
        frameWidth: document.getElementById('val-frame-width'),
        frameHeight: document.getElementById('val-frame-height'),
        offsetX: document.getElementById('val-offset-x'),
        offsetY: document.getElementById('val-offset-y'),
        scale: document.getElementById('val-img-scale'),
        animSpeed: document.getElementById('val-animation-speed'),
        moveSpeed: document.getElementById('val-move-speed'),
        framesCount: document.getElementById('val-frames-count'),
      },
    },
  };

  const SCENES = {
    left_shrine: {
      id: 'left_shrine',
      label: '狐火荒社',
      background: 'assets/sprites/bg_left_shrine.png',
      music: 'assets/audio/bgm_left.wav',
      exits: { right: 'center_forest' },
      spawnFrom: { center_forest: { x: 710, y: 338 } },
      charm: { x: 378, y: 314, radius: 74 },
    },
    center_forest: {
      id: 'center_forest',
      label: '迷霧森林',
      background: 'assets/sprites/bg_forest.png',
      music: 'assets/audio/bgm_center.wav',
      exits: { left: 'left_shrine', right: 'right_battlefield' },
      spawnFrom: {
        left_shrine: { x: 38, y: 338 },
        right_battlefield: { x: 708, y: 338 },
      },
      npc: { x: 540, y: 238, radius: 94 },
    },
    right_battlefield: {
      id: 'right_battlefield',
      label: '古戰場',
      background: 'assets/sprites/bg_right_battlefield.png',
      music: 'assets/audio/bgm_right.wav',
      battleMusic: 'assets/audio/bgm_battle.wav',
      exits: { left: 'center_forest' },
      spawnFrom: { center_forest: { x: 42, y: 338 } },
      enemy: { x: 570, y: 288, radius: 60 },
    },
  };

  const VICTORY_MUSIC = 'assets/audio/bgm_victory.wav';
  const PHASE_TRANSFORM_MS = 3000;
  const BOSS_PHASES = [
    {
      label: '一相',
      hp: 8,
      speed: 0.84,
      scale: 0.42,
      aggroRadius: 340,
      className: 'phase-1',
      toast: '一相：落武者拔刀逼近，抓空檔用狐火斬擊。',
    },
    {
      label: '二相',
      hp: 9,
      speed: 0.96,
      scale: 0.5,
      aggroRadius: 440,
      ranged: true,
      projectileCooldown: 2100,
      projectileRange: 470,
      className: 'phase-2',
      toast: '二相：怨火離刃會遠攻，橫向移動避開火球。',
    },
    {
      label: '三相',
      hp: 9,
      speed: 0.62,
      scale: 0.68,
      aggroRadius: 470,
      aoe: true,
      aoeCooldown: 3000,
      aoeCastMs: 1350,
      aoeRadius: 132,
      className: 'phase-3',
      toast: '三相：妖氣暴走巨大化，看到紅圈就離開詠唱範圍。',
    },
  ];

  const DEFAULT_PLAYER_CONFIG = {
    frameWidth: 128,
    frameHeight: 128,
    offsetX: 0,
    offsetY: 0,
    scale: 0.8,
    animSpeed: 8,
    moveSpeed: 4,
    framesCount: 4,
  };

  const playerState = {
    x: 350,
    y: 280,
    direction: 0,
    currentFrame: 0,
    isMoving: false,
    hp: 5,
    maxHp: 5,
    invulnerableUntil: 0,
    lastAttackAt: -Infinity,
  };

  const enemyState = {
    x: 570,
    y: 288,
    direction: 0,
    currentFrame: 0,
    isMoving: false,
    phase: 0,
    hp: BOSS_PHASES[0].hp,
    maxHp: BOSS_PHASES[0].hp,
    active: false,
    lastHitAt: -Infinity,
    stunnedUntil: 0,
    transformingUntil: 0,
    invulnerableUntil: 0,
    lastGuardToastAt: -Infinity,
    lastProjectileAt: -Infinity,
    lastAoeAt: -Infinity,
    projectiles: [],
    aoeCast: null,
  };

  const storyState = {
    hasCharm: false,
    enemyDefeated: false,
    finaleShown: false,
  };

  const combatState = {
    inCombat: false,
    attackCooldown: 450,
    attackDamage: 3,
    invulnerabilityMs: 1200,
    projectileSpeed: 2.75,
    projectileRadius: 11,
    aoeDamage: 2,
  };

  let playerConfig = { ...DEFAULT_PLAYER_CONFIG };
  let playerNaturalWidth = 512;
  let playerNaturalHeight = 512;
  let playerProcessedURL = null;
  let npcNaturalWidth = 512;
  let npcNaturalHeight = 512;
  let enemyNaturalWidth = 512;
  let enemyNaturalHeight = 512;
  let activeVirtualDir = null;
  let lastFrameTime = 0;
  let lastAnimTime = 0;
  let lastEnemyAnimTime = 0;
  let currentInteractable = null;
  let toastTimer = null;
  let movementPauseUntil = 0;

  const keysPressed = {};
  const keyAliases = {
    arrowup: 'w',
    arrowleft: 'a',
    arrowdown: 's',
    arrowright: 'd',
  };

  const spriteSources = {
    player: 'assets/sprites/monster_fox.png',
    npc: 'assets/sprites/npc_merchant.png',
    enemy: 'assets/sprites/enemy_fallen_samurai.png',
  };

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function removeGreyCheckerBackground(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const diff = Math.max(r, g, b) - Math.min(r, g, b);
      const avg = (r + g + b) / 3;
      if (diff < 45 && avg > 100) {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  async function initializeSprites() {
    const [playerImg, npcImg, enemyImg] = await Promise.all([
      loadImage(spriteSources.player),
      loadImage(spriteSources.npc),
      loadImage(spriteSources.enemy),
    ]);

    if (playerImg) {
      playerNaturalWidth = playerImg.naturalWidth;
      playerNaturalHeight = playerImg.naturalHeight;
      try {
        playerProcessedURL = removeGreyCheckerBackground(playerImg);
      } catch (err) {
        playerProcessedURL = null;
        el.spriteControls.removeBg.checked = false;
        el.spriteControls.removeBg.disabled = true;
        showToast('玩家去背在目前開啟方式下受限，改用原始 spritesheet。');
      }
    }

    if (npcImg) {
      npcNaturalWidth = npcImg.naturalWidth;
      npcNaturalHeight = npcImg.naturalHeight;
      try {
        el.npc.style.backgroundImage = `url("${removeGreyCheckerBackground(npcImg)}")`;
      } catch (err) {
        el.npc.style.backgroundImage = `url("${spriteSources.npc}")`;
      }
      el.npc.classList.add('has-img');
    }

    if (enemyImg) {
      enemyNaturalWidth = enemyImg.naturalWidth;
      enemyNaturalHeight = enemyImg.naturalHeight;
    }

    playerConfig.frameWidth = playerNaturalWidth / 4;
    playerConfig.frameHeight = playerNaturalHeight / 4;
    playerConfig.scale = clamp(Number((104 / playerConfig.frameWidth).toFixed(2)), 0.2, 1.2);
    DEFAULT_PLAYER_CONFIG.frameWidth = playerConfig.frameWidth;
    DEFAULT_PLAYER_CONFIG.frameHeight = playerConfig.frameHeight;
    DEFAULT_PLAYER_CONFIG.scale = playerConfig.scale;

    playerState.x = 370;
    playerState.y = 346;
    updatePlayerBackground();
    updateSpriteControlValues();
    applyPlayerSpriteSettings();
    applyNpcSpriteSettings();
    applyEnemySpriteSettings();
  }

  function updatePlayerBackground() {
    if (el.spriteControls.removeBg.checked && playerProcessedURL) {
      el.player.style.backgroundImage = `url("${playerProcessedURL}")`;
    } else {
      el.player.style.backgroundImage = `url("${spriteSources.player}")`;
    }
  }

  function currentBossPhase() {
    return BOSS_PHASES[enemyState.phase] || BOSS_PHASES[0];
  }

  function currentEnemyScale() {
    return currentBossPhase().scale;
  }

  function applyPlayerSpriteSettings() {
    const width = playerConfig.frameWidth * playerConfig.scale;
    const height = playerConfig.frameHeight * playerConfig.scale;
    el.player.style.width = `${width}px`;
    el.player.style.height = `${height}px`;
    el.player.style.backgroundSize = `${playerNaturalWidth * playerConfig.scale}px ${playerNaturalHeight * playerConfig.scale}px`;
    renderPlayerSprite();
  }

  function applyNpcSpriteSettings() {
    const npcScale = playerConfig.scale;
    const frameW = npcNaturalWidth / 4;
    const frameH = npcNaturalHeight / 4;
    el.npc.style.width = `${frameW * npcScale}px`;
    el.npc.style.height = `${frameH * npcScale}px`;
    el.npc.style.backgroundSize = `${npcNaturalWidth * npcScale}px ${npcNaturalHeight * npcScale}px`;
    el.npc.style.backgroundPosition = '0px 0px';
  }

  function applyEnemySpriteSettings() {
    const scale = currentEnemyScale();
    const frameW = enemyNaturalWidth / 4;
    const frameH = enemyNaturalHeight / 4;
    el.enemy.style.width = `${frameW * scale}px`;
    el.enemy.style.height = `${frameH * scale}px`;
    el.enemy.style.backgroundImage = `url("${spriteSources.enemy}")`;
    el.enemy.style.backgroundSize = `${enemyNaturalWidth * scale}px ${enemyNaturalHeight * scale}px`;
    renderEnemySprite();
  }

  function renderPlayerSprite() {
    const xPos = -((playerState.currentFrame * playerConfig.frameWidth + playerConfig.offsetX) * playerConfig.scale);
    const yPos = -((playerState.direction * playerConfig.frameHeight + playerConfig.offsetY) * playerConfig.scale);
    el.player.style.left = `${playerState.x}px`;
    el.player.style.top = `${playerState.y}px`;
    el.player.style.backgroundPosition = `${xPos}px ${yPos}px`;
  }

  function renderEnemySprite() {
    const scale = currentEnemyScale();
    const frameW = enemyNaturalWidth / 4;
    const frameH = enemyNaturalHeight / 4;
    const xPos = -(enemyState.currentFrame * frameW * scale);
    const yPos = -(enemyState.direction * frameH * scale);
    el.enemy.style.left = `${enemyState.x}px`;
    el.enemy.style.top = `${enemyState.y}px`;
    el.enemy.style.backgroundPosition = `${xPos}px ${yPos}px`;
  }

  function playerSize() {
    return {
      width: playerConfig.frameWidth * playerConfig.scale,
      height: playerConfig.frameHeight * playerConfig.scale,
    };
  }

  function enemySize() {
    const scale = currentEnemyScale();
    return {
      width: (enemyNaturalWidth / 4) * scale,
      height: (enemyNaturalHeight / 4) * scale,
    };
  }

  function centerOf(rect) {
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }

  function getPlayerRect() {
    const size = playerSize();
    return { x: playerState.x, y: playerState.y, ...size };
  }

  function getEnemyRect() {
    const size = enemySize();
    return { x: enemyState.x, y: enemyState.y, ...size };
  }

  function insetRect(rect, xRatio, yRatio) {
    const xInset = rect.width * xRatio;
    const yInset = rect.height * yRatio;
    return {
      x: rect.x + xInset,
      y: rect.y + yInset,
      width: rect.width - xInset * 2,
      height: rect.height - yInset * 2,
    };
  }

  function getPlayerHurtRect() {
    return insetRect(getPlayerRect(), 0.2, 0.24);
  }

  function getEnemyContactRect() {
    return insetRect(getEnemyRect(), 0.28, 0.3);
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function updateEnemyPhaseClasses(timestamp = performance.now()) {
    const phase = currentBossPhase();
    const phaseClasses = BOSS_PHASES.map((item) => item.className);
    el.enemy.classList.remove(...phaseClasses);
    el.enemyHp.classList.remove(...phaseClasses);
    el.enemy.classList.add(phase.className);
    el.enemyHp.classList.add(phase.className);
    const transforming = timestamp < enemyState.transformingUntil;
    el.enemy.classList.toggle('transforming', transforming);
    el.enemyHp.classList.toggle('transforming', transforming);
  }

  function clearCombatEffects() {
    enemyState.projectiles.forEach((projectile) => {
      projectile.el.remove();
    });
    enemyState.projectiles = [];
    if (enemyState.aoeCast?.el) {
      enemyState.aoeCast.el.remove();
    }
    enemyState.aoeCast = null;
  }

  function applyEnemyPhase(phaseIndex, options = {}) {
    const previousCenter = options.keepCenter ? centerOf(getEnemyRect()) : null;
    enemyState.phase = clamp(phaseIndex, 0, BOSS_PHASES.length - 1);
    const phase = currentBossPhase();
    enemyState.maxHp = phase.hp;
    enemyState.hp = phase.hp;

    if (previousCenter) {
      const size = enemySize();
      enemyState.x = clamp(previousCenter.x - size.width / 2, 0, STAGE_WIDTH - size.width);
      enemyState.y = clamp(previousCenter.y - size.height / 2, 76, STAGE_HEIGHT - size.height);
    }

    applyEnemySpriteSettings();
    updateEnemyPhaseClasses();
    updateEnemyHP();
  }

  const audioManager = {
    audio: new Audio(),
    currentSrc: '',
    fadeTimer: null,
    volume: 0.5,

    init() {
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.volume = this.volume;
      this.switchTo(SCENES.center_forest.music, { immediate: true });
    },

    setVolume(value) {
      this.volume = value;
      this.audio.volume = value;
    },

    switchTo(src, options = {}) {
      if (this.currentSrc === src) {
        return;
      }
      this.currentSrc = src;
      window.clearInterval(this.fadeTimer);

      const startNewTrack = () => {
        this.audio.src = src;
        this.audio.currentTime = 0;
        this.audio.volume = options.immediate ? this.volume : 0;
        if (el.bgmToggle.checked) {
          this.audio.play().catch(() => {
            showToast('瀏覽器需要一次點擊或按鍵後才能播放音樂。');
          });
          if (!options.immediate) {
            this.fadeTo(this.volume, 300);
          }
        }
      };

      if (options.immediate || this.audio.paused) {
        startNewTrack();
        return;
      }

      this.fadeTo(0, 300, () => {
        this.audio.pause();
        startNewTrack();
      });
    },

    fadeTo(targetVolume, durationMs, done) {
      window.clearInterval(this.fadeTimer);
      const startVolume = this.audio.volume;
      const start = performance.now();
      this.fadeTimer = window.setInterval(() => {
        const pct = clamp((performance.now() - start) / durationMs, 0, 1);
        this.audio.volume = startVolume + (targetVolume - startVolume) * pct;
        if (pct >= 1) {
          window.clearInterval(this.fadeTimer);
          if (done) done();
        }
      }, 30);
    },

    play() {
      this.audio.volume = this.volume;
      this.audio.play().catch(() => {
        showToast('請點擊畫面或按任意鍵後再播放音樂。');
      });
    },

    pause() {
      this.audio.pause();
    },
  };

  function normalizeInputKey(key) {
    const lowered = key.toLowerCase();
    return keyAliases[lowered] || lowered;
  }

  function startMusicFromUserGesture() {
    if (!el.bgmToggle.checked) {
      el.bgmToggle.checked = true;
    }
    audioManager.play();
  }

  const sceneManager = {
    current: 'center_forest',

    enter(sceneId, fromScene) {
      const scene = SCENES[sceneId];
      const previous = this.current;
      this.current = sceneId;

      el.stage.style.backgroundImage = `url("${scene.background}")`;
      el.stage.classList.remove('scene-fade');
      void el.stage.offsetWidth;
      el.stage.classList.add('scene-fade');
      el.sceneLabel.textContent = scene.label;

      const spawn = scene.spawnFrom[fromScene] || scene.spawnFrom[previous] || { x: 370, y: 346 };
      playerState.x = spawn.x;
      playerState.y = spawn.y;
      activeVirtualDir = null;
      Object.keys(keysPressed).forEach((key) => {
        keysPressed[key] = false;
      });
      movementPauseUntil = performance.now() + 180;

      if (sceneId === 'right_battlefield' && storyState.hasCharm && !storyState.enemyDefeated) {
        startCombat();
      } else {
        endCombat({ keepTrack: true });
        audioManager.switchTo(storyState.finaleShown ? VICTORY_MUSIC : scene.music);
      }

      updateSceneActors();
      updateHUD();
      renderPlayerSprite();
    },

    tryHorizontalExit() {
      const size = playerSize();
      const scene = SCENES[this.current];

      if (playerState.x < -size.width * 0.22) {
        if (this.current === 'right_battlefield' && combatState.inCombat && enemyState.active) {
          playerState.x = 0;
          showToast('妖氣封住退路，先打倒落武者妖怪。');
          return;
        }
        if (scene.exits.left) {
          this.enter(scene.exits.left, this.current);
        } else {
          playerState.x = 0;
        }
      }

      if (playerState.x > STAGE_WIDTH - size.width * 0.78) {
        if (scene.exits.right === 'right_battlefield' && !storyState.hasCharm) {
          playerState.x = STAGE_WIDTH - size.width - 2;
          showToast('古戰場被妖氣封住了。先去左方狐火荒社取得御守。');
          return;
        }
        if (scene.exits.right) {
          this.enter(scene.exits.right, this.current);
        } else {
          playerState.x = STAGE_WIDTH - size.width;
        }
      }
    },
  };

  function updateSceneActors() {
    const scene = SCENES[sceneManager.current];

    el.npc.style.display = scene.npc ? 'block' : 'none';
    if (scene.npc) {
      el.npc.style.left = `${scene.npc.x}px`;
      el.npc.style.top = `${scene.npc.y}px`;
    }

    const charmVisible = scene.charm && !storyState.hasCharm;
    el.charm.classList.toggle('show', Boolean(charmVisible));
    if (scene.charm) {
      el.charm.style.left = `${scene.charm.x}px`;
      el.charm.style.top = `${scene.charm.y}px`;
    }

    enemyState.active = Boolean(scene.enemy && storyState.hasCharm && !storyState.enemyDefeated);
    el.enemy.classList.toggle('active', enemyState.active);
    el.enemyHp.classList.toggle('show', combatState.inCombat && enemyState.active);
    if (scene.enemy && !storyState.enemyDefeated && enemyState.hp <= 0) {
      resetEnemy();
    }
  }

  function resetEnemy() {
    const enemyConfig = SCENES.right_battlefield.enemy;
    clearCombatEffects();
    enemyState.x = enemyConfig.x;
    enemyState.y = enemyConfig.y;
    enemyState.direction = 0;
    enemyState.currentFrame = 0;
    enemyState.isMoving = false;
    enemyState.stunnedUntil = 0;
    enemyState.transformingUntil = 0;
    enemyState.invulnerableUntil = 0;
    enemyState.lastProjectileAt = -Infinity;
    enemyState.lastAoeAt = -Infinity;
    applyEnemyPhase(0);
  }

  function startCombat() {
    if (!combatState.inCombat) {
      showToast('落武者妖怪現身。按 J 或 Attack 以狐火斬擊！');
    }
    if (!combatState.inCombat) {
      showToast('落武者妖怪有三相血條；二相會遠攻，三相會詠唱大範圍 AOE。');
    }
    combatState.inCombat = true;
    enemyState.active = true;
    audioManager.switchTo(SCENES.right_battlefield.battleMusic);
    el.enemy.classList.add('active');
    el.enemyHp.classList.add('show');
    updateEnemyPhaseClasses();
    updateEnemyHP();
  }

  function endCombat(options = {}) {
    combatState.inCombat = false;
    clearCombatEffects();
    el.enemyHp.classList.remove('show');
    if (!options.keepTrack) {
      audioManager.switchTo(SCENES[sceneManager.current].music);
    }
  }

  function updateInteractable() {
    currentInteractable = null;
    const scene = SCENES[sceneManager.current];
    const playerCenter = centerOf(getPlayerRect());

    if (scene.npc) {
      const npcSize = {
        width: (npcNaturalWidth / 4) * playerConfig.scale,
        height: (npcNaturalHeight / 4) * playerConfig.scale,
      };
      const npcCenter = {
        x: scene.npc.x + npcSize.width / 2,
        y: scene.npc.y + npcSize.height / 2,
      };
      if (distance(playerCenter, npcCenter) < scene.npc.radius) {
        currentInteractable = { type: 'npc', x: npcCenter.x, y: scene.npc.y - 6 };
      }
    }

    if (scene.charm && !storyState.hasCharm) {
      const charmCenter = { x: scene.charm.x + 29, y: scene.charm.y + 29 };
      if (distance(playerCenter, charmCenter) < scene.charm.radius) {
        currentInteractable = { type: 'charm', x: charmCenter.x, y: scene.charm.y - 6 };
      }
    }

    if (currentInteractable && !dialogSystem.active) {
      el.hint.textContent = currentInteractable.type === 'charm' ? 'Space 取得御守' : 'Space 交談';
      el.hint.style.left = `${currentInteractable.x - 52}px`;
      el.hint.style.top = `${currentInteractable.y}px`;
      el.hint.classList.add('show');
    } else {
      el.hint.classList.remove('show');
    }
  }

  const dialogSystem = {
    active: false,
    lines: [],
    index: 0,
    onDone: null,
    spaceLocked: false,

    open(name, lines, onDone) {
      this.active = true;
      this.lines = lines;
      this.index = 0;
      this.onDone = onDone || null;
      this.spaceLocked = true;
      el.dialogName.textContent = name;
      el.dialogText.textContent = lines[0];
      el.dialog.classList.add('active');
      el.hint.classList.remove('show');
      window.setTimeout(() => {
        this.spaceLocked = false;
      }, 160);
    },

    next() {
      if (!this.active || this.spaceLocked) {
        return;
      }
      this.index += 1;
      if (this.index >= this.lines.length) {
        this.close();
        return;
      }
      el.dialogText.textContent = this.lines[this.index];
      this.spaceLocked = true;
      window.setTimeout(() => {
        this.spaceLocked = false;
      }, 120);
    },

    close() {
      this.active = false;
      el.dialog.classList.remove('active');
      const done = this.onDone;
      this.onDone = null;
      if (done) done();
      updateHUD();
    },
  };

  function interact() {
    if (dialogSystem.active) {
      dialogSystem.next();
      return;
    }

    if (!currentInteractable) {
      return;
    }

    if (currentInteractable.type === 'npc') {
      openNpcDialogue();
    }

    if (currentInteractable.type === 'charm') {
      storyState.hasCharm = true;
      playerState.hp = playerState.maxHp;
      updateSceneActors();
      updateHUD();
      dialogSystem.open('狐火荒社', [
        '石燈忽然亮起，狐火御守落入你的掌心。',
        '你感到尾尖的火焰變得穩定。古戰場的妖氣，現在可以斬開。',
      ], () => {
        showToast('取得狐火御守。前往右方古戰場。');
      });
    }
  }

  function openNpcDialogue() {
    if (storyState.enemyDefeated) {
      dialogSystem.open('神秘商人', [
        '你真的回來了。落武者的怨氣被狐火燒散，這片森林今晚終於能安靜下來。',
        'Demo Clear：你完成了狐火荒社、迷霧森林、古戰場的 MVP 路線。',
      ], () => {
        storyState.finaleShown = true;
        el.endingCard.classList.add('show');
        audioManager.switchTo(VICTORY_MUSIC);
        updateWorldMood();
        showToast('妖霧散去，森林重新亮起來了。');
        updateHUD();
      });
      return;
    }

    if (storyState.hasCharm) {
      dialogSystem.open('神秘商人', [
        '御守已經醒了。往右走，古戰場的封印會讓你通過。',
        '小心落武者妖怪。靠近會受傷，按 J 以狐火斬擊。',
      ]);
      return;
    }

    dialogSystem.open('神秘商人', [
      '噓，別再往右了。古戰場的妖氣封住道路，空手進去只會被怨念吞掉。',
      '先去左方的狐火荒社，取回一枚御守。狐火能把妖氣斬開。',
    ]);
  }

  function attack() {
    const now = performance.now();
    if (now - playerState.lastAttackAt < combatState.attackCooldown) {
      return;
    }
    playerState.lastAttackAt = now;
    showSlashEffect();

    if (!combatState.inCombat || !enemyState.active) {
      return;
    }

    const attackRect = getAttackRect();
    if (rectsOverlap(attackRect, getEnemyRect())) {
      if (now < enemyState.invulnerableUntil) {
        el.enemy.classList.remove('guarded');
        void el.enemy.offsetWidth;
        el.enemy.classList.add('guarded');
        if (now - enemyState.lastGuardToastAt > 900) {
          showToast('變身無敵中，先拉開距離等妖氣散掉。');
          enemyState.lastGuardToastAt = now;
        }
        return;
      }

      enemyState.hp -= combatState.attackDamage;
      enemyState.lastHitAt = now;
      enemyState.stunnedUntil = now + 520;
      knockEnemyBack();
      el.enemy.classList.remove('hit');
      void el.enemy.offsetWidth;
      el.enemy.classList.add('hit');
      updateEnemyHP();

      if (enemyState.hp <= 0) {
        if (enemyState.phase < BOSS_PHASES.length - 1) {
          beginEnemyPhaseTransition(now);
          return;
        }
        defeatEnemy();
        return;
      }
    }
  }

  function beginEnemyPhaseTransition(timestamp) {
    const nextPhase = enemyState.phase + 1;
    clearCombatEffects();
    applyEnemyPhase(nextPhase, { keepCenter: true });
    enemyState.transformingUntil = timestamp + PHASE_TRANSFORM_MS;
    enemyState.invulnerableUntil = timestamp + PHASE_TRANSFORM_MS;
    enemyState.stunnedUntil = timestamp + PHASE_TRANSFORM_MS;
    enemyState.lastProjectileAt = timestamp + 900;
    enemyState.lastAoeAt = timestamp + 1200;
    playerState.hp = Math.min(playerState.maxHp, playerState.hp + 1);
    updateEnemyPhaseClasses(timestamp);
    updateEnemyHP();
    updateHUD();
    showToast(`${currentBossPhase().label}變身：3 秒無敵，血條已重置。`);
  }

  function defeatEnemy() {
    storyState.enemyDefeated = true;
    enemyState.active = false;
    clearCombatEffects();
    el.enemy.classList.remove('active');
    endCombat({ keepTrack: true });
    audioManager.switchTo(VICTORY_MUSIC);
    updateWorldMood();
    updateHUD();
    showToast('落武者妖怪淨化，妖霧散開；回迷霧森林向商人回報。');
  }

  function getAttackRect() {
    const player = getPlayerRect();
    const reach = 68;
    const center = centerOf(player);
    if (playerState.direction === 0) {
      return { x: center.x - 46, y: player.y + player.height - 8, width: 92, height: reach };
    }
    if (playerState.direction === 1) {
      return { x: player.x - reach + 8, y: center.y - 58, width: reach, height: 116 };
    }
    if (playerState.direction === 2) {
      return { x: player.x + player.width - 8, y: center.y - 58, width: reach, height: 116 };
    }
    return { x: center.x - 46, y: player.y - reach + 8, width: 92, height: reach };
  }

  function showSlashEffect() {
    const rect = getAttackRect();
    el.slash.style.left = `${rect.x + rect.width / 2 - 46}px`;
    el.slash.style.top = `${rect.y + rect.height / 2 - 29}px`;
    el.slash.classList.remove('show');
    void el.slash.offsetWidth;
    el.slash.classList.add('show');
  }

  function knockEnemyBack() {
    const playerCenter = centerOf(getPlayerRect());
    const enemyRect = getEnemyRect();
    const enemyCenter = centerOf(enemyRect);
    const dx = enemyCenter.x - playerCenter.x;
    const dy = enemyCenter.y - playerCenter.y;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    enemyState.x += (dx / len) * 52;
    enemyState.y += (dy / len) * 36;
    enemyState.x = clamp(enemyState.x, 0, STAGE_WIDTH - enemyRect.width);
    enemyState.y = clamp(enemyState.y, 76, STAGE_HEIGHT - enemyRect.height);
  }

  function spawnBossProjectile(timestamp, enemyCenter, playerCenter) {
    const dx = playerCenter.x - enemyCenter.x;
    const dy = playerCenter.y - enemyCenter.y;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const projectile = {
      x: enemyCenter.x,
      y: enemyCenter.y,
      vx: (dx / len) * combatState.projectileSpeed,
      vy: (dy / len) * combatState.projectileSpeed,
      radius: combatState.projectileRadius,
      expiresAt: timestamp + 3200,
      el: document.createElement('span'),
    };
    projectile.el.className = 'boss-projectile';
    el.combatEffects.appendChild(projectile.el);
    enemyState.projectiles.push(projectile);
    renderProjectile(projectile);
  }

  function renderProjectile(projectile) {
    projectile.el.style.left = `${projectile.x - projectile.radius}px`;
    projectile.el.style.top = `${projectile.y - projectile.radius}px`;
    projectile.el.style.width = `${projectile.radius * 2}px`;
    projectile.el.style.height = `${projectile.radius * 2}px`;
  }

  function updateProjectiles(timestamp, deltaScale) {
    if (!enemyState.projectiles.length) {
      return;
    }

    const playerRect = getPlayerRect();
    const playerCenter = centerOf(playerRect);
    const nextProjectiles = [];

    enemyState.projectiles.forEach((projectile) => {
      projectile.x += projectile.vx * deltaScale;
      projectile.y += projectile.vy * deltaScale;

      const projectileRect = {
        x: projectile.x - projectile.radius,
        y: projectile.y - projectile.radius,
        width: projectile.radius * 2,
        height: projectile.radius * 2,
      };
      const expired = timestamp > projectile.expiresAt
        || projectile.x < -24
        || projectile.x > STAGE_WIDTH + 24
        || projectile.y < 48
        || projectile.y > STAGE_HEIGHT + 24;

      if (expired) {
        projectile.el.remove();
        return;
      }

      if (rectsOverlap(projectileRect, getPlayerHurtRect())) {
        projectile.el.remove();
        damagePlayer(timestamp, playerCenter.x - projectile.x, playerCenter.y - projectile.y);
        return;
      }

      renderProjectile(projectile);
      nextProjectiles.push(projectile);
    });

    enemyState.projectiles = nextProjectiles;
  }

  function startBossAoe(timestamp, enemyCenter, phase) {
    enemyState.lastAoeAt = timestamp;
    const aoeEl = document.createElement('span');
    aoeEl.className = 'boss-aoe casting';
    enemyState.aoeCast = {
      x: enemyCenter.x,
      y: enemyCenter.y,
      radius: phase.aoeRadius,
      startedAt: timestamp,
      resolveAt: timestamp + phase.aoeCastMs,
      el: aoeEl,
    };
    el.combatEffects.appendChild(aoeEl);
    renderBossAoe(timestamp);
    showToast('三相正在詠唱 AOE，離開紅圈！');
  }

  function renderBossAoe(timestamp) {
    const aoe = enemyState.aoeCast;
    if (!aoe) {
      return;
    }
    const progress = clamp((timestamp - aoe.startedAt) / Math.max(1, aoe.resolveAt - aoe.startedAt), 0, 1);
    aoe.el.style.left = `${aoe.x - aoe.radius}px`;
    aoe.el.style.top = `${aoe.y - aoe.radius}px`;
    aoe.el.style.width = `${aoe.radius * 2}px`;
    aoe.el.style.height = `${aoe.radius * 2}px`;
    aoe.el.style.setProperty('--cast-progress', progress.toFixed(3));
  }

  function updateBossAoe(timestamp) {
    const aoe = enemyState.aoeCast;
    if (!aoe) {
      return false;
    }

    renderBossAoe(timestamp);
    if (timestamp < aoe.resolveAt) {
      return true;
    }

    const playerCenter = centerOf(getPlayerRect());
    const dx = playerCenter.x - aoe.x;
    const dy = playerCenter.y - aoe.y;
    if (Math.sqrt(dx * dx + dy * dy) <= aoe.radius) {
      damagePlayer(timestamp, dx, dy, combatState.aoeDamage);
    }

    aoe.el.classList.remove('casting');
    aoe.el.classList.add('blast');
    window.setTimeout(() => {
      aoe.el.remove();
    }, 260);
    enemyState.aoeCast = null;
    return false;
  }

  function updateEnemy(timestamp, deltaScale) {
    if (!combatState.inCombat || !enemyState.active) {
      return;
    }

    updateEnemyPhaseClasses(timestamp);
    updateProjectiles(timestamp, deltaScale);

    const playerCenter = centerOf(getPlayerRect());
    const enemyRect = getEnemyRect();
    const enemyCenter = centerOf(enemyRect);
    const dx = playerCenter.x - enemyCenter.x;
    const dy = playerCenter.y - enemyCenter.y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const phase = currentBossPhase();

    if (timestamp < enemyState.transformingUntil || timestamp < enemyState.stunnedUntil) {
      enemyState.isMoving = false;
      renderEnemySprite();
      updateEnemyHP();
      return;
    }

    if (updateBossAoe(timestamp)) {
      enemyState.isMoving = false;
      renderEnemySprite();
      updateEnemyHP();
      return;
    }

    if (phase.aoe && dist < phase.aoeRadius + 92 && timestamp - enemyState.lastAoeAt > phase.aoeCooldown) {
      enemyState.isMoving = false;
      startBossAoe(timestamp, enemyCenter, phase);
      renderEnemySprite();
      updateEnemyHP();
      return;
    }

    if (phase.ranged && dist < phase.projectileRange && timestamp - enemyState.lastProjectileAt > phase.projectileCooldown) {
      enemyState.lastProjectileAt = timestamp;
      spawnBossProjectile(timestamp, enemyCenter, playerCenter);
    }

    if (dist > phase.aggroRadius) {
      enemyState.isMoving = false;
      enemyState.currentFrame = 0;
      renderEnemySprite();
      updateEnemyHP();
      return;
    }

    enemyState.isMoving = dist > 54;
    if (enemyState.isMoving) {
      const speed = phase.speed;
      enemyState.x += (dx / dist) * speed * deltaScale;
      enemyState.y += (dy / dist) * speed * deltaScale;
      enemyState.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3);
    }

    if (timestamp - lastEnemyAnimTime > 140) {
      enemyState.currentFrame = enemyState.isMoving ? (enemyState.currentFrame + 1) % 4 : 0;
      lastEnemyAnimTime = timestamp;
    }

    const maxX = STAGE_WIDTH - enemyRect.width;
    const maxY = STAGE_HEIGHT - enemyRect.height;
    enemyState.x = clamp(enemyState.x, 0, maxX);
    enemyState.y = clamp(enemyState.y, 76, maxY);

    if (rectsOverlap(getPlayerHurtRect(), getEnemyContactRect())) {
      damagePlayer(timestamp, dx, dy);
    }

    renderEnemySprite();
    updateEnemyHP();
  }

  function damagePlayer(timestamp, dx, dy, amount = 1) {
    if (timestamp < playerState.invulnerableUntil) {
      return;
    }
    playerState.hp = Math.max(0, playerState.hp - amount);
    playerState.invulnerableUntil = timestamp + combatState.invulnerabilityMs;
    el.player.classList.add('hurt');

    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    playerState.x += (dx / len) * 70;
    playerState.y += (dy / len) * 56;
    constrainPlayer();
    updateHUD();

    if (playerState.hp <= 0) {
      playerDefeated();
    }
  }

  function playerDefeated() {
    playerState.hp = playerState.maxHp;
    playerState.invulnerableUntil = performance.now() + 900;
    resetEnemy();
    endCombat();
    showToast('狐妖被怨念擊退，回到迷霧森林。御守仍然在你身上。');
    sceneManager.enter('center_forest', 'right_battlefield');
  }

  function updateEnemyHP() {
    updateEnemyPhaseClasses();
    const pct = clamp(enemyState.hp / enemyState.maxHp, 0, 1);
    const phase = currentBossPhase();
    if (el.enemyHpLabel) {
      const status = performance.now() < enemyState.transformingUntil ? '變身無敵' : `${enemyState.hp}/${enemyState.maxHp}`;
      el.enemyHpLabel.textContent = `落武者妖怪 - ${phase.label} ${status}`;
    }
    el.enemyHpFill.style.width = `${pct * 100}%`;
    const enemyRect = getEnemyRect();
    el.enemyHp.style.left = `${clamp(enemyState.x + enemyRect.width / 2 - 104, 8, STAGE_WIDTH - 216)}px`;
    el.enemyHp.style.top = `${clamp(enemyState.y - 34, 70, STAGE_HEIGHT - 60)}px`;
  }

  function updateHUD() {
    el.hpHearts.innerHTML = '';
    for (let i = 0; i < playerState.maxHp; i += 1) {
      const heart = document.createElement('span');
      heart.className = `heart${i >= playerState.hp ? ' empty' : ''}`;
      el.hpHearts.appendChild(heart);
    }

    if (storyState.finaleShown) {
      el.objectiveText.textContent = 'Demo 完成：可繼續探索三個場景';
    } else if (storyState.enemyDefeated) {
      el.objectiveText.textContent = '回迷霧森林向神秘商人回報';
    } else if (combatState.inCombat) {
      el.objectiveText.textContent = '擊敗落武者妖怪';
    } else if (storyState.hasCharm) {
      el.objectiveText.textContent = '前往右方古戰場';
    } else {
      el.objectiveText.textContent = '與商人交談，前往左方荒社取御守';
    }

    Object.entries(el.mapNodes).forEach(([sceneId, node]) => {
      node.classList.toggle('active', sceneId === sceneManager.current);
    });
    el.mapNodes.right_battlefield.classList.toggle('locked', !storyState.hasCharm);
    updateWorldMood();
  }

  function updateWorldMood() {
    el.stage.classList.toggle('boss-cleared', storyState.enemyDefeated && !storyState.finaleShown);
    el.stage.classList.toggle('victory-mode', storyState.finaleShown);
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.classList.add('show');
    toastTimer = window.setTimeout(() => {
      el.toast.classList.remove('show');
    }, 2600);
  }

  function handleMovement(timestamp, deltaScale) {
    let dx = 0;
    let dy = 0;
    let isMoving = false;
    let newDirection = playerState.direction;

    if (!dialogSystem.active && timestamp >= movementPauseUntil) {
      if (keysPressed.s) { dy += 1; newDirection = 0; isMoving = true; }
      if (keysPressed.w) { dy -= 1; newDirection = 3; isMoving = true; }
      if (keysPressed.d) { dx += 1; newDirection = 2; isMoving = true; }
      if (keysPressed.a) { dx -= 1; newDirection = 1; isMoving = true; }

      if (!isMoving && activeVirtualDir) {
        isMoving = true;
        if (activeVirtualDir === 's') { dy += 1; newDirection = 0; }
        if (activeVirtualDir === 'w') { dy -= 1; newDirection = 3; }
        if (activeVirtualDir === 'd') { dx += 1; newDirection = 2; }
        if (activeVirtualDir === 'a') { dx -= 1; newDirection = 1; }
      }
    }

    playerState.isMoving = isMoving;
    playerState.direction = newDirection;

    if (isMoving) {
      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }
      playerState.x += dx * playerConfig.moveSpeed * deltaScale;
      playerState.y += dy * playerConfig.moveSpeed * deltaScale;
      constrainPlayer();
      sceneManager.tryHorizontalExit();

      const animInterval = 1000 / playerConfig.animSpeed;
      if (timestamp - lastAnimTime > animInterval) {
        playerState.currentFrame = (playerState.currentFrame + 1) % playerConfig.framesCount;
        lastAnimTime = timestamp;
      }
    } else {
      playerState.currentFrame = 0;
    }
  }

  function constrainPlayer() {
    const size = playerSize();
    playerState.y = clamp(playerState.y, 76, STAGE_HEIGHT - size.height);
    if (playerState.x > -size.width * 0.3 && playerState.x < STAGE_WIDTH - size.width * 0.7) {
      return;
    }
    if (sceneManager.current === 'left_shrine' && playerState.x < 0) {
      playerState.x = 0;
    }
    if (sceneManager.current === 'right_battlefield' && playerState.x > STAGE_WIDTH - size.width) {
      playerState.x = STAGE_WIDTH - size.width;
    }
  }

  function updateGame(timestamp) {
    const deltaScale = lastFrameTime ? clamp((timestamp - lastFrameTime) / 16.67, 0.35, 2.2) : 1;
    lastFrameTime = timestamp;

    if (timestamp >= playerState.invulnerableUntil) {
      el.player.classList.remove('hurt');
    }

    handleMovement(timestamp, deltaScale);
    updateInteractable();
    updateEnemy(timestamp, deltaScale);
    renderPlayerSprite();

    requestAnimationFrame(updateGame);
  }

  function updateSpriteControlValues() {
    const controls = el.spriteControls;
    controls.frameWidth.max = Math.max(playerNaturalWidth, 512);
    controls.frameHeight.max = Math.max(playerNaturalHeight, 512);
    controls.frameWidth.value = playerConfig.frameWidth;
    controls.frameHeight.value = playerConfig.frameHeight;
    controls.offsetX.value = playerConfig.offsetX;
    controls.offsetY.value = playerConfig.offsetY;
    controls.scale.value = playerConfig.scale;
    controls.animSpeed.value = playerConfig.animSpeed;
    controls.moveSpeed.value = playerConfig.moveSpeed;
    controls.framesCount.value = playerConfig.framesCount;
    controls.values.frameWidth.textContent = Number(playerConfig.frameWidth.toFixed(1));
    controls.values.frameHeight.textContent = Number(playerConfig.frameHeight.toFixed(1));
    controls.values.offsetX.textContent = playerConfig.offsetX;
    controls.values.offsetY.textContent = playerConfig.offsetY;
    controls.values.scale.textContent = playerConfig.scale.toFixed(2);
    controls.values.animSpeed.textContent = playerConfig.animSpeed;
    controls.values.moveSpeed.textContent = playerConfig.moveSpeed;
    controls.values.framesCount.textContent = playerConfig.framesCount;
  }

  function bindControls() {
    const controls = el.spriteControls;
    controls.frameWidth.addEventListener('input', (event) => {
      playerConfig.frameWidth = Number(event.target.value);
      controls.values.frameWidth.textContent = Number(playerConfig.frameWidth.toFixed(1));
      applyPlayerSpriteSettings();
    });
    controls.frameHeight.addEventListener('input', (event) => {
      playerConfig.frameHeight = Number(event.target.value);
      controls.values.frameHeight.textContent = Number(playerConfig.frameHeight.toFixed(1));
      applyPlayerSpriteSettings();
    });
    controls.offsetX.addEventListener('input', (event) => {
      playerConfig.offsetX = Number(event.target.value);
      controls.values.offsetX.textContent = playerConfig.offsetX;
      applyPlayerSpriteSettings();
    });
    controls.offsetY.addEventListener('input', (event) => {
      playerConfig.offsetY = Number(event.target.value);
      controls.values.offsetY.textContent = playerConfig.offsetY;
      applyPlayerSpriteSettings();
    });
    controls.scale.addEventListener('input', (event) => {
      playerConfig.scale = Number(event.target.value);
      controls.values.scale.textContent = playerConfig.scale.toFixed(2);
      applyPlayerSpriteSettings();
      applyNpcSpriteSettings();
      updateSceneActors();
    });
    controls.removeBg.addEventListener('change', updatePlayerBackground);
    controls.animSpeed.addEventListener('input', (event) => {
      playerConfig.animSpeed = Number(event.target.value);
      controls.values.animSpeed.textContent = playerConfig.animSpeed;
    });
    controls.moveSpeed.addEventListener('input', (event) => {
      playerConfig.moveSpeed = Number(event.target.value);
      controls.values.moveSpeed.textContent = playerConfig.moveSpeed;
    });
    controls.framesCount.addEventListener('input', (event) => {
      playerConfig.framesCount = Number(event.target.value);
      controls.values.framesCount.textContent = playerConfig.framesCount;
    });
    controls.toggleBg.addEventListener('click', () => {
      el.stage.classList.toggle('hide-bg');
    });
    controls.reset.addEventListener('click', () => {
      playerConfig = { ...DEFAULT_PLAYER_CONFIG };
      updateSpriteControlValues();
      updatePlayerBackground();
      applyPlayerSpriteSettings();
      applyNpcSpriteSettings();
    });

    window.addEventListener('keydown', (event) => {
      const key = normalizeInputKey(event.key);
      startMusicFromUserGesture();
      if (['w', 'a', 's', 'd', ' ', 'j'].includes(key)) {
        event.preventDefault();
      }
      if (key === ' ') {
        interact();
        return;
      }
      if (key === 'j') {
        attack();
        return;
      }
      keysPressed[key] = true;
    });

    window.addEventListener('keyup', (event) => {
      keysPressed[normalizeInputKey(event.key)] = false;
    });

    const directions = [
      { code: 'w', element: el.dpadButtons.up },
      { code: 'a', element: el.dpadButtons.left },
      { code: 's', element: el.dpadButtons.down },
      { code: 'd', element: el.dpadButtons.right },
    ];

    directions.forEach((dir) => {
      const press = (event) => {
        event.preventDefault();
        startMusicFromUserGesture();
        activeVirtualDir = dir.code;
        dir.element.classList.add('active');
      };
      const release = () => {
        activeVirtualDir = null;
        dir.element.classList.remove('active');
      };
      dir.element.addEventListener('mousedown', press);
      dir.element.addEventListener('touchstart', press, { passive: false });
      dir.element.addEventListener('mouseup', release);
      dir.element.addEventListener('mouseleave', release);
      dir.element.addEventListener('touchend', release);
      dir.element.addEventListener('touchcancel', release);
    });

    el.attackButton.addEventListener('click', () => {
      startMusicFromUserGesture();
      attack();
    });
    el.dialog.addEventListener('click', () => dialogSystem.next());

    el.bgmToggle.addEventListener('change', () => {
      if (el.bgmToggle.checked) {
        audioManager.play();
      } else {
        audioManager.pause();
      }
    });

    el.bgmVolume.addEventListener('input', (event) => {
      const value = Number(event.target.value);
      el.bgmVolumeValue.textContent = value;
      audioManager.setVolume(value / 100);
    });

    window.addEventListener('resize', resizeStage);
  }

  function resizeStage() {
    const available = Math.min(STAGE_WIDTH, el.stageWrapper.parentElement.clientWidth);
    const scale = available / STAGE_WIDTH;
    el.stageWrapper.style.width = `${STAGE_WIDTH * scale}px`;
    el.stageWrapper.style.height = `${STAGE_HEIGHT * scale}px`;
    el.stage.style.transform = `scale(${scale})`;
    el.stage.style.transformOrigin = 'top left';
  }

  async function boot() {
    bindControls();
    audioManager.init();
    await initializeSprites();
    resizeStage();
    updateSceneActors();
    updateHUD();
    showToast('先與森林中的神秘商人交談。');
    requestAnimationFrame(updateGame);
  }

  boot();
});
