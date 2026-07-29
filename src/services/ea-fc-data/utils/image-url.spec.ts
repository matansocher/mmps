import { describe, expect, it } from 'vitest';
import { buildFlagUrl, buildPlayerFaceUrl, buildTeamLogoUrl } from './image-url';

describe('buildPlayerFaceUrl()', () => {
  it('splits a 6-digit id into 3/3 segments', () => {
    expect(buildPlayerFaceUrl(158023)).toEqual('https://cdn.sofifa.net/players/158/023/26_120.png');
  });

  it('zero-pads shorter ids to 6 digits', () => {
    expect(buildPlayerFaceUrl(1234)).toEqual('https://cdn.sofifa.net/players/001/234/26_120.png');
  });

  it('supports the 240px size variant', () => {
    expect(buildPlayerFaceUrl(231747, 240)).toEqual('https://cdn.sofifa.net/players/231/747/26_240.png');
  });
});

describe('buildTeamLogoUrl()', () => {
  it('builds a 60px logo url by default', () => {
    expect(buildTeamLogoUrl(243)).toEqual('https://cdn.sofifa.net/teams/243/60.png');
  });

  it('supports the 120px size variant', () => {
    expect(buildTeamLogoUrl(10, 120)).toEqual('https://cdn.sofifa.net/teams/10/120.png');
  });
});

describe('buildFlagUrl()', () => {
  it('builds a nation flag url', () => {
    expect(buildFlagUrl(18)).toEqual('https://cdn.sofifa.net/flags/18.png');
  });
});
