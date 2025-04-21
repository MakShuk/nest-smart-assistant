<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="NestJS Logo" />
</p>

# Nest Smart Assistant

[Русский](./README.ru.md)

![Node.js](https://img.shields.io/badge/node-%3E=18.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-NestJS%2C%20TypeScript-blueviolet)

> **A multifunctional assistant based on NestJS with OpenAI, Google Tasks, and Telegram integration.**

---

## Description

**Nest Smart Assistant** is a server-side application built with TypeScript/NestJS, designed for task automation, OpenAI (GPT) integration, Google Tasks management, and interaction via a Telegram bot. The project implements user authentication, session management, logging, audio conversion, and an extensible service architecture.

---

## Features

- OpenAI (GPT) integration for text generation and processing
- Google Tasks API support (create and manage tasks)
- Telegram bot for interactive communication
- User authentication and session management
- Event and action logging
- Audio file conversion (OGG and more)
- Flexible, extensible architecture

---

## Project Structure

```
src/
├── app.module.ts                # Main application module
├── auth/                        # Authentication module and guards
├── create-daily-schedule/       # Daily schedule creation module
├── google-tasks-api/            # Google Tasks integration
├── openai/                      # OpenAI API logic
├── openai-assistant/            # OpenAI-based assistant logic
├── services/                    # Services: commands, settings, logger, sessions, converter
├── telegraf/                    # Telegram bot (Telegraf)
└── main.ts                      # Entry point
```

---

## Requirements

- Node.js >= 18.x
- npm >= 9.x
- Docker (optional, for containerization)
- API keys for OpenAI, Google (see configuration)

---

## Installation

```bash
git clone https://github.com/your-user/nest-smart-assistant.git
cd nest-smart-assistant
npm install
```

---

## Running the App

### Development mode

```bash
npm run start:dev
```

### Production mode

```bash
npm run start:prod
```

### Using Docker

```bash
docker build -t nest-smart-assistant .
docker run -p 3000:3000 nest-smart-assistant
```

### Using docker-compose

```bash
docker-compose up --build
```

---

## Configuration

- Main settings are stored in `configs/settings.json`.
- For external APIs (OpenAI, Google), provide the required keys.
- Example environment variables:
  - `OPENAI_API_KEY`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `TELEGRAM_BOT_TOKEN`

---

## Usage Examples

### 1. Interacting via Telegram

- Find the bot by the name specified in the settings and start a conversation.
- The assistant supports commands for task creation, text generation, and more.

### 2. OpenAI request via REST API

```http
POST /openai/ask
Content-Type: application/json

{
  "prompt": "Create a daily plan",
  "userId": "user-123"
}
```

### 3. Creating a Google Task

```http
POST /google-tasks-api/create
Content-Type: application/json

{
  "title": "Call the client",
  "due": "2025-04-21T18:00:00Z"
}
```

---

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## Contributing

We welcome your suggestions and pull requests! Please read CONTRIBUTING.md (if available) or open an issue to discuss your ideas.

---

## License

This project is licensed under the [MIT License](LICENSE).

---
