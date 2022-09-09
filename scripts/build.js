const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const yaml = require('js-yaml');
const json2ts = require('json-schema-to-typescript');
const handlebars = require('handlebars');

// The path from where the script has been started
const basePath = process.cwd();

// Basic build configuration
const sharedDefinitions = 'src/shared-definitions.yaml';
const supportedApis = [
  {
    name: 'accommodations',
    path: 'src/accommodations.yaml'
  }
];

// Async exec
const execAsync = (command) =>
  new Promise((resolve, reject) => {
    exec(command, (error, value) => (error ? reject(error) : resolve(value)));
  });

// File read helper
const getFile = (filePath) => fs.readFileSync(path.resolve(basePath, filePath), 'utf8');

// Create dir if not exists
const createDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// File write helper
const writeFile = (dir, name, data) => {
  dir = path.resolve(basePath, dir);
  createDir(dir);
  return fs.writeFileSync(`${dir}/${name}`, data, 'utf8');
};

// Gets the value from  the object by path
const getDeepValue = (obj, path) =>
  path.split('.').reduce((res, prop) => {
    const arrProp = prop.match(/(\w+)\[(\d+)\]$/i);
    if (arrProp) {
      return res ? res[arrProp[1]][Number(arrProp[2])] : undefined;
    }
    return res ? res[prop] : undefined;
  }, obj);

// Return definitions value from the string
const getDefinitions = (string) => {
  string = string.replace(/components\/schemas/gim, 'definitions');
  return getDeepValue(yaml.load(string), 'components.schemas');
};

// Extracts refs from string
const extractRefs = (string) =>
  Array.from(
    new Set(
      [...string.matchAll(/["']{1}#\/components\/schemas\/([\w\d]+)["']{1}/gm)].map(
        (m) => m[1]
      )
    )
  );

// Build schemas object using recursion
const parseRefs = (string, defs) => {
  const refs = extractRefs(string);
  let schemas = refs
    .map((r) => ({
      [r]: defs.components.schemas[r]
    }))
    .reduce((a, v) => (v ? { ...a, ...v } : a), {});
  const dump = yaml.dump(schemas);
  const subRefs = extractRefs(yaml.dump(schemas));
  if (subRefs.length > 0) {
    schemas = {
      ...schemas,
      ...parseRefs(dump, defs)
    };
  }
  return schemas;
};

// Normalize name string
const normalizeName = (name) => name.replace(/[-.]+/, '_');

// Parse API
const parseApi = (api, defs) => {
  const rawApi = getFile(api.path);
  const apiObj = yaml.load(rawApi);
  const schemas = parseRefs(rawApi, defs);
  return {
    name: normalizeName(api.name),
    swagger: yaml.dump({
      ...apiObj,
      components: {
        securitySchemes: defs.components.securitySchemes,
        schemas
      }
    }),
    schemas
  };
};

// Generates typescript types from definitions
const buildTypes = (definitions, name) =>
  json2ts.compile({ definitions }, name, { unreachableDefinitions: true });

// Build dist files
const buildDist = async () => {
  const schemas = yaml.load(getFile(sharedDefinitions));
  const parsedApis = supportedApis.map((api) => parseApi(api, schemas));
  await Promise.all(
    parsedApis.map(async (a) => {
      // save swagger file
      writeFile('dist', `${a.name}.yaml`, a.swagger);
      const definitions = getDefinitions(a.swagger);
      // save types
      writeFile('dist', `${a.name}.d.ts`, await buildTypes(definitions, a.name));
      // save JSON schema
      writeFile(
        'dist',
        `${a.name}.json`,
        JSON.stringify(
          {
            $id: a.name,
            definitions
          },
          null,
          2
        )
      );
    })
  );
};

// Generates types index file (index.d.ts)
const buildTypesIndex = () => {
  const content = `${supportedApis
    .map(
      (a) =>
        `import * as ${normalizeName(a.name)} from './${normalizeName(a.name)}.d.ts';`
    )
    .join('\n')}
export { ${supportedApis.map((a) => normalizeName(a.name)).join(', ')} }
`;
  writeFile('dist', 'index.d.ts', content);
};

// Generates schemas index file (index.ts)
const buildJsonSchemasIndex = () => {
  const content = `${supportedApis
    .map(
      (a) =>
        `const ${normalizeName(a.name)} = require('./${normalizeName(a.name)}.json');`
    )
    .join('\n')}
module.exports = { ${supportedApis.map((a) => normalizeName(a.name)).join(', ')} };
`;
  writeFile('dist', 'index.js', content);
};

const buildPages = async () => {
  createDir('pages');
  await execAsync('cp -r ./src/ui/static/* ./pages');
  const indexHtml = handlebars.compile(getFile('./pages/index.html'));
  writeFile(
    'pages',
    'index.html',
    indexHtml({ projects: supportedApis.map((a) => normalizeName(a.name)) })
  );
  supportedApis.forEach(async (a) => {
    createDir(`pages/${normalizeName(a.name)}`);
    await execAsync(
      `cp ./dist/${normalizeName(a.name)}.yaml ./pages/${normalizeName(
        a.name
      )}/swagger.yaml`
    );
    await execAsync(`cp -r ./src/ui/project/* ./pages/${normalizeName(a.name)}`);
  });
};

// The main build script file
const main = async () => {
  await buildDist();
  buildTypesIndex();
  buildJsonSchemasIndex();
  await buildPages();
};

main()
  .catch(console.error)
  .then(() => {
    console.log('Build is done');
  });
