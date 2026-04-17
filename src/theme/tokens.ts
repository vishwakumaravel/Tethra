import { Platform } from 'react-native';

export const colors = {
  border: '#E8CDC4',
  canvas: '#FFF6F1',
  card: '#FFFDFB',
  cardMutedOnDark: '#DAD3E9',
  cardTextOnDark: '#FFF8F5',
  chip: '#F8E9E2',
  danger: '#B14457',
  dangerSoft: '#FCE8EE',
  darkOverlay: '#2B263E',
  field: '#FFF8F5',
  highlight: '#FFD56F',
  ink: '#201B2E',
  message: '#F7EFEA',
  messageBorder: '#EBD2C8',
  muted: '#6F6376',
  orbAccent: 'rgba(255, 213, 111, 0.42)',
  orbPrimary: 'rgba(234, 91, 91, 0.15)',
  orbSecondary: 'rgba(53, 175, 145, 0.14)',
  placeholder: '#A497AA',
  primary: '#E45B64',
  secondaryButton: '#FFF2ED',
  text: '#231D32',
  warning: '#D08A00',
  warningSoft: '#FFF5D8',
};

export const spacing = {
  xs: 6,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  lg: 18,
  xl: 28,
};

export const shadow = {
  card: Platform.select({
    android: {
      elevation: 6,
    },
    default: {
      shadowColor: '#201B2E',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
    },
  }),
};
