'use strict';

/************************
* Dependencies
************************/
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const globals = require('./globals');
const sanitize = require('sanitize-filename');
const path = require('path');
const _ = require('lodash');
const HttpHandler = require('./http-handler');
const httpHandler = new HttpHandler();

const IoHandler = function() {};

const proto = IoHandler.prototype;
module.exports = IoHandler;

/************************
* Functions
***********************/

proto.saveTranscripts = () => {
  var debateList;
  return httpHandler.getDebateList().then(list => {
    debateList = list;
    return Promise.each(list, (item, i) => {
      return httpHandler.getDebateTranscript(item.url)
        .then(script => {
          debateList[i].fileName = sanitize(item.name + '-' + item.location.replace(',', '_') + '.txt');
          return fs.writeFileAsync(path.join(globals.RAW_DIR, debateList[i].fileName), script);
        });
    });
  }).then(() => {
    return fs.writeFileAsync(path.join(globals.RAW_DIR, 'summary.json'), JSON.stringify(debateList));
  });
};

proto.saveAnalyzed = (fileName, contents) => {
  return fs.writeFileSync(path.join(globals.ANALYSIS_DIR, sanitize(fileName)), contents);
};

proto.cleanFolders = () => {
  const q = [ proto.cleanFolder(globals.RAW_DIR, 'txt'),
  proto.cleanFolder(globals.PARSED_DIR, 'json'),
  proto.cleanFolder(globals.ANALYSIS_DIR, 'json'),
  proto.cleanFolder(globals.ANALYSIS_DIR, 'txt') ];
  return Promise.all(q);
};

proto.cleanFolder = (folderPath, extension) => {
  return fs.readdirAsync(folderPath).then(list => {
    const q = [];
    list = list.filter(fileName => path.extname(fileName) === '.'+extension);
    _.each(list, fileName => {
      q.push(fs.unlinkAsync(path.join(folderPath, fileName)));
    });
    return Promise.all(q);
  });
};

proto.parseTranscripts = () => {
  return fs.readdirAsync(globals.RAW_DIR)
    .then(files => {
      console.log('Files:', files);
      const fileQ = files
        .filter(fileName => path.extname(fileName)==='.txt')
        .map(fileName => {
          return Promise.fromCallback(cb => globals.TP.parseStream(fs.createReadStream(path.join(globals.RAW_DIR, fileName)), cb))
            .then(parsed => {
              fs.writeFileAsync(path.join(globals.PARSED_DIR, fileName.replace('.txt', '.json')), 
                JSON.stringify(parsed));
            });
        });
      return Promise.all(fileQ);
    })
    .then(() => console.log('Done!'));
};
