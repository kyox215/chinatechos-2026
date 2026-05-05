# 后台 MVP 开发任务规划（重规划版）

适用范围：门店内部后台（客户/设备/工单/WhatsApp 留痕/待办/设置/Excel 导入），不包含电商前台、复杂库存、电子发票深度对接、WhatsApp API 自动直发、在线支付与客户自助门户。

## 1. 项目目标（MVP）

- 用后台系统替代 Excel 台账，支持秒级搜索与可追溯流程
- 双轨工单：快速维修（quick_repair）/留机维修（dropoff_repair）
- WhatsApp 触达：模板渲染 → wa.me 打开 → 留痕（message_logs）
- 全链路留痕：order_events（创建、状态变更、报价发送、确认回写、付款更新、交付、完结）
- 工作台待办：48h 待确认 / 5 天未取件 / paused / 今日新建 / 今日完结
- 多门店预埋：数据按 store_id 隔离，接口强制门店上下文

## 2. 关键规则（作为全局约束）

- 手机号是客户主索引：phone_e164（默认 +39），保留 phone_raw
- 工单号 public_no：store_code + 日期 + 序号（例：MI-R250506-001）
- 留机维修才允许进入 diagnosing、waiting_approval
- 进入 waiting_approval 前必须有 quotation_amount
- waiting_approval 回写 rejected 后：自动 cancelled，保留完整历史
- completed 默认只读；manager 可通过“纠错入口”做极少字段修正（可作为二期）
- 待确认超时：status=waiting_approval 且 now-approval_sent_at > 48h
- 超期未取件：status=waiting_pickup 且 now-completed_at > 5 天

## 3. 里程碑与交付物

### M0：可运行骨架（工程最小可用）

交付物：
- 前后端可启动与部署流水线（本地 + 预发环境）
- 鉴权、门店上下文、角色权限最小可用
- 数据库迁移机制与基础表（store/user/customer/device/order）

验收点：
- 不同角色登录后能进入后台
- 任意业务接口都能正确校验 store 权限

### M1：主链路跑通（替代 Excel 的“建-查-改-追溯”）

交付物：
- 客户/设备/工单全链路（建-查-改-软删）
- 双轨状态机 + 校验
- 报价模板生成与发送留痕（wa.me）
- 订金/尾款摘要与结清
- 工单详情时间线（order_events）

验收点：
- 前台能在 1 分钟内完成建单并进入详情
- 留机维修：录入报价 → 发送报价模板 → 回写同意 → 进入维修
- 完工：进入 waiting_pickup 并生成可取件通知草稿
- 交付 + 结清后可完结进入 completed

### M2：好用与可迁移（待办驱动 + 数据导入）

交付物：
- Dashboard 待办卡片 + 待办列表跳转
- 列表高级筛选与超时标记（overdue flags）
- 设置：门店信息、自动化参数（48h/5天）、模板库维护（manager）
- 软删除全链路与唯一索引策略
- Excel 导入（最小可用：导入工单/客户/设备 + 状态映射 + 报表）

验收点：
- Dashboard 计数与列表正确
- 软删除后可重建同手机号客户/同 IMEI 设备/同 code 模板
- 导入 Excel 后可用电话/型号/关键词搜到历史工单

## 4. Epic 级任务拆分（可直接进项目管理工具）

### EP-01 鉴权与门店上下文

目标：让“当前门店”成为所有读写的硬前提，且权限可控。

交付：
- 登录与会话机制（选择方案并落地）
- `/me` 返回：用户信息、可访问门店列表、角色
- 所有业务接口校验 store 上下文（请求头或会话内 store_id）
- 前端：顶部门店切换入口（若用户多门店）
- 审计：关键写操作记录 operator（user_id / display_name）

验收用例：
- frontdesk 登录后仅能访问自身门店数据
- manager 能切换门店并看到对应待办与列表

### EP-02 客户与设备

目标：电话一响就能定位客户与历史。

交付（客户）：
- 列表：搜索（电话/姓名），默认不展示 deleted
- 详情：聚合设备与最近工单、客户时间线入口
- 创建/编辑/软删
- phone_e164 规范化（默认 +39；无法解析时保留 raw 且提示）

交付（设备）：
- 在客户详情内管理设备：新增/编辑/软删
- 建单时可提示复用历史设备（同手机号 + 同品牌型号）

验收用例：
- 同手机号创建客户第二次应命中已有客户（或提示合并）
- 软删除客户后可用同 phone_e164 重建

### EP-03 工单（核心）

目标：替代 Excel 的主操作流。

交付（列表）：
- 搜索：public_no/电话/姓名/IMEI/品牌型号/问题关键词/技师
- 筛选：状态/类型/技师/是否结清/待确认超时/超期未取件/日期范围
- 行内快捷动作：打开详情、WhatsApp、快速改状态（权限控制）

交付（新建）：
- 表单：手机号+品牌+型号+问题必填
- 支持选择工单类型：quick_repair/dropoff_repair
- 自动生成 public_no

交付（详情）：
- 摘要区：状态、类型、客户/电话、WhatsApp 按钮、待办提示
- 维修区：问题、检测结论、报价、技师、内部标记、保修
- 付款区：quotation/deposit/balance/is_paid
- 动作：状态流转、回写报价确认、标记交付、更新付款
- completed/cancelled 只读策略

验收用例：
- 留机维修：diagnosing → waiting_approval 前强校验 quotation_amount
- waiting_approval 回写 rejected 自动 cancelled 且写 cancel_reason

### EP-04 消息中心（模板 + 留痕）

目标：可追溯“我什么时候通知过你”。

交付（模板库）：
- CRUD（仅 manager）
- 字段：code/type/language/body/variables/is_active
- 变量渲染：{nome} {marca} {modello} {public_no} {totale} {acconto} {saldo} 等

交付（工单内消息）：
- 选择模板 → 渲染变量 → 生成 message_log（draft）
- 返回 wa.me URL（预填文案）
- 两个状态动作：opened / marked_sent

交付（发送记录页）：
- 筛选：门店、日期、模板、操作人、工单号
- 列表展示：模板/内容快照/状态/时间/操作人

验收用例：
- 点击打开 wa.me 后 message_log 记录 opened
- 员工标记已发送后 message_log 记录 marked_sent

### EP-05 时间线与审计追溯（order_events）

目标：把“发生了什么”变成系统事实。

交付：
- 事件类型：created/status_changed/quote_sent/approval_marked/payment_updated/delivered/completed/cancelled/message_opened/message_marked_sent
- 详情页时间线组件（倒序）
- 每条事件带 operator 与变更快照（最小可用：关键信息字段）

验收用例：
- 每次状态变更都落一条 status_changed
- 报价发送与确认回写都有独立事件

### EP-06 Dashboard 待办（待办驱动）

目标：员工每天打开系统第一眼知道先做什么。

交付：
- 待办汇总：approvalOverdue/pickupOverdue/paused/todayCreated/todayCompleted
- 待办列表：按类型返回工单列表（复用列表筛选）
- 前端 Dashboard：卡片 + 点击跳转对应筛选列表

验收用例：
- waiting_approval 超 48h 的单能出现在待确认列表并高亮
- waiting_pickup 超 5 天的单能出现在未取件列表并高亮

### EP-07 设置（门店/参数/字典）

目标：让 manager 自己维护门店与规则，减少改代码。

交付：
- 门店信息：地址/营业时间/map_url/store_code
- 自动化参数：48h、5 天（按门店可配置）
- 字典/选项：技师名单、内部标记、保修选项（MVP 可先自由文本，后续再字典化）

验收用例：
- 修改门店规则后，Dashboard 超时计算立即按新规则生效

### EP-08 Excel 导入（最小可用）

目标：把历史台账导入系统并可检索。

交付：
- 导入入口（仅 manager）
- 解析与映射：客户/设备/工单 + status_raw 映射 status
- phone 归并、设备挂载策略
- 导入结果报表：成功/失败行数 + 失败原因（可下载）

验收用例：
- 导入后可用电话/型号/关键词找到历史订单
- 失败行能定位原因（必填缺失/日期解析失败/金额格式异常等）

## 5. 测试与验收（建议写进 DoD）

- 最小单元测试：状态机转换校验、金额计算、phone_e164 规范化、待办计算口径
- 最小集成测试：建单→报价→确认→维修→完工→取件→结清→完结全链路
- 关键 UAT：复用既有 UAT-01～UAT-08，并补充“多门店隔离”与“软删除重建”

## 6. 风险与需要前置确认的点（不阻塞规划，但影响实现细节）

- 鉴权技术选型与部署形态（自建/托管），以及 store 上下文的承载方式
- Excel 数据清洗：电话号码格式、日期序列值、缺字段与异常状态值
- 技师是否要一开始字典化（会影响筛选、导入与权限扩展）
