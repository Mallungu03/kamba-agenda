import type { Appointment, Waitlist } from '@generated/prisma/client';

export interface RegisteredEventPayload {
  userId: string;
  email: string;
  code: string;
}

export interface PasswordResetEventPayload {
  userId: string;
  email: string;
  code: string;
}

export interface EmailVerificationEventPayload {
  userId: string;
  email: string;
  code: string;
}

export interface AppointmentCreatedEventPayload {
  appointment: Appointment & { service: { name: string } };
}

export interface AppointmentCancelledEventPayload {
  appointment: Appointment & { service: { name: string } };
}

export interface WaitlistNotifiedEventPayload {
  entry: Waitlist & { service: { name: string } };
  appointment: Appointment & { service: { name: string } };
}
