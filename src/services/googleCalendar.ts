import { CalendarEvent, GoogleCalendarMeta } from '../types';

// No dummy data: only real user calendar events are displayed
export const SAMPLE_CALENDAR_EVENTS: CalendarEvent[] = [];

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
