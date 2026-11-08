import { CalendarEvent, GoogleCalendarMeta } from '../types';

export const SAMPLE_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'sample-1',
    summary: 'Familie Brunch & Koffie',
    description: 'Gezellig bijkletsen thuis',
    start: {
      dateTime: new Date(Date.now() + 1000 * 60 * 60 * 1.5).toISOString(),
    },
    end: {
      dateTime: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
    },
    location: 'Thuis',
    calendarId: 'primary',
    calendarName: 'Privé',
    color: '#3b82f6',
    isAllDay: false,
  },
  {
    id: 'sample-2',
    summary: 'Wekelijkse Wandeling',
    description: 'In het bos met de hond',
    start: {
      dateTime: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
    },
    end: {
      dateTime: new Date(Date.now() + 1000 * 60 * 60 * 6.5).toISOString(),
    },
    location: 'Nationaal Park',
    calendarId: 'primary',
    calendarName: 'Privé',
    color: '#10b981',
    isAllDay: false,
  },
  {
    id: 'sample-3',
    summary: 'Verjaardag Sophie 🎂',
    start: {
      date: new Date().toISOString().split('T')[0],
    },
    end: {
      date: new Date().toISOString().split('T')[0],
    },
    calendarId: 'birthdays',
    calendarName: 'Verjaardagen',
    color: '#f59e0b',
    isAllDay: true,
  },
  {
    id: 'sample-4',
    summary: 'Project Review & Brainstorm',
    start: {
      dateTime: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(),
    },
    end: {
      dateTime: new Date(Date.now() + 1000 * 60 * 60 * 27.5).toISOString(),
    },
    location: 'Google Meet',
    calendarId: 'work',
    calendarName: 'Werk',
    color: '#8b5cf6',
    isAllDay: false,
  },
];

export async function fetchUserCalendars(accessToken: string): Promise<GoogleCalendarMeta[]> {
  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      throw new Error(`Fout bij ophalen kalenders: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.items) return [];

    return data.items.map((item: any) => ({
      id: item.id,
      summary: item.summary,
      description: item.description,
      backgroundColor: item.backgroundColor || '#3b82f6',
      foregroundColor: item.foregroundColor || '#ffffff',
      primary: item.primary || false,
      selected: item.selected || item.primary || false,
    }));
  } catch (err) {
    console.error('Error fetching calendar list:', err);
    throw err;
  }
}

export async function fetchUpcomingEvents(
  accessToken: string,
  calendarIds: string[] = ['primary'],
  daysAhead: number = 7
): Promise<CalendarEvent[]> {
  if (!calendarIds.length) {
    calendarIds = ['primary'];
  }

  const now = new Date();
  const timeMin = now.toISOString();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + daysAhead);
  const timeMax = maxDate.toISOString();

  const allEvents: CalendarEvent[] = [];

  for (const calId of calendarIds) {
    try {
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`);
      url.searchParams.append('timeMin', timeMin);
      url.searchParams.append('timeMax', timeMax);
      url.searchParams.append('singleEvents', 'true');
      url.searchParams.append('orderBy', 'startTime');
      url.searchParams.append('maxResults', '25');

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        console.warn(`Could not fetch events for calendar ${calId}:`, res.statusText);
        continue;
      }

      const data = await res.json();
      const calendarTitle = data.summary || calId;

      if (data.items) {
        for (const item of data.items) {
          // Check if cancelled
          if (item.status === 'cancelled') continue;

          const isAllDay = !!item.start.date;
          allEvents.push({
            id: item.id,
            summary: item.summary || '(Geen titel)',
            description: item.description,
            start: item.start,
            end: item.end,
            location: item.location,
            htmlLink: item.htmlLink,
            calendarId: calId,
            calendarName: calendarTitle,
            color: item.colorId ? '#6366f1' : '#3b82f6',
            isAllDay,
          });
        }
      }
    } catch (err) {
      console.warn(`Error querying calendar ${calId}:`, err);
    }
  }

  // Sort chronologically
  allEvents.sort((a, b) => {
    const timeA = new Date(a.start.dateTime || a.start.date || 0).getTime();
    const timeB = new Date(b.start.dateTime || b.start.date || 0).getTime();
    return timeA - timeB;
  });

  return allEvents;
}
