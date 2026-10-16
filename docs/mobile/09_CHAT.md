# 09 - Chat

Chat service hiện tại chạy theo mô hình WebSocket + Socket.IO.

## 1. Kết nối

- Gateway route:
  - `/socket.io/**`
  - `/api/chat/**`
- Namespace:
  - `/chat`

## 2. Events

### 2.1 Vào phòng chat

- Event gửi lên: `room.join`
- Payload: `roomId`

### 2.2 Gửi tin nhắn

- Event gửi lên: `message.send`
- Payload:

```json
{
  "roomId": "farm-zone-001",
  "senderId": "user-123",
  "content": "Xin chào kỹ sư"
}
```

### 2.3 Tin nhắn phát ra

- Event nhận về: `message.created`

## 3. Lưu trữ

Tin nhắn được lưu trong MongoDB collection:

- `messages`

## 4. Ghi chú cho mobile

- Đây là realtime channel, không phải REST API.
- Nếu app cần chat, dùng Socket.IO client kết nối namespace `/chat`.
- `senderId` và `roomId` là bắt buộc.

