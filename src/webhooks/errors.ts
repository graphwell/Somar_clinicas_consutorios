export class ProviderAuthError extends Error {
  constructor(message = 'Invalid webhook signature') {
    super(message);
    this.name = 'ProviderAuthError';
  }
}

export class InstanceNotFoundError extends Error {
  readonly instanceId: string;
  constructor(instanceId: string) {
    super(`Instance not found: ${instanceId}`);
    this.name = 'InstanceNotFoundError';
    this.instanceId = instanceId;
  }
}

export class DuplicateMessageError extends Error {
  readonly messageId: string;
  constructor(messageId: string) {
    super(`Duplicate message: ${messageId}`);
    this.name = 'DuplicateMessageError';
    this.messageId = messageId;
  }
}
