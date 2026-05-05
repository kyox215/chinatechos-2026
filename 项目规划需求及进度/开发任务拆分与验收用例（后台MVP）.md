# 开发任务拆分与验收用例（后台 MVP）

目标：把你已确认的 MVP（后台 + 双轨工单 + WhatsApp 留痕 + 自动提醒参数）拆成可开发、可验收的任务清单。

依赖文档：
- 《后台页面原型结构图（MVP）》
- 《数据库表结构草案（PostgreSQL，多门店预埋）》
- 《API 接口契约（后台 MVP）》

---

## 1) 开发里程碑（建议按 3 个 Sprint）

### Sprint 0：基础框架（1–3 天）
- 登录/鉴权
- 门店上下文（X-Store-Id）
- 角色权限（frontdesk/technician/manager）最小可用
- 基础 UI 框架（侧边栏、路由、全局搜索框占位）

交付标准：
- 不同角色登录后能进入后台
- 能切换门店（或至少能锁定当前门店）
- 任意接口都能正确校验 store 权限

### Sprint 1：主链路跑通（5–10 天）
- 客户/设备/工单“建-查-改”
- 双轨工单状态流转（快速/留机）
- 报价模板生成 + 发送留痕（wa.me）
- 订金/尾款摘要与结清
- 工单详情时间线（order_events）

交付标准：
- 前台能在 1 分钟内完成建单并进入详情
- 留机维修：能录入报价 → 发送报价模板 → 回写客户同意 → 进入维修
- 完工：进入待取件并生成可取件通知
- 结清 + 交付后能完结

### Sprint 2：好用与可追溯（5–10 天）
- Dashboard 待办（待确认超时、超期未取件、挂起）
- 列表高级筛选与标记（overdue flags）
- 设置：门店信息、自动化参数（48h/5天）、模板库维护（manager）
- 软删除全链路（列表隐藏、详情不可访问、唯一索引不冲突）
- Excel 导入脚本/后台导入（最小可用）

交付标准：
- Dashboard 能正确算出待办数量与列表
- 软删除后能重新创建同手机号客户、同 IMEI 设备、同 code 模板
- 导入 Excel 后能用电话/型号/关键词搜到历史工单

---

## 2) Epic 级任务拆分（可直接进项目管理工具）

### EP-01 鉴权与门店上下文
- [ ] 登录接口 + Token/Session
- [ ] `/me` 返回可访问门店与角色
- [ ] 所有业务接口校验 `X-Store-Id`
- [ ] 前端顶部门店切换（若用户多门店）

### EP-02 客户与设备
- [ ] 客户列表：搜索（电话/姓名）
- [ ] 客户详情：聚合设备与最近工单
- [ ] 客户创建/编辑/软删
- [ ] 设备新增/编辑/软删（挂在客户下）
- [ ] phone_e164 规范化（默认 +39；异常保留 raw）

### EP-03 工单（核心）
- [ ] 工单列表：搜索 + 状态/类型/技师/结清筛选
- [ ] 工单新建（抽屉）：手机号+品牌型号+问题必填
- [ ] 工单详情：摘要/维修/付款/消息/时间线
- [ ] 状态流转接口（transition）+ 应用层校验
- [ ] 报价确认回写（approval）
- [ ] 标记交付（deliver）
- [ ] 付款摘要更新（payment）
- [ ] 工单软删

### EP-04 消息中心（模板 + 留痕）
- [ ] 模板库 CRUD（manager）
- [ ] 工单内生成消息：渲染变量 → 返回 wa.me URL → 写 message_log
- [ ] message_log：opened / marked_sent 两个动作
- [ ] 发送记录列表页（按门店、日期、模板筛选）

### EP-05 时间线与审计追溯
- [ ] order_events：创建、状态变更、报价发送、确认回写、付款更新、交付、完结
- [ ] 详情页时间线组件（倒序）

### EP-06 Dashboard 待办
- [ ] 待办汇总接口：approvalOverdue/pickupOverdue/paused/todayCreated/todayCompleted
- [ ] 待办列表接口：按类型返回工单列表
- [ ] 前端 Dashboard 卡片与跳转

### EP-07 设置
- [ ] 门店信息维护（地址、营业时间、map_url、store_code）
- [ ] 自动化参数维护（48h、5 天）
- [ ] 技师名单/内部标记/保修选项：MVP 可先配置为“自由文本”，二期再字典化

### EP-08 Excel 导入（最小可用）
- [ ] 导入入口（仅 manager）
- [ ] 导入策略：按 phone 归客户、按设备信息建档、写入 status_raw + 映射 status
- [ ] 导入结果报表：成功/失败行数 + 失败原因

---

## 3) 验收用例（Given / When / Then）

### UAT-01 前台快速建单（快速维修）
Given：前台在 MI 门店  
When：输入手机号、品牌、型号、问题并提交  
Then：生成 `public_no=MI-RYYMMDD-xxx`，状态为 `new`，并能在列表中搜到

### UAT-02 留机维修报价流程
Given：留机维修工单处于 `diagnosing`  
When：录入报价金额并提交进入 `waiting_approval`，点击“发送报价模板”  
Then：系统生成 message_log（draft）并返回 wa.me 链接；时间线新增 `quote_sent` 事件

### UAT-03 报价确认回写与推进
Given：工单处于 `waiting_approval` 且客户已同意  
When：前台回写 approvalStatus=approved，并执行 transition 到 `repairing`  
Then：状态变更成功，时间线记录 approval_marked 与 status_changed

### UAT-03B 报价拒绝后直接取消
Given：工单处于 `waiting_approval` 且客户明确拒绝报价  
When：前台回写 approvalStatus=`rejected`  
Then：系统自动将工单状态改为 `cancelled`，写入 `cancelReason=客户拒绝报价`，并保留完整时间线与消息记录

### UAT-04 完工可取件通知
Given：工单处于 `repairing`  
When：技师/前台将状态推进到 `waiting_pickup`  
Then：系统自动生成“可取件”消息草稿（或在详情页一键生成），并记录 completed_at

### UAT-05 交付与结清后完结
Given：工单处于 `waiting_pickup`  
When：前台录入尾款结清（is_paid=true）并标记交付 deliveredAt，再 transition 到 `completed`  
Then：工单进入 completed；completed 后默认不可编辑关键字段

### UAT-06 待确认超时（48h）待办
Given：工单处于 waiting_approval 且 approval_sent_at 已超过 48h  
When：打开 Dashboard  
Then：待确认超时计数+1，点击卡片能看到该工单列表

### UAT-07 超期未取件（5 天）待办
Given：工单处于 waiting_pickup 且 completed_at 已超过 5 天  
When：打开 Dashboard  
Then：超期未取件计数+1，工单在列表中高亮

### UAT-08 软删除不影响重建
Given：某客户被软删除（deleted_at 不为空）  
When：用相同 phone_e164 再创建客户  
Then：创建成功，不被唯一约束阻止；列表默认不显示已删除客户

---

## 4) 建议你下一步决定的 3 个“落地性问题”

1) 你准备先上线 **单门店** 试运行，还是一开始就有 2+ 门店需要并行导入/使用？（影响导入与培训）
2) 技师名字（technician_name）是固定几个人，还是经常变动？（决定是否立刻字典化）
3) 已确认：客户拒绝报价后，系统直接 `cancelled`，但保留完整历史记录
