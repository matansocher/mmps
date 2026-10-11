import { assertPublicUrl, extractReadableText } from './browse-url.tool';

describe('assertPublicUrl()', () => {
  test.each([
    { url: 'https://example.com/a?b=1', expected: 'https://example.com/a?b=1' },
    { url: 'http://8.8.8.8/', expected: 'http://8.8.8.8/' },
  ])('should accept $url', ({ url, expected }) => {
    expect(assertPublicUrl(url).href).toEqual(expected);
  });

  test.each([
    { url: 'file:///etc/passwd' },
    { url: 'ftp://example.com' },
    { url: 'http://localhost:3000' },
    { url: 'http://127.0.0.1' },
    { url: 'http://10.0.0.5' },
    { url: 'http://172.20.1.1' },
    { url: 'http://192.168.1.1' },
    { url: 'http://169.254.169.254/latest/meta-data' },
    { url: 'http://[::1]/' },
    { url: 'http://printer.local/' },
  ])('should reject $url', ({ url }) => {
    expect(() => assertPublicUrl(url)).toThrow();
  });
});

describe('extractReadableText()', () => {
  test('should extract the article body and title, dropping navigation and scripts', () => {
    const paragraph = 'This is the main article content about browser tools for AI agents. '.repeat(10);
    const html = `<html><head><title>Browser Tools</title><script>alert(1)</script></head>
      <body><nav><a href="/">Home</a><a href="/about">About</a></nav>
      <article><h1>Browser Tools</h1><p>${paragraph}</p><p>${paragraph}</p></article>
      <footer>Copyright</footer></body></html>`;

    const page = extractReadableText(html);

    expect(page.title).toEqual('Browser Tools');
    expect(page.content).toContain('main article content about browser tools');
    expect(page.content).not.toContain('alert(1)');
  });

  test('should fall back to body text for non-article pages', () => {
    const html = '<html><head><title>Short</title><style>body{}</style></head><body><div>Price: $10</div><script>x()</script></body></html>';

    const page = extractReadableText(html);

    expect(page.title).toEqual('Short');
    expect(page.content).toContain('Price: $10');
    expect(page.content).not.toContain('x()');
  });
});
