const { httpErrorFunc } = require('../../helpers');

const validateBody = (schema, status = 400, message = null) => {
  const func = (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      next(httpErrorFunc(status, message || error.message));
    }
    next();
  };

  return func;
};

module.exports = validateBody;
