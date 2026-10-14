export type KnownContact = {
  readonly names: readonly string[];
  readonly email: string;
};

export const KNOWN_CONTACTS: readonly KnownContact[] = [
  { names: ['toodie', 'dekel', 'תודי', 'דקל'], email: 'dklnsm@gmail.com' }, // the user's wife
  { names: ['ran', 'רן'], email: 'Ranlevi13@gmail.com' },
  { names: ['idan', 'עידן'], email: 'idaneshel@gmail.com' },
  { names: ['amit', 'עמית'], email: 'amit.breuer@gmail.com' },
  { names: ['ariel', 'אריאל'], email: 'relbr87@gmail.com' },
  { names: ['lee', 'לי'], email: 'leecohen14@gmail.com' },
  { names: ['daniel', 'דניאל'], email: 'danielleatia2498@gmail.com' },
];
