export class AuthenticationError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor() {
    super("Insufficient permissions");
    this.name = "AuthorizationError";
  }
}

export class ResourceNotFoundError extends Error {
  constructor() {
    super("Resource not found");
    this.name = "ResourceNotFoundError";
  }
}
