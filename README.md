# Binance Futures Large Orders Screener

Скринер для отслеживания крупных лимитных и рыночных заявок на Binance Futures с уведомлениями в Telegram.

## Возможности

- Фильтрация фьючерсных пар по объему торгов (>$30M в сутки)
- Отслеживание крупных лимитных заявок в стакане
- Отслеживание крупных рыночных сделок
- Уведомления в Telegram в реальном времени

## Установка

```bash
npm install
```

## Настройка

Создайте файл `.env` в корне проекта:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
MIN_VOLUME_24H=30000000
MIN_ORDER_PERCENT=0.05
MIN_ORDER_FLOOR=250000
MIN_MARKET_PERCENT=0.1
MIN_MARKET_FLOOR=500000
```

### Получение Telegram Bot Token

1. Найдите @BotFather в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Скопируйте полученный токен

### Получение Chat ID

1. Напишите что-нибудь вашему боту
2. Откройте: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Найдите `chat.id` в ответе

## Запуск

```bash
npm start
```

Или для разработки с автоперезагрузкой:

```bash
npm run dev
```

## Параметры конфигурации

| Параметр | Описание |
|----------|----------|
| `MIN_VOLUME_24H` | Минимальный объем торгов за 24ч (USD) |
| `MIN_ORDER_PERCENT` | Минимальный размер лимитной заявки (% от 24ч объема) |
| `MIN_ORDER_FLOOR` | Минимальный порог для лимитных заявок (USD) |
| `MIN_MARKET_PERCENT` | Минимальный размер рыночной сделки (% от 24ч объема) |
| `MIN_MARKET_FLOOR` | Минимальный порог для рыночных сделок (USD) |

Порог = MAX(процент от объема, floor)

