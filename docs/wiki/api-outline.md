# 接口契约纲要（草案）

本文件用于对齐前后端的资源边界与核心字段，不绑定具体框架与路由实现方式。

## 1. 约定

- 所有业务读写必须带门店上下文（store_id），并在服务端强校验
- 时间均以门店时区（Europe/Rome）计算业务日；存储建议使用 UTC 并带时区转换
- 金额字段统一用 EUR，前端展示使用本地化格式

## 2. Auth

- POST /auth/login
- POST /auth/logout
- GET /me

## 3. Stores

- GET /stores
- POST /stores/select
- PATCH /stores/{storeId}/params

params（MVP）：
- approval_overdue_hours（默认 48）
- pickup_overdue_days（默认 5）

## 4. Customers

- GET /customers?q=&page=
- GET /customers/{id}
- POST /customers
- PATCH /customers/{id}
- DELETE /customers/{id}（软删除）

搜索字段建议：
- phone（raw/e164）、name

## 5. Devices

- POST /customers/{customerId}/devices
- PATCH /devices/{id}
- DELETE /devices/{id}（软删除）

## 6. Orders

- GET /orders?q=&status=&orderType=&technician=&paid=&approvalOverdue=&pickupOverdue=&dateFrom=&dateTo=
- GET /orders/{id}
- POST /orders
- PATCH /orders/{id}
- POST /orders/{id}/transition
- DELETE /orders/{id}（软删除）

transition 请求体建议：
- from_status
- to_status
- note（可选）

## 7. Approval / Payment / Delivery（可按资源拆或合并进 orders）

- POST /orders/{id}/approval (pending/approved/rejected)
- PATCH /orders/{id}/payment (quotation/deposit/is_paid/payment_note)
- POST /orders/{id}/deliver (delivered_at)

## 8. Templates

- GET /templates?type=&language=
- POST /templates
- PATCH /templates/{id}
- DELETE /templates/{id}

## 9. Message logs

- POST /orders/{id}/messages/draft (template_code)
- POST /message-logs/{id}/opened
- POST /message-logs/{id}/sent
- GET /message-logs?dateFrom=&dateTo=&template=&operator=&orderPublicNo=

## 10. Events（Timeline）

- GET /orders/{id}/events

## 11. Dashboard

- GET /dashboard/summary
- GET /dashboard/todos?type=approvalOverdue|pickupOverdue|paused|todayCreated|todayCompleted

## 12. Import（Excel）

- POST /import/upload
- GET /import/{jobId}/preview
- POST /import/{jobId}/run
- GET /import/{jobId}/report
