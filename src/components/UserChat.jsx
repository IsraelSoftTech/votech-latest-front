import ChatHub from './chat/ChatHub';

export default function UserChat() {
  return (
    <ChatHub
      messagesBase="/admin-messages"
      groupMessagesBase="/admin-group-messages"
    />
  );
}
