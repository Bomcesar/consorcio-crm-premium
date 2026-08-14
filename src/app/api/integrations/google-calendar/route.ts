import { NextResponse } from "next/server";
import { GoogleCalendarService } from "@/integrations/google-calendar";
import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const { calendarId, summary, description, start, end, attendees, location } = body ?? {};

    if (!calendarId || !summary || !start || !end) {
      return NextResponse.json(
        { error: "Campos obrigatórios: calendarId, summary, start, end." },
        { status: 400 },
      );
    }

    const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Integração com Google Calendar não configurada." },
        { status: 500 },
      );
    }

    const service = new GoogleCalendarService({ accessToken });
    const event = await service.createEvent(calendarId, {
      summary,
      description,
      start,
      end,
      attendees,
      location,
    });

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
