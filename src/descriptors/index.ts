import type { TemplateResult } from './ast';
import { compile } from './ast';
import { parseSCRIPT } from './parser';
import type { Context} from './preprocessing';
import { findNamespaces , preprocessor } from './preprocessing';

/**
 * evaluate a template string and return witness scripts and redeem script associated with it
 * @param ctx used to replace xpubs with their current derivated public keys
 * @param template the string to evaluate
 **/
export function evaluate(ctx: Context, template: string): TemplateResult {
  const processedTemplate = preprocessor(ctx, template);
  const [ast] = parseSCRIPT(processedTemplate);
  if (!ast) throw new Error('Failed to parse template');
  return compile(ast);
}

/**
 * validate can be used without a context object to validate the parsability of a template string
 * @param template the template string to validate
 * @returns true if template is OK, false otherwise
 */
export function validate(template: string): boolean {
  const namespaces = findNamespaces(template);
  if (namespaces.length > 0) {
    const fakeKey = Buffer.alloc(32).toString('hex');
    const fakeCtx: Context = {
      namespaces: new Map(),
    };

    for (const namespace of namespaces) {
      fakeCtx.namespaces.set(namespace, { pubkey: fakeKey });
    }

    template = preprocessor(fakeCtx, template);
  }

  try {
    const [ast] = parseSCRIPT(template);
    if (!ast) return false;
    return true;
  } catch {
    return false;
  }
}
