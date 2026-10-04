export type ConceptSlug = 'bold' | 'catalog' | 'friendly';

export type Concept = {
  readonly slug: ConceptSlug;
  readonly index: number;
  readonly name: string;
  readonly hebrewName: string;
  readonly idea: string;
  readonly inspiredBy: readonly string[];
  readonly whyClients: readonly string[];
  readonly bestFor: string;
  readonly swatches: readonly string[];
  readonly preview: string;
};

export const concepts: readonly Concept[] = [
  {
    slug: 'bold',
    preview: 'previews/bold.jpg',
    index: 1,
    name: 'Bold Industrial',
    hebrewName: 'תעשייתי נועז',
    idea: 'צילום מלא ברוחב המסך, כותרת גדולה וחיפוש מוצרים שמוביל ישר לקטגוריה הנכונה. מבנה ברור ובטוח, כמו אתרי המותגים הגדולים בעולם הריתוך.',
    inspiredBy: ['Lincoln Electric – הירו צילומי וחיפוש עם חיפושים נפוצים', 'Miller – כרטיסי קטגוריה גדולים ודף מוצר עם גלריה ולשוניות'],
    whyClients: ['מוצאים מוצר בשנייה דרך החיפוש', 'רושם של מותג גדול ובטוח בעצמו', 'דף מוצר מוכר שכל קונה מבין'],
    bestFor: 'כל קהלי היעד – הבחירה הבטוחה',
    swatches: ['#ffffff', '#141414', '#d4a017'],
  },
  {
    slug: 'catalog',
    preview: 'previews/catalog.jpg',
    index: 2,
    name: 'Technical Catalog',
    hebrewName: 'קטלוג טכני',
    idea: 'נקי, בהיר ומסודר כמו קטלוג מקצועי: משפחות מוצרים בתמונות, טבלת מוצרים עם תקנים וגיליונות נתונים, ודף מוצר שכל הנתונים בו במבט אחד.',
    inspiredBy: ['voestalpine Böhler – משפחות מוצרים וטבלת מוצרים עם תקני AWS/ISO', 'Böhler – פס עובדות וגישה מהירה למסמכים'],
    whyClients: ['מהנדסים ורכש מוצאים תקן וגיליון נתונים מיד', 'השוואה מהירה בין מוצרים', 'מראה מקצועי ואמין'],
    bestFor: 'רכש תעשייתי ומהנדסי ריתוך',
    swatches: ['#f5f8fa', '#1f2d3a', '#0f6fb5'],
  },
  {
    slug: 'friendly',
    preview: 'previews/friendly.jpg',
    index: 3,
    name: 'Modern Friendly',
    hebrewName: 'מודרני וידידותי',
    idea: 'פינות מעוגלות, הרבה אוויר וחיפוש שיושב על התמונה הראשית. כרטיס קטלוג כהה ופס קיצורי דרך – אתר מזמין שקל להתמצא בו גם למי שלא מכיר ריתוך.',
    inspiredBy: ['Hobart – חיפוש שעולה על ההירו וכרטיס קטלוג כהה', 'Migatronic – ממשק מעוגל וידידותי ופס קיצורי דרך'],
    whyClients: ['נעים ופשוט גם ללקוח חדש', 'קיצורי דרך לכל מה שמחפשים', 'מרגיש עכשווי ונגיש בנייד'],
    bestFor: 'לקוחות פרטיים, חנויות וקהל צעיר',
    swatches: ['#f7f6f2', '#22262b', '#e0a526'],
  },
];

export const isConceptSlug = (s: string | undefined): s is ConceptSlug => concepts.some((c) => c.slug === s);
