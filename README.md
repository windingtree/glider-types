# glider-types

Typescript types, JSON schemas and swagger configuration files of Glider projects: Derbysoft Proxy, ...

## Getting started

```bash
yarn add @windingtree/glider-types
```

## Swagger configuration files

```javascript
const fs = require('fs');
const path = require('path');

// Importing the swagger doc
const doc = fs.readFileSync(
  path.resolve('node_modules', '@windingtree/glider-types/dist/derbysoft_proxy.yaml'),
  'utf8'
);
```

## JSON schemas

```typescript
import { derbysoft_proxy } from '@windingtree/glider-types';

// derbysoft_proxy.definitions.Price
// ...
```

## Typescript types

```typescript
import type { Price } from '@windingtree/glider-types/dist/derbysoft_proxy';
```

## Swagger schema definitions management

All schema definitions are collected in the commonly shared file located at `./src/shared-definitions.yaml`.

Project-specific swagger configuration files are located in the named files like `./src/derbysoft-proxy.yaml`.

Project-specific swagger configuration files should not contain any data type definitions. Instead of that, all links to the definitions must be organized using schema references like `$ref: "#components/schemas/DefinitionKey"`.

During the module build, all definitions that have been referred to will be built in the final swagger file of every specific project.

## Definitions rules

Every definition must follow these mandatory rules:

- Must have unique CamelCase styled key
- Must have description
- Must have definition of properties types
- Must have definition of required properties
- Must have an example of usage

If it is required, a definition can have format validation rules in regular expressions format or native rules supported by swagger.

## Supported projects

- The accommodations API
- Simard

To add new project:

- Add project configuration to the `./scripts/build.js` to the `supportedApis` constant at line 11 in format:

```javascript
{
  name: 'project-name', // Unique project name
  path: 'src/project-name.yaml' // Base project swagger file
}
```

- Create a swagger file by the pointed path

## Contribution

Please check the [CONTRIBUTING.md](./CONTRIBUTING.md)
