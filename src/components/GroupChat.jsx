import ChatHub from './chat/ChatHub';

export default function GroupChat() {
  return (
    <ChatHub
      messagesBase="/admin-messages"
      groupMessagesBase="/admin-group-messages"
    />
  );
}
