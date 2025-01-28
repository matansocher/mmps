import ffmpeg from 'fluent-ffmpeg';

export async function extractAudioFromVideo(videoFilePath: string): Promise<string> {
  const audioFilePath = videoFilePath.replace(/\.[^/.]+$/, '') + '.mp3';

  return new Promise((resolve, reject) => {
    ffmpeg(videoFilePath)
      .output(audioFilePath)
      .on('end', () => {
        resolve(audioFilePath);
      })
      .on('error', reject)
      .run();
  });
}
