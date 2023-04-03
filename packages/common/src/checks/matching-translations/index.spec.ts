import { expect } from 'chai';
import { check } from '../../test-helper';
import { MatchingTranslations } from '../../checks/matching-translations/index';

describe('Module: MatchingTranslations', async () => {
  it('should report offenses when the translation file is missing a key', async () => {
    const theme = {
      'locales/en.default.json': JSON.stringify({
        hello: 'Hello',
        world: 'World',
      }),
      'locales/pt-BR.json': JSON.stringify({
        hello: 'Olá',
      }),
    };

    const offenses = await check(theme, [MatchingTranslations]);

    expect(offenses).to.length(1);
    expect(offenses).to.containOffense("The translation for 'world' is missing");
  });

  it('should report offenses when the default translation is missing a key', async () => {
    const theme = {
      'locales/en.default.json': JSON.stringify({
        hello: 'Hello',
      }),
      'locales/pt-BR.json': JSON.stringify({
        hello: 'Olá',
        world: 'Mundo',
      }),
    };

    const offenses = await check(theme, [MatchingTranslations]);

    expect(offenses).to.length(1);
    expect(offenses).to.containOffense("A default translation for 'world' does not exist");
  });

  it('should report offenses when nested translation keys do not exist', async () => {
    const theme = {
      'locales/en.default.json': JSON.stringify({
        hello: { world: 'Hello, world!' },
      }),
      'locales/pt-BR.json': JSON.stringify({
        hello: {},
      }),
    };

    const offenses = await check(theme, [MatchingTranslations]);

    expect(offenses).to.length(1);
    expect(offenses).to.containOffense({
      message: "The translation for 'hello.world' is missing",
      absolutePath: '/locales/pt-BR.json',
    });
  });

  it('should report offenses when translation shapes do not match', async () => {
    const theme = {
      'locales/en.default.json': JSON.stringify({
        hello: { world: 'Hello, world!' },
      }),
      'locales/pt-BR.json': JSON.stringify({
        hello: 'Olá',
      }),
    };

    const offenses = await check(theme, [MatchingTranslations]);

    expect(offenses).to.length(2);
    expect(offenses).to.containOffense({
      message: "A default translation for 'hello' does not exist",
      absolutePath: '/locales/pt-BR.json',
    });
    expect(offenses).to.containOffense({
      message: "The translation for 'hello.world' is missing",
      absolutePath: '/locales/pt-BR.json',
    });
  });

  it('should report offenses when nested translation keys do not match', async () => {
    const theme = {
      'locales/en.default.json': JSON.stringify({
        hello: { world: 'Hello, world!' },
      }),
      'locales/fr.json': JSON.stringify({
        hello: { monde: 'Bonjour, monde' },
      }),
      'locales/es-ES.json': JSON.stringify({
        hello: { world: 'Hello, world!', mundo: { hola: '¡Hola, mundo!' } },
      }),
    };

    const offenses = await check(theme, [MatchingTranslations]);

    expect(offenses).to.length(3);
    expect(offenses).to.containOffense({
      message: "A default translation for 'hello.monde' does not exist",
      absolutePath: '/locales/fr.json',
    });
    expect(offenses).to.containOffense({
      message: "A default translation for 'hello.mundo.hola' does not exist",
      absolutePath: '/locales/es-ES.json',
    });
    expect(offenses).to.containOffense({
      message: "The translation for 'hello.world' is missing",
      absolutePath: '/locales/fr.json',
    });
  });

  it('should not report offenses when default translations do not exist', async () => {
    const theme = {
      'locales/en.json': JSON.stringify({
        hello: 'Hello',
      }),
      'locales/pt-BR.json': JSON.stringify({
        hello: 'Olá',
      }),
    };

    const offenses = await check(theme, [MatchingTranslations]);

    expect(offenses).to.length(0);
  });

  it('should not report offenses when translations match', async () => {
    const theme = {
      'locales/en.default.json': JSON.stringify({
        hello: 'Hello',
        world: 'World',
      }),
      'locales/pt-BR.json': JSON.stringify({
        hello: 'Olá',
        world: 'Mundo',
      }),
    };

    const offenses = await check(theme, [MatchingTranslations]);

    expect(offenses).to.length(0);
  });

  it('should not report offenses when nested translations match', async () => {
    const theme = {
      'locales/en.default.json': JSON.stringify({
        hello: { world: 'Hello, world!' },
      }),
      'locales/pt-BR.json': JSON.stringify({
        hello: { world: 'Olá, mundo!' },
      }),
      'locales/fr.json': JSON.stringify({
        hello: { world: 'Bonjour, monde' },
      }),
    };

    const offenses = await check(theme, [MatchingTranslations]);

    expect(offenses).to.length(0);
  });

  it('should not report offenses and ignore pluralization', async () => {
    const theme = {
      'locales/en.default.json': JSON.stringify({
        hello: {
          one: 'Hello, you',
          other: "Hello, y'all",
        },
      }),
      'locales/pt-BR.json': JSON.stringify({
        hello: {
          zero: 'Estou sozinho :(',
          few: 'Olá, galerinha :)',
        },
      }),
    };

    const offenses = await check(theme, [MatchingTranslations]);

    expect(offenses).to.length(0);
  });

  it('should not report offenses and ignore keys provided by Shopify', async () => {
    const theme = {
      'locales/en.default.json': JSON.stringify({
        hello: 'Hello',
        shopify: {
          checkout: {
            general: {
              page_title: 'Checkout',
            },
          },
        },
      }),
      'locales/pt-BR.json': JSON.stringify({
        hello: 'Olá',
        shopify: {
          sentence: {
            words_connector: 'hello world',
          },
        },
      }),
    };

    const offenses = await check(theme, [MatchingTranslations]);

    expect(offenses).to.length(0);
  });

  it('should not report offenses and ignore "*.schema.json" files', async () => {
    const theme = {
      'locales/en.default.json': JSON.stringify({ hello: 'Hello' }),
      'locales/pt-BR.schema.json': JSON.stringify({}),
    };

    const offenses = await check(theme, [MatchingTranslations]);

    expect(offenses).to.length(0);
  });
});
