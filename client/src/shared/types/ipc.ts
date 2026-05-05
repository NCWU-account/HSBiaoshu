import type { ChatCompletionRequest, JsonCompletionRequest } from './ai';
import type { FileImportResult } from './bid';
import type { ClientConfig, ConfigSaveResult, ImageModelTestResult, ModelListResult } from './config';

export interface YibiaoBridge {
  appName: string;
  platform: string;
  config: {
    load: () => Promise<ClientConfig>;
    save: (config: ClientConfig) => Promise<ConfigSaveResult>;
    listModels: () => Promise<ModelListResult>;
  };
  ai: {
    chat: (request: ChatCompletionRequest) => Promise<string>;
    requestJson: <TResult = unknown>(request: JsonCompletionRequest) => Promise<TResult>;
    testImageModel: (config: ClientConfig) => Promise<ImageModelTestResult>;
  };
  file: {
    importDocument: () => Promise<FileImportResult>;
  };
  export: {
    exportWord: (payload: unknown) => Promise<unknown>;
  };
}
