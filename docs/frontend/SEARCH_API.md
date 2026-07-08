# SEARCH API

## Base path

```text
/api/search
```

## Public search

**GET** `/api/search`

### Query parameters

- `q` (required): keyword search
- `type` (optional): document type, ví dụ `ARTICLE`, `DISEASE`
- `page` (optional, default `0`)
- `size` (optional, default `20`, max `100`)
- `sortBy` (optional, default `updatedAt`, allowed: `updatedAt | title`)
- `sortDirection` (optional, default `desc`, allowed: `asc | desc`)

### Example

```http
GET /api/search?q=durian&type=ARTICLE&page=0&size=20&sortBy=updatedAt&sortDirection=desc
```

### Response body

```json
{
  "query": "durian",
  "type": "ARTICLE",
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1,
  "numberOfElements": 1,
  "hasNext": false,
  "hasPrevious": false,
  "sortBy": "updatedAt",
  "sortDirection": "desc",
  "results": [
    {
      "id": "doc-1",
      "type": "ARTICLE",
      "title": "Durian care guide",
      "content": "How to care for durian trees...",
      "updatedAt": "2026-07-08T03:00:00Z"
    }
  ]
}
```

## Internal indexing

**POST** `/api/search/internal/index`

Đây là endpoint nội bộ cho backend service hoặc event consumer.
Không dùng trực tiếp từ UI.

Request body:

```json
{
  "id": "doc-1",
  "type": "ARTICLE",
  "title": "Durian care guide",
  "content": "How to care for durian trees...",
  "metadata": {
    "source": "cms"
  }
}
```

Response:

- `202 Accepted`
- Trả về tài liệu search document được index

## Validation behavior

- `q` là bắt buộc, không được blank
- `q` tối đa 200 ký tự
- `type` tối đa 50 ký tự
- `page` >= 0
- `size` từ 1 đến 100
- `sortBy` chỉ nhận `updatedAt` hoặc `title`
- `sortDirection` chỉ nhận `asc` hoặc `desc`

## Frontend notes

- Search response đã là DTO ổn định, không lộ Elasticsearch entity
- Pagination metadata đã có sẵn trong response
- Nếu dùng filter type, truyền `type` theo đúng enum/type string backend index

