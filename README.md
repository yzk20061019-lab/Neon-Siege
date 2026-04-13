# Neon Siege

赛博朋克风格多人 3D 浏览器射击游戏。

## 技术栈

- **前端**：Three.js + 自定义 GLSL 着色器 + Vite
- **后端**：Node.js + Socket.io
- **算法**：A* 寻路（MinHeap + Octile 启发式）+ BSP 程序化地图生成

## 快速开始

### 1. 安装依赖

```bash
# 服务端
cd server && npm install

# 客户端
cd ../client && npm install
```

### 2. 启动服务器

```bash
cd server
npm run dev
# 监听 http://localhost:4000
```

### 3. 启动客户端（新终端）

```bash
cd client
npm run dev
# 打开 http://localhost:3000
```

### 4. 多人游戏

- 打开两个浏览器标签访问 `http://localhost:3000`
- 一个玩家点 **CREATE ROOM**，获得房间码
- 另一个玩家输入房间码点 **JOIN**

## 操作说明

| 按键 | 功能 |
|------|------|
| WASD | 移动 |
| 鼠标移动 | 瞄准 |
| 鼠标左键 | 射击 |

## 技术亮点

- **A* 复杂度**：O(E log V)，MinHeap 将 O(V²) 降至 O(E log V)
- **BSP 地图**：递归二叉空间分割，保证连通性，同种子复现
- **网络权威模型**：服务器拥有血量/命中判定，客户端预测移动
- **GLSL 菲涅尔**：`1 - dot(normal, viewDir)` 实现边缘发光
- **粒子系统**：对象池 + GPU BufferGeometry，单次 draw call
