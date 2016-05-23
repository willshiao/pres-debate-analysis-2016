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



/************************
* Functions
************************/

function analyzeTranscripts() {
  //Load all the transcripts into memory
  const transcriptPaths = fs.readdirSync(globals.PARSED_DIR)
    .filter(fileName => path.extname(fileName) === '.json')
    .map(fileName => path.join(globals.PARSED_DIR, fileName));
  var transcripts = [];
  var trump = [];

  for(var i in transcriptPaths) {
    transcripts[i] = globals.TP.resolveAliasesSync(JSON.parse(fs.readFileSync(transcriptPaths[i])));
  }

  var count = 0;
  _.each(transcripts, transcript => {
    _.each(transcript.speaker, (lines, speaker) => {
      if(speaker == 'TRUMP') {
        console.log('Trump found.');
        trump.push(transcript.speaker.TRUMP);
      }
      count += lines.length;
    });
  });

  fs.writeFileSync(path.join(globals.ANALYSIS_DIR, 'trump.json'), JSON.stringify(trump));
  var concatString = "";
  _.each(trump, lines => {
    _.each(lines, line => {
      concatString += line;
    });
  });
  fs.writeFileSync(path.join(globals.ANALYSIS_DIR, 'trump-frequency.json'), JSON.stringify((frequency(concatString))));
  const stats = TextStatistics(concatString);
  const trumpStats = {
    textLength: stats.textLength(),
    wordCount: stats.wordCount(),
    smogIndex: stats.smogIndex(),
    fleschKincaidGradeLevel: stats.fleschKincaidGradeLevel(),
    fleschKincaidReadingEase: stats.fleschKincaidReadingEase(),
    colemanLiauIndex: stats.colemanLiauIndex(),
    automatedReadabilityIndex: stats.automatedReadabilityIndex()
  };
  fs.writeFileSync(path.join(globals.ANALYSIS_DIR, 'trump-stats.json'), JSON.stringify(trumpStats));

  console.log('Line Count:', count);
}