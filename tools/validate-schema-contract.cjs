#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const contractPath = path.join(projectRoot, 'contracts/schema.contract.json');
const dbRefsPath = path.join(projectRoot, 'docs/inventories/db-refs.json');
const enumsPath = path.join(projectRoot, 'docs/inventories/enums.json');
const reportPath = path.join(projectRoot, 'docs/contract-validation-report.json');

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function validateSchema() {
  console.log('🔍 Cargando contrato de esquema...');
  const contract = loadJSON(contractPath);

  console.log('📊 Cargando inventarios de referencias DB...');
  const dbRefs = loadJSON(dbRefsPath);
  const enumsInventory = loadJSON(enumsPath);

  const discrepancies = [];

  console.log('\n✅ Validando tablas y columnas...');

  // Validar que todas las tablas referenciadas existen en el contrato
  for (const tableRef of dbRefs.tables) {
    if (!contract.tables[tableRef.name]) {
      for (const fileRef of tableRef.files) {
        discrepancies.push({
          kind: 'TABLE',
          ref: tableRef.name,
          file: fileRef.file,
          line: fileRef.lines[0],
          message: `Tabla '${tableRef.name}' referenciada en código pero NO existe en contrato`,
          severity: 'error'
        });
      }
    }
  }

  // Validar que todas las columnas referenciadas existen en el contrato
  for (const colRef of dbRefs.columns) {
    const table = contract.tables[colRef.table];

    if (!table) {
      continue;
    }

    if (!table.columns[colRef.column]) {
      for (const fileRef of colRef.files) {
        const lines = fileRef.lines || [];
        discrepancies.push({
          kind: 'COLUMN',
          ref: `${colRef.table}.${colRef.column}`,
          file: fileRef.file,
          line: lines[0],
          message: `Columna '${colRef.table}.${colRef.column}' referenciada en código pero NO existe en contrato`,
          severity: 'error'
        });
      }
    } else {
      // Columna existe, verificar status
      const col = table.columns[colRef.column];
      if (col.status === 'DESCONOCIDO') {
        for (const fileRef of colRef.files) {
          const lines = fileRef.lines || [];
          discrepancies.push({
            kind: 'COLUMN',
            ref: `${colRef.table}.${colRef.column}`,
            file: fileRef.file,
            line: lines[0],
            message: `Columna '${colRef.table}.${colRef.column}' tiene status DESCONOCIDO en contrato - verificar en Supabase`,
            severity: 'warning'
          });
        }
      }
    }
  }

  console.log('✅ Validando enums...');

  // Validar que todos los enums referenciados existen y tienen valores correctos
  for (const enumRef of dbRefs.enums) {
    const contractEnum = contract.enums[enumRef.enumName];

    if (!contractEnum) {
      for (const fileRef of enumRef.files) {
        const line = fileRef.line || (fileRef.lines && fileRef.lines[0]);
        discrepancies.push({
          kind: 'ENUM',
          ref: enumRef.enumName,
          file: fileRef.file,
          line: line,
          message: `Enum '${enumRef.enumName}' referenciado en código pero NO existe en contrato`,
          severity: 'error'
        });
      }
    } else {
      // Verificar que los valores usados en código están en el contrato
      for (const value of enumRef.valuesSeenInCode) {
        if (!contractEnum.values.includes(value)) {
          for (const fileRef of enumRef.files) {
            const line = fileRef.line || (fileRef.lines && fileRef.lines[0]);
            discrepancies.push({
              kind: 'ENUM',
              ref: `${enumRef.enumName}.${value}`,
              file: fileRef.file,
              line: line,
              message: `Valor '${value}' de enum '${enumRef.enumName}' usado en código pero NO está en contrato`,
              severity: 'error'
            });
          }
        }
      }
    }
  }

  // Validar enums desde enumsInventory también
  for (const [enumName, enumData] of Object.entries(enumsInventory)) {
    const contractEnum = contract.enums[enumName];

    if (!contractEnum) {
      for (const fileRef of enumData.files) {
        discrepancies.push({
          kind: 'ENUM',
          ref: enumName,
          file: fileRef.file,
          line: fileRef.line || (fileRef.lines && fileRef.lines[0]),
          message: `Enum '${enumName}' en inventario pero NO existe en contrato`,
          severity: 'error'
        });
      }
      continue;
    }

    for (const value of enumData.valuesSeen) {
      if (!contractEnum.values.includes(value)) {
        for (const fileRef of enumData.files) {
          discrepancies.push({
            kind: 'ENUM',
            ref: `${enumName}.${value}`,
            file: fileRef.file,
            line: fileRef.line || (fileRef.lines && fileRef.lines[0]),
            message: `Valor '${value}' de enum '${enumName}' en inventario pero NO está en contrato`,
            severity: 'error'
          });
        }
      }
    }
  }

  console.log('✅ Validando storage buckets...');

  // Validar que todos los buckets referenciados existen en el contrato
  for (const bucketRef of dbRefs.buckets) {
    if (!contract.storageBuckets[bucketRef.name]) {
      for (const fileRef of bucketRef.files) {
        const lines = fileRef.lines || [];
        discrepancies.push({
          kind: 'BUCKET',
          ref: bucketRef.name,
          file: fileRef.file,
          line: lines[0],
          message: `Bucket '${bucketRef.name}' referenciado en código pero NO existe en contrato`,
          severity: 'error'
        });
      }
    }
  }

  console.log('✅ Validando mapeos UI ↔ DB...');

  // Validar mapeos UI ↔ DB
  if (contract.uiMappings) {
    for (const [tableName, mappings] of Object.entries(contract.uiMappings)) {
      const table = contract.tables[tableName];

      if (!table) {
        discrepancies.push({
          kind: 'MAPPING',
          ref: tableName,
          message: `Tabla '${tableName}' tiene mapeos UI pero NO existe en contrato`,
          severity: 'error'
        });
        continue;
      }

      for (const [uiField, mapping] of Object.entries(mappings)) {
        const dbColumn = mapping.dbColumn;

        if (!table.columns[dbColumn]) {
          discrepancies.push({
            kind: 'MAPPING',
            ref: `${tableName}.${uiField} → ${dbColumn}`,
            message: `Mapeo UI '${uiField}' → '${dbColumn}' en tabla '${tableName}' pero columna DB NO existe en contrato`,
            severity: 'error'
          });
        }
      }
    }
  }

  // Generar resumen
  const summary = {
    total: discrepancies.length,
    byKind: {},
    bySeverity: {}
  };

  for (const disc of discrepancies) {
    summary.byKind[disc.kind] = (summary.byKind[disc.kind] || 0) + 1;
    summary.bySeverity[disc.severity] = (summary.bySeverity[disc.severity] || 0) + 1;
  }

  const hasErrors = (summary.bySeverity['error'] || 0) > 0;

  const report = {
    timestamp: new Date().toISOString(),
    contractVersion: contract.version || '1.0.0',
    discrepancies,
    summary,
    status: hasErrors ? 'FAIL' : 'PASS'
  };

  return report;
}

function main() {
  console.log('════════════════════════════════════════════════════════');
  console.log('  VALIDADOR DE CONTRATO DE ESQUEMA');
  console.log('════════════════════════════════════════════════════════\n');

  try {
    const report = validateSchema();

    // Guardar reporte
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n📄 Reporte guardado en: ${reportPath}`);

    // Mostrar resumen
    console.log('\n════════════════════════════════════════════════════════');
    console.log('  RESUMEN DE VALIDACIÓN');
    console.log('════════════════════════════════════════════════════════');
    console.log(`\n🕐 Timestamp: ${report.timestamp}`);
    console.log(`📦 Versión del contrato: ${report.contractVersion}`);
    console.log(`\n📊 Total de discrepancias: ${report.summary.total}`);

    if (report.summary.total > 0) {
      console.log('\n📋 Por tipo:');
      for (const [kind, count] of Object.entries(report.summary.byKind)) {
        console.log(`  • ${kind}: ${count}`);
      }

      console.log('\n⚠️  Por severidad:');
      for (const [severity, count] of Object.entries(report.summary.bySeverity)) {
        const icon = severity === 'error' ? '🔴' : severity === 'warning' ? '🟡' : 'ℹ️';
        console.log(`  ${icon} ${severity.toUpperCase()}: ${count}`);
      }

      // Mostrar primeras 10 discrepancias
      console.log('\n📝 Primeras discrepancias:');
      const toShow = report.discrepancies.slice(0, 10);
      for (const disc of toShow) {
        const icon = disc.severity === 'error' ? '🔴' : disc.severity === 'warning' ? '🟡' : 'ℹ️';
        const location = disc.file ? `${disc.file}:${disc.line || '?'}` : 'N/A';
        console.log(`\n  ${icon} [${disc.kind}] ${disc.ref}`);
        console.log(`     ${disc.message}`);
        console.log(`     📍 ${location}`);
      }

      if (report.discrepancies.length > 10) {
        console.log(`\n  ... y ${report.discrepancies.length - 10} discrepancias más (ver reporte completo)`);
      }
    }

    console.log('\n════════════════════════════════════════════════════════');

    if (report.status === 'FAIL') {
      console.log('❌ VALIDACIÓN FALLIDA - Hay errores críticos');
      console.log('════════════════════════════════════════════════════════\n');
      process.exit(1);
    } else {
      console.log('✅ VALIDACIÓN EXITOSA - Sin errores críticos');
      if (report.summary.total > 0) {
        console.log('⚠️  Hay warnings que deben revisarse');
      }
      console.log('════════════════════════════════════════════════════════\n');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Error durante validación:', error);
    process.exit(1);
  }
}

main();
