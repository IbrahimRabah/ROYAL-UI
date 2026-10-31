import { canSendAsIs, fileKey, fitWithin, folderOf, planBatches } from './image-upload.util';

describe('image upload helpers', () => {
  it('fits a large picture within 2000 px keeping its proportions, and never enlarges', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 6000)).toEqual({ width: 1000, height: 2000 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(2000, 2000)).toEqual({ width: 2000, height: 2000 });
  });

  it('sends a small web image as it is, and re-encodes the rest', () => {
    expect(canSendAsIs('image/jpeg', 400_000, 1200, 800)).toBeTrue();
    expect(canSendAsIs('image/jpeg', 4_000_000, 1200, 800)).toBeFalse();
    expect(canSendAsIs('image/png', 400_000, 3000, 800)).toBeFalse();
    expect(canSendAsIs('image/gif', 1000, 10, 10)).toBeFalse();
    expect(canSendAsIs('', 1000, 10, 10)).toBeFalse();
  });

  it('keeps the files of one SKU in one request and never exceeds the request size', () => {
    const files = ['A', 'A', 'B', 'C', 'C', 'C', 'D', 'E', 'F', 'G'].map((sku, i) => ({ sku, i }));
    const batches = planBatches(files, (f) => f.sku, 4);

    expect(batches.every((b) => b.length <= 4)).toBeTrue();
    expect(batches.flat().length).toBe(files.length);
    // Every SKU sits in exactly one request.
    for (const sku of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
      expect(batches.filter((b) => b.some((f) => f.sku === sku)).length).withContext(sku).toBe(1);
    }
  });

  it('splits a SKU with more files than one request holds', () => {
    const files = Array.from({ length: 10 }, (_, i) => ({ sku: 'X', i }));
    const batches = planBatches(files, (f) => f.sku, 4);
    expect(batches.map((b) => b.length)).toEqual([4, 4, 2]);
  });

  it('gives no request for no files', () => {
    expect(planBatches([], () => 'x')).toEqual([]);
  });

  it('takes the folder out of a relative path and ties a file back to its answer', () => {
    expect(folderOf('Drive/كراسي بار/CH101.jpg')).toBe('Drive/كراسي بار');
    expect(folderOf('CH101.jpg')).toBeNull();
    expect(folderOf(undefined)).toBeNull();
    expect(fileKey('CH101.jpg', 'a/b')).toBe(fileKey('CH101.jpg', 'a/b'));
    expect(fileKey('CH101.jpg', 'a/b')).not.toBe(fileKey('CH101.jpg', 'a/c'));
    expect(fileKey('CH101.jpg', null)).toBe(fileKey('CH101.jpg', undefined));
  });
});
