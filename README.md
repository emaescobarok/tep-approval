# Tep Agency — Plataforma de aprobación de contenido

App full-stack para que **Tep Agency** centralice la planificación mensual de
contenido y sus clientes aprueben o comenten cada pieza desde un único lugar.

- **Agencia:** sube piezas por cliente/mes, ve la bandeja de correcciones
  consolidada y el % de aprobación de cada cliente.
- **Cliente:** ve solo su contenido del mes, aprueba o pide cambios en cada pieza.

## Stack

- **Next.js 15** (App Router, Server Components, Server Actions) + TypeScript
- **Tailwind v4** + shadcn/ui (sistema visual del template v0: verde + blanco)
- **Supabase**: Postgres + Auth (email/password) + Storage
- **Resend** para email (notificaciones desacopladas, listas para sumar Slack/WhatsApp)

## Aislamiento entre clientes

El aislamiento **vive en la base de datos** vía Row Level Security (`0002_rls.sql`),
no solo en el frontend. Un usuario `client` no puede leer ni escribir datos de
otro cliente bajo ninguna circunstancia. El frontend confía en la RLS.

## Puesta en marcha

### 1. Dependencias
```bash
npm install
```

### 2. Proyecto Supabase
Creá un proyecto en [supabase.com](https://supabase.com) y corré las migraciones
en orden (SQL Editor o `supabase db push`):
```
supabase/migrations/0001_schema.sql
supabase/migrations/0002_rls.sql
supabase/migrations/0003_triggers_notifications.sql
supabase/migrations/0004_storage.sql
```
(Opcional) Cargá datos demo con `supabase/seed.sql`.

### 3. Variables de entorno
```bash
cp .env.local.example .env.local
```
Completá `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, etc.

### 4. Primer usuario agencia
Creá un usuario en **Supabase > Authentication > Users** y luego su profile:
```sql
insert into profiles (id, role, full_name)
values ('<uuid-del-usuario>', 'agency', 'Equipo Tep');
```

### 5. Correr
```bash
npm run dev
```
Entrá a `http://localhost:3000` → login → dashboard de agencia.
Desde ahí invitás usuarios cliente (reciben email para definir su contraseña).

## Notificaciones

Modelo **desacoplado en 3 capas**:
1. **Triggers** en Postgres (`0003`) insertan filas en `notifications` cuando el
   cliente comenta/aprueba/pide cambios o la agencia resuelve una corrección.
2. **Worker** (`/api/notifications/dispatch`) lee la cola y envía por los canales
   activos. Protegido con `CRON_SECRET`. Ejecutar por cron:
   ```bash
   curl -X POST https://TU-APP/api/notifications/dispatch -H "x-cron-secret: $CRON_SECRET"
   ```
   (`vercel.json` ya define un cron cada 5 min.)
3. **Adapters de canal** (`src/lib/notifications/providers/`): hoy `email.ts`
   (Resend). Para sumar Slack/WhatsApp, creá otro adapter que implemente
   `NotificationChannel` y agregalo al array `channels` en `index.ts`.

## Estructura

```
src/
  app/
    login/ forgot-password/ reset-password/ auth/callback/   # auth
    client/      calendario, pieza/[postId]                  # vista cliente
    agency/      dashboard, clientes/[clientId], correcciones # vista agencia
    api/notifications/dispatch                                # worker
  components/    ui/, post-card, media-thumb, topbar, ...
  lib/           supabase/, notifications/, auth, types, media
supabase/
  migrations/    0001..0004 (schema, RLS, triggers, storage)
  seed.sql
```

## Reglas de negocio clave

- `copy` **obligatorio** para `carrusel` y `texto` (CHECK en DB + validación UI).
- **Una sola plataforma por pieza** (enum). Multiplataforma = piezas separadas.
- Estados: `pendiente` (gris) · `aprobado` (verde) · `cambios_pedidos` (ámbar).
- Pedir cambios → `cambios_pedidos` + notifica agencia.
  Resolver → vuelve a `pendiente` + notifica cliente.
```
