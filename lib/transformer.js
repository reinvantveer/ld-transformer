'use strict';

const fs = require('fs');
const jsonld = require('jsonld');
const _ = require('lodash');
const Promise = require('bluebird');

function loadPlugin(pluginPath) {
  const plugin = require(pluginPath);

  let isPromise;
  try {
    plugin().then().catch(e => e);
    isPromise = true;
  } catch (e) {
    if (e.message === 'Cannot read property \'then\' of undefined') {
      isPromise = false;
    } else {
      throw e;
    }
  }

  if (!isPromise) throw new Error(`Plugin ${pluginPath} does not return a Promise.`);
  return plugin;
}

function loadPlugins(pluginFolderPath) {
  const plugins = {};
  const pluginFiles = fs.readdirSync(pluginFolderPath)
    .filter(file => file.slice(-3) === '.js');
  pluginFiles.forEach(pluginFilename => {
    const pluginPath = pluginFolderPath + '/' + pluginFilename;
    plugins[pluginFilename.slice(0, -3)] = loadPlugin(pluginPath);
  });
  return plugins;
}

function checkKeys(csvData, context) {
  const missingKeys = [];

  Object.keys(csvData[0]).forEach(key => {
    if (!_.has(context, '@context.' + key)) missingKeys.push(key);
  });

  const bootstrapContext = {};
  missingKeys
    .forEach(missingKey => { bootstrapContext[missingKey] = 'prefix:' + missingKey; });
  if (missingKeys.length) throw Error(`Add ${JSON.stringify(bootstrapContext, null, 2)} to context file.`);
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
      jsonld: 'application/ld+json'
    };
    const compacted = row;
    const subjectKey = context['@subject'];

    Object.keys(compacted).forEach(compactedKey => {
      if (compacted[compactedKey].toLowerCase() === 'null') {
        if (compactedKey === subjectKey) {
          reject(new Error(`Unable to create rdf subject from NULL value on ${subjectKey} at row ${index + 2}`));
          // console.warn(`Unable to drop rdf subject NULL value on ${subjectKey} at row line ${index + 2}`);
        }
        delete compacted[compactedKey];
      }
    });

    compacted['@context'] = context['@context'];
    compacted['@type'] = context['@type'];

    if (!compacted[subjectKey]) return reject(new Error(`There is no column ${subjectKey} in the table, see row: ${JSON.stringify(compacted)}`));
    compacted['@id'] = compacted[subjectKey];

    const processorTasks = context['@preprocessors'] ?
     context['@preprocessors'].map(processor => {
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
      })
        .catch(err => {
          console.error(err);
          return reject(err);
        });
    }) : [Promise.resolve()];

    return Promise.all(processorTasks).then(() => {
        if (format === 'nquads' || format === 'n-quads') { // Aaahhhhh resort to duck-typing
          return jsonld.toRDF(compacted, { format: formats[format] }, (rdfErr, rdfSnippet) => {
            if (rdfErr) return reject(rdfErr);
            if (rdfSnippet === '') {
              return reject(new Error(`Unable to serialize rdf from data "${JSON.stringify(compacted, null, 2)}"`));
            }
            return resolve(rdfSnippet);
          });
        } else if (format === 'json-ld' || format === 'jsonld') {
          return resolve(JSON.stringify(compacted));
        }

        return reject(new Error(`unknown serialization format ${format}`));
      })
        .catch(reject);
  });
}

function transform(csvData, context, format) {
  return Promise.all(csvData.map((row, index) => transformRow(row, context, index, format)));
}

module.exports = { loadPlugin, loadPlugins, checkKeys, checkContext, transformRow, transform };
