# CRUD Generator for NestJS

This library provides a simple and efficient way to generate CRUD (Create, Read, Update, Delete) operations for your NestJS applications.

## Features

- Automatically generates CRUD endpoints
- Supports TypeORM and Postgresql
- Easy integration with existing NestJS projects

## Installation

To install the library, use npm or yarn:

```bash
npm install crud-generator-nestjs
```

or

```bash
yarn add crud-generator-nestjs
```

## Usage

1. Import the module in your NestJS application:

```typescript
import { CrudGeneratorModule } from 'crud-generator-nestjs';

@Module({
    imports: [CrudGeneratorModule],
})
export class AppModule {}
```

2. Generate CRUD operations for your entities:

```bash
npx crud-generator ./entity.json --destination ./custom-folder
```

This command will create the necessary files and endpoints for the `User` entity.

## Configuration

You can customize the generated templates by creating a `.crudgenrc` file in the root of your project:

```json
{
    "templatePath": "./custom-templates",
    "outputPath": "./src/generated"
}
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License

This project is licensed under the MIT License.