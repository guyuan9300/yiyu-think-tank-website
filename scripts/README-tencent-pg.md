# Tencent PostgreSQL 初始化说明（yiyu-prod-pg）

## 1) 在 CVM 上执行初始化 SQL

> 你的数据库是内网地址 `172.16.0.10:5432`，需在同 VPC 内机器（通常 CVM）执行。

```bash
# 安装 psql（Ubuntu）
sudo apt-get update && sudo apt-get install -y postgresql-client

# 执行初始化（默认库 postgres）
PGPASSWORD='你的密码' psql \
  -h 172.16.0.10 -p 5432 -U yiyu_admin -d postgres \
  -f scripts/init-tencent-pg.sql
```

如果你希望独立业务库（推荐）：

```sql
CREATE DATABASE yiyu_prod;
```

然后改为 `-d yiyu_prod` 再执行一遍 `init-tencent-pg.sql`。

## 2) 完成后回传给我

- 数据库名（`postgres` 或 `yiyu_prod`）
- 执行 SQL 的终端输出（成功/报错）
- 若报错，前后 30 行日志

## 3) 我收到后会继续

1. 接入层改造（IP 版优先）
2. 数据迁移脚本（本地存储 -> PG）
3. 联调验证（读写、计数、基础后台）
4. 同步 GitHub 备份版代码
