export interface ContractSpec {
  id: string;
  label: string;
  underlyingMultiplier: number;
  hedgeInstrument: string;
  hedgeMultiplier: number;
  tickSize: number;
  tickValue: number;
  defaultSlippage: number;
  strikeStep: number;
}

export const CONTRACT_SPECS: Record<string, ContractSpec> = {
  GC: {
    id: 'GC',
    label: 'Gold Futures',
    underlyingMultiplier: 100,
    hedgeInstrument: 'MGC',
    hedgeMultiplier: 10,
    tickSize: 0.1,
    tickValue: 10,
    defaultSlippage: 5,
    strikeStep: 10,
  },
  ES: {
    id: 'ES',
    label: 'E-mini S&P 500',
    underlyingMultiplier: 50,
    hedgeInstrument: 'MES',
    hedgeMultiplier: 5,
    tickSize: 0.25,
    tickValue: 12.50,
    defaultSlippage: 2.5,
    strikeStep: 25,
  },
  HSI: {
    id: 'HSI',
    label: 'Hang Seng Index',
    underlyingMultiplier: 50,
    hedgeInstrument: 'MHI',
    hedgeMultiplier: 10,
    tickSize: 1,
    tickValue: 50,
    defaultSlippage: 5,
    strikeStep: 100,
  },
};
