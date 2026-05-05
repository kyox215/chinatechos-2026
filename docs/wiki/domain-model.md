# 领域模型与状态机

## 1. 实体（MVP）

### 1.1 Store（门店）

- store_code：用于 public_no 的店号前缀（例：MI）
- params：包含 48h、5 天等门店级规则

### 1.2 User（用户）

- role：frontdesk / technician / manager
- stores[]：可访问门店

### 1.3 Customer（客户）

- phone_e164（主索引，默认 +39）
- phone_raw（保留原始输入）
- name（可为空）
- consent_required_notify / consent_marketing

### 1.4 Device（设备）

- customer_id
- brand / model（建单必填）
- serial_or_imei（可为空）

### 1.5 RepairOrder（工单）

- public_no（对客短号）
- order_type：quick_repair / dropoff_repair
- status：标准状态枚举
- status_raw：Excel 原始值保留
- issue_description（必填）
- diagnosis_result（留机维修主要使用）
- quotation_amount / deposit_amount / balance_amount / is_paid
- approval_status：pending / approved / rejected
- approval_sent_at / approval_confirmed_at
- completed_at（标记“修好/待取件”的时间）
- delivered_at（交付时间）
- pause_reason / cancel_reason

### 1.6 MessageTemplate（模板）

- code（唯一，按门店隔离或全局隔离需提前定）
- type：quote / ready_pickup / pickup_reminder / parts_arrived
- language：IT/EN（MVP 可先 IT）
- body：模板正文（变量占位）

### 1.7 MessageLog（消息留痕）

- order_id / customer_id / store_id
- template_code + message_body_snapshot
- status：draft / opened / marked_sent / failed
- operator（谁操作）
- timestamps：opened_at / sent_at

### 1.8 OrderEvent（时间线）

- order_id / store_id
- event_type
- payload_snapshot（最小可用：关键字段或引用）
- operator + created_at

## 2. 状态机（RepairOrder.status）

标准状态集合：
- new
- diagnosing
- waiting_approval
- repairing
- waiting_pickup
- completed
- cancelled

### 2.1 quick_repair（快速维修）建议路径

- new → repairing → waiting_pickup → completed

约束：
- 不进入 diagnosing / waiting_approval

### 2.2 dropoff_repair（留机维修）建议路径

- new → diagnosing → waiting_approval → repairing → waiting_pickup → completed

约束：
- diagnosing → waiting_approval 前必须 quotation_amount
- waiting_approval 回写 rejected：自动 cancelled

### 2.3 关键校验（实现时必须统一复用）

- transition 校验：是否允许从 A 到 B（按 order_type）
- 状态前置条件：
  - 进入 waiting_approval：quotation_amount 必填
  - 完成 completed：默认要求 delivered_at + is_paid=true（manager 可 override）
- 字段只读策略：
  - completed/cancelled 后：关键字段只读（客户/设备/金额/状态）

## 3. 待办计算口径（Dashboard）

- approvalOverdue：status=waiting_approval 且 now-approval_sent_at > store.params.approval_overdue_hours
- pickupOverdue：status=waiting_pickup 且 now-completed_at > store.params.pickup_overdue_days
- paused：pause_reason 非空且 status=repairing 或 waiting_pickup（MVP 可先按定义收口）
- todayCreated / todayCompleted：按门店时区（Europe/Rome）计算自然日
