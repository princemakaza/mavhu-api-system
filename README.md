# MAvHU API System

REST API for the MAvHU platform, built with **NestJS + TypeScript**, backed by **PostgreSQL**,
documented with **Swagger/OpenAPI**.

The database (schema, tables, triggers, migrations) is owned by the sibling
[`mavhu_database_manager`](../mavhu_database_manager) project. This API only ever reads/writes
through that schema — it never creates or alters tables (`synchronize: false` in TypeORM).

---

## Quickstart (clone → run with the full local dataset)

These steps take a fresh machine from zero to a running API loaded with the same data as the
original developer's local Postgres. Run them in order.

### 1. Install prerequisites

- **Node.js 20+** and **npm**
- **PostgreSQL 15+** (installed and running locally on port `5432`)

macOS:
```bash
brew install node postgresql@18
brew services start postgresql@18
```

Ubuntu/Debian:
```bash
sudo apt install nodejs npm postgresql
sudo systemctl start postgresql
```

Make sure a superuser role named `postgres` exists (used by the setup scripts):
```bash
psql postgres -c "CREATE ROLE postgres LOGIN SUPERUSER CREATEDB;" 2>/dev/null || true
```

### 2. Clone the repo

The API and the database manager live side-by-side. Clone them into the same parent folder:

```
MAvHU-Projects/
├── mavhu-api-system/            ← this repo
└── mavhu_database_manager/      ← schema, migrations, seed data dump
```

### 3. Create the database, schema, and tables

From `mavhu_database_manager/`:

```bash
psql -h localhost -p 5432 -U postgres -d postgres -f init.sql
sh scripts/run_models.sh
DB_USER=postgres bash scripts/run_migrations.sh
```

This creates the `mavhu_db` database, the `mavhu_admin` role (password `MAvHU123!`), the `mavhu`
schema, all 13 tables/triggers, and applies pending migrations.

### 4. Load the full local dataset

The maintainer's local data is checked into `mavhu_database_manager/dumps/mavhu_db.sql`
(data-only pg_dump). Restore it into your fresh database:

```bash
psql -h localhost -p 5432 -U mavhu_admin -d mavhu_db \
     -f ../mavhu_database_manager/dumps/mavhu_db.sql
```

> **If the dump file is missing** (fresh clone before the maintainer has committed one), fall
> back to the built-in seed script instead — it recreates the baseline dataset (Mavhu Africa,
> CBZ, Stanbic, FBC, 4 agribusinesses, 10 users, including the 3 Mavhu admins):
>
> ```bash
> npm install
> cp .env.example .env
> npm run seed
> ```

### 5. Configure and start the API

```bash
npm install
cp .env.example .env       # defaults already match init.sql
npm run start:dev
```

- API base URL: `http://localhost:3000/api/v1`
- Swagger docs:  `http://localhost:3000/api/docs`

---

## Keeping the committed dump in sync with your local database

Whenever you want teammates to pick up your latest local data, regenerate the dump and commit it.

**Export your current local database (run from anywhere):**
```bash
pg_dump -h localhost -p 5432 -U mavhu_admin \
        --data-only \
        --column-inserts \
        --schema=mavhu \
        --no-owner --no-privileges \
        -d mavhu_db \
        -f "../mavhu_database_manager/dumps/mavhu_db.sql"
```

Then commit `mavhu_database_manager/dumps/mavhu_db.sql`. Anyone who pulls and re-runs step 4
above will get exactly your data.

> **Schema changes?** If you added/altered tables locally, add a new numbered file under
> `mavhu_database_manager/migrations/` (e.g. `003_your_change.sql`) so `run_migrations.sh` picks
> it up. Do **not** rely on the data dump to carry schema changes — it's `--data-only`.

**Full dump (schema + data) alternative** — heavier but self-contained:
```bash
pg_dump -h localhost -U mavhu_admin -d mavhu_db --no-owner --no-privileges \
        -f "../mavhu_database_manager/dumps/mavhu_db_full.sql"
```
Restore into a freshly created empty `mavhu_db` (step 3's `init.sql` only, skip
`run_models.sh`/`run_migrations.sh`):
```bash
psql -h localhost -U mavhu_admin -d mavhu_db -f ../mavhu_database_manager/dumps/mavhu_db_full.sql
```

---

## Architecture

- **Modules**: one NestJS module per database table under [`src/modules`](src/modules), each with
  its own `entity`, `dto` (create/update), `service`, `controller`, and `module` — 13 modules total,
  matching the 13 tables in `mavhu_database_manager/models`.
- **Shared CRUD base**: every service extends [`CrudService`](src/common/crud/crud.service.ts), so
  all 13 resources expose the exact same 9 operations with identical semantics. Tables with an
  `is_deleted` column (`banks`, `customers`, `users`) soft-delete and support restore; every other
  table hard-deletes and its `restore` endpoint returns `400 Bad Request`.
- **Validation**: `class-validator` DTOs, enforced globally via a `ValidationPipe`
  (whitelist + forbid unknown properties).
- **Docs**: Swagger UI at `/api/docs`, generated from the same DTO/entity decorators used for
  validation and serialization.
- **Security**: `users.password` is hashed with `bcrypt` before it ever reaches the database and is
  stripped from every API response (`class-transformer` `@Exclude` + a global
  `ClassSerializerInterceptor`).

### The 9 common endpoints (per resource, e.g. `/api/v1/banks`)

| Method | Path            | Operation                                   |
|--------|-----------------|----------------------------------------------|
| POST   | `/`             | Create                                        |
| GET    | `/`             | List (paginated, sortable, filterable)        |
| GET    | `/count`        | Count                                         |
| GET    | `/:id`          | Get by id                                     |
| GET    | `/:id/exists`   | Check existence                               |
| PATCH  | `/:id`          | Partial update                                |
| PUT    | `/:id`          | Full replace                                  |
| PATCH  | `/:id/restore`  | Restore a soft-deleted record                 |
| DELETE | `/:id`          | Delete (soft delete where supported)          |

### Modules / resources

`banks`, `customers`, `bank-customers`, `apis`, `estates`, `roles`, `role-permissions`, `users`,
`user-roles`, `emission-factors`, `satellite-ndvi-co2`, `crop-cycles`, `emissions-accounting`.

---

## Environment variables

See [`.env.example`](.env.example): `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD`, `DB_SCHEMA`, `DB_LOGGING`, `JWT_SECRET`, `JWT_EXPIRES_IN`.

Defaults line up with `mavhu_database_manager/init.sql` — no changes needed for local dev.

## Scripts

| Command              | Description                                          |
|-----------------------|------------------------------------------------------|
| `npm run start:dev`   | Start with hot reload                                |
| `npm run build`       | Compile to `dist/`                                   |
| `npm run start:prod`  | Run the compiled build                               |
| `npm run seed`        | Idempotent seed of baseline records (fallback data)  |
| `npm run lint`        | Lint & auto-fix                                      |
| `npm test`            | Run unit tests                                       |

## Troubleshooting

- **`psql: FATAL: role "postgres" does not exist`** — create it: `createuser -s postgres`.
- **`FATAL: password authentication failed for user "mavhu_admin"`** — re-run `init.sql` as the
  `postgres` superuser; the password is set to `MAvHU123!`.
- **`relation "mavhu.xyz" does not exist`** — `run_models.sh` didn't complete. Drop and recreate:
  `psql -U postgres -c "DROP DATABASE mavhu_db;"` then repeat step 3.
- **Restoring the dump fails on duplicate keys** — you already have data. Either drop and recreate
  the database, or truncate the affected tables before re-running the restore.
