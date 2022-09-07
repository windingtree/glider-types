const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const json2ts = require('json-schema-to-typescript');

const basePath = process.cwd();

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

const getDeepValue = (obj, path) =>
  path.split('.').reduce((res, prop) => {
    const arrProp = prop.match(/(\w+)\[(\d+)\]$/i);
    if (arrProp) {
      return res ? res[arrProp[1]][Number(arrProp[2])] : undefined;
    }
    return res ? res[prop] : undefined;
  }, obj);

const getDefinitions = (string) => {
  string = string.replace(/components\/schemas/gim, 'definitions');
  return getDeepValue(yaml.load(string), 'components.schemas');
};

const extractRefs = (string) =>
  Array.from(
    new Set(
      [...string.matchAll(/["']{1}#\/components\/schemas\/([\w\d]+)["']{1}/gm)].map(
        (m) => m[1]
      )
    )
  );

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

// Parse API
const parseApi = (api, defs) => {
  const rawApi = getFile(api.path);
  const apiObj = yaml.load(rawApi);
  const schemas = parseRefs(rawApi, defs);
  return {
    name: api.name,
    swagger: yaml.dump({
      ...apiObj,
      components: {
        schemas
      }
    })
  };
};

const buildTypes = (definitions, name) =>
  json2ts.compile({ definitions }, name, { unreachableDefinitions: true });

const sharedDefinitions = 'src/shared-definitions.yaml';
const supportedApis = [
  {
    name: 'derbysoft-proxy',
    path: 'src/derbysoft-proxy.yaml'
  }
];

const main = async () => {
  const rawShared = getFile(sharedDefinitions);
  const schemas = yaml.load(rawShared);
  const parsedApis = supportedApis.map((api) => parseApi(api, schemas));
  parsedApis.forEach(async (a) => {
    writeFile('dist', `${a.name}.yaml`, a.swagger);
    writeFile(
      'dist',
      `${a.name}.d.ts`,
      await buildTypes(getDefinitions(a.swagger), a.name)
    );
  });
};

main()
  .catch(console.error)
  .then(() => {
    console.log('Build is done');
  });
