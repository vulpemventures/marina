import { compile, Result } from './ast';
import { parseSCRIPT } from './parser';
import type { Context } from './preprocessing';
import { preprocessor } from './preprocessing';

/**
 * evaluate a template string and return witness scripts and redeem script associated with it
 * @param ctx used to replace xpubs with their current derivated public keys
 * @param template the string to evaluate
 **/
export function evaluate(ctx: Context, template: string): Result {
  const processedTemplate = preprocessor(ctx, template);
  const [ast] = parseSCRIPT(processedTemplate);
  if (!ast) throw new Error('Failed to parse template');
  return compile(ast);
}
