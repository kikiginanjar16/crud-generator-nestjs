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
npm install -g crud-generator

```bash
crud-generator <jsonPath> [options]

### Example

```bash
crud-generator user.json
```

Given the following `user.json`:

```json
{
    "name": "User",
    "fields": [
        {
            "name": "username",
            "type": "string"
        },
        {
            "name": "email",
            "type": "string"
        },
        {
            "name": "age",
            "type": "number"
        }
    ]
}
```

This will generate the necessary CRUD files for a `User` entity with `username`, `email`, and `age` fields.