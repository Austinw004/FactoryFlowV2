import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: Array<{ email: string; responseStatus?: string }>;
  location?: string;
  status: string;
  created: string;
  updated: string;
}

export interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary: boolean;
  timeZone: string;
}

export class GoogleCalendarIntegration {
  private accessToken: string;
  private companyId: string;
  private baseUrl = "https://www.googleapis.com/calendar/v3";

  constructor(accessToken: string, companyId: string) {
    this.accessToken = accessToken;
    this.companyId = companyId;
  }

  private async request<T>(endpoint: string, method: string = "GET", data?: any): Promise<T> {
    const response = await axios({
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json"
      },
      data,
      timeout: 30000
    });

    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await this.request<any>("/users/me/calendarList?maxResults=1");
      console.log(`[GoogleCalendar] Connection test successful for company ${this.companyId}`);
      return { success: true, message: "Google Calendar connection verified" };
    } catch (error: any) {
      console.error(`[GoogleCalendar] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.error?.message || error.message };
    }
  }

  async listCalendars(): Promise<Calendar[]> {
    try {
      const result = await this.request<any>("/users/me/calendarList");
      const calendars = result.items?.map((cal: any) => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        primary: cal.primary || false,
        timeZone: cal.timeZone
      })) || [];
      console.log(`[GoogleCalendar] Found ${calendars.length} calendars`);
      return calendars;
    } catch (error: any) {
      console.error("[GoogleCalendar] Failed to list calendars:", error.message);
      throw error;
    }
  }

  async getEvents(calendarId: string = "primary", maxResults: number = 50, timeMin?: Date): Promise<CalendarEvent[]> {
    try {
      const params = new URLSearchParams();
      params.append("maxResults", maxResults.toString());
      params.append("singleEvents", "true");
      params.append("orderBy", "startTime");
      if (timeMin) {
        params.append("timeMin", timeMin.toISOString());
      }

      const result = await this.request<any>(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
      const events = result.items?.map((event: any) => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        attendees: event.attendees,
        location: event.location,
        status: event.status,
        created: event.created,
        updated: event.updated
      })) || [];

      console.log(`[GoogleCalendar] Found ${events.length} events`);
      return events;
    } catch (error: any) {
      console.error("[GoogleCalendar] Failed to get events:", error.message);
      throw error;
    }
  }

  async createEvent(calendarId: string = "primary", event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    attendees?: Array<{ email: string }>;
    location?: string;
  }): Promise<CalendarEvent> {
    try {
      const result = await this.request<any>(
        `/calendars/${encodeURIComponent(calendarId)}/events`,
        "POST",
        event
      );
      console.log(`[GoogleCalendar] Created event: ${result.summary}`);
      return {
        id: result.id,
        summary: result.summary,
        description: result.description,
        start: result.start,
        end: result.end,
        attendees: result.attendees,
        location: result.location,
        status: result.status,
        created: result.created,
        updated: result.updated
      };
    } catch (error: any) {
      console.error("[GoogleCalendar] Failed to create event:", error.message);
      throw error;
    }
  }

  async createSOPMeeting(title: string, description: string, startTime: Date, durationMinutes: number, attendeeEmails: string[]): Promise<CalendarEvent> {
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    return this.createEvent("primary", {
      summary: `[S&OP] ${title}`,
      description: `${description}\n\n---\nScheduled by Prescient Labs`,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      attendees: attendeeEmails.map(email => ({ email }))
    });
  }

  async syncMeetingsAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const events = await this.getEvents("primary", 100, new Date());

      for (const event of events) {
        try {
          const startDate = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!);

          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: "meeting",
            signalDate: startDate,
            quantity: event.attendees?.length || 1,
            unit: "attendees",
            channel: "google_calendar",
            customer: event.attendees?.[0]?.email,
            confidence: event.status === "confirmed" ? 90 : 60,
            priority: event.summary?.toLowerCase().includes("urgent") ? "high" : "medium",
            attributes: {
              source: "google_calendar",
              eventId: event.id,
              summary: event.summary,
              location: event.location,
              attendeeCount: event.attendees?.length || 0
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Event ${event.id}: ${err.message}`);
        }
      }

      console.log(`[GoogleCalendar] Synced ${synced} meetings as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[GoogleCalendar] Meeting sync failed:", error.message);
      throw error;
    }
  }

  async syncSOPMeetingsFromRfqs(): Promise<{ scheduled: number; errors: string[] }> {
    const errors: string[] = [];
    let scheduled = 0;

    try {
      const rfqs = await storage.getRfqs(this.companyId);
      const now = new Date();

      for (const rfq of rfqs.slice(0, 10)) {
        try {
          if (rfq.dueDate && new Date(rfq.dueDate) > now) {
            const meetingTime = new Date(rfq.dueDate);
            meetingTime.setDate(meetingTime.getDate() - 2);

            if (meetingTime > now) {
              await this.createSOPMeeting(
                `RFQ Review: ${rfq.title}`,
                `Review meeting for RFQ: ${rfq.title}\n\nDescription: ${rfq.description || 'No description'}`,
                meetingTime,
                30,
                []
              );
              scheduled++;
            }
          }
        } catch (err: any) {
          errors.push(`RFQ ${rfq.id}: ${err.message}`);
        }
      }

      console.log(`[GoogleCalendar] Scheduled ${scheduled} S&OP meetings from RFQs`);
      return { scheduled, errors };
    } catch (error: any) {
      console.error("[GoogleCalendar] S&OP sync failed:", error.message);
      throw error;
    }
  }
}

export async function getGoogleCalendarIntegration(companyId: string): Promise<GoogleCalendarIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'google_calendar');
    if (credentials?.accessToken) {
      console.log(`[GoogleCalendar] Using centralized credential storage for company ${companyId}`);
      return new GoogleCalendarIntegration(credentials.accessToken, companyId);
    }
  } catch (error) {
    console.log(`[GoogleCalendar] Credentials not available for company ${companyId}`);
  }
  return null;
}
