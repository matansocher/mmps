import { JobResult, Supadata, Transcript, TranscriptOrJobId } from '@supadata/js';
import { env } from 'node:process';

type TranscriptResult = {
  readonly lang: string;
  readonly availableLangs: string[];
  readonly content: {
    readonly text: string;
    readonly duration: string;
    readonly offset: string;
  }[];
  readonly text: string;
};

async function pollTranscriptJob(supadata: Supadata, jobId: string, maxAttempts: number = 60, delayMs: number = 2000): Promise<Transcript> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const jobResult: JobResult<Transcript> = await supadata.transcript.getJobStatus(jobId);

    if (jobResult.status === 'completed') {
      if (jobResult.result) {
        return jobResult.result;
      }
      throw new Error('Job completed but no result was returned');
    }

    if (jobResult.status === 'failed') {
      throw new Error(`Transcript job failed: ${jobResult.error?.message || 'Unknown error'}`);
    }

    // Job is still processing (queued or active)
    attempts++;
    if (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Transcript job ${jobId} did not complete within ${maxAttempts} attempts`);
}

export async function getTikTokTranscript(username: string, videoId: string): Promise<TranscriptResult> {
  const supadata = new Supadata({ apiKey: env.SUPADATA_API_KEY });
  const url = `https://www.tiktok.com/@${username}/video/${videoId}`;
  const transcriptResult: TranscriptOrJobId = await supadata.transcript({ url });

  let transcript: Transcript;

  if ('jobId' in transcriptResult) {
    transcript = await pollTranscriptJob(supadata, transcriptResult.jobId);
  } else {
    transcript = transcriptResult;
  }

  let text: string;
  if (typeof transcript.content === 'string') {
    text = transcript.content;
  } else {
    text = transcript.content.map((c) => c.text).join(' ');
  }

  return {
    lang: transcript.lang,
    availableLangs: transcript.availableLangs,
    content:
      typeof transcript.content === 'string'
        ? []
        : transcript.content.map((chunk) => ({
            text: chunk.text,
            duration: chunk.duration.toString(),
            offset: chunk.offset.toString(),
          })),
    text,
  };
}
