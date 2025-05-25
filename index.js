#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const handlebars = require('handlebars');
const path = require('path');
const program = new Command();

// Tentukan lokasi template secara dinamis relatif terhadap index.js
const templatesDir = path.join(__dirname, 'src', 'templates');

// Valid types for PostgreSQL and TypeORM
const validTypes = [
  'varchar', 'text', 'char',
  'integer', 'bigint', 'decimal', 'float', 'double precision',
  'boolean',
  'timestamp', 'date', 'time',
  'uuid',
  'json', 'jsonb',
  'array',
  'enum',
  'tsvector',
  'one-to-many', 'many-to-one', 'many-to-many', 'one-to-one',
  'file'
];

// Valid types for arrayType to prevent recursion
const validArrayTypes = [
  'varchar', 'text', 'char',
  'integer', 'bigint', 'decimal', 'float', 'double precision',
  'boolean',
  'timestamp', 'date', 'time',
  'uuid',
  'enum'
];

// Validate JSON configuration
const validateConfig = (config) => {
  config.forEach((entityConfig) => {
    if (!entityConfig.name || !entityConfig.entity || !entityConfig.routes || !Array.isArray(entityConfig.fields)) {
      throw new Error(`Invalid configuration for entity '${entityConfig.entity || 'unknown'}': Missing required fields (name, entity, routes, fields)`);
    }
    if (entityConfig.idType && !['uuid', 'increment'].includes(entityConfig.idType)) {
      throw new Error(`Invalid idType '${entityConfig.idType}' in entity '${entityConfig.entity}'`);
    }
    if (entityConfig.customProviders && !Array.isArray(entityConfig.customProviders)) {
      throw new Error(`Invalid customProviders in entity '${entityConfig.entity}': Must be an array`);
    }
    entityConfig.fields.forEach((field) => {
      if (!validTypes.includes(field.type)) {
        throw new Error(`Invalid type '${field.type}' for field '${field.name}' in entity '${entityConfig.entity}'`);
      }
      if (field.type === 'enum' && (!field.enumValues || !Array.isArray(field.enumValues))) {
        throw new Error(`Enum field '${field.name}' in entity '${entityConfig.entity}' requires 'enumValues' array`);
      }
      if (field.type === 'array') {
        if (!field.arrayType) {
          throw new Error(`Array field '${field.name}' in entity '${entityConfig.entity}' requires 'arrayType' property`);
        }
        if (!validArrayTypes.includes(field.arrayType)) {
          throw new Error(`Invalid arrayType '${field.arrayType}' for field '${field.name}' in entity '${entityConfig.entity}'. Must be one of: ${validArrayTypes.join(', ')}`);
        }
      }
      if (['one-to-many', 'many-to-one', 'many-to-many', 'one-to-one'].includes(field.type) && !field.target) {
        throw new Error(`Relation field '${field.name}' in entity '${entityConfig.entity}' requires 'target' property`);
      }
      if (field.type === 'file') {
        if (!field.allowedTypes || !Array.isArray(field.allowedTypes)) {
          throw new Error(`File field '${field.name}' in entity '${entityConfig.entity}' requires 'allowedTypes' array`);
        }
        if (!field.maxSize || typeof field.maxSize !== 'number' || field.maxSize <= 0) {
          throw new Error(`File field '${field.name}' in entity '${entityConfig.entity}' requires a positive 'maxSize' in MB`);
        }
      }
    });
  });
};

// TypeORM column type mapping for PostgreSQL
handlebars.registerHelper('mapColumnType', function (type) {
  const typeMap = {
    string: 'varchar',
    text: 'text',
    varchar: 'varchar',
    char: 'char',
    number: 'float',
    integer: 'integer',
    bigint: 'bigint',
    decimal: 'decimal',
    float: 'float',
    'double precision': 'double precision',
    boolean: 'boolean',
    datetime: 'timestamp',
    timestamp: 'timestamp',
    date: 'date',
    time: 'time',
    uuid: 'uuid',
    json: 'json',
    jsonb: 'jsonb',
    array: 'array',
    enum: 'enum',
    tsvector: 'tsvector',
    file: 'json'
  };
  return typeMap[type] || 'varchar';
});

// TypeScript type mapping
handlebars.registerHelper('mapTsType', function (type, field) {
  const tsTypeMap = {
    string: 'string',
    text: 'string',
    varchar: 'string',
    char: 'string',
    number: 'number',
    integer: 'number',
    bigint: 'number',
    decimal: 'number',
    float: 'number',
    'double precision': 'number',
    boolean: 'boolean',
    datetime: 'Date',
    timestamp: 'Date',
    date: 'Date',
    time: 'string',
    uuid: 'string',
    json: 'any',
    jsonb: 'any',
    array: field && field.arrayType ? `${handlebars.helpers.mapTsType(field.arrayType, null)}[]` : 'any[]',
    enum: field && field.tsEnumName ? field.tsEnumName : 'string',
    tsvector: 'string',
    file: '{ path: string; name: string; mimeType: string; size: number } | null'
  };
  return tsTypeMap[type] || 'string';
});

// Helper for generating TypeORM column decorators
handlebars.registerHelper('mapColumnOptions', function (field) {
  const options = [];
  if (field.primary) options.push('primary: true');
  if (field.generated) options.push('generated: true');
  if (field.nullable === false) options.push('nullable: false');
  if (field.unique) options.push('unique: true');
  if (field.length) options.push(`length: ${field.length}`);
  if (field.precision) options.push(`precision: ${field.precision}`);
  if (field.scale) options.push(`scale: ${field.scale}`);
  if (field.default !== undefined) options.push(`default: ${typeof field.default === 'string' ? `'${field.default}'` : field.default}`);
  if (field.enumValues) options.push(`enum: [${field.enumValues.map(val => `'${val}'`).join(', ')}]`);
  if (field.arrayType) options.push(`type: '${field.arrayType}'`);
  if (['one-to-many', 'many-to-one', 'many-to-many', 'one-to-one'].includes(field.type)) {
    const relationType = field.type.charAt(0).toUpperCase() + field.type.slice(1);
    return `@${relationType}(() => ${field.target}, ${field.inverseSide ? `(target) => target.${field.inverseSide}` : 'null'}${field.cascade ? `, { cascade: ${field.cascade} }` : ''})`;
  }
  const columnType = field.type === 'file' ? 'json' : (field.arrayType && field.type === 'array' ? field.arrayType : field.type);
  return `@Column('${columnType}', { ${options.join(', ')} })`;
});

// Helper for generating TypeScript enums
handlebars.registerHelper('generateTsEnum', function (fields) {
  const enums = fields
    .filter(f => f.type === 'enum' && f.tsEnumName)
    .map(f => `
export enum ${f.tsEnumName} {
${f.enumValues.map(val => `  ${handlebars.helpers.toUpperCase(val)} = '${val}'`).join(',\n')}
}
`);
  return enums.join('\n');
});

// Helper to convert string to PascalCase
handlebars.registerHelper('toPascalCase', function (str) {
  return str
    .toLowerCase()
    .replace(/(^|[^a-zA-Z0-9]+)(.)/g, (m, sep, chr) => chr.toUpperCase());
});

// Helper to convert string to camelCase
handlebars.registerHelper('toCamelCase', function (str) {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
});

// Helper to convert string to upper case for enum values
handlebars.registerHelper('toUpperCase', function (str) {
  return str.toUpperCase().replace(/[^a-zA-Z0-9]+/g, '_');
});

// Helper to convert string to kebab-case
handlebars.registerHelper('toKebabCase', function (str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2') // Add hyphen between camelCase words
    .replace(/[^a-zA-Z0-9]+/g, '-') // Replace non-alphanumeric characters with hyphen
    .toLowerCase();
});

// Helper for equality check
handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

// Helper for unless condition
handlebars.registerHelper('unless', function (value, options) {
  return !value ? options.fn(this) : options.inverse(this);
});

// Generate CRUD files
const generateCrud = (config, options) => {
  config.forEach((entityConfig) => {
    const name = handlebars.helpers.toPascalCase(entityConfig.name);
    const entity = handlebars.helpers.toKebabCase(entityConfig.entity);
    const nameLower = handlebars.helpers.toCamelCase(entityConfig.name);
    const entityNames = entityConfig.routes;
    const hasFileField = entityConfig.fields.some(field => field.type === 'file');

    const templates = [
      { name: 'controller', output: `controllers/${entity}.controller.ts` },
      { name: 'entity', output: `../../entities/${entity}.entity.ts` },
      { name: 'dto-create', output: `dto/create-${entity}.dto.ts` },
      { name: 'dto-update', output: `dto/update-${entity}.dto.ts` },
      { name: 'usecase-create', output: `usecases/create-${entity}.usecase.ts` },
      { name: 'usecase-get', output: `usecases/get-${entity}.usecase.ts` },
      { name: 'usecase-update', output: `usecases/update-${entity}.usecase.ts` },
      { name: 'usecase-delete', output: `usecases/delete-${entity}.usecase.ts` },
      { name: 'usecase-upload', output: `usecases/upload-${entity}.usecase.ts`, skip: !hasFileField },
      { name: 'module', output: `${entity}.module.ts` },
    ];

    const basePath = path.join(process.cwd(), 'src', 'modules', entity);
    fs.mkdirSync(basePath, { recursive: true });
    fs.mkdirSync(path.join(basePath, 'controllers'), { recursive: true });
    fs.mkdirSync(path.join(basePath, 'usecases'), { recursive: true });
    fs.mkdirSync(path.join(basePath, 'dto'), { recursive: true });
    fs.mkdirSync(path.join(process.cwd(), 'src', 'entities'), { recursive: true });

    if (options.verbose) {
      console.log(`Created module directory: ${basePath}`);
    } else {
      console.log(`Created: ${basePath}`);
    }

    templates.forEach((template) => {
      if (template.skip) return;

      const templatePath = path.join(templatesDir, `${template.name}.hbs`);
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
      }
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateContent);
      const content = compiledTemplate({
        name,
        entity,
        nameLower,
        entityNames,
        fields: entityConfig.fields,
        idType: entityConfig.idType || 'increment',
        customProviders: entityConfig.customProviders || []
      });
      
      const outputPath = path.join(basePath, template.output);
      fs.writeFileSync(outputPath, content);
      if (options.verbose) {
        console.log(`Created: ${outputPath}`);
      } else {
        console.log(`Created: ${template.output}`);
      }
    });
  });
};

// CLI setup
program
  .name('crud-generator-nestjs')
  .description('A CLI tool to generate NestJS CRUD modules for TypeORM and PostgreSQL with file upload support')
  .version('1.2.0')
  .argument('<jsonPath>', 'Path to JSON file defining entity')
  .option('-v, --verbose', 'Enable verbose logging')
  .action((jsonPath, options) => {
    try {
      if (!fs.existsSync(jsonPath)) {
        throw new Error(`Configuration file not found: ${jsonPath}`);
      }
      if (!fs.existsSync(templatesDir)) {
        throw new Error(`Templates directory not found: ${templatesDir}`);
      }
      const config = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      validateConfig(config);
      generateCrud(config, options);
      console.log('Code generation completed successfully.');
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
module.exports = { generateCrud };