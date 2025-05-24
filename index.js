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
  'tsvector', // PostgreSQL-specific for full-text search
  'one-to-many', 'many-to-one', 'many-to-many', 'one-to-one',
];

// Validate JSON configuration
const validateConfig = (config) => {
  config.forEach((entityConfig) => {
    if (!entityConfig.name || !entityConfig.entity || !entityConfig.routes || !Array.isArray(entityConfig.fields)) {
      throw new Error(`Invalid configuration for entity '${entityConfig.entity || 'unknown'}': Missing required fields (name, entity, routes, fields)`);
    }
    entityConfig.fields.forEach((field) => {
      if (!validTypes.includes(field.type)) {
        throw new Error(`Invalid type '${field.type}' for field '${field.name}' in entity '${entityConfig.entity}'`);
      }
      if (field.type === 'enum' && (!field.enumValues || !Array.isArray(field.enumValues))) {
        throw new Error(`Enum field '${field.name}' in entity '${entityConfig.entity}' requires 'enumValues' array`);
      }
      if (field.type === 'array' && !field.arrayType) {
        throw new Error(`Array field '${field.name}' in entity '${entityConfig.entity}' requires 'arrayType' property`);
      }
      if (['one-to-many', 'many-to-one', 'many-to-many', 'one-to-one'].includes(field.type) && !field.target) {
        throw new Error(`Relation field '${field.name}' in entity '${entityConfig.entity}' requires 'target' property`);
      }
    });
  });
};

// TypeORM column type mapping for PostgreSQL
handlebars.registerHelper('mapColumnType', function (type) {
  const typeMap = {
    string: 'varchar', // Alias for varchar
    text: 'text',
    varchar: 'varchar',
    char: 'char',
    number: 'float', // Alias for float
    integer: 'integer',
    bigint: 'bigint',
    decimal: 'decimal',
    float: 'float',
    'double precision': 'double precision',
    boolean: 'boolean',
    datetime: 'timestamp', // Alias for timestamp
    timestamp: 'timestamp',
    date: 'date',
    time: 'time',
    uuid: 'uuid',
    json: 'json',
    jsonb: 'jsonb',
    array: 'array',
    enum: 'enum',
    tsvector: 'tsvector', // PostgreSQL-specific
  };
  return typeMap[type] || 'varchar'; // Default to varchar
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
    array: field.arrayType ? `${this.mapTsType(field.arrayType)}[]` : 'any[]',
    enum: field.tsEnumName || 'string',
    tsvector: 'string', // tsvector is typically string in TypeScript
  };
  return tsTypeMap[type] || 'string'; // Default to string
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
  return `@Column('${field.arrayType && field.type === 'array' ? field.arrayType : field.type}', { ${options.join(', ')} })`;
});

// Helper for generating TypeScript enums
handlebars.registerHelper('generateTsEnum', function (fields) {
  const enums = fields
    .filter(f => f.type === 'enum' && f.tsEnumName)
    .map(f => `
export enum ${f.tsEnumName} {
${f.enumValues.map(val => `  ${val.toUpperCase()} = '${val}'`).join(',\n')}
}
`);
  return enums.join('\n');
});

// Rest of the generateCrud function (unchanged for brevity)
const generateCrud = (config) => {
  config.forEach((entityConfig) => {
    const name = entityConfig.name;
    const entity = entityConfig.entity;
    const entityLower = entityConfig.entity.toLowerCase();
    const routes = entityConfig.routes;
    const nameLower = name.toLowerCase();
    const nameUpper = nameLower.charAt(0).toUpperCase() + nameLower.slice(1);

    const templates = [
      { name: 'controller', output: `controllers/${entity}.controller.ts` },
      { name: 'entity', output: `../../entities/${entity}.entity.ts` },
      { name: 'dto-create', output: `dto/create-${entity}.dto.ts` },
      { name: 'dto-update', output: `dto/update-${entity}.dto.ts` },
      { name: 'usecase-create', output: `usecases/create-${entity}.usecase.ts` },
      { name: 'usecase-get', output: `usecases/get-${entity}.usecase.ts` },
      { name: 'usecase-update', output: `usecases/update-${entity}.usecase.ts` },
      { name: 'usecase-delete', output: `usecases/delete-${entity}.usecase.ts` },
      { name: 'module', output: `${entity}.module.ts` },
    ];

    const basePath = path.join(process.cwd(), 'src', 'modules', entity);
    fs.mkdirSync(basePath, { recursive: true });
    fs.mkdirSync(path.join(basePath, 'controllers'), { recursive: true });
    fs.mkdirSync(path.join(basePath, 'usecases'), { recursive: true });
    fs.mkdirSync(path.join(basePath, 'dto'), { recursive: true });
    fs.mkdirSync(path.join(process.cwd(), 'src', 'entities'), { recursive: true });

    console.log(`Created: ${basePath}`);

    templates.forEach((template) => {
      const templatePath = path.join(templatesDir, `${template.name}.hbs`);
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateContent);
      const content = compiledTemplate({
        name,
        entity,
        nameLower: entityLower,
        entityNames: routes,
        fields: entityConfig.fields
      });
      const outputPath = path.join(basePath, template.output);
      fs.writeFileSync(outputPath, content);
      console.log(`Created: ${outputPath}`);
    });
  });
};

// CLI setup
program
  .name('crud-generator-nestjs')
  .description('A CLI tool to generate NestJS CRUD modules for TypeORM and PostgreSQL from a JSON definition')
  .version('1.2.0')
  .argument('<jsonPath>', 'Path to JSON file defining entity')
  .action((jsonPath, options) => {
    try {
      const config = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      validateConfig(config);
      generateCrud(config, options);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
module.exports = { generateCrud };