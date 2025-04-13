'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/calendar.css';

interface CalendarProps {
  events?: {
    id: string;
    title: string;
    date: string;
    time: string;
  }[];
  onEventClick?: (event: any) => void;
}

const Calendar: React.FC<CalendarProps> = ({ events = [], onEventClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Get first day of the month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  
  // Get the day of week of the first day (0 = Sunday, 6 = Saturday)
  const startingDayOfWeek = firstDayOfMonth.getDay();
  
  // Get previous month's days to fill the first week
  const prevMonthDays = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
  
  // Create calendar days array
  const calendarDays = [];
  
  // Previous month days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    calendarDays.push({
      day: prevMonthDays - i,
      month: 'prev',
      date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDays - i)
    });
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      month: 'current',
      date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i)
    });
  }
  
  // Next month days
  const totalDaysNeeded = Math.ceil(calendarDays.length / 7) * 7;
  const nextMonthDaysCount = totalDaysNeeded - calendarDays.length;
  
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    calendarDays.push({
      day: i,
      month: 'next',
      date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i)
    });
  }
  
  // Group calendar days into weeks
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }
  
  // Format date to YYYY-MM-DD for event comparison
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const formattedDate = formatDate(date);
    return events.filter(event => event.date === formattedDate);
  };
  
  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };
  
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
        <div className="calendar-navigation">
          <button onClick={goToToday}>Today</button>
          <button onClick={goToPreviousMonth}><ChevronLeft size={16} /></button>
          <button onClick={goToNextMonth}><ChevronRight size={16} /></button>
        </div>
      </div>
      
      <div className="calendar-weekdays">
        {weekdays.map(day => (
          <span key={day}>{day}</span>
        ))}
      </div>
      
      <div className="calendar-grid">
        {weeks.map((week, weekIdx) => (
          week.map((day, dayIdx) => {
            const dayEvents = getEventsForDate(day.date);
            return (
              <div
                key={`${weekIdx}-${dayIdx}`}
                className={`calendar-day ${isToday(day.date) ? 'today' : ''} ${day.month !== 'current' ? 'different-month' : ''}`}
              >
                <div className="calendar-day-header">{day.day}</div>
                <div>
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className="calendar-event"
                      onClick={() => onEventClick && onEventClick(event)}
                    >
                      {event.time && `${event.time} - `}{event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
};

export default Calendar; 