import { z } from 'zod';
import type { ModelRouter } from '../router.js';
import type { LLMRequest } from '../providers/types.js';
import type { RouterCallOptions } from '../router.js';
import type { ModelTier } from '../config/schema.js';

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  const objStart = text.indexOf('{');
  const objEnd = text.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) return text.slice(objStart, objEnd + 1);
  const arrStart = text.indexOf('[');
  const arrEnd = text.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) return text.slice(arrStart, arrEnd + 1);
  return text;
}

/**
 * Call the router and validate the response against a zod schema.
 * On parse failure, retries ONCE with the validation error appended to the conversation.
 */
export async function callWithSchema<T>(
  router: ModelRouter,
  request: LLMRequest,
  schema: z.ZodSchema<T>,
  tier: ModelTier,
  options: RouterCallOptions,
): Promise<T> {
  const parse = (content: string): T => schema.parse(JSON.parse(extractJson(content)));

  const first = await router.call({ ...request, responseFormat: 'json' }, tier, options);

  try {
    return parse(first.content);
  } catch (err) {
    const validationError =
      err instanceof z.ZodError
        ? err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
        : String(err);

    const retryRequest: LLMRequest = {
      ...request,
      responseFormat: 'json',
      messages: [
        ...request.messages,
        { role: 'assistant', content: first.content },
        {
          role: 'user',
          content: `Your previous response failed JSON schema validation: ${validationError}. Please provide a corrected, valid JSON response.`,
        },
      ],
    };

    const retry = await router.call(retryRequest, tier, options);
    return parse(retry.content);
  }
}
