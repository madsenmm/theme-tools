import { Extension } from '@codemirror/state';
import { ClientCapabilities, MarkupKind } from 'vscode-languageserver-protocol';

import { Dependencies, LanguageClient } from './LanguageClient';
import {
  clientFacet,
  fileUriFacet,
  textDocumentSync,
  lspLinter,
  liquidHTMLCompletionExtension,
  InfoRenderer,
  infoRendererFacet,
  AutocompleteOptions,
  LinterOptions,
  DiagnosticRenderer,
  diagnosticRendererFacet,
} from './extensions';

/**
 * The client capabilities are how we tell the language server what
 * features we support so that they have the opportunity to skip doing
 * things that the client does not support. Everything is false by default,
 * but we migth need to change that and this is where we'll do it.
 */
const clientCapabilities: ClientCapabilities = {
  textDocument: {
    completion: {
      completionItem: {
        insertReplaceSupport: true,
        documentationFormat: [MarkupKind.PlainText, MarkupKind.Markdown],
        commitCharactersSupport: false,
      },
    },
  },
};

const defaultLogger = console.log.bind(console);

export { Dependencies };

export interface FeatureFlags {
  shouldComplete: boolean;
  shouldLint: boolean;
}

export type ClientDependencies = Partial<Dependencies>;

export interface CodeMirrorDependencies {
  /**
   * The infoRenderer is a function that returns a DOM node that contains the documentation
   * for a completion item. Presumably does markdown conversions to DOM nodes.
   *
   * A function that takes a completion object and returns a DOM node.
   */
  infoRenderer?: InfoRenderer;

  /**
   * The diagnosticRenderer is a function that returns a DOM node that
   * contains the content of a diagnostic. It overrides the default
   * rendering logic for diagnostics.
   */
  diagnosticRenderer?: DiagnosticRenderer;

  /**
   * Say you wanted to change the settings of the `autocomplete` extension,
   * you'd do it with that.
   */
  autocompleteOptions?: AutocompleteOptions;

  /**
   * Say you wanted to change the settings of the `linter` extension,
   * you'd do it with that.
   */
  linterOptions?: LinterOptions;
}

// There is one LanguageClient
// There is one LanguageServer
// There are many CodeMirror instances
export class CodeMirrorLanguageClient {
  private readonly client: LanguageClient;
  private readonly infoRenderer: InfoRenderer | undefined;
  private readonly diagnosticRenderer: DiagnosticRenderer | undefined;
  private readonly autocompleteExtension: Extension;
  private readonly linterExtension: Extension;

  constructor(
    private readonly worker: Worker,
    { log = defaultLogger }: ClientDependencies = {},
    {
      infoRenderer,
      diagnosticRenderer,
      autocompleteOptions,
      linterOptions,
    }: CodeMirrorDependencies = {},
  ) {
    this.client = new LanguageClient(worker, {
      clientCapabilities,
      log,
    });
    this.worker = worker;
    this.infoRenderer = infoRenderer;
    this.diagnosticRenderer = diagnosticRenderer;
    this.autocompleteExtension = liquidHTMLCompletionExtension(autocompleteOptions);
    this.linterExtension = lspLinter(linterOptions);
  }

  public async start() {
    await this.client.start();
  }

  public async stop() {
    try {
      await this.client.stop();
    } finally {
      this.worker.terminate();
    }
  }

  public extension(
    fileUri: string,
    { shouldLint, shouldComplete }: FeatureFlags = { shouldLint: true, shouldComplete: true },
  ): Extension[] {
    return [
      clientFacet.of(this.client),
      fileUriFacet.of(fileUri),
      textDocumentSync,
      infoRendererFacet.of(this.infoRenderer),
      diagnosticRendererFacet.of(this.diagnosticRenderer),
    ]
      .concat(shouldLint ? this.linterExtension : [])
      .concat(shouldComplete ? this.autocompleteExtension : []);
  }
}
