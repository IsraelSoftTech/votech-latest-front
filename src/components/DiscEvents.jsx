import React from 'react';
import DisciplineSideTop from './DisciplineSideTop';
import UserEvents from './UserEvents';

export default function DiscEvents() {
  return (
    <DisciplineSideTop activeTab="Events">
      <UserEvents wrap={false} />
    </DisciplineSideTop>
  );
} 