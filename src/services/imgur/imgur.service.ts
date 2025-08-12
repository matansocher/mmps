import axios from 'axios';
import { promises as fs } from 'fs';

export async function imgurUploadImage(imgurToken: string, imageLocalPath: string): Promise<string> {
  const imageBuffer = await fs.readFile(imageLocalPath, { encoding: 'base64' });
  const data = {
    image: imageBuffer,
    type: 'base64',
    title: 'Simple upload',
    description: 'This is a simple image upload in Imgur',
  };

  const config = {
    url: 'https://api.imgur.com/3/image',
    method: 'post',
    headers: {
      Authorization: `Client-ID ${imgurToken}`,
      'Content-Type': 'application/json',
    },
    data: data,
  };

  const result = await axios(config);
  return result['data']?.data?.link;
}
