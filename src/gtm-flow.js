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
 * Adds a left and right portion to a template array.
 */
const addToTemplate = (template, left, right, actionLabel = false) => {
  if (actionLabel) {
    template.push(`\trigger${left} -->|${actionLabel}| ${right}`);
  }
  else {
    template.push(`\trigger${left} --> ${right}`);
  }
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
      let left = `state "${trigger.name}" as ${leftId}`;
      let labelTokens = [];
      let label = '';
      const farRightId = `tag${tagId}`;
      let rightId = farRightId;
      let id = `trigger${triggerId}`;
      template.push(`tag${tagId} : "TAG -- ${tag.name}"`);
      template.push(`[*] --> ${id}`);
      template.push(`${id} : ${trigger.name}`);
      template.push(`${id} --> [*]: Not Triggered`);


      if (~~blockingTriggers.length) {
        for (let i = 0; i < blockingTriggers.length; i++) {
          const blockingTriggerId = blockingTriggers[i];
          const blockingTrigger = triggers[blockingTriggerId];
          rightId = `bTrigger_${triggerId}_${blockingTriggerId}`;
          template.push(`state "EXCEPTION TRIGGER ${blockingTrigger.name}" as ${rightId}`);
          template.push(`${rightId} --> [*]: Triggered`);
          const label = i ? 'Not Triggered' : 'Triggered';
          template.push(`${leftId} --> ${rightId}: ${label}`);
          leftId = rightId;
        }

      }

      template.push(`${leftId} --> ${farRightId}`);
    }
    flowCharts.push(template);
  }
  return flowCharts;
};

/**
 * Generates the mermaid syntax for creating the respective flowcharts.
 */
const generateTagReportFlowCharts = (gtmContainer) => {
  let flowCharts = [];
  // console.log(gtmContainer.containerVersion.tag);
  let triggers = getTriggerHashMap(gtmContainer);
  let triggerTags = getTagHashMapByTrigger(gtmContainer);
  for (const triggerId in triggerTags) {
    const trigger = triggers[triggerId];

  }
  //   // TODO: Why does this condition happen? (trigger.triggerId: 2147479553 -- MAXINT)
  //   if (!trigger) {
  //     continue;
  //   }
  //
  //   const tags = triggerTags[triggerId];
  //   let template = ['graph TD'];
  //   for (const tagId in tags) {
  //     const tag = tags[tagId];
  //     const blockingTriggers = tag.blockingTriggerId && tag.blockingTriggerId.sort() || [];
  //     // If we have blocking triggers then include them as a middle step.
  //     let left = `trigger${triggerId}\{Trigger:<br>${trigger.name}\}`;
  //     const farRight = `tag${tagId}[Tag: ${tag.name}]`;
  //
  //     if (~~blockingTriggers.length) {
  //       for (let i = 0; i < blockingTriggers.length; i++) {
  //         const blockingTriggerId = blockingTriggers[i];
  //         const blockingTrigger = triggers[blockingTriggerId];
  //         const right = `blockingTrigger${triggerId}${blockingTriggerId}\{${blockingTrigger.name}\}`;
  //         addToTemplate(template, left, right);
  //         left = right;
  //       }
  //     }
  //     addToTemplate(template, left, farRight);
  //   }
  //   flowCharts.push(template);
  // }
  return flowCharts;
};

/**
 * Retrieves the HTML page content.
 */
const getHtmlPage = (content) => {
  const mermaidJs = fs.readFileSync('./node_modules/mermaid/dist/mermaid.min.js', 'utf8');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Google Tag Manager Flow Charts</title>
  <script>${mermaidJs}</script>
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
    console.log(flowChart.join("\n"));
    html += '<div class="mermaid">' + "\n";
    html += flowChart.join("\n") + "\n";
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
    html += '<div class="mermaid">' + "\n";
    html += flowChart.join("\n") + "\n";
    html += '</div>' + "\n";
  }
  const fullHtml = getHtmlPage(html);
  fs.writeFile(outFile, fullHtml, function (err) {
    if (err) return console.error(err);
  });
}

generateTriggerReport('../rackspace-gtm.json', 'trigger-report.html');
generateTagReport('../rackspace-gtm.json', 'tag-report.html');
