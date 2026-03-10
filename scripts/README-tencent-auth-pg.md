# Tencent PG Auth API deployment notes

## Files
- `scripts/pg-auth-api.mjs`
- `scripts/auth-api.env.example`
- `scripts/yiyu-auth-api.service.example`

## CVM deploy sketch
```bash
sudo mkdir -p /srv/yiyu-auth-api
sudo cp scripts/pg-auth-api.mjs /srv/yiyu-auth-api/
sudo cp scripts/auth-api.env.example /srv/yiyu-auth-api/.env
sudo cp scripts/yiyu-auth-api.service.example /etc/systemd/system/yiyu-auth-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now yiyu-auth-api
sudo systemctl status yiyu-auth-api --no-pager
```

## Nginx
Add:
```nginx
location /api/auth/ {
  proxy_pass http://127.0.0.1:8791/api/auth/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Smoke checks
```bash
curl -sS http://127.0.0.1:8791/healthz
curl -sS http://127.0.0.1:8791/api/auth/bootstrap
```

## Cutover strategy
1. Bring up Tencent auth API beside current auth path
2. Point `/api/auth/*` to Tencent auth API
3. Verify existing accounts
4. Then start removing Supabase auth dependency
