const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const basePath = process.cwd();

// File read helper
const getFile = filePath => fs.readFileSync(
  path.resolve(basePath, filePath),
  'utf8'
);

// File write helper
const writeFile = (filePath, data) => fs.writeFileSync(
  path.resolve(basePath, filePath),
  data,
  'utf8'
);

const getDeepValue = (obj, path) =>
  path
    .split('.')
    .reduce(
      (res, prop) => {
        const arrProp = prop.match(/(\w+)\[(\d+)\]$/i);
        if (arrProp) {
          return res ? res[arrProp[1]][Number(arrProp[2])] : undefined;
        }
        return res ? res[prop] : undefined;
      },
      obj
    );

// Extract definitions recursively
const getDefinitions = (config) => {
  let rawFile = getFile(config.path);
  rawFile = rawFile.replace(new RegExp(config.replacePath, 'gmi'), 'definitions');
  return getDeepValue(yaml.load(rawFile), config.definitions);
};

const files =  [
  {
    name: 'Simard',
    path: 'dist/simard.yaml',
    definitions: 'components.schemas',
    replacePath: 'components/schemas',
    out: 'dist/simard.json'
  },
  {
    name: 'DerbysoftProxy',
    path: 'src/derbysoft-proxy.yaml',
    definitions: 'components.schemas',
    replacePath: 'components/schemas',
    out: 'dist/derbysoft.json'
  },
  {
    name: 'Win',
    path: 'dist/win.yaml',
    definitions: 'components.schemas',
    replacePath: 'components/schemas',
    out: 'dist/win.json'
  }
];

// Load root schemas
files.forEach(
  fileConfig => {
    const definitions = getDefinitions(fileConfig);
    return writeFile(
      fileConfig.out,
      JSON
        .stringify(
          {
            $id: fileConfig.name,
            definitions
          },
          null,
          2
        )
    );
  }
);
