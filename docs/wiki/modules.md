# 模块拆分与职责

## 1. Backoffice UI（页面与组件）

- Dashboard
  - 待办卡片与列表入口
  - 最近活动（可选）
- Orders
  - OrderList：搜索/筛选/行内动作
  - OrderCreateDrawer：建单抽屉（必填最少化）
  - OrderDetail：摘要/维修/付款/消息/时间线
- Customers
  - CustomerList：电话优先搜索
  - CustomerDetail：设备管理、工单历史、消息聚合入口
- Messages
  - TemplateList/Editor：模板 CRUD
  - MessageLogList：发送记录筛选与追溯
- Settings
  - StoreSettings：地址/营业时间/map_url/store_code
  - AutomationParams：48h/5天等规则配置
  - Users/Roles：账号与角色（可先最小可用）

## 2. API（按资源划分）

- Auth：login/logout/me
- Stores：list/select/updateParams
- Customers：list/get/create/update/softDelete
- Devices：create/update/softDelete（挂在 customer 下）
- Orders：list/get/create/update/transition/softDelete
- OrderApproval：mark（approved/rejected/pending）
- OrderPayment：update（deposit/is_paid 等）
- OrderDelivery：markDelivered/markCompleted（或合并进 transition）
- Templates：list/get/create/update/delete
- MessageLogs：createDraft/markOpened/markSent/list
- OrderEvents：list（按 order_id）
- Import：upload/preview/run/report

## 3. 领域服务（建议集中管理“规则”）

- OrderStatusMachine：状态允许性与前置条件
- OrderNumberGenerator：public_no 生成（store_code + date + seq）
- PhoneNormalizer：phone_e164 规范化
- MessageRenderer：模板变量渲染与快照
- TodoCalculator：approvalOverdue/pickupOverdue 计算（按门店参数）
- AuditWriter：写 order_events（统一入口）

## 4. 数据与索引策略（与软删除相关）

- 软删除字段建议统一：deleted_at
- 唯一约束建议采用“仅对未删除生效”的策略（实现方式取决于数据库/ORM）
- 查询默认过滤 deleted_at；管理员可通过开关查看已删除数据（可二期）
