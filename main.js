// ============================================================
//  坦克大战 - 核心游戏逻辑 (main.js)
//  技术栈: HTML5 Canvas + 原生 ES6+ JavaScript (无第三方依赖)
// ============================================================

// ─── 工具函数 ──────────────────────────────────────────────

/** AABB 轴对齐包围盒碰撞检测 */
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

/** 创建矩形对象 */
function rect(x, y, w, h) {
  return { x, y, w, h };
}

/** 随机整数 [min, max] */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 随机方向 */
function randDir() {
  const dirs = ['up', 'down', 'left', 'right'];
  return dirs[randInt(0, dirs.length - 1)];
}

/** 格子对齐：将坐标对齐到最近的格子边界（±TILE/2 范围内） */
function snapToGrid(pos) {
  return Math.round(pos / TILE) * TILE;
}

/** 判断坦克是否已接近格子边界（允许转向） */
function isAligned(tank) {
  const margin = 8; // 像素容差
  const cx = tank.x + tank.w / 2;
  const cy = tank.y + tank.h / 2;
  const gx = snapToGrid(cx);
  const gy = snapToGrid(cy);
  return Math.abs(cx - gx) < margin && Math.abs(cy - gy) < margin;
}

/** 方向转 dx/dy */
function dirToVec(dir) {
  switch (dir) {
    case 'up':    return { dx: 0,  dy: -1 };
    case 'down':  return { dx: 0,  dy: 1  };
    case 'left':  return { dx: -1, dy: 0  };
    case 'right': return { dx: 1,  dy: 0  };
  }
}

// ─── 地图配置 ──────────────────────────────────────────────

const TILE = 40;           // 格子像素大小
const COLS = 13;            // 列数（13格）
const ROWS = 13;            // 行数（13格）
const CW = COLS * TILE;     // 520px
const CH = ROWS * TILE;     // 520px
const PLAYER_SPEED = 2;
const BULLET_SPEED = 6;
const ENEMY_SPEED = 1;

// 敌方坦克类型配置
const ENEMY_TYPES = {
  LIGHT: { name: 'light', color: '#f0f0f0', speed: ENEMY_SPEED, hp: 1, score: 100, fireRate: 1500 },
  ARMOR: { name: 'armor', color: '#a0a0a0', speed: ENEMY_SPEED * 1.5, hp: 1, score: 200, fireRate: 1500 },
  SPEED: { name: 'speed', color: '#87ceeb', speed: ENEMY_SPEED * 0.7, hp: 1, score: 300, fireRate: 1000 },
  HEAVY: { name: 'heavy', color: '#90EE90', speed: ENEMY_SPEED, hp: 4, score: 400, fireRate: 2000 },
};

// AI状态枚举
const AI_STATE = {
  PATROL: 'patrol',    // 巡逻：随机移动
  CHASE: 'CHASE',     // 追击：朝玩家移动
  SHOOT: 'shoot',      // 射击：朝向玩家开火
  STUCK: 'stuck',      // 卡住：尝试换方向
};

// 索敌距离（像素）
const DETECTION_RANGE = 250;
// 射击距离
const SHOOT_RANGE = 200;

// 地形类型
const T = {
  EMPTY: 0,   // 空地
  BRICK: 1,   // 砖墙（可破坏）
  STEEL: 2,   // 钢板（不可破坏）
  GRASS: 3,   // 草丛（遮挡显示，可通过）
  RIVER: 4,   // 河流（坦克不能通过，子弹能通过）
  ICE: 5,     // 雪地（打滑，坦克移动方向随机偏移）
  BASE: 6,    // 基地老鹰
};

// 预设关卡（13×13）
const LEVELS = [
  // Level 1 - 对称迷宫
  [
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,0,1,1,0,1,1,0,1,1,0],
    [0,1,1,0,1,1,0,1,1,0,1,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,0,2,2,0,0,0,2,2,0,1,0],
    [0,1,0,2,2,0,0,0,2,2,0,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,0,1,1,0,1,1,0,1,1,0],
    [0,1,1,0,1,1,0,1,1,0,1,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,0,1,1,0,0,0,1,1,0,1,0],
    [0,1,0,1,1,1,6,1,1,1,0,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
  ],
  // Level 2 - 雪地战场
  [
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,5,5,0,1,1,0,1,1,0,5,5,0],
    [0,5,5,0,1,1,0,1,1,0,5,5,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,0,2,0,1,0,1,0,2,0,1,0],
    [0,1,0,2,0,1,0,1,0,2,0,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,5,0,1,0,5,0,5,0,1,0,5,0],
    [0,5,0,1,0,5,0,5,0,1,0,5,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,0,1,1,0,1,1,0,1,1,0],
    [0,1,1,0,1,1,0,1,1,0,1,1,0],
    [0,0,0,0,0,0,6,0,0,0,0,0,0],
  ],
  // Level 3 - 钢铁堡垒
  [
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,0,1,0,1,0,1,0,1,0,1,0],
    [0,1,0,1,0,1,0,1,0,1,0,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,2,0,0,0,2,0,2,0,0,0,2,0],
    [0,2,0,0,0,2,0,2,0,0,0,2,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,0,2,0,1,0,1,0,2,0,1,0],
    [0,1,0,2,0,1,0,1,0,2,0,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,2,0,0,0,2,0,2,0,0,0,2,0],
    [0,2,0,0,0,2,0,2,0,0,0,2,0],
    [0,0,0,0,0,0,6,0,0,0,0,0,0],
  ],
  // Level 4 - 冰河纵横
  [
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,5,5,5,5,5,0,5,5,5,5,5,0],
    [0,5,5,5,5,5,0,5,5,5,5,5,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,0,1,0,1,0,1,0,1,0,1,0],
    [0,1,0,1,0,1,0,1,0,1,0,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,2,0,2,0,2,0,2,0,2,0,2,0],
    [0,2,0,2,0,2,0,2,0,2,0,2,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,5,0,5,0,5,0,5,0,5,0,5,0],
    [0,5,0,5,0,5,0,5,0,5,0,5,0],
    [0,0,0,0,0,0,6,0,0,0,0,0,0],
  ],
  // Level 5 - 混合攻防
  [
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,0,1,1,0,1,1,0,1,1,0],
    [0,1,1,0,1,1,0,1,1,0,1,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,5,0,5,0,5,0,5,0,5,0,5,0],
    [0,5,0,5,0,5,0,5,0,5,0,5,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,2,2,0,2,2,0,2,2,0,2,2,0],
    [0,2,2,0,2,2,0,2,2,0,2,2,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,0,1,0,1,0,1,0,1,0,1,0],
    [0,1,0,1,0,1,0,1,0,1,0,1,0],
    [0,0,0,0,0,0,6,0,0,0,0,0,0],
  ],
];

/** 精英怪类型配置 */
const ELITE_TYPES = {
  COMMANDER: { name: 'commander', color: '#ff4444', speed: ENEMY_SPEED * 0.8, hp: 8, score: 1000, fireRate: 800 },
  BOSS: { name: 'boss', color: '#aa0000', speed: ENEMY_SPEED * 0.5, hp: 20, score: 5000, fireRate: 500 },
};

/** 奖励选项 */
const REWARD_OPTIONS = [
  { type: 'STAR', label: '⚡ 火力升级', desc: '子弹穿透+1' },
  { type: 'HELMET', label: '🛡️ 无敌10秒', desc: '完全免疫伤害' },
  { type: 'LIFE', label: '❤️ 额外生命', desc: '+1生命上限' },
  { type: 'SHIELD', label: '🔰 护盾20秒', desc: '受到伤害减半' },
  { type: 'BOMB', label: '💣 清屏炸弹', desc: '消灭所有敌人' },
  { type: 'SPEED', label: '🏃 速度提升', desc: '移动速度+30%' },
];

/** 加载指定关卡数据 */
function loadLevel(levelIndex) {
  const levelData = LEVELS[levelIndex % LEVELS.length];
  const data = [];
  for (let r = 0; r < ROWS; r++) {
    data[r] = [...levelData[r]]; // 深拷贝
  }
  return data;
}

// ─── 实体基类 ──────────────────────────────────────────────

class Entity {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.active = true;
  }

  rect() { return rect(this.x, this.y, this.w, this.h); }
}

// ─── 子弹类 ────────────────────────────────────────────────

class Bullet extends Entity {
  constructor(x, y, dir, owner, power = 1) {
    super(x, y, 8, 8);
    this.dir = dir;
    this.owner = owner; // 'player' | 'enemy'
    this.power = power; // 1=普通，3=可打钢板
    this.vx = dirToVec(dir).dx * BULLET_SPEED;
    this.vy = dirToVec(dir).dy * BULLET_SPEED;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    // 边界检测
    if (this.x < 0 || this.x + this.w > CW ||
        this.y < 0 || this.y + this.h > CH) {
      this.active = false;
    }
  }

  draw(ctx) {
    ctx.fillStyle = this.owner === 'player' ? '#f5c542' : '#f87171';
    ctx.beginPath();
    ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.w / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── 爆炸特效 ──────────────────────────────────────────────

class Explosion extends Entity {
  constructor(x, y, isBig = false) {
    const r = isBig ? 30 : 20; // 爆炸半径
    super(x - r, y - r, r * 2, r * 2); // 以坦克中心点为中心
    this.cx = x; // 爆炸中心点
    this.cy = y;
    this.timer = 0;
    this.maxTime = isBig ? 500 : 350; // 缩短爆炸时间
    this.isBig = isBig;

    // 生成多层冲击波
    const ringCount = isBig ? 4 : 2;
    this.rings = [];
    for (let i = 0; i < ringCount; i++) {
      this.rings.push({
        delay: i * 50,
        maxRadius: isBig ? (25 + i * 12) : (15 + i * 8)
      });
    }

    // 生成碎片粒子（减少数量）
    const particleCount = isBig ? 16 : 8;
    this.particles = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 / particleCount) * i + Math.random() * 0.5;
      const speed = (isBig ? 2 : 1.2) + Math.random() * 1.5;
      this.particles.push({
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (isBig ? 3 : 2) + Math.random() * 3,
        life: (isBig ? 350 : 250) + Math.random() * 150
      });
    }

    // 烟雾粒子（减少）
    this.smoke = [];
    for (let i = 0; i < (isBig ? 5 : 3); i++) {
      const angle = Math.random() * Math.PI * 2;
      this.smoke.push({
        vx: Math.cos(angle) * 0.4,
        vy: Math.sin(angle) * 0.4 - 0.2,
        size: 5 + Math.random() * 5,
        life: 400 + Math.random() * 150
      });
    }
  }

  update(dt) {
    this.timer += dt;
    if (this.timer >= this.maxTime) this.active = false;
    // 更新粒子位置
    for (const p of this.particles) {
      p.life -= dt;
      p.x = (p.x || 0) + p.vx;
      p.y = (p.y || 0) + p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
    // 更新烟雾
    for (const s of this.smoke) {
      s.life -= dt;
      s.x = (s.x || 0) + s.vx;
      s.y = (s.y || 0) + s.vy;
    }
  }

  draw(ctx) {
    const progress = this.timer / this.maxTime;
    const cx = this.cx; // 爆炸中心点
    const cy = this.cy;
    ctx.save();

    // 绘制冲击波
    for (const ring of this.rings) {
      const ringProgress = Math.max(0, (this.timer - ring.delay) / (this.maxTime * 0.6));
      if (ringProgress <= 0) continue;
      const radius = ring.maxRadius * ringProgress;
      const alpha = (1 - ringProgress) * 0.8;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#f5c542';
      ctx.lineWidth = 4 * (1 - ringProgress);
      ctx.shadowColor = '#f5c542';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 绘制中心火球
    const fireRadius = (this.isBig ? 20 : 14) * (1 - progress * 0.3);
    ctx.globalAlpha = 1 - progress;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.arc(cx, cy, fireRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, cy, fireRadius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, fireRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 绘制碎片粒子
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      const px = cx + p.x;
      const py = cy + p.y;
      const alpha = Math.min(1, p.life / 200);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = Math.random() > 0.5 ? '#f5c542' : '#ef4444';
      ctx.fillRect(px - p.size / 2, py - p.size / 2, p.size, p.size);
    }

    // 绘制烟雾
    ctx.globalAlpha = 1;
    for (const s of this.smoke) {
      if (s.life <= 0) continue;
      const sx = cx + s.x;
      const sy = cy + s.y;
      const alpha = Math.min(0.4, s.life / 400);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ─── 浮动文字 ──────────────────────────────────────────────

class FloatingText {
  constructor(x, y, text, color = '#f5c542') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.timer = 0;
    this.maxTime = 1000; // 1秒
    this.active = true;
  }

  update(dt) {
    this.timer += dt;
    this.y -= 0.5; // 向上漂浮
    if (this.timer >= this.maxTime) this.active = false;
  }

  draw(ctx) {
    const alpha = Math.max(0, 1 - this.timer / this.maxTime);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// ─── 道具类 ────────────────────────────────────────────────

class PowerUp extends Entity {
  constructor(x, y, kind) {
    super(x, y, 32, 32);
    this.kind = kind; // 'STAR' | 'HELMET' | 'SHOVEL' | 'BOMB' | 'TIMER' | 'LIFE'
    this.bobTimer = 0;
  }

  update(dt) {
    this.bobTimer += dt;
  }

  draw(ctx) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2 + Math.sin(this.bobTimer * 0.005) * 3;
    ctx.save();
    // 发光效果
    ctx.shadowColor = '#f5c542';
    ctx.shadowBlur = 10;
    // 背景圆
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();
    // 图标
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icons = { STAR: '⭐', HELMET: '🛡️', SHOVEL: '🔧', BOMB: '💣', TIMER: '⏱️', LIFE: '♥️' };
    ctx.fillText(icons[this.kind] || '?', cx, cy);
    ctx.restore();
  }
}

// ─── 坦克基类 ──────────────────────────────────────────────

class Tank extends Entity {
  constructor(x, y, dir, color) {
    super(x, y, 36, 36);
    this.dir = dir;
    this.color = color;
    this.speed = PLAYER_SPEED;
    this.bulletCooldown = 0;
    this.fireRate = 400; // ms，每0.4秒可发射一次
    // 复活闪烁动画
    this.respawnAnim = 0;    // 动画计时器
    this.isRespawning = false; // 是否处于复活状态
    // 血条
    this.maxHp = 1;
    this.hp = 1;
  }

  /** 开始复活动画 */
  startRespawnAnim(duration = 800) {
    this.isRespawning = true;
    this.respawnAnim = 0;
    this.respawnDuration = duration;
  }

  move(dx, dy, mapSolids = [], otherTanks = []) {
    const prevX = this.x;
    const prevY = this.y;

    // 1. 边界限制
    const clampedX = Math.max(0, Math.min(prevX + dx, CW - this.w));
    const clampedY = Math.max(0, Math.min(prevY + dy, CH - this.h));

    // 2. 分轴独立检测碰撞，允许沿墙滑动
    // 先尝试移动X轴
    const testRectX = { x: clampedX, y: prevY, w: this.w, h: this.h };
    const hitWallX = mapSolids.some(s => aabb(testRectX, s));
    let finalX = hitWallX ? prevX : clampedX;

    // 再尝试移动Y轴（使用已确定的finalX）
    const testRectY = { x: finalX, y: clampedY, w: this.w, h: this.h };
    const hitWallY = mapSolids.some(s => aabb(testRectY, s));
    let finalY = hitWallY ? prevY : clampedY;

    // 3. 坦克间碰撞（分轴独立）
    for (const t of otherTanks) {
      if (t === this || !t.active) continue;
      const tr = t.rect();
      // X轴碰撞
      const testTX = { x: clampedX, y: prevY, w: this.w, h: this.h };
      if (aabb(testTX, tr)) finalX = prevX;
      // Y轴碰撞
      const testTY = { x: finalX, y: clampedY, w: this.w, h: this.h };
      if (aabb(testTY, tr)) finalY = prevY;
    }

    this.x = finalX;
    this.y = finalY;
  }

  /**
   * 发射子弹
   * @param {number} power - 子弹穿透力（1=普通，>=3=可破钢板）
   * @returns {Bullet|null} 子弹对象或null（冷却中）
   */
  shoot(power = 1) {
    if (this.bulletCooldown > 0) return null;
    this.bulletCooldown = this.fireRate;
    const vec = dirToVec(this.dir);
    const bx = this.x + this.w / 2 - 4;
    const by = this.y + this.h / 2 - 4;
    // 子弹从炮口偏移处生成
    return new Bullet(bx + vec.dx * 22, by + vec.dy * 22, this.dir, this instanceof PlayerTank ? 'player' : 'enemy', power);
  }

  /**
   * 绘制2.5D风格坦克
   * 使用渐变、阴影和侧面板营造立体感
   */
  draw(ctx) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    ctx.save();
    ctx.translate(cx, cy);

    // 复活闪烁效果 - 黑白交替闪烁
    if (this.isRespawning && this.respawnAnim < this.respawnDuration) {
      this.respawnAnim += 16; // 每帧约16ms
      const flashPhase = Math.sin(this.respawnAnim * 0.02);
      // 闪烁时覆盖白色/透明层
      ctx.fillStyle = flashPhase > 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    // 闪烁红光坦克效果（第4、11、18辆）
    if (this.isFlashing) {
      const flash = Math.sin(Date.now() * 0.01) > 0;
      if (flash) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── 阴影（地面投影，增强2.5D感）──────────────────────
    ctx.save();
    ctx.translate(4, 6); // 阴影偏移
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.restore();

    // ── 旋转画布对齐行进方向 ──────────────────────────────
    const angle = { up: 0, down: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }[this.dir];
    ctx.rotate(angle);

    // ── 履带（左侧，深灰色带凹槽纹理）─────────────────────
    const trackGrad = ctx.createLinearGradient(-this.w / 2, 0, -this.w / 2 + 8, 0);
    trackGrad.addColorStop(0, '#333');
    trackGrad.addColorStop(0.5, '#555');
    trackGrad.addColorStop(1, '#333');
    ctx.fillStyle = trackGrad;
    ctx.fillRect(-this.w / 2, -this.h / 2, 8, this.h);
    // 履带纹路
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let i = -this.h / 2; i < this.h / 2; i += 6) {
      ctx.beginPath();
      ctx.moveTo(-this.w / 2, i);
      ctx.lineTo(-this.w / 2 + 8, i);
      ctx.stroke();
    }

    // 右侧履带
    ctx.fillStyle = trackGrad;
    ctx.fillRect(this.w / 2 - 8, -this.h / 2, 8, this.h);
    for (let i = -this.h / 2; i < this.h / 2; i += 6) {
      ctx.beginPath();
      ctx.moveTo(this.w / 2 - 8, i);
      ctx.lineTo(this.w / 2, i);
      ctx.stroke();
    }

    // ── 车身主体（带渐变立体效果）─────────────────────────
    const bodyGrad = ctx.createLinearGradient(-this.w / 2 + 4, 0, this.w / 2 - 4, 0);
    bodyGrad.addColorStop(0, this._darken(this.color, 0.6));
    bodyGrad.addColorStop(0.3, this.color);
    bodyGrad.addColorStop(0.7, this.color);
    bodyGrad.addColorStop(1, this._darken(this.color, 0.7));
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-this.w / 2 + 4, -this.h / 2 + 4, this.w - 8, this.h - 8);

    // 车身边缘高光（顶部）
    ctx.strokeStyle = this._lighten(this.color, 1.4);
    ctx.lineWidth = 1;
    ctx.strokeRect(-this.w / 2 + 5, -this.h / 2 + 5, this.w - 10, 3);

    // ── 炮塔（圆形，带渐变球面感）─────────────────────────
    const turretGrad = ctx.createRadialGradient(-3, -3, 1, 0, 0, 10);
    turretGrad.addColorStop(0, this._lighten(this.color, 1.3));
    turretGrad.addColorStop(0.6, this.color);
    turretGrad.addColorStop(1, this._darken(this.color, 0.6));
    ctx.fillStyle = turretGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    // 炮塔边缘
    ctx.strokeStyle = this._darken(this.color, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── 炮管（圆柱形渐变，朝向行进方向）───────────────────
    const barrelLen = 20;
    const barrelGrad = ctx.createLinearGradient(0, -3, 0, 3);
    barrelGrad.addColorStop(0, '#999');
    barrelGrad.addColorStop(0.4, '#ccc');
    barrelGrad.addColorStop(1, '#777');
    ctx.fillStyle = barrelGrad;
    ctx.fillRect(-3, -this.h / 2 - 2, 6, barrelLen);
    // 炮口制退器
    ctx.fillStyle = '#666';
    ctx.fillRect(-4, -this.h / 2 - 2, 8, 4);

    ctx.restore();

    // 绘制血条（非玩家坦克显示HP）
    if (this.maxHp > 1) {
      const barWidth = this.w;
      const barHeight = 4;
      const barX = this.x;
      const barY = this.y - 8;
      const hpPercent = this.hp / this.maxHp;

      // 背景
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      // HP
      ctx.fillStyle = hpPercent > 0.5 ? '#4ade80' : hpPercent > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
      // 边框
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
  }

  /** 加深颜色（用于阴影侧） */
  _darken(hex, factor) {
    const r = Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * factor));
    const g = Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * factor));
    const b = Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * factor));
    return `rgb(${r},${g},${b})`;
  }

  /** 提亮颜色（用于高光） */
  _lighten(hex, factor) {
    const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * factor));
    const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * factor));
    const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * factor));
    return `rgb(${r},${g},${b})`;
  }
}

// ─── 玩家坦克 ──────────────────────────────────────────────

class PlayerTank extends Tank {
  constructor(x, y) {
    super(x, y, 'up', '#4ade80');
    this.lives = 3;
    this.fireLevel = 0; // 火力等级 0-3（rename from level to avoid conflict with Game.level）
    this.invincible = false;
    this.invincibleTime = 0;
    this.shielded = false; // 铲子护盾
    this.shieldTime = 0;
    this.frozen = false; // 被秒表冻结
    this.frozenTime = 0;
  }

  /**
   * 更新玩家状态
   * @param {Object} keys - 键盘状态
   * @param {GameMap} gameMap - 地图对象（含所有瓦片类型）
   * @returns {Bullet|null} 发射的子弹
   */
  update(keys, gameMap, otherTanks = []) {
    let dx = 0, dy = 0;
    // 构建固墙体列表（用于对齐检查和碰撞检测）
    const mapSolids = [...gameMap.bricks, ...gameMap.steels, ...gameMap.rivers, gameMap.base].filter(Boolean);

    // 格子对齐：切换方向轴时自动吸附到最近的格子线
    const wantsVertical = keys['ArrowUp'] || keys['KeyW'] || keys['ArrowDown'] || keys['KeyS'];
    const wantsHorizontal = keys['ArrowLeft'] || keys['KeyA'] || keys['ArrowRight'] || keys['KeyD'];
    const isVerticalDir = this.dir === 'up' || this.dir === 'down';
    const isHorizontalDir = this.dir === 'left' || this.dir === 'right';
    const needAlign = (wantsVertical && isHorizontalDir) || (wantsHorizontal && isVerticalDir);

    if (needAlign) {
      // 切换方向轴时，自动吸附到最近的格子线
      // 只要距离格子线小于半个格子（20px）就吸附
      const snapDist = TILE / 2;
      const cx = Math.round((this.x + this.w / 2) / TILE) * TILE - this.w / 2;
      const cy = Math.round((this.y + this.h / 2) / TILE) * TILE - this.h / 2;
      // 对齐检测：用更小的容差（10px），避免在敌人中间反复抽搐
      const alignTolerance = 10;
      if (isVerticalDir && Math.abs(this.x - cx) < alignTolerance) {
        const testRect = { x: cx, y: this.y, w: this.w, h: this.h };
        if (!mapSolids.some(s => aabb(testRect, s))) this.x = cx;
      }
      if (isHorizontalDir && Math.abs(this.y - cy) < alignTolerance) {
        const testRect = { x: this.x, y: cy, w: this.w, h: this.h };
        if (!mapSolids.some(s => aabb(testRect, s))) this.y = cy;
      }
    }

    if (keys['ArrowUp'] || keys['KeyW']) { dy = -this.speed; this.dir = 'up'; }
    if (keys['ArrowDown'] || keys['KeyS']) { dy = this.speed; this.dir = 'down'; }
    if (keys['ArrowLeft'] || keys['KeyA']) { dx = -this.speed; this.dir = 'left'; }
    if (keys['ArrowRight'] || keys['KeyD']) { dx = this.speed; this.dir = 'right'; }
    // 传入真实的地图碰撞体（砖块+钢板+河流）和其他坦克，以及雪地
    if (dx !== 0 || dy !== 0) {
      // 统一固墙体列表（砖块+钢板+河流+基地）
      const solids = [...gameMap.bricks, ...gameMap.steels, ...gameMap.rivers, gameMap.base].filter(Boolean);
      this.move(dx, dy, solids, otherTanks);
    }
    // 无敌时间递减
    if (this.invincible) {
      this.invincibleTime -= 16;
      if (this.invincibleTime <= 0) this.invincible = false;
    }

    // 护盾时间递减（铲子道具）
    if (this.shielded) {
      this.shieldTime -= 16;
      if (this.shieldTime <= 0) this.shielded = false;
    }

    // 射击（同屏弹数限制：1级1发，3级2发）
    if (keys['Space']) {
      const maxBullets = this.fireLevel >= 2 ? 2 : 1;
      const playerBullets = this.bullets ? this.bullets.filter(b => b.owner === 'player' && b.active).length : 0;
      if (playerBullets < maxBullets) {
        return this.shoot(this.fireLevel + 1);
      }
    }
    return null;
  }

  takeDamage() {
    if (this.invincible || this.shielded) return;
    this.lives--;
    if (this.lives <= 0) this.active = false;
    else {
      this.invincible = true;
      this.invincibleTime = 2000;
    }
  }

  /** 火力升级 */
  upgrade() {
    this.fireLevel = Math.min(this.fireLevel + 1, 3);
  }
}

// ─── 敌方坦克 ──────────────────────────────────────────────

class EnemyTank extends Tank {
  constructor(x, y, type = 'LIGHT', isElite = false) {
    const config = ENEMY_TYPES[type] || ENEMY_TYPES.LIGHT;
    super(x, y, 'down', config.color);
    this.type = type;
    this.speed = config.speed;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.scoreValue = config.score;
    this.aiTimer = 0;
    this.aiInterval = 1500; // ms 换方向间隔
    this.currentDir = 'down';
    this.fireRate = config.fireRate;
    this.state = AI_STATE.PATROL;
    this.stateTimer = 0;
    this.stuckCounter = 0;
    this.lastX = x;
    this.lastY = y;
    this.frozen = false;
    this.frozenTime = 0;
    this.isFlashing = isElite; // P4 - 精英怪标记

    // P4 - 精英怪增强属性
    if (isElite) {
      this.hp *= 2; // 精英怪HP翻倍
      this.maxHp = this.hp;
      this.scoreValue *= 2; // 精英怪分数翻倍
    }
  }

  takeDamage() {
    this.hp--;
    if (this.hp <= 0) {
      this.active = false;
    } else {
      // 重型坦克血量变化颜色
      if (this.type === 'HEAVY') {
        const colors = ['#90EE90', '#FFA500', '#FFD700', '#FFFFFF'];
        this.color = colors[4 - this.hp] || this.color;
      }
    }
  }

  /** 冻结敌人 */
  freeze(duration) {
    this.frozen = true;
    this.frozenTime = duration;
  }

  /** 计算到目标的曼哈顿距离 */
  _manhattanDist(targetX, targetY) {
    return Math.abs(this.x - targetX) + Math.abs(this.y - targetY);
  }

  /** 获取朝向目标的dx/dy */
  _dirToTarget(tx, ty) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    }
    return dy > 0 ? 'down' : 'up';
  }

  /** 测试方向是否可行 */
  _canMove(dir, solids, otherTanks) {
    const vec = dirToVec(dir);
    const nx = this.x + vec.dx * this.speed;
    const ny = this.y + vec.dy * this.speed;
    const tx = Math.max(0, Math.min(nx, CW - this.w));
    const ty = Math.max(0, Math.min(ny, CH - this.h));
    const tr = { x: tx, y: ty, w: this.w, h: this.h };
    const hitWall = solids.some(s => aabb(tr, s));
    const hitTank = otherTanks.some(t => t !== this && t.active && aabb(tr, t.rect()));
    return !hitWall && !hitTank;
  }

  /** 获取可行方向列表 */
  _getValidDirs(solids, otherTanks) {
    return ['up', 'down', 'left', 'right'].filter(d => this._canMove(d, solids, otherTanks));
  }

  /** 更新AI状态 */
  _updateAI(player, gameMap, otherTanks) {
    const solids = [...gameMap.bricks, ...gameMap.steels, ...gameMap.rivers, gameMap.base].filter(Boolean);
    const distToPlayer = this._manhattanDist(player.x + player.w/2, player.y + player.h/2);
    const inRange = distToPlayer < DETECTION_RANGE;
    const canShoot = distToPlayer < SHOOT_RANGE;

    // 更新状态计时器
    this.stateTimer += 16;

    // 计算相对位置
    const playerCX = player.x + player.w/2;
    const playerCY = player.y + player.h/2;
    const myCX = this.x + this.w/2;
    const myCY = this.y + this.h/2;
    const dx = playerCX - myCX;
    const dy = playerCY - myCY;

    switch (this.state) {
      case AI_STATE.PATROL:
        // 检测到玩家则切换追击
        if (inRange) {
          this.state = AI_STATE.CHASE;
          this.stateTimer = 0;
        }
        // 巡逻时更多样化：有时横向移动包抄
        if (this.stateTimer >= this.aiInterval) {
          this.stateTimer = 0;
          const patrolDirs = this._getValidDirs(solids, otherTanks);
          if (patrolDirs.length > 0) {
            // 根据相对位置决定策略
            if (Math.abs(dx) > Math.abs(dy)) {
              // 玩家在水平方向，优先左右移动
              const sideDirs = patrolDirs.filter(d => d === 'left' || d === 'right');
              this.currentDir = sideDirs.length > 0 && Math.random() < 0.8
                ? sideDirs[Math.floor(Math.random() * sideDirs.length)]
                : patrolDirs[Math.floor(Math.random() * patrolDirs.length)];
            } else {
              // 玩家在下放，有一定概率横向移动
              this.currentDir = patrolDirs[Math.floor(Math.random() * patrolDirs.length)];
            }
          }
        }
        break;

      case AI_STATE.CHASE:
        const validDirs = this._getValidDirs(solids, otherTanks);
        if (validDirs.length === 0) break;

        // 计算理想位置：保持适当距离，不要直接撞到玩家
        const idealDist = SHOOT_RANGE * 0.8;
        const shouldRetreat = distToPlayer < idealDist * 0.5;
        const shouldApproach = distToPlayer > idealDist * 1.5;

        if (shouldRetreat) {
          // 后退：选择远离玩家的方向
          const retreatDirs = validDirs.filter(d => {
            const v = dirToVec(d);
            const nx = myCX + v.dx * 40;
            const ny = myCY + v.dy * 40;
            return Math.hypot(nx - playerCX, ny - playerCY) > distToPlayer;
          });
          this.currentDir = retreatDirs.length > 0
            ? retreatDirs[Math.floor(Math.random() * retreatDirs.length)]
            : validDirs[Math.floor(Math.random() * validDirs.length)];
        } else if (shouldApproach) {
          // 接近：优先选择能缩短距离的方向，包括横向包抄
          const approachDirs = validDirs.filter(d => {
            const v = dirToVec(d);
            const nx = myCX + v.dx * 40;
            const ny = myCY + v.dy * 40;
            return Math.hypot(nx - playerCX, ny - playerCY) < distToPlayer;
          });
          this.currentDir = approachDirs.length > 0
            ? approachDirs[Math.floor(Math.random() * approachDirs.length)]
            : validDirs[Math.floor(Math.random() * validDirs.length)];
        } else {
          // 保持距离：根据相对位置选择移动策略
          if (Math.abs(dx) > Math.abs(dy) * 1.5) {
            // 玩家在水平方向较远，优先左右移动
            const sideDirs = validDirs.filter(d => d === 'left' || d === 'right');
            this.currentDir = sideDirs.length > 0
              ? sideDirs[Math.floor(Math.random() * sideDirs.length)]
              : validDirs[Math.floor(Math.random() * validDirs.length)];
          } else if (Math.abs(dy) > Math.abs(dx) * 1.5) {
            // 玩家在垂直方向（上或下），根据距离决定
            if (dy > 0) {
              // 玩家在下，优先向下但也可以侧移
              const downApproach = validDirs.filter(d => d === 'down' || d === 'left' || d === 'right');
              this.currentDir = downApproach[Math.floor(Math.random() * downApproach.length)];
            } else {
              // 玩家在上，这是撤退情况
              const retreatDirs = validDirs.filter(d => d === 'up' || d === 'left' || d === 'right');
              this.currentDir = retreatDirs[Math.floor(Math.random() * retreatDirs.length)];
            }
          } else {
            // 对角线方向，混合策略
            this.currentDir = validDirs[Math.floor(Math.random() * validDirs.length)];
          }
        }

        // 进入射击范围则切换射击状态
        if (canShoot) {
          this.state = AI_STATE.SHOOT;
          this.stateTimer = 0;
        }
        break;

      case AI_STATE.SHOOT:
        // 射击时保持位置或侧移，不要直线冲锋
        const shootDirs = validDirs.filter(d => {
          const v = dirToVec(d);
          // 优先侧向移动
          return d === 'left' || d === 'right';
        });
        this.currentDir = shootDirs.length > 0 && Math.random() < 0.7
          ? shootDirs[Math.floor(Math.random() * shootDirs.length)]
          : validDirs[Math.floor(Math.random() * validDirs.length)];

        // 如果玩家太远，退回追击
        if (!inRange) {
          this.state = AI_STATE.CHASE;
          this.stateTimer = 0;
        }
        break;

      case AI_STATE.STUCK:
        const stuckDirs = this._getValidDirs(solids, otherTanks);
        if (stuckDirs.length > 0) {
          // 优先选择远离当前位置的方向
          this.currentDir = stuckDirs[Math.floor(Math.random() * stuckDirs.length)];
          this.state = AI_STATE.CHASE;
          this.stateTimer = 0;
        }
        break;
    }

    // 检测是否卡住
    const moved = Math.abs(this.x - this.lastX) > 0.1 || Math.abs(this.y - this.lastY) > 0.1;
    if (!moved) {
      this.stuckCounter++;
      if (this.stuckCounter > 30) {
        this.state = AI_STATE.STUCK;
        this.stateTimer = 0;
      }
    } else {
      this.stuckCounter = 0;
    }
    this.lastX = this.x;
    this.lastY = this.y;
  }

  update(dt, gameMap, otherTanks = []) {
    // 检查是否被冻结
    if (this.frozen) {
      this.frozenTime -= dt;
      if (this.frozenTime <= 0) {
        this.frozen = false;
      }
      return null;
    }

    this.aiTimer += dt;
    if (this.bulletCooldown > 0) this.bulletCooldown -= dt;

    // 更新AI状态
    if (gameMap && gameMap.player) {
      this._updateAI(gameMap.player, gameMap, otherTanks);
    }

    // 移动
    const vec = dirToVec(this.currentDir);
    this.dir = this.currentDir;
    const solids = [...gameMap.bricks, ...gameMap.steels, ...gameMap.rivers, gameMap.base].filter(Boolean);
    this.move(vec.dx * this.speed, vec.dy * this.speed, solids, otherTanks);

    // 射击逻辑
    if (gameMap && gameMap.player) {
      const distToPlayer = this._manhattanDist(
        gameMap.player.x + gameMap.player.w/2,
        gameMap.player.y + gameMap.player.h/2
      );
      // 在射击范围内或正对玩家时射击
      if (distToPlayer < SHOOT_RANGE && this.bulletCooldown <= 0) {
        // 检查是否正对玩家
        const dirToPlayer = this._dirToTarget(
          gameMap.player.x + gameMap.player.w/2,
          gameMap.player.y + gameMap.player.h/2
        );
        if (dirToPlayer === this.currentDir || Math.random() < 0.3) {
          return this.shoot(1);
        }
      }
    } else if (Math.random() < 0.02) {
      return this.shoot(1);
    }
    return null;
  }
}

// ─── 地图类 ────────────────────────────────────────────────

class GameMap {
  constructor(levelIndex = 0) {
    this.tileW = TILE;
    this.tileH = TILE;
    this.data = loadLevel(levelIndex); // 加载关卡数据
    this.bricks = [];  // 可破坏砖块
    this.steels = [];  // 钢板
    this.grass = [];   // 草丛（遮挡）
    this.rivers = [];  // 河流（坦克不能通过）
    this.base = null;  // 基地
    this._parse();
  }

  _parse() {
    this.bricks = [];
    this.steels = [];
    this.grass = [];
    this.rivers = [];
    this.ices = [];  // 雪地瓦片
    this.base = null;  // 基地
    for (let r = 0; r < ROWS; r++) {
      if (!this.data[r]) {
        continue;
      }
      for (let c = 0; c < COLS; c++) {
        const type = this.data[r][c];
        const x = c * TILE;
        const y = r * TILE;
        if (type === T.BRICK) this.bricks.push(rect(x, y, TILE, TILE));
        else if (type === T.STEEL) this.steels.push(rect(x, y, TILE, TILE));
        else if (type === T.GRASS) this.grass.push(rect(x, y, TILE, TILE));
        else if (type === T.RIVER) this.rivers.push(rect(x, y, TILE, TILE));
        else if (type === T.ICE) this.ices.push(rect(x, y, TILE, TILE));
        else if (type === T.BASE) this.base = rect(x, y, TILE, TILE);  // 解析基地
      }
    }
  }

  // 碰撞检测用（砖块+钢板+基地）
  getSolidRects() {
    return [...this.bricks, ...this.steels, this.base].filter(Boolean);
  }

  // 检查子弹碰撞，返回被破坏的瓦片信息（支持穿透力）
  checkBulletHit(bulletRect, owner, power = 1) {
    // 打砖块
    for (let i = this.bricks.length - 1; i >= 0; i--) {
      if (aabb(bulletRect, this.bricks[i])) {
        this.bricks.splice(i, 1); // 移除砖块
        const c = Math.floor((bulletRect.x + bulletRect.w / 2) / TILE);
        const r = Math.floor((bulletRect.y + bulletRect.h / 2) / TILE);
        if (this.data[r] && this.data[r][c] === T.BRICK) this.data[r][c] = T.EMPTY;
        return { type: 'brick', x: bulletRect.x, y: bulletRect.y };
      }
    }
    // 打钢板（需要power>=3才能破坏）
    for (let i = this.steels.length - 1; i >= 0; i--) {
      if (aabb(bulletRect, this.steels[i])) {
        if (power >= 3) {
          this.steels.splice(i, 1);
          const c = Math.floor((bulletRect.x + bulletRect.w / 2) / TILE);
          const r = Math.floor((bulletRect.y + bulletRect.h / 2) / TILE);
          if (this.data[r]) this.data[r][c] = T.EMPTY;
        }
        return { type: 'steel' };
      }
    }
    // 打基地
    if (this.base && aabb(bulletRect, this.base)) {
      return { type: 'base' };
    }
    return null;
  }

  /** 绘制草丛（遮挡层，在实体之后绘制） */
  drawGrass(ctx) {
    for (const g of this.grass) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.7)';
      // 草叶形状
      for (let i = 0; i < 5; i++) {
        const gx = g.x + 4 + i * 7;
        const gy = g.y + g.h - 8;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + 3, gy - 12);
        ctx.lineTo(gx + 6, gy);
        ctx.fill();
      }
    }
  }

  draw(ctx) {
    // 砖块（2.5D风格：侧面阴影+顶部高光）
    for (const b of this.bricks) {
      // 侧面（右侧+底部）营造厚度
      ctx.fillStyle = '#6b3010';
      ctx.fillRect(b.x + 1, b.y + b.h - 4, b.w - 2, 4);
      ctx.fillRect(b.x + b.w - 4, b.y + 1, 4, b.h - 4);
      // 正面
      ctx.fillStyle = '#a0522d';
      ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 4);
      // 顶部高光
      ctx.fillStyle = '#c47a4a';
      ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, 3);
      // 砖缝纹理
      ctx.strokeStyle = '#8b4513';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h / 2 - 2);
      ctx.strokeRect(b.x + 2, b.y + b.h / 2, b.w - 4, b.h / 2 - 2);
      ctx.beginPath();
      ctx.moveTo(b.x + b.w / 2, b.y + 2);
      ctx.lineTo(b.x + b.w / 2, b.y + b.h / 2 - 2);
      ctx.stroke();
    }
    // 钢板（金属质感：垂直渐变+铆钉）
    for (const s of this.steels) {
      const grad = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.h);
      grad.addColorStop(0, '#d0d0d0');
      grad.addColorStop(0.5, '#a0a0a0');
      grad.addColorStop(1, '#808080');
      ctx.fillStyle = grad;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      // 铆钉
      ctx.fillStyle = '#bbb';
      ctx.beginPath();
      ctx.arc(s.x + 5, s.y + 5, 2, 0, Math.PI * 2);
      ctx.arc(s.x + s.w - 5, s.y + 5, 2, 0, Math.PI * 2);
      ctx.arc(s.x + 5, s.y + s.h - 5, 2, 0, Math.PI * 2);
      ctx.arc(s.x + s.w - 5, s.y + s.h - 5, 2, 0, Math.PI * 2);
      ctx.fill();
      // 边框
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    }
    // 基地（2.5D风格：阴影底座+渐变蓝色）
    if (this.base) {
      // 底座阴影
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(this.base.x + 3, this.base.y + 3, this.base.w, this.base.h);
      // 底座渐变
      const baseGrad = ctx.createLinearGradient(this.base.x, this.base.y, this.base.x, this.base.y + this.base.h);
      baseGrad.addColorStop(0, '#60a5fa');
      baseGrad.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(this.base.x, this.base.y, this.base.w, this.base.h);
      // 边框
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.base.x + 1, this.base.y + 1, this.base.w - 2, this.base.h - 2);
      // 鹰图标
      ctx.fillStyle = '#f5c542';
      ctx.font = '22px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🦅', this.base.x + this.base.w / 2, this.base.y + this.base.h / 2 + 1);
    }
    // 雪地（冰面纹理）
    for (const ic of this.ices) {
      ctx.fillStyle = '#d0e8ff';
      ctx.fillRect(ic.x, ic.y, ic.w, ic.h);
      // 冰面裂纹
      ctx.strokeStyle = '#a8d8ea';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ic.x + ic.w * 0.3, ic.y);
      ctx.lineTo(ic.x + ic.w * 0.5, ic.y + ic.h * 0.5);
      ctx.lineTo(ic.x + ic.w * 0.7, ic.y + ic.h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ic.x, ic.y + ic.h * 0.3);
      ctx.lineTo(ic.x + ic.w * 0.4, ic.y + ic.h * 0.6);
      ctx.stroke();
    }
  }
}

// ─── 游戏主类 ──────────────────────────────────────────────

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CW;
    this.canvas.height = CH;

    this.state = 'MENU'; // MENU | PLAYING | GAMEOVER_WIN | GAMEOVER_LOSE | REWARD_SELECT
    this.score = 0;
    this.level = 0;       // 当前关卡索引
    this.lives = 3;
    this.keys = {};
    this.lastTime = 0;

    // P3 - 成长系统
    this.rewardLevel = 0;   // 奖励选择关卡（每3关一次）
    this.weaponPower = 0;   // 武器等级（穿透+1每级）
    this.maxLives = 3;      // 最大生命值
    this.speedBonus = 0;    // 速度加成
    this.isRewardSelecting = false; // 是否在选择奖励界面

    // P5 - 技术优化
    this.highScore = 0;     // 最高分
    this.totalWins = 0;     // 总通关次数
    this._loadProgress();   // 加载存档

    // 实体
    this.player = null;
    this.enemies = [];
    this.bullets = [];
    this.explosions = [];
    this.powerups = [];   // 道具数组
    this.floatingTexts = [];  // 浮动文字数组
    this.map = null;

    // UI 元素引用
    this.scoreEl = document.getElementById('score-display');
    this.livesEl = document.getElementById('lives-display');
    this.enemiesEl = document.getElementById('enemies-display');
    this.waveEl = document.getElementById('wave-display');
    this.levelEl = document.getElementById('level-display');
    this.overlay = document.getElementById('overlay');
    this.titleEl = document.getElementById('overlay-title');
    this.subtitleEl = document.getElementById('overlay-subtitle');
    this.hintEl = document.getElementById('overlay-hint');
    this.scoreElFinal = document.getElementById('overlay-score');
    this.progressEl = document.getElementById('progress-display'); // 关卡进度

    this._bindInput();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  // ── P5 - 存档系统 ────────────────────────────────────────
  _loadProgress() {
    try {
      const data = localStorage.getItem('tank_battle_progress');
      if (data) {
        const save = JSON.parse(data);
        this.highScore = save.highScore || 0;
        this.totalWins = save.totalWins || 0;
      }
    } catch(e) {
      console.warn('存档加载失败:', e);
    }
  }

  _saveProgress() {
    try {
      const save = {
        highScore: Math.max(this.highScore, this.score),
        totalWins: this.totalWins + (this.state === 'GAMEOVER_WIN' ? 1 : 0),
      };
      localStorage.setItem('tank_battle_progress', JSON.stringify(save));
    } catch(e) {
      console.warn('存档保存失败:', e);
    }
  }

  // ── P3 - 奖励选择系统 ────────────────────────────────────
  _showRewardSelect() {
    this.isRewardSelecting = true;
    this.state = 'REWARD_SELECT';
    this.titleEl.textContent = '🎁 选择奖励';
    this.subtitleEl.textContent = `第${this.level}关完成！从下方选一个奖励：`;
    this.hintEl.textContent = '按 1-6 选择对应奖励';
    this.hintEl.style.display = 'block';
    this.scoreElFinal.style.display = 'none';
    this.overlay.classList.remove('hidden');

    // 随机选3个选项
    this.rewardOptions = REWARD_OPTIONS.sort(() => Math.random() - 0.5).slice(0, 3);
  }

  _applyReward(option) {
    switch(option.type) {
      case 'STAR':
        this.weaponPower++;
        break;
      case 'HELMET':
        // 已在道具中处理
        break;
      case 'LIFE':
        this.maxLives = Math.min(this.maxLives + 1, 10);
        this.lives = Math.min(this.lives + 1, this.maxLives);
        break;
      case 'SHIELD':
        // 已在道具中处理
        break;
      case 'BOMB':
        // 已在道具中处理
        break;
      case 'SPEED':
        this.speedBonus += 0.3;
        break;
    }
    this._continueAfterReward();
  }

  _continueAfterReward() {
    this.isRewardSelecting = false;
    this.overlay.classList.add('hidden');
    this._startNextLevel();
  }

  _bindInput() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Enter') this._handleEnter();
      if (e.code === 'Space') e.preventDefault();
      // P3 - 奖励选择数字键
      if (this.isRewardSelecting && e.code >= 'Digit1' && e.code <= 'Digit9') {
        const num = parseInt(e.code.replace('Digit', ''));
        this._handleNumberKey(num);
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    this.canvas.addEventListener('click', () => this._handleEnter());

    // ── 移动端触控支持 ─────────────────────────────────────
    this._bindTouchControls();
  }

  /** 绑定移动端触控按钮 */
  _bindTouchControls() {
    const btns = document.querySelectorAll('#touch-controls [data-key]');
    btns.forEach(btn => {
      const code = btn.dataset.key;

      // 触摸按下
      const onPress = (e) => {
        e.preventDefault();
        this.keys[code] = true;
        btn.classList.add('active');
        // 射击按钮同时触发开始/回车逻辑
        if (code === 'Space') this._handleEnter();
      };
      // 触摸抬起
      const onRelease = (e) => {
        e.preventDefault();
        this.keys[code] = false;
        btn.classList.remove('active');
      };

      btn.addEventListener('touchstart', onPress, { passive: false });
      btn.addEventListener('touchend', onRelease, { passive: false });
      btn.addEventListener('touchcancel', onRelease, { passive: false });

      // 兼容鼠标点击测试
      btn.addEventListener('mousedown', onPress);
      btn.addEventListener('mouseup', onRelease);
      btn.addEventListener('mouseleave', onRelease);
    });
  }

  _handleEnter() {
    // P3 - 奖励选择状态
    if (this.isRewardSelecting && this.state === 'REWARD_SELECT') {
      return; // 奖励选择用数字键
    }
    if (this.state === 'MENU' || this.state === 'GAMEOVER_WIN' || this.state === 'GAMEOVER_LOSE') {
      this._startGame();
    }
  }

  _handleNumberKey(num) {
    if (!this.isRewardSelecting || !this.rewardOptions || num < 1 || num > this.rewardOptions.length) return;
    this._applyReward(this.rewardOptions[num - 1]);
  }

  /**
   * 开始/重新开始游戏
   * 玩家出生在安全空位（不卡在墙里）
   */
  _startGame() {
    this.score = 0;
    this.level = 0;
    this.lives = 3;
    this.maxLives = 3;
    this.weaponPower = 0;
    this.speedBonus = 0;
    this.enemiesPerLevel = 20;
    this.maxOnScreen = 4;
    this.enemiesSpawned = 0;
    this.isTransitioning = true;

    // 显示开始界面
    this.titleEl.textContent = '🎮 坦克大战';
    this.subtitleEl.textContent = 'WASD/方向键移动 · 空格射击 · 回车开始';
    this.hintEl.textContent = '按回车开始游戏（手机触屏也可操作）';
    this.hintEl.style.display = 'block';
    this.scoreElFinal.style.display = 'none';
    this.overlay.classList.remove('hidden');

    // 延迟0.5秒后开始游戏
    setTimeout(() => {
      this._doStartGame();
    }, 500);
  }

  /** 实际开始游戏的逻辑 */
  _doStartGame() {
    this.state = 'PLAYING';
    this.isTransitioning = false;
    this.overlay.classList.add('hidden');
    this.map = new GameMap(this.level);
    const playerPos = this._findSafeSpawn(this.map.bricks, this.map.steels, {
      minCol: 2, maxCol: COLS - 4, minRow: 10, maxRow: 10  // 保护墙上方
    }, [], this.map.rivers, null);
    this.player = new PlayerTank(playerPos.x, playerPos.y);
    this.enemies = [];
    this.bullets = [];
    this.explosions = [];
    this.powerups = [];
    this.floatingTexts = [];
    this._spawnWave();
    this._updateHUD();
  }

  /** 在指定区域内找一个安全的生成位置（不在固体瓦片内） */
  _findSafeSpawn(bricks, steels, options = {}, otherTanks = [], rivers = [], base = null) {
    const { minCol = 1, maxCol = COLS - 2, minRow = 1, maxRow = ROWS - 2 } = options;
    const tankW = 36; // 坦克宽度
    const tankH = 36; // 坦克高度
    let attempts = 0;
    while (attempts < 200) {
      const c = randInt(minCol, maxCol);
      const r = randInt(minRow, maxRow);
      const x = c * TILE;
      const y = r * TILE;
      // 坦克矩形（比瓦片小一点，避免卡墙）
      const rect_ = rect(x + 2, y + 2, tankW - 4, tankH - 4);
      let solid = false;
      for (const b of bricks) { if (aabb(rect_, b)) { solid = true; break; } }
      if (!solid) {
        for (const s of steels) { if (aabb(rect_, s)) { solid = true; break; } }
      }
      if (!solid && rivers) {
        for (const r of rivers) { if (aabb(rect_, r)) { solid = true; break; } }
      }
      if (!solid && base) {
        if (aabb(rect_, base)) { solid = true; }
      }
      // 检测是否与其他坦克重叠
      if (!solid) {
        for (const t of otherTanks) {
          if (t === null) continue;
          if (aabb(rect_, t.rect())) { solid = true; break; }
        }
      }
      if (!solid) return { x, y };
      attempts++;
    }
    // 无法找到安全位置，返回区域中心（再次检查）
    const centerC = Math.floor((minCol + maxCol) / 2);
    const centerR = Math.floor((minRow + maxRow) / 2);
    const fx = centerC * TILE;
    const fy = centerR * TILE;
    const fallbackRect = rect(fx + 2, fy + 2, tankW - 4, tankH - 4);
    let isSafe = true;
    for (const b of bricks) { if (aabb(fallbackRect, b)) { isSafe = false; break; } }
    if (isSafe) {
      for (const s of steels) { if (aabb(fallbackRect, s)) { isSafe = false; break; } }
    }
    if (isSafe && rivers) {
      for (const r of rivers) { if (aabb(fallbackRect, r)) { isSafe = false; break; } }
    }
    if (isSafe && base) {
      if (aabb(fallbackRect, base)) { isSafe = false; }
    }
    return { x: isSafe ? fx : minCol * TILE, y: isSafe ? fy : minRow * TILE };
  }

  /** 生成下一波敌人（最多4个） */
  _spawnWave() {
    const count = Math.min(4, this.enemiesPerLevel - this.enemiesSpawned);
    for (let i = 0; i < count; i++) {
      // 敌方只在地图最顶部第0行生成（远离基地）
      // 传入所有现有坦克避免重叠
      const pos = this._findSafeSpawn(this.map.bricks, this.map.steels, {
        minCol: 1, maxCol: COLS - 2, minRow: 0, maxRow: 0
      }, [this.player, ...this.enemies], this.map.rivers, this.map.base);
      // 随机生成敌方类型（根据关卡进度增加难度）
      const types = ['LIGHT', 'LIGHT', 'ARMOR', 'SPEED'];
      if (this.level >= 2) types.push('HEAVY');
      const type = types[randInt(0, types.length - 1)];
      const enemy = new EnemyTank(pos.x, pos.y, type);
      // 触发复活动画（0.8秒闪烁）
      enemy.startRespawnAnim(800);
      // 闪烁红光坦克（第4、11、18辆）
      const spawnOrder = this.enemiesSpawned + 1;
      if (spawnOrder === 4 || spawnOrder === 11 || spawnOrder === 18) {
        enemy.isFlashing = true; // 标记为闪烁坦克
        enemy.color = '#ff4444'; // 红色外观
      }
      this.enemies.push(enemy);
      this.enemiesSpawned++;
    }
  }

  /** 补充一个敌人（当敌人被击毁时调用） */
  _respawnOne() {
    if (this.enemiesSpawned >= this.enemiesPerLevel) return;
    const pos = this._findSafeSpawn(this.map.bricks, this.map.steels, {
      minCol: 1, maxCol: COLS - 2, minRow: 0, maxRow: 0
    }, [this.player, ...this.enemies], this.map.rivers, this.map.base);
    // 随机生成敌方类型（根据关卡进度增加难度）
    const types = ['LIGHT', 'LIGHT', 'ARMOR', 'SPEED'];
    if (this.level >= 2) types.push('HEAVY');

    // P4 - 精英怪生成（第5关后出现，概率10%）
    let isElite = false;
    let type = types[randInt(0, types.length - 1)];
    if (this.level >= 4 && Math.random() < 0.1) {
      isElite = true;
      type = this.level >= 10 ? 'BOSS' : 'COMMANDER';
    }

    const enemy = new EnemyTank(pos.x, pos.y, type, isElite);
    enemy.startRespawnAnim(800);

    // 精英怪特殊标记
    if (isElite) {
      enemy.isFlashing = true;
      enemy.color = ELITE_TYPES[type]?.color || '#ff4444';
      this.floatingTexts.push(new FloatingText(enemy.x + enemy.w/2, enemy.y - 10, '⚠️精英!', '#ff4444'));
    }

    this.enemies.push(enemy);
    this.enemiesSpawned++;
  }

  /** 更新HUD显示 */
  _updateHUD() {
    this.scoreEl.textContent = this.score;
    this.livesEl.textContent = this.player ? '♥'.repeat(Math.max(0, this.player.lives)) : '♥♥♥';
    this.livesEl.className = 'hud-value ' + (this.player && this.player.lives > 1 ? 'lives-green' : 'lives-red');
    this.enemiesEl.textContent = this.enemies.filter(e => e.active).length + '/' + this.maxOnScreen;
    this.waveEl.textContent = '波 ' + Math.ceil(this.enemiesSpawned / 4);
    this.levelEl.textContent = '关卡 ' + (this.level + 1);
    this.progressEl.textContent = this.enemiesSpawned + '/' + this.enemiesPerLevel;
  }

  /** 显示游戏结束/胜利界面 */
  _showOverlay(title, subtitle, hint, scoreText) {
    this.state = title.includes('胜利') ? 'GAMEOVER_WIN' : 'GAMEOVER_LOSE';
    this.titleEl.textContent = title;
    this.subtitleEl.textContent = subtitle;
    this.hintEl.textContent = hint;
    this.hintEl.style.display = 'block';
    if (scoreText) {
      this.scoreElFinal.textContent = scoreText;
      this.scoreElFinal.style.display = 'block';
    } else {
      this.scoreElFinal.style.display = 'none';
    }
    this.overlay.classList.remove('hidden');
    // P5 - 保存存档
    this._saveProgress();
  }
  _nextLevel() {
    // P3 - 每3关显示奖励选择
    if ((this.level + 1) % 3 === 0 && this.level > 0) {
      this._showRewardSelect();
      return;
    }
    this._startNextLevel();
  }

  /** 开始下一关 */
  _startNextLevel() {
    this.isTransitioning = true;
    this.titleEl.textContent = '🎉 关卡 ' + this.level + ' 完成！';
    this.subtitleEl.textContent = '准备进入下一关...';
    this.hintEl.textContent = '';
    this.hintEl.style.display = 'none';
    this.scoreElFinal.style.display = 'none';
    this.overlay.classList.remove('hidden');

    setTimeout(() => {
      this.overlay.classList.add('hidden');
      this.isTransitioning = false;
      this.level++;
      this.map = new GameMap(this.level % LEVELS.length);
      this.enemies = [];
      this.bullets = [];
      this.explosions = [];
      this.powerups = [];
      this.floatingTexts = [];
      this.enemiesSpawned = 0;
      this.spawnTimer = 0;
      const pos = this._findSafeSpawn(this.map.bricks, this.map.steels, {
        minCol: 2, maxCol: COLS - 4, minRow: 10, maxRow: 10  // 保护墙上方
      }, [], this.map.rivers, null);
      this.player.x = pos.x;
      this.player.y = pos.y;
      this.player.active = true;
      // 应用速度加成
      if (this.speedBonus > 0) {
        this.player.speed = PLAYER_SPEED * (1 + this.speedBonus);
      }
      this._spawnWave();
      this._updateHUD();
    }, 500);
  }

  // ── 主循环 ──────────────────────────────────────────────
  _loop(timestamp) {
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // 绘制每一帧（包括MENU和PLAYING状态）
    this._draw();

    // 只有在 PLAYING 状态下才更新逻辑
    if (this.state === 'PLAYING') {
      this._update(dt);
    }
    requestAnimationFrame(this._loop);
  }

  _update(dt) {
    // 更新玩家（传入其他坦克，排除自己）
    if (!this.player || !this.player.active) {
      return;
    }

    const pBullet = this.player.update(this.keys, this.map, [
      ...this.enemies.filter(e => e.active && e !== this.player)
    ]);
    if (pBullet) this.bullets.push(pBullet);
    if (this.player.bulletCooldown > 0) this.player.bulletCooldown -= dt;

    // 更新敌方（每个敌人传入其他坦克，排除自己）
    for (const e of this.enemies) {
      if (!e.active) continue;
      const eBullet = e.update(dt, this.map, [
        this.player,
        ...this.enemies.filter(en => en.active && en !== e)
      ]);
      if (eBullet) this.bullets.push(eBullet);
    }

    // 更新子弹
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.update();

      // 子弹 vs 地图
      const hit = this.map.checkBulletHit(b.rect(), b.owner, b.power);
      if (hit) {
        b.active = false;
        // 子弹打墙/钢墙：仅销毁子弹，不创建爆炸
        // 基地被击中则游戏结束
        if (hit.type === 'base') {
          this._showOverlay('💀 基地被毁！', '敌方摧毁了老鹰基地', '按回车重新开始', `最终分数: ${this.score}`);
          return; // 立即结束当前帧
        }
      }

      // 子弹 vs 子弹（双向抵消）
      for (const other of this.bullets) {
        if (other === b || !other.active) continue;
        if (other.owner === b.owner) continue; // 同阵营不抵消
        if (aabb(b.rect(), other.rect())) {
          b.active = false;
          other.active = false;
          // 子弹对撞：不创建爆炸，让子弹直接消失
          break;
        }
      }

      // 子弹 vs 坦克
      if (b.owner === 'player') {
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (aabb(b.rect(), e.rect())) {
            // 使用新的 takeDamage 系统
            e.takeDamage();
            b.active = false;
            if (!e.active) {
              this.score += e.scoreValue || 100;
              // 敌方被击毁时使用大爆炸特效
              this.explosions.push(new Explosion(e.x + e.w / 2, e.y + e.h / 2, true));
              // 闪烁坦克掉落道具
              if (e.isFlashing) {
                const kinds = ['STAR', 'HELMET', 'SHOVEL', 'BOMB', 'TIMER', 'LIFE'];
                this.powerups.push(new PowerUp(e.x, e.y, kinds[randInt(0, kinds.length - 1)]));
              }
              // 敌人被击毁后立即补充一个（如果本关还没打完）
              if (this.enemiesSpawned < this.enemiesPerLevel && !this.isTransitioning) {
                this._respawnOne();
              }
              // 检测是否全部20个敌人都已击毁
              if (this.enemiesSpawned >= this.enemiesPerLevel &&
                  this.enemies.length === 0) {
                this._nextLevel();
              }
            } else {
              // 未击毁但有爆炸效果
              this.explosions.push(new Explosion(e.x + e.w / 2, e.y + e.h / 2, false));
            }
          }
        }
      } else {
        if (this.player.active && aabb(b.rect(), this.player.rect())) {
          b.active = false;
          this.player.takeDamage();
          // 玩家被打中：不创建爆炸
          if (!this.player.active) {
            this._showOverlay('💀 游戏结束', '你的坦克被摧毁了', '按回车重新开始', `最终分数: ${this.score}`);
          }
        }
      }
    }

    // 敌方碰撞玩家
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (this.player && this.player.active && aabb(e.rect(), this.player.rect())) {
        this.player.takeDamage();
        e.active = false;
        // 相撞也用大爆炸
        this.explosions.push(new Explosion(e.x + e.w / 2, e.y + e.h / 2, true));
        if (!this.player.active) {
          this._showOverlay('💀 游戏结束', '坦克相撞，同归于尽！', '按回车重新开始', `最终分数: ${this.score}`);
        }
      }
    }

    // 更新浮动文字
    if (this.floatingTexts) {
      this.floatingTexts = this.floatingTexts.filter(ft => {
        ft.update(dt);
        return ft.active;
      });
    }

    // 道具拾取检测
    for (const p of this.powerups) {
      if (!p.active) continue;
      if (this.player && this.player.active && aabb(this.player.rect(), p.rect())) {
        p.active = false;
        this._applyPowerup(p.kind);
      }
    }

    // 更新实体
    this.bullets = this.bullets.filter(b => b.active);
    this.enemies = this.enemies.filter(e => e.active);
    this.explosions = this.explosions.filter(e => { e.update(dt); return e.active; });
    this.powerups = this.powerups.filter(p => p.active);
    this.floatingTexts = this.floatingTexts.filter(ft => ft.active);

    // 自动刷新生成（同屏少于4个且未发完所有敌人，且不在过场中）
    // 注：现在改为"死一个补一个"模式，此定时器仅处理初始波次生成
    if (!this.isTransitioning && this.enemiesSpawned < this.enemiesPerLevel &&
        this.enemies.length === 0) {
      // 无敌人时触发补充
      this._spawnWave();
    }

    // 检测关卡完成（且不在过场中）
    if (!this.isTransitioning && this.enemiesSpawned >= this.enemiesPerLevel &&
        this.enemies.length === 0) { // 所有敌人已死亡（数组为空）
      this._nextLevel();
    }

    this._updateHUD();
  }

  /** 应用道具效果 */
  _applyPowerup(kind) {
    switch (kind) {
      case 'STAR':
        this.player.upgrade();
        this.floatingTexts.push(new FloatingText(this.player.x + this.player.w/2, this.player.y - 10, '火力升级!', '#f5c542'));
        break;
      case 'HELMET':
        this.player.invincible = true;
        this.player.invincibleTime = 10000; // 10秒无敌
        this.floatingTexts.push(new FloatingText(this.player.x + this.player.w/2, this.player.y - 10, '无敌10秒!', '#60a5fa'));
        break;
      case 'LIFE':
        this.player.lives = Math.min(this.player.lives + 1, this.maxLives);
        this.floatingTexts.push(new FloatingText(this.player.x + this.player.w/2, this.player.y - 10, '+1生命', '#ef4444'));
        break;
      case 'BOMB':
        for (const e of this.enemies) {
          if (e.active) {
            e.active = false;
            this.score += 50;
            this.explosions.push(new Explosion(e.x + e.w / 2, e.y + e.h / 2, true));
          }
        }
        this.floatingTexts.push(new FloatingText(this.player.x + this.player.w/2, this.player.y - 10, '清屏!', '#f59e0b'));
        break;
      case 'SHOVEL':
        this.player.shielded = true;
        this.player.shieldTime = 20000; // 20秒护盾
        this.floatingTexts.push(new FloatingText(this.player.x + this.player.w/2, this.player.y - 10, '护盾20秒', '#a78bfa'));
        break;
      case 'TIMER':
        for (const e of this.enemies) {
          if (e.active) e.freeze(10000); // 冻结10秒
        }
        this.floatingTexts.push(new FloatingText(this.player.x + this.player.w/2, this.player.y - 10, '冻结敌人!', '#38bdf8'));
        break;
    }
    // 生成新道具（随机位置）
    if (Math.random() < 0.3) {
      const pos = this._findSafeSpawn(this.map.bricks, this.map.steels, {
        minCol: 2, maxCol: COLS - 3, minRow: 5, maxRow: 11
      }, [], this.map.rivers, this.map.base);
      const kinds = ['STAR', 'HELMET', 'LIFE', 'BOMB'];
      this.powerups.push(new PowerUp(pos.x, pos.y, kinds[Math.floor(Math.random() * kinds.length)]));
    }
  }

  _draw() {
    const ctx = this.ctx;
    if (!ctx) {
      console.error('Canvas context is null!');
      return;
    }

    // 清屏
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, CW, CH);

    // 绘制地图
    if (this.map) this.map.draw(ctx);

    // 绘制实体（草丛在后面，先画）
    if (this.player && this.player.active) this.player.draw(ctx);
    for (const e of this.enemies) {
      if (e && e.active) e.draw(ctx);
    }
    for (const b of this.bullets) {
      if (b && b.active) b.draw(ctx);
    }
    for (const p of this.powerups) {
      if (p && p.active) p.draw(ctx);
    }
    for (const ex of this.explosions) {
      if (ex && ex.active) ex.draw(ctx);
    }
    for (const ft of (this.floatingTexts || [])) {
      if (ft && ft.active) ft.draw(ctx);
    }
    if (this.map) this.map.drawGrass(ctx);

    // P3 - 奖励选择界面渲染
    if (this.isRewardSelecting && this.rewardOptions) {
      this._drawRewardSelect(ctx);
    }
  }

  /** 绘制奖励选择界面 */
  _drawRewardSelect(ctx) {
    const cx = CW / 2;
    const cy = CH / 2;

    // 半透明背景
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, CW, CH);

    // 标题
    ctx.fillStyle = '#f5c542';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎁 选择奖励', cx, cy - 120);

    // 副标题
    ctx.fillStyle = '#ccc';
    ctx.font = '16px sans-serif';
    ctx.fillText('每3关可获得一次奖励选择', cx, cy - 85);

    // 选项卡片
    const cardWidth = 150;
    const cardHeight = 100;
    const gap = 20;
    const totalWidth = this.rewardOptions.length * (cardWidth + gap) - gap;
    let startX = cx - totalWidth / 2;

    this.rewardOptions.forEach((opt, i) => {
      const cardX = startX + i * (cardWidth + gap);
      const cardY = cy - 40;

      // 卡片背景（用rect代替roundRect以兼容旧浏览器）
      ctx.fillStyle = i === 0 ? '#1a1a2e' : '#16213e';
      ctx.strokeStyle = '#f5c542';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(cardX, cardY, cardWidth, cardHeight);
      ctx.fill();
      ctx.stroke();

      // 编号
      ctx.fillStyle = '#f5c542';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${i + 1}`, cardX + cardWidth/2, cardY + 30);

      // 图标
      const icons = { STAR: '⭐', HELMET: '🛡️', LIFE: '❤️', SHIELD: '🔰', BOMB: '💣', SPEED: '🏃' };
      ctx.font = '24px sans-serif';
      ctx.fillText(icons[opt.type] || '?', cardX + cardWidth/2, cardY + 60);

      // 描述
      ctx.fillStyle = '#aaa';
      ctx.font = '11px sans-serif';
      ctx.fillText(opt.label, cardX + cardWidth/2, cardY + 85);
    });

    // 提示
    ctx.fillStyle = '#888';
    ctx.font = '14px sans-serif';
    ctx.fillText('按数字键 1-' + this.rewardOptions.length + ' 选择', cx, cy + 80);
  }
}

// ─── 启动游戏 ──────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
