# Security controls

- Branding and signature uploads are accepted only as PNG/JPG/JPEG files with matching magic bytes, extension, and MIME type. The maximum size is 1 MiB. SVG is no longer accepted.
- Gmail connect: 10 attempts per IP per 10 minutes; OAuth callback: 20 attempts per IP per 10 minutes; Gmail draft creation: 20 per authenticated user per 10 minutes; invoice exports: 30 per authenticated user per minute.
- Rate limiting is an in-memory best-effort control per Vercel instance with a hard cap of 5,000 buckets. Expired buckets are removed first; when still over cap, entries with the soonest reset time are evicted. It is not globally distributed; a durable shared limiter (for example, Upstash Redis) is needed for strict cross-instance quotas.
- Migration `0007_gmail_token_column_access.sql` must be applied manually. It removes authenticated table access to the encrypted Gmail refresh-token column while preserving safe connection metadata access, and adds same-user `original_invoice_id` enforcement.
