import { describe, expect, it } from 'vitest';
import ar from './i18n/ar.json';
import en from './i18n/en.json';
import he from './i18n/he.json';
import { renderMail } from './mail-templates';

describe('mail templates', () => {
  it('fills placeholders in the recipient language', () => {
    const mail = renderMail({
      to: 'x@y.co',
      locale: 'he',
      template: 'passwordReset',
      params: { firstName: 'Rana', link: 'https://example.com/r', minutes: 30 },
    });
    expect(mail.text).toContain('Rana');
    expect(mail.text).toContain('https://example.com/r');
    expect(mail.text).toContain('30');
    expect(mail.text).not.toMatch(/\{\w+\}/);
  });

  it('has the same templates in every language', () => {
    const shape = (catalog: object) => JSON.stringify(Object.keys(catalog).sort());
    expect(shape(ar)).toBe(shape(en));
    expect(shape(he)).toBe(shape(en));
  });
});
