# Guía del Contrato de Esquema

## 📖 ¿Qué es el Contrato de Esquema?

El **Contrato de Esquema** (`/contracts/schema.contract.json`) es la **fuente de verdad única** que define:

- Todas las tablas y columnas de la base de datos
- Tipos de datos, nullability y defaults
- Enums y sus valores permitidos
- Storage buckets y sus configuraciones
- Mapeos entre nombres de UI y nombres de DB

**Beneficios:**
- ✅ Detecta discrepancias entre código y DB antes de runtime
- ✅ Documenta la estructura de datos de forma centralizada
- ✅ Facilita onboarding de nuevos desarrolladores
- ✅ Previene bugs por columnas/tipos incorrectos
- ✅ Hace explícitos los mapeos UI ↔ DB

---

## 🏗️ Estructura del Contrato

### 1. Metadatos

```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "version": "1.0.0",
  "lastUpdated": "2025-10-09",
  "description": "Contrato de esquema DB..."
}
```

### 2. Tablas y Columnas

```json
{
  "tables": {
    "users": {
      "description": "Usuarios del sistema",
      "columns": {
        "id": {
          "type": "uuid",
          "nullable": false,
          "primaryKey": true,
          "description": "ID del usuario"
        },
        "avatar_url": {
          "type": "text",
          "nullable": true,
          "status": "CONFIRMED",
          "usedInUI": true,
          "description": "URL del avatar en bucket user-avatars"
        }
      },
      "indexes": ["email"],
      "rlsEnabled": true
    }
  }
}
```

**Campos especiales:**
- `status`: `"CONFIRMED"` | `"DESCONOCIDO"` - indica si la columna existe en DB
- `usedInUI`: `true` | `false` - si la columna se usa en frontend
- `uiMapping`: nombre del campo en UI si es diferente al de DB
- `notes`: notas importantes sobre la columna

### 3. Enums

```json
{
  "enums": {
    "user_role": {
      "description": "Roles de usuarios",
      "values": ["SUPER_ADMIN", "ADMIN", "USER"],
      "usedInCode": true
    }
  }
}
```

### 4. Storage Buckets

```json
{
  "storageBuckets": {
    "user-avatars": {
      "description": "Avatares de usuarios",
      "public": true,
      "allowedMimeTypes": ["image/jpeg", "image/png", ...],
      "maxFileSizeMB": 5,
      "pathStructure": "{userId}/{userId}_avatar_{timestamp}.{ext}",
      "usedInCode": true,
      "upsert": true
    }
  }
}
```

### 5. Mapeos UI ↔ DB

```json
{
  "uiMappings": {
    "forms": {
      "ai_prompt": {
        "dbColumn": "form_prompt",
        "direction": "bidirectional",
        "notes": "UI usa 'ai_prompt', DB tiene 'form_prompt'"
      }
    },
    "form_fields": {
      "field_label": {
        "dbColumn": "label",
        "direction": "bidirectional"
      },
      "is_required": {
        "dbColumn": "required",
        "direction": "bidirectional"
      }
    }
  }
}
```

---

## 🔄 Flujo de Trabajo

### Antes de Cualquier Feature

```bash
npm run validate:contract
```

Este comando:
1. Carga el contrato y los inventarios de código
2. Verifica que todas las referencias existen
3. Valida tipos de enums
4. Verifica buckets de storage
5. Valida mapeos UI ↔ DB

**Si hay errores críticos** → El script termina con `exit(1)` y el build falla.

**Si solo hay warnings** → El script termina con `exit(0)` pero debes revisar los warnings.

### Cuando Cambias el Esquema en Supabase

**Pasos:**

1. **Aplica el cambio en Supabase** (vía migration o Dashboard)

2. **Ejecuta introspección**:
   - Abre Supabase Dashboard → SQL Editor
   - Ejecuta los SQLs de `/docs/supabase-introspection/README.md`
   - Guarda resultados como JSON en `/docs/supabase-introspection/`

3. **Compara con el contrato**:
   ```bash
   npm run compare:introspection
   ```

4. **Actualiza el contrato** si hay discrepancias válidas:
   ```json
   {
     "tables": {
       "users": {
         "columns": {
           "new_column": {
             "type": "text",
             "nullable": true,
             "status": "CONFIRMED",
             "description": "Nueva columna agregada"
           }
         }
       }
     }
   }
   ```

5. **Re-valida**:
   ```bash
   npm run validate:contract
   ```

### Cuando Actualizas el Contrato

**Pasos:**

1. **Edita `/contracts/schema.contract.json`**
   - Agrega/modifica tablas, columnas, enums o buckets
   - Actualiza `lastUpdated` y `version` si es cambio mayor

2. **Valida localmente**:
   ```bash
   npm run validate:contract
   ```

3. **Si agregas columnas nuevas**, crea migration en Supabase:
   ```sql
   -- migration: add_user_profile_fields.sql
   ALTER TABLE users
   ADD COLUMN bio TEXT,
   ADD COLUMN website TEXT;
   ```

4. **Ejecuta introspección** post-migration:
   ```bash
   npm run compare:introspection
   ```

5. **Actualiza código** según sea necesario:
   - Añade columnas a selects explícitos en repos
   - Actualiza interfaces TypeScript si es necesario
   - Añade mapeos UI ↔ DB si los nombres difieren

---

## 📋 Checklist de Mantenimiento

### Semanal

- [ ] Ejecutar `npm run validate:contract` en CI/CD
- [ ] Revisar warnings acumulados

### Por Cada Sprint

- [ ] Ejecutar introspección manual
- [ ] Comparar con `npm run compare:introspection`
- [ ] Actualizar contrato si hay drifts

### Antes de Release

- [ ] Validar que contrato y DB están sincronizados
- [ ] Documentar cambios de esquema en CHANGELOG
- [ ] Verificar que todos los mapeos UI ↔ DB están actualizados

---

## 🎯 Ejemplos de Uso

### Ejemplo 1: Agregar Columna Nueva

**Escenario**: Quieres agregar `phone_number` a la tabla `users`.

**Pasos**:

1. **Actualiza el contrato**:
   ```json
   {
     "tables": {
       "users": {
         "columns": {
           "phone_number": {
             "type": "text",
             "nullable": true,
             "status": "CONFIRMED",
             "description": "Número de teléfono del usuario"
           }
         }
       }
     }
   }
   ```

2. **Crea migration en Supabase**:
   ```sql
   ALTER TABLE users ADD COLUMN phone_number TEXT;
   ```

3. **Actualiza repository**:
   ```typescript
   // users.repository.ts
   async getAll(): Promise<User[]> {
     const { data, error } = await supabase
       .from('users')
       .select('id, email, name, phone_number, ...') // ✅ Agrega aquí
       .order('created_at', { ascending: false });
   }
   ```

4. **Valida**:
   ```bash
   npm run validate:contract
   npm run build
   ```

### Ejemplo 2: Cambiar Enum

**Escenario**: Agregar valor `"PARTNER"` a enum `company_type`.

**Pasos**:

1. **Actualiza el contrato**:
   ```json
   {
     "enums": {
       "company_type": {
         "values": ["CLIENT", "SUPPLIER", "PARTNER", "INTERNAL"]
       }
     }
   }
   ```

2. **Crea migration en Supabase**:
   ```sql
   ALTER TYPE company_type ADD VALUE 'PARTNER';
   ```

3. **Actualiza TypeScript types**:
   ```typescript
   // database.types.ts
   export type CompanyType = 'CLIENT' | 'SUPPLIER' | 'PARTNER' | 'INTERNAL';
   ```

4. **Valida**:
   ```bash
   npm run validate:contract
   ```

### Ejemplo 3: Mapeo UI ↔ DB

**Escenario**: En UI usas `userFullName` pero DB tiene `name`.

**Actualiza el contrato**:
```json
{
  "tables": {
    "users": {
      "columns": {
        "name": {
          "type": "text",
          "uiMapping": "userFullName",
          "notes": "UI usa 'userFullName', DB usa 'name'"
        }
      }
    }
  },
  "uiMappings": {
    "users": {
      "userFullName": {
        "dbColumn": "name",
        "direction": "bidirectional"
      }
    }
  }
}
```

**Crea helper de mapeo**:
```typescript
// users.repository.ts
function dbUserToApp(dbUser: any) {
  return {
    ...dbUser,
    userFullName: dbUser.name,
  };
}

function appUserToDb(appUser: any) {
  return {
    ...appUser,
    name: appUser.userFullName,
  };
}
```

---

## ⚠️ Casos Especiales

### Columnas con `status: "DESCONOCIDO"`

Estas columnas están marcadas porque:
- Se usan en código pero no se confirmó existencia en DB
- Fueron mencionadas en specs pero no se sabe si existen

**Acción**: Ejecuta introspección y actualiza el status a `"CONFIRMED"` o elimínalas del contrato.

### Timestamps Automáticos

El contrato documenta qué timestamps son automáticos (triggers) vs manuales:

```json
{
  "columns": {
    "updated_at": {
      "type": "timestamptz",
      "nullable": true,
      "notes": "CRÍTICO: Actualmente seteado manualmente, debe migrar a trigger"
    }
  }
}
```

**Recomendación**: Crear triggers en DB y quitar seteo manual del código.

---

## 🔧 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run validate:contract` | Valida código contra contrato. Falla si hay errores críticos |
| `npm run compare:introspection` | Compara contrato con datos reales de Supabase. Solo informativo |
| `npm run build` | Build de producción (incluye typecheck) |

---

## 📚 Referencias

- Contrato: `/contracts/schema.contract.json`
- Validador: `/tools/validate-schema-contract.ts`
- Comparador: `/tools/compare-contract-vs-introspection.ts`
- Introspección: `/docs/supabase-introspection/README.md`
- Inventarios: `/docs/inventories/*.json`

---

## 🆘 Troubleshooting

### Error: "Columna X referenciada pero NO existe en contrato"

**Causa**: El código usa una columna que no está en el contrato.

**Solución**:
1. Verifica si la columna existe en DB (introspección)
2. Si existe: agrégala al contrato con `status: "CONFIRMED"`
3. Si no existe: quita la referencia del código o créala en DB

### Error: "Enum value X usado pero NO está en contrato"

**Causa**: El código usa un valor de enum no declarado.

**Solución**:
1. Verifica en DB qué valores tiene el enum
2. Actualiza el contrato con los valores correctos
3. O crea migration para agregar el valor faltante

### Warning: "Columna X tiene status DESCONOCIDO"

**Causa**: Columna marcada pero no confirmada en DB.

**Solución**:
1. Ejecuta introspección de Supabase
2. Si existe: cambia status a `"CONFIRMED"`
3. Si no existe: elimínala del contrato o créala en DB

---

**Última actualización:** 2025-10-09
