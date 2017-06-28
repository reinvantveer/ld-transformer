'use strict';

const fs = require('fs');
const _ = require('lodash');
const jsonld = require('jsonld');
const csv = require('csv');
const Promise = require('bluebird');

function loadPlugin(pluginPath) {
  const plugin = require(pluginPath);

  let isPromise = false;
  try {
    plugin().then().catch(e => e);
    isPromise = true;
  } catch (err) { console.log(err); }

  if (!isPromise) throw new Error(`Plugin ${pluginPath} does not return a valid Promise.`);
  return plugin;
}

function loadPlugins(pluginFolderPath) {
  const plugins = {};
  const pluginFiles = fs.readdirSync(pluginFolderPath)
    .filter(file => file.slice(-3) === '.js');
  pluginFiles.forEach(pluginFilename => {
    const pluginPath = `${pluginFolderPath}/${pluginFilename}`;
    plugins[pluginFilename.slice(0, -3)] = loadPlugin(pluginPath);
  });
  return plugins;
}

function csvParse(filePath) {
  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(filePath);
    csv.parse(fileData, { columns: true }, (parseErr, csvData) => {
      if (parseErr) return reject(parseErr);
      return resolve(csvData);
    });
  });
}

function checkKeys(csvData, context) {
  const missingKeys = [];

  Object.keys(csvData[0]).forEach(key => {
    if (!_.has(context, `@context.${key}`)) missingKeys.push(key);
  });

  const bootstrapContext = {};
  missingKeys
    .forEach(missingKey => { bootstrapContext[missingKey] = `prefix:${missingKey}`; });
  if (missingKeys.length) {
    throw Error(`Add ${JSON.stringify(bootstrapContext, null, 2)} to context file.`);
  }
}

function checkContext(context) {
  if (!context) throw Error('Please supply a non-empty context');
  if (!context['@context']) throw Error('missing "@context" key in context');
  if (!context['@context']['@base']) throw Error('There is no "@base" URL key in "@context"');
  if (!context['@subject']) throw Error('There is no "@subject" key in the context');
  if (!context['@type']) throw Error('There is no "@type" key in the context');
  return 'OK';
}

function transformRow(row, context, index, format, plugins) {
  return new Promise((resolve, reject) => {
    const formats = {
      'n-quads': 'application/nquads',
      nquads: 'application/nquads',
      'json-ld': 'application/ld+json',
      jsonld: 'application/ld+json',
    };
    const compacted = row;
    const subjectKey = context['@subject'];

    Object.keys(compacted).forEach(compactedKey => {
      if (!compacted[compactedKey] || compacted[compactedKey].toLowerCase() === 'null') {
        if (compactedKey === subjectKey) {
          reject(new Error(
            `Unable to create rdf subject from null value on ${subjectKey} at row ${index + 2}`
          ));
          // console.warn(`Unable to drop rdf subject NULL value on
          // ${subjectKey} at row line ${index + 2}`);
        }
        delete compacted[compactedKey];
      }
    });

    compacted['@context'] = context['@context'];
    compacted['@type'] = context['@type'];

    if (!compacted[subjectKey]) {
      return reject(new Error(
        `There is no column ${subjectKey} in the table, see row: ${JSON.stringify(compacted)}`
      ));
    }
    compacted['@id'] = compacted[subjectKey];

    let processorTasks;
    if (context['@preprocessors']) {
      processorTasks = context['@preprocessors'].map(processor => {
        if (!processor.inputFields) reject(new Error('Unable to process empty input fields'));
        return plugins[processor.pluginName](
          processor.inputFields.map(field => {
            console.log(compacted[field]);
            return compacted[field];
          }),
          processor.arguments
        ).then(output => {
          console.log(output);
          compacted[processor.outputField] = output;
          return console.log(compacted[processor.outputField]);
        }).catch(err => {
          console.error(err);
          return reject(err);
        });
      });
    } else { // Create a dummy list of tasks to Promise.all()
      processorTasks = [Promise.resolve()];
    }

    return Promise.all(processorTasks)
      .then(() => {
        if (format === 'nquads' || format === 'n-quads') { // Aaahhhhh resort to duck-typing
          return jsonld.toRDF(compacted, { format: formats[format] }, (rdfErr, rdfSnippet) => {
            if (rdfErr) return reject(rdfErr);
            if (rdfSnippet === '') {
              return reject(new Error(
                `Unable to serialize rdf from data "${JSON.stringify(compacted, null, 2)}"`
              ));
            }
            return resolve(rdfSnippet);
          });
        } else if (format === 'json-ld' || format === 'jsonld') {
          return resolve(JSON.stringify(compacted));
        }

        return reject(new Error(`unknown serialization format '${format}'`));
      }).catch(reject);
  });
}

function transform(csvData, context, format) {
  return Promise.all(csvData.map((row, index) => transformRow(row, context, index, format)));
}

module.exports = {
  loadPlugin,
  loadPlugins,
  csvParse,
  checkKeys,
  checkContext,
  transformRow,
  transform,
};
