# DurianCare Profile API

Base path: `/api/users`

Authentication: Bearer JWT required for every endpoint.

## Endpoints

### GET `/api/users/me`

Returns the authenticated user's profile.

Response fields:
- `userId`
- `email`
- `role`
- `accountStatus`
- `fullName`
- `phoneNumber`
- `dateOfBirth`
- `gender`
- `address`
- `provinceCity`
- `bio`
- `avatarUrl`
- `createdAt`
- `updatedAt`

### PUT `/api/users/me`

Updates editable profile fields.

Request body:
```json
{
  "fullName": "Nguyen Van A",
  "phoneNumber": "0901234567",
  "dateOfBirth": "1995-05-20",
  "gender": "MALE",
  "address": "Ward 1, District 1",
  "provinceCity": "Can Tho",
  "bio": "Durian farmer"
}
```

Rules:
- `fullName` is required
- `phoneNumber` is optional
- `dateOfBirth` must be in the past
- `bio` max length is 500
- `address` max length is 500
- `provinceCity` max length is 150

Disallowed fields:
- `email`
- `role`
- `password`
- `accountStatus`

### POST `/api/users/me/avatar`

Uploads a new avatar image using the existing S3 infrastructure.

Multipart form-data:
- `avatar`: file

Validation:
- Allowed MIME types: `image/jpeg`, `image/png`
- Max size: configured by `MAX_IMAGE_SIZE_BYTES`

Response:
```json
{
  "avatarUrl": "https://bucket.s3.ap-southeast-1.amazonaws.com/avatars/..."
}
```

### DELETE `/api/users/me/avatar`

Removes the avatar reference and attempts to delete the object from S3.

Response:
```json
{
  "message": "Avatar removed."
}
```

## Error Codes

- `400 Bad Request`
  - Validation failure
  - Invalid avatar type
  - Avatar too large
- `401 Unauthorized`
  - Missing or invalid JWT
- `404 Not Found`
  - User or profile not found
- `503 Service Unavailable`
  - S3 avatar storage is unavailable

## Frontend Integration Notes

- Attach the bearer token from the login response to every profile request.
- Use `GET /api/users/me` after login to load profile state.
- Use `PUT /api/users/me` only for editable fields.
- Use `POST /api/users/me/avatar` with multipart upload, not base64.
- Keep the returned `avatarUrl` in UI state and persist it after refresh.
