# 坦克大战项目 - 工作流程规则

> 作者：Agnes (AI Assistant)
> 项目路径：`E:/2026_learning/wolin_learning_20261008learning_homework/tank/`

---

## 📋 每次修改代码后的标准流程

### 1. 验证语法（必须）
```bash
node -c "E:/2026_learning/wolin_learning_20260817/20261008learning_homework/tank/main.js" && echo "语法OK"
```
- 语法错误时必须修复，不能继续

### 2. 更新版本记录（必须）
- 文件：`更新记录.md`
- 格式：
  ```
  ## v1.XX - YYYY-MM-DD 简短标题
  
  ### 改动内容
  - ✅ 具体改动1
  - ✅ 具体改动2
  ```
- 版本号递增：每次重大改动 +1 补丁版本（如 v1.57 → v1.58）

### 3. 更新 README.md（可选）
- 仅在新增重要功能或重大架构变更时更新
- 保持与 `更新记录.md` 一致

### 4. 更新 OPTIMIZATION.md（可选）
- 优化计划完成后更新状态标记
- 标记已完成项：`[x]`

### 5. 启动游戏验证（必须）
```bash
cd "E:/2026_learning/wolin_learning_20260817/20261008learning_homework/tank" && start index.html
```

### 6. Git 提交与推送（必须）
每次修改完代码后，必须执行以下步骤：
```bash
cd "E:/2026_learning/wolin_learning_20260817/20261008learning_homework/tank"
git add -A
git commit -m "v1.XX 简短描述改动内容"
git push github master
git push gitee master
```
> **注意**：两个仓库都要推（github + gitee），版本号与 `更新记录.md` 保持一致

---

## 🎮 项目基本信息

| 项目 | 值 |
|------|-----|
| 技术栈 | HTML5 Canvas + ES6+ JavaScript |
| 地图尺寸 | 13×13 格子，TILE=40px |
| 画布尺寸 | 520×520px |
| 坦克尺寸 | 36×36px |
| 主要文件 | `main.js` (~1900行), `index.html`, `style.css` |
| 当前版本 | v1.59 |

---

## 🔧 核心代码结构

```
main.js 结构：
├── 工具函数 (aabb, rect, snapToGrid 等)
├── 常量定义 (TILE, COLS, ROWS, AI_STATE 等)
├── LEVELS 数组 (5个关卡数据)
├── Entity 类 (基类)
├── Bullet 类
├── Explosion 类
├── FloatingText 类
├── PowerUp 类
├── Tank 类 (基类)
├── PlayerTank 类
├── EnemyTank 类
├── GameMap 类
└── Game 类 (主循环)
```

---

## ⚠️ 常见陷阱

1. **不要删除 `_draw()` 调用**：主循环每帧必须调用 `_draw()`
2. **空值保护**：访问 `this.player` 前检查 null
3. **版本递增**：保持版本号连续递增
4. **不修改 HTML/CSS**：除非用户明确要求
5. **地图解析**：`_parse()` 方法不能有重复代码块

---

## 📝 更新记录格式模板

```markdown
## v1.XX - YYYY-MM-DD [简短描述]

### 新增功能
- ✅ [功能1]
- ✅ [功能2]

### Bug修复
- ✅ [问题描述] → [修复方案]

### 技术优化
- ✅ [优化内容]
```

---

## 🚀 启动命令

```bash
# 启动HTTP服务器（推荐）
cd "E:/2026_learning/wolin_learning_20260817/20261008learning_homework/tank"
python -m http.server 8080
start http://localhost:8080
```

或者直接双击 `index.html` 打开（部分浏览器可能限制本地文件访问）。
