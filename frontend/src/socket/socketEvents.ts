export const SOCKET_EVENTS = {
  JOIN_CONVERSATION: "conversation:join",
  SEND_MESSAGE: "message:send",
  NEW_MESSAGE: "message:new",
  UPDATE_MESSAGE: "message:update",
  MESSAGE_UPDATED: "message:updated",
  DELETE_MESSAGE: "message:delete",
  MESSAGE_DELETED: "message:deleted",
  MARK_READ: "conversation:read",
  CONVERSATION_READ: "conversation:read-receipt",
  PRESENCE_SYNC: "presence:sync",
  PRESENCE_LIST: "presence:list",
  PRESENCE_UPDATE: "presence:update"
} as const;
