# 12 - Mobile Checklist

| API | Implemented | Runtime Verified | Notes |
|---|---:|---:|---|
| `POST /api/auth/register` | Yes | Not run | Farmer / legacy expert registration |
| `POST /api/auth/register/engineer` | Yes | Not run | Multipart engineer application with qualification files |
| `POST /api/auth/otp/resend` | Yes | Not run | Resend registration OTP |
| `POST /api/auth/otp/verify` | Yes | Not run | Verify registration OTP |
| `POST /api/auth/login` | Yes | Not run | Returns JWT + `role` + `accountStatus` |
| `POST /api/auth/refresh` | Yes | Not run | Refresh access token |
| `POST /api/auth/logout` | Yes | Not run | Requires Bearer token |
| `GET /api/auth/admin/engineer-applications` | Yes | Not run | Admin only |
| `GET /api/auth/admin/engineer-applications/{applicationId}` | Yes | Not run | Admin only |
| `POST /api/auth/admin/engineer-applications/{applicationId}/approve` | Yes | Not run | Admin only |
| `POST /api/auth/admin/engineer-applications/{applicationId}/reject` | Yes | Not run | Admin only |
| `GET /api/users/me` | Yes | Yes | Profile endpoint used by mobile after login |
| `PUT /api/users/me` | Yes | Yes | Update profile |
| `POST /api/users/me/avatar` | Yes | Yes | Multipart avatar upload |
| `DELETE /api/users/me/avatar` | Yes | Yes | Remove avatar |
| `GET /api/search` | Yes | Yes | Search + paging + sorting + optional type filter |
| `POST /api/search/internal/index` | Yes | Not run | Internal indexing endpoint |
| `POST /api/v1/notification/otp/generate` | Yes | Not run | OTP generation email flow |
| `POST /api/v1/notification/otp/validate` | Yes | Not run | OTP validation |
| `GET /api/v1/notification/notifications` | Yes | Yes | Inbox with `X-Auth-User-Id` |
| `GET /api/v1/notification/notifications/unread` | Yes | Yes | Unread notifications |
| `PATCH /api/v1/notification/notifications/{id}/read` | Yes | Yes | Mark one as read |
| `PATCH /api/v1/notification/notifications/read-all` | Yes | Yes | Mark all as read |
| `DELETE /api/v1/notification/notifications/{id}` | Yes | Yes | Delete one notification |
| `GET /api/v1/notification/notifications/count` | Yes | Yes | Unread badge count |
| `GET /api/v1/notification/history` | Yes | Not run | Delivery history lookup |
| `GET /api/cultivation-schedules` | Yes | Not run | Cultivation schedule list |
| `GET /api/cultivation-schedules/{id}` | Yes | Not run | Cultivation schedule detail |
| `POST /api/cultivation-schedules` | Yes | Not run | Create cultivation schedule |
| `PATCH /api/cultivation-schedules/{id}/status` | Yes | Not run | Update schedule status |
| `DELETE /api/cultivation-schedules/{id}` | Yes | Not run | Delete schedule |
| `POST /api/v1/predict` | Yes | Not run | Multipart image diagnosis |
| `POST /api/v1/predict/from-s3` | Yes | Not run | Diagnose from S3 object key |
| `POST /api/ai/diagnoses` | Yes | Not run | Deprecated compatibility route |
| `POST /api/v1/chat/ask` | Yes | Not run | AI RAG consultation |
| `GET /api/v1/rag/status` | Yes | Not run | RAG public status |
| `POST /api/v1/rag/reindex` | Yes | Not run | RAG public reindex |
| `POST /api/v1/rag/rebuild` | Yes | Not run | RAG public rebuild |
| `GET /api/v1/rag/documents` | Yes | Not run | RAG document list |
| `DELETE /api/v1/rag/document/{document_id}` | Yes | Not run | RAG document delete |
| `GET /api/v1/rag/statistics` | Yes | Not run | RAG statistics |
| `GET /admin/rag/status` | Yes | Not run | Admin only |
| `POST /admin/rag/reindex` | Yes | Not run | Admin only |
| `POST /admin/rag/reload` | Yes | Not run | Admin only |
| `GET /admin/rag/documents` | Yes | Not run | Admin only |
| `DELETE /admin/rag/cache` | Yes | Not run | Admin only |
| `GET /admin/rag/statistics` | Yes | Not run | Admin only |

## Legend

- **Implemented**: present in source and documented
- **Runtime Verified**: covered by controller/unit tests in the current audit

