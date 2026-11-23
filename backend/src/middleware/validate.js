/**
 * Validates req.body against a Zod schema and returns field-level errors.
 */
function validate(schema) {
  return function validateBody(req, res, next) {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path.length ? issue.path.join('.') : 'form';
        if (!errors[key]) errors[key] = issue.message;
      }
      return res.status(422).json({
        message: 'Please check the highlighted fields and try again.',
        errors,
      });
    }
    req.body = result.data;
    return next();
  };
}

module.exports = validate;
