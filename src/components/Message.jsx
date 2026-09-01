import ChatHub from './chat/ChatHub';

export default function Message() {
  return (
    <ChatHub
      messagesBase="/admin-messages"
      groupMessagesBase="/admin-group-messages"
    />
  );
}
