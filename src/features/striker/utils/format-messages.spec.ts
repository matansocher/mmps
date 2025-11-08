import { Player, UserStats } from '@shared/striker';
import {
  ALREADY_PLAYING_MESSAGE,
  CLUE_REVEALED_MESSAGE,
  formatGiveUpMessage,
  formatHintMessage,
  formatStatsMessage,
  formatSuccessMessage,
  formatWrongGuessMessage,
  HELP_MESSAGE,
  NO_ACTIVE_GAME_MESSAGE,
  NO_MORE_CLUES_MESSAGE,
  NO_STATS_MESSAGE,
  WELCOME_MESSAGE,
} from './format-messages';

describe('Format Messages', () => {
  describe('Constants', () => {
    it('should have defined WELCOME_MESSAGE', () => {
      expect(WELCOME_MESSAGE).toBeDefined();
      expect(WELCOME_MESSAGE).toContain('Welcome');
      expect(WELCOME_MESSAGE).toContain('/play');
    });

    it('should have defined HELP_MESSAGE', () => {
      expect(HELP_MESSAGE).toBeDefined();
      expect(HELP_MESSAGE).toContain('Help');
      expect(HELP_MESSAGE).toContain('How to Play');
    });

    it('should have defined ALREADY_PLAYING_MESSAGE', () => {
      expect(ALREADY_PLAYING_MESSAGE).toBeDefined();
      expect(ALREADY_PLAYING_MESSAGE).toContain('already have an active game');
    });

    it('should have defined CLUE_REVEALED_MESSAGE', () => {
      expect(CLUE_REVEALED_MESSAGE).toBeDefined();
      expect(CLUE_REVEALED_MESSAGE).toContain('hint revealed');
    });

    it('should have defined NO_ACTIVE_GAME_MESSAGE', () => {
      expect(NO_ACTIVE_GAME_MESSAGE).toBeDefined();
      expect(NO_ACTIVE_GAME_MESSAGE).toContain('No active game');
    });

    it('should have defined NO_MORE_CLUES_MESSAGE', () => {
      expect(NO_MORE_CLUES_MESSAGE).toBeDefined();
      expect(NO_MORE_CLUES_MESSAGE).toContain('All hints have been revealed');
    });

    it('should have defined NO_STATS_MESSAGE', () => {
      expect(NO_STATS_MESSAGE).toBeDefined();
      expect(NO_STATS_MESSAGE).toContain("haven't played any games");
    });
  });

  describe('formatHintMessage', () => {
    const mockPlayer: Player = {
      id: 1,
      firstName: 'Kylian',
      lastName: 'Mbappé',
      commonName: '',
      photo: 'https://example.com/photo.png',
      position: 'Forward',
      nationality: 'France',
      league: 'La Liga',
      team: 'Real Madrid',
      teamPhoto: 'https://example.com/team.png',
      nationalityPhoto: 'https://example.com/flag.png',
      height: 178,
      weight: 73,
      birthdate: '1998-12-20',
      overallRating: 91,
      preferredFoot: 'Right',
    };

    it('should show position and league for 1 hint (initial 2 clues)', () => {
      const message = formatHintMessage(mockPlayer, 1);
      expect(message).toContain('Position: Forward');
      expect(message).toContain('League: La Liga');
      expect(message).not.toContain('Nationality');
      expect(message).not.toContain('Club');
    });

    it('should show position, league, and nationality for 2 hints', () => {
      const message = formatHintMessage(mockPlayer, 2);
      expect(message).toContain('Position: Forward');
      expect(message).toContain('League: La Liga');
      expect(message).toContain('Nationality: France');
      expect(message).not.toContain('Age');
    });

    it('should show position, league, nationality, and age for 3 hints', () => {
      const message = formatHintMessage(mockPlayer, 3);
      expect(message).toContain('Position: Forward');
      expect(message).toContain('League: La Liga');
      expect(message).toContain('Nationality: France');
      expect(message).toContain('Age:');
      expect(message).toContain('years old');
      expect(message).not.toContain('Height');
      expect(message).not.toContain('Club');
    });

    it('should show all hints except club and preferred foot for 4 hints', () => {
      const message = formatHintMessage(mockPlayer, 4);
      expect(message).toContain('Position: Forward');
      expect(message).toContain('League: La Liga');
      expect(message).toContain('Nationality: France');
      expect(message).toContain('Age:');
      expect(message).toContain('years old');
      expect(message).toContain('Height: 178 cm');
      expect(message).toContain('Weight: 73 kg');
      expect(message).not.toContain('Club: Real Madrid');
      expect(message).not.toContain('Preferred Foot');
    });

    it('should show all hints for 6 hints', () => {
      const message = formatHintMessage(mockPlayer, 6);
      expect(message).toContain('Position: Forward');
      expect(message).toContain('League: La Liga');
      expect(message).toContain('Nationality: France');
      expect(message).toContain('Age:');
      expect(message).toContain('years old');
      expect(message).toContain('Height: 178 cm');
      expect(message).toContain('Weight: 73 kg');
      expect(message).toContain('Club: Real Madrid');
      expect(message).toContain('Preferred Foot: Right');
    });

    it('should suggest /clue when hints < 6', () => {
      const message = formatHintMessage(mockPlayer, 3);
      expect(message).toContain('/clue');
    });

    it('should show "last hint" message when hints = 6', () => {
      const message = formatHintMessage(mockPlayer, 6);
      expect(message).toContain('This is the last hint');
      expect(message).not.toContain('/clue');
    });

    it('should suggest /giveup when all hints are revealed', () => {
      const message = formatHintMessage(mockPlayer, 6);
      expect(message).toContain('/giveup');
      expect(message).toContain('reveal the answer');
    });
  });

  describe('formatSuccessMessage', () => {
    const mockPlayer: Player = {
      id: 1,
      firstName: 'Lionel',
      lastName: 'Messi',
      commonName: '',
      photo: 'https://example.com/photo.png',
      position: 'Forward',
      nationality: 'Argentina',
      league: 'MLS',
      team: 'Inter Miami',
      teamPhoto: 'https://example.com/team.png',
      nationalityPhoto: 'https://example.com/flag.png',
      height: 170,
      weight: 72,
      birthdate: '1987-06-24',
      overallRating: 90,
      preferredFoot: 'Left',
    };

    it('should include player name', () => {
      const message = formatSuccessMessage(mockPlayer, 5, 1, ['Messi']);
      expect(message).toContain('Lionel Messi');
    });

    it('should show correct score', () => {
      const message = formatSuccessMessage(mockPlayer, 5, 1, ['Messi']);
      expect(message).toContain('5 points');
    });

    it('should show hints used', () => {
      const message = formatSuccessMessage(mockPlayer, 3, 3, ['guess1', 'guess2', 'guess3']);
      expect(message).toContain('3/6');
    });

    it('should show number of attempts', () => {
      const message = formatSuccessMessage(mockPlayer, 3, 2, ['wrong', 'correct']);
      expect(message).toContain('Attempts: 2');
    });

    it('should show 5 stars for perfect score', () => {
      const message = formatSuccessMessage(mockPlayer, 5, 1, ['Messi']);
      expect(message).toContain('⭐⭐⭐⭐⭐');
      expect(message).toContain('AMAZING');
    });

    it('should show appropriate stars for different scores', () => {
      expect(formatSuccessMessage(mockPlayer, 4, 2, ['a'])).toContain('⭐⭐⭐⭐');
      expect(formatSuccessMessage(mockPlayer, 3, 3, ['a'])).toContain('⭐⭐⭐');
      expect(formatSuccessMessage(mockPlayer, 2, 4, ['a'])).toContain('⭐⭐');
      expect(formatSuccessMessage(mockPlayer, 1, 5, ['a'])).toContain('⭐');
    });

    it('should suggest playing again', () => {
      const message = formatSuccessMessage(mockPlayer, 5, 1, ['Messi']);
      expect(message).toContain('/play');
    });
  });

  describe('formatGiveUpMessage', () => {
    const mockPlayer: Player = {
      id: 1,
      firstName: 'Cristiano',
      lastName: 'Ronaldo',
      commonName: '',
      photo: 'https://example.com/photo.png',
      position: 'Forward',
      nationality: 'Portugal',
      league: 'Saudi Pro League',
      team: 'Al Nassr',
      teamPhoto: 'https://example.com/team.png',
      nationalityPhoto: 'https://example.com/flag.png',
      height: 187,
      weight: 83,
      birthdate: '1985-02-05',
      overallRating: 87,
      preferredFoot: 'Right',
    };

    it('should reveal the player name', () => {
      const message = formatGiveUpMessage(mockPlayer);
      expect(message).toContain('Cristiano Ronaldo');
    });

    it('should show all player information', () => {
      const message = formatGiveUpMessage(mockPlayer);
      expect(message).toContain('Position: Forward');
      expect(message).toContain('Nationality: Portugal');
      expect(message).toContain('League: Saudi Pro League');
      expect(message).toContain('Club: Al Nassr');
      expect(message).toContain('Age:');
      expect(message).toContain('years old');
      expect(message).toContain('Height: 187 cm');
      expect(message).toContain('Weight: 83 kg');
      expect(message).toContain('Preferred Foot: Right');
    });

    it('should suggest trying again', () => {
      const message = formatGiveUpMessage(mockPlayer);
      expect(message).toContain('/play');
    });
  });

  describe('formatWrongGuessMessage', () => {
    it('should include the incorrect guess', () => {
      const message = formatWrongGuessMessage('Ronaldo', 3);
      expect(message).toContain('Ronaldo');
      expect(message).toContain('incorrect');
    });

    it('should suggest /clue when hints < 6', () => {
      const message = formatWrongGuessMessage('guess', 3);
      expect(message).toContain('/clue');
    });

    it('should show "all hints revealed" when hints >= 6', () => {
      const message = formatWrongGuessMessage('guess', 6);
      expect(message).toContain('All hints revealed');
      expect(message).toContain('/giveup');
    });
  });

  describe('formatStatsMessage', () => {
    it('should display all statistics', () => {
      const stats: UserStats = {
        chatId: 123,
        totalGames: 10,
        correctGuesses: 7,
        totalScore: 35,
        averageHintsUsed: 2.5,
        bestStreak: 5,
        currentStreak: 3,
        lastPlayedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const message = formatStatsMessage(stats);
      expect(message).toContain('Total Games: 10');
      expect(message).toContain('Correct Guesses: 7');
      expect(message).toContain('Win Rate: 70.0%');
      expect(message).toContain('Total Score: 35 points');
      expect(message).toContain('Avg Hints Used: 2.5');
      expect(message).toContain('Current Streak: 3');
      expect(message).toContain('Best Streak: 5');
    });

    it('should show LEGEND badge for 100+ points', () => {
      const stats: UserStats = {
        chatId: 123,
        totalGames: 25,
        correctGuesses: 20,
        totalScore: 100,
        averageHintsUsed: 2,
        bestStreak: 10,
        currentStreak: 5,
        lastPlayedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const message = formatStatsMessage(stats);
      expect(message).toContain('LEGEND');
    });

    it('should show EXPERT badge for 50-99 points', () => {
      const stats: UserStats = {
        chatId: 123,
        totalGames: 15,
        correctGuesses: 12,
        totalScore: 60,
        averageHintsUsed: 2.5,
        bestStreak: 5,
        currentStreak: 2,
        lastPlayedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const message = formatStatsMessage(stats);
      expect(message).toContain('EXPERT');
    });

    it('should show ENTHUSIAST badge for 20-49 points', () => {
      const stats: UserStats = {
        chatId: 123,
        totalGames: 8,
        correctGuesses: 6,
        totalScore: 25,
        averageHintsUsed: 3,
        bestStreak: 3,
        currentStreak: 1,
        lastPlayedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const message = formatStatsMessage(stats);
      expect(message).toContain('ENTHUSIAST');
    });

    it('should show ROOKIE badge for 1-19 points', () => {
      const stats: UserStats = {
        chatId: 123,
        totalGames: 3,
        correctGuesses: 2,
        totalScore: 10,
        averageHintsUsed: 3.5,
        bestStreak: 2,
        currentStreak: 0,
        lastPlayedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const message = formatStatsMessage(stats);
      expect(message).toContain('ROOKIE');
    });

    it('should calculate win rate correctly', () => {
      const stats: UserStats = {
        chatId: 123,
        totalGames: 10,
        correctGuesses: 3,
        totalScore: 15,
        averageHintsUsed: 4,
        bestStreak: 2,
        currentStreak: 0,
        lastPlayedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const message = formatStatsMessage(stats);
      expect(message).toContain('Win Rate: 30.0%');
    });

    it('should handle 0 games gracefully', () => {
      const stats: UserStats = {
        chatId: 123,
        totalGames: 0,
        correctGuesses: 0,
        totalScore: 0,
        averageHintsUsed: 0,
        bestStreak: 0,
        currentStreak: 0,
        lastPlayedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const message = formatStatsMessage(stats);
      expect(message).toContain('Win Rate: 0.0%');
      expect(message).toContain('Play your first game');
    });
  });
});
