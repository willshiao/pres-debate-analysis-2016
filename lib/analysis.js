'use strict';

/************************
* Dependencies
************************/
const Promise = require('bluebird');
const globals = require('./globals');
const TextStatistics = require('text-statistics');
const _ = require('lodash');
const frequency = require('word-frequency');
const path = require('path');
const fs = Promise.promisifyAll(require('fs'));
const IoHandler = require('./io-handler');
const ioHandler = new IoHandler();

const Analysis = function() {};

const proto = Analysis.prototype;
module.exports = Analysis;

/************************
* Functions
************************/
proto.analyzeTranscripts = () => {
  //Load all the transcripts into memory
  const transcriptPaths = fs.readdirSync(globals.PARSED_DIR)
    .filter(fileName => path.extname(fileName) === '.json')
    .map(fileName => path.join(globals.PARSED_DIR, fileName));
  var transcripts = [];
  var analyzed = {}; //Contains speakers and their stats
  var combined = {};

  for(var i in transcriptPaths) {
    try {
      transcripts[i] = globals.TP.resolveAliasesSync(JSON.parse(fs.readFileSync(transcriptPaths[i])));
    } catch(e) {
      transcripts[i] = {};
    }
  }

  _.each(transcripts, transcript => {
    combined = _.merge(combined, transcript);
  });

  // console.log('Merged Transcripts:', combined);
  // console.log(Object.keys(combined.speaker));

  var count = 0;
  _.each(combined.speaker, (lines, speaker) => {
    console.log('Analyzing:', speaker);
    var concatString = "";
    _.each(lines, line => {
      concatString += line;
    });
    console.log('Speaker',speaker,'has',lines.length,'lines.');
    if(lines.length < globals.MIN_LINES) {
      console.log(speaker, 'has fewer lines than minimium of', globals.MIN_LINES+'; Ignore')
      return;
    }
    ioHandler.saveAnalyzed(speaker+'.txt', lines);
    analyzed[speaker] = {};
    analyzed[speaker].frequency = proto.calculateFrequency(concatString);
    analyzed[speaker].stats = proto.calculateStats(concatString);
    ioHandler.saveAnalyzed(speaker+'-frequency.json', JSON.stringify(analyzed[speaker].frequency));
    ioHandler.saveAnalyzed(speaker+'-stats.json', JSON.stringify(analyzed[speaker].stats));
  });
  ioHandler.saveAnalyzed('all.json', JSON.stringify(analyzed));
};

proto.calculateStats = (text) => {
  const stats = TextStatistics(text);
  return {
    textLength: stats.textLength(),
    wordCount: stats.wordCount(),
    smogIndex: stats.smogIndex(),
    fleschKincaidGradeLevel: stats.fleschKincaidGradeLevel(),
    fleschKincaidReadingEase: stats.fleschKincaidReadingEase(),
    colemanLiauIndex: stats.colemanLiauIndex(),
    automatedReadabilityIndex: stats.automatedReadabilityIndex()
  };
};

proto.calculateFrequency = text => {
  var freq = frequency(text);
  freq = _(freq).toPairs().sortBy(wordPair => wordPair[1]).value();
  return freq;
};