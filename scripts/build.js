const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const json2ts = require('json-schema-to-typescript');

// The path from where the script has been started
const basePath = process.cwd();

// Basic build configuration
const sharedDefinitions = 'src/shared-definitions.yaml';
const supportedApis = [
  {
    name: 'derbysoft-proxy',
    path: 'src/derbysoft-proxy.yaml'
  }
];

// File read helper
const getFile = (filePath) => fs.readFileSync(path.resolve(basePath, filePath), 'utf8');

// File write helper
const writeFile = (dir, name, data) => {
  dir = path.resolve(basePath, dir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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
        schemas
      }
    }),
    schemas
  };
};

// Generates typescript types from definitions
const buildTypes = (definitions, name) =>
  json2ts.compile({ definitions }, name, { unreachableDefinitions: true });

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

// The main build script file
const main = async () => {
  const rawShared = getFile(sharedDefinitions);
  const schemas = yaml.load(rawShared);
  const parsedApis = supportedApis.map((api) => parseApi(api, schemas));
  parsedApis.forEach(async (a) => {
    writeFile('dist', `${a.name}.yaml`, a.swagger);
    const definitions = getDefinitions(a.swagger);
    writeFile('dist', `${a.name}.d.ts`, await buildTypes(definitions, a.name));
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
  });
  buildTypesIndex();
  buildJsonSchemasIndex();
};

main()
  .catch(console.error)
  .then(() => {
    console.log('Build is done');
  });
