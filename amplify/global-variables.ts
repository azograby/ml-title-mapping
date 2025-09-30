const appPrefix = 'item-mapping';

export interface BedrockModel {
  id: string;
  name: string;
  provider: string;
  category: BedrockModality.TEXT | BedrockModality.IMAGE | BedrockModality.VIDEO | BedrockModality.MULTIMODAL;
  useCase: BedrockUseCase[];
  modalities: string[];
  pricing: {inputTokens: number,  // per 1K tokens}
        outputTokens: number  // per 1K tokens]
        }
      }
      
export enum BedrockUseCase {
  IMAGE_UNDERSTANDING = 'Image Understanding',
  VIDEO_UNDERSTANDING = 'Video Understanding',
  CHAT = 'Chat'
}

export enum BedrockModality {
  TEXT = 'Text',
  IMAGE = 'Image',
  VIDEO = 'Video',
  MULTIMODAL = 'Multimodal',
}

export enum BedrockModelIds {
  AMAZON_NOVA_LITE = 'us.amazon.nova-lite-v1:0',
  AMAZON_NOVA_PRO = 'us.amazon.nova-pro-v1:0',
  AMAZON_NOVA_PREMIER = 'us.amazon.nova-premier-v1:0',
  CLAUDE_3_HAIKU = 'anthropic.claude-3-haiku-20240307-v1:0',
  CLAUDE_3_SONNET = 'anthropic.claude-3-sonnet-20240229-v1:0',
  CLAUDE_3_5_SONNET_V2 = 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  CLAUDE_3_7_SONNET = 'anthropic.claude-3-7-sonnet-20250219-v1:0',
  MISTRAL_PIXTRAL_LARGE = 'mistral.pixtral-large-2502-v1:0',
  META_LLAMA3_2_11B_INSTRUCT = 'meta.llama3-2-11b-instruct-v1:0',
  META_LLAMA3_2_90B_INSTRUCT = 'meta.llama3-2-90b-instruct-v1:0',
  META_LLAMA4_MAVERICK_17B_INSTRUCT = 'meta.llama4-maverick-17b-instruct-v1:0',
  META_LLAMA4_SCOUT_17B_INSTRUCT = 'meta.llama4-scout-17b-instruct-v1:0'
}

export const vars = {
    APP_PREFIX: appPrefix,
    ASSET_S3_BUCKET_NAME: appPrefix + '-assets',
    API_PATHS: {
        FIND_RELATED_ITEMS: 'related-items',
        CREATE_INDEX: 'create-index',
        GET_ALL_INDEXES: 'get-all-indexes'
    },
    PAGE_ROUTES: {
        HOME: {
          DISPLAY_NAME: 'Home',
          ROUTE: '/'
        },
        DASHBOARD: {
          DISPLAY_NAME: 'Dashboard',
          ROUTE: '/dashboard'
        },
        INGEST: {
          DISPLAY_NAME: 'Ingest',
          ROUTE: '/ingest'
        },
    },
    BEDROCK_MODELS: <BedrockModel[]>[
      // Amazon Models
      {
        id: BedrockModelIds.AMAZON_NOVA_LITE,
        name: 'Amazon Nova Lite',
        provider: 'Amazon',
        category: BedrockModality.MULTIMODAL,
        modalities: [BedrockModality.TEXT, BedrockModality.IMAGE, BedrockModality.VIDEO],
        useCase: [BedrockUseCase.VIDEO_UNDERSTANDING, BedrockUseCase.IMAGE_UNDERSTANDING, BedrockUseCase.CHAT],
        pricing: {inputTokens: 0.00006,  // per 1K tokens}
        outputTokens: 0.00024  // per 1K tokens]
        }
      },
      {
        id: BedrockModelIds.AMAZON_NOVA_PRO,
        name: 'Amazon Nova Pro',
        provider: 'Amazon',
        category: BedrockModality.MULTIMODAL,
        modalities: [BedrockModality.TEXT, BedrockModality.IMAGE, BedrockModality.VIDEO],
        useCase: [BedrockUseCase.VIDEO_UNDERSTANDING, BedrockUseCase.IMAGE_UNDERSTANDING, BedrockUseCase.CHAT],
          pricing: {inputTokens: 0.0008,  // per 1K tokens}
        outputTokens: 0.00024  // per 1K tokens]
        }
      },
    
      {
        id: BedrockModelIds.AMAZON_NOVA_PREMIER,
        name: 'Amazon Nova Premier',
        provider: 'Amazon',
        category: BedrockModality.MULTIMODAL,
        modalities: [BedrockModality.TEXT, BedrockModality.IMAGE, BedrockModality.VIDEO],
        useCase: [BedrockUseCase.VIDEO_UNDERSTANDING, BedrockUseCase.IMAGE_UNDERSTANDING, BedrockUseCase.CHAT],
                  pricing: {inputTokens: 0.0025,  // per 1K tokens}
        outputTokens: 0.0125  // per 1K tokens]
        }
      },

      // Anthropic Models
      {
        id: BedrockModelIds.CLAUDE_3_HAIKU,
        name: 'Claude 3 Haiku',
        provider: 'Anthropic',
        category: BedrockModality.MULTIMODAL,
        modalities: [BedrockModality.TEXT, BedrockModality.IMAGE, BedrockModality.VIDEO],
        useCase: [BedrockUseCase.VIDEO_UNDERSTANDING, BedrockUseCase.IMAGE_UNDERSTANDING, BedrockUseCase.CHAT],
         pricing: {inputTokens: 0.00025,  // per 1K tokens}
        outputTokens: 0.00125  // per 1K tokens]
        }
      },
      {
        id: BedrockModelIds.CLAUDE_3_SONNET,
        name: 'Claude 3 Sonnet',
        provider: 'Anthropic',
        category: BedrockModality.MULTIMODAL,
        modalities: [BedrockModality.TEXT, BedrockModality.IMAGE],
        useCase: [BedrockUseCase.IMAGE_UNDERSTANDING, BedrockUseCase.CHAT],
         pricing: {inputTokens: 0.003,  // per 1K tokens}
        outputTokens: 0.015  // per 1K tokens]
        }
      },
      {
        id: BedrockModelIds.CLAUDE_3_5_SONNET_V2,
        name: 'Claude 3.5 Sonnet v2',
        provider: 'Anthropic',
        category: BedrockModality.MULTIMODAL,
        modalities: [BedrockModality.TEXT, BedrockModality.IMAGE],
        useCase: [BedrockUseCase.IMAGE_UNDERSTANDING, BedrockUseCase.CHAT]
      },
      {
        id: BedrockModelIds.CLAUDE_3_7_SONNET,
        name: 'Claude 3.7 Sonnet',
        provider: 'Anthropic',
        category: BedrockModality.MULTIMODAL,
        modalities: [BedrockModality.TEXT, BedrockModality.IMAGE],
        useCase: [BedrockUseCase.IMAGE_UNDERSTANDING, BedrockUseCase.CHAT]
      },

      // Meta Models
      {
        id: BedrockModelIds.META_LLAMA3_2_11B_INSTRUCT,
        name: 'Llama 3.2 11B Instruct',
        provider: 'Meta',
        category: BedrockModality.MULTIMODAL,
        modalities: [BedrockModality.TEXT, BedrockModality.IMAGE],
        useCase: [BedrockUseCase.IMAGE_UNDERSTANDING, BedrockUseCase.CHAT]
      },
      {
        id: BedrockModelIds.META_LLAMA3_2_90B_INSTRUCT,
        name: 'Llama 3.2 90B Instruct',
        provider: 'Meta',
        category: BedrockModality.MULTIMODAL,
        modalities: [BedrockModality.TEXT, BedrockModality.IMAGE],
        useCase: [BedrockUseCase.IMAGE_UNDERSTANDING, BedrockUseCase.CHAT]
      },
      {
        id: BedrockModelIds.META_LLAMA4_MAVERICK_17B_INSTRUCT,
        name: 'Llama 4 Maverick 17B Instruct',
        provider: 'Meta',
        category: BedrockModality.MULTIMODAL,
        modalities: [BedrockModality.TEXT, BedrockModality.IMAGE],
        useCase: [BedrockUseCase.IMAGE_UNDERSTANDING, BedrockUseCase.CHAT]
      },
      {
        id: BedrockModelIds.META_LLAMA4_SCOUT_17B_INSTRUCT,
        name: 'Llama 4 Scout 17B Instruct',
        provider: 'Meta',
        category: BedrockModality.MULTIMODAL,
        modalities: [BedrockModality.TEXT, BedrockModality.IMAGE],
        useCase: [BedrockUseCase.IMAGE_UNDERSTANDING, BedrockUseCase.CHAT]
      },

      // Mistral
      {
        id: BedrockModelIds.MISTRAL_PIXTRAL_LARGE,
        name: 'Pixtral Large (25.02)',
        provider: 'Mistral',
        category: BedrockModality.MULTIMODAL,
        modalities: [BedrockModality.TEXT, BedrockModality.IMAGE],
        useCase: [BedrockUseCase.IMAGE_UNDERSTANDING, BedrockUseCase.CHAT]
      },
    ]
}