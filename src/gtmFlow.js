const fs = require('fs');

/**
 * A list of global triggers.
 */
const globalTriggers = {
  2147479553: {
    name: 'All Pages',
    type: 'global',
  },
};


/**
 * Retrieves the trigger hash map.
 */
const getTriggerHashMap = (gtmContainer) => {
  // Build trigger hash map.
  const triggers = globalTriggers;
  gtmContainer.containerVersion.trigger.forEach((trigger) => {
    triggers[trigger.triggerId] = trigger;
  });
  return triggers;
};

/**
 * Get Tag Hash Map.
 */
const getTagHashMap = (gtmContainer) => {
  const tags = {};
  gtmContainer.containerVersion.tag.forEach((tag) => {
    tags[tag.tagId] = tag;
  });
  return tags;
};

/**
 * Get Trigger Tags Hash Map.
 */
const getTagHashMapByTrigger = (gtmContainer) => {
  const triggerTags = { };
  gtmContainer.containerVersion.tag.forEach((tag) => {
    if (tag.firingTriggerId) {
      tag.firingTriggerId.forEach((triggerId) => {
        if (typeof triggerTags[triggerId] === 'undefined') {
          triggerTags[triggerId] = {};
        }
        triggerTags[triggerId][tag.tagId] = tag;
      });
    }
  });
  return triggerTags;
};

/**
 * Generates the mermaid syntax for creating the respective flowcharts.
 */
const generateTriggerReportFlowCharts = (gtmContainer) => {
  const flowCharts = [];
  const triggers = getTriggerHashMap(gtmContainer);
  const triggerTags = getTagHashMapByTrigger(gtmContainer);
  Object.keys(triggerTags).forEach((triggerId) => {
    const trigger = triggers[triggerId];
    const tags = triggerTags[triggerId];
    const template = ['stateDiagram-v2'];
    Object.values(tags).forEach((tag) => {
      const blockingTriggers = (tag.blockingTriggerId && tag.blockingTriggerId.sort()) || [];
      let leftId = `trigger${triggerId}`;
      const farRightId = `tag${tag.tagId}`;
      let rightId = farRightId;
      const id = `trigger${triggerId}`;
      template.push(`\ttag${tag.tagId}: ${tag.name}`);
      template.push(`\t[*] --> ${id}`);
      template.push(`\t${id}: ${trigger.name}`);
      template.push(`\t${id} --> [*]: Not Triggered`);

      let first = true;
      blockingTriggers.forEach((blockingTriggerId) => {
        const blockingTrigger = triggers[blockingTriggerId];
        rightId = `bTrigger_${triggerId}_${blockingTriggerId}`;
        template.push(`\t${rightId}: ${blockingTrigger.name}`);
        template.push(`\t${rightId} --> [*]: Triggered`);
        const label = first ? 'Triggered' : 'Not Triggered';
        template.push(`\t${leftId} --> ${rightId}: ${label}`);
        leftId = rightId;
        first = false;
      });

      template.push(`\t${leftId} --> ${farRightId}`);
    });
    flowCharts.push(template);
  });
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
 * Generates notes for filters.
 */
const generateFilterNote = (template, filter) => {
  if (filter && filter[0]) {
    const { type, parameter } = filter[0];
    // const params = filter[0].parameter;
    if (parameter[0].type === 'TEMPLATE') {
      const operation = getOperation(type);
      template.push(`\t\t${parameter[0].value} ${operation} ${parameter[1].value}`);
    }
  }
};

/**
 * Generates notes for triggers.
 */
const generateTriggerNote = (template, trigger, id) => {
  template.push(`\tnote right of ${id}`);
  template.push(`\t\tType = ${trigger.type}`);

  [trigger.autoEventFilter, trigger.customEventFilter].forEach((filter) => {
    generateFilterNote(template, filter);
  });

  if (trigger.filter) {
    trigger.filter.forEach((filter) => {
      const { type, parameter } = filter;
      const operation = getOperation(type);
      const left = parameter[0].value;
      const right = parameter[1].value;
      const negate = parameter[2] && parameter[2].key === 'negate' && parameter[2].value === 'true' ? '!' : '';
      template.push(`\t\t${left} ${negate}${operation} ${right}`);
    });
  }

  template.push('\tend note');
};

/**
 * Generates the mermaid syntax for creating the respective flowcharts.
 */
const generateTagReportFlowCharts = (gtmContainer) => {
  const flowCharts = [];
  const triggers = getTriggerHashMap(gtmContainer);
  const tags = getTagHashMap(gtmContainer);

  Object.values(tags).forEach((tag) => {
    const template = ['stateDiagram-v2'];
    const firingTriggers = (tag.firingTriggerId && tag.firingTriggerId.sort()) || [];
    const blockingTriggers = (tag.blockingTriggerId && tag.blockingTriggerId.sort()) || [];
    const triggerIds = [];
    firingTriggers.forEach((firingTriggerId) => {
      const trigger = triggers[firingTriggerId];
      const id = `trigger${firingTriggerId}`;
      template.push(`\t[*] --> ${id}`);
      template.push(`\t${id}: ${trigger.name}`);
      generateTriggerNote(template, trigger, id);
      triggerIds.push(id);
    });
    let first = true;
    let leftId = '[*]';
    let rightId = `tag${tag.tagId}`;
    if (blockingTriggers.length) {
      blockingTriggers.forEach((blockingTriggerId) => {
        const trigger = triggers[blockingTriggerId];
        rightId = `bTrigger${blockingTriggerId}`;
        // TODO: Why does this condition happen? (trigger.triggerId: 2147479553 -- MAXINT)
        if (!trigger) {
          return;
        }
        template.push(`\t${rightId} : ${trigger.name}`);
        generateTriggerNote(template, trigger, rightId);
        // Our first time through the loop, link the regular triggers to the first
        // blocking trigger.
        if (first) {
          triggerIds.forEach((triggerId) => {
            template.push(`\t${triggerId} --> ${rightId} : Triggered`);
            template.push(`\t${triggerId} --> [*]: Not Triggered`);
          });
          first = false;
        } else {
          template.push(`\t${leftId} --> ${rightId}: Not Triggered`);
          template.push(`\t${leftId} --> [*]: Triggered`);
        }
        leftId = rightId;
      });
      rightId = `tag${tag.tagId}`;
      template.push(`\t${rightId}: ${tag.name}`);
      template.push(`\t${leftId} --> ${rightId}: Not Triggered`);
      template.push(`\t${leftId} --> [*]: Triggered`);
    } else {
      triggerIds.forEach((triggerId) => {
        template.push(`${triggerId} --> ${rightId} : Triggered`);
        template.push(`${triggerId} --> [*] : Not Triggered`);
      });
    }
    flowCharts.push(template);
  });

  return flowCharts;
};

/**
 * Retrieves the HTML page content.
 */
const getHtmlPage = (content) => `<!DOCTYPE html>
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

/**
 * Parses a JSON file.
 */
const parseJsonFile = (inFile) => {
  // TODO: Exception handling.
  const json = fs.readFileSync(inFile);
  return JSON.parse(json);
};

/**
 * Generates the HTML for a specified flow chart.
 */
const generateFlowChartHtml = (inFile, callback) => {
  const gtmContainer = parseJsonFile(inFile);
  const flowCharts = callback(gtmContainer);

  let html = '';
  flowCharts.forEach((flowChart) => {
    const flowChartDetails = flowChart.join('\n');
    // console.log(`${flowChartDetails}\n`);
    html += `<div class="mermaid">\n${flowChartDetails}\n</div>\n\n`;
  });
  return getHtmlPage(html);
};

/**
 * Handles errors saving report files.
 */
const outFileErrorHandler = (err) => {
  if (err) {
    console.error(err);
    throw err;
  }
};

/**
 * Generates an HTML flow chart based on passed in file.
 */
const generateTriggerReport = (inFile, outFile) => {
  const html = generateFlowChartHtml(inFile, generateTriggerReportFlowCharts);
  fs.writeFile(outFile, html, outFileErrorHandler);
};

/**
 * Generates an HTML flow chart based on passed in file.
 */
const generateTagReport = (inFile, outFile) => {
  const html = generateFlowChartHtml(inFile, generateTagReportFlowCharts);
  fs.writeFile(outFile, html, outFileErrorHandler);
};

module.exports = {
  generateFilterNote,
  generateFlowChartHtml,
  generateTagReport,
  generateTagReportFlowCharts,
  generateTriggerNote,
  generateTriggerReport,
  generateTriggerReportFlowCharts,
  getHtmlPage,
  getOperation,
  getTagHashMap,
  getTagHashMapByTrigger,
  getTriggerHashMap,
  outFileErrorHandler,
  parseJsonFile,
};
