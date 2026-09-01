import ChatHub from './chat/ChatHub';

export default function TeacherMessage() {
  return (
    <ChatHub
      messagesBase="/teacher-messages"
      groupMessagesBase="/teacher-group-messages"
    />
  );
}
