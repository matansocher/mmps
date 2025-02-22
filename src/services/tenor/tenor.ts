import axios from 'axios';

const TENOR_BASE_URL = 'https://g.tenor.com/v1/search';
const API_KEY = 'LIVDSRZULELA';

export async function searchMeme(search: string): Promise<string> {
  try {
    const limit = 50;
    const url = `${TENOR_BASE_URL}`;
    const params = {
      q: search,
      key: API_KEY,
      limit,
    };
    const result = await axios.get(url, { params });
    const randomIndex = Math.floor(Math.random() * limit);
    const selected = result.data?.results[randomIndex];
    const selectedGif = selected?.media[0].gif.url;
    return selectedGif;
  } catch {
    return null;
  }
}
