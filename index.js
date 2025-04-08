const { Command } = require('commander');
const fs = require('fs');
const handlebars = require('handlebars');
const path = require('path');
const program = new Command();

handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});


// Helper untuk memetakan tipe kolom TypeORM
handlebars.registerHelper('mapColumnType', function (type) {
  const typeMap = {
    string: 'varchar',
    number: 'integer',
    text: 'text',
    boolean: 'boolean',
    datetime: 'timestamp',
    timestamp: 'timestamp',
    uuid: 'uuid',
    varchar: 'varchar',
  };
  return typeMap[type] || 'varchar'; // default ke varchar jika tipe tidak dikenal
});

// Helper untuk memetakan tipe TypeScript
handlebars.registerHelper('mapTsType', function (type) {
  const tsTypeMap = {
    string: 'string',
    number: 'number',
    text: 'string',
    boolean: 'boolean',
    datetime: 'Date',
    timestamp: 'Date',
    uuid: 'string',
    varchar: 'string',
  };
  return tsTypeMap[type] || 'string'; // default ke string jika tipe tidak dikenal
});

// Helper untuk equals
handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

const generateCrud = (config) => {
  config.forEach((entityConfig) => {
    const name = entityConfig.name; // Nama kelas (User, UserDetail)
    const entity = entityConfig.entity; // Nama entitas (User, UserDetail)
    const entityLower = entityConfig.entity.toLowerCase(); // Nama entitas (user, userDetail)
    const routes = entityConfig.routes; // Nama rute (users, user-details)
    const nameLower = name.toLowerCase(); // Untuk konsistensi penamaan file
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

    const basePath = `src/modules/${entity}`;
    fs.mkdirSync(basePath, { recursive: true });
    fs.mkdirSync(`${basePath}/controllers`, { recursive: true });
    fs.mkdirSync(`${basePath}/usecases`, { recursive: true });
    fs.mkdirSync(`${basePath}/dto`, { recursive: true });
    fs.mkdirSync(`src/entities`, { recursive: true });

    console.log(`Created: ${basePath}`);

    templates.forEach((template) => {
      const templateContent = fs.readFileSync(`templates/${template.name}.hbs`, 'utf-8');
      const compiledTemplate = handlebars.compile(templateContent);
      const content = compiledTemplate({
        name,           // Nama kelas (User, UserDetail)
        entity,         // Nama entitas (User, UserDetail)
        nameLower: entityLower, // Nama file dan variabel (user, userDetail)
        entityNames: routes,    // Nama rute (users, user-details)
        fields: entityConfig.fields // Field dari config
      });
      const outputPath = path.join(basePath, template.output);
      fs.writeFileSync(outputPath, content);
      console.log(`Created: ${outputPath}`);
    });
  });
};

program
  .name('crud-generator')
  .description('A CLI tool to generate NestJS CRUD modules from a JSON definition')
  .version('1.0.0')
  .argument('<jsonPath>', 'Path to JSON file defining entity')
  .action((jsonPath, options) => {
    const config = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    generateCrud(config, options);
  });

  program.parse(process.argv);
  module.exports = { generateCrud };