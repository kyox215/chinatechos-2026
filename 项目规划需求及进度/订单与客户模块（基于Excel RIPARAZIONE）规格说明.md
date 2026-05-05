# 订单与客户模块（基于Excel RIPARAZIONE）规格说明

数据来源文件：
- [ChinaTech_RIPARAZIONE.xlsx](file:///Users/kyox215/Desktop/Chinatech%E7%BD%91%E7%AB%99%E6%96%B0%E9%A1%B9%E7%9B%AE02-05-2026/ChinaTech_RIPARAZIONE.xlsx)
- Sheet：RIPARAZIONE

目标：
- 复刻并升级你现有 Excel 订单台账的录入与查询体验
- 将“订单（维修工单）”与“客户（CRM）”强关联
- 全部以网页管理后台形式呈现，优先适配意大利门店使用习惯（IT 语言、EUR、dd/mm/yyyy、WhatsApp触达）

---

## 1. Excel字段映射（A-P）

| Excel列 | 标题 | 建议系统字段 | 类型 | 说明 |
|---|---|---|---|---|
| A | STATO | order.status_raw / order.status | string / enum | 原始值示例：FATTO、作废。系统内建议拆为标准状态枚举 + 保留原始值 |
| B | NOME | customer.name | string | 客户姓名（现有数据中有空值，需允许为空或用“未知客户”占位） |
| C | OGGETTO | order.intake_mode | enum | 示例：LASCIATTO / NON LASCIATTO / RIPARAZIONE VELOCE；建议作为“到店方式/服务类型” |
| D | DA RIPARARE | order.category | string | 示例多为“PEZZI DI RICAMBIO”；可保留为类别（维修/配件/其他） |
| E | NUMERO TELEFONO | customer.phone_e164 / customer.phone_raw | string | 主键级字段，用于合并客户与WhatsApp通知 |
| F | PREZZO TOTALE | order.total_amount | money | 维修总价（EUR） |
| G | ACCONTO | order.deposit_amount | money | 订金/预收款（EUR） |
| H | MARCA | device.brand | string | 设备品牌 |
| I | MODELLO | device.model | string | 设备型号 |
| J | PROBLEMA | order.issue_description | text | 故障/需求描述（混合意大利语与中文也要兼容） |
| K | - | order.internal_tag | string | 现有数据出现 MB/NB/37/ALIEXPRESS/UTO 等；建议作为“内部标记/来源/等级/供应商”可自定义 |
| L | GARANZIA | order.warranty_text / order.warranty_months | string / number | 示例：3 MESI、6 MESI、NO GARANZIA、USATO GARANZIA |
| M | DATA RITIRO | order.pickup_date | date | Excel为序列值；系统内用日期展示与筛选 |
| N | DATA AGGIUNTA | order.created_date | date | Excel为序列值；系统内作为创建日期 |
| O | TECNICO | order.technician_name / staff_id | string / fk | 技师；后续可做员工表并关联 |
| P | S/N o IMEI | device.serial_or_imei | string | IMEI/序列号 |

---

## 2. 系统数据结构（最小可用）

### 2.1 客户（Customer）

- id
- name
- phone_raw
- phone_e164（用于 WhatsApp link 与未来 API）
- created_at
- last_seen_at（由订单更新）
- consent_required_notify（必要通知同意，默认 true）
- consent_marketing（营销同意，默认 false）

客户去重策略（MVP）：
- phone_e164 相同视为同一客户；无手机号的记录先不自动合并

### 2.2 设备（Device）

- id
- customer_id
- brand
- model
- serial_or_imei
- created_at

设备去重策略（可选）：
- customer_id + serial_or_imei 相同则合并

### 2.3 维修订单/工单（Order）

- id（系统内部）
- public_no（对客户展示的工单号，短号）
- status（enum：draft / diagnosing / waiting_approval / repairing / ready / done / void）
- status_raw（保留 Excel 的 A 列原始值）
- intake_mode（LASCIATTO/NON LASCIATTO/RIPARAZIONE VELOCE）
- category（D 列）
- issue_description（J 列）
- internal_tag（K 列）
- warranty_text（L 列）
- total_amount（F 列）
- deposit_amount（G 列）
- balance_amount（计算字段：total - deposit）
- pickup_date（M 列）
- created_date（N 列）
- technician_name（O 列）
- customer_id
- device_id
- created_at / updated_at

---

## 3. 页面与交互（网页后台）

### 3.1 订单列表（Ordini / Riparazioni）

目标：替代 Excel 筛选与查找，做到“秒级定位订单”。

列表列建议（默认）：
- Stato（徽标）
- Cliente（姓名 + 电话）
- Marca / Modello
- Problema（截断展示，悬浮显示全文）
- Totale / Acconto / Da pagare
- Tecnico
- Data aggiunta / Data ritiro

筛选与搜索：
- 全局搜索（按：电话、姓名、IMEI、型号、问题关键词、技师）
- 筛选：Stato、Tecnico、Marca、Intake mode、Garanzia
- 日期范围：Data aggiunta、Data ritiro

快捷动作：
- WhatsApp 通知（下拉选择模板）
- 标记状态（ready/done/void）
- 打印受理单/交付单（扩展）

### 3.2 订单详情（Ordine）

信息分组（建议以卡片/分区呈现）：
- Cliente：姓名/电话/同意状态/历史订单数
- Dispositivo：品牌/型号/IMEI
- Riparazione：问题描述、内部标记、服务类型、保修
- Pagamenti：总价、订金、尾款、支付状态（可扩展）
- Date：创建/预计/取件
- Operatore：技师
- Timeline：状态变更 + 消息发送记录（借鉴 SaleSmartly）

关键按钮：
- Invia WhatsApp（主按钮）
- Imposta come “Pronto per ritiro”
- Imposta come “Completato”

### 3.3 客户列表（Clienti）

列表列建议：
- Cliente（姓名/电话）
- Ultimo ordine（日期）
- Ordini totali（数量）
- Spesa totale（可选）
- Stato attuale（是否有“待取件/未结清”）

客户详情：
- 基本信息 + 同意状态
- 设备列表
- 订单时间线（按时间倒序）
- 一键 WhatsApp（默认打开对话并预填问候/工单号）

---

## 4. WhatsApp 通知（MVP 实现方式）

### 4.1 推荐方式（先快后强）

阶段1（MVP）：
- 使用 wa.me 深链打开 WhatsApp 并预填文案
- 优点：零成本、无模板限制、上线快
- 限制：需要人工点击发送；无法后台直接“自动发送”

阶段2（增强）：
- 接入 WhatsApp Business API，实现自动发送与模板化（需要合规与成本预算）

### 4.2 模板（意大利语示例）

完工取件（Pronto per ritiro）：
- Ciao {nome}, la tua riparazione ({marca} {modello}) è pronta.
- Puoi ritirarla oggi in {indirizzo}. Orari: {orari}.
- Totale: €{totale}, Acconto: €{acconto}, Da pagare: €{saldo}.
- Numero ordine: {public_no}

报价待确认（Preventivo）：
- Ciao {nome}, abbiamo completato la diagnosi per {marca} {modello}.
- Il preventivo è €{totale}. Vuoi confermare la riparazione?
- Rispondi “SI” per confermare o “NO” per annullare. Numero ordine: {public_no}

---

## 5. 设计语言（方向建议）

定位：意大利本地门店“officina/实验室”气质，专业、可靠、偏工业但精致。

- 色彩：石墨黑/暖白为底，强调色用“维修警示橙”或“意式赛车红”做关键CTA
- 字体：标题用有性格的衬线（偏意式编辑感），正文用清晰的无衬线（后台高可读）
- 组件：高密度表格 + 强搜索；状态徽标清晰；弹窗/抽屉用于快速操作
- 交互：键盘友好（快速搜索、回车新建、方向键导航可选）

