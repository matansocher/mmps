"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/e2e/**/*.spec.ts'],
        testTimeout: 30000,
        hookTimeout: 30000,
    },
    resolve: {
        alias: {
            '@src': path_1.default.resolve(__dirname, 'src'),
            '@core': path_1.default.resolve(__dirname, 'src/core'),
            '@features': path_1.default.resolve(__dirname, 'src/features'),
            '@services': path_1.default.resolve(__dirname, 'src/services'),
            '@shared': path_1.default.resolve(__dirname, 'src/shared'),
            '@config': path_1.default.resolve(__dirname, 'src/config'),
            '@decorators': path_1.default.resolve(__dirname, 'src/decorators'),
            '@mocks': path_1.default.resolve(__dirname, 'src/core/mocks'),
            '@test': path_1.default.resolve(__dirname, 'test'),
        },
    },
});
