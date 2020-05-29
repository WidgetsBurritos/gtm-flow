'use strict';

const fs = require('fs');

/**
 * Retrieves the trigger hash map.
 */
const getTriggerHashMap = (gtmContainer) => {
  // Build trigger hash map.
  let triggers = {};
  for (const trigger of gtmContainer.containerVersion.trigger) {
    triggers[trigger.triggerId] = trigger;
  }
  return triggers;
};

/**
 * Get Tag Hash Map.
 */
const getTagHashMap = (gtmContainer) => {
  let tags = {};
  for (const tag of gtmContainer.containerVersion.tag) {
    tags[tag.tagId] = tag;
  }
  return tags;
};

/**
 * Get Trigger Tags Hash Map.
 */
const getTagHashMapByTrigger = (gtmContainer) => {
  let triggerTags = { };
  for (const tag of gtmContainer.containerVersion.tag) {
    for (const triggerIdx in tag.firingTriggerId) {
      const triggerId = tag.firingTriggerId[triggerIdx];
      if (typeof triggerTags[triggerId] === 'undefined') {
        triggerTags[triggerId] = {};
      }
      triggerTags[triggerId][tag.tagId] = tag;
    }
  }
  return triggerTags;
};

/**
 * Generates the mermaid syntax for creating the respective flowcharts.
 */
const generateTriggerReportFlowCharts = (gtmContainer) => {
  let flowCharts = [];
  let triggers = getTriggerHashMap(gtmContainer);
  let triggerTags = getTagHashMapByTrigger(gtmContainer);
  for (const triggerId in triggerTags) {
    const trigger = triggers[triggerId];
    // TODO: Why does this condition happen? (trigger.triggerId: 2147479553 -- MAXINT)
    if (!trigger) {
      continue;
    }
    // console.log(trigger);

    const tags = triggerTags[triggerId];
    let template = ['stateDiagram-v2'];
    for (const tagId in tags) {
      const tag = tags[tagId];
      const blockingTriggers = tag.blockingTriggerId && tag.blockingTriggerId.sort() || [];
      let leftId = `trigger${triggerId}`;
      let left = `${leftId}: ${trigger.name}`;
      let labelTokens = [];
      let label = '';
      const farRightId = `tag${tagId}`;
      let rightId = farRightId;
      let id = `trigger${triggerId}`;
      template.push(`\ttag${tagId} : "TAG -- ${tag.name}"`);
      template.push(`\t[*] --> ${id}`);
      template.push(`\t${id} : ${trigger.name}`);
      template.push(`\t${id} --> [*]: Not Triggered`);


      if (~~blockingTriggers.length) {
        for (let i = 0; i < blockingTriggers.length; i++) {
          const blockingTriggerId = blockingTriggers[i];
          const blockingTrigger = triggers[blockingTriggerId];
          rightId = `bTrigger_${triggerId}_${blockingTriggerId}`;
          template.push(`\t${rightId}: ${blockingTrigger.name}`);
          template.push(`\t${rightId} --> [*]: Triggered`);
          const label = i ? 'Not Triggered' : 'Triggered';
          template.push(`\t${leftId} --> ${rightId}: ${label}`);
          leftId = rightId;
        }

      }

      template.push(`\t${leftId} --> ${farRightId}`);
    }
    flowCharts.push(template);
  }
  return flowCharts;
};

/**
 * Retrieves an operation based on specified type.
 */
const getOperation = (type) => {
  switch (type) {
    case 'CONTAINS':
    case 'MATCH_REGEX':
      return '=~';
    case 'STARTS_WITH':
      return '=~^';
    case 'EQUALS':
    default:
      return '=';
  }
};

/**
 * Generates notes
 */
const generateFilterNote = (template, filter) => {
  const type = filter[0].type;
  const params = filter[0].parameter;
  if (params[0].type === 'TEMPLATE') {
    const operation = getOperation(type);
    template.push(`\t\t${params[0].value} ${operation} ${params[1].value}`);
  }
}

const generateTriggerNote = (template, trigger, id) => {
  template.push(`\tnote right of ${id}`);
  template.push(`\t\tType = ${trigger.type}`);
  switch (trigger.type) {
    case 'CLICK':
    case 'JS_ERROR':
    case 'LINK_CLICK':
    case 'YOU_TUBE_VIDEO':
    case 'PAGEVIEW':
    case 'FORM_SUBMISSION':
    //TODO: REMOVE!
      // console.log(trigger);
  }
  if (trigger.autoEventFilter) {
    generateFilterNote(template, trigger.autoEventFilter);
  }
  if (trigger.customEventFilter) {
    generateFilterNote(template, trigger.customEventFilter);
  }
  if (trigger.filter) {
    for (const filter of trigger.filter) {
      const type = filter.type;
      const operation = getOperation(type);
      const left = filter.parameter[0].value;
      const right = filter.parameter[1].value;
      const negate = filter.parameter[2] && filter.parameter[2].key == 'negate' && filter.parameter[2].value === 'true' ? '!' : '';
      template.push(`\t\t${left} ${negate}${operation} ${right}`);
    }
  }
  template.push(`\tend note`);
}

/**
 * Generates the mermaid syntax for creating the respective flowcharts.
 */
const generateTagReportFlowCharts = (gtmContainer) => {
  let flowCharts = [];
  let triggers = getTriggerHashMap(gtmContainer);
  let triggerTags = getTagHashMapByTrigger(gtmContainer);
  let tags = getTagHashMap(gtmContainer);

  for (const tagId in tags) {
    let template = ['stateDiagram-v2'];
    const tag = tags[tagId];
    const firingTriggers = tag.firingTriggerId && tag.firingTriggerId.sort() || [];
    const blockingTriggers = tag.blockingTriggerId && tag.blockingTriggerId.sort() || [];
    let triggerIds = [];
    for (const firingTriggerId of firingTriggers) {
      const trigger = triggers[firingTriggerId];
      // TODO: Why does this condition happen? (trigger.triggerId: 2147479553 -- MAXINT)
      if (!trigger) {
        continue;
      }
      let id = `trigger${firingTriggerId}`;
      template.push(`\t[*] --> ${id}`);
      template.push(`\t${id}: ${trigger.name}`);
      generateTriggerNote(template, trigger, id);
      triggerIds.push(id);
    }
    let first = true;
    let leftId = '[*]';
    let rightId = `tag${tagId}`;
    let label = 'Triggered';
    if (blockingTriggers.length) {
      for (const blockingTriggerId of blockingTriggers) {
        const trigger = triggers[blockingTriggerId];
        rightId = `bTrigger${blockingTriggerId}`;
        // TODO: Why does this condition happen? (trigger.triggerId: 2147479553 -- MAXINT)
        if (!trigger) {
          continue;
        }
        template.push(`\t${rightId} : ${trigger.name}`);
        generateTriggerNote(template, trigger, rightId);
        // Our first time through the loop, link the regular triggers to the first
        // blocking trigger.
        if (first) {
          for (const triggerId of triggerIds) {
            template.push(`\t${triggerId} --> ${rightId} : Triggered`);
            template.push(`\t${triggerId} --> [*]: Not Triggered`);
          }
          first = false;
        }
        else {
          template.push(`\t${leftId} --> ${rightId}: Not Triggered`);
          template.push(`\t${leftId} --> [*]: Triggered`);
        }
        leftId = rightId;
      }
      rightId = `tag${tagId}`;
      template.push(`\t${rightId}: ${tag.name}`);
      template.push(`\t${leftId} --> ${rightId}: Not Triggered`);
      template.push(`\t${leftId} --> [*]: Triggered`)
    }
    else {
      for (const triggerId of triggerIds) {
        template.push(`${triggerId} --> ${rightId} : Triggered`);
        template.push(`${triggerId} --> [*] : Not Triggered`);
      }
    }
    flowCharts.push(template);
  }

  return flowCharts;
};

/**
 * Retrieves the HTML page content.
 */
const getHtmlPage = (content) => {
  // const mermaidJs = fs.readFileSync('./node_modules/mermaid/dist/mermaid.min.js', 'utf8');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Google Tag Manager Flow Charts</title>
  <script src="./node_modules/mermaid/dist/mermaid.min.js"></script>
  <style type="text/css">
  .mermaid {
    border-bottom: 5px dotted #999999;
    color: #ffffff;
    font-size: 12px;
    margin-bottom: 100px;
    padding: 50px 25px;
  }

  /** Conceals weird mermaid.js bug */
  .statediagram-state .label text:not(:first-child) {
    display: none;
  }


  .statediagram-state line {
    display: none;
  }

  .statediagram-state[id^="trigger"] rect {
    fill: #29b6f6 !important;
    stroke: #29b6f6 !important;
  }

  .statediagram-state[id^="trigger"] text {
    fill: #ffffff !important;
  }

  .statediagram-state[id^="bTrigger"] rect {
    fill: #e8710a !important;
    stroke: #e8710a !important;
  }

  .statediagram-state[id^="bTrigger"] text {
    fill: #ffffff !important;
  }

  .statediagram-state[id^="tag"] rect {
    fill: #1a73e8 !important;
    stroke: #1a73e8 !important;
  }

  .statediagram-state[id^="tag"] text {
    fill: #ffffff !important;
  }

  </style>
</head>
<body>
  ${content}
  <script>
    mermaid.initialize({startOnLoad: true, theme: 'neutral'});
  </script>
</body>
</html>`;
}

/**
 * Generates an HTML flow chart based on passed in file.
 */
const generateTriggerReport = (inFile, outFile) => {
  let html = '';
  const gtmContainer = require(inFile);
  const flowCharts = generateTriggerReportFlowCharts(gtmContainer);
  for (const flowChart of flowCharts) {
    const flowChartDetails = flowChart.join("\n");
    console.log(flowChartDetails);
    html += '<div class="mermaid">' + "\n";
    html += flowChartDetails + "\n";
    html += '</div>' + "\n";
  }
  const fullHtml = getHtmlPage(html);
  fs.writeFile(outFile, fullHtml, function (err) {
    if (err) return console.error(err);
  });
}

/**
 * Generates an HTML flow chart based on passed in file.
 */
const generateTagReport = (inFile, outFile) => {
  let html = '';
  const gtmContainer = require(inFile);
  const flowCharts = generateTagReportFlowCharts(gtmContainer);
  for (const flowChart of flowCharts) {
    const flowChartDetails = flowChart.join("\n");
    // console.log(flowChartDetails);
    html += '<div class="mermaid">' + "\n";
    html += flowChartDetails + "\n";
    html += '</div>' + "\n";
  }
  const fullHtml = getHtmlPage(html);
  fs.writeFile(outFile, fullHtml, function (err) {
    if (err) return console.error(err);
  });
}

// TODO: read from command line.
const inFile = '../rackspace-gtm.json';
const outFile = 'tag-report.html';
const reportType = 'tag';

if (reportType == 'trigger') {
  generateTriggerReport(inFile, outFile);
}
else {
  generateTagReport(inFile, outFile);
}
