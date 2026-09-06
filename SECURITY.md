# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| `master` (production) | ✅ |
| other branches | ❌ |

## Reporting a Vulnerability

Please report security issues privately:

- Email: sergei@serpmonn.ru
- Or open a [private GitHub security advisory](https://github.com/serpmonn/Serpmonn/security/advisories/new)

Do **not** open a public issue for vulnerabilities that could lead to account takeover, data exposure, or server compromise.

We aim to acknowledge reports within 72 hours and share a remediation plan when confirmed.

## Secrets and credentials

Never commit:

- `backend/.env` and other `*.env`
- `google-services.json` / `google-services*.json` (use `google-services.json.example`)
- Firebase / GCP service account JSON under `backend/secrets/`
- Private keys, tokens, and APK signing credentials

If a secret is leaked: rotate it in the provider console first, then remove it from the repository.
