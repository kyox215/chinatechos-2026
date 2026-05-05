# 架构总览

## 1. 目标与原则

- MVP 优先跑通“接待建单 → 跟进 → 通知 → 交付完结”主链路
- 所有关键节点必须可追溯（order_events / message_logs）
- 多门店预埋：数据隔离是硬约束，不靠前端“自觉”
- WhatsApp 以低成本落地为优先：wa.me 深链 + 人工发送 + 系统留痕

## 2. 逻辑分层（推荐）

- UI（后台 Web）
  - Dashboard（待办驱动）
  - Orders（列表/详情/新建抽屉）
  - Customers（列表/详情/设备管理）
  - Messages（模板/发送记录）
  - Settings（门店/参数/字典/用户）
- API（业务接口）
  - 认证与会话
  - 门店上下文校验
  - 客户/设备/工单/模板/消息/事件/设置
- Domain（领域层）
  - 状态机与校验（工单状态、权限、必填条件）
  - 事件写入（order_events）
  - 模板渲染（变量替换与快照）
  - 待办计算（48h/5天）
- Data（持久化）
  - store/user/customer/device/order/template/message_log/order_event/settings
  - 索引与唯一约束策略（支持软删除重建）

## 3. 核心数据流（文本版）

### 3.1 建单

1) 前台输入手机号、品牌、型号、问题 → 创建/复用 customer 与 device  
2) 创建 order（生成 public_no，status=new）  
3) 写入 order_events: created  

### 3.2 留机维修报价与确认

1) diagnosing：填写检测结论、报价金额  
2) 进入 waiting_approval：写 order_events: status_changed  
3) 选择“报价模板”→ 渲染变量 → 生成 message_log(draft) → 返回 wa.me  
4) 员工发送后回到系统标记 sent → 写 message_log(marked_sent) 与 order_events(message_marked_sent)  
5) 回写客户确认（approved/rejected/pending）
   - rejected：自动 cancelled，并写 cancel_reason 与事件  

### 3.3 完工与取件

1) repairing → waiting_pickup：写 completed_at + 事件  
2) 生成“可取件通知”消息草稿（可自动生成或一键生成）  
3) 交付与结清后进入 completed：写 delivered_at / is_paid / completed 事件  

## 4. 关键扩展点（不做但预留）

- 付款明细 Payment Records（替代 PaymentSummary）
- 库存领用与成本 StockMovement（与 order 关联）
- 票据 InvoiceDocument（与 sale/payment 关联）
- 自动化规则引擎（替代规则硬编码）
