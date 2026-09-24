export interface CreditBundle {
  id: string;
  credits: number;
  priceUsd: number; // cents
  stripePriceId: string;
}

export const CREDIT_BUNDLES: CreditBundle[] = [
  { id: 'credits_50',   credits: 50,   priceUsd: 500,  stripePriceId: process.env['STRIPE_PRICE_50']   ?? '' },
  { id: 'credits_200',  credits: 200,  priceUsd: 1500, stripePriceId: process.env['STRIPE_PRICE_200']  ?? '' },
  { id: 'credits_500',  credits: 500,  priceUsd: 3000, stripePriceId: process.env['STRIPE_PRICE_500']  ?? '' },
  { id: 'credits_1000', credits: 1000, priceUsd: 5500, stripePriceId: process.env['STRIPE_PRICE_1000'] ?? '' },
];

export function findBundle(id: string): CreditBundle | undefined {
  return CREDIT_BUNDLES.find((b) => b.id === id);
}
