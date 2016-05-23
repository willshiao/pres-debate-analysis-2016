'use strict';

/************************
* Dependencies
************************/
const globals = require('./globals');

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const cheerio = require('cheerio');
const rp = require('request-promise');
const moment = require('moment');


const httpHandler = function() {};
module.exports = httpHandler;

const proto = httpHandler.prototype;


/************************
* Functions
************************/

proto.getDebateList = () => {
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
          const debateInfo = $(row).find('td.doctext').text().match(globals.NAME_REGEX);
          if(!debateDate.isValid() || !debateInfo || debateInfo.length < 3)
            return false;
          const debateName = debateInfo[1];
          const debateLocation = debateInfo[2];

          return {date: debateDate.toDate(), name: debateName, location: debateLocation, url: debateUrl};
        })
        .filter(row => {
          if(!row || !row.url || row.date < globals.CUTOFF_DATE) {
            return false;
          }
          return true;
        });
      return Promise.resolve(list);
    });
};

proto.getDebateTranscript = url => {
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
};