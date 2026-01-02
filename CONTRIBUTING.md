# Contributing to TeamTrek

First off, thank you for considering contributing to TeamTrek! It's people like you that make TeamTrek such a great tool for building healthier, more connected teams.

## Code of Conduct

By participating in this project, you agree to maintain a welcoming, inclusive environment for everyone.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if applicable**
- **Include your environment details** (OS, Node version, browser)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the proposed enhancement**
- **Explain why this enhancement would be useful**
- **Include mockups or examples if applicable**

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes** and ensure the code follows existing patterns
4. **Test your changes** thoroughly
5. **Update documentation** if you're changing functionality
6. **Submit a pull request**

## Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Git

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/teamtrek.git
cd teamtrek

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
cp config.example.ts config.ts

# Set up the database
createdb teamtrek
psql teamtrek < schema.sql

# Start development server
npm run dev
```

### Project Structure

```
teamtrek/
├── components/          # React components
├── services/            # Backend services (Slack, Gemini, data)
├── server.ts            # Express API server
├── App.tsx              # React app root
├── config.ts            # Your local configuration
├── constants.ts         # App constants
└── types.ts             # TypeScript types
```

## Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Define proper interfaces for data structures
- Avoid `any` types where possible

### React Components

- Use functional components with hooks
- Keep components focused and reusable
- Use Tailwind CSS for styling

### Commits

- Use clear, descriptive commit messages
- Reference issues when applicable (e.g., "Fix #123: ...")
- Keep commits focused on a single change

### Code Style

- Run `npm run lint` before committing
- Use meaningful variable and function names
- Add comments for complex logic

## Feature Ideas Welcome!

Some areas where we'd love contributions:

- **New badge types** - Creative achievements for users to earn
- **Additional integrations** - Microsoft Teams, Discord, etc.
- **Mobile app** - React Native companion app
- **Data visualizations** - New ways to display progress
- **Internationalization** - Support for multiple languages
- **Accessibility** - Improvements for screen readers, etc.

## Questions?

Feel free to open an issue with the "question" label if you need help getting started.

---

Thanks again for contributing! 🚀
