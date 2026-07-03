import { generateWcTreeImage } from '@services/wc-tree';
(async () => {
  const res = await generateWcTreeImage();
  console.log('RESULT:', JSON.stringify(res));
})();
