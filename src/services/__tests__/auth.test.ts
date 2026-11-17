import { authError, isEmail, passwordStrength } from '../auth';

describe('giriş formu', () => {
  it('e-posta', () => {
    expect(isEmail('a@b.co')).toBe(true);
    expect(isEmail(' ali@mail.com ')).toBe(true);
    expect(isEmail('ali@mail')).toBe(false);
    expect(isEmail('ali mail@x.com')).toBe(false);
  });

  it('şifre gücü', () => {
    expect(passwordStrength('12345')).toBe(0);
    expect(passwordStrength('abcdef')).toBe(1);
    expect(passwordStrength('abcdefghij')).toBe(2);
    expect(passwordStrength('Abcdefghij')).toBe(3);
    expect(passwordStrength('Abcdefgh1!')).toBe(4);
  });

  it('hata çevirisi', () => {
    expect(authError('Invalid login credentials')).toBe('E-posta veya şifre hatalı.');
    expect(authError('email rate limit exceeded')).toMatch(/Çok fazla/);
    expect(authError('???')).toMatch(/ters gitti/);
  });
});
