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
Папки `ios/` и `android/` не хранятся в git: их создают `npx expo run:*` / `npx expo prebuild` и сборка EAS
из `app.json`. Номер сборки ведёт EAS (`appVersionSource: remote`, в `production` — `autoIncrement`),
вручную `buildNumber` / `versionCode` не менять; версию для магазинов (`version` в `app.json`) — меняем сами.

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview      # APK: поставить на Android-телефон по ссылке
eas build --platform ios --profile production       # iOS для TestFlight (вход в Apple Developer)
eas submit --platform ios --latest                  # отправить в TestFlight
eas build --platform android --profile production   # AAB для Google Play
```
Проект EAS уже настроен (`app.json` → `extra.eas.projectId`). Ключи и пароли (Apple, Google, Expo)
в репозиторий не кладутся — EAS хранит их у себя.

Локальная сборка iOS (`npx expo run:ios`) требует CocoaPods и Ruby 2.7+ (системный Ruby 2.6 на macOS
не подходит для скриптов Expo).
