'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(match => JSON.parse(match[1]));

// Launch copy must not expose the unverified evidence removed in this release.
test('public launch copy has no fabricated reviews or business performance figures', () => {
  const readable = html.replace(/<script(?! type="application\/ld\+json")[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]*>/g, ' ');
  assert.equal(/100\+|4\.9\/5|\+18%|14 יום|תוך שבועיים|4 שנות|4 שנים|מאז 2022|תוך שעה/.test(readable), false, 'unverified performance or timing claim remains');
  assert.doesNotMatch(html, /class="testimonial-card"|data-count="(?:40|100|4)"/);
  for (const schema of schemas) {
    assert.equal(schema.aggregateRating, undefined);
    assert.equal(schema.review, undefined);
  }
});

test('structured business identity remains parseable and keeps the actual contact identity', () => {
  const business = schemas.find(schema => [].concat(schema['@type']).includes('RealEstateAgent'));
  assert.ok(business);
  assert.equal(business.name, 'מבוא נכסים');
  assert.equal(business.telephone, '+972-54-802-6123');
  assert.equal(business.email, 'maor.globes@gmail.com');
  assert.doesNotMatch(business.description, /4 שנים|מוביל/);
});

test('launch copy cleanup retains the interactive catalog and contact anchors', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  for (const id of ['about', 'services', 'contact', 'map-section', 'contactSubject', 'contactMessage', 'marketingConsent', 'toast']) {
    assert.equal(ids.filter(value => value === id).length, 1, id + ' must remain unique');
  }
  assert.match(html, /onsubmit="submitForm\(event\)"/);
  assert.match(html, /src="app\.js[^\"]*"/);
  assert.match(html, /src="db\.js[^\"]*"/);
});

const launchPages = ['index.html', 'neve-tzedek.html', 'florentin.html', 'north-tel-aviv.html', 'bat-yam.html', 'kerem-hateimanim.html'];
for (const filename of launchPages) {
  test(filename + ' has no unsupported office location, hours or market-performance claims', () => {
    const page = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
    const publicCopy = page.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<option[\s\S]*?<\/option>/g, '')
      .replace(/<[^>]*>/g, ' ');
    assert.equal(/₪|מיליון|תשואות גבוהות|עליית ערך|זינקו|הבטוחות ביותר|מבטיח שמירת ערך|מאז 2022|דיזנגוף 50|09:00|19:00|14:00/.test(publicCopy), false, 'unsupported public claim in ' + filename);
    for (const match of page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const schema = JSON.parse(match[1]);
      assert.equal(schema.geo, undefined);
      assert.equal(schema.hasMap, undefined);
      assert.equal(schema.openingHoursSpecification, undefined);
      if (schema.address) {
        assert.equal(schema.address.streetAddress, undefined);
        assert.equal(schema.address.postalCode, undefined);
      }
      if (schema['@type'] === 'FAQPage') {
        for (const question of schema.mainEntity) {
          assert.equal(/₪|מיליון|\d+%|תשואה שכירות|תשואות שכירות/.test(question.acceptedAnswer.text), false);
        }
      }
    }
  });
}
