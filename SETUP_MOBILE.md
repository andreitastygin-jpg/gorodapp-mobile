# GorodApp Mobile — установка

Приложение на Expo (SDK 57, React Native 0.86). Внутри — сайт https://gorodapp.ru в одном WebView:
каталог, корзина, оформление, вход (МТС ID / код из SMS), согласия и продление входа делает сайт.
Приложение добавляет: внешние ссылки — в браузер/приложения телефона, кнопку «Назад» на Android,
экран «нет связи», ссылки `gorodapp://…` и регистрацию телефона для уведомлений (`src/services/webSession.ts`).

## Требования
- Node.js, npm (единственный менеджер пакетов проекта: `package-lock.json`);
- Expo / EAS CLI; Xcode (iOS) или Android Studio (Android) для локального запуска.

## Запуск
```bash
npm install
npx expo run:ios       # или npx expo run:android
npm test               # тесты
npx tsc --noEmit       # проверка типов
npx expo-doctor        # проверка зависимостей
```

## Сборка (EAS)
```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile production
eas build --platform android --profile production
```
Проект EAS уже настроен (`app.json` → `extra.eas.projectId`).
