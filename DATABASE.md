### 🗄️ Database Commands

Database operations live inside the `@repo/db` package using Drizzle ORM and Turso (libsql). Use these root shortcuts to manage schemas, migrations, and states:

#### Schema & Migration Lifecycle
```bash
# Generate SQL migration files from your Drizzle schema alterations
pnpm run db:generate

# Push schema modifications directly to the database for quick prototyping
pnpm run db:push

# Execute pending SQL migrations onto your target database instance
pnpm run db:migrate
```

#### Local Data Management & Cleansing
```bash
# Launch a Drizzle Studio web panel to view and alter database tables
pnpm run db:studio

# Drop existing database tables and schema structures completely
pnpm run db:drop

# Delete records across all database tables without dropping the tables
pnpm run db:clear
```

#### Database Testing
```bash
# Run tests only for the database package
pnpm run db:test
```
