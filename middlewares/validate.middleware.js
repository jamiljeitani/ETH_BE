// middlewares/validate.middleware.js
function validate(schema, property = 'body') {
  return async (req, res, next) => {
    try {
      req[property] = await schema.validateAsync(req[property], { abortEarly: false, stripUnknown: true });
      next();
    } catch (err) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: err.details?.map(d => ({ message: d.message, path: d.path }))
        }
      });
    }
  };
}
module.exports = { validate };
