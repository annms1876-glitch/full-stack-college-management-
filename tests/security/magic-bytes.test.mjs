import test from 'node:test';
import assert from 'node:assert/strict';

const { MAX_UPLOAD_BYTES, UPLOAD_ALLOWLIST, signatureMatchesMime, sniffFileType, validateUploadFile } =
  await import('../../campuspulse-frontend/public/file-signature.js');

const bytes = (...values) => Uint8Array.from(values);
const blob = (content, type) => new Blob([content], { type });
const fake = (size, type) => ({ size, type, slice: () => new Blob([]) });

const PDF = bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46);
const ZIP = bytes(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00);
const HTML = bytes(0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45, 0x20);

test('signature sniffing recognises the allowlisted document formats', async () => {
  assert.equal(await sniffFileType(blob(PDF, 'application/pdf')), 'application/pdf');
  assert.equal(await sniffFileType(blob(PNG, 'image/png')), 'image/png');
  assert.equal(await sniffFileType(blob(JPEG, 'image/jpeg')), 'image/jpeg');
  assert.equal(await sniffFileType(blob(ZIP, 'application/zip')), 'application/zip');
  assert.equal(await sniffFileType(blob(HTML, 'text/html')), null);
  assert.equal(await sniffFileType(blob(bytes(1), 'application/pdf')), null);
});

test('declared MIME must agree with the detected bytes', () => {
  assert.equal(signatureMatchesMime('application/pdf', 'application/pdf'), true);
  assert.equal(signatureMatchesMime('application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), true);
  assert.equal(signatureMatchesMime('application/zip', 'application/x-zip-compressed'), true);
  assert.equal(signatureMatchesMime('image/png', 'application/pdf'), false);
  assert.equal(signatureMatchesMime(null, 'application/pdf'), false);
});

test('validateUploadFile blocks renamed HTML, oversized and disallowed files', async () => {
  const good = await validateUploadFile(new Blob([PDF], { type: 'application/pdf' }));
  assert.equal(good.ok, true);
  assert.equal(good.mimeType, 'application/pdf');

  const disguised = await validateUploadFile(new Blob([HTML], { type: 'application/pdf' }));
  assert.equal(disguised.ok, false);
  assert.match(disguised.message, /contents do not match its type/);

  const wrongKind = await validateUploadFile(new Blob([PDF], { type: 'text/html' }));
  assert.equal(wrongKind.ok, false);
  assert.match(wrongKind.message, /Allowed files are/);

  const tooBig = await validateUploadFile(fake(MAX_UPLOAD_BYTES + 1, 'application/pdf'));
  assert.equal(tooBig.ok, false);
  assert.match(tooBig.message, /25 MiB/);

  const empty = await validateUploadFile(fake(0, 'application/pdf'));
  assert.equal(empty.ok, false);

  const missing = await validateUploadFile(null);
  assert.equal(missing.ok, false);
});

test('the allowlist matches the storage bucket and database constraint', () => {
  assert.deepEqual(
    [...UPLOAD_ALLOWLIST].sort(),
    [
      'application/msword',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/x-zip-compressed',
      'application/zip',
      'image/jpeg',
      'image/png',
    ].sort(),
  );
  assert.equal(MAX_UPLOAD_BYTES, 26214400);
});
