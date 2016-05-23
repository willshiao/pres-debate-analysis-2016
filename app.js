'use strict';

/************************
* Dependencies
************************/
const Promise = require('bluebird');
const TranscriptParser = require('transcript-parser');
const fs = Promise.promisifyAll(require('fs'));
const frequency = require('word-frequency');
const globals = new require('./lib/globals');
const httpHandler = require('./lib/http-handler');
const IoHandler = require('./lib/io-handler');
const ioHandler = new IoHandler();
const analysis = require('./lib/analysis');

/************************
* Constants
************************/
//Intialize transcript parser
globals.TP = new TranscriptParser({
  aliases: {
    'TRUMP': [ /.*TRUMP.*/ ]
  }
});

/************************
* Body
************************/
// analyzeTranscripts();
ioHandler.cleanFolders()
  //Save the transcripts
  .then(ioHandler.saveTranscripts)
  //Parse the transcripts
  .then(ioHandler.parseTranscripts)
  .then(analysis.analyzeTranscripts);