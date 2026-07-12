# 07 - Search

Gateway route:

- `/api/search/**`

## 1. Search API

`GET /api/search?q=durian`

Query params:

- `q` bắt buộc, không được rỗng
- `type` optional
- `page` default `0`
- `size` default `20`
- `sortBy` default `updatedAt`
- `sortDirection` default `desc`

## 2. Ví dụ

### 2.1 Tìm tất cả

`GET /api/search?q=leaf`

### 2.2 Lọc theo loại

`GET /api/search?q=durian&type=ARTICLE`

### 2.3 Phân trang

`GET /api/search?q=durian&page=0&size=10`

### 2.4 Sắp xếp

`GET /api/search?q=durian&sortBy=title&sortDirection=asc`

## 3. Response

`SearchResponse` gồm:

- `query`
- `type`
- `page`
- `size`
- `totalElements`
- `totalPages`
- `numberOfElements`
- `hasNext`
- `hasPrevious`
- `sortBy`
- `sortDirection`
- `results[]`

Mỗi item trong `results[]`:

- `id`
- `type`
- `title`
- `content`
- `updatedAt`

## 4. Internal indexing

`POST /api/search/internal/index`

Endpoint này là internal, backend service dùng để đẩy dữ liệu vào search index.

## 5. Ghi chú cho mobile

- Search đã có paging + sorting sẵn.
- UI chỉ cần đọc metadata trong response để render infinite scroll / pagination.

