"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var format_polymarket_update_1 = require("./format-polymarket-update");
var createMockMarket = function (overrides) {
    if (overrides === void 0) { overrides = {}; }
    return (__assign({ id: 'market-123', slug: 'test-market-slug', question: 'Will this test pass?', yesPrice: 0.75, noPrice: 0.25, volume24hr: 50000, oneDayPriceChange: 0.05, endDate: '2025-12-31T00:00:00.000Z', active: true, closed: false, polymarketUrl: 'https://polymarket.com/event/test-market-slug' }, overrides));
};
var createMockSubscription = function (overrides) {
    if (overrides === void 0) { overrides = {}; }
    return (__assign({ marketId: 'market-123', marketSlug: 'test-market-slug', marketQuestion: 'Will this test pass?', chatId: 12345, lastNotifiedPrice: 0.7, subscribedAt: new Date('2025-01-01') }, overrides));
};
describe('formatPriceChange', function () {
    describe('when API 24h change is available', function () {
        it('should return positive change with up emoji', function () {
            expect((0, format_polymarket_update_1.formatPriceChange)(0.05, null, 0.75)).toBe('📈 (+5.0%)');
        });
        it('should return negative change with down emoji', function () {
            expect((0, format_polymarket_update_1.formatPriceChange)(-0.03, null, 0.75)).toBe('📉 (-3.0%)');
        });
        it('should return zero change with arrow emoji', function () {
            expect((0, format_polymarket_update_1.formatPriceChange)(0, null, 0.75)).toBe('➡️ (+0.0%)');
        });
        it('should handle large positive change', function () {
            expect((0, format_polymarket_update_1.formatPriceChange)(0.25, null, 0.75)).toBe('📈 (+25.0%)');
        });
        it('should handle large negative change', function () {
            expect((0, format_polymarket_update_1.formatPriceChange)(-0.5, null, 0.25)).toBe('📉 (-50.0%)');
        });
        it('should format decimal precision correctly', function () {
            expect((0, format_polymarket_update_1.formatPriceChange)(0.123, null, 0.75)).toBe('📈 (+12.3%)');
        });
    });
    describe('when API 24h change is null (fallback to calculated)', function () {
        it('should calculate positive change from last notified price', function () {
            // currentPrice 0.75 - lastNotifiedPrice 0.70 = 0.05 = +5.0%
            expect((0, format_polymarket_update_1.formatPriceChange)(null, 0.7, 0.75)).toBe('📈 (+5.0%)');
        });
        it('should calculate negative change from last notified price', function () {
            // currentPrice 0.75 - lastNotifiedPrice 0.80 = -0.05 = -5.0%
            expect((0, format_polymarket_update_1.formatPriceChange)(null, 0.8, 0.75)).toBe('📉 (-5.0%)');
        });
        it('should calculate zero change when prices are equal', function () {
            expect((0, format_polymarket_update_1.formatPriceChange)(null, 0.75, 0.75)).toBe('➡️ (+0.0%)');
        });
        it('should handle small price differences', function () {
            // currentPrice 0.751 - lastNotifiedPrice 0.750 = 0.001 = +0.1%
            expect((0, format_polymarket_update_1.formatPriceChange)(null, 0.75, 0.751)).toBe('📈 (+0.1%)');
        });
    });
    describe('when no price data is available', function () {
        it('should return empty string when both values are null', function () {
            expect((0, format_polymarket_update_1.formatPriceChange)(null, null, 0.75)).toBe('');
        });
    });
    describe('edge cases', function () {
        it('should prefer API change over calculated change', function () {
            // API says +5%, calculated would be +10%
            expect((0, format_polymarket_update_1.formatPriceChange)(0.05, 0.65, 0.75)).toBe('📈 (+5.0%)');
        });
        it('should handle price at 0', function () {
            expect((0, format_polymarket_update_1.formatPriceChange)(null, 0.05, 0)).toBe('📉 (-5.0%)');
        });
        it('should handle price at 1', function () {
            expect((0, format_polymarket_update_1.formatPriceChange)(null, 0.95, 1)).toBe('📈 (+5.0%)');
        });
    });
});
describe('formatDailyUpdateMessage', function () {
    it('should format a single market update', function () {
        var updates = [
            {
                subscription: createMockSubscription(),
                market: createMockMarket(),
            },
        ];
        var result = (0, format_polymarket_update_1.formatDailyUpdateMessage)(updates);
        expect(result).toContain('*Polymarket Daily Update*');
        expect(result).toContain('🟢'); // active market
        expect(result).toContain('*Will this test pass?*');
        expect(result).toContain('Yes: 75.0%');
        expect(result).toContain('📈 (+5.0%)');
        expect(result).toContain('[View market](https://polymarket.com/event/test-market-slug)');
    });
    it('should format multiple market updates', function () {
        var updates = [
            {
                subscription: createMockSubscription(),
                market: createMockMarket({ question: 'First market?' }),
            },
            {
                subscription: createMockSubscription({ marketSlug: 'second-market' }),
                market: createMockMarket({ question: 'Second market?', slug: 'second-market' }),
            },
        ];
        var result = (0, format_polymarket_update_1.formatDailyUpdateMessage)(updates);
        expect(result).toContain('First market?');
        expect(result).toContain('Second market?');
        // Markets should be separated by double newlines
        expect(result).toMatch(/First market\?[\s\S]*\n\n[\s\S]*Second market\?/);
    });
    it('should show closed emoji for closed markets', function () {
        var updates = [
            {
                subscription: createMockSubscription(),
                market: createMockMarket({ closed: true, active: false }),
            },
        ];
        var result = (0, format_polymarket_update_1.formatDailyUpdateMessage)(updates);
        expect(result).toContain('🔒');
    });
    it('should show paused emoji for inactive markets', function () {
        var updates = [
            {
                subscription: createMockSubscription(),
                market: createMockMarket({ active: false, closed: false }),
            },
        ];
        var result = (0, format_polymarket_update_1.formatDailyUpdateMessage)(updates);
        expect(result).toContain('⏸️');
    });
    it('should show active emoji for active markets', function () {
        var updates = [
            {
                subscription: createMockSubscription(),
                market: createMockMarket({ active: true, closed: false }),
            },
        ];
        var result = (0, format_polymarket_update_1.formatDailyUpdateMessage)(updates);
        expect(result).toContain('🟢');
    });
    it('should use fallback price change when API change is null', function () {
        var updates = [
            {
                subscription: createMockSubscription({ lastNotifiedPrice: 0.7 }),
                market: createMockMarket({ oneDayPriceChange: null, yesPrice: 0.75 }),
            },
        ];
        var result = (0, format_polymarket_update_1.formatDailyUpdateMessage)(updates);
        // 0.75 - 0.70 = 0.05 = +5.0%
        expect(result).toContain('📈 (+5.0%)');
    });
    it('should handle empty updates array', function () {
        var result = (0, format_polymarket_update_1.formatDailyUpdateMessage)([]);
        expect(result).toBe('*Polymarket Daily Update*\n\n');
    });
    it('should format extreme yes price correctly', function () {
        var updates = [
            {
                subscription: createMockSubscription(),
                market: createMockMarket({ yesPrice: 0.99 }),
            },
        ];
        var result = (0, format_polymarket_update_1.formatDailyUpdateMessage)(updates);
        expect(result).toContain('Yes: 99.0%');
    });
    it('should format low yes price correctly', function () {
        var updates = [
            {
                subscription: createMockSubscription(),
                market: createMockMarket({ yesPrice: 0.01 }),
            },
        ];
        var result = (0, format_polymarket_update_1.formatDailyUpdateMessage)(updates);
        expect(result).toContain('Yes: 1.0%');
    });
});
var createMockOutcome = function (overrides) {
    if (overrides === void 0) { overrides = {}; }
    return (__assign({ outcome: 'France', probability: 0.356, oneDayPriceChange: 0.02, marketSlug: 'will-france-win-the-2026-fifa-world-cup' }, overrides));
};
var createMockEvent = function (overrides) {
    if (overrides === void 0) { overrides = {}; }
    return (__assign({ id: 'event-1', title: 'World Cup Winner', slug: 'world-cup-winner', volume24hr: 1000000, active: true, closed: false, negRisk: true, outcomes: [createMockOutcome()], polymarketUrl: 'https://polymarket.com/event/world-cup-winner' }, overrides));
};
var createMockMultiSubscription = function (overrides) {
    if (overrides === void 0) { overrides = {}; }
    return (__assign({ marketId: 'event-1', marketSlug: 'world-cup-winner', marketQuestion: 'World Cup Winner', chatId: 12345, type: 'multi', lastNotifiedPrice: null, lastNotifiedOutcomes: null }, overrides));
};
describe('formatOutcomeChange', function () {
    it('should prefer API 24h change when available', function () {
        expect((0, format_polymarket_update_1.formatOutcomeChange)(createMockOutcome({ oneDayPriceChange: 0.02 }), null)).toBe('📈 (+2.0%)');
    });
    it('should render negative API change', function () {
        expect((0, format_polymarket_update_1.formatOutcomeChange)(createMockOutcome({ oneDayPriceChange: -0.04 }), null)).toBe('📉 (-4.0%)');
    });
    it('should fall back to matching snapshot when API change is null', function () {
        var snapshots = [{ outcome: 'France', probability: 0.3 }];
        // 0.356 - 0.30 = 0.056 => +5.6%
        expect((0, format_polymarket_update_1.formatOutcomeChange)(createMockOutcome({ oneDayPriceChange: null }), snapshots)).toBe('📈 (+5.6%)');
    });
    it('should return empty string when no change data is available', function () {
        expect((0, format_polymarket_update_1.formatOutcomeChange)(createMockOutcome({ oneDayPriceChange: null }), null)).toBe('');
    });
    it('should return empty string when snapshot has no matching outcome', function () {
        var snapshots = [{ outcome: 'Spain', probability: 0.12 }];
        expect((0, format_polymarket_update_1.formatOutcomeChange)(createMockOutcome({ oneDayPriceChange: null }), snapshots)).toBe('');
    });
});
describe('toOutcomeSnapshots', function () {
    it('should map outcomes to name/probability snapshots', function () {
        var event = createMockEvent({
            outcomes: [createMockOutcome({ outcome: 'France', probability: 0.35 }), createMockOutcome({ outcome: 'Spain', probability: 0.12 })],
        });
        expect((0, format_polymarket_update_1.toOutcomeSnapshots)(event)).toEqual([
            { outcome: 'France', probability: 0.35 },
            { outcome: 'Spain', probability: 0.12 },
        ]);
    });
    it('should cap snapshots at the top 8 outcomes', function () {
        var outcomes = Array.from({ length: 12 }, function (_, index) { return createMockOutcome({ outcome: "Team ".concat(index), probability: (12 - index) / 100 }); });
        expect((0, format_polymarket_update_1.toOutcomeSnapshots)(createMockEvent({ outcomes: outcomes }))).toHaveLength(8);
    });
});
describe('formatMultiOutcomeUpdateMessage', function () {
    it('should format a multi-outcome event with ranked outcomes', function () {
        var updates = [
            {
                subscription: createMockMultiSubscription(),
                event: createMockEvent({
                    outcomes: [createMockOutcome({ outcome: 'France', probability: 0.356, oneDayPriceChange: 0.02 }), createMockOutcome({ outcome: 'Argentina', probability: 0.168, oneDayPriceChange: -0.01 })],
                }),
            },
        ];
        var result = (0, format_polymarket_update_1.formatMultiOutcomeUpdateMessage)(updates);
        expect(result).toContain('*Polymarket Events Update*');
        expect(result).toContain('🟢');
        expect(result).toContain('*World Cup Winner*');
        expect(result).toContain('1. France: 35.6% 📈 (+2.0%)');
        expect(result).toContain('2. Argentina: 16.8% 📉 (-1.0%)');
        expect(result).toContain('[View event](https://polymarket.com/event/world-cup-winner)');
    });
    it('should show only the top 8 outcomes', function () {
        var outcomes = Array.from({ length: 14 }, function (_, index) { return createMockOutcome({ outcome: "Team ".concat(index), probability: (14 - index) / 100 }); });
        var updates = [{ subscription: createMockMultiSubscription(), event: createMockEvent({ outcomes: outcomes }) }];
        var result = (0, format_polymarket_update_1.formatMultiOutcomeUpdateMessage)(updates);
        expect(result).toContain('8. Team 7');
        expect(result).not.toContain('9. Team 8');
    });
    it('should show closed emoji for closed events', function () {
        var updates = [{ subscription: createMockMultiSubscription(), event: createMockEvent({ closed: true, active: false }) }];
        expect((0, format_polymarket_update_1.formatMultiOutcomeUpdateMessage)(updates)).toContain('🔒');
    });
});
