import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// 卡片族状态矩阵：Card 全结构（Header/Title/Description/Action/Content/Footer）。
// 文案沿用旧 theme-states 的 i18n key（dev.themeStates.*），逐字未改。

export default function CardMatrix(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      data-testid="cardMatrix"
      className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-text">{t('dev.themeStates.cardMatrix')}</h2>
        <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.cardMatrixDesc')}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-full">
          <CardHeader>
            <CardTitle>{t('dev.themeStates.cardTitle')}</CardTitle>
            <CardDescription>{t('dev.themeStates.cardDescription')}</CardDescription>
            <CardAction>
              <Badge variant="primary">{t('dev.themeStates.cardActionBadge')}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-(--type-2-fg)">{t('dev.themeStates.cardContent')}</p>
          </CardContent>
          <CardFooter className="border-t">
            <span className="text-sm text-text-3">{t('dev.themeStates.cardFooter')}</span>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
