import { expect, describe, it, beforeAll, afterAll } from 'vitest';
import {
  fileExists,
  findRootURI,
  getDefaultLocaleFactory,
  getDefaultTranslationsFactory,
  loadConfig,
} from './dependencies';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { URI, Utils } from 'vscode-uri';
import * as mktemp from 'mktemp';

type Tree = {
  [k in string]: Tree | string;
};

interface Workspace {
  root: string;
  path(relativePath: string): string;
  uri(relativePath: string): string;
  clean(): Promise<any>;
}

const theme = {
  locales: {
    'en.default.json': JSON.stringify({ beverage: 'coffee' }),
    'fr.json': '{}',
  },
  snippets: {
    'header.liquid': '',
  },
};

describe('Module: dependencies', () => {
  let workspace: Workspace;

  beforeAll(async () => {
    // We're intentionally not mocking here because we want to make sure
    // this works on Windows as well.
    workspace = await makeTempWorkspace({
      gitRootTheme: {
        '.git': { HEAD: '' },
        ...theme,
      },
      configRootTheme: {
        '.theme-check.yml': '',
        ...theme,
      },
      multiRootTheme: {
        '.theme-check.yml': 'root: ./dist',
        dist: {
          ...theme,
        },
        src: {
          '.theme-check.yml': '',
          ...theme,
        },
      },
      frenchDefault: {
        '.theme-check.yml': '',
        ...theme,
        locales: {
          'fr.default.json': JSON.stringify({ beverage: 'café' }),
        },
      },
    });
  });

  afterAll(async () => {
    await workspace.clean();
  });

  describe('Unit: findRootURI', () => {
    it('should accurately return the root of a theme', async () => {
      expect(await findRootURI(workspace.uri('gitRootTheme'))).to.eql(
        workspace.uri('gitRootTheme'),
      );
      expect(await findRootURI(workspace.uri('gitRootTheme/snippets/header.liquid'))).to.eql(
        workspace.uri('gitRootTheme'),
      );
      expect(await findRootURI(workspace.uri('configRootTheme/snippets/header.liquid'))).to.eql(
        workspace.uri('configRootTheme'),
      );
      expect(await findRootURI(workspace.uri('multiRootTheme/dist/snippets/header.liquid'))).to.eql(
        workspace.uri('multiRootTheme'),
      );
      expect(await findRootURI(workspace.uri('multiRootTheme/src/snippets/header.liquid'))).to.eql(
        workspace.uri('multiRootTheme/src'),
      );
    });
  });

  describe('Unit: fileExists', () => {
    it('should tell you if a file exists by path', async () => {
      expect(await fileExists(workspace.path('gitRootTheme/snippets/header.liquid'))).to.be.true;
      expect(await fileExists(workspace.path('gitRootTheme/snippets/does-not-exist.liquid'))).to.be
        .false;
    });

    it('should return true for directories', async () => {
      expect(await fileExists(workspace.path('gitRootTheme/snippets'))).to.be.true;
    });
  });

  describe('Unit: getDefaultLocale', () => {
    it('should return the correct translations depending on the root', async () => {
      let getDefaultLocale = getDefaultLocaleFactory(workspace.uri('gitRootTheme'));
      expect(await getDefaultLocale()).to.eql('en');

      getDefaultLocale = getDefaultLocaleFactory(workspace.uri('frenchDefault'));
      expect(await getDefaultLocale()).to.eql('fr');
    });
  });

  describe('Unit: getDefaultTranslationsFactory', () => {
    it('should return the correct translations depending on the root', async () => {
      let getDefaultTranslations = getDefaultTranslationsFactory(workspace.uri('gitRootTheme'));
      expect(await getDefaultTranslations()).to.eql({ beverage: 'coffee' });

      getDefaultTranslations = getDefaultTranslationsFactory(workspace.uri('frenchDefault'));
      expect(await getDefaultTranslations()).to.eql({ beverage: 'café' });
    });
  });

  describe('Unit: loadConfig', () => {
    it('should have a path normalized root', async () => {
      expect((await loadConfig(workspace.uri('gitRootTheme/snippets'))).root).not.to.include(`\\`);
      expect((await loadConfig(workspace.uri('frenchDefault/snippets'))).root).not.to.include(`\\`);
    });
  });
});

async function makeTempWorkspace(structure: Tree): Promise<Workspace> {
  const root = await mktemp.createDir(path.join(__dirname, '..', '.XXXXX'));
  if (!root) throw new Error('Could not create temp dir for temp workspace');
  const rootUri = URI.file(root);

  await createFiles(structure, [root]);

  return {
    root,
    path: (relativePath) => path.join(root, ...relativePath.split('/')),
    uri: (relativePath) => Utils.joinPath(rootUri, ...relativePath.split('/')).toString(),
    clean: async () => fs.rm(root, { recursive: true, force: true }),
  };

  function createFiles(tree: Tree, ancestors: string[]): Promise<any> {
    const promises: Promise<any>[] = [];
    for (const [pathEl, value] of Object.entries(tree)) {
      if (typeof value === 'string') {
        promises.push(fs.writeFile(path.join(...ancestors, pathEl), value, 'utf8'));
      } else {
        promises.push(
          fs
            .mkdir(path.join(...ancestors, pathEl))
            .then(() => createFiles(value, ancestors.concat(pathEl))),
        );
      }
    }
    return Promise.all(promises);
  }
}