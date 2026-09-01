import ChatHub from './chat/ChatHub';

export default function DiscUserChat() {
  return (
    <ChatHub
      messagesBase="/discipline-messages"
      groupMessagesBase="/discipline-group-messages"
    />
  );
}
