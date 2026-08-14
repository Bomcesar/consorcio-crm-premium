import { assertEnv, googleCalendarEnv } from "../env-validation";
import { HttpClient } from "../base/client";
import { IntegrationError, UpstreamError } from "../base/errors";

export type GoogleCalendarEventInput = {
  summary: string;
  description?: string;
  start: string;
  end: string;
  attendees?: string[];
  location?: string;
};

export type GoogleCalendarEvent = GoogleCalendarEventInput & {
  id: string;
  htmlLink: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type GoogleCalendarServiceOptions = {
  accessToken: string;
  refreshToken?: string;
};

export class GoogleCalendarService {
  private readonly http: HttpClient;

  constructor(options: GoogleCalendarServiceOptions) {
    this.http = new HttpClient({
      baseUrl: "https://www.googleapis.com/calendar/v3",
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
      },
      timeoutMs: 20000,
      retries: 2,
      retryDelayMs: 1000,
    });
  }

  static validateEnv() {
    assertEnv(googleCalendarEnv(), "Google Calendar");
  }

  async createEvent(
    calendarId: string,
    input: GoogleCalendarEventInput,
  ): Promise<GoogleCalendarEvent> {
    try {
      const response = await this.http.request<GoogleCalendarEvent>({
        path: `/calendars/${encodeURIComponent(calendarId)}/events`,
        method: "POST",
        body: {
          summary: input.summary,
          description: input.description,
          start: { dateTime: input.start },
          end: { dateTime: input.end },
          attendees: input.attendees?.map((email) => ({ email })),
          location: input.location,
        },
      });

      return response;
    } catch (error) {
      throw this.normalizeError(error, "createEvent");
    }
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    input: Partial<GoogleCalendarEventInput>,
  ): Promise<GoogleCalendarEvent> {
    try {
      const response = await this.http.request<GoogleCalendarEvent>({
        path: `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        method: "PATCH",
        body: {
          summary: input.summary,
          description: input.description,
          start: input.start ? { dateTime: input.start } : undefined,
          end: input.end ? { dateTime: input.end } : undefined,
          attendees: input.attendees?.map((email) => ({ email })),
          location: input.location,
        },
      });

      return response;
    } catch (error) {
      throw this.normalizeError(error, "updateEvent");
    }
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      await this.http.request<unknown>({
        path: `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        method: "DELETE",
      });
    } catch (error) {
      throw this.normalizeError(error, "deleteEvent");
    }
  }

  async listEvents(calendarId: string, timeMin?: string, timeMax?: string) {
    const params = new URLSearchParams();
    if (timeMin) params.set("timeMin", timeMin);
    if (timeMax) params.set("timeMax", timeMax);
    params.set("singleEvents", "true");
    params.set("orderBy", "startTime");

    try {
      return await this.http.request<{ items: GoogleCalendarEvent[] }>({
        path: `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
        method: "GET",
      });
    } catch (error) {
      throw this.normalizeError(error, "listEvents");
    }
  }

  private normalizeError(error: unknown, operation: string): IntegrationError {
    if (error instanceof IntegrationError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new UpstreamError(`Falha em ${operation} do Google Calendar: ${message}`, 502, error);
  }
}
