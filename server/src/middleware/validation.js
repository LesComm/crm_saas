/**
 * Zod schema validation middleware factory
 * Usage: validate(schema)       -> validates req.body
 *        validate(schema, 'query') -> validates req.query
 *        validate(schema, 'params') -> validates req.params
 */

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(result.error); // Caught by errorHandler as ZodError
    }

    // Replace raw input with parsed/coerced values
    req[source] = result.data;
    next();
  };
}
