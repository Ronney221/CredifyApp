module.exports = {
  preset: 'ts-jest',
  setupFilesAfterEnv: ['./jest.setup.new.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  projects: [
    {
      displayName: 'logic',
      preset: 'ts-jest',
      testMatch: ['**/__tests__/logic/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.new.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
    {
      displayName: 'components',
      preset: 'react-native',
      testMatch: ['**/__tests__/notifications/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.new.ts',
        '@testing-library/jest-native/extend-expect'
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^react-native$': '<rootDir>/__mocks__/react-native.js',
        '^src/data/card-data$': '<rootDir>/__mocks__/src/data/card-data.ts',
        '^expo-web-browser$': '<rootDir>/__mocks__/expo-web-browser.js',
        '\\.(jpg|jpeg|png|gif|webp|avif|svg)$': '<rootDir>/__mocks__/fileMock.js'
      },
      transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|@expo|expo|expo-router|expo-haptics|expo-linear-gradient|expo-web-browser|react-navigation|@react-navigation/.*)/)'
      ],
    }
  ]
}; 