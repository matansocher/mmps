export interface ExpectedGoogleArticle {
  readonly kind: string;
  readonly title: string;
  readonly htmlTitle: string;
  readonly link: string;
  readonly displayLink: string;
  readonly snippet: string;
  readonly htmlSnippet: string;
  readonly formattedUrl: string;
  readonly htmlFormattedUrl: string;
  readonly pagemap: {
    cse_thumbnail: Array<{
      readonly src: string;
      readonly width: string;
      readonly height: string;
    }>,
    metatags: Array<{
      readonly 'og:image': string;
      readonly 'article:published_time': string;
      readonly 'og:description': string;
      readonly 'og:type': string;
      readonly 'twitter:title': string;
      readonly 'og:title': string;
      readonly 'article:author': string;
    }>;
  };
}

export interface GoogleArticle {
  readonly title: string;
  readonly link: string;
  readonly snippet: string;
  readonly content?: string;
}
