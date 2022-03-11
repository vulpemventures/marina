import { compile, Result } from './ast';
import { parseScript } from './parser';
import { Context, preprocessor } from './preprocessing';

/**
 * evaluate a template string and return witness scripts and redeem script associated with it
 * @param ctx used to replace xpubs with their current derivated public keys
 * @param template the string to evaluate
 **/
export function evaluate(ctx: Context, template: string): Result {
  const processedTemplate = preprocessor(ctx, template);
  const [ast] = parseScript(processedTemplate);
  if (!ast) throw new Error('Failed to parse template');
  return compile(ast);
}
