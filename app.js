'use strict';

/************************
* Dependencies
************************/

const Promise = require('bluebird');
const rp = require('request-promise');
const cheerio = require('cheerio');
const TranscriptParser = require('transcript-parser');
const _ = require('lodash');
const moment = require('moment');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const sanitize = require('sanitize-filename');
const frequency = require('word-frequency');
const TextStatistics = require('text-statistics');

/************************
* Constants
************************/

const CUTOFF_DATE = new Date(2015, 0);
const NAME_REGEX = /(.+)\ in\ ([A-z\ ]+(?:, )?[A-z\ ]+)/;
const RAW_DIR = 'transcripts/raw';
const PARSED_DIR = 'transcripts/parsed';
const ANALYSIS_DIR = 'transcripts/analysis';

//Intialize transcript parser
const tp = new TranscriptParser({
  aliases: {
    'TRUMP': [ /.*TRUMP.*/ ]
  }
});

/************************
* Body
************************/
// analyzeTranscripts();
cleanFolders()
  //Save the transcripts
  .then(saveTranscripts)
  //Parse the transcripts
  .then(parseTranscripts)
  .then(analyzeTranscripts);


/************************
* Functions
************************/

function cleanFolders() {
  const q = [ cleanFolder(RAW_DIR, 'txt'),
  cleanFolder(PARSED_DIR, 'json'),
  cleanFolder(ANALYSIS_DIR, 'json') ];
  return Promise.all(q);
}

function cleanFolder(folderPath, extension) {
  return fs.readdirAsync(folderPath).then(list => {
    const q = [];
    list = list.filter(fileName => path.extname(fileName) === '.'+extension);
    _.each(list, fileName => {
      q.push(fs.unlinkAsync(path.join(folderPath, fileName)));
    });
    return Promise.all(q);
  });
}

function analyzeTranscripts() {
  //Load all the transcripts into memory
  const transcriptPaths = fs.readdirSync(PARSED_DIR)
    .filter(fileName => path.extname(fileName) === '.json')
    .map(fileName => path.join(PARSED_DIR, fileName));
  var transcripts = [];
  var trump = [];

  for(var i in transcriptPaths) {
    transcripts[i] = tp.resolveAliasesSync(JSON.parse(fs.readFileSync(transcriptPaths[i])));
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

  fs.writeFileSync(path.join(ANALYSIS_DIR, 'trump.json'), JSON.stringify(trump));
  var concatString = "";
  _.each(trump, lines => {
    _.each(lines, line => {
      concatString += line;
    });
  });
  fs.writeFileSync(path.join(ANALYSIS_DIR, 'trump-frequency.json'), JSON.stringify((frequency(concatString))));
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
  fs.writeFileSync(path.join(ANALYSIS_DIR, 'trump-stats.json'), JSON.stringify(trumpStats));

  console.log('Line Count:', count);
}

function parseTranscripts() {
  return fs.readdirAsync(RAW_DIR)
    .then(files => {
      console.log('Files:', files);
      const fileQ = files
        .filter(fileName => path.extname(fileName)==='.txt')
        .map(fileName => {
          return Promise.fromCallback(cb => tp.parseStream(fs.createReadStream(path.join(RAW_DIR, fileName)), cb))
            .then(parsed => {
              fs.writeFileAsync(path.join(PARSED_DIR, fileName.replace('.txt', '.json')), 
                JSON.stringify(parsed));
            });
        });
      return Promise.all(fileQ);
    })
    .then(() => console.log('Done!'));
}

function saveTranscripts() {
  var debateList;
  return getDebateList().then(list => {
    debateList = list;
    return Promise.each(list, (item, i) => {
      return getDebateTranscript(item.url)
        .then(script => {
          debateList[i].fileName = sanitize(item.name + '-' + item.location.replace(',', '_') + '.txt');
          return fs.writeFileAsync(path.join(RAW_DIR, debateList[i].fileName), script);
        });
    });
  }).then(() => {
    return fs.writeFileAsync(path.join(RAW_DIR, 'summary.json'), JSON.stringify(debateList));
  });
}

function getDebateList() {
  const options = {
    uri: 'http://www.presidency.ucsb.edu/debates.php',
    transform: body => cheerio.load(body)
  };
  return rp(options)
    .then($ => {
      //Why are there 5 tables nested in each other? I don't know.
      var tableRows = $('table table table table table tr').toArray();
      const list = tableRows
        .map(row => {
          const debateDate = moment($(row).find('td.docdate').text(), 'MMM Do, YYYY');
          const debateUrl = $(row).find('td.doctext>a').attr('href');
          const debateInfo = $(row).find('td.doctext').text().match(NAME_REGEX);
          if(!debateDate.isValid() || !debateInfo || debateInfo.length < 3)
            return false;
          const debateName = debateInfo[1];
          const debateLocation = debateInfo[2];

          return {date: debateDate.toDate(), name: debateName, location: debateLocation, url: debateUrl};
        })
        .filter(row => {
          if(!row || !row.url || row.date < CUTOFF_DATE) {
            return false;
          }
          return true;
        });
      return Promise.resolve(list);
    });
}

function getDebateTranscript(url) {
  const options = {
    uri: url,
    transform: body => cheerio.load(body)
  };
  return rp(options)
    .then($ => {
      const transcriptLines = $('.displaytext p').toArray()
        .map(line => $(line).text());
      // console.log(transcriptLines.join('\n'));
      return Promise.resolve(transcriptLines.join('\n'));
    });
}