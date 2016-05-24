'use strict';

const Globals = {};

Globals.CUTOFF_DATE = new Date(2015, 0);
Globals.NAME_REGEX = /(.+)\ in\ ([A-z\ ]+(?:, )?[A-z\ ]+)/;
Globals.RAW_DIR = 'transcripts/raw';
Globals.PARSED_DIR = 'transcripts/parsed';
Globals.ANALYSIS_DIR = 'transcripts/analysis';
Globals.MIN_LINES = 5;

module.exports = Globals;