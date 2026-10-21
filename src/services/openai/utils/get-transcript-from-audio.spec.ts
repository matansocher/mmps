import { getTranscriptionFileName } from './get-transcript-from-audio';

describe('getTranscriptionFileName()', () => {
  test.each([
    { audioFilePath: '/tmp/files/file_12.oga', expected: 'file_12.ogg' },
    { audioFilePath: '/tmp/files/file_12.OGA', expected: 'file_12.ogg' },
    { audioFilePath: '/tmp/files/file_12.opus', expected: 'file_12.ogg' },
    { audioFilePath: '/tmp/files/song.mp3', expected: 'song.mp3' },
    { audioFilePath: '/tmp/files/note.m4a', expected: 'note.m4a' },
  ])('should return $expected for $audioFilePath', ({ audioFilePath, expected }) => {
    expect(getTranscriptionFileName(audioFilePath)).toEqual(expected);
  });
});
