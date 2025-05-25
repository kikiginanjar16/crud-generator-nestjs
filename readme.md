# CRUD Generator for NestJS

A CLI tool to generate NestJS CRUD modules from a JSON definition. This tool simplifies the process of creating standard CRUD operations (Create, Read, Update, Delete) for your NestJS entities.

## Features
- Generate NestJS `Entity`, `Controller`, `Service`, `Module`, and `DTO` files.
- Automatically pluralizes entity names.
- Supports custom destination folder for generated files.
- Easy to use and integrates seamlessly with your NestJS project.

## Installation

### Global Installation

To install the tool globally, run the following command:

```bash
npm install -g crud-generator-nestjs

npm i crud-generator-nestjs

```bash
crud-generator-nestjs <jsonPath> [options]

### Example

```bash
crud-generator-nestjs example.json
```

Given the following `example.json`:

```json
[
  {
    "name": "todo",
    "entity": "todo",
    "routes": "todos",
    "idType": "uuid",
    "fields": [
      {
        "name": "title",
        "type": "varchar",
        "length": 255,
        "unique": false,
        "nullable": false,
        "description": "Title of the todo item",
        "example": "Complete project report"
      },
      {
        "name": "total",
        "type": "float",
        "description": "Total of the todo item",
        "example": 0
      },
      {
        "name": "description",
        "type": "text",
        "unique": false,
        "nullable": true,
        "description": "Detailed description of the todo item",
        "example": "Write and review the final report for the Q2 project"
      },
      {
        "name": "status",
        "type": "enum",
        "enumValues": ["pending", "in_progress", "completed"],
        "tsEnumName": "TodoStatus",
        "description": "Current status of the todo item",
        "example": "pending"
      },
      {
        "name": "due_date",
        "type": "date",
        "unique": false,
        "nullable": true,
        "description": "Due date for the todo item",
        "example": "2025-06-01"
      },
      {
        "name": "user_id",
        "type": "uuid",
        "unique": false,
        "nullable": false,
        "description": "ID of the user who owns this todo item",
        "example": "123e4567-e89b-12d3-a456-426614174000"
      }
    ]
  }
]
```

This will generate the necessary CRUD files for a `User` entity with `username`, `email`, and `age` fields.