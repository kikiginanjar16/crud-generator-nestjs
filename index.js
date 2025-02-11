#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');

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

const generateCrud = (entityConfig, destination) => {
    const entityName = entityConfig.name;
    const entityLower = entityName.toLowerCase();
    const entityUpper = entityName.charAt(0).toUpperCase() + entityName.slice(1);

    const attributes = entityConfig.fields.map(field => `  ${field.name}: ${field.type};`).join('\n');
    const entityNames = pluralize(entityName);
    const files = {
        entity: `import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('${entityNames}')
export class ${entityUpper} {
   @PrimaryGeneratedColumn('uuid')
   id: string;

${entityConfig.fields.map(field => `  @Column()\n  ${field.name}: ${field.type};`).join('\n')}
}`,

        controller: `import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { ${entityUpper}Service } from '../services/${entityLower}.service';
import { Create${entityUpper}Dto, Update${entityUpper}Dto } from '../dtos/${entityLower}.dto';

@Controller('${entityLower}')
export class ${entityUpper}Controller {
  constructor(private readonly ${entityLower}Service: ${entityUpper}Service) {}

  @Post()
  create(@Body() createDto: Create${entityUpper}Dto) {
    return this.${entityLower}Service.create(createDto);
  }

  @Get()
  findAll() {
    return this.${entityLower}Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.${entityLower}Service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: Update${entityUpper}Dto) {
    return this.${entityLower}Service.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.${entityLower}Service.remove(id);
  }
}`,

        service: `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ${entityUpper} } from '../entities/${entityLower}.entity';
import { Create${entityUpper}Dto, Update${entityUpper}Dto } from '../dtos/${entityLower}.dto';

@Injectable()
export class ${entityUpper}Service {
  constructor(
    @InjectRepository(${entityUpper})
    private ${entityLower}Repository: Repository<${entityUpper}>
  ) {}

  create(createDto: Create${entityUpper}Dto) {
    const newEntity = this.${entityLower}Repository.create(createDto);
    return this.${entityLower}Repository.save(newEntity);
  }

  findAll() {
    return this.${entityLower}Repository.find();
  }

  findOne(id: string) {
    return this.${entityLower}Repository.findOne({ where: { id: Number(id) } });
  }

  update(id: string, updateDto: Update${entityUpper}Dto) {
    return this.${entityLower}Repository.update(id, updateDto);
  }

  remove(id: string) {
    return this.${entityLower}Repository.delete(id);
  }
}`,

        module: `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${entityUpper}Controller } from '../controllers/${entityLower}.controller';
import { ${entityUpper}Service } from '../services/${entityLower}.service';
import { ${entityUpper} } from '../entities/${entityLower}.entity';

@Module({
  imports: [TypeOrmModule.forFeature([${entityUpper}])],
  controllers: [${entityUpper}Controller],
  providers: [${entityUpper}Service]
})
export class ${entityUpper}Module {}`,

        dto: `export class Create${entityUpper}Dto {
${attributes}
}

export class Update${entityUpper}Dto {
${attributes}
}`
    };

    const basePath = destination || path.join(process.cwd(), entityLower); // Use custom destination if provided
    const folders = ['entities', 'controllers', 'services', 'dtos', 'modules'];

    folders.forEach(folder => {
        const folderPath = path.join(basePath, folder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
    });

    fs.writeFileSync(path.join(basePath, 'entities', `${entityLower}.entity.ts`), files.entity);
    fs.writeFileSync(path.join(basePath, 'controllers', `${entityLower}.controller.ts`), files.controller);
    fs.writeFileSync(path.join(basePath, 'services', `${entityLower}.service.ts`), files.service);
    fs.writeFileSync(path.join(basePath, 'modules', `${entityLower}.module.ts`), files.module);
    fs.writeFileSync(path.join(basePath, 'dtos', `${entityLower}.dto.ts`), files.dto);

    console.log(`${entityUpper} CRUD with structured folders generated successfully in ${basePath}!`);
};

program
    .name('crud-generator')
    .description('A CLI tool to generate NestJS CRUD modules from a JSON definition')
    .version('1.0.0')
    .argument('<jsonPath>', 'Path to JSON file defining entity')
    .option('-d, --destination <path>', 'Custom destination folder for generated files') // Add custom destination argument
    .action((jsonPath, options) => {
        const entityConfig = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        generateCrud(entityConfig, options.destination); // Pass the custom destination to the function
    });

program.parse(process.argv);

module.exports = { generateCrud };
