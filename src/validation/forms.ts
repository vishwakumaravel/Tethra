import { z } from 'zod';

export const emailAuthSchema = z
  .object({
    confirmPassword: z.string().default(''),
    email: z.string().trim().email('Use a valid email address.'),
    mode: z.enum(['sign-in', 'sign-up']),
    password: z.string().min(8, 'Password needs at least 8 characters.'),
  })
  .superRefine((value, context) => {
    if (value.mode === 'sign-up' && value.confirmPassword !== value.password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords need to match.',
        path: ['confirmPassword'],
      });
    }
  });

export const phoneRequestSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a phone number.')
    .refine((value) => normalizePhoneNumber(value).length >= 11, 'Use a valid phone number with country code.'),
});

export const phoneCodeSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code from your SMS.'),
});

export const profileSchema = z.object({
  avatarUrl: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^https?:\/\/.+/i.test(value), 'Use a full https:// URL or leave this blank.'),
  displayName: z
    .string()
    .trim()
    .min(2, 'Add at least 2 characters for your display name.')
    .max(36, 'Keep your display name under 36 characters.'),
});

export const inviteCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .refine((value) => value.length === 6, 'Invite codes are 6 characters.'),
});

export type EmailAuthFormValues = z.input<typeof emailAuthSchema>;
export type InviteCodeValues = z.input<typeof inviteCodeSchema>;
export type PhoneCodeValues = z.input<typeof phoneCodeSchema>;
export type PhoneRequestValues = z.input<typeof phoneRequestSchema>;
export type ProfileFormValues = z.input<typeof profileSchema>;

function normalizePhoneNumber(phone: string) {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^\d+]/g, '');

  if (digits.startsWith('+')) {
    return digits;
  }

  const onlyDigits = digits.replace(/[^\d]/g, '');

  if (onlyDigits.length === 10) {
    return `+1${onlyDigits}`;
  }

  return `+${onlyDigits}`;
}
