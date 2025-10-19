# Introspección Manual de Supabase

Este directorio contiene herramientas y resultados de introspección manual de la base de datos Supabase.

## 📋 Propósito

Comparar el **contrato de esquema** (`/contracts/schema.contract.json`) con la **estructura real de Supabase** para detectar discrepancias.

## 🔍 SQLs de Introspección

Ejecuta estos queries en el **SQL Editor de Supabase Dashboard** y guarda los resultados como archivos JSON en este directorio.

### 1. Listar Columnas por Tabla

```sql
-- Guardar resultado como: columns.json
SELECT
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

**Formato esperado del JSON:**
```json
[
  {
    "table_schema": "public",
    "table_name": "users",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "udt_name": "uuid"
  },
  ...
]
```

### 2. Listar Enums y sus Valores

```sql
-- Guardar resultado como: enums.json
SELECT
  t.typname AS enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;
```

**Formato esperado del JSON:**
```json
[
  {
    "enum_name": "user_role",
    "enum_values": ["SUPER_ADMIN", "ADMIN", "USER"]
  },
  ...
]
```

### 3. Listar Triggers por Tabla

```sql
-- Guardar resultado como: triggers.json
SELECT
  event_object_table AS table_name,
  trigger_name,
  event_manipulation AS trigger_event,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

**Formato esperado del JSON:**
```json
[
  {
    "table_name": "companies",
    "trigger_name": "update_companies_updated_at",
    "trigger_event": "UPDATE",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  ...
]
```

### 4. Listar Policies RLS por Tabla

```sql
-- Guardar resultado como: policies.json
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Formato esperado del JSON:**
```json
[
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "SUPER_ADMIN can create users",
    "permissive": "PERMISSIVE",
    "roles": ["{authenticated}"],
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((auth.jwt() ->> 'role'::text) = 'SUPER_ADMIN'::text)"
  },
  ...
]
```

### 5. Verificar RLS Habilitado

```sql
-- Guardar resultado como: rls-status.json
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Formato esperado del JSON:**
```json
[
  {
    "tablename": "users",
    "rls_enabled": true
  },
  ...
]
```

### 6. Listar Foreign Keys

```sql
-- Guardar resultado como: foreign-keys.json
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

**Formato esperado del JSON:**
```json
[
  {
    "table_name": "users",
    "column_name": "company_id",
    "foreign_table_name": "companies",
    "foreign_column_name": "id",
    "update_rule": "NO ACTION",
    "delete_rule": "NO ACTION"
  },
  ...
]
```

### 7. Listar Storage Buckets

```sql
-- Guardar resultado como: buckets.json
SELECT
  id AS bucket_name,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
ORDER BY name;
```

**Formato esperado del JSON:**
```json
[
  {
    "bucket_name": "form-attachments",
    "name": "form-attachments",
    "public": true,
    "file_size_limit": 10485760,
    "allowed_mime_types": ["{image/*,application/pdf}"]
  },
  ...
]
```

## 📁 Estructura de Archivos

Guarda los resultados de los queries en este directorio con los siguientes nombres:

```
/docs/supabase-introspection/
├── README.md                (este archivo)
├── columns.json             (resultado del query 1)
├── enums.json               (resultado del query 2)
├── triggers.json            (resultado del query 3)
├── policies.json            (resultado del query 4)
├── rls-status.json          (resultado del query 5)
├── foreign-keys.json        (resultado del query 6)
└── buckets.json             (resultado del query 7)
```

## 🔄 Proceso de Comparación

Una vez que tengas los archivos JSON con los resultados de Supabase:

1. Ejecuta el script de comparación:
   ```bash
   npm run compare:introspection
   ```

2. Revisa el reporte generado:
   ```
   /docs/contract-vs-introspection-report.json
   ```

3. El reporte mostrará:
   - Columnas en contrato pero no en DB
   - Columnas en DB pero no en contrato
   - Enums con valores diferentes
   - Triggers faltantes o sobrantes
   - Buckets no configurados
   - Diferencias en tipos de datos

## ⚠️ Notas Importantes

- **NO committear datos sensibles**: Los archivos JSON pueden contener información de la estructura de tu DB. Asegúrate de no incluir datos sensibles.
- **Actualización regular**: Ejecuta esta introspección cada vez que cambies el esquema en Supabase.
- **Sincronización bidireccional**:
  - Si agregas columnas en Supabase → actualiza el contrato
  - Si actualizas el contrato → crea migration en Supabase

## 🎯 Flujo Recomendado

1. **Desarrollo local**: Actualiza `/contracts/schema.contract.json`
2. **Validación**: Ejecuta `npm run validate:contract`
3. **Deploy a Supabase**: Crea y aplica migrations
4. **Verificación**: Ejecuta introspección y `npm run compare:introspection`
5. **Ajuste**: Corrige discrepancias encontradas

---

**Última actualización:** 2025-10-09
