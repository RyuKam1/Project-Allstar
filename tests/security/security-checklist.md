# Security Regression Checklist

## Authz
- Unauthenticated user cannot access `/admin`.
- Non-admin authenticated user is redirected from `/admin` to `/unauthorized`.
- `DELETE /api/admin/users` returns `401` when logged out and `403` for non-admin.
- `PATCH /api/admin/claims/:id` returns `401` when logged out and `403` for non-admin.

## XSS
- Create venue/community name containing script payload and verify map popup renders plain text.
- Create review/comment containing HTML tags and verify tags render as text, not executable markup.

## Abuse Controls
- Burst requests against admin APIs and verify `429` after threshold.
- Verify `Retry-After` header exists on `429`.

## Auditability
- Successful admin mutation writes a row in `admin_audit_logs`.
- Non-admin user cannot read or write `admin_audit_logs`.

## RLS
- User can only update their own profile.
- User cannot update another user profile role.
- Venue owners can update their venues; non-owners cannot.
- Claim requester can create own claim request; cannot update status.
- Only admins can resolve claim requests.
