import {
  contentQuerySchema,
  holdBookingSchema,
  slotsQuerySchema,
  testPaymentSchema,
} from '@eta/shared';
import { createZodDto } from 'nestjs-zod';

export class SlotsQueryDto extends createZodDto(slotsQuerySchema) {}
export class HoldBookingDto extends createZodDto(holdBookingSchema) {}
/** Body of "checkout": the page language, for the provider's page and the return URL. */
export class CheckoutDto extends createZodDto(contentQuerySchema) {}
export class TestPaymentDto extends createZodDto(testPaymentSchema) {}
