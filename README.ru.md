<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="NestJS Logo" />
</p>

# Nest Smart Assistant

[English](./README.md)

![Node.js](https://img.shields.io/badge/node-%3E=18.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-NestJS%2C%20TypeScript-blueviolet)

> **Многофункциональный ассистент на базе NestJS с интеграцией OpenAI, Google Tasks и Telegram-ботом.**

---

## Описание

**Nest Smart Assistant** — это серверное приложение на TypeScript/NestJS, предназначенное для автоматизации задач, интеграции с OpenAI (GPT), Google Tasks, а также взаимодействия через Telegram-бота. Проект реализует авторизацию, управление сессиями, логирование, конвертацию аудио и расширяемую архитектуру сервисов.

---

## Основные возможности

- Интеграция с OpenAI (GPT) для генерации и обработки текстов
- Работа с Google Tasks API (создание и управление задачами)
- Telegram-бот для интерактивного взаимодействия
- Авторизация и управление сессиями пользователей
- Логирование событий и действий
- Конвертация аудиофайлов (OGG и др.)
- Гибкая архитектура для расширения ассистента

---

## Структура проекта

```
src/
├── app.module.ts                # Главный модуль приложения
├── auth/                        # Модуль авторизации и guard'ы
├── create-daily-schedule/       # Модуль создания ежедневных расписаний
├── google-tasks-api/            # Интеграция с Google Tasks
├── openai/                      # Работа с OpenAI API
├── openai-assistant/            # Логика ассистента на базе OpenAI
├── services/                    # Сервисы: команды, настройки, логгер, сессии, конвертер
├── telegraf/                    # Telegram-бот (Telegraf)
└── main.ts                      # Точка входа
```

---

## Требования

- Node.js >= 18.x
- npm >= 9.x
- Docker (опционально, для контейнеризации)
- Ключи API для OpenAI, Google (см. настройки)

---

## Установка

```bash
git clone https://github.com/makshuk/nest-smart-assistant.git
cd nest-smart-assistant
npm install
```

---

## Запуск

### В режиме разработки

```bash
npm run start:dev
```

### В production-режиме

```bash
npm run start:prod
```

### Через Docker

```bash
docker build -t nest-smart-assistant .
docker run -p 3000:3000 nest-smart-assistant
```

### Через docker-compose

```bash
docker-compose up --build
```

---

## Конфигурация

- Основные настройки хранятся в `configs/settings.json`.
- Для работы с внешними API (OpenAI, Google) необходимо указать соответствующие ключи.
- Пример переменных окружения:
  - `OPENAI_API_KEY`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `TELEGRAM_BOT_TOKEN`

---

## Примеры использования

### 1. Взаимодействие через Telegram

- Найдите бота по имени, указанному в настройках, и начните диалог.
- Ассистент поддерживает команды для создания задач, генерации текста и др.

### 2. Запрос к OpenAI через REST API

```http
POST /openai/ask
Content-Type: application/json

{
  "prompt": "Составь план на день",
  "userId": "user-123"
}
```

### 3. Создание задачи в Google Tasks

```http
POST /google-tasks-api/create
Content-Type: application/json

{
  "title": "Позвонить клиенту",
  "due": "2025-04-21T18:00:00Z"
}
```

---

## Тестирование

```bash
# Юнит-тесты
npm run test

# E2E тесты
npm run test:e2e

# Покрытие тестами
npm run test:cov
```

---

## Вклад в проект

Будем рады вашим предложениям и pull request'ам! Перед началом ознакомьтесь с CONTRIBUTING.md (если есть) или откройте issue для обсуждения.

---

## Лицензия

Проект распространяется по лицензии [MIT](LICENSE).

---