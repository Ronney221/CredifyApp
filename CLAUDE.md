# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Development
- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run on web browser

### Testing
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- Tests are located in `__tests__/` directory and focus on logic tests in `__tests__/logic/`
- Jest configuration targets only `**/__tests__/logic/**/*.test.ts` files for focused testing

### Code Quality
- `npm run lint` - Run ESLint for code linting

### Development Reset
- `npm run reset-project` - Reset project configuration (available via scripts)

## Architecture Overview

### Project Structure
This is a React Native mobile app built with Expo (SDK 53) and TypeScript. The app follows a modern, scalable architecture:

**Frontend Stack:**
- React Native with Expo managed workflow
- TypeScript for type safety
- Expo Router for file-based navigation
- React Navigation for native navigation patterns
- Moti & Reanimated for animations
- Custom component library with modern UI patterns

**Backend & Data:**
- Supabase as Backend-as-a-Service (BaaS)
- PostgreSQL database with version-controlled migrations
- Supabase Auth for user authentication (including social logins)
- Supabase Edge Functions for serverless API endpoints
- Supabase Storage for file management

**Key Features:**
- AI-powered financial assistant using OpenAI API
- Sophisticated RAG (Retrieval-Augmented Generation) pipeline
- Real-time credit card perk tracking and ROI calculations
- Interactive data visualizations and insights
- Push notifications for perk expiration reminders

### Directory Structure
- `app/` - Main application screens using Expo Router
  - `(tabs)/` - Tab-based navigation screens
  - `(auth)/` - Authentication screens
  - `(onboarding)/` - User onboarding flow
- `components/` - Reusable UI components organized by feature
- `hooks/` - Custom React hooks for shared logic
- `lib/` - Core utilities (database, auth, OpenAI integration)
- `contexts/` - React Context providers
- `database/` - SQL schemas and migrations
- `types/` - TypeScript type definitions
- `utils/` - Utility functions

### Key Technical Patterns
- Uses React Context with hooks for global state management
- Implements custom hooks for complex business logic (e.g., `usePerkRedemption`, `useUserCards`)
- Follows functional programming patterns with TypeScript interfaces
- Uses Supabase real-time subscriptions for live data updates
- Implements advanced prompt engineering for reliable AI responses

## Important Development Notes

### Code Style (from .cursor/rules/)
- Use functional and declarative programming patterns; avoid classes
- Prefer TypeScript interfaces over types
- Use lowercase with dashes for directories (e.g., `components/auth-wizard`)
- Favor named exports for components
- Create separate component files for code over 100 lines
- Follow Expo's official documentation patterns

### Testing Strategy
- Unit tests use Jest with React Native Testing Library and ts-jest preset
- Test configuration focuses on logic tests in `__tests__/logic/`
- Mock files are provided for React Native and asset imports
- Transform configurations handle TypeScript and React Native modules
- Module name mapping supports @ alias for root directory imports

### State Management
- React Context and useReducer for global state
- Custom hooks encapsulate complex business logic
- Real-time updates via Supabase subscriptions

### Database
- PostgreSQL with carefully designed schema
- Version-controlled migrations in `database/migrations/`
- Tables for users, cards, perks, and redemption tracking

### AI Integration
- OpenAI API integration via Supabase Edge Functions
- Two-stage RAG pipeline with local pre-filtering
- Structured prompt engineering for reliable JSON responses
- Context compression to optimize API costs

## Security Considerations
- Environment variables managed through EAS Secrets
- Supabase RLS (Row Level Security) for data access control
- Secure storage for sensitive user data
- Proper authentication flows with social login support

## Commit Message Guidelines
- Exclude claude and ai mentions when creating commit messages