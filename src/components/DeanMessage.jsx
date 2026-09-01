import ChatHub from './chat/ChatHub';

export default function DeanMessage() {
  return (
    <ChatHub
      messagesBase="/dean-messages"
      groupMessagesBase="/dean-group-messages"
    />
  );
}
