import ChatHub from './chat/ChatHub';

export default function DiscMessage() {
  return (
    <ChatHub
      messagesBase="/discipline-messages"
      groupMessagesBase="/discipline-group-messages"
    />
  );
}
