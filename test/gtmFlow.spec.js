const { describe, it } = require('mocha');
const { assert, expect } = require('chai');
const gtmFlow = require('../src/gtmFlow');

describe('gtmFlow', () => {
  it('should define expected global triggers', () => {
    expect(gtmFlow.globalTriggers).to.deep.equal({
      2147479553: {
        name: 'All Pages',
        type: 'global',
      },
    });
  });

  describe('generateFlowChartHtml', () => {
    it('should generate a valid trigger report', () => {
      const html = gtmFlow.generateFlowChartHtml('test/mocks/sample.json', gtmFlow.generateTriggerReportFlowCharts);
      expect(html).to.contain('<title>Google Tag Manager Flow Charts</title>');
      expect(html).to.contain("mermaid.initialize({startOnLoad: true, theme: 'neutral'});");
      expect(html).to.contain(`<div class="mermaid">
stateDiagram-v2
\ttag3: GA - Page View
\t[*] --> trigger2147479553
\ttrigger2147479553: All Pages
\ttrigger2147479553 --> [*]: Not Triggered
\tbTrigger_2147479553_26: Exception - Do Not Track
\tbTrigger_2147479553_26 --> [*]: Triggered
\ttrigger2147479553 --> bTrigger_2147479553_26: Triggered
\tbTrigger_2147479553_26 --> tag3
</div>`);
    });

    it('should generate a valid tag report', () => {
      const html = gtmFlow.generateFlowChartHtml('test/mocks/sample.json', gtmFlow.generateTagReportFlowCharts);
      expect(html).to.contain('<title>Google Tag Manager Flow Charts</title>');
      expect(html).to.contain("mermaid.initialize({startOnLoad: true, theme: 'neutral'});");
      expect(html).to.contain(`<div class="mermaid">
stateDiagram-v2
\t[*] --> trigger18
\ttrigger18: Event - YouTube Video
\tnote right of trigger18
\t\tType = YOU_TUBE_VIDEO
\tend note
\tbTrigger26 : Exception - Do Not Track
\tnote right of bTrigger26
\t\tType = CUSTOM_EVENT
\t\t{{_event}} =~ .*
\t\t{{User - Do Not Track}} = true
\tend note
\ttrigger18 --> bTrigger26 : Triggered
\ttrigger18 --> [*]: Not Triggered
\ttag6: GA - YouTube Tracking
\tbTrigger26 --> tag6: Not Triggered
\tbTrigger26 --> [*]: Triggered
</div>`);
    });

    it('should throw an exception if file does not exist', () => {
      assert.throws(() => {
        gtmFlow.generateFlowChartHtml('test/mocks/does-not-exist.json', gtmFlow.generateTagReportFlowCharts);
      },
      Error,
      'Not a valid GTM container export file');
    });

    it('should throw an exception if file is not valid JSON', () => {
      assert.throws(() => {
        gtmFlow.generateFlowChartHtml('test/mocks/invalid.json', gtmFlow.generateTagReportFlowCharts);
      },
      Error,
      'Not a valid GTM container export file');
    });

    it('should throw an exception if file is valid JSON but not a GTM export', () => {
      assert.throws(() => {
        gtmFlow.generateFlowChartHtml('test/mocks/other.json', gtmFlow.generateTagReportFlowCharts);
      },
      Error,
      'Not a valid GTM container export');
    });
  });

  describe('generateFilterNote', () => {
    it('should not modify the template if there are no filters', () => {
      const template = ['abc'];
      const filter = null;
      gtmFlow.generateFilterNote(template, filter);
      expect(template).to.deep.equal(['abc']);
    });

    it('should not modify the template if filter is empty', () => {
      const template = ['abc'];
      const filter = [];
      gtmFlow.generateFilterNote(template, filter);
      expect(template).to.deep.equal(['abc']);
    });

    it('should not modify the template if filter type is not TEMPLATE', () => {
      const template = ['abc'];
      const filter = [{
        type: 'CONTAINS',
        parameter: [
          {
            type: 'NOT_TEMPLATE',
            value: '{{_event}}',
          },
          {
            type: 'NOT_TEMPLATE',
            value: 'someCustomEvent',
          },
        ],
      }];
      gtmFlow.generateFilterNote(template, filter);
      expect(template).to.deep.equal(['abc']);
    });

    it('should modify the template if filter type is TEMPLATE', () => {
      const template = ['abc'];
      const filter = [{
        type: 'CONTAINS',
        parameter: [
          {
            type: 'TEMPLATE',
            value: '{{_event}}',
          },
          {
            type: 'TEMPLATE',
            value: 'someCustomEvent',
          },
        ],
      }];
      gtmFlow.generateFilterNote(template, filter);
      expect(template).to.deep.equal([
        'abc',
        '\t\t{{_event}} =~ someCustomEvent',
      ]);
    });
  });

  describe('generateTriggerNote', () => {
    it('should only add type to not template if trigger does not contain an autoEventFilter or customEventFilter', () => {
      const template = ['abc'];
      const trigger = {
        name: 'Some trigger',
        type: 'Some type',
      };
      const id = 'myTriggerId';
      gtmFlow.generateTriggerNote(template, trigger, id);
      expect(template).to.deep.equal([
        'abc',
        '\tnote right of myTriggerId',
        '\t\tType = Some type',
        '\tend note',
      ]);
    });

    it('should add type and autoEventFilter to note template if autoEventFilter is declared', () => {
      const template = ['abc'];
      const trigger = {
        name: 'Some trigger',
        type: 'Some type',
        autoEventFilter: [
          {
            type: 'CONTAINS',
            parameter: [
              {
                type: 'TEMPLATE',
                value: '{{_event}}',
              },
              {
                type: 'TEMPLATE',
                value: 'someCustomEvent',
              },
            ],
          },
          {
            type: 'EQUALS',
            parameter: [
              {
                type: 'TEMPLATE',
                value: '{{Some Variable}}',
              },
              {
                type: 'TEMPLATE',
                value: 'Some Value',
              },
            ],
          },
        ],
      };
      const id = 'myTriggerId';
      gtmFlow.generateTriggerNote(template, trigger, id);
      expect(template).to.deep.equal([
        'abc',
        '\tnote right of myTriggerId',
        '\t\tType = Some type',
        '\t\t{{_event}} =~ someCustomEvent',
        '\t\t{{Some Variable}} = Some Value',
        '\tend note',
      ]);
    });

    it('should add type and customEventFilter to note template if customEventFilter is declared', () => {
      const template = ['abc'];
      const trigger = {
        name: 'Some trigger',
        type: 'Some type',
        customEventFilter: [
          {
            type: 'CONTAINS',
            parameter: [
              {
                type: 'TEMPLATE',
                value: '{{_event}}',
              },
              {
                type: 'TEMPLATE',
                value: 'someCustomEvent',
              },
            ],
          },
          {
            type: 'EQUALS',
            parameter: [
              {
                type: 'TEMPLATE',
                value: '{{Some Variable}}',
              },
              {
                type: 'TEMPLATE',
                value: 'Some Value',
              },
            ],
          },
        ],
      };
      const id = 'myTriggerId';
      gtmFlow.generateTriggerNote(template, trigger, id);
      expect(template).to.deep.equal([
        'abc',
        '\tnote right of myTriggerId',
        '\t\tType = Some type',
        '\t\t{{_event}} =~ someCustomEvent',
        '\t\t{{Some Variable}} = Some Value',
        '\tend note',
      ]);
    });

    it('should add type, autoEventFilter and customEventFilter to note template if autoEventFilter and customEventFilter are declared', () => {
      const template = ['abc'];
      const trigger = {
        name: 'Some trigger',
        type: 'Some type',
        autoEventFilter: [
          {
            type: 'CONTAINS',
            parameter: [
              {
                type: 'TEMPLATE',
                value: '{{_event}}',
              },
              {
                type: 'TEMPLATE',
                value: 'someCustomEvent',
              },
            ],
          },
          {
            type: 'EQUALS',
            parameter: [
              {
                type: 'TEMPLATE',
                value: '{{Some Variable}}',
              },
              {
                type: 'TEMPLATE',
                value: 'Some Value',
              },
            ],
          },
        ],
        customEventFilter: [
          {
            type: 'EQUALS',
            parameter: [
              {
                type: 'TEMPLATE',
                value: '{{Some Other Variable}}',
              },
              {
                type: 'TEMPLATE',
                value: 'Some Other Value',
              },
            ],
          },
        ],
      };
      const id = 'myTriggerId';
      gtmFlow.generateTriggerNote(template, trigger, id);
      expect(template).to.deep.equal([
        'abc',
        '\tnote right of myTriggerId',
        '\t\tType = Some type',
        '\t\t{{_event}} =~ someCustomEvent',
        '\t\t{{Some Variable}} = Some Value',
        '\t\t{{Some Other Variable}} = Some Other Value',
        '\tend note',
      ]);
    });
  });

  describe('getOperation', () => {
    it('should return =~ for CONTAINS', () => {
      expect(gtmFlow.getOperation('CONTAINS')).to.equal('=~');
    });

    it('should return =~ for MATCH_REGEX', () => {
      expect(gtmFlow.getOperation('MATCH_REGEX')).to.equal('=~');
    });

    it('should return =~^ for STARTS_WITH', () => {
      expect(gtmFlow.getOperation('STARTS_WITH')).to.equal('=~^');
    });

    it('should return = for EQUALS', () => {
      expect(gtmFlow.getOperation('EQUALS')).to.equal('=');
    });

    it('should return = for any other value', () => {
      expect(gtmFlow.getOperation('DOES_NOT_EXIST')).to.equal('=');
    });
  });

  describe('getHtmlPage', () => {
    it('should wrap content with basic template', () => {
      const html = gtmFlow.getHtmlPage('My content here');
      expect(html).to.contain('<!DOCTYPE html>');
      expect(html).to.contain('<script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/8.5.1/mermaid.min.js"></script>');
      expect(html).to.contain('My content here');
      expect(html).to.contain("mermaid.initialize({startOnLoad: true, theme: 'neutral'});");
    });
  });
});
