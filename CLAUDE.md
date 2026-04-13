# CLAUDE.md — AI 协作说明

## 项目简介

**Neon Siege** — 赛博朋克风格多人 3D 浏览器射击游戏。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端渲染 | Three.js + 自定义 GLSL 着色器 + Vite |
| 后端 | Node.js (ESM) + Express + Socket.io |
| 算法 | A* 寻路（MinHeap + Octile 启发式）|
| 地图生成 | BSP 树程序化生成 + Mulberry32 种子 RNG |

## 目录结构

```
neon-siege/
├── server/src/
│   ├── index.js              # Express + Socket.io 入口，端口 4000
│   ├── RoomManager.js        # 房间创建/加入/销毁
│   ├── GameRoom.js           # 20Hz 服务器游戏循环，权威状态
│   ├── pathfinding/
│   │   ├── AStar.js          # A* 实现
│   │   ├── MinHeap.js        # 二叉最小堆
│   │   └── PathGrid.js       # 网格可行走性查询
│   └── mapgen/
│       ├── BSPGenerator.js   # BSP 地图生成（服务端版）
│       └── RNG.js            # Mulberry32 种子随机数
└── client/src/
    ├── main.js               # 游戏主入口，串联所有模块
    ├── rendering/
    │   ├── SceneManager.js   # Three.js 场景/摄像机/后处理
    │   ├── ArenaRenderer.js  # 瓦片图 → 合并 3D 几何体
    │   ├── EnemyRenderer.js  # 敌人网格 + 自定义着色器
    │   ├── PlayerRenderer.js # 本地/远程玩家网格
    │   ├── BulletRenderer.js # 子弹对象池
    │   └── ParticleSystem.js # 粒子爆炸系统
    ├── shaders/
    │   ├── NeonEnemy.vert/.frag        # 菲涅尔边缘光 + 脉冲
    │   └── ChromaticAberration.js      # 色差后处理
    ├── mapgen/BSPGenerator.js  # 与服务端完全相同（种子共享）
    ├── network/
    │   ├── SocketClient.js   # Socket.io 客户端封装
    │   └── Interpolator.js   # 100ms 缓冲插值
    ├── input/InputHandler.js # WASD + 鼠标输入
    └── ui/HUD.js             # 血量/分数/计时器/结算界面
```

## 关键设计决策

- **服务器权威模型**：服务器拥有血量、命中判定、敌人位置。客户端只做本地移动预测。
- **种子共享**：服务端生成地图种子，客户端用相同 BSP 算法重建，节省带宽。
- **A* 错开重算**：15 个敌人分散到不同帧重算路径，避免单帧卡顿。
- **合并几何体**：地板/墙壁各合并为一个 Mesh，减少 draw call。
- **粒子对象池**：预分配 800 个粒子槽，避免 GC 压力。

## 本地开发

```bash
# 终端 1 — 服务器（端口 4000）
cd server && npm install && npm run dev

# 终端 2 — 客户端（端口 3000，自动代理 /socket.io 到 4000）
cd client && npm install && npm run dev
```

打开 http://localhost:3000，两个标签页可测试多人。

## 待完善 / 可扩展方向

- [ ] 客户端预测与和解（InputPredictor.js 已有骨架，待实现序列号回放）
- [ ] 音效（Web Audio API，AudioManager.js 未实现）
- [ ] 小地图（Canvas 2D overlay）
- [ ] 更多敌人类型（Orbiter、Splitter、Charger）
- [ ] 移动端触屏支持
- [ ] 部署到公网（Railway / Render 部署服务端，Vercel 部署客户端）

## 给 AI 的提示

- 修改地图参数在 `server/src/mapgen/BSPGenerator.js` 的顶部常量，**客户端同名文件必须同步修改**
- 游戏平衡数值（速度/伤害/血量）集中在 `server/src/GameRoom.js` 顶部常量区
- 着色器文件是 `.vert` / `.frag`，Vite 通过 `?raw` 导入为字符串
- 服务端使用 Node.js ESM（`"type": "module"`），import 路径必须带 `.js` 后缀
