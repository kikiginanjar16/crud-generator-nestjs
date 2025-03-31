#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const Handlebars = require('handlebars');

const program = new Command();

const pluralize = (word) => {
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  } else if (word.endsWith('s')) {
    return word + 'es';
  } else {
    return word + 's';
  }
};

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

// Membaca dan mengkompilasi template dari file
const templateFiles = {
  entity: 'entity.hbs',
  controller: 'controller.hbs',
  service: 'service.hbs',
  module: 'module.hbs',
  dto: 'dto.hbs'
};

const templates = {};
Object.keys(templateFiles).forEach(key => {
  const templatePath = path.join(__dirname, 'templates', templateFiles[key]);
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  templates[key] = Handlebars.compile(templateContent);
});

const generateCrud = (entityConfig, destination) => {
  const entityName = entityConfig.name;
  const entityLower = entityName.toLowerCase();
  const entityUpper = entityName.charAt(0).toUpperCase() + entityName.slice(1);
  const entityNames = pluralize(entityLower);

  // Data untuk entitas utama
  const mainTemplateData = {
    entityLower,
    entityUpper,
    entityNames,
    fields: entityConfig.fields,
    hasDetails: !!entityConfig.details
  };

  if (entityConfig.details) {
    mainTemplateData.detailEntityLower = entityConfig.details.name.toLowerCase();
    mainTemplateData.detailEntityUpper = entityConfig.details.name.charAt(0).toUpperCase() + entityConfig.details.name.slice(1);
    mainTemplateData.detailEntityNames = pluralize(mainTemplateData.detailEntityLower);
  }

  // Generate file untuk entitas utama
  const mainFiles = {
    entity: templates.entity(mainTemplateData),
    controller: templates.controller(mainTemplateData),
    service: templates.service(mainTemplateData),
    module: templates.module(mainTemplateData),
    dto: templates.dto(mainTemplateData),
    hasDetails: !!entityConfig.details
  };

  const basePath = destination || path.join(process.cwd(), entityLower);
  const folders = ['entities', 'controllers', 'usecases', 'dtos', 'modules'];

  folders.forEach(folder => {
    const folderPath = path.join(basePath, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
  });

  // Tulis file entitas utama
  fs.writeFileSync(path.join(basePath, 'entities', `${entityLower}.entity.ts`), mainFiles.entity);
  fs.writeFileSync(path.join(basePath, 'controllers', `${entityLower}.controller.ts`), mainFiles.controller);
  fs.writeFileSync(path.join(basePath, 'usecases', `${entityLower}.usecase.ts`), mainFiles.service);
  fs.writeFileSync(path.join(basePath, 'modules', `${entityLower}.module.ts`), mainFiles.module);
  fs.writeFileSync(path.join(basePath, 'dtos', `${entityLower}.dto.ts`), mainFiles.dto);

  // Generate file untuk detail jika ada
  if (entityConfig.details) {
    const detailEntityName = entityConfig.details.name;
    const detailEntityLower = detailEntityName.toLowerCase();
    const detailEntityUpper = detailEntityName.charAt(0).toUpperCase() + detailEntityName.slice(1);
    const detailEntityNames = pluralize(detailEntityLower);

    const detailTemplateData = {
      entityLower: detailEntityLower,
      entityUpper: detailEntityUpper,
      entityNames: detailEntityNames,
      fields: entityConfig.details.fields,
      parentEntityLower: entityLower,
      parentEntityUpper: entityUpper,
      hasDetails: false // Detail tidak memiliki sub-detail dalam kasus ini
    };

    const detailFiles = {
      entity: templates.entity(detailTemplateData),
      controller: templates.controller(detailTemplateData),
      service: templates.service(detailTemplateData),
      module: templates.module(detailTemplateData),
      dto: templates.dto(detailTemplateData)
    };

    fs.writeFileSync(path.join(basePath, 'entities', `${detailEntityLower}.entity.ts`), detailFiles.entity);
    fs.writeFileSync(path.join(basePath, 'controllers', `${detailEntityLower}.controller.ts`), detailFiles.controller);
    fs.writeFileSync(path.join(basePath, 'usecases', `${detailEntityLower}.usecase.ts`), detailFiles.service);
    fs.writeFileSync(path.join(basePath, 'modules', `${detailEntityLower}.module.ts`), detailFiles.module);
    fs.writeFileSync(path.join(basePath, 'dtos', `${detailEntityLower}.dto.ts`), detailFiles.dto);
  }

  console.log(`${entityUpper} CRUD with structured folders generated successfully in ${basePath}!`);
};

program
  .name('crud-generator')
  .description('A CLI tool to generate NestJS CRUD modules from a JSON definition')
  .version('1.0.0')
  .argument('<jsonPath>', 'Path to JSON file defining entity')
  .option('-d, --destination <path>', 'Custom destination folder for generated files')
  .action((jsonPath, options) => {
    const entityConfig = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    generateCrud(entityConfig, options.destination);
  });

program.parse(process.argv);

module.exports = { generateCrud };