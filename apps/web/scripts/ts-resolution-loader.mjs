/**
 * Test-support module resolver for `node --test`: app source files import each
 * other without extensions (Next/bundler style), which bare node ESM cannot
 * resolve. Registering this hook before a dynamic import lets the test execute
 * the real store module — see student-preferences-store.test.mjs.
 */
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    if (error?.code === "ERR_MODULE_NOT_FOUND" && relative && !specifier.endsWith(".ts")) {
      return next(`${specifier}.ts`, context);
    }
    throw error;
  }
}
