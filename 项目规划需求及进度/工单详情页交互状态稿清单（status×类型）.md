# 工单详情页交互状态稿清单（status × 类型）

用途：给设计师画 **工单详情页** 的状态稿用。  
目标：把「每个状态下页面长什么样、出现哪些按钮、哪些动作可用、需要什么校验」一次性钉死，避免设计与开发理解不一致。

适用范围：
- 工单双轨：快速维修（quick_repair） / 留机维修（dropoff_repair）
- 状态集：`new / diagnosing / waiting_approval / repairing / waiting_pickup / completed / cancelled`
- 已确认：拒绝报价后 **直接 cancelled**（保留历史）
- 已确认：`completed` 后默认只读（关键字段不可编辑）

---

## 1. 详情页固定结构（所有状态都存在）

### 1.1 顶部摘要条（固定）
必须包含：
- 返回按钮 `Indietro`
- 标题 `Ordine {publicNo}`
- 状态徽标（颜色+文案）
- 工单类型徽标：`Riparazione veloce` / `Riparazione con consegna`
- 客户摘要：姓名（可空）+ 电话
- 主快捷按钮：
  - `Apri WhatsApp`
  - `Invia messaggio`（打开模板选择）
  - `Cambia stato`（部分状态可隐藏或禁用）
- 待办提示 Banner（按规则出现，见 1.3）

### 1.2 主体卡片区（两列布局）
左列（信息与维修）：
- 客户卡（Cliente）
- 设备卡（Dispositivo）
- 维修卡（Riparazione）

右列（付款与消息）：
- 付款卡（Pagamento）
- 消息卡（Messaggi）

底部：
- 时间线（Cronologia）

### 1.3 待办提示 Banner（按规则出现）
- 待确认超时：`status=waiting_approval` 且 `now - approval_sent_at > 48h`
  - 文案：`Attenzione: conferma in ritardo`
- 超期未取件：`status=waiting_pickup` 且 `now - completed_at > 5 giorni`
  - 文案：`Attenzione: ritiro in ritardo`
- 未结清：`isPaid=false` 且 `saldo>0`
  - 文案：`Da pagare: €{saldo}`

---

## 2. 动作区统一约定（用于设计主按钮）

建议在顶部摘要条右侧放“主动作区”，并在维修卡/付款卡中放次级动作。

### 2.1 主动作优先级（从左到右）
1) 当前状态的“下一步推进”（例如：标记完工、完成工单）
2) 报价/确认相关动作（只在留机维修）
3) 高风险动作（取消工单）

### 2.2 高风险动作统一规则
以下操作必须二次确认弹窗：
- 取消工单（Annulla ordine）
- 回写报价拒绝（Rifiutato）→ 自动取消

---

## 3. 状态稿矩阵（强制输出的 Figma Frame 清单）

> 你可以按以下命名方式创建 Frame：  
> `OrderDetail/{orderType}/{status}`  
> 例：`OrderDetail/dropoff_repair/waiting_approval`

### 3.1 quick_repair（快速维修）

#### A) 状态：new
Frame：`OrderDetail/quick_repair/new`

页面重点：
- 员工刚建单，信息可能不完整
- 强调“开始维修”或“进入维修中”

主动作（Top）：
- `Inizia riparazione`（transition → repairing）
- `Annulla ordine`（→ cancelled）

可编辑：
- 问题描述、技师、tag、保修、金额（取决于权限：前台/店长）

校验提示：
- 若点击开始维修但未填问题：`Descrivi il problema`

---

#### B) 状态：repairing
Frame：`OrderDetail/quick_repair/repairing`

主动作（Top）：
- `Segna come pronto`（transition → waiting_pickup；写入 completed_at）

次级动作：
- 维修卡：可追加维修备注（note / diagnosis_result 可不用）
- 付款卡：可更新订金/总价

---

#### C) 状态：waiting_pickup
Frame：`OrderDetail/quick_repair/waiting_pickup`

主动作（Top）：
- `Consegna al cliente`（写 delivered_at）
- `Completa ordine`（transition → completed；默认要求 delivered_at + is_paid=true）

次级动作：
- 消息卡：默认突出 `ready_pickup` 模板（可取件通知）
- 付款卡：`Aggiorna pagamento`

校验（Completa）：
- 若未交付：`Prima registra la consegna al cliente`
- 若未结清：`Pagamento non completato`（仅 manager 可 override）

---

#### D) 状态：completed（只读态）
Frame：`OrderDetail/quick_repair/completed`

主动作（Top）：
- 无主动作（或仅 `Invia messaggio`）

限制：
- 关键字段只读（问题/金额/状态/客户/设备）
- 允许：追加备注（写入时间线），或 manager 特殊入口修正（不在常规 UI）

---

#### E) 状态：cancelled（只读态）
Frame：`OrderDetail/quick_repair/cancelled`

显示重点：
- 明确显示取消原因 `Motivo annullamento`
- 保留所有历史：消息、时间线、已发生事件

---

### 3.2 dropoff_repair（留机维修）

#### A) 状态：new
Frame：`OrderDetail/dropoff_repair/new`

主动作（Top）：
- `Avvia diagnosi`（transition → diagnosing）
- `Annulla ordine`（→ cancelled）

说明：
- 留机维修从一开始就强调“进入检测”

---

#### B) 状态：diagnosing
Frame：`OrderDetail/dropoff_repair/diagnosing`

页面重点：
- 维修卡中出现“检测结论”输入区
- 录入报价的入口明显

主动作（Top）：
- `Invia a conferma`（进入 waiting_approval）

次级动作：
- `Inserisci preventivo`（填写 quotation_amount）
- 维修备注（diagnosis_result）

校验（进入 waiting_approval 前）：
- 必须填写 `quotation_amount`
  - 提示：`Inserisci il totale del preventivo`

---

#### C) 状态：waiting_approval（重点状态）
Frame：`OrderDetail/dropoff_repair/waiting_approval`

页面重点：
- 顶部 Banner：若超 48h，显示 `Attenzione: conferma in ritardo`
- 在维修卡/消息卡中突出“报价发送与确认回写”

主动作（Top）：
- `Invia preventivo`（生成 message_log + wa.me 链接）
- `Registra conferma cliente`（打开确认弹窗：Confermato / Rifiutato / In attesa）

次级动作：
- 消息卡中置顶显示最近一次报价 message_log
- 付款卡仍可显示金额，但可编辑权限受控

关键规则：
- 回写 `Confermato` → approvalStatus=approved（仍需员工/系统再推进到 repairing，或自动弹出“开始维修”）
- 回写 `Rifiutato` → **自动 cancelled**（并写 cancelReason=客户拒绝报价）
- 回写 `In attesa` → 仅记录，不改变状态

弹窗（必须出状态稿）：
- `ApprovalModal/default`
- `ApprovalModal/rejected_confirm`（二次确认）

---

#### D) 状态：repairing
Frame：`OrderDetail/dropoff_repair/repairing`

主动作（Top）：
- `Segna come pronto`（→ waiting_pickup；写 completed_at）

次级动作：
- 可设置 pauseReason（例如缺件等待）：`Metti in pausa`（MVP 先用文本原因）
- 消息卡可使用 `parts_arrived` 模板（人工触发）

---

#### E) 状态：waiting_pickup
Frame：`OrderDetail/dropoff_repair/waiting_pickup`

主动作（Top）：
- `Consegna al cliente`
- `Completa ordine`（默认要求 delivered + is_paid=true；manager 可 override）

页面重点：
- 若超期未取件，显示红/橙色 Banner：`Attenzione: ritiro in ritardo`
- 消息卡突出 `pickup_reminder` 与 `ready_pickup`

---

#### F) 状态：completed（只读态）
Frame：`OrderDetail/dropoff_repair/completed`

同 quick_repair/completed：
- 关键字段只读
- 保留时间线与消息记录

---

#### G) 状态：cancelled（只读态）
Frame：`OrderDetail/dropoff_repair/cancelled`

显示重点：
- 显示取消原因（客户拒绝报价 / 其他）
- 若是拒绝报价取消，时间线应包含：
  - `Preventivo inviato`
  - `Conferma cliente: No (ordine annullato)`

---

## 4. 组件级标注（给设计师的“必须画清楚的组件状态”）

### 4.1 OrderPrimaryActions（主动作区）
至少出 4 个组件状态：
- `waiting_approval`（显示：Invia preventivo + Registra conferma）
- `waiting_pickup`（显示：Consegna + Completa）
- `completed`（无主动作/只读）
- `cancelled`（无主动作/只读）

### 4.2 MessageCard（消息卡）
至少出 3 个状态：
- 未生成消息（空状态：提示选择模板）
- 已生成 wa.me 链接（显示预览 + 打开按钮）
- 已标记发送（状态徽标变化 + 记录入列表）

### 4.3 PaymentCard（付款卡）
至少出 3 个状态：
- 余额为 0（已结清）
- 余额 > 0（未结清）
- manager override（未结清但允许完成的提示样式）

---

## 5. 设计验收清单（快速自检）

设计稿完成后，用这 8 条自检：
1) 详情页在每个状态下，用户都能“一眼看到下一步按钮”  
2) 留机维修的报价发送与确认回写不会被隐藏  
3) `rejected` 的二次确认弹窗明确说明“会自动取消工单”  
4) `completed/cancelled` 的只读态不会误导用户还能编辑  
5) 48h/5天 的超时 Banner 在对应状态可见且醒目  
6) WhatsApp 按钮在顶部且始终可用（但可受同意状态限制提示）  
7) 时间线能解释“发生了什么”，而不是只显示时间  
8) 所有高风险动作都有二次确认  

