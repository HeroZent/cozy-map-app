export type CardStyleId = 'a' | 'b' | 'c' | 'd' | 'e';

export interface CardStyleDef {
  id: CardStyleId;
  label: string;
  tier: 'free' | 'premium';
  backgroundColors: string[];         // 1 item = solid, 2+ = LinearGradient colors
  gradientStart: { x: number; y: number }; // 0.0–1.0 normalized coordinates (LinearGradient)
  gradientEnd: { x: number; y: number };
  textColor: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  locationColor: string;
  footerColor: string;
  ruledLines: boolean;
  ruledLineColor: string;
  foldCorner: boolean;
  foldColor: string;
  tornTopEdge: boolean;
  leftMarginStripe: boolean;
  leftMarginColor: string;
  pillFooter: boolean;                // Style B: pill around reply count
  sealFooter: boolean;                // Style C: wax-seal icon
  borderColor: string;                // 'transparent' = no border
  shadowColor: string;
}

export const CARD_STYLES: CardStyleDef[] = [
  {
    id: 'a',
    label: 'Warm Parchment',
    tier: 'free',
    backgroundColors: ['#f7edcc', '#ecddb0', '#f2e5bc'],
    gradientStart: { x: 0.3, y: 0 },
    gradientEnd: { x: 0.7, y: 1 },
    textColor: '#1e1206',
    fontFamily: 'Kalam_400Regular',
    fontSize: 17,
    lineHeight: 32,
    locationColor: '#7a5a1a',
    footerColor: '#7a5a1a',
    ruledLines: true,
    ruledLineColor: 'rgba(160,130,60,0.15)',
    foldCorner: false,
    foldColor: 'transparent',
    tornTopEdge: false,
    leftMarginStripe: false,
    leftMarginColor: 'transparent',
    pillFooter: false,
    sealFooter: false,
    borderColor: 'transparent',
    shadowColor: 'rgba(0,0,0,0.25)',
  },
  {
    id: 'b',
    label: 'Dark Candlelight',
    tier: 'free',
    backgroundColors: ['#1e1508', '#26190c', '#1c1308'],
    gradientStart: { x: 0.25, y: 0 },
    gradientEnd: { x: 0.75, y: 1 },
    textColor: '#f0dfa8',
    fontFamily: 'Caveat_400Regular',
    fontSize: 20,
    lineHeight: 30,
    locationColor: 'rgba(244,201,122,0.45)',
    footerColor: 'rgba(244,201,122,0.5)',
    ruledLines: false,
    ruledLineColor: 'transparent',
    foldCorner: false,
    foldColor: 'transparent',
    tornTopEdge: false,
    leftMarginStripe: false,
    leftMarginColor: 'transparent',
    pillFooter: true,
    sealFooter: false,
    borderColor: 'rgba(244,201,122,0.12)',
    shadowColor: 'rgba(0,0,0,0.5)',
  },
  {
    id: 'c',
    label: 'Torn Letter',
    tier: 'free',
    backgroundColors: ['#f7edcc', '#ecddb0'],
    gradientStart: { x: 0.3, y: 0 },
    gradientEnd: { x: 0.7, y: 1 },
    textColor: '#1a0e04',
    fontFamily: 'DancingScript_400Regular',
    fontSize: 19,
    lineHeight: 30,
    locationColor: '#8a6820',
    footerColor: '#8a6820',
    ruledLines: false,
    ruledLineColor: 'transparent',
    foldCorner: false,
    foldColor: 'transparent',
    tornTopEdge: true,
    leftMarginStripe: false,
    leftMarginColor: 'transparent',
    pillFooter: false,
    sealFooter: true,
    borderColor: 'transparent',
    shadowColor: 'rgba(0,0,0,0.3)',
  },
  {
    id: 'd',
    label: 'Midnight Journal',
    tier: 'free',
    backgroundColors: ['#0f0c1a', '#0f0c1a'], // intentional solid via identical stops for consistent LinearGradient layout
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 0, y: 1 },
    textColor: '#e8deff',
    fontFamily: 'PatrickHand_400Regular',
    fontSize: 16,
    lineHeight: 32,
    locationColor: 'rgba(208,184,255,0.5)',
    footerColor: 'rgba(208,184,255,0.5)',
    ruledLines: true,
    ruledLineColor: 'rgba(208,184,255,0.05)',
    foldCorner: false,
    foldColor: 'transparent',
    tornTopEdge: false,
    leftMarginStripe: true,
    leftMarginColor: 'rgba(208,184,255,0.3)',
    pillFooter: false,
    sealFooter: false,
    borderColor: 'rgba(208,184,255,0.15)',
    shadowColor: 'rgba(0,0,0,0.5)',
  },
  {
    id: 'e',
    label: 'Folded Corner',
    tier: 'free',
    backgroundColors: ['#fdf6e4', '#f5e8c4'],
    gradientStart: { x: 0.4, y: 0 },
    gradientEnd: { x: 0.6, y: 1 },
    textColor: '#18100a',
    fontFamily: 'ReenieBeanie_400Regular',
    fontSize: 21,
    lineHeight: 30,
    locationColor: '#9a7030',
    footerColor: '#9a7030',
    ruledLines: false,
    ruledLineColor: 'transparent',
    foldCorner: true,
    foldColor: '#d4b96a',
    tornTopEdge: false,
    leftMarginStripe: false,
    leftMarginColor: 'transparent',
    pillFooter: false,
    sealFooter: false,
    borderColor: 'transparent',
    shadowColor: 'rgba(0,0,0,0.2)',
  },
];

export const DEFAULT_CARD_STYLE: CardStyleId = 'a';

export function getCardStyle(id: string): CardStyleDef {
  return CARD_STYLES.find((s) => s.id === id) ?? CARD_STYLES[0]!;
}
