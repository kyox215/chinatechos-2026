# 命名与约定

## 1. 术语统一

- 工单：RepairOrder / Order / Riparazione（UI 文案可用“工单/订单”择一，但代码建议统一 RepairOrder）
- 留痕：MessageLog（消息）与 OrderEvent（时间线）
- 待办：Todo（Dashboard 的待处理集合，不等同于任务管理工具）

## 2. 枚举值（建议）

RepairOrder.order_type：
- quick_repair
- dropoff_repair

RepairOrder.status：
- new
- diagnosing
- waiting_approval
- repairing
- waiting_pickup
- completed
- cancelled

RepairOrder.approval_status：
- pending
- approved
- rejected

MessageLog.status：
- draft
- opened
- marked_sent
- failed

Template.type：
- quote
- ready_pickup
- pickup_reminder
- parts_arrived

## 3. 文案与本地化

- 默认语言：IT（意大利语），结构预留 EN
- 货币：EUR
- 日期：dd/mm/yyyy
- 时区：Europe/Rome

## 4. public_no 规则

- 格式：{store_code}-R{YYMMDD}-{seq}
- seq：当日门店内递增，最小 3 位（001 起）

## 5. 软删除策略

- 统一字段：deleted_at
- 列表与搜索默认过滤 deleted_at 不为空的数据
- 唯一约束需支持“软删除后可重建”（实现时必须专门设计）
