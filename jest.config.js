module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.spec.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^expo-notifications$': '<rootDir>/src/services/__mocks__/expo-notifications.ts',
    '^expo-device$': '<rootDir>/src/services/__mocks__/expo-device.ts',
    '^expo-constants$': '<rootDir>/src/services/__mocks__/expo-constants.ts',
    '^expo-crypto$': '<rootDir>/src/services/__mocks__/expo-crypto.ts',
  },
};
