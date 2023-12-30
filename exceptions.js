// Yggdrasil-related exceptions for various conditions, including where the
// client is at fault.

class BaseYggdrasilException extends Error {
  constructor(message, cause, enablePassthrough) {
    super(message);
    (this.name = "BaseYggdrasilException"),
      (this.errorType = "INTERNAL_SERVER_ERROR"),
      (this.errorMessage = this.message);
    this.statusCode = 500;
    if (cause) this.cause = cause;
    this.disablePassthrough = !enablePassthrough;
  }
  toJson(requestPath) {
    const output = {
      errorType: this.errorType,
      error: this.name,
      errorMessage: this.errorMessage,
      developerMessage: this.errorMessage,
    };
    if (requestPath) output.path = requestPath;
    if (this.cause) output.cause = this.cause;
    return output;
  }
}

class ForbiddenOperationException extends BaseYggdrasilException {
  constructor(message, credsProvided, accountExists) {
    super(message);
    this.name = "ForbiddenOperationException";
    this.errorType = "FORBIDDEN";
    this.statusCode = credsProvided ? 403 : 401;
  }
}

class BadRequestException extends BaseYggdrasilException {
  constructor(message, enablePassthrough) {
    super(message, null, enablePassthrough);
    this.name = "Bad Request";
    this.errorType = "BAD_REQUEST";
    this.statusCode = 400;
  }
}

class IllegalArgumentException extends BadRequestException {
  constructor(message) {
    super(message);
    this.name = "IllegalArgumentException";
  }
}

module.exports = {
  BaseYggdrasilException: BaseYggdrasilException,
  ForbiddenOperationException: ForbiddenOperationException,
  BadRequestException: BadRequestException,
  IllegalArgumentException: IllegalArgumentException,
};
