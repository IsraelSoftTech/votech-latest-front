import ChatHub from './chat/ChatHub';

export default function PsychoMessage() {
  return (
    <ChatHub
      messagesBase="/psycho-messages"
      userChatBase="/psycho-chat"
      groupMessagesBase="/psycho-group-messages"
    />
  );
}
