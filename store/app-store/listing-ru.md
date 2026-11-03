# GorodApp в App Store — тексты и ответы для App Store Connect (черновик)

Черновик к проверке владельцем. Всё вписывается в App Store Connect вручную. Терминология — «бонусы» (AGENTS.md §9):
бонусы — скидка, на деньги не обмениваются. Тексты совпадают с Google Play ([../google-play/listing-ru.md](../google-play/listing-ru.md)).

## Порядок

1. Сборка: `eas build -p ios --profile production` (вход в Apple ID — владелец; сертификаты и профиль создаёт EAS).
2. Приложение в App Store Connect → Apps → «+» → New App: iOS, имя `GorodApp: магазины и еда`, основной язык «Русский»,
   Bundle ID `ru.gorodapp.mobile` (появится после шага 1), SKU `gorodapp-ios`, доступ Full Access.
3. Загрузка сборки: `eas submit -p ios --latest` — EAS найдёт приложение по Bundle ID и отправит сборку в TestFlight.
4. TestFlight: проверка на своём iPhone (вход, корзина, заказ, «Назад», уведомления).
5. Страница приложения (ниже), выбор сборки, «Add for Review» → «Submit for Review».

## Страница приложения (вкладка версии 1.0)

| Поле | Значение |
|---|---|
| Название (до 30) | `GorodApp: магазины и еда` (24) |
| Подзаголовок (до 30) | `Маркет, еда и бонусы города` (27) |
| Текст для продвижения (до 170) | `Заказывайте в магазинах и ресторанах города, оплачивайте при получении и получайте бонусы за заказы.` (100) |
| Ключевые слова (до 100) | `маркетплейс,доставка,рестораны,самовывоз,одежда,обувь,кроссовки,пицца,роллы,суши,Якутск` (87; слова из названия и подзаголовка Apple учитывает сама) |
| URL поддержки | `https://gorodapp.ru/support/` |
| URL маркетинга | `https://gorodapp.ru` |
| Политика конфиденциальности | `https://gorodapp.ru/privacy/` |
| Категории | основная «Покупки», дополнительная «Еда и напитки» |
| Авторские права | `2026 <имя владельца латиницей, как в аккаунте Apple>` |
| Цена и доступность | бесплатно; страны — Россия (как в Google Play) |

**Описание** (до 4000) — как в Google Play:

> GorodApp — магазины и рестораны города в одном приложении.
>
> Маркет
> • одежда, обувь, электроника и другие товары городских магазинов;
> • размеры и наличие — прямо в карточке товара;
> • заказ сразу в нескольких магазинах, для каждого — самовывоз или доставка.
>
> Еда
> • меню ресторанов, доставка или самовывоз;
> • видно, когда ресторан открыт и до скольки принимает заказы.
>
> Бонусы
> • бонусы за заказы: процент начисления виден заранее, в карточке товара и в корзине;
> • бонусы за ежедневный вход, QR-точки партнёров и коды из соцсетей;
> • бонусами можно оплатить часть следующего заказа в пределах, которые установил магазин.
>
> Оплата — при получении заказа.
>
> Вопросы и поддержка: gorodapp.info@yandex.ru

## Скриншоты

iPhone (в App Store Connect 2026 — вкладка «iPhone с Dynamic Island (средний дисплей)», 6,3″): `screenshots/iphone-1.png`,
`iphone-2.png`, 1206×2622. iPad не нужен (`supportsTablet: false`).
Сняты с gorodapp.ru в размере экрана iPhone (440×956, ×3), оформлены `mockups/app-icon/make_screenshots_ios.py`.
Имя «Анна К.» в шапке и баланс 1 250 бонусов — пример, подставлен только на снимке (в браузере, где снимался экран);
настоящие аккаунты и данные не менялись. Подписи: «Бонусы каждый день», «Магазины вашего города». Экран Еды не загружаем, пока в ней только тестовые
рестораны; `make_screenshots_ios.py` умеет и третий — «Еда из ресторанов».

## Конфиденциальность приложения (App Privacy) — по тем же ответам, что Data safety в Google Play

- Сбор данных: **да**. Отслеживание (tracking): **нет** — рекламы и аналитики нет.
- Все типы ниже: цель — **App Functionality**; связаны с пользователем (**Linked to the user**): да; для отслеживания: нет.

| Тип в App Store Connect | Что именно |
|---|---|
| Contact Info → Name | имя, фамилия |
| Contact Info → Email Address | e-mail в профиле (необязательно) |
| Contact Info → Phone Number | вход и связь по заказу |
| Contact Info → Physical Address | адрес доставки |
| User Content → Other User Content | комментарии к заказу, адресу, возврату |
| Identifiers → User ID | номер аккаунта |
| Identifiers → Device ID | адрес телефона для уведомлений (если разрешены) |
| Purchases → Purchase History | заказы и бонусы |
| Usage Data → Product Interaction | ежедневная награда, QR-точки, игры — ради бонусов |
| Other Data → Other Data Types | пол, дата рождения |

Не собирает: местоположение, фото, контакты, здоровье, финансовую информацию (оплата при получении), историю поиска
(запрос нужен только для ответа и не хранится), рекламные идентификаторы.

## Возрастной рейтинг

Ответы — как в анкете IARC в Google Play: насилия, азартных игр на деньги, общения между пользователями нет; веб-доступ
без ограничений нет (сайт открывается только gorodapp.ru). Мини-игры дают бонусы, ставок и денег в них нет.
Алкоголь и табак не продаются (владелец, 2026-11-02) — везде «нет».

## Сведения для проверки (App Review Information)

- **Sign-in required:** да. **User name** — номер телефона проверяющего, **Password** — постоянный код
  (`STORE_REVIEW_PHONE` / `STORE_REVIEW_CODE` в `.env` сервера; вписывает владелец, в репозиторий и чат не попадают).
- **Контакт:** имя, телефон и e-mail владельца.
- **Notes** (по-английски):

> GorodApp is a marketplace for local shops and restaurants in Yakutsk, Russia. The interface is in Russian.
> Browsing works without an account. To place an order, sign in: tap «Войти», enter the phone number from the
> User name field, then enter the code from the Password field (no SMS is sent to this number).
> Payment is made in cash on delivery or pickup, so no payment details are needed. Bonuses are a loyalty discount
> and cannot be exchanged for money. Orders placed from the review account are test orders; we remove them.
> Account deletion: Профиль → Настройки аккаунта → Удалить аккаунт → Продолжить → Удалить аккаунт.

## Прочее

- **Export compliance:** в сборке `ITSAppUsesNonExemptEncryption: false` (только HTTPS) — вопрос о шифровании не задаётся.
- **Content rights:** приложение показывает фото и описания товаров магазинов — «да, права есть» (магазины дают их сами).
