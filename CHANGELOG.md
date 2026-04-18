# CAMP 变更日志

## [2026-04-18] v0.1.10 - 合同与铺位解耦

### 概述
合同是永久留存的法律文件，不应随铺位删除而级联删除。调整架构：`contracts.unit_id` 改为可空，删除铺位时仅将关联合同的 `unit_id` 置 NULL。

### 变更内容
- `backend/app/models/contract.py` - `unit_id` 改为 `Mapped[int | None]`（nullable）
- `backend/app/api/v1/units.py` - 删除铺位时合同保留并置空 unit_id，工单仍级联删除
- 数据库：`ALTER TABLE contracts ALTER COLUMN unit_id DROP NOT NULL`

---

## [2026-04-18] v0.1.9 - 删除铺位级联清理

### 概述
修复删除铺位时因外键约束导致失败的问题。铺位被 contracts 和 work_orders 表引用，直接删除会触发 IntegrityError。

### 修复内容
- `backend/app/api/v1/units.py` - 删除铺位前先级联删除关联的合同和工单记录

---

## [2026-04-18] v0.1.8 - 合同 AI 导入完整链路修复

### 概述
修复合同上传 AI 导入功能无法正常工作的 3 个关键问题，使完整的「上传 PDF → LLM 提取 → 预览 → 确认导入」流程端到端可用。

### 问题根因（3个）
1. **外键约束错误**：前端传 `tenant_id=0`（AI 提取结果无此字段），后端拿 0 查 tenants 表外键 → 不存在 → 422/500 报错
2. **PDF 内容未传给 LLM**：对 PDF 文件只发送了 `"Base64 content length: xxx"` 文字描述，LLM 根本看不到合同内容
3. **LLM API URL 双重 /v1**：`settings.llm_api_url` 已含 `/v1`，代码又拼接 `/v1/chat/completions`，导致请求 404

### 修复内容
- `backend/app/api/v1/contracts.py` - 确认接口改为接收 `tenant_name`，自动查找或创建租户记录
- `backend/app/services/contract_ai.py` - 新增 pdfplumber PDF 文本提取；修正 LLM API URL
- `backend/app/schemas/contract.py` - 响应新增 `source_file_name`、`raw_data` 字段
- `frontend/components/floor-plan/UnitDetailPanel.tsx` - 确认导入改发 `tenant_name`
- `frontend/lib/api.ts` - 更新接口签名（tenant_id → tenant_name）
- `backend/requirements.txt` - 新增 pdfplumber 依赖

### 配置说明
需在 `.env` 中配置 LLM 服务：
```
LLM_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_API_KEY=your-api-key
LLM_MODEL=qwen3.6-flash
```

---

## [2026-04-18] v0.1.7 - 多边形绘制工具栏修复 & 合同测试生成器

### 概述
修复多边形绘制模式下工具栏按钮无法点击的问题（按钮位于 pointer-events:none 容器内）。新增点击起点自动闭合多边形的功能。新增用于测试 AI 合同导入功能的示例合同 PDF 生成脚本。

### 核心改动
- **工具栏修复**：polygon-toolbar 添加 pointer-events:auto，确认/取消按钮恢复正常
- **自动闭合**：放置 >= 3 个顶点后，点击距起点 20px 范围内自动闭合并创建铺位
- **合同生成器**：gen_contract.py 使用 reportlab 生成逼真的商业租赁 PDF 合同
- **类型修复**：修复 api.ts 中 5 处 TypeScript 类型错误（Record<string,unknown>.detail 类型不匹配）

### 修复内容
- `frontend/components/floor-plan/FloorPlanViewer.tsx` - 工具栏不可点击、点击起点自动闭合
- `frontend/lib/api.ts` - 5 处 TypeScript 类型错误（error.detail 类型守卫 + FormData 值类型转换）

### 新增文件
- **合同生成器**：`gen_contract.py` - 基于 reportlab 的测试合同 PDF 生成脚本

---

## [2026-04-18] v0.1.6 - 专业楼层平面图底图

### 概述
将占位符楼层平面图替换为专业的 SVG 购物中心布局图，包含逼真的商铺排列、中庭、走廊和公共设施。

### 核心改动
- **1层**：14 个零售铺位环绕中庭，主入口、4 部电梯、卫生间、上行扶梯
- **2层**：14 个铺位 + 美食广场（12 个档口），双向扶梯，中庭挑空区
- **3层**：12 个精品店 + 影院主力店（6 厅，850 m²），顶层布局
- **SVG 矢量格式**：任意缩放清晰可读，可编辑，文件体积小
- **专业标注**：铺位编号、面积标签、图例、指北针、信息框

### 变更文件
- `assets/floor-plans/floor_1_plan.svg` - 1 层平面图（14 个铺位）
- `assets/floor-plans/floor_2_plan.svg` - 2 层平面图（含美食广场）
- `assets/floor-plans/floor_3_plan.svg` - 3 层平面图（含影院）
- 数据库：更新所有活跃 floor_plan 记录的 image_url 引用新的 .svg 图片

---

## [2026-04-18] v0.1.5 - 扩展铺位编辑 & AI 合同导入

### 概述
扩展铺位详情面板，增加完整的编辑字段，并新增 AI 驱动的合同上传功能，支持自动数据提取。

### 核心改动
- **扩展编辑表单**：月租金、业态类型、起租时间、到期时间、备注字段
- **AI 合同上传**：上传 PDF/图片合同，LLM 自动提取租户/租金/日期信息
- **导入预览**：显示置信度评分、警告信息、源文件名，确认前可预览
- **自动预填**：提取的数据自动填充到编辑表单中供审核

### 变更文件
- `frontend/components/floor-plan/UnitDetailPanel.tsx` - 全面重写：扩展表单字段、AI 导入流程、确认/取消交互、增强只读视图

---

## [2026-04-18] v0.1.4 - 铺位多边形形状支持

### 概述
将仅支持矩形的铺位绘制改为支持任意多边形形状。用户现在可以通过在画布上点击顶点来创建任意形状的铺位（L 形、梯形、不规则形）。

### 核心改动
- **多边形绘制模式**：点击添加顶点（最少 3 个），右键撤销，橡皮筋预览线
- **SVG 多边形渲染**：HotspotOverlay 使用 SVG `<polygon>` 渲染非矩形形状
- **顶点拖拽编辑**：编辑模式下可拖拽单个顶点调整多边形形状
- **向后兼容**：已有的矩形热区继续正常工作

### 变更文件
- `frontend/components/floor-plan/FloorPlanViewer.tsx` - 全面重写新增铺位流程（多边形顶点）、HotspotOverlay（SVG 多边形 + 顶点编辑）、保存逻辑（持久化 shape+points）
- `frontend/lib/types.ts` - 新增 `points?: number[][]` 和 `shape` 字段到 HotspotItem

### 修复内容
- JSX div 标签不匹配：主容器缺少闭合标签
- 新建铺位未持久化：现同时写入 floor_plan 的 hotspots JSON 列表
- 未终止的模板字符串拼写错误（`NEW' 应为 `'NEW`）

---

## [2026-04-18] v0.1.3 - 新增铺位 & 编辑模式增强

### 概述
新增在楼层平面图画布上点击创建铺位的功能。修复了阻止页面加载的语法错误。

### 核心改动
- 点击放置新铺位，拖拽调整大小
- 创建数据库记录前的确认/取消工作流
- 修复 FloorPlanViewer 主容器缺少闭合 div 标签

### 变更文件
- `frontend/components/floor-plan/FloorPlanViewer.tsx` - 新增添加铺位模式（点击放置、拖拽调整大小、确认 UI）
- `frontend/app/malls/[mallId]/floors/[floorId]/page.tsx` - 向 FloorPlanViewer 传递 floorId 属性

### 修复内容
- JSX div 标签不匹配：主容器缺少闭合 `</div>` 导致 "Unexpected token div" 错误
- 新建铺位创建后不显示：createUnit() 只写入 units 表但未将 hotspot 添加到 floor_plan 的 hotspots JSON 列表。现同时调用 updateHotspots() 持久化位置

---

## [2026-04-17] v0.1.2 - 楼层平面图生成

### 概述
新增使用 PIL 自动生成楼层平面图功能。为全部 3 层（F1/F2/F3）生成带彩色铺位矩形的 PNG 图片。修复 render-data 端点的 async SQLAlchemy 问题。

### 核心改动
- 创建 gen_floorplans.py 脚本，生成 1200x800 PNG 楼层平面图
- 图片按铺位状态着色矩形（绿色=已租，红色=空置等）
- 修复 render-data API 的 MissingGreenlet 错误，使用 selectinload 预加载
- 新增 /uploads 目录的静态文件服务

### 修复内容
- `backend/app/api/v1/floor_plans.py` - 在 async 上下文中访问 unit.current_contract 导致 MissingGreenlet 错误
- `backend/scripts/gen_floorplans.py` - 多处 PIL 语法错误（rectangle、textbbox、line）

### 新增内容
- **楼层平面图生成**：`backend/scripts/gen_floorplans.py` - 生成 PNG 图片 + 创建 FloorPlan 数据库记录
- **静态文件服务**：main.py 中挂载 `/uploads` 用于提供楼层平面图访问
- **Pillow 依赖**：requirements.txt 中 `Pillow==10.4.0`

### 快速开始
```bash
# 初始化种子数据后，生成楼层平面图：
docker exec camp-backend python scripts/gen_floorplans.py
# 访问：http://localhost:3201/malls/1/floors/3（F1 平面图）
```

---

## [2026-04-17] v0.1.1 - 项目可运行化

### 概述
修复关键 bug，新增认证系统、数据库迁移、种子数据和改进的 Docker 配置。项目现已完全可运行。

### 核心改动
- 修复 ContractStatus 枚举 SyntaxError（缩进 bug）
- 修复 SQLAlchemy Base.metadata 为空（模型未被导入）
- 新增 JWT 认证系统（登录 + token 校验）
- 配置 Alembic 异步迁移用于 PostgreSQL
- 创建演示种子数据脚本（Sunshine Plaza 商场 + 14 个铺位 + 10 个租户）
- 改进 Docker Compose 配置（网络、健康检查、重启策略）

### 修复内容
- `backend/app/models/contract.py:16` - ContractStatus.EXPIRED 缩进错误导致 SyntaxError
- `backend/app/models/__init__.py` - 模型从未被导入，Base.metadata 无表（init_db() 无法建表）

### 新增内容
- **认证系统**：`app/core/security.py`（JWT 工具）、`app/api/v1/auth.py`（登录/我的信息接口）
- **数据库迁移**：`alembic.ini`、`alembic/env.py`（async 引擎）、`alembic/script.py.mako`
- **种子数据**：`backend/scripts/seed_data.py` - 创建 Sunshine Plaza 商场及建筑、楼层、铺位、租户、合同、发票、付款记录
- **Docker 改进**：`.dockerignore`、命名网络（`camp-network`）、增强健康检查、重启策略、前端 node_modules 卷隔离

### 变更文件
- `docker/docker-compose.yml` - 新增 networks 段、env_file、更好的健康检查、重启策略
- `docker/Dockerfile.backend` - 新增 curl 支持健康检查
- `docker/Dockerfile.frontend` - 简化构建过程，构建时创建 .next/uploads 目录

### 快速开始
```bash
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d --build
# 初始化演示数据：
docker exec camp-backend python scripts/seed_data.py
# 访问：http://localhost:3201（前端） | http://localhost:8201/docs（API）
# 登录：admin / admin123
```

---

## [2026-04-17] v0.1.0 - 项目初始化

### 概述
CAMP（商业资产管理平台）初始项目脚手架。完整的 monorepo 结构，包含全栈骨架及核心楼层平面图可视化功能。

### 核心改动
- Monorepo 架构：Next.js 14 + FastAPI + PostgreSQL
- **楼层平面图可视化系统**，支持图片热点交互
- **AI 合同导入服务**（LLM 提取 + 自动铺位匹配）
- 商场、建筑、楼层、铺位、租户、合同、发票、工单的完整 CRUD API
- Docker Compose 开发环境
- 多租户就绪（所有表均有 tenant_id 字段）

### 新增内容
- 后端：FastAPI 应用，包含所有模型、Schema、API 路由和服务
- 后端：SQLAlchemy 模型（Mall、Building、Floor、Unit、FloorPlan、Tenant、Contract、Invoice、Payment、WorkOrder）
- 后端：AI 合同提取服务（`services/contract_ai.py`）集成 LLM 和模糊铺位匹配
- 后端：楼层平面图 render-data 接口，提供丰富的热点可视化数据
- 前端：Next.js 14 App Router 全部页面（仪表盘、商场列表/详情、平面图查看、租户、合同、财务、运营）
- 前端：核心楼层平面图组件 - FloorPlanViewer、HotspotOverlay、UnitDetailPanel
- 前端：统一 API 客户端（`lib/api.ts`）包含所有接口方法
- 前端：TypeScript 类型定义与后端 Schema 对应
- 前端：合同页面含 AI 导入 UI 流程
- Docker：docker-compose.yml 含 postgres、redis、backend、frontend 服务
- Docker：后端（Python）和前端（Node.js）的 Dockerfiles
- 文档：CLAUDE.md、README.md、设计文档

### 创建文件（约 40 个）
- `backend/app/main.py`、`config.py`、`database.py`
- `backend/app/models/*.py`（6 个模型文件）
- `backend/app/schemas/*.py`（6 个 Schema 文件）
- `backend/app/api/v1/*.py`（7 个路由文件）
- `backend/app/services/contract_ai.py`
- `backend/tests/conftest.py`
- `frontend/app/page.tsx` + 7 个页面路由
- `frontend/components/floor-plan/*.tsx`（3 个核心组件）
- `frontend/lib/api.ts`、`lib/types.ts`
- `docker/docker-compose.yml`、`Dockerfile.backend`、`Dockerfile.frontend`
- `CLAUDE.md`、`README.md`、`.gitignore`、`.env.example`
- `docs/plans/2026-04-17-camp-platform-design.md`
