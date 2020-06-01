const gtmFlow = require('./gtmFlow');

// TODO: read from command line.
const inFile = 'rackspace-gtm.json';
const outFile = 'tag-report.html';
const reportType = 'tag';

if (reportType === 'trigger') {
  gtmFlow.generateTriggerReport(inFile, outFile);
} else {
  gtmFlow.generateTagReport(inFile, outFile);
}
