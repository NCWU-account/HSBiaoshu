function trimBaseUrl(baseUrl) {
  return (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
}

function createHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

async function ensureOk(response, fallbackMessage) {
  if (response.ok) {
    return;
  }

  let detail = '';
  try {
    const body = await response.json();
    detail = body.error?.message || body.message || '';
  } catch {
    detail = await response.text().catch(() => '');
  }

  throw new Error(detail || fallbackMessage);
}

async function chatWithConfig(config, request) {
  if (!config.api_key) {
    throw new Error('请先在设置中配置文本模型 API Key');
  }

  if (!config.model_name) {
    throw new Error('请先在设置中配置文本模型名称');
  }

  const response = await fetch(`${trimBaseUrl(config.base_url)}/chat/completions`, {
    method: 'POST',
    headers: createHeaders(config.api_key),
    body: JSON.stringify({
      model: config.model_name,
      messages: request.messages,
      temperature: request.temperature ?? 0.3,
      response_format: request.response_format,
    }),
  });

  await ensureOk(response, 'AI 请求失败');
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function testVolcengineImageModel(config) {
  const imageConfig = config.image_model || {};

  if (!imageConfig.api_key) {
    throw new Error('请先填写火山方舟 API Key');
  }

  if (!imageConfig.model_name) {
    throw new Error('请先填写火山方舟生图模型名称');
  }

  const response = await fetch(`${trimBaseUrl(imageConfig.base_url || 'https://ark.cn-beijing.volces.com/api/v3')}/images/generations`, {
    method: 'POST',
    headers: createHeaders(imageConfig.api_key),
    body: JSON.stringify({
      model: imageConfig.model_name,
      prompt: 'a simple blue dot on a white background',
      size: '2048x2048',
      response_format: 'url',
    }),
  });

  try {
    await ensureOk(response, '火山方舟生图测试失败');
  } catch (error) {
    const message = error.message || '';
    if (message.includes('does not exist') || message.includes('do not have access')) {
      throw new Error(`火山方舟生图模型不可用，请确认模型名称或推理接入点 ID 已开通并可访问。原始错误：${message}`);
    }

    throw error;
  }
  const data = await response.json();
  const imageUrl = data.data?.[0]?.url || '';

  return {
    success: true,
    message: imageUrl ? `测试成功：已生成图片 ${imageUrl}` : '测试成功：已返回生图结果',
    image_url: imageUrl,
  };
}

async function testGoogleImageModel(config) {
  const imageConfig = config.image_model || {};

  if (!imageConfig.api_key) {
    throw new Error('请先填写 Google AI Studio API Key');
  }

  if (!imageConfig.model_name) {
    throw new Error('请先填写 Google 生图模型名称');
  }

  const response = await fetch(`${trimBaseUrl(imageConfig.base_url || 'https://generativelanguage.googleapis.com/v1beta')}/models/${encodeURIComponent(imageConfig.model_name)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': imageConfig.api_key,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Create a simple blue dot on a white background.' }],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  await ensureOk(response, 'Google AI Studio 生图测试失败');
  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.find((part) => part.text)?.text || '';
  const imagePart = parts.find((part) => part.inlineData?.data || part.inline_data?.data);
  const inlineData = imagePart?.inlineData || imagePart?.inline_data;

  return {
    success: true,
    message: inlineData?.data ? `测试成功：已返回图片${text ? `，${text}` : ''}` : `测试成功：${text || '已返回生成结果'}`,
    image_data: inlineData?.data || '',
    mime_type: inlineData?.mimeType || inlineData?.mime_type || 'image/png',
  };
}

function createAiService({ configStore }) {
  return {
    async chat(request) {
      const config = configStore.load();
      return chatWithConfig(config, request);
    },

    async requestJson(request) {
      const content = await this.chat({
        ...request,
        response_format: request.response_format || { type: 'json_object' },
      });

      return JSON.parse(content);
    },

    async testImageModel(config) {
      if (config.image_model?.provider === 'volcengine') {
        return testVolcengineImageModel(config);
      }

      if (config.image_model?.provider === 'google-ai-studio') {
        return testGoogleImageModel(config);
      }

      throw new Error('当前服务商暂不支持测试');
    },

    async listModels() {
      const config = configStore.load();

      if (!config.api_key) {
        return { success: false, message: '请先填写文本模型 API Key', models: [] };
      }

      const response = await fetch(`${trimBaseUrl(config.base_url)}/models`, {
        method: 'GET',
        headers: createHeaders(config.api_key),
      });

      await ensureOk(response, '获取模型列表失败');
      const data = await response.json();

      return {
        success: true,
        message: '模型列表已更新',
        models: Array.isArray(data.data) ? data.data.map((item) => item.id).filter(Boolean) : [],
      };
    },
  };
}

module.exports = {
  createAiService,
};
