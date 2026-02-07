import { http } from "./http";

export const MessagesApi = {
  listUsers: () => http("/api/messages/users"),
  getThread: (otherUserId, limit = 100) => http(`/api/messages/thread/${otherUserId}?limit=${limit}`),
  send: (recipientUserId, body) =>
    http("/api/messages", {
      method: "POST",
      body: JSON.stringify({ recipientUserId, body }),
    }),
};
