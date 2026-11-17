import test from 'node:test';
import assert from 'node:assert/strict';
import { extractHanCharacters, hanziDataUrl, isHanziData, loadHanziData } from '../src/utils/hanziData.js';

test('Han characters retain repeated positions and supplementary code points', () => {
  assert.deepEqual(extractHanCharacters('你你好，𠮷！a'), ['你', '你', '好', '𠮷']);
  assert.match(hanziDataUrl('你'), /hanzi-writer-data@2\.0\.1\/%E4%BD%A0\.json$/);
});
test('stroke payload validates paths and matching median coordinates', () => {
  assert.ok(isHanziData({ strokes: ['M1 2'], medians: [[[1, 2], [3, 4]]] }));
  for (const data of [null, {}, { strokes: [], medians: [] }, { strokes: ['x'], medians: [] }, { strokes: ['x'], medians: [[[NaN, 1], [1, 2]]] }]) assert.equal(isHanziData(data), false);
});
test('requests are deduplicated, cached and retry after failure', async () => {
  const originalFetch = globalThis.fetch;
  let count = 0;
  const payload = { strokes: ['M1 2'], medians: [[[1, 2], [3, 4]]] };
  globalThis.fetch = async () => { count++; return new Response(JSON.stringify(payload)); };
  try {
    const [first, second] = await Promise.all([loadHanziData('你'), loadHanziData('你')]);
    assert.equal(count, 1);
    assert.deepEqual(first, second);
    await loadHanziData('你');
    assert.equal(count, 1);
    globalThis.fetch = async () => new Response('', { status: 404 });
    await assert.rejects(loadHanziData('好'));
    globalThis.fetch = async () => new Response(JSON.stringify(payload));
    assert.deepEqual(await loadHanziData('好'), payload);
  } finally { globalThis.fetch = originalFetch; }
});
