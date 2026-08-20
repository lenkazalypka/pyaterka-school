# Решения foundation elio

Дата: 21 августа 2026

| Решение | Почему | Что не делаем сейчас |
|---|---|---|
| Сохраняем модульный монолит и существующие границы App Router | backend и бизнес-логика уже связаны ясными server boundaries | микросервисы, multi-tenant, глобальный refactor |
| Rebrand идёт через shared brand, tokens и ключевые surfaces | это убирает пользовательский legacy без риска для identifiers и данных | переименование таблиц, env, webhook, seed UUID |
| Product workspace важнее рекламного hero | elio должен давать контроль и следующее действие | стоковые ученики, fake metrics, отзывы и статистика без источника |
| Multi-row onboarding draft заменяется RPC-транзакцией | прежний `delete + insert` мог потерять сохранённый черновик | изменение финального completion RPC, который уже атомарен |
| Rate-limit mutation RPC доступен только service role | публичный execute позволял создавать произвольные hash-строки | смена action names, pepper/env identifiers и threshold без продуктового решения |
| Private materials остаются за RLS и короткими signed URL | frontend guard не является security boundary | public buckets и постоянные ссылки |
| Next.js обновлён до 16.3.1 | 16.2.6 и 16.2.11 оставались в high advisory range | автоматический `npm audit fix` и неограниченные dependency upgrades |
| Неиспользуемый React Hook Form удалён | он был только декларацией package, формам не давал typed boundary | переписывание рабочих форм ради соответствия ожидаемому списку стека |
| Контраст важнее сохранения точного первого оттенка | исходные brand/muted цвета не проходили 4.5:1 на рабочих поверхностях | декоративная смена всей палитры |

## Следующие решения, требующие отдельного согласования

1. Точечное обновление цепочки AJV/`fast-uri` после dependency impact review.
2. Полноценные product flows parent и admin.
3. Автоматический screenshot regression baseline.
4. Удаление неиспользуемых legacy assets/CSS после route-by-route dependency map.
5. Refunds, recurring payments и reconciliation для ЮKassa.
